/**
 * Insight engine.
 *
 * Pure functions over the user's transaction history. No side effects, no
 * network. Returns a prioritized list of insight objects ready to render in
 * the Smart Insights widget on Home, in My Finance, or anywhere else.
 *
 * Insight object shape:
 *   {
 *     id:       string  // stable React key + dedupe handle
 *     priority: number  // 0..100, higher = surface first
 *     icon:     string  // single emoji
 *     text:     string  // user-facing sentence
 *     color:    string  // CSS color (var or hex)
 *     category: 'alert' | 'forecast' | 'anomaly' | 'recurring'
 *               | 'streak' | 'trend' | 'summary' | 'tip'
 *   }
 *
 * Priority bands:
 *   100  ALERT     — overspend now (cur expense > cur income, over budget today)
 *    95  ALERT     — per-category over budget today
 *    90  ANOMALY   — single transaction in last 7d is 2σ above 90d baseline
 *    80  FORECAST  — month-end projection exceeds budget at current pace
 *    70  RECURRING — subscription cluster total
 *    60  STREAK    — consecutive logging days (engagement)
 *    50  TREND     — weekly category vs trailing 90d daily-avg baseline
 *    40  SUMMARY   — savings rate, biggest category
 *    30  TIP       — empty state / nudge
 */

import { formatCurrency } from '../data/transactions';

const MS_PER_DAY = 86400000;

function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function ymLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function safeDateMs(s) {
  try { const t = new Date(s).getTime(); return Number.isFinite(t) ? t : NaN; }
  catch { return NaN; }
}
function catLabelOf(catId, allCategories) {
  return (allCategories && allCategories[catId] && allCategories[catId].label) || catId;
}

/**
 * Detect recurring/subscription-like transactions.
 *
 * Heuristic: bucket transactions by (lowercased title-or-note prefix) +
 * (rounded amount). A bucket with ≥3 occurrences whose adjacent gaps
 * average to a monthly (28–35d) or weekly (5–9d) cadence is treated as a
 * subscription. Returns total normalized monthly cost + count.
 */
export function detectRecurring(txs) {
  const groups = new Map();
  for (const t of txs) {
    if (t.type !== 'expense') continue;
    const titleKey = (t.title || t.note || t.category || '').toString().toLowerCase().slice(0, 30);
    const amtKey = Math.round(t.amount);
    if (!titleKey || amtKey <= 0) continue;
    const k = `${titleKey}|${amtKey}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }

  // Cap individual subscription detection to amounts that plausibly
  // represent a subscription. Rent, mortgage, payroll-style entries
  // would otherwise dominate the monthly total and produce nonsensical
  // "subscription" claims like "$21,650/mo".
  const SUBSCRIPTION_AMOUNT_CAP = 500;

  let totalMonthly = 0;
  let count = 0;
  const items = []; // [{ name, monthlyCost }] for richer UI display
  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const ts = group.map(t => safeDateMs(t.date)).filter(Number.isFinite).sort((a, b) => a - b);
    if (ts.length < 3) continue;
    const gaps = [];
    for (let i = 1; i < ts.length; i++) gaps.push((ts[i] - ts[i - 1]) / MS_PER_DAY);
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const amt = group[0].amount;
    if (amt > SUBSCRIPTION_AMOUNT_CAP) continue; // skip rent / mortgage / large bills
    let monthlyCost = 0;
    if (avgGap >= 28 && avgGap <= 35) monthlyCost = amt;
    else if (avgGap >= 5 && avgGap <= 9) monthlyCost = amt * 4.33;
    else continue;
    totalMonthly += monthlyCost;
    count++;
    items.push({ name: group[0].title || group[0].note || group[0].category || 'Recurring', monthlyCost });
  }
  return { count, totalMonthly, items };
}

/**
 * Consecutive days (counting back from today) with at least one
 * transaction logged. Today doesn't have to have one — we forgive the
 * current day so the streak doesn't reset to 0 first thing in the morning.
 */
export function computeLoggingStreak(txs) {
  const dates = new Set();
  for (const t of txs) if (t.date) dates.add(t.date);
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getTime() - i * MS_PER_DAY);
    const ds = ymdLocal(d);
    if (dates.has(ds)) streak++;
    else if (i > 0) break; // missing day breaks streak (today excluded)
  }
  return streak;
}

/**
 * Main entry point. Returns an array of insight objects, deduped by id and
 * sorted by priority desc. Always returns at least one (empty-state tip).
 */
export function generateInsights({ transactions, currency = 'USD', allCategories = {}, budgets = {} }) {
  const out = [];

  if (!Array.isArray(transactions) || transactions.length === 0) {
    out.push({
      id: 'empty',
      priority: 30,
      icon: '👋',
      text: 'Add a few transactions to see insights here',
      color: 'var(--text-secondary)',
      category: 'tip',
    });
    return out;
  }

  const today = new Date();
  const curMonthStr = ymLocal(today);
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const cutoff7 = today.getTime() - 7 * MS_PER_DAY;
  const cutoff90 = today.getTime() - 90 * MS_PER_DAY;

  // Bucket once.
  const curMonthTxs = [];
  const last90Txs = [];
  for (const t of transactions) {
    const ms = safeDateMs(t.date);
    if (!Number.isFinite(ms) || ms > today.getTime()) continue;
    const txDate = new Date(ms);
    if (ymLocal(txDate) === curMonthStr) curMonthTxs.push(t);
    if (ms >= cutoff90) last90Txs.push(t);
  }

  let curIncome = 0, curExpense = 0;
  const curCats = {};
  for (const t of curMonthTxs) {
    if (t.type === 'income') curIncome += t.amount;
    else { curExpense += t.amount; curCats[t.category] = (curCats[t.category] || 0) + t.amount; }
  }

  // ── ALERT (100): expense already exceeds income this month ───────────
  if (curIncome > 0 && curExpense > curIncome) {
    out.push({
      id: 'alert-overspend',
      priority: 100,
      icon: '⚠️',
      text: `Spending exceeds income this month by ${formatCurrency(curExpense - curIncome, currency)}`,
      color: 'var(--danger)',
      category: 'alert',
    });
  }

  // ── ALERT (95): per-category over budget RIGHT NOW ───────────────────
  const budgetEntries = Object.entries(budgets || {}).filter(([, v]) => typeof v === 'number' && v > 0);
  for (const [cat, limit] of budgetEntries) {
    const spent = curCats[cat] || 0;
    if (spent > limit) {
      out.push({
        id: `over-${cat}`,
        priority: 95,
        icon: '🚨',
        text: `${catLabelOf(cat, allCategories)} is ${formatCurrency(spent - limit, currency)} over budget`,
        color: 'var(--danger)',
        category: 'alert',
      });
    }
  }

  // ── FORECAST (80): month-end projections ─────────────────────────────
  if (dayOfMonth >= 5 && curExpense > 0) {
    const projectedExpense = (curExpense / dayOfMonth) * daysInMonth;
    const totalBudget = budgetEntries.reduce((s, [, v]) => s + v, 0);
    if (totalBudget > 0) {
      const overshoot = projectedExpense - totalBudget;
      if (overshoot > totalBudget * 0.05) {
        out.push({
          id: 'forecast-budget',
          priority: 80,
          icon: '📊',
          text: `On pace to spend ${formatCurrency(projectedExpense, currency)} this month — ${formatCurrency(overshoot, currency)} over budget`,
          color: '#F59E0B',
          category: 'forecast',
        });
      } else if (projectedExpense < totalBudget * 0.85) {
        out.push({
          id: 'forecast-under',
          priority: 50,
          icon: '✨',
          text: `On pace to come in ${formatCurrency(totalBudget - projectedExpense, currency)} under budget`,
          color: 'var(--success)',
          category: 'forecast',
        });
      }
    } else if (curIncome > 0) {
      const projectedIncome = (curIncome / dayOfMonth) * daysInMonth;
      const projectedSavings = projectedIncome - projectedExpense;
      if (projectedSavings < 0) {
        out.push({
          id: 'forecast-cashflow',
          priority: 80,
          icon: '⚠️',
          text: `On pace to overspend by ${formatCurrency(-projectedSavings, currency)} this month`,
          color: 'var(--danger)',
          category: 'forecast',
        });
      }
    }
  }

  // ── FORECAST (80): per-category projections beyond budget ────────────
  if (dayOfMonth >= 7) {
    for (const [cat, limit] of budgetEntries) {
      const spent = curCats[cat] || 0;
      if (spent === 0 || spent > limit) continue; // skip 0 spend or already-flagged-as-alert
      const projected = (spent / dayOfMonth) * daysInMonth;
      if (projected > limit * 1.1) {
        const overPct = Math.round((projected / limit - 1) * 100);
        out.push({
          id: `forecast-${cat}`,
          priority: 80,
          icon: '📊',
          text: `${catLabelOf(cat, allCategories)} on pace for ${formatCurrency(projected, currency)} — ${overPct}% over budget`,
          color: '#F59E0B',
          category: 'forecast',
        });
      }
    }
  }

  // ── ANOMALY (90): single transactions ≥2σ above 90d category baseline ─
  // Build baseline: per-category sample of all expense amounts in last 90d
  const catSamples = {};
  for (const t of last90Txs) {
    if (t.type !== 'expense') continue;
    if (!catSamples[t.category]) catSamples[t.category] = [];
    catSamples[t.category].push(t.amount);
  }
  for (const t of last90Txs) {
    if (t.type !== 'expense') continue;
    const ms = safeDateMs(t.date);
    if (ms < cutoff7) continue; // anomalies are about RECENT transactions
    const samples = catSamples[t.category];
    if (!samples || samples.length < 5) continue;
    const mean = samples.reduce((s, a) => s + a, 0) / samples.length;
    const variance = samples.reduce((s, a) => s + (a - mean) ** 2, 0) / samples.length;
    const stddev = Math.sqrt(variance);
    if (stddev < 1) continue;
    const z = (t.amount - mean) / stddev;
    // Require BOTH high z-score AND 1.5× absolute mean — z alone can flag
    // tiny multi-σ deviations on tight categories.
    if (z > 2 && t.amount > mean * 1.5) {
      out.push({
        id: `anomaly-${t.id || `${t.date}-${t.amount}`}`,
        priority: 90,
        icon: '🔎',
        text: `${formatCurrency(t.amount, currency)} ${catLabelOf(t.category, allCategories)} — ${(t.amount / mean).toFixed(1)}× your typical ${formatCurrency(mean, currency)}`,
        color: '#F59E0B',
        category: 'anomaly',
      });
    }
  }

  // ── RECURRING (70): subscription-like patterns ──────────────────────
  // Surface the actual detected names instead of just a count, so the
  // user immediately knows what was flagged. Wording is "recurring
  // charge(s)" — more accurate than "subscription" since the engine
  // can't distinguish a real subscription from any other monthly bill.
  const recurring = detectRecurring(last90Txs);
  if (recurring.count >= 1 && recurring.totalMonthly > 0 && recurring.items?.length) {
    const sample = recurring.items[0].name;
    const text = recurring.count === 1
      ? `${sample} looks like a recurring charge ≈ ${formatCurrency(recurring.totalMonthly, currency)}/mo`
      : `${recurring.count} recurring charges (${sample} + ${recurring.count - 1} more) ≈ ${formatCurrency(recurring.totalMonthly, currency)}/mo`;
    out.push({
      id: 'subscriptions',
      priority: 70,
      icon: '🔁',
      text,
      color: 'var(--text-secondary)',
      category: 'recurring',
    });
  }

  // ── STREAK (60): consecutive logging days ────────────────────────────
  const loggingStreak = computeLoggingStreak(transactions);
  if (loggingStreak >= 7) {
    out.push({
      id: 'streak-logging',
      priority: 60,
      icon: '🔥',
      text: `${loggingStreak}-day logging streak — keep it up!`,
      color: 'var(--success)',
      category: 'streak',
    });
  }

  // ── TREND (50): weekly daily-avg vs trailing 90d daily-avg per cat ──
  // Baseline is days 90→7 ago (excludes the trailing week to avoid bias).
  const baselineExpenseTxs = last90Txs.filter(t => {
    const ms = safeDateMs(t.date);
    return t.type === 'expense' && ms < cutoff7;
  });
  const baselineDays = Math.max(14, Math.min(83, Math.floor((today.getTime() - cutoff90) / MS_PER_DAY) - 7));
  if (baselineDays >= 14 && baselineExpenseTxs.length >= 5) {
    const baselineCatTotals = {};
    for (const t of baselineExpenseTxs) baselineCatTotals[t.category] = (baselineCatTotals[t.category] || 0) + t.amount;

    const recentCatTotals = {};
    for (const t of last90Txs) {
      if (t.type !== 'expense') continue;
      const ms = safeDateMs(t.date);
      if (ms >= cutoff7) recentCatTotals[t.category] = (recentCatTotals[t.category] || 0) + t.amount;
    }

    for (const [cat, recent] of Object.entries(recentCatTotals)) {
      if (recent < 30) continue; // ignore noise — small weekly totals
      const baseline = baselineCatTotals[cat] || 0;
      if (baseline <= 0) continue;
      const recentDaily = recent / 7;
      const baselineDaily = baseline / baselineDays;
      const change = Math.round(((recentDaily - baselineDaily) / baselineDaily) * 100);
      if (change > 50) {
        out.push({
          id: `mover-up-${cat}`,
          priority: 50,
          icon: '📈',
          text: `${catLabelOf(cat, allCategories)} spending is ${change}% above your usual pace this week`,
          color: 'var(--danger)',
          category: 'trend',
        });
      } else if (change < -30) {
        out.push({
          id: `mover-down-${cat}`,
          priority: 50,
          icon: '📉',
          text: `${catLabelOf(cat, allCategories)} spending is ${Math.abs(change)}% below your usual pace this week`,
          color: 'var(--success)',
          category: 'trend',
        });
      }
    }
  }

  // ── SUMMARY (40): savings rate (only if no other forecast-tier items) ──
  if (curIncome > 0) {
    const rate = Math.round(((curIncome - curExpense) / curIncome) * 100);
    if (rate >= 30) {
      out.push({
        id: 'sav-rate',
        priority: 45,
        icon: '🎯',
        text: `Saved ${rate}% of income this month`,
        color: 'var(--success)',
        category: 'summary',
      });
    } else if (rate >= 0) {
      out.push({
        id: 'sav-rate',
        priority: 40,
        icon: '💡',
        text: `Savings rate is ${rate}% — aim for 20%+`,
        color: '#F59E0B',
        category: 'summary',
      });
    }
  }

  // ── SUMMARY (35): biggest category this month (always-available filler) ──
  const topCat = Object.entries(curCats).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    out.push({
      id: 'biggest-cat',
      priority: 35,
      icon: '🏷️',
      text: `Biggest category: ${catLabelOf(topCat[0], allCategories)} ${formatCurrency(topCat[1], currency)}`,
      color: 'var(--text-secondary)',
      category: 'summary',
    });
  }

  // Dedupe by id (in case overlapping rules emit the same insight twice).
  const seen = new Set();
  const deduped = out.filter(i => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  // Sort by priority desc, then alphabetic for stable order on ties.
  deduped.sort((a, b) => (b.priority - a.priority) || a.id.localeCompare(b.id));

  // Cap at 8 to avoid an unbounded carousel.
  return deduped.slice(0, 8);
}
