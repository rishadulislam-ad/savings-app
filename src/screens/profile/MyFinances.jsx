import { useState, useEffect } from 'react';
import { formatCurrency, CURRENCIES, CATEGORIES } from '../../data/transactions';

/* ─── My Finances — Multi-Goal + Auto-Transaction ─────────── */
export default function MyFinances({ onClose, transactions, currentUser, isDark, currency, onAddTransaction }) {
  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const storageKey = currentUser ? `findo_savings_goals_${currentUser.email}` : null;

  // Load savings goals from localStorage
  const [goals, setGoals] = useState(() => {
    try {
      if (!storageKey) return [];
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist goals on change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(goals));
    }
  }, [goals, storageKey]);

  const [expandedGoal, setExpandedGoal] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [newDepAmount, setNewDepAmount] = useState('');
  const [newDepNote, setNewDepNote] = useState('');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalColor, setNewGoalColor] = useState('#10B981');

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

  // This month's savings across all goals
  const thisMonthSaved = allDeposits.filter(d => d.date.startsWith(currentMonth)).reduce((s, d) => s + d.amount, 0);

  // Balance = Earned - Spent (spent already includes savings as auto-transactions)
  const thisBalance = thisMonth.income - thisMonth.expense;

  // Averages
  const monthKeys = Object.keys(monthlyData).sort();
  const numMonths = monthKeys.length || 1;
  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgIncome = Math.round(allIncome / numMonths);
  const avgExpense = Math.round(allExpense / numMonths);

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

  function fmtK(n) {
    if (n >= 1000) return selectedCur.symbol + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return selectedCur.symbol + n.toLocaleString();
  }

  function addDeposit(goalId) {
    const amt = parseFloat(newDepAmount.replace(/,/g, ''));
    if (!amt || amt <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const goal = goals.find(g => g.id === goalId);
    const depNote = newDepNote || `Savings: ${goal?.label}`;

    // 1. Add deposit to goal
    setGoals(prev => prev.map(g => g.id === goalId ? {
      ...g,
      deposits: [{ id: 's_' + crypto.randomUUID(), amount: amt, date: today, note: depNote }, ...g.deposits],
    } : g));

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
    setGoals(prev => prev.map(g => g.id === goalId ? {
      ...g,
      deposits: g.deposits.filter(d => d.id !== depId),
    } : g));
  }

  function addNewGoal() {
    if (!newGoalLabel.trim()) return;
    const target = parseFloat(newGoalTarget.replace(/,/g, '')) || 0;
    setGoals(prev => [...prev, {
      id: 'g_' + crypto.randomUUID(),
      label: newGoalLabel.trim(),
      target,
      color: newGoalColor,
      deposits: [],
    }]);
    setNewGoalLabel('');
    setNewGoalTarget('');
    setNewGoalColor('#10B981');
    setShowNewGoal(false);
  }

  function deleteGoal(goalId) {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    if (expandedGoal === goalId) setExpandedGoal(null);
  }

  const goalColors = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#06B6D4', '#F97316'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '48px 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>My Finances</div>
        <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* ── This Month Overview ── */}
        <div style={{
          borderRadius: 'var(--radius-xl)', padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--accent), #0044B8)',
          boxShadow: '0 8px 32px rgba(10,108,255,0.25)',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{currentMonthLabel}</div>

            {/* Balance large */}
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {formatCurrency(thisBalance, currency)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Available balance</div>

            {/* Income / Expense row */}
            <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M3.5 5.5L6 3l2.5 2.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}>Earned</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{formatCurrency(thisMonth.income, currency)}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3.5 6.5L6 9l2.5-2.5" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}>Spent</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{formatCurrency(thisMonth.expense, currency)}</div>
              </div>
            </div>

            {thisMonthSaved > 0 && (
              <div style={{ marginTop: 14, padding: '7px 12px', borderRadius: 20, background: 'rgba(179,255,217,0.12)', border: '1px solid rgba(179,255,217,0.15)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3FFD9" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#B3FFD9' }}>{formatCurrency(thisMonthSaved, currency)} saved this month</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Savings Goals ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Savings Goals ({goals.length})
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
            Total: {formatCurrency(totalAllSaved, currency)}
          </div>
        </div>

        {goals.map((goal) => {
          const goalSaved = goal.deposits.reduce((s, d) => s + d.amount, 0);
          const progress = goal.target > 0 ? Math.min(100, Math.round((goalSaved / goal.target) * 100)) : 0;
          const remaining = Math.max(0, goal.target - goalSaved);
          const isExpanded = expandedGoal === goal.id;

          return (
            <div key={goal.id} className="card" style={{ marginBottom: 10, overflow: 'hidden', border: isExpanded ? `1px solid ${goal.color}30` : undefined }}>
              {/* Goal summary row */}
              <div onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: goal.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{goal.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: goal.color }}>{formatCurrency(goalSaved, currency)}</div>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', borderRadius: 3, background: goal.color, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: progress >= 100 ? goal.color : 'var(--text-tertiary)', minWidth: 36 }}>
                    {progress}%
                  </span>
                </div>
                {goal.target > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {progress >= 100 ? 'Goal reached!' : `${formatCurrency(remaining, currency)} to go · Target: ${formatCurrency(goal.target, currency)}`}
                  </div>
                )}
              </div>

              {/* Expanded: deposits + add */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  {/* Add deposit */}
                  {addingTo === goal.id ? (
                    <div style={{ padding: 12, borderRadius: 10, background: `${goal.color}08`, border: `1.5px solid ${goal.color}25`, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: goal.color, marginBottom: 8 }}>New Deposit</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: goal.color, background: `${goal.color}15`, padding: '7px 10px', borderRadius: 8 }}>{selectedCur.symbol}</span>
                        <input value={newDepAmount} onChange={e => setNewDepAmount(e.target.value)} placeholder="Amount" type="number" style={{
                          flex: 1, padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none',
                        }} />
                      </div>
                      <input value={newDepNote} onChange={e => setNewDepNote(e.target.value)} placeholder="Note (optional)" style={{
                        width: '100%', padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 6, boxSizing: 'border-box',
                      }} />
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.4 }}>
                        This will also create an expense transaction automatically.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setAddingTo(null); setNewDepAmount(''); setNewDepNote(''); }} style={{
                          flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
                          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>Cancel</button>
                        <button onClick={() => addDeposit(goal.id)} style={{
                          flex: 1, padding: 9, borderRadius: 8, border: 'none', background: goal.color,
                          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>Add Deposit</button>
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

                  {/* Deposit history */}
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

                  {/* Delete goal */}
                  <div onClick={() => deleteGoal(goal.id)} style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, padding: 4 }}>
                    Delete Goal
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
          <div className="card" style={{ padding: 16, marginBottom: 16, border: '1.5px solid var(--accent)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>New Savings Goal</div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Goal Name</label>
              <input value={newGoalLabel} onChange={e => setNewGoalLabel(e.target.value)} placeholder="e.g. New Car, Wedding, Trip..." style={{
                display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
              }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Target Amount ({selectedCur.code})</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '6px 10px', borderRadius: 8 }}>{selectedCur.symbol}</span>
                <input value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} placeholder="0" type="number" style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none',
                }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Color</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {goalColors.map(c => (
                  <div key={c} onClick={() => setNewGoalColor(c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: newGoalColor === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    transition: 'border 0.15s ease',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewGoal(false)} style={{
                flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={addNewGoal} style={{
                flex: 1, padding: 9, borderRadius: 8, border: 'none', background: 'var(--accent)',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Create Goal</button>
            </div>
          </div>
        )}

        {/* ── Spending Breakdown (now includes Savings category) ── */}
        <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Spending Breakdown</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>{formatCurrency(thisMonth.expense, currency)}</div>
          </div>
          {catSpending.map((cat, i) => (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < catSpending.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cat.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</span>
                    {cat.key === 'savings' && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '1px 5px', borderRadius: 4 }}>AUTO</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(cat.amount, currency)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.pct}%`, height: '100%', borderRadius: 2, background: cat.color, transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 28, textAlign: 'right' }}>{cat.pct}%</span>
            </div>
          ))}
        </div>

        {/* ── 6-Month Trend ── */}
        <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>6-Month Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
            {trendData.map((m) => (
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
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {[['Income','rgba(16,185,129,0.5)'],['Expense','rgba(239,68,68,0.5)'],['Saved','rgba(10,108,255,0.5)']].map(([l,c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Averages ── */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>6-Month Averages</div>
          {[
            ['Monthly Income', formatCurrency(avgIncome, currency), '#10B981'],
            ['Monthly Spending', formatCurrency(avgExpense, currency), '#EF4444'],
            ['Avg Remaining', formatCurrency(avgIncome - avgExpense, currency), 'var(--accent)'],
          ].map(([label, val, color], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}
