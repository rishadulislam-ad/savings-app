import { useState, useEffect, useMemo } from 'react';
import { CATEGORIES, formatCurrency, groupByCategory } from '../data/transactions';
import { useTheme } from '../context/ThemeContext';
import { lightTap, successTap, errorTap } from '../utils/haptics';
import { saveUserData } from '../utils/firestore';
import MyFinances from './profile/MyFinances';
import FeatureTip from '../components/FeatureTip';

/* ─── Defaults ───────────────────────────────────────────── */
const DEFAULT_BUDGETS = {
  eating_out:    0,
  groceries:     0,
  transport:     0,
  entertainment: 0,
  health:        0,
  shopping:      0,
};
const DEFAULT_CAT_KEYS = Object.keys(DEFAULT_BUDGETS);

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
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function filterByMonth(transactions, year, month) {
  const prefix = monthKey(year, month);
  return transactions.filter(t => t.date && t.date.startsWith(prefix));
}

/* Get budget for a specific month, auto-copying from previous month if needed */
function getMonthBudget(allBudgets, year, month) {
  const key = monthKey(year, month);
  if (allBudgets[key]) return allBudgets[key];
  // Try previous month
  let py = month === 0 ? year - 1 : year;
  let pm = month === 0 ? 11 : month - 1;
  const prevKey = monthKey(py, pm);
  if (allBudgets[prevKey]) return { ...allBudgets[prevKey] };
  // No previous month either — return defaults
  return { ...DEFAULT_BUDGETS };
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
    successTap();
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
    <div
      data-kb-push
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 900, display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div
        data-keyboard-scroll
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--surface)', borderRadius: '22px 22px 0 0',
          padding: '0 20px 36px', zIndex: 101,
          animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 20px' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>New Category</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 14, marginBottom: 22, border: '1px solid var(--border)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: colorPick.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{name.trim() || 'Category Name'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{budget ? `${budget}/mo limit` : 'No limit set'}</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Category Name</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pet Care" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Icon</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setIcon(e)} style={{
                width: 38, height: 38, borderRadius: 10, border: icon === e ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                background: icon === e ? 'var(--accent-light)' : 'var(--surface2)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Color</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLOR_OPTIONS.map(c => (
              <button key={c.color} onClick={() => setColorPick(c)} style={{
                width: 34, height: 34, borderRadius: '50%', background: c.color, border: colorPick.color === c.color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer',
              }}/>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Monthly Budget (optional)</div>
          <input type="text" inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>

        <button onClick={handleSave} disabled={!isValid} style={{
          width: '100%', padding: 16, borderRadius: 16, border: 'none', background: isValid ? 'var(--accent)' : 'var(--surface2)', color: isValid ? '#fff' : 'var(--text-tertiary)', fontSize: 15, fontWeight: 700, cursor: isValid ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
        }}>Add Category</button>
      </div>
    </div>
  );
}

/* ─── Main Screen ─────────────────────────────────────────── */
export default function BudgetsScreen({ transactions, currentUser, registerBackHandler, customCategories = [], onAddCustomCategory, onDeleteCustomCategory, onAddTransaction, onDeleteTransaction }) {
  const { currency, isDark } = useTheme();
  const [activeView, setActiveView] = useState('budgets'); // 'budgets' | 'savings'
  const budgetKey = currentUser ? `coinova_budgets_${currentUser.uid}` : 'coinova_budgets_guest';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  /* allBudgets: { "2026-04": { eating_out: 500 }, ... } */
  const [allBudgets, setAllBudgets] = useState(() => {
    try {
      const s = localStorage.getItem(budgetKey);
      if (!s) return {};
      const parsed = JSON.parse(s);
      // Migration: if old flat format (no month keys like "2026-04"), wrap into current month
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const firstKey = Object.keys(parsed)[0];
        if (firstKey && !firstKey.match(/^\d{4}-\d{2}$/)) {
          // Old flat format — migrate to current month
          const mk = monthKey(now.getFullYear(), now.getMonth());
          return { [mk]: parsed };
        }
      }
      return parsed || {};
    } catch { return {}; }
  });

  // Current month's budget (auto-copies from previous month if needed)
  const currentMK = monthKey(viewYear, viewMonth);
  const budgets = useMemo(() => getMonthBudget(allBudgets, viewYear, viewMonth), [allBudgets, viewYear, viewMonth]);

  function updateBudget(catKey, value) {
    setAllBudgets(prev => ({
      ...prev,
      [currentMK]: { ...getMonthBudget(prev, viewYear, viewMonth), [catKey]: value },
    }));
  }

  function removeBudgetKey(catKey) {
    setAllBudgets(prev => {
      const updated = { ...prev };
      if (updated[currentMK]) {
        const copy = { ...updated[currentMK] };
        delete copy[catKey];
        updated[currentMK] = copy;
      }
      return updated;
    });
  }

  /* Build customCats */
  const customCatKey = currentUser ? `coinova_custom_cats_${currentUser.uid}` : 'coinova_custom_cats_guest';
  const customCats = useMemo(() => {
    const obj = {};
    try {
      const s = localStorage.getItem(customCatKey);
      if (s) { const parsed = JSON.parse(s); if (typeof parsed === 'object' && !Array.isArray(parsed)) Object.assign(obj, parsed); }
    } catch {}
    customCategories.forEach(c => { obj[c.id] = { label: c.label, icon: c.icon, color: c.color, bg: c.bg }; });
    return obj;
  }, [customCategories, customCatKey]);

  const [editingCat, setEditingCat] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (showAddSheet) { setShowAddSheet(false); return true; }
      return false;
    });
    return () => registerBackHandler(null);
  }, [showAddSheet, registerBackHandler]);

  /* Persist budgets */
  useEffect(() => {
    localStorage.setItem(budgetKey, JSON.stringify(allBudgets));
    if (currentUser?.uid) saveUserData(currentUser.uid, { budgets: allBudgets });
  }, [allBudgets, budgetKey, currentUser?.uid]);

  // Sync from Firestore
  useEffect(() => {
    function handleSync() {
      try {
        const saved = localStorage.getItem(budgetKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) setAllBudgets(parsed);
        }
      } catch {}
    }
    window.addEventListener('coinova-data-sync', handleSync);
    return () => window.removeEventListener('coinova-data-sync', handleSync);
  }, [budgetKey]);

  /* All category keys */
  const allCatKeys = useMemo(() => [...DEFAULT_CAT_KEYS, ...Object.keys(customCats)], [customCats]);
  const getCat = key => CATEGORIES[key] || customCats[key] || { label: key, icon: '📦', color: '#6B7280', bg: '#F9FAFB' };

  /* Filter transactions for viewed month */
  const filtered = useMemo(() => filterByMonth(transactions, viewYear, viewMonth), [transactions, viewYear, viewMonth]);
  const byCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const spendMap = Object.fromEntries(byCategory.map(c => [c.cat, c.total]));

  /* Totals */
  const totalBudget = allCatKeys.reduce((s, k) => s + (budgets[k] || 0), 0);
  const totalSpent = allCatKeys.reduce((s, k) => s + (spendMap[k] || 0), 0);
  const remaining = totalBudget - totalSpent;
  const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  /* Edit helpers */
  function startEdit(key, e) {
    lightTap(); setEditingCat(key); setEditValue(String(budgets[key] ?? ''));
    // Scroll the card into view after keyboard opens
    const card = e?.currentTarget?.closest?.('.card');
    if (card) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
  }
  function saveEdit() {
    successTap();
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0 && val <= 999999) updateBudget(editingCat, val);
    setEditingCat(null); setEditValue('');
  }
  function cancelEdit() { setEditingCat(null); setEditValue(''); }

  /* Add custom category */
  function handleAddCat({ key, label, icon, color, bg, budget: amt }) {
    if (onAddCustomCategory) onAddCustomCategory({ id: key, label, icon, color, bg });
    if (amt > 0) updateBudget(key, amt);
  }

  /* Delete custom category */
  function handleDeleteCat(key) {
    errorTap();
    if (onDeleteCustomCategory) onDeleteCustomCategory(key);
    removeBudgetKey(key);
  }

  /* Month navigation */
  function prevMonth() {
    lightTap();
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    lightTap();
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Header ── */}
      <div className="safe-top" style={{
        padding: '0 20px 12px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Tab toggle */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 14, padding: 3, marginBottom: 12 }}>
          {[{ id: 'budgets', label: 'Budgets' }, { id: 'savings', label: 'Savings Goals' }].map(tab => (
            <button key={tab.id} onClick={() => { lightTap(); setActiveView(tab.id); }}
              style={{
                flex: 1, padding: '9px', borderRadius: 11, border: 'none',
                background: activeView === tab.id ? 'var(--surface)' : 'transparent',
                color: activeView === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: activeView === tab.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Month navigation — only for budgets view */}
        {activeView === 'budgets' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={prevMonth} style={{
            width: 36, height: 36, borderRadius: 12, border: '1.5px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            {isCurrentMonth && (
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginTop: 1 }}>Current Month</div>
            )}
          </div>
          <button onClick={nextMonth} style={{
            width: 36, height: 36, borderRadius: 12, border: '1.5px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>}
      </div>

      {/* ── Savings Goals view ── */}
      {activeView === 'savings' && (
        <div className="screen-content">
          <MyFinances
            transactions={transactions}
            currentUser={currentUser}
            currency={currency}
            onAddTransaction={onAddTransaction}
            onDeleteTransaction={onDeleteTransaction}
            embedded
          />
        </div>
      )}

      {/* ── Budgets content ── */}
      {activeView === 'budgets' && <div className="screen-content" style={{ padding: '16px 20px 32px' }}>

        {/* Overall Card */}
        <div className="summary-card anim-fadeup" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {MONTH_NAMES[viewMonth]} Budget
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
            const cat = getCat(catKey);
            const budget = budgets[catKey] ?? 0;
            const spent = spendMap[catKey] || 0;
            const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            const over = budget > 0 && spent > budget;
            const isEditing = editingCat === catKey;
            const isCustom = !DEFAULT_CAT_KEYS.includes(catKey);

            return (
              <div key={catKey} className="card anim-fadeup"
                style={{ padding: '14px 16px', animationDelay: `${i * 0.05}s` }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: cat.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>{cat.icon}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</span>
                        {isCustom && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 5, padding: '1px 5px', letterSpacing: '0.06em' }}>CUSTOM</span>
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
                          <button onClick={(e) => startEdit(catKey, e)} style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'var(--surface2)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0,
                          }}><PencilIcon /></button>
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
                        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Editing...</span>
                      )}
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ marginBottom: 10, animation: 'fadeUp 0.18s ease both' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                      {MONTH_NAMES[viewMonth]} Budget Amount
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text" inputMode="decimal"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value.replace(/[^0-9.]/g, ''))}
                        autoFocus placeholder="0"
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                        style={{
                          flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 12,
                          border: '1.5px solid var(--accent)', background: 'var(--surface2)',
                          color: 'var(--text-primary)', fontSize: 18, fontWeight: 700,
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                          WebkitAppearance: 'none', MozAppearance: 'textfield',
                        }}
                      />
                      <button onClick={saveEdit} style={{
                        padding: '12px 16px', borderRadius: 12, background: 'var(--accent)',
                        color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        flexShrink: 0, fontFamily: 'inherit',
                      }}>Save</button>
                      <button onClick={cancelEdit} style={{
                        width: 40, height: 40, borderRadius: 12, background: 'var(--surface2)',
                        color: 'var(--text-secondary)', border: '1px solid var(--border)',
                        fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0,
                      }}>✕</button>
                    </div>
                  </div>
                )}

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
                      No limit set for {MONTH_NAMES[viewMonth]} — tap ✏️ to add one
                    </div>
                  )
                )}
              </div>
            );
          })}

          <button
            onClick={() => { lightTap(); setShowAddSheet(true); }}
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
            <PlusIcon /> Add Category
          </button>
        </div>
      </div>}

      {showAddSheet && <AddCategorySheet onAdd={handleAddCat} onClose={() => setShowAddSheet(false)} />}
      <FeatureTip tipId={activeView === 'savings' ? 'savings' : 'budgets'} currentUser={currentUser} />
    </div>
  );
}
