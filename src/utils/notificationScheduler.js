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

/**
 * Next occurrence of `targetDow` (0=Sun … 6=Sat) at `hour:00` local.
 * Always in the future — if today matches the target, returns next week.
 * Used by the weekly summary scheduler so we can fire on the user's
 * preferred end-of-week (Saturday for Sunday-start cultures, Sunday for
 * Monday-start, Friday for Saturday-start).
 */
function nextDowAt(targetDow, hour = 18) {
  const d = new Date();
  const dow = d.getDay();
  const daysUntil = ((targetDow - dow + 7) % 7) || 7;
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
          channelId: 'coinova-default',
        });
      } else if (pct >= prefs.budgetThreshold) {
        out.push({
          id: nextId++,
          title: 'Budget alert',
          body: `${cat} spending hit ${Math.round(pct)}% of your monthly budget`,
          schedule: { at: fireAt },
          channelId: 'coinova-default',
        });
      }
    }
  }

  // ── Bill Reminders ── (3 days before next occurrence, 9am local)
  // Group recurring transactions into chains (by title+category+amount+freq)
  // and schedule ONE reminder per chain. The previous loop iterated every
  // recurring tx and computed the same "next occurrence" for each — a chain
  // with 12 historical occurrences scheduled 12 identical reminders for
  // the same future date.
  if (prefs.billReminders) {
    const now = Date.now();
    const chains = new Map();
    for (const t of transactions) {
      if (!t || !t.recurring) continue;
      // Match the chain-key normalisation used in App.recurringChainKey so
      // bill reminders and the "Stop Recurring" flag operate on the same
      // grouping (whitespace / case differences would otherwise fragment
      // a single subscription into multiple chains and double-fire).
      const title = String(t.title || '').trim().toLowerCase();
      const category = String(t.category || '').trim().toLowerCase();
      const cents = Math.round((Number(t.amount) || 0) * 100);
      const freq = String(t.recurFreq || 'monthly').trim().toLowerCase();
      const key = `${title}|${category}|${cents}|${freq}`;
      if (!chains.has(key)) chains.set(key, []);
      chains.get(key).push(t);
    }
    for (const [, list] of chains) {
      if (list.some(t => t.recurringStopped)) continue;
      if (nextId > SCHEDULED_ID_MAX - 10) break;
      // Anchor on the most recent occurrence so we walk forward minimally.
      const anchor = list.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
      try {
        const lastDate = new Date(anchor.date);
        if (Number.isNaN(lastDate.getTime())) continue;
        let next = new Date(lastDate);
        while (next.getTime() < now) {
          if (anchor.recurFreq === 'weekly')      next.setDate(next.getDate() + 7);
          else if (anchor.recurFreq === 'yearly') next.setFullYear(next.getFullYear() + 1);
          else                                    next.setMonth(next.getMonth() + 1);
        }
        const reminder = new Date(next);
        reminder.setDate(reminder.getDate() - 3);
        reminder.setHours(9, 0, 0, 0);
        if (reminder.getTime() > now) {
          out.push({
            id: nextId++,
            title: 'Upcoming bill',
            body: `${anchor.title || anchor.category} is due in 3 days`,
            schedule: { at: reminder },
            channelId: 'coinova-default',
          });
        }
      } catch {}
    }
  }

  // ── Weekly Summary ──
  // Fires on the LAST day of the user's week (one day before the chosen
  // week-start) at 6pm — so Sunday-start users get it Saturday evening,
  // Monday-start users get it Sunday evening, Saturday-start users get
  // it Friday evening. Reads the same weekStart preference the in-app
  // "This Week" filter uses, so the recap always lines up with the
  // window the user expects.
  if (prefs.weeklySummary) {
    let weekStart = 1;
    try {
      const mod = await import('./weekStart');
      weekStart = mod.getWeekStart(uid);
    } catch {}
    const endDow = (weekStart + 6) % 7;
    out.push({
      id: nextId++,
      title: 'Weekly summary',
      body: 'Tap to see your spending summary for the week',
      schedule: { at: nextDowAt(endDow, 18), every: 'week' },
      channelId: 'coinova-default',
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
        schedule: { at: new Date(Date.now() + 1500) },
        channelId: 'coinova-default',
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
