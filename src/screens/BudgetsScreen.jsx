import { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_BUDGETS = {
  eating_out:    300,
  groceries:     400,
  transport:     100,
  entertainment: 80,
  health:        120,
  shopping:      200,
};

const BUDGET_CATS = Object.keys(DEFAULT_BUDGETS);

const DATE_PERIODS = [
  { id: 'today',  label: 'Today' },
  { id: 'week',   label: 'This Week' },
  { id: 'month',  label: 'This Month' },
  { id: 'all',    label: 'All Time' },
  { id: 'custom', label: '📅 Custom' },
];

const localStr = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function filterByPeriod(transactions, period, customRange) {
  const now = new Date();
  const today = localStr(now);
  if (period === 'today') return transactions.filter(t => t.date === today);
  if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7));
    return transactions.filter(t => t.date >= localStr(mon) && t.date <= today);
  }
  if (period === 'month') {
    const firstDay = localStr(new Date(now.getFullYear(), now.getMonth(), 1));
    return transactions.filter(t => t.date >= firstDay && t.date <= today);
  }
  if (period === 'custom') {
    const { from, to } = customRange;
    if (from && to) return transactions.filter(t => t.date >= from && t.date <= to);
    if (from)       return transactions.filter(t => t.date >= from);
    if (to)         return transactions.filter(t => t.date <= to);
    return transactions;
  }
  return transactions;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

export default function BudgetsScreen({ transactions, datePeriod, onPeriodChange, currentUser }) {
  const { currency } = useTheme();
  const storageKey = currentUser ? `findo_budgets_${currentUser.email}` : 'findo_budgets_guest';

  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : { ...DEFAULT_BUDGETS };
    } catch { return { ...DEFAULT_BUDGETS }; }
  });

  const [editingCat, setEditingCat]   = useState(null);
  const [editValue,  setEditValue]    = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });

  // Persist budgets whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(budgets));
  }, [budgets, storageKey]);

  const filtered   = useMemo(() => filterByPeriod(transactions, datePeriod, customRange), [transactions, datePeriod, customRange]);
  const byCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const spendMap   = Object.fromEntries(byCategory.map(c => [c.cat, c.total]));

  const totalBudget = BUDGET_CATS.reduce((s, c) => s + (budgets[c] || 0), 0);
  const totalSpent  = BUDGET_CATS.reduce((s, c) => s + (spendMap[c] || 0), 0);
  const remaining   = totalBudget - totalSpent;
  const overallPct  = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  function startEdit(cat) {
    setEditingCat(cat);
    setEditValue(String(budgets[cat] ?? ''));
  }
  function saveEdit() {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      setBudgets(prev => ({ ...prev, [editingCat]: val }));
    }
    setEditingCat(null);
    setEditValue('');
  }
  function cancelEdit() {
    setEditingCat(null);
    setEditValue('');
  }

  const isCustom = datePeriod === 'custom';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '48px 20px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Budgets
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            background: 'var(--accent-light)', borderRadius: 6,
            padding: '2px 8px', letterSpacing: '0.04em',
          }}>
            MONTHLY
          </div>
        </div>

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {DATE_PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: datePeriod === p.id ? 'var(--accent)' : 'var(--border)',
                background:  datePeriod === p.id ? 'var(--accent)' : 'transparent',
                color:       datePeriod === p.id ? '#fff' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {isCustom && (
          <div style={{
            display: 'flex', gap: 10, marginTop: 10,
            animation: 'fadeUp 0.2s ease both',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                From
              </div>
              <input
                type="date"
                value={customRange.from}
                onChange={e => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 10,
                  border: `1.5px solid ${customRange.from ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--surface2)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                To
              </div>
              <input
                type="date"
                value={customRange.to}
                onChange={e => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 10,
                  border: `1.5px solid ${customRange.to ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--surface2)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="screen-content" style={{ padding: '16px 20px 24px' }}>

        {/* Overall Card */}
        <div className="summary-card anim-fadeup" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Overall Budget
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '8px 0 12px' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>
              {formatCurrency(totalSpent, currency)}
            </div>
            <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
              of {formatCurrency(totalBudget, currency)}
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${overallPct}%`,
              background: overallPct > 85 ? '#EF4444' : '#fff',
              borderRadius: 4, transition: 'width 0.6s ease',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {Math.round(overallPct)}% used
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {formatCurrency(remaining, currency)} left
            </span>
          </div>
        </div>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            Categories
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <PencilIcon />
            tap to set limit
          </div>
        </div>

        {/* Budget items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BUDGET_CATS.map((catKey, i) => {
            const cat      = CATEGORIES[catKey];
            const budget   = budgets[catKey] ?? 0;
            const spent    = spendMap[catKey] || 0;
            const pct      = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const over     = budget > 0 && spent > budget;
            const isEditing = editingCat === catKey;

            return (
              <div
                key={catKey}
                className="card anim-fadeup"
                style={{ padding: '14px 16px', animationDelay: `${i * 0.06}s` }}
              >
                {/* Top row: icon + label + amount + edit btn */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: cat.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cat.label}
                      </span>
                      {!isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: over ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {formatCurrency(spent, currency)}
                            {budget > 0 && (
                              <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: 12 }}>
                                /{formatCurrency(budget, currency)}
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => startEdit(catKey)}
                            style={{
                              width: 30, height: 30, borderRadius: 9,
                              background: 'var(--surface2)', border: '1px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', flexShrink: 0,
                              color: 'var(--text-secondary)',
                              transition: 'all 0.15s',
                            }}
                          >
                            <PencilIcon />
                          </button>
                        </div>
                      )}
                      {isEditing && (
                        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                          Editing…
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ marginBottom: 10, animation: 'fadeUp 0.18s ease both' }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
                    }}>
                      Monthly Budget Amount
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                        placeholder="0.00"
                        onKeyDown={e => {
                          if (e.key === 'Enter')  saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 10,
                          border: '1.5px solid var(--accent)', background: 'var(--surface2)',
                          color: 'var(--text-primary)', fontSize: 16, fontWeight: 700,
                          outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        style={{
                          padding: '10px 18px', borderRadius: 10,
                          background: 'var(--accent)', color: '#fff',
                          border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{
                          padding: '10px 12px', borderRadius: 10,
                          background: 'var(--surface2)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border)', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress bar + stats (hidden while editing) */}
                {!isEditing && (
                  <>
                    {budget > 0 ? (
                      <>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{
                            width: `${pct}%`,
                            background: over
                              ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                              : pct > 75
                                ? 'linear-gradient(90deg, #F59E0B, #FB923C)'
                                : cat.color,
                          }}/>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {Math.round(pct)}% used
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: over ? 'var(--danger)' : 'var(--success)' }}>
                            {over
                              ? `${formatCurrency(spent - budget, currency)} over`
                              : `${formatCurrency(budget - spent, currency)} left`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={{
                        fontSize: 12, color: 'var(--text-tertiary)',
                        textAlign: 'center', padding: '6px 0 2px',
                        fontStyle: 'italic',
                      }}>
                        No monthly limit set — tap ✏️ to add one
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
