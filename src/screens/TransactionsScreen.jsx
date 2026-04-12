import { useMemo, useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import TransactionItem from '../components/TransactionItem';
import { CATEGORIES, formatCurrency } from '../data/transactions';
import FeatureTip from '../components/FeatureTip';
import { useTheme } from '../context/ThemeContext';
import { lightTap, successTap, errorTap } from '../utils/haptics';

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

export default function TransactionsScreen({ transactions, onEdit, onDelete, datePeriod, onPeriodChange, customCategories, currentUser }) {
  const { currency } = useTheme();
  const allCategories = customCategories?.length
    ? { ...CATEGORIES, ...Object.fromEntries(customCategories.map(c => [c.id, c])) }
    : CATEGORIES;
  const [typeFilter, setTypeFilter]     = useState('All');
  const [datePreset, setDatePreset]     = useState(datePeriod || 'all');
  const [search, setSearch]             = useState('');
  const [showCustom, setShowCustom]     = useState(false);
  const [customFrom, setCustomFrom]     = useState('');
  const [customTo, setCustomTo]         = useState('');
  const [selectMode, setSelectMode]     = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const [exportToast, setExportToast]   = useState('');

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function handleBulkDelete() {
    if (!onDelete || selected.size === 0) return;
    errorTap();
    const ids = [...selected];
    ids.forEach(id => onDelete(id));
    exitSelectMode();
  }

  const COMMON_PERIODS = ['today', 'week', 'month', 'all'];

  function handlePreset(id) {
    if (id === 'custom') {
      setShowCustom(true);
    } else {
      setDatePreset(id);
      if (COMMON_PERIODS.includes(id)) onPeriodChange(id);
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
    if (search) {
      const q = search.toLowerCase().trim();
      const searchNum = parseFloat(q.replace(/[^0-9.]/g, ''));
      const hasNum = !isNaN(searchNum) && searchNum > 0;
      list = list.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q) ||
        (allCategories[t.category]?.label || '').toLowerCase().includes(q) ||
        (hasNum && t.amount === searchNum) ||
        (hasNum && t.amount.toString().includes(q))
      );
    }
    return list;
  }, [transactions, typeFilter, activeRange, search, allCategories]);

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

  async function downloadCSV() {
    const header = ['Date', 'Type', 'Category', 'Title/Note', 'Amount', 'Currency'];
    const rows = filtered.map(t => [
      t.date,
      t.type,
      allCategories[t.category]?.label || t.category,
      (t.title || t.note || '').replace(/"/g, '""'),
      t.amount,
      currency,
    ]);
    const csvContent = [header, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    const fileName = `coinova-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: btoa(new TextEncoder().encode(csvContent).reduce((s, b) => s + String.fromCharCode(b), '')),
        directory: Directory.Cache,
      });
      await Share.share({
        title: 'Coinova Transactions',
        url: result.uri,
      });
      successTap();
      setExportToast('Exported successfully');
    } catch {
      // Fallback for web
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successTap();
        setExportToast('Exported successfully');
      } catch {
        errorTap();
        setExportToast('Export failed');
      }
    }
    setTimeout(() => setExportToast(''), 2500);
  }

  const activeDateLabel = datePreset === 'custom'
    ? `${customFrom} → ${customTo}`
    : DATE_PRESETS.find(p => p.id === datePreset)?.label;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="safe-top" style={{ padding: '0 20px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Transactions
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={downloadCSV}
                aria-label="Export transactions as CSV"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'var(--accent-light)', color: 'var(--accent)',
                  fontSize: 12, fontWeight: 700, borderRadius: 8,
                  padding: '5px 10px', border: 'none', cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M7 9L4 6M7 9l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Export
              </button>
              {onDelete && (
                <button
                  onClick={selectMode ? exitSelectMode : () => { lightTap(); setSelectMode(true); }}
                  aria-label={selectMode ? 'Cancel selection' : 'Select transactions'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: selectMode ? 'var(--accent)' : 'var(--surface2)',
                    color: selectMode ? '#fff' : 'var(--text-secondary)',
                    fontSize: 12, fontWeight: 700, borderRadius: 8,
                    padding: '5px 10px', border: selectMode ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                >
                  {selectMode ? 'Cancel' : 'Select'}
                </button>
              )}
            </div>
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
            aria-label="Search transactions"
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
              onClick={() => { lightTap(); setTypeFilter(f); }}
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
                onClick={() => { lightTap(); handlePreset(p.id); }}
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
          grouped.map(([date, txs], i) => {
            const dayTotal = txs.reduce((s, t) =>
              t.type === 'expense' ? s - t.amount : s + t.amount, 0
            );
            return (
              <div key={date} className="anim-fadeup" style={{ marginTop: 16, animationDelay: `${i * 0.06}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {formatDate(date)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: dayTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {dayTotal >= 0 ? '+' : '−'}{formatCurrency(Math.abs(dayTotal), currency)}
                  </span>
                </div>
                <div className="card" style={{ padding: '0 16px' }}>
                  {txs.map(tx => (
                    <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {selectMode && (
                        <div
                          onClick={() => toggleSelect(tx.id)}
                          style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            border: selected.has(tx.id) ? 'none' : '2px solid var(--border)',
                            background: selected.has(tx.id) ? 'var(--accent)' : 'var(--surface2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', marginRight: 8, transition: 'all 0.15s',
                          }}
                        >
                          {selected.has(tx.id) && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <TransactionItem tx={tx} onClick={selectMode ? () => toggleSelect(tx.id) : onEdit} customCategories={customCategories} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Delete Bottom Bar */}
      {selectMode && selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {selected.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            style={{
              background: 'var(--danger)', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 20px', fontWeight: 700,
              fontSize: 14, cursor: 'pointer',
            }}
          >
            Delete All
          </button>
        </div>
      )}

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
                max={customTo || undefined}
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
                disabled={!customFrom || !customTo || customFrom > customTo}
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

      {/* Export toast */}
      {exportToast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: exportToast.includes('fail') ? 'var(--danger)' : 'var(--success)',
          color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 999,
          animation: 'fadeIn 0.2s ease both',
        }}>{exportToast}</div>
      )}
      <FeatureTip tipId="transactions" currentUser={currentUser} />
    </div>
  );
}
