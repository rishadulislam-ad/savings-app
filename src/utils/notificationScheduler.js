/**
 * Local-notification scheduler.
 *
 * Wires the @capacitor/local-notifications plugin to the user's preferences
 * stored by NotifSheet. Until this module existed, the prefs toggles in the
 * Notifications screen only persisted to localStorage — no notifications
 * actually fired. This module closes that gap.
 *
 * Notification types:
 *   - Budget Alerts:    when current-month spending in any category passes
 *                       the user's threshold (default 80%) of its budget.
 *                       Schedules a one-shot ~1-minute-from-now reminder
 *                       so the user gets pinged shortly after the threshold
 *                       is crossed (we don't have continuous background
 *                       monitoring without a server).
 *   - Bill Reminders:   for each recurring transaction, schedules a 9am
 *                       reminder 3 days before its next due date.
 *   - Weekly Summary:   recurring weekly notification every Sunday at 6pm
 *                       (using the plugin's `every: 'week'` option).
 *   - Savings Milestones: event-driven — see maybeFireMilestoneNotification
 *                       below, called from MyFinances when a deposit pushes
 *                       a goal past 25/50/75/100%.
 *
 * Notification IDs are partitioned: 1000-1999 = scheduled (cancellable
 * batch), 2000+ = event-driven (don't cancel). cancel-and-rebuild on each
 * schedule call keeps the queue from accumulating stale items.
 *
 * Throttling: scheduleAllNotifications no-ops if called more than once per
 * 5 seconds. Prevents thrashing the plugin when many state changes fire in
 * quick succession (e.g. during initial sync from cloud).
 */

import { Capacitor } from '@capacitor/core';

const SCHEDULED_ID_BASE = 1000;
const SCHEDULED_ID_MAX  = 1999;
const MILESTONE_ID_BASE = 2000;

let _lastScheduleAt = 0;

async function getPlugin() {
  if (!Capacitor.isNativePlatform?.()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod.LocalNotifications;
  } catch { return null; }
}

function getPrefs(uid) {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`coinova_notif_prefs_${uid}`);
    const prefs = raw ? JSON.parse(raw) : { budgetAlerts: true, billReminders: true, weeklySummary: false, savingsGoalMilestones: true };
    const threshold = parseInt(localStorage.getItem(`coinova_notif_prefs_${uid}_threshold`) || '80', 10);
    return { ...prefs, budgetThreshold: Number.isFinite(threshold) ? threshold : 80 };
  } catch { return null; }
}

function nextSundayAt(hour = 18) {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun
  const daysUntil = ((7 - dow) % 7) || 7; // never today — always next Sunday
  d.setDate(d.getDate() + daysUntil);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * Cancel all PREVIOUSLY-scheduled (recurring/forecast) notifications without
 * touching event-driven ones. Called before each rebuild.
 */
async function cancelScheduledBatch(Notifs) {
  try {
    const pending = await Notifs.getPending();
    if (!pending?.notifications?.length) return;
    const toCancel = pending.notifications
      .filter(n => n.id >= SCHEDULED_ID_BASE && n.id <= SCHEDULED_ID_MAX)
      .map(n => ({ id: n.id }));
    if (toCancel.length > 0) await Notifs.cancel({ notifications: toCancel });
  } catch {}
}

/**
 * Recompute and reschedule all scheduled (non-event-driven) notifications.
 * Idempotent — safe to call repeatedly. Throttled to once per 5 seconds.
 */
export async function scheduleAllNotifications({ uid, transactions = [], budgets = {}, savingsGoals = [], force = false } = {}) {
  if (!force && Date.now() - _lastScheduleAt < 5000) return;
  _lastScheduleAt = Date.now();

  const Notifs = await getPlugin();
  if (!Notifs) return;

  const prefs = getPrefs(uid);
  if (!prefs) return;

  // Permission check — if user hasn't granted, no point scheduling.
  try {
    const perm = await Notifs.checkPermissions();
    if (perm.display !== 'granted') {
      // Still cancel any leftover from a prior session where permission was granted.
      await cancelScheduledBatch(Notifs);
      return;
    }
  } catch { return; }

  // Wipe existing scheduled notifications so we don't accumulate stale ones.
  await cancelScheduledBatch(Notifs);

  const out = [];
  let nextId = SCHEDULED_ID_BASE;

  // ── Budget Alerts ──
  if (prefs.budgetAlerts) {
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cats = {};
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if ((t.date || '').slice(0, 7) !== curMonth) continue;
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    }
    const fireAt = new Date(Date.now() + 60 * 1000); // ~1 minute from now
    for (const [cat, limit] of Object.entries(budgets)) {
      if (typeof limit !== 'number' || limit <= 0) continue;
      if (nextId > SCHEDULED_ID_MAX - 50) break; // leave headroom for other types
      const spent = cats[cat] || 0;
      const pct = (spent / limit) * 100;
      if (pct >= 100) {
        out.push({
          id: nextId++,
          title: 'Over budget',
          body: `${cat} has exceeded your monthly budget`,
          schedule: { at: fireAt },
        });
      } else if (pct >= prefs.budgetThreshold) {
        out.push({
          id: nextId++,
          title: 'Budget alert',
          body: `${cat} spending hit ${Math.round(pct)}% of your monthly budget`,
          schedule: { at: fireAt },
        });
      }
    }
  }

  // ── Bill Reminders ── (3 days before next occurrence, 9am local)
  if (prefs.billReminders) {
    const now = Date.now();
    for (const t of transactions) {
      if (!t.recurring || nextId > SCHEDULED_ID_MAX - 10) continue;
      try {
        const lastDate = new Date(t.date);
        if (Number.isNaN(lastDate.getTime())) continue;
        let next = new Date(lastDate);
        // Advance until next occurrence is in the future.
        while (next.getTime() < now) {
          if (t.recurFreq === 'weekly')      next.setDate(next.getDate() + 7);
          else if (t.recurFreq === 'yearly') next.setFullYear(next.getFullYear() + 1);
          else                               next.setMonth(next.getMonth() + 1);
        }
        const reminder = new Date(next);
        reminder.setDate(reminder.getDate() - 3);
        reminder.setHours(9, 0, 0, 0);
        if (reminder.getTime() > now) {
          out.push({
            id: nextId++,
            title: 'Upcoming bill',
            body: `${t.title || t.category} is due in 3 days`,
            schedule: { at: reminder },
          });
        }
      } catch {}
    }
  }

  // ── Weekly Summary ── (every Sunday 6pm)
  if (prefs.weeklySummary) {
    out.push({
      id: nextId++,
      title: 'Weekly summary',
      body: 'Tap to see your spending summary for the week',
      schedule: { at: nextSundayAt(18), every: 'week' },
    });
  }

  if (out.length === 0) return;
  try {
    await Notifs.schedule({ notifications: out });
  } catch (err) {
    console.warn('[Notif] schedule failed:', err);
  }
}

/**
 * Event-driven savings-goal milestone fire.
 * Call after a deposit when the goal's percent-of-target crosses a 25/50/75/100
 * boundary. Fires immediately (not "scheduled" — appears as a notification right away).
 */
export async function maybeFireMilestoneNotification({ uid, goalLabel, prevTotal, newTotal, target }) {
  if (!uid || !target || target <= 0) return;
  const Notifs = await getPlugin();
  if (!Notifs) return;
  const prefs = getPrefs(uid);
  if (!prefs?.savingsGoalMilestones) return;
  try {
    const perm = await Notifs.checkPermissions();
    if (perm.display !== 'granted') return;
  } catch { return; }

  const prevPct = (prevTotal / target) * 100;
  const newPct  = (newTotal  / target) * 100;
  const milestones = [25, 50, 75, 100];
  const crossed = milestones.find(m => prevPct < m && newPct >= m);
  if (!crossed) return;

  try {
    await Notifs.schedule({
      notifications: [{
        id: MILESTONE_ID_BASE + Math.floor(Math.random() * 1000),
        title: crossed === 100 ? '🎉 Goal reached!' : `${crossed}% milestone`,
        body: `${goalLabel} is at ${crossed}% of target`,
        schedule: { at: new Date(Date.now() + 500) },
      }],
    });
  } catch {}
}

/**
 * Cancel ALL scheduled notifications (both batch and event-driven).
 * Used by Delete-All-Data and account deletion flows.
 */
export async function wipeAllNotifications() {
  const Notifs = await getPlugin();
  if (!Notifs) return;
  try {
    const pending = await Notifs.getPending();
    if (pending?.notifications?.length) {
      await Notifs.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  } catch {}
}
