import { useMemo, useState } from 'react';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, formatCurrency } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

const TYPE_FILTERS = ['All', 'Expense', 'Income'];

const DATE_PRESETS = [
  { id: 'all',      label: 'All Time' },
  { id: 'today',    label: 'Today' },
  { id: 'yesterday',label: 'Yesterday' },
  { id: 'week',     label: 'This Week' },
  { id: '7days',    label: 'Last 7 Days' },
  { id: 'month',    label: 'This Month' },
  { id: '30days',   label: 'Last 30 Days' },
  { id: '3months',  label: 'Last 3 Months' },
  { id: 'year',     label: 'This Year' },
  { id: 'custom',   label: '📅 Custom' },
];

function getDateRange(presetId) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const pad = d => d.toISOString().slice(0, 10);

  switch (presetId) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const s = pad(y);
      return { from: s, to: s };
    }
    case 'week': {
      const day = now.getDay(); // 0=Sun
      const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7));
      return { from: pad(mon), to: todayStr };
    }
    case '7days': {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: pad(d), to: todayStr };
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: pad(d), to: todayStr };
    }
    case '30days': {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: pad(d), to: todayStr };
    }
    case '3months': {
      const d = new Date(now); d.setMonth(d.getMonth() - 3);
      return { from: pad(d), to: todayStr };
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1);
      return { from: pad(d), to: todayStr };
    }
    default:
      return null; // 'all' and 'custom'
  }
}

export default function TransactionsScreen({ transactions }) {
  const { currency } = useTheme();
  const [typeFilter, setTypeFilter]     = useState('All');
  const [datePreset, setDatePreset]     = useState('all');
  const [search, setSearch]             = useState('');
  const [showCustom, setShowCustom]     = useState(false);
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');

  function handlePreset(id) {
    if (id === 'custom') {
      setShowCustom(true);
    } else {
      setDatePreset(id);
    }
  }

  function applyCustom() {
    if (customFrom && customTo) {
      setDatePreset('custom');
      setShowCustom(false);
    }
  }

  function clearCustom() {
    setCustomFrom('');
    setCustomTo('');
    setDatePreset('all');
    setShowCustom(false);
  }

  const activeRange = useMemo(() => {
    if (datePreset === 'custom') return { from: customFrom, to: customTo };
    if (datePreset === 'all') return null;
    return getDateRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (typeFilter === 'Expense') list = list.filter(t => t.type === 'expense');
    if (typeFilter === 'Income')  list = list.filter(t => t.type === 'income');
    if (activeRange) {
      list = list.filter(t => t.date >= activeRange.from && t.date <= activeRange.to);
    }
    if (search) list = list.filter(t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      CATEGORIES[t.category]?.label.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  }, [transactions, typeFilter, activeRange, search]);

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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  const activeDateLabel = datePreset === 'custom'
    ? `${customFrom} → ${customTo}`
    : DATE_PRESETS.find(p => p.id === datePreset)?.label;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '0 20px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Transactions
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{filtered.length} records</span>
            <span style={{
              fontWeight: 700,
              color: totalFiltered >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {totalFiltered >= 0 ? '+' : '−'}{formatCurrency(Math.abs(totalFiltered), currency)}
            </span>
            {datePreset !== 'all' && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 20,
              }}>
                {activeDateLabel}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            className="form-input"
            style={{ paddingLeft: 38 }}
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Type Segmented Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--surface2)',
          borderRadius: 12,
          padding: 3,
          marginBottom: 10,
          gap: 2,
        }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                border: 'none',
                background: typeFilter === f ? 'var(--surface)' : 'transparent',
                color: typeFilter === f ? 'var(--accent)' : 'var(--text-tertiary)',
                fontSize: 13,
                fontWeight: typeFilter === f ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.18s',
                boxShadow: typeFilter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Date Filter Scroll Row */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
          {DATE_PRESETS.map(p => {
            const isActive = datePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List */}
      <div className="screen-content" style={{ padding: '0 20px 16px' }}>
        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No transactions found</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Try adjusting your filters</div>
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
                  <span style={{ fontSize: 13, fontWeight: 700, color: dayTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {dayTotal >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayTotal), currency)}
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

      {/* Custom Date Range Sheet */}
      {showCustom && (
        <div className="sheet-overlay" onClick={() => setShowCustom(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Custom Range</span>
              <button onClick={() => setShowCustom(false)} style={{
                background: 'var(--surface2)', border: 'none', width: 32, height: 32,
                borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">From</label>
              <input
                className="form-input"
                type="date"
                value={customFrom}
                max={customTo || new Date().toISOString().slice(0,10)}
                onChange={e => setCustomFrom(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">To</label>
              <input
                className="form-input"
                type="date"
                value={customTo}
                min={customFrom}
                max={new Date().toISOString().slice(0,10)}
                onChange={e => setCustomTo(e.target.value)}
              />
            </div>

            {/* Quick shortcuts inside custom */}
            <div style={{ marginBottom: 20 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Quick Fill</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'This Month', id: 'month' },
                  { label: 'Last Month', id: 'lastmonth' },
                  { label: 'Last 30 Days', id: '30days' },
                  { label: 'This Year', id: 'year' },
                ].map(q => {
                  function fill() {
                    const now = new Date();
                    const pad = d => d.toISOString().slice(0,10);
                    let from, to = pad(now);
                    if (q.id === 'month') {
                      from = pad(new Date(now.getFullYear(), now.getMonth(), 1));
                    } else if (q.id === 'lastmonth') {
                      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                      const t = new Date(now.getFullYear(), now.getMonth(), 0);
                      from = pad(f); to = pad(t);
                    } else if (q.id === '30days') {
                      const d = new Date(now); d.setDate(d.getDate() - 29);
                      from = pad(d);
                    } else if (q.id === 'year') {
                      from = pad(new Date(now.getFullYear(), 0, 1));
                    }
                    setCustomFrom(from); setCustomTo(to);
                  }
                  return (
                    <button key={q.id} onClick={fill} className="chip chip-outline">
                      {q.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={clearCustom} style={{
                flex: 1, padding: '14px', background: 'var(--surface2)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>
                Clear
              </button>
              <button
                onClick={applyCustom}
                disabled={!customFrom || !customTo}
                style={{
                  flex: 2, padding: '14px',
                  background: customFrom && customTo ? 'linear-gradient(145deg, #1A7FFF, #0052CC)' : 'var(--border)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  color: customFrom && customTo ? '#fff' : 'var(--text-tertiary)',
                  fontWeight: 700, fontSize: 15, cursor: customFrom && customTo ? 'pointer' : 'default',
                  boxShadow: customFrom && customTo ? '0 4px 16px rgba(10,108,255,0.35)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
