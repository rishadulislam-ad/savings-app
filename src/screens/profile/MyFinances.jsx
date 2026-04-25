import { useState, useEffect } from 'react';
import { formatCurrency, CURRENCIES, CATEGORIES } from '../../data/transactions';
import FeatureTip from '../../components/FeatureTip';

import { addSavingsGoalToCloud, removeSavingsGoalFromCloud, updateSavingsGoalInCloud } from '../../utils/firestore';
import { uuid } from '../../utils/storage';
import { todayLocal } from '../../utils/date';

/* ─── My Finances — Multi-Goal + Auto-Transaction ─────────── */
export default function MyFinances({ onClose, transactions, currentUser, currency, onAddTransaction, onDeleteTransaction, embedded = false }) {
  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const storageKey = currentUser ? `coinova_savings_goals_${currentUser.uid}` : null;

  // Load savings goals from localStorage
  const [goals, setGoals] = useState(() => {
    try {
      if (!storageKey) return [];
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist goals to localStorage on every change. Cloud sync uses atomic
  // arrayUnion / arrayRemove inside each mutation function below — bundling
  // the whole goals array via saveUserData would race against concurrent
  // edits from other devices and silently drop additions/changes.
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(goals));
  }, [goals, storageKey]);

  const [expandedGoal, setExpandedGoal] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [newDepAmount, setNewDepAmount] = useState('');
  const [newDepNote, setNewDepNote] = useState('');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalColor, setNewGoalColor] = useState('#10B981');
  const [newGoalEmoji, setNewGoalEmoji] = useState('🎯');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const GOAL_EMOJIS = ['🎯','🚗','🏠','✈️','💍','🎓','💻','📱','🏋️','👶','🎸','🏖️','💰','🎁','🐕','🏥'];
  const activeGoals = goals.filter(g => !g.archived);
  const archivedGoals = goals.filter(g => g.archived);

  // All deposits across all goals
  const allDeposits = goals.flatMap(g => g.deposits.map(d => ({ ...d, goalLabel: g.label, goalColor: g.color })));
  const totalAllSaved = allDeposits.reduce((s, d) => s + d.amount, 0);

  // Monthly data from real transactions
  const monthlyData = {};
  transactions.forEach(t => {
    const m = t.date.slice(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 };
    if (t.type === 'income') monthlyData[m].income += t.amount;
    else monthlyData[m].expense += t.amount;
  });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' });
  const thisMonth = monthlyData[currentMonth] || { income: 0, expense: 0 };

  // Balance = Earned - Spent (spent already includes savings as auto-transactions)
  const thisBalance = thisMonth.income - thisMonth.expense;

  // Averages
  const monthKeys = Object.keys(monthlyData).sort();

  // Category breakdown (current month expenses)
  const catMap = {};
  transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).forEach(t => {
    const key = t.category;
    if (!catMap[key]) catMap[key] = 0;
    catMap[key] += t.amount;
  });
  const totalMonthExpense = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
  const catSpending = Object.entries(catMap)
    .map(([key, amount]) => {
      const cat = CATEGORIES[key] || { label: key, icon: key === 'savings' ? '🏦' : '📦', color: key === 'savings' ? '#10B981' : '#6B7280' };
      return { key, label: cat.label || key, emoji: cat.icon, amount, pct: Math.round((amount / totalMonthExpense) * 100), color: cat.color };
    })
    .sort((a, b) => b.amount - a.amount);

  // 6-month trend
  const monthlySavings = {};
  allDeposits.forEach(d => {
    const m = d.date.slice(0, 7);
    if (!monthlySavings[m]) monthlySavings[m] = 0;
    monthlySavings[m] += d.amount;
  });
  const last6 = monthKeys.slice(-6);
  const trendData = last6.map(m => ({
    month: new Date(m + '-15').toLocaleString('en', { month: 'short' }),
    income: monthlyData[m].income,
    expense: monthlyData[m].expense,
    saved: monthlySavings[m] || 0,
  }));
  const maxTrend = Math.max(...trendData.map(d => Math.max(d.income, d.expense, d.saved)), 1);

  function addDeposit(goalId) {
    const amt = parseFloat(newDepAmount.replace(/,/g, ''));
    if (!amt || amt <= 0) return;

    const today = todayLocal();
    const goal = goals.find(g => g.id === goalId);
    const depNote = newDepNote || `Savings: ${goal?.label}`;

    // 1. Add deposit to goal — atomic remove old + add new on cloud.
    const oldGoal = goals.find(g => g.id === goalId);
    if (oldGoal) {
      const newGoal = { ...oldGoal, deposits: [{ id: 's_' + uuid(), amount: amt, date: today, note: depNote }, ...oldGoal.deposits] };
      setGoals(prev => prev.map(g => g.id === goalId ? newGoal : g));
      if (currentUser?.uid) updateSavingsGoalInCloud(currentUser.uid, oldGoal, newGoal);

      // Event-driven milestone notification — fires if this deposit pushed
      // the goal's % across a 25/50/75/100 threshold. Only if user has
      // opted in (handled inside the helper).
      const prevTotal = oldGoal.deposits.reduce((s, d) => s + d.amount, 0);
      const newTotal  = newGoal.deposits.reduce((s, d) => s + d.amount, 0);
      import('../../utils/notificationScheduler').then(({ maybeFireMilestoneNotification }) => {
        maybeFireMilestoneNotification({
          uid: currentUser?.uid,
          goalLabel: oldGoal.label,
          prevTotal,
          newTotal,
          target: oldGoal.target,
        });
      }).catch(() => {});
    }

    // 2. Auto-create expense transaction (shows in Transactions screen)
    if (onAddTransaction) {
      onAddTransaction({
        type: 'expense',
        category: 'savings',
        amount: amt,
        date: today,
        note: `Savings: ${goal?.label}`,
      });
    }

    setNewDepAmount('');
    setNewDepNote('');
    setAddingTo(null);
  }

  function deleteDeposit(goalId, depId) {
    // Find the deposit to match against the auto-created transaction
    const goal = goals.find(g => g.id === goalId);
    const dep = goal?.deposits.find(d => d.id === depId);

    const oldGoal2 = goals.find(g => g.id === goalId);
    if (oldGoal2) {
      const newGoal2 = { ...oldGoal2, deposits: oldGoal2.deposits.filter(d => d.id !== depId) };
      setGoals(prev => prev.map(g => g.id === goalId ? newGoal2 : g));
      if (currentUser?.uid) updateSavingsGoalInCloud(currentUser.uid, oldGoal2, newGoal2);
    }

    // Remove the matching expense transaction
    if (dep && onDeleteTransaction) {
      const match = transactions.find(t =>
        t.category === 'savings' && t.amount === dep.amount && t.date === dep.date &&
        t.note?.includes(goal?.label)
      );
      if (match) onDeleteTransaction(match.id);
    }
  }

  function addNewGoal() {
    if (!newGoalLabel.trim()) return;
    const target = parseFloat(newGoalTarget.replace(/,/g, '')) || 0;
    const newGoal = {
      id: 'g_' + uuid(),
      label: newGoalLabel.trim(),
      target,
      color: newGoalColor,
      emoji: newGoalEmoji,
      deadline: newGoalDeadline || null,
      archived: false,
      deposits: [],
    };
    setGoals(prev => [...prev, newGoal]);
    if (currentUser?.uid) addSavingsGoalToCloud(currentUser.uid, newGoal);
    setNewGoalLabel(''); setNewGoalTarget(''); setNewGoalColor('#10B981');
    setNewGoalEmoji('🎯'); setNewGoalDeadline(''); setShowNewGoal(false);
  }

  function archiveGoal(goalId) {
    const oldGoal = goals.find(g => g.id === goalId);
    if (!oldGoal) return;
    const newGoal = { ...oldGoal, archived: true };
    setGoals(prev => prev.map(g => g.id === goalId ? newGoal : g));
    if (currentUser?.uid) updateSavingsGoalInCloud(currentUser.uid, oldGoal, newGoal);
    if (expandedGoal === goalId) setExpandedGoal(null);
  }

  function restoreGoal(goalId) {
    const oldGoal = goals.find(g => g.id === goalId);
    if (!oldGoal) return;
    const newGoal = { ...oldGoal, archived: false };
    setGoals(prev => prev.map(g => g.id === goalId ? newGoal : g));
    if (currentUser?.uid) updateSavingsGoalInCloud(currentUser.uid, oldGoal, newGoal);
  }

  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState(null);

  function deleteGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    setGoals(prev => prev.filter(g => g.id !== goalId));
    if (currentUser?.uid && goal) removeSavingsGoalFromCloud(currentUser.uid, goal);
    if (expandedGoal === goalId) setExpandedGoal(null);
    setConfirmDeleteGoal(null);
  }

  const goalColors = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#06B6D4', '#F97316', '#14B8A6', '#A855F7', '#84CC16', '#E11D48', '#0EA5E9', '#D97706', '#6366F1', '#22D3EE'];

  const content = (
    <div style={embedded ? { padding: '16px 20px 32px' } : { flex: 1, overflow: 'auto', padding: 20 }}>

        {/* ── AI Financial Health Dashboard (Profile view only) ── */}
        {!embedded && (() => {
          // === Financial Health Score (0-100) ===
          const savingsRate = thisMonth.income > 0 ? ((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100 : 0;
          const savingsScore = Math.min(40, Math.max(0, savingsRate * 2)); // 0-40 pts (20%+ savings = full marks)

          // Budget adherence (from localStorage)
          let budgetScore = 0;
          try {
            const budgetData = JSON.parse(localStorage.getItem(currentUser ? `coinova_budgets_${currentUser.uid}` : '') || '{}');
            const mk = currentMonth;
            const monthBudgets = budgetData[mk] || {};
            const budgetKeys = Object.keys(monthBudgets).filter(k => monthBudgets[k] > 0);
            if (budgetKeys.length > 0) {
              const adherent = budgetKeys.filter(k => (catMap[k] || 0) <= monthBudgets[k]).length;
              budgetScore = Math.round((adherent / budgetKeys.length) * 25);
            }
          } catch {}

          // Consistency (spending spread across month, not binge)
          const daySpending = {};
          transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).forEach(t => {
            daySpending[t.date] = (daySpending[t.date] || 0) + t.amount;
          });
          const dayAmounts = Object.values(daySpending);
          const avgDay = dayAmounts.length > 0 ? dayAmounts.reduce((s, v) => s + v, 0) / dayAmounts.length : 0;
          const variance = dayAmounts.length > 1 ? dayAmounts.reduce((s, v) => s + Math.pow(v - avgDay, 2), 0) / dayAmounts.length : 0;
          const cv = avgDay > 0 ? Math.sqrt(variance) / avgDay : 0; // coefficient of variation
          const consistencyScore = dayAmounts.length >= 3 ? Math.min(20, Math.round((1 - Math.min(cv, 1)) * 20)) : 0;

          // Goal progress
          const goalScore = activeGoals.length > 0
            ? Math.min(15, Math.round((activeGoals.filter(g => {
                const saved = g.deposits.reduce((s, d) => s + d.amount, 0);
                return g.target > 0 && saved >= g.target * 0.1; // at least 10% progress
              }).length / activeGoals.length) * 15))
            : 0;

          const healthScore = Math.min(100, Math.round(savingsScore + budgetScore + consistencyScore + goalScore));
          const scoreColor = healthScore >= 80 ? '#10B981' : healthScore >= 60 ? '#F59E0B' : healthScore >= 40 ? '#FB923C' : '#EF4444';
          const scoreLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Needs Work' : 'At Risk';

          // === Previous month comparison ===
          const prevMonthKey = monthKeys.length >= 2 ? monthKeys[monthKeys.length - 2] : null;
          const prevMonth = prevMonthKey ? monthlyData[prevMonthKey] : null;
          const incomeChange = prevMonth && prevMonth.income > 0 ? ((thisMonth.income - prevMonth.income) / prevMonth.income) * 100 : null;
          const expenseChange = prevMonth && prevMonth.expense > 0 ? ((thisMonth.expense - prevMonth.expense) / prevMonth.expense) * 100 : null;

          // === Spending prediction ===
          const dayOfMonth = now.getDate();
          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const dailyAvg = dayOfMonth > 0 ? thisMonth.expense / dayOfMonth : 0;
          const predictedTotal = Math.round(dailyAvg * daysInMonth);
          const dailyLimit = thisMonth.income > 0 ? Math.round((thisMonth.income * 0.8) / daysInMonth) : 0; // 80% of income spread across month

          // === AI Insights ===
          const insights = [];

          // Savings rate insight
          if (thisMonth.income > 0) {
            if (savingsRate >= 20) insights.push({ icon: '🏆', text: `Savings rate is ${Math.round(savingsRate)}% — above the recommended 20%. Keep it up!`, color: '#10B981' });
            else if (savingsRate >= 10) insights.push({ icon: '💡', text: `Savings rate is ${Math.round(savingsRate)}%. Try to reach 20% for a healthy buffer.`, color: '#F59E0B' });
            else if (savingsRate >= 0) insights.push({ icon: '⚠️', text: `Only saving ${Math.round(savingsRate)}% of income. Consider cutting expenses.`, color: '#FB923C' });
            else insights.push({ icon: '🚨', text: `You're spending more than you earn this month. Review your expenses.`, color: '#EF4444' });
          }

          // Category spike
          if (prevMonth && catSpending.length > 0) {
            const prevCatMap = {};
            transactions.filter(t => t.type === 'expense' && prevMonthKey && t.date.startsWith(prevMonthKey)).forEach(t => {
              prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount;
            });
            const spikes = catSpending.filter(c => {
              const prev = prevCatMap[c.key] || 0;
              return prev > 0 && c.amount > prev * 1.3 && c.amount > 100;
            });
            if (spikes.length > 0) {
              const top = spikes[0];
              const pctUp = Math.round(((top.amount - (prevCatMap[top.key] || 0)) / (prevCatMap[top.key] || 1)) * 100);
              insights.push({ icon: '📊', text: `${top.label} spending is up ${pctUp}% vs last month (${formatCurrency(top.amount, currency)} vs ${formatCurrency(prevCatMap[top.key] || 0, currency)}).`, color: '#F59E0B' });
            }
          }

          // Weekend vs weekday
          let weekdayTotal = 0, weekendTotal = 0, weekdayDays = 0, weekendDays = 0;
          Object.entries(daySpending).forEach(([date, amt]) => {
            const d = new Date(date).getDay();
            if (d === 0 || d === 6) { weekendTotal += amt; weekendDays++; }
            else { weekdayTotal += amt; weekdayDays++; }
          });
          const wdAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0;
          const weAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0;
          if (weAvg > wdAvg * 1.4 && weekendDays >= 2) {
            insights.push({ icon: '📅', text: `You spend ${Math.round((weAvg / wdAvg - 1) * 100)}% more on weekends (${formatCurrency(Math.round(weAvg), currency)}/day vs ${formatCurrency(Math.round(wdAvg), currency)}/day on weekdays).`, color: '#8B5CF6' });
          }

          // Goal pace
          activeGoals.forEach(g => {
            if (g.deadline && g.target > 0) {
              const saved = g.deposits.reduce((s, d) => s + d.amount, 0);
              const dLeft = Math.ceil((new Date(g.deadline) - now) / 86400000);
              const mLeft = Math.max(1, Math.ceil(dLeft / 30));
              const needed = (g.target - saved) / mLeft;
              if (saved < g.target && dLeft > 0) {
                insights.push({ icon: '🎯', text: `Save ${formatCurrency(Math.ceil(needed), currency)}/month to reach "${g.label}" by ${new Date(g.deadline).toLocaleDateString('en', { month: 'short', year: 'numeric' })}.`, color: '#3B82F6' });
              }
            }
          });

          // Prediction
          if (dailyAvg > 0 && dayOfMonth >= 5) {
            insights.push({ icon: '🔮', text: `At this pace, you'll spend ${formatCurrency(predictedTotal, currency)} by month end${thisMonth.income > 0 ? ` (${Math.round((predictedTotal / thisMonth.income) * 100)}% of income)` : ''}.`, color: '#06B6D4' });
          }

          return <>

          {/* ── Health Score Card ── */}
          <div style={{
            borderRadius: 'var(--radius-xl)', padding: 22, marginBottom: 16, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(145deg, #0F172A, #1E293B)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `${scoreColor}08`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{currentMonthLabel}</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* Score ring */}
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke={scoreColor} strokeWidth="6"
                      strokeDasharray={`${(healthScore / 100) * 213.6} 213.6`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{healthScore}</div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: scoreColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{scoreLabel}</div>
                  </div>
                </div>

                {/* Score breakdown */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Financial Health</div>
                  {[
                    { label: 'Savings', val: Math.round(savingsScore), max: 40, color: '#10B981' },
                    { label: 'Budgets', val: budgetScore, max: 25, color: '#3B82F6' },
                    { label: 'Consistency', val: consistencyScore, max: 20, color: '#8B5CF6' },
                    { label: 'Goals', val: goalScore, max: 15, color: '#F59E0B' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 65 }}>{s.label}</span>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ width: `${(s.val / s.max) * 100}%`, height: '100%', borderRadius: 2, background: s.color }} />
                      </div>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', width: 28, textAlign: 'right' }}>{s.val}/{s.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Month Comparison ── */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Income', value: thisMonth.income, change: incomeChange, color: '#10B981', icon: '↑' },
              { label: 'Spending', value: thisMonth.expense, change: expenseChange, color: '#EF4444', icon: '↓' },
              { label: 'Balance', value: thisBalance, change: null, color: thisBalance >= 0 ? '#10B981' : '#EF4444', icon: thisBalance >= 0 ? '✓' : '!' },
            ].map(c => (
              <div key={c.label} className="card" style={{ flex: 1, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: c.color, letterSpacing: '-0.3px' }}>{formatCurrency(c.value, currency)}</div>
                {c.change !== null && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: c.label === 'Spending' ? (c.change > 0 ? '#EF4444' : '#10B981') : (c.change > 0 ? '#10B981' : '#EF4444'), marginTop: 3 }}>
                    {c.change > 0 ? '▲' : '▼'} {Math.abs(Math.round(c.change))}% vs last month
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── AI Insights ── */}
          {insights.length > 0 && (
            <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>🧠</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Insights</span>
              </div>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', marginBottom: i < insights.length - 1 ? 8 : 0,
                  borderRadius: 12, background: `${ins.color}08`, border: `1px solid ${ins.color}15`,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.2 }}>{ins.icon}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ins.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Spending Pace ── */}
          {dailyAvg > 0 && dayOfMonth >= 3 && (
            <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Spending Pace</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>Daily Average</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(Math.round(dailyAvg), currency)}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>Predicted Total</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: predictedTotal > thisMonth.income ? '#EF4444' : 'var(--text-primary)' }}>{formatCurrency(predictedTotal, currency)}</div>
                </div>
                {dailyLimit > 0 && (
                  <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>Daily Limit</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: dailyAvg > dailyLimit ? '#F59E0B' : '#10B981' }}>{formatCurrency(dailyLimit, currency)}</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (dayOfMonth / daysInMonth) * 100)}%`, height: '100%', borderRadius: 3, background: 'var(--accent)', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Day {dayOfMonth}</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{daysInMonth - dayOfMonth} days left</span>
              </div>
            </div>
          )}

          </>;
        })()}

        {/* ── Savings Goals (only in Budgets tab) ── */}
        {embedded && (() => {
          const totalTarget = activeGoals.reduce((s, g) => s + (g.target || 0), 0);
          const overallProg = totalTarget > 0 ? Math.min(100, Math.round((totalAllSaved / totalTarget) * 100)) : 0;
          return <>

          {/* Summary card */}
          <div style={{
            borderRadius: 'var(--radius-xl)', padding: 20, marginBottom: 16, position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(145deg, #059669, #047857)',
            boxShadow: '0 8px 32px rgba(5,150,105,0.25)',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Total Saved</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{formatCurrency(totalAllSaved, currency)}</div>
              {totalTarget > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                    <span>{overallProg}% of all goals</span>
                    <span>{formatCurrency(totalTarget, currency)} target</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                    <div style={{ width: `${overallProg}%`, height: '100%', borderRadius: 3, background: '#fff', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div><span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{activeGoals.length}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 4 }}>active</span></div>
                {archivedGoals.length > 0 && <div><span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{archivedGoals.length}</span><span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 4 }}>completed</span></div>}
              </div>
            </div>
          </div>

          {/* Active goals */}
          {activeGoals.map((goal) => {
            const goalSaved = goal.deposits.reduce((s, d) => s + d.amount, 0);
            const progress = goal.target > 0 ? Math.min(100, Math.round((goalSaved / goal.target) * 100)) : 0;
            const remaining = Math.max(0, goal.target - goalSaved);
            const isExpanded = expandedGoal === goal.id;
            const emoji = goal.emoji || '🎯';

            // Deadline calculations
            const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null;
            const monthsLeft = daysLeft !== null ? Math.max(1, Math.ceil(daysLeft / 30)) : null;
            const monthlyNeeded = (monthsLeft && remaining > 0) ? remaining / monthsLeft : null;

            // Milestone
            const milestone = progress >= 100 ? '100' : progress >= 75 ? '75' : progress >= 50 ? '50' : progress >= 25 ? '25' : null;
            const milestoneLabels = { '25': '1/4 there!', '50': 'Halfway!', '75': 'Almost there!', '100': 'Goal reached!' };

            return (
              <div key={goal.id} className="card" style={{ marginBottom: 10, overflow: 'hidden', border: isExpanded ? `1px solid ${goal.color}30` : undefined }}>
                <div onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Circular progress ring */}
                    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="24" cy="24" r="20" fill="none" stroke="var(--surface2)" strokeWidth="4" />
                        <circle cx="24" cy="24" r="20" fill="none" stroke={goal.color} strokeWidth="4"
                          strokeDasharray={`${(progress / 100) * 125.6} 125.6`} strokeLinecap="round" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{emoji}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.label}</div>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                          <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: goal.color }}>{formatCurrency(goalSaved, currency)}</span>
                        {goal.target > 0 && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>/ {formatCurrency(goal.target, currency)}</span>}
                      </div>
                      {/* Milestone badge */}
                      {milestone && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '2px 8px', borderRadius: 6,
                          background: progress >= 100 ? 'rgba(16,185,129,0.12)' : `${goal.color}12`,
                          fontSize: 10, fontWeight: 700, color: progress >= 100 ? '#10B981' : goal.color,
                        }}>
                          {progress >= 100 ? '🎉' : progress >= 75 ? '🔥' : progress >= 50 ? '⭐' : '💪'} {milestoneLabels[milestone]}
                        </div>
                      )}
                      {/* Deadline info */}
                      {daysLeft !== null && progress < 100 && (
                        <div style={{ fontSize: 10, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--text-tertiary)', marginTop: 3 }}>
                          {daysLeft <= 0 ? 'Deadline passed' : `${daysLeft} days left`}
                          {monthlyNeeded ? ` · Save ${formatCurrency(Math.ceil(monthlyNeeded), currency)}/mo` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: deposits + add */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                    {addingTo === goal.id ? (
                      <div style={{ padding: 12, borderRadius: 10, background: `${goal.color}08`, border: `1.5px solid ${goal.color}25`, marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: goal.color, marginBottom: 8 }}>New Deposit</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: goal.color, background: `${goal.color}15`, padding: '7px 10px', borderRadius: 8 }}>{selectedCur.symbol}</span>
                          <input value={newDepAmount} onChange={e => setNewDepAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Amount" inputMode="decimal" style={{
                            flex: 1, padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none',
                          }} />
                        </div>
                        <input value={newDepNote} onChange={e => setNewDepNote(e.target.value)} placeholder="Note (optional)" style={{
                          width: '100%', padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 6, boxSizing: 'border-box',
                        }} />
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.4 }}>This will also create an expense transaction automatically.</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => { setAddingTo(null); setNewDepAmount(''); setNewDepNote(''); }} style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => addDeposit(goal.id)} style={{ flex: 1, padding: 9, borderRadius: 8, border: 'none', background: goal.color, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Add Deposit</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(goal.id)} style={{
                        width: '100%', padding: '9px', borderRadius: 8, border: `1.5px dashed ${goal.color}40`,
                        background: `${goal.color}06`, color: goal.color, fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 12,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Deposit
                      </button>
                    )}

                    {goal.deposits.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>{goal.deposits.length} deposit{goal.deposits.length !== 1 ? 's' : ''}</div>
                        {goal.deposits.sort((a, b) => b.date.localeCompare(a.date)).map((dep, i) => (
                          <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < goal.deposits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: goal.color, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{dep.note}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{dep.date}</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: goal.color }}>{formatCurrency(dep.amount, currency)}</span>
                            <div onClick={() => deleteDeposit(goal.id, dep.id)} style={{ cursor: 'pointer', padding: 3 }}>
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0' }}>No deposits yet</div>
                    )}

                    {/* Archive / Delete */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                      {progress >= 100 && (
                        <div onClick={() => archiveGoal(goal.id)} style={{ fontSize: 11, color: '#10B981', cursor: 'pointer', fontWeight: 700, padding: 4 }}>
                          Archive Goal
                        </div>
                      )}
                      {confirmDeleteGoal === goal.id ? (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Are you sure?</span>
                          <span onClick={() => deleteGoal(goal.id)} style={{ fontSize: 11, color: 'var(--danger)', cursor: 'pointer', fontWeight: 700 }}>Yes, Delete</span>
                          <span onClick={() => setConfirmDeleteGoal(null)} style={{ fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</span>
                        </>
                      ) : (
                        <div onClick={() => setConfirmDeleteGoal(goal.id)} style={{ fontSize: 11, color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, padding: 4 }}>Delete Goal</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new goal */}
          {!showNewGoal ? (
            <button onClick={() => setShowNewGoal(true)} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: '1.5px dashed var(--border)',
              background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add New Goal
            </button>
          ) : (
            <div className="card" style={{ padding: 20, marginBottom: 16, border: '1.5px solid var(--accent)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.4px', marginBottom: 18 }}>New Savings Goal</div>

              {/* Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 14, marginBottom: 22, border: '1px solid var(--border)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: `${newGoalColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{newGoalEmoji}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{newGoalLabel.trim() || 'Goal Name'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{newGoalTarget ? `${selectedCur.symbol}${newGoalTarget} target` : 'No target set'}</div>
                </div>
              </div>

              {/* Icon */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Icon</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {GOAL_EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewGoalEmoji(e)} style={{
                      width: 38, height: 38, borderRadius: 10, fontSize: 18, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: newGoalEmoji === e ? 'var(--accent-light)' : 'var(--surface2)',
                      border: newGoalEmoji === e ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                    }}>{e}</button>
                  ))}
                </div>
              </div>

              {/* Goal Name */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Goal Name</div>
                <input value={newGoalLabel} onChange={e => setNewGoalLabel(e.target.value)} placeholder="e.g. New Car, Wedding, Trip..." className="form-input" style={{ fontSize: 15 }} />
              </div>

              {/* Target Amount */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Target Amount ({selectedCur.code})</div>
                <input value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="form-input" style={{ fontSize: 15 }} />
              </div>

              {/* Target Date */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Target Date (optional)</div>
                <input type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)}
                  min={todayLocal()} className="form-input" style={{ fontSize: 15 }} />
              </div>

              {/* Color */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Color</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {goalColors.map(c => (
                    <button key={c} onClick={() => setNewGoalColor(c)} style={{
                      width: 34, height: 34, borderRadius: '50%', background: c, cursor: 'pointer', flexShrink: 0,
                      border: newGoalColor === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                    }} />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowNewGoal(false)} style={{
                  flex: 1, padding: 14, borderRadius: 12, border: '1.5px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={addNewGoal} disabled={!newGoalLabel.trim()} style={{
                  flex: 1, padding: 14, borderRadius: 12, border: 'none',
                  background: newGoalLabel.trim() ? 'var(--accent)' : 'var(--surface2)',
                  color: newGoalLabel.trim() ? '#fff' : 'var(--text-tertiary)',
                  fontSize: 14, fontWeight: 700, cursor: newGoalLabel.trim() ? 'pointer' : 'not-allowed',
                }}>Create Goal</button>
              </div>
            </div>
          )}

          {/* Archived goals */}
          {archivedGoals.length > 0 && (
            <>
              <div onClick={() => setShowArchived(!showArchived)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', cursor: 'pointer', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Completed ({archivedGoals.length})</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showArchived ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {showArchived && archivedGoals.map(goal => {
                const goalSaved = goal.deposits.reduce((s, d) => s + d.amount, 0);
                return (
                  <div key={goal.id} className="card" style={{ marginBottom: 8, padding: '12px 16px', opacity: 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{goal.emoji || '🎯'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{goal.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatCurrency(goalSaved, currency)} saved</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 6 }}>Completed</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                      <span onClick={() => restoreGoal(goal.id)} style={{ fontSize: 10, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>Restore</span>
                      <span onClick={() => deleteGoal(goal.id)} style={{ fontSize: 10, color: 'var(--danger)', cursor: 'pointer', fontWeight: 600 }}>Delete</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          </>;
        })()}

        {/* 6-month trend (Profile view only) */}
        {!embedded && trendData.length > 0 && (
          <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>6-Month Trend</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
              {trendData.map(m => (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: 70 }}>
                    <div style={{ flex: 1, height: `${(m.income / maxTrend) * 70}px`, background: 'rgba(16,185,129,0.35)', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ flex: 1, height: `${(m.expense / maxTrend) * 70}px`, background: 'rgba(239,68,68,0.35)', borderRadius: '3px 3px 0 0' }} />
                    <div style={{ flex: 1, height: `${(m.saved / maxTrend) * 70}px`, background: 'rgba(10,108,255,0.35)', borderRadius: '3px 3px 0 0' }} />
                  </div>
                  <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontWeight: 600 }}>{m.month}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10 }}>
              {[['Income','rgba(16,185,129,0.5)'],['Expense','rgba(239,68,68,0.5)'],['Saved','rgba(10,108,255,0.5)']].map(([l,c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
  );

  if (embedded) return content;

  return (
    <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>My Finances</div>
        <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {content}
      </div>
      <FeatureTip tipId="finances" currentUser={currentUser} />
    </div>
  );
}
