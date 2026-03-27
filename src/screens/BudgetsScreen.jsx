import { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';

/* ─── Defaults ───────────────────────────────────────────── */
const DEFAULT_BUDGETS = {
  eating_out:    300,
  groceries:     400,
  transport:     100,
  entertainment: 80,
  health:        120,
  shopping:      200,
};
const DEFAULT_CAT_KEYS = Object.keys(DEFAULT_BUDGETS);

const DATE_PERIODS = [
  { id: 'today',  label: 'Today' },
  { id: 'week',   label: 'This Week' },
  { id: 'month',  label: 'This Month' },
  { id: 'all',    label: 'All Time' },
  { id: 'custom', label: '📅 Custom' },
];

const EMOJI_OPTIONS = [
  '🏠','🚗','✈️','🎵','🎮','📚','💻','🏋️','💈','🐕',
  '🌿','☕','🎁','💰','🔧','🏥','🎓','👔','🌊','🎨',
  '🍕','🍺','🎪','🎯','💡','🧴','🐱','🌸','🏖️','🎭',
];

const COLOR_OPTIONS = [
  { color: '#FF6B6B', bg: '#FFF0F0' },
  { color: '#F59E0B', bg: '#FFFBEB' },
  { color: '#10B981', bg: '#ECFDF5' },
  { color: '#06B6D4', bg: '#ECFEFF' },
  { color: '#8B5CF6', bg: '#F5F3FF' },
  { color: '#EC4899', bg: '#FDF2F8' },
  { color: '#0A6CFF', bg: '#EFF6FF' },
  { color: '#6B7280', bg: '#F9FAFB' },
];

/* ─── Helpers ─────────────────────────────────────────────── */
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
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
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

/* ─── Icon components ─────────────────────────────────────── */
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

/* ─── Add-Category Bottom Sheet ───────────────────────────── */
function AddCategorySheet({ onAdd, onClose }) {
  const [name,      setName]      = useState('');
  const [icon,      setIcon]      = useState(EMOJI_OPTIONS[0]);
  const [colorPick, setColorPick] = useState(COLOR_OPTIONS[0]);
  const [budget,    setBudget]    = useState('');

  const isValid = name.trim().length > 0;

  function handleSave() {
    if (!isValid) return;
    const key = `custom_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    onAdd({
      key,
      label:  name.trim(),
      icon,
      color:  colorPick.color,
      bg:     colorPick.bg,
      budget: parseFloat(budget) || 0,
    });
    onClose();
  }

  return (
    /* Overlay anchors to the nearest position:relative ancestor (the screen wrapper) */
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      {/* Sheet — stop clicks propagating to backdrop */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--surface)', borderRadius: '22px 22px 0 0',
          padding: '0 20px 36px', zIndex: 101,
          animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          maxHeight: '90%', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'var(--border)', margin: '12px auto 20px',
        }}/>

        {/* Title */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22,
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            New Category
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16,
          }}>✕</button>
        </div>

        {/* Preview pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          background: 'var(--surface2)', borderRadius: 14, marginBottom: 22,
          border: '1px solid var(--border)',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13, background: colorPick.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>{icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {name.trim() || 'Category Name'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
              {budget ? `$${budget}/mo limit` : 'No limit set'}
            </div>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
            Category Name
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Pet Care, Hobbies…"
            maxLength={24}
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              border: `1.5px solid ${name.trim() ? 'var(--accent)' : 'var(--border)'}`,
              background: 'var(--surface2)', color: 'var(--text-primary)',
              fontSize: 15, fontWeight: 500, outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Emoji picker */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Icon
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                style={{
                  width: 40, height: 40, borderRadius: 10, fontSize: 20,
                  border: `2px solid ${icon === e ? 'var(--accent)' : 'var(--border)'}`,
                  background: icon === e ? 'var(--accent-light)' : 'var(--surface2)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{e}</button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Color
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.color}
                onClick={() => setColorPick(c)}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: c.color, border: `3px solid ${colorPick.color === c.color ? 'var(--text-primary)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                  boxShadow: colorPick.color === c.color ? `0 0 0 2px var(--surface), 0 0 0 4px ${c.color}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Monthly budget */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>
            Monthly Budget (optional)
          </div>
          <input
            type="number"
            min="0"
            step="any"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            placeholder="0.00"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 12,
              border: '1.5px solid var(--border)', background: 'var(--surface2)',
              color: 'var(--text-primary)', fontSize: 15, fontWeight: 600,
              outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isValid}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            background: isValid ? 'var(--accent)' : 'var(--border)',
            color: isValid ? '#fff' : 'var(--text-tertiary)',
            border: 'none', fontSize: 15, fontWeight: 700,
            cursor: isValid ? 'pointer' : 'default',
            transition: 'all 0.2s', letterSpacing: '0.02em',
          }}
        >
          Add Category
        </button>
      </div>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────────── */
export default function BudgetsScreen({ transactions, datePeriod, onPeriodChange, currentUser }) {
  const { currency, isDark } = useTheme();
  const budgetKey    = currentUser ? `findo_budgets_${currentUser.email}`     : 'findo_budgets_guest';
  const customCatKey = currentUser ? `findo_custom_cats_${currentUser.email}` : 'findo_custom_cats_guest';

  /* budgets: { [catKey]: amount } */
  const [budgets, setBudgets] = useState(() => {
    try {
      const s = localStorage.getItem(budgetKey);
      return s ? JSON.parse(s) : { ...DEFAULT_BUDGETS };
    } catch { return { ...DEFAULT_BUDGETS }; }
  });

  /* customCats: { [catKey]: { label, icon, color, bg } } */
  const [customCats, setCustomCats] = useState(() => {
    try {
      const s = localStorage.getItem(customCatKey);
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });

  const [editingCat,  setEditingCat]  = useState(null);
  const [editValue,   setEditValue]   = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [showAddSheet, setShowAddSheet] = useState(false);

  /* Persist */
  useEffect(() => { localStorage.setItem(budgetKey,    JSON.stringify(budgets));    }, [budgets,    budgetKey]);
  useEffect(() => { localStorage.setItem(customCatKey, JSON.stringify(customCats)); }, [customCats, customCatKey]);

  /* All category keys (default + custom) */
  const allCatKeys = useMemo(() => [...DEFAULT_CAT_KEYS, ...Object.keys(customCats)], [customCats]);

  /* Helper: get category display info */
  const getCat = key => CATEGORIES[key] || customCats[key] || { label: key, icon: '📦', color: '#6B7280', bg: '#F9FAFB' };

  /* Filtered transactions */
  const filtered   = useMemo(() => filterByPeriod(transactions, datePeriod, customRange), [transactions, datePeriod, customRange]);
  const byCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const spendMap   = Object.fromEntries(byCategory.map(c => [c.cat, c.total]));

  /* Totals */
  const totalBudget = allCatKeys.reduce((s, k) => s + (budgets[k] || 0), 0);
  const totalSpent  = allCatKeys.reduce((s, k) => s + (spendMap[k]  || 0), 0);
  const remaining   = totalBudget - totalSpent;
  const overallPct  = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  /* Edit helpers */
  function startEdit(key) { setEditingCat(key); setEditValue(String(budgets[key] ?? '')); }
  function saveEdit() {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) setBudgets(prev => ({ ...prev, [editingCat]: val }));
    setEditingCat(null); setEditValue('');
  }
  function cancelEdit() { setEditingCat(null); setEditValue(''); }

  /* Add custom category */
  function handleAddCat({ key, label, icon, color, bg, budget: amt }) {
    setCustomCats(prev => ({ ...prev, [key]: { label, icon, color, bg } }));
    if (amt > 0) setBudgets(prev => ({ ...prev, [key]: amt }));
  }

  /* Delete custom category */
  function handleDeleteCat(key) {
    setCustomCats(prev => { const n = { ...prev }; delete n[key]; return n; });
    setBudgets(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  const isCustomPeriod = datePeriod === 'custom';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '48px 20px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Budgets
          </div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            background: 'var(--accent-light)', borderRadius: 6,
            padding: '2px 8px', letterSpacing: '0.04em',
          }}>MONTHLY</div>
        </div>

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {DATE_PERIODS.map(p => (
            <button key={p.id} onClick={() => onPeriodChange(p.id)} style={{
              padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: datePeriod === p.id ? 'var(--accent)' : 'var(--border)',
              background:  datePeriod === p.id ? 'var(--accent)' : 'transparent',
              color:       datePeriod === p.id ? '#fff' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{p.label}</button>
          ))}
        </div>

        {/* Custom date inputs */}
        {isCustomPeriod && (
          <div style={{ display: 'flex', gap: 10, marginTop: 10, animation: 'fadeUp 0.2s ease both' }}>
            {[['from', 'From'], ['to', 'To']].map(([field, label]) => (
              <div key={field} style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                  {label}
                </div>
                <input type="date" value={customRange[field]}
                  onChange={e => setCustomRange(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 10,
                    border: `1.5px solid ${customRange[field] ? 'var(--accent)' : 'var(--border)'}`,
                    background: 'var(--surface2)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="screen-content" style={{ padding: '16px 20px 32px' }}>

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
              background: overallPct > 85 ? 'var(--danger)' : '#fff',
              borderRadius: 4, transition: 'width 0.6s ease',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{Math.round(overallPct)}% used</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {formatCurrency(remaining, currency)} left
            </span>
          </div>
        </div>

        {/* Budget Alerts */}
        {(() => {
          const alerts = allCatKeys.filter(k => {
            const b = budgets[k] || 0;
            const s = spendMap[k] || 0;
            return b > 0 && (s / b) >= 0.8;
          }).map(k => {
            const cat = getCat(k);
            const b = budgets[k] || 0;
            const s = spendMap[k] || 0;
            const pct = Math.round((s / b) * 100);
            const over = s > b;
            return { key: k, cat, pct, over, spent: s, budget: b };
          });
          if (alerts.length === 0) return null;
          return (
            <div className="card anim-fadeup" style={{
              padding: '12px 14px', marginBottom: 16,
              background: isDark ? 'rgba(239,68,68,0.06)' : '#FFF5F5',
              border: `1px solid ${isDark ? 'rgba(239,68,68,0.15)' : '#FECACA'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                  {alerts.length} budget{alerts.length > 1 ? 's' : ''} need attention
                </span>
              </div>
              {alerts.map(a => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
                  <span style={{ fontSize: 14 }}>{a.cat.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{a.cat.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: a.over ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                    color: a.over ? 'var(--danger)' : '#F59E0B',
                  }}>
                    {a.over ? `${a.pct}% — over budget!` : `${a.pct}% used`}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Categories</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <PencilIcon /> tap to edit limit
          </div>
        </div>

        {/* Category cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allCatKeys.map((catKey, i) => {
            const cat       = getCat(catKey);
            const budget    = budgets[catKey] ?? 0;
            const spent     = spendMap[catKey] || 0;
            const pct       = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const over      = budget > 0 && spent > budget;
            const isEditing = editingCat === catKey;
            const isCustom  = !DEFAULT_CAT_KEYS.includes(catKey);

            return (
              <div key={catKey} className="card anim-fadeup"
                style={{ padding: '14px 16px', animationDelay: `${i * 0.05}s` }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: cat.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>{cat.icon}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cat.label}
                        </span>
                        {isCustom && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                            background: 'var(--accent-light)', borderRadius: 5,
                            padding: '1px 5px', letterSpacing: '0.06em',
                          }}>CUSTOM</span>
                        )}
                      </div>

                      {!isEditing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: over ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {formatCurrency(spent, currency)}
                            {budget > 0 && (
                              <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: 12 }}>
                                /{formatCurrency(budget, currency)}
                              </span>
                            )}
                          </span>
                          {/* Edit button */}
                          <button onClick={() => startEdit(catKey)} style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
                          }}><PencilIcon /></button>
                          {/* Delete button (custom only) */}
                          {isCustom && (
                            <button onClick={() => handleDeleteCat(catKey)} style={{
                              width: 28, height: 28, borderRadius: 8,
                              background: '#FFF0F0', border: '1px solid #FFCDD2',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', color: 'var(--danger)', flexShrink: 0,
                            }}><TrashIcon /></button>
                          )}
                        </div>
                      )}
                      {isEditing && (
                        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Editing…</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ marginBottom: 10, animation: 'fadeUp 0.18s ease both' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      Monthly Budget Amount
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="number" min="0" step="any"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus placeholder="0.00"
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: 10,
                          border: '1.5px solid var(--accent)', background: 'var(--surface2)',
                          color: 'var(--text-primary)', fontSize: 16, fontWeight: 700,
                          outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button onClick={saveEdit} style={{
                        padding: '10px 18px', borderRadius: 10, background: 'var(--accent)',
                        color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      }}>Save</button>
                      <button onClick={cancelEdit} style={{
                        padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)',
                        color: 'var(--text-secondary)', border: '1px solid var(--border)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}>✕</button>
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                {!isEditing && (
                  budget > 0 ? (
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
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{Math.round(pct)}% used</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: over ? 'var(--danger)' : 'var(--success)' }}>
                          {over
                            ? `${formatCurrency(spent - budget, currency)} over`
                            : `${formatCurrency(budget - spent, currency)} left`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center',
                      padding: '4px 0 2px', fontStyle: 'italic',
                    }}>
                      No monthly limit set — tap ✏️ to add one
                    </div>
                  )
                )}
              </div>
            );
          })}

          {/* Add Category button */}
          <button
            onClick={() => setShowAddSheet(true)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '14px', borderRadius: 16,
              border: '2px dashed var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', marginTop: 4,
              width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <PlusIcon /> Add New Category
          </button>
        </div>
      </div>

      {/* Add Category Sheet */}
      {showAddSheet && (
        <AddCategorySheet
          onAdd={handleAddCat}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </div>
  );
}
