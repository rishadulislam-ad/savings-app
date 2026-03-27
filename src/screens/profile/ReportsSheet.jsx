import { useState } from 'react';
import { formatCurrency, CURRENCIES, CATEGORIES } from '../../data/transactions';

export default function ReportsSheet({ onClose, transactions, currency }) {
  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const [viewMode, setViewMode] = useState('monthly');

  const grouped = {};
  transactions.forEach(t => {
    const key = viewMode === 'monthly' ? (t.date || '').slice(0, 7) : (t.date || '').slice(0, 4);
    if (!key) return;
    if (!grouped[key]) grouped[key] = { income: 0, expense: 0, count: 0, categories: {} };
    if (t.type === 'income') grouped[key].income += t.amount;
    else {
      grouped[key].expense += t.amount;
      grouped[key].categories[t.category] = (grouped[key].categories[t.category] || 0) + t.amount;
    }
    grouped[key].count++;
  });

  const periods = Object.keys(grouped).sort().reverse();
  const maxExpense = Math.max(...Object.values(grouped).map(g => g.expense), 1);

  function formatPeriod(key) {
    if (viewMode === 'yearly') return key;
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en', { month: 'long', year: 'numeric' });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '48px 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Reports</div>
        <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['monthly', 'yearly'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: viewMode === mode ? 'var(--accent)' : 'var(--surface2)',
              color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
              border: viewMode === mode ? 'none' : '1px solid var(--border)',
              textTransform: 'capitalize', transition: 'all 0.2s ease',
            }}>{mode}</button>
          ))}
        </div>

        {periods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
            No transaction data to show
          </div>
        ) : (
          periods.map(period => {
            const data = grouped[period];
            const balance = data.income - data.expense;
            const savingsRate = data.income > 0 ? Math.round((balance / data.income) * 100) : 0;
            const topCats = Object.entries(data.categories)
              .map(([cat, amount]) => ({ cat, amount, info: CATEGORIES[cat] || { label: cat, icon: '📦', color: '#6B7280' } }))
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 3);

            return (
              <div key={period} className="card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{formatPeriod(period)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{data.count} transactions</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: '8px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Income</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>{formatCurrency(data.income, currency)}</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Expense</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>{formatCurrency(data.expense, currency)}</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: 8, background: balance >= 0 ? 'rgba(10,108,255,0.06)' : 'rgba(239,68,68,0.06)', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Balance</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: balance >= 0 ? 'var(--accent)' : 'var(--danger)', marginTop: 2 }}>{formatCurrency(balance, currency)}</div>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${(data.expense / maxExpense) * 100}%`, height: '100%', borderRadius: 3, background: 'var(--danger)', transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {topCats.map(c => (
                      <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 6, background: 'var(--surface2)', fontSize: 10 }}>
                        <span>{c.info.icon}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{formatCurrency(c.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                  {data.income > 0 && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      background: savingsRate >= 20 ? 'rgba(16,185,129,0.1)' : savingsRate >= 0 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: savingsRate >= 20 ? 'var(--success)' : savingsRate >= 0 ? '#F59E0B' : 'var(--danger)',
                    }}>
                      {savingsRate}% saved
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
