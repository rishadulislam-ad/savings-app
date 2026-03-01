import { useMemo, useState } from 'react';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, formatCurrency } from '../data/transactions';

const FILTERS = ['All', 'Expense', 'Income'];

export default function TransactionsScreen({ transactions }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filter === 'Expense') list = list.filter(t => t.type === 'expense');
    if (filter === 'Income')  list = list.filter(t => t.type === 'income');
    if (search) list = list.filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      CATEGORIES[t.category]?.label.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [transactions, filter, search]);

  // Group by date
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    });
    return Object.entries(map).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [filtered]);

  const totalFiltered = filtered.reduce((s, t) =>
    t.type === 'expense' ? s - t.amount : s + t.amount, 0
  );

  function formatDate(d) {
    const date = new Date(d + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Transactions
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {filtered.length} records
            <span style={{
              marginLeft: 8, fontWeight: 700,
              color: totalFiltered >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {totalFiltered >= 0 ? '+' : '−'}{formatCurrency(Math.abs(totalFiltered))}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            className="form-input"
            style={{ paddingLeft: 38, marginBottom: 0 }}
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`chip ${filter === f ? 'chip-solid' : 'chip-outline'}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="screen-content" style={{ padding: '0 20px 16px' }}>
        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No transactions found</div>
          </div>
        ) : (
          grouped.map(([date, txs]) => {
            const dayTotal = txs.reduce((s, t) =>
              t.type === 'expense' ? s - t.amount : s + t.amount, 0
            );
            return (
              <div key={date} style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {formatDate(date)}
                  </span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: dayTotal >= 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {dayTotal >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayTotal))}
                  </span>
                </div>
                <div className="card" style={{ padding: '0 16px' }}>
                  {txs.map(tx => <TransactionItem key={tx.id} tx={tx} />)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
