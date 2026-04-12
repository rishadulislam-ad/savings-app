import { CATEGORIES } from '../data/transactions';

/* ═══════════════════════════════════════════════════════════
   Smart Insights — Pure analysis functions
   ═══════════════════════════════════════════════════════════ */

const clamp = (min, max, v) => Math.max(min, Math.min(max, v));

/** Get transactions grouped by month key "YYYY-MM" */
function groupByMonth(transactions) {
  const months = {};
  transactions.forEach(t => {
    const m = (t.date || '').slice(0, 7);
    if (!m) return;
    if (!months[m]) months[m] = { income: 0, expense: 0, txs: [] };
    if (t.type === 'income') months[m].income += t.amount;
    else months[m].expense += t.amount;
    months[m].txs.push(t);
  });
  return months;
}

/** Get sorted month keys */
function sortedMonthKeys(months) {
  return Object.keys(months).sort();
}

/* ─── 1. Savings Score (0-100) ─── */
export function calculateSavingsScore(transactions, userId) {
  const months = groupByMonth(transactions);
  const keys = sortedMonthKeys(months);
  if (keys.length === 0) return null;

  // Read budgets from localStorage
  let budgets = {};
  try {
    const raw = localStorage.getItem(`coinova_budgets_${userId}`);
    if (raw) budgets = JSON.parse(raw);
  } catch {}

  // --- Savings Rate (35%) ---
  const last3 = keys.slice(-3);
  let totalIncome = 0, totalExpense = 0;
  last3.forEach(k => { totalIncome += months[k].income; totalExpense += months[k].expense; });
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const savingsRateScore = clamp(0, 100, (savingsRate / 30) * 100);

  // --- Budget Adherence (25%) ---
  let adherenceScore = 50; // default if no budgets
  const budgetEntries = Object.entries(budgets).filter(([, v]) => v > 0);
  if (budgetEntries.length > 0 && keys.length > 0) {
    const currentMonth = keys[keys.length - 1];
    const catSpend = {};
    (months[currentMonth]?.txs || []).filter(t => t.type === 'expense').forEach(t => {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
    });
    const scores = budgetEntries.map(([cat, budget]) => {
      const spent = catSpend[cat] || 0;
      return spent <= budget ? 100 : clamp(0, 100, (budget / spent) * 100);
    });
    adherenceScore = scores.reduce((s, v) => s + v, 0) / scores.length;
  }

  // --- Consistency (25%) ---
  const recentMonths = last3;
  const posMonths = recentMonths.filter(k => months[k].income > months[k].expense).length;
  let consistencyScore = (posMonths / recentMonths.length) * 100;
  // Low variance bonus
  if (recentMonths.length >= 2) {
    const savings = recentMonths.map(k => months[k].income - months[k].expense);
    const avg = savings.reduce((s, v) => s + v, 0) / savings.length;
    const variance = savings.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / savings.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 1;
    consistencyScore = clamp(0, 100, consistencyScore + (cv < 0.3 ? 10 : cv < 0.6 ? 5 : 0));
  }

  // --- Trend Direction (15%) ---
  let trendScore = 50;
  if (keys.length >= 3) {
    const recent2 = keys.slice(-2);
    const prior = keys.slice(-4, -2);
    if (prior.length > 0) {
      const recentAvg = recent2.reduce((s, k) => s + months[k].expense, 0) / recent2.length;
      const priorAvg = prior.reduce((s, k) => s + months[k].expense, 0) / prior.length;
      if (priorAvg > 0) {
        const change = ((recentAvg - priorAvg) / priorAvg) * 100;
        trendScore = change < 0 ? clamp(70, 100, 85 + Math.abs(change)) : clamp(0, 50, 50 - change);
      }
    }
  }

  const score = Math.round(savingsRateScore * 0.35 + adherenceScore * 0.25 + consistencyScore * 0.25 + trendScore * 0.15);

  // Trend vs last month
  let trend = 0;
  if (keys.length >= 2) {
    // Simple: compare current savings rate vs last month
    const prevMonth = months[keys[keys.length - 2]];
    const prevRate = prevMonth.income > 0 ? ((prevMonth.income - prevMonth.expense) / prevMonth.income) * 100 : 0;
    trend = Math.round(savingsRate - prevRate);
  }

  return {
    score: clamp(0, 100, score),
    trend,
    breakdown: {
      savings: Math.round(savingsRateScore),
      budgets: Math.round(adherenceScore),
      consistency: Math.round(consistencyScore),
    },
  };
}

/* ─── 2. Smart Predictions ─── */
export function generatePredictions(transactions, currency, formatCurrency) {
  const months = groupByMonth(transactions);
  const keys = sortedMonthKeys(months);
  if (keys.length === 0) return [];

  const predictions = [];
  const recentKeys = keys.slice(-3);
  const numRecent = recentKeys.length;

  // Category monthly averages
  const catTotals = {};
  recentKeys.forEach(k => {
    (months[k]?.txs || []).filter(t => t.type === 'expense').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
  });

  // Annual projection for top category
  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const [cat, total] = sorted[0];
    const monthlyAvg = total / numRecent;
    const annual = Math.round(monthlyAvg * 12);
    const catInfo = CATEGORIES[cat] || { label: cat, icon: '📦' };
    predictions.push({
      icon: catInfo.icon,
      text: `At this rate, you'll spend ${formatCurrency(annual, currency)} on ${catInfo.label} this year`,
      color: 'var(--danger)',
    });
  }

  // Savings-if-cut (non-essential)
  const nonEssential = sorted.filter(([cat]) => !['groceries', 'health', 'childcare'].includes(cat));
  if (nonEssential.length > 0) {
    const [cat, total] = nonEssential[0];
    const savingsPerYear = Math.round((total / numRecent) * 12 * 0.1);
    const catInfo = CATEGORIES[cat] || { label: cat };
    predictions.push({
      icon: '💡',
      text: `Cut ${catInfo.label} by 10% to save ${formatCurrency(savingsPerYear, currency)}/year`,
      color: 'var(--success)',
    });
  }

  // Savings milestone
  const totalIncome = recentKeys.reduce((s, k) => s + months[k].income, 0);
  const totalExpense = recentKeys.reduce((s, k) => s + months[k].expense, 0);
  const monthlyNet = (totalIncome - totalExpense) / numRecent;
  if (monthlyNet > 0) {
    const now = new Date();
    const remainingMonths = 12 - now.getMonth();
    const projected = Math.round(monthlyNet * remainingMonths);
    predictions.push({
      icon: '🎯',
      text: `At this pace, you'll save ${formatCurrency(projected, currency)} by year end`,
      color: 'var(--accent)',
    });
  }

  // Overspend warning
  if (keys.length >= 2) {
    const currentKey = keys[keys.length - 1];
    const prevKey = keys[keys.length - 2];
    const currentExpense = months[currentKey].expense;
    const prevExpense = months[prevKey].expense;
    if (prevExpense > 0) {
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const projectedMonthly = (currentExpense / dayOfMonth) * daysInMonth;
      const overspendPct = Math.round(((projectedMonthly - prevExpense) / prevExpense) * 100);
      if (overspendPct > 10) {
        predictions.push({
          icon: '⚠️',
          text: `On track to spend ${overspendPct}% more than last month`,
          color: 'var(--warning)',
        });
      }
    }
  }

  return predictions;
}

/* ─── 3. Behavioral Patterns ─── */
export function analyzeBehavioralPatterns(transactions) {
  // Need at least 30 days and 15 transactions
  const expenses = transactions.filter(t => t.type === 'expense');
  if (expenses.length < 15) return null;

  const dates = expenses.map(t => new Date(t.date));
  const oldestDate = new Date(Math.min(...dates));
  const daySpan = (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daySpan < 25) return null;

  // Limit to last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recent = expenses.filter(t => new Date(t.date) >= sixMonthsAgo);

  // Day-of-week analysis
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  recent.forEach(t => {
    const day = new Date(t.date).getDay();
    dayTotals[day] += t.amount;
    dayCounts[day]++;
  });

  const dayAvgs = dayTotals.map((total, i) => dayCounts[i] > 0 ? total / dayCounts[i] : 0);
  const maxDay = dayAvgs.indexOf(Math.max(...dayAvgs));
  const maxDayTotal = Math.max(...dayTotals);

  // Normalize for chart display
  const chartData = dayTotals.map((total, i) => ({
    label: dayNames[i][0],
    value: maxDayTotal > 0 ? Math.round((total / maxDayTotal) * 100) : 0,
    isMax: i === maxDay,
  }));

  const patterns = [];
  patterns.push({
    icon: '📊',
    headline: `You spend the most on ${dayNames[maxDay]}s`,
  });

  // Weekend vs weekday
  const weekdaySpend = dayTotals.slice(1, 6).reduce((s, v) => s + v, 0);
  const weekendSpend = dayTotals[0] + dayTotals[6];
  const weekdayAvg = weekdaySpend / 5;
  const weekendAvg = weekendSpend / 2;
  if (weekdayAvg > 0 && weekendAvg > weekdayAvg) {
    const pct = Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100);
    if (pct > 15) {
      patterns.push({
        icon: '🌙',
        text: `You spend ${pct}% more on weekends than weekdays`,
      });
    }
  } else if (weekendAvg > 0 && weekdayAvg > weekendAvg) {
    const pct = Math.round(((weekdayAvg - weekendAvg) / weekendAvg) * 100);
    if (pct > 15) {
      patterns.push({
        icon: '💼',
        text: `You spend ${pct}% more on weekdays than weekends`,
      });
    }
  }

  // Week-of-month analysis
  const weekTotals = [0, 0, 0, 0];
  recent.forEach(t => {
    const day = new Date(t.date).getDate();
    const week = Math.min(3, Math.floor((day - 1) / 7));
    weekTotals[week] += t.amount;
  });
  const peakWeek = weekTotals.indexOf(Math.max(...weekTotals));
  const weekLabels = ['First', 'Second', 'Third', 'Last'];
  patterns.push({
    icon: '📅',
    text: `${weekLabels[peakWeek]} week of the month is your peak spending period`,
  });

  return { chartData, patterns };
}

/* ─── 4. Money Personality ─── */
export function determineMoneyPersonality(transactions, userId) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');

  if (expenses.length < 20 || transactions.length < 25) return null;

  const months = groupByMonth(transactions);
  const keys = sortedMonthKeys(months);
  if (keys.length < 2) return null;

  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : 0;

  // Category spread
  const categories = new Set(expenses.map(t => t.category));
  const categoryCount = categories.size;

  // Weekend ratio
  const weekendSpend = expenses.filter(t => { const d = new Date(t.date).getDay(); return d === 0 || d === 6; }).reduce((s, t) => s + t.amount, 0);
  const weekendRatio = totalExpense > 0 ? weekendSpend / totalExpense : 0;

  // Consistency (positive months)
  const posMonths = keys.filter(k => months[k].income > months[k].expense).length;
  const consistencyRatio = posMonths / keys.length;

  // Income growth
  let incomeGrowth = 0;
  if (keys.length >= 3) {
    const first = months[keys[0]]?.income || 0;
    const last = months[keys[keys.length - 1]]?.income || 0;
    incomeGrowth = first > 0 ? (last - first) / first : 0;
  }

  // Average transaction size
  const avgTxSize = totalExpense / expenses.length;

  // Budgets
  let budgetAdherence = 0.5;
  try {
    const raw = localStorage.getItem(`coinova_budgets_${userId}`);
    if (raw) {
      const budgets = JSON.parse(raw);
      const entries = Object.entries(budgets).filter(([, v]) => v > 0);
      if (entries.length > 0) {
        const currentKey = keys[keys.length - 1];
        const catSpend = {};
        (months[currentKey]?.txs || []).filter(t => t.type === 'expense').forEach(t => {
          catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
        });
        const under = entries.filter(([cat, budget]) => (catSpend[cat] || 0) <= budget).length;
        budgetAdherence = under / entries.length;
      }
    }
  } catch {}

  // Determine personality
  if (savingsRate > 0.25 && consistencyRatio > 0.6) {
    return {
      emoji: '🎯',
      label: 'The Steady Saver',
      description: 'You consistently save a healthy portion of your income and keep spending in check. Your discipline is rare.',
      traits: ['Consistent', 'Disciplined', 'Goal-oriented'],
    };
  }

  if (weekendRatio > 0.45) {
    return {
      emoji: '🎢',
      label: 'The Weekend Splurger',
      description: 'Weekdays you\'re careful, but weekends bring out the spender in you. A little balance goes a long way.',
      traits: ['Weekend spender', 'Social', 'Impulsive on weekends'],
    };
  }

  if (budgetAdherence > 0.8 && consistencyRatio > 0.5) {
    return {
      emoji: '📊',
      label: 'The Budget Master',
      description: 'You set budgets and actually stick to them. Most people can\'t do that — respect.',
      traits: ['Budget-conscious', 'Organized', 'Planned'],
    };
  }

  if (incomeGrowth > 0.15 && savingsRate > 0.1) {
    return {
      emoji: '📈',
      label: 'The Hustler',
      description: 'Your income is growing and you\'re managing to save along the way. Keep the momentum going.',
      traits: ['Growing income', 'Ambitious', 'Moderate saver'],
    };
  }

  if (categoryCount <= 4 && avgTxSize < 50) {
    return {
      emoji: '🧘',
      label: 'The Minimalist',
      description: 'You keep things simple — few categories, small transactions. Less is more for you.',
      traits: ['Simple', 'Low spend', 'Focused'],
    };
  }

  // Default
  return {
    emoji: '🌱',
    label: 'The Explorer',
    description: 'You\'re still finding your financial groove. Keep tracking and your patterns will sharpen over time.',
    traits: ['Learning', 'Curious', 'Evolving'],
  };
}
