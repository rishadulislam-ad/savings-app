import { useMemo } from 'react';
import { CATEGORIES, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

const BUDGETS = [
  { cat: 'eating_out',    budget: 300 },
  { cat: 'groceries',     budget: 400 },
  { cat: 'transport',     budget: 100 },
  { cat: 'entertainment', budget: 80  },
  { cat: 'health',        budget: 120 },
  { cat: 'shopping',      budget: 200 },
];

const DATE_PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time' },
];

function filterByPeriod(transactions, period) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (period === 'today') return transactions.filter(t => t.date === today);
  if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((day + 6) % 7));
    const monStr = mon.toISOString().slice(0, 10);
    return transactions.filter(t => t.date >= monStr && t.date <= today);
  }
  if (period === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return transactions.filter(t => t.date >= firstDay && t.date <= today);
  }
  return transactions;
}

export default function BudgetsScreen({ transactions, datePeriod, onPeriodChange }) {
  const { currency } = useTheme();

  const filtered = useMemo(() => filterByPeriod(transactions, datePeriod), [transactions, datePeriod]);
  const byCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const spendMap = Object.fromEntries(byCategory.map(c => [c.cat, c.total]));

  const totalBudget  = BUDGETS.reduce((s, b) => s + b.budget, 0);
  const totalSpent   = BUDGETS.reduce((s, b) => s + (spendMap[b.cat] || 0), 0);
  const remaining    = totalBudget - totalSpent;
  const overallPct   = Math.min((totalSpent / totalBudget) * 100, 100);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '48px 20px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 12 }}>
          Budgets
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {DATE_PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                borderColor: datePeriod === p.id ? 'var(--accent)' : 'var(--border)',
                background: datePeriod === p.id ? 'var(--accent)' : 'transparent',
                color: datePeriod === p.id ? '#fff' : 'var(--text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

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

        {/* Budget Items */}
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Categories
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BUDGETS.map((b, i) => {
            const cat    = CATEGORIES[b.cat];
            const spent  = spendMap[b.cat] || 0;
            const pct    = Math.min((spent / b.budget) * 100, 100);
            const over   = spent > b.budget;
            const leftPct = Math.round((1 - spent / b.budget) * 100);

            return (
              <div key={b.cat} className="card anim-fadeup" style={{ padding: '14px 16px', animationDelay: `${i * 0.06}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: over ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {formatCurrency(spent)}
                        <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: 12 }}>
                          /{formatCurrency(b.budget)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
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
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: over ? 'var(--danger)' : 'var(--success)',
                  }}>
                    {over
                      ? `${formatCurrency(spent - b.budget, currency)} over`
                      : `${formatCurrency(b.budget - spent, currency)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
