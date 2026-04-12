import { useState, useEffect, useMemo } from 'react';
import { CURRENCIES } from '../data/transactions';
import { lightTap, successTap, errorTap } from '../utils/haptics';
import FeatureTip from '../components/FeatureTip';
import { saveUserData } from '../utils/firestore';

/* ─── Data ──────────────────────────────────────────────────── */
const DESTINATIONS = [
  { country: 'United States',  currency: 'USD', flag: '🇺🇸' },
  { country: 'Euro Zone',      currency: 'EUR', flag: '🇪🇺' },
  { country: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { country: 'Japan',          currency: 'JPY', flag: '🇯🇵' },
  { country: 'Canada',         currency: 'CAD', flag: '🇨🇦' },
  { country: 'Australia',      currency: 'AUD', flag: '🇦🇺' },
  { country: 'Switzerland',    currency: 'CHF', flag: '🇨🇭' },
  { country: 'China',          currency: 'CNY', flag: '🇨🇳' },
  { country: 'Bangladesh',     currency: 'BDT', flag: '🇧🇩' },
  { country: 'India',          currency: 'INR', flag: '🇮🇳' },
  { country: 'Pakistan',       currency: 'PKR', flag: '🇵🇰' },
  { country: 'Sri Lanka',      currency: 'LKR', flag: '🇱🇰' },
  { country: 'Nepal',          currency: 'NPR', flag: '🇳🇵' },
  { country: 'UAE',            currency: 'AED', flag: '🇦🇪' },
  { country: 'Saudi Arabia',   currency: 'SAR', flag: '🇸🇦' },
  { country: 'Qatar',          currency: 'QAR', flag: '🇶🇦' },
  { country: 'Kuwait',         currency: 'KWD', flag: '🇰🇼' },
  { country: 'Singapore',      currency: 'SGD', flag: '🇸🇬' },
  { country: 'Malaysia',       currency: 'MYR', flag: '🇲🇾' },
  { country: 'Thailand',       currency: 'THB', flag: '🇹🇭' },
  { country: 'Indonesia',      currency: 'IDR', flag: '🇮🇩' },
  { country: 'Philippines',    currency: 'PHP', flag: '🇵🇭' },
  { country: 'Vietnam',        currency: 'VND', flag: '🇻🇳' },
  { country: 'South Korea',    currency: 'KRW', flag: '🇰🇷' },
  { country: 'Hong Kong',      currency: 'HKD', flag: '🇭🇰' },
  { country: 'Taiwan',         currency: 'TWD', flag: '🇹🇼' },
  { country: 'Brazil',         currency: 'BRL', flag: '🇧🇷' },
  { country: 'Mexico',         currency: 'MXN', flag: '🇲🇽' },
  { country: 'Argentina',      currency: 'ARS', flag: '🇦🇷' },
  { country: 'Chile',          currency: 'CLP', flag: '🇨🇱' },
  { country: 'Sweden',         currency: 'SEK', flag: '🇸🇪' },
  { country: 'Norway',         currency: 'NOK', flag: '🇳🇴' },
  { country: 'Denmark',        currency: 'DKK', flag: '🇩🇰' },
  { country: 'Poland',         currency: 'PLN', flag: '🇵🇱' },
  { country: 'Turkey',         currency: 'TRY', flag: '🇹🇷' },
  { country: 'Russia',         currency: 'RUB', flag: '🇷🇺' },
  { country: 'South Africa',   currency: 'ZAR', flag: '🇿🇦' },
  { country: 'Nigeria',        currency: 'NGN', flag: '🇳🇬' },
  { country: 'Egypt',          currency: 'EGP', flag: '🇪🇬' },
  { country: 'Kenya',          currency: 'KES', flag: '🇰🇪' },
];

const CARD_GRADIENTS = [
  ['#3a3fa0', '#4a2878'],
  ['#a0285a', '#c02040'],
  ['#1a60a8', '#0078a8'],
  ['#18804a', '#108868'],
  ['#b84818', '#c86010'],
  ['#1888a0', '#2818c0'],
  ['#a03050', '#804030'],
  ['#0A5CDD', '#003098'],
];

/* Travel expense categories */
const TRAVEL_CATS = {
  accommodation: { label: 'Hotel',       icon: '🏨', color: '#667eea' },
  flights:       { label: 'Flights',     icon: '✈️', color: '#4facfe' },
  food:          { label: 'Food',        icon: '🍽️', color: '#fa709a' },
  transport:     { label: 'Transport',   icon: '🚌', color: '#F59E0B' },
  activities:    { label: 'Activities',  icon: '🎡', color: '#43e97b' },
  shopping:      { label: 'Shopping',    icon: '🛍️', color: '#06B6D4' },
  health:        { label: 'Health',      icon: '💊', color: '#EC4899' },
  other:         { label: 'Other',       icon: '📦', color: '#8B5CF6' },
};

/* ─── Helpers ───────────────────────────────────────────────── */
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function tripStatus(startDate, endDate) {
  if (!startDate) return 'upcoming';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + 'T00:00:00');
  const end   = endDate ? new Date(endDate + 'T00:00:00') : null;
  if (start > today)           return 'upcoming';
  if (!end || end >= today)    return 'active';
  return 'completed';
}

function tripDays(startDate, endDate) {
  if (!startDate) return null;
  const s = new Date(startDate + 'T00:00:00');
  const e = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

function fmtMoney(amount, symbol) {
  return `${symbol}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCurrencySymbol(code) {
  const cur = CURRENCIES.find(c => c.code === code);
  return cur?.symbol || code;
}

/* ─── Icons ─────────────────────────────────────────────────── */
function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

/* ─── Shared Styles ─────────────────────────────────────────── */
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7,
};
const inputStyle = (active) => ({
  width: '100%', padding: '11px 14px', borderRadius: 12, boxSizing: 'border-box',
  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  background: 'var(--surface2)', color: 'var(--text-primary)',
  fontSize: 15, fontWeight: 500, outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
});
const pickerBtnStyle = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
  padding: '11px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
  border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  background: 'var(--surface2)', transition: 'border-color 0.2s',
});

/* ─── Inline Picker (Destination or Currency) ───────────────── */
function InlinePicker({ title, items, selectedKey, onSelect, onBack, keyField, labelField, subField, rightField, flagField }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() =>
    items.filter(i =>
      i[labelField]?.toLowerCase().includes(search.toLowerCase()) ||
      i[keyField]?.toLowerCase().includes(search.toLowerCase())
    ), [items, search, labelField, keyField]);

  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
          }}
        ><BackIcon /></button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      </div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
        <input
          autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(item => {
          const isActive = item[keyField] === selectedKey;
          return (
            <button
              key={item[keyField]} onClick={() => onSelect(item)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left', background: isActive ? 'var(--accent-light)' : 'transparent', transition: 'background 0.1s' }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item[flagField]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>{item[labelField]}</div>
                {subField && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item[subField]}</div>}
              </div>
              {rightField && <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>{item[rightField]}</span>}
              {isActive && <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Add / Edit Expense Sheet ──────────────────────────────── */
function AddExpenseSheet({ trip, onSave, onClose, initialExpense }) {
  const isEdit = !!initialExpense;
  const [amount,  setAmount]  = useState(isEdit ? String(initialExpense.amount) : '');
  const [catKey,  setCatKey]  = useState(isEdit ? initialExpense.category : 'food');
  const [note,    setNote]    = useState(isEdit ? initialExpense.note : '');
  const [date,    setDate]    = useState(isEdit ? initialExpense.date : new Date().toISOString().split('T')[0]);

  const isValid = parseFloat(amount) > 0;
  const sym     = getCurrencySymbol(trip.currency);

  function handleSave() {
    if (!isValid) return;
    successTap();
    onSave({
      // preserve original id when editing, generate new id when adding
      id:       isEdit ? initialExpense.id : `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amount:   parseFloat(amount),
      category: catKey,
      note:     note.trim(),
      date,
    });
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease both' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: 'var(--surface)', borderRadius: '22px 22px 0 0', maxHeight: '92%', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ padding: '0 20px 48px' }}>
          {/* Handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 18px' }}/>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
                {isEdit ? 'Edit Expense' : 'Add Expense'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{trip.flag} {trip.name}</div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}>✕</button>
          </div>

          {/* Amount Input — big and centred */}
          <div style={{ textAlign: 'center', marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-tertiary)', lineHeight: 1, paddingTop: 6 }}>{sym}</span>
              <input
                type="number" min="0" step="any" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)', background: 'transparent', border: 'none', outline: 'none', width: 200, textAlign: 'center', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ height: 2, borderRadius: 1, margin: '6px auto 0', width: '55%', background: amount ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s' }}/>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>{trip.currency} · {trip.destination}</div>
          </div>

          {/* Category Grid */}
          <div style={{ marginBottom: 18 }}>
            <div style={labelStyle}>Category</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.entries(TRAVEL_CATS).map(([key, c]) => {
                const isActive = catKey === key;
                return (
                  <button
                    key={key} onClick={() => setCatKey(key)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 14, border: 'none', background: isActive ? `${c.color}20` : 'var(--surface2)', cursor: 'pointer', transition: 'all 0.15s', outline: isActive ? `2px solid ${c.color}` : '2px solid transparent' }}
                  >
                    <span style={{ fontSize: 22 }}>{c.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? c.color : 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.2 }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Note (optional)</div>
            <input
              type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Dinner at restaurant, Train ticket…" maxLength={60}
              style={inputStyle(!!note)}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: 24 }}>
            <div style={labelStyle}>Date</div>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
              <div style={{
                padding: '11px 12px', borderRadius: 12,
                border: `1.5px solid ${date ? 'var(--accent)' : 'var(--border)'}`,
                background: 'var(--surface2)', color: 'var(--text-primary)',
                fontSize: 13, textAlign: 'center', boxSizing: 'border-box',
              }}>
                {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date'}
              </div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                opacity: 0, cursor: 'pointer', fontSize: 16, margin: 0, padding: 0, border: 'none',
              }} />
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave} disabled={!isValid}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: isValid ? 'var(--accent)' : 'var(--border)', color: isValid ? '#fff' : 'var(--text-tertiary)', fontSize: 15, fontWeight: 700, cursor: isValid ? 'pointer' : 'default', boxShadow: isValid ? '0 4px 14px rgba(10,108,255,0.35)' : 'none', transition: 'all 0.2s' }}
          >
            {isEdit ? '✓ Save Changes' : '+ Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Sheet ──────────────────────────────────── */
function DeleteConfirmSheet({ tripName, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 900, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.15s ease both' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: 'var(--surface)', borderRadius: '22px 22px 0 0', padding: '0 20px 48px', animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1) both', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 24px' }}/>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.3px' }}>Delete Trip?</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This will permanently delete <strong>"{tripName}"</strong> and all its expense entries.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: '#ef4444', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Trip Book Screen ──────────────────────────────────────── */
function TripBookScreen({ trip, onBack, onUpdate, onDelete }) {
  const [showAdd,           setShowAdd]           = useState(false);
  const [editingExpense,    setEditingExpense]     = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditTrip,      setShowEditTrip]       = useState(false);
  const [editName,          setEditName]           = useState(trip.name);
  const [editBudget,        setEditBudget]         = useState(String(trip.budget || ''));
  const [editStartDate,     setEditStartDate]      = useState(trip.startDate || '');
  const [editEndDate,       setEditEndDate]        = useState(trip.endDate || '');

  function openEditTrip() {
    setEditName(trip.name);
    setEditBudget(String(trip.budget || ''));
    setEditStartDate(trip.startDate || '');
    setEditEndDate(trip.endDate || '');
    setShowEditTrip(true);
  }

  function saveEditTrip() {
    if (!editName.trim()) return;
    successTap();
    onUpdate({
      ...trip,
      name: editName.trim(),
      budget: parseFloat(editBudget) || 0,
      startDate: editStartDate,
      endDate: editEndDate,
    });
    setShowEditTrip(false);
  }

  const [g0, g1]   = trip.gradient || ['#667eea', '#764ba2'];
  const sym        = getCurrencySymbol(trip.currency);
  const expenses   = trip.expenses || [];
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const pct        = trip.budget > 0 ? Math.min((totalSpent / trip.budget) * 100, 100) : 0;
  const days       = tripDays(trip.startDate, trip.endDate);

  /* Group expenses by date, newest first */
  const grouped = useMemo(() => {
    const map = {};
    [...expenses]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(e => { (map[e.date] = map[e.date] || []).push(e); });
    return Object.entries(map);
  }, [expenses]);

  /* Category spending breakdown */
  const catBreakdown = useMemo(() => {
    const acc = {};
    expenses.forEach(e => { acc[e.category] = (acc[e.category] || 0) + e.amount; });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  function addExpense(exp) {
    onUpdate({ ...trip, expenses: [exp, ...expenses] });
  }
  function updateExpense(updated) {
    onUpdate({ ...trip, expenses: expenses.map(e => e.id === updated.id ? updated : e) });
  }
  function deleteExpense(id) {
    errorTap();
    onUpdate({ ...trip, expenses: expenses.filter(e => e.id !== id) });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--bg)' }}>

      {/* ── Hero Header ── */}
      <div className="safe-top" style={{ background: `linear-gradient(135deg, ${g0}, ${g1})`, padding: '0 20px 22px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {/* Decorative flag */}
        <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 110, opacity: 0.13, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{trip.flag}</div>

        {/* Nav row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative' }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)' }}>
            <BackIcon />
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openEditTrip} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)' }}>
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Trip info */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 48, lineHeight: 1, flexShrink: 0 }}>{trip.flag}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: 2 }}>{trip.name}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>{trip.destination}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {trip.startDate ? `${fmtDateShort(trip.startDate)}${trip.endDate ? ` → ${fmtDateShort(trip.endDate)}` : ''}${days ? ` · ${days}d` : ''}` : 'Dates not set'}
            </div>
          </div>
        </div>

        {/* Spending card */}
        <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: '14px 16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: trip.budget > 0 ? 10 : 0 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Spent</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{fmtMoney(totalSpent, sym)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{expenses.length} Expense{expenses.length !== 1 ? 's' : ''}</div>
              {trip.budget > 0 && (
                <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Budget {fmtMoney(trip.budget, sym)}</div>
              )}
            </div>
          </div>
          {trip.budget > 0 && (
            <>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct > 90 ? '#ff6b6b' : '#fff', transition: 'width 0.4s' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{pct.toFixed(0)}% used</span>
                <span style={{ fontSize: 11, color: pct > 90 ? '#ffcdd2' : 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                  {fmtMoney(Math.max(trip.budget - totalSpent, 0), sym)} left
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="screen-content" style={{ padding: '16px 20px 100px', flex: 1 }}>

        {/* Empty state */}
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 24px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.3px' }}>No expenses yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 28 }}>
              Tap the <strong>+</strong> button to log your first spending entry in {trip.currency}
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{ padding: '13px 28px', borderRadius: 14, background: `linear-gradient(135deg, ${g0}, ${g1})`, color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 14px ${g0}55` }}
            >+ Add First Expense</button>
          </div>
        ) : (
          <>
            {/* Category breakdown — only when 2+ expenses */}
            {expenses.length >= 2 && (
              <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Spending Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {catBreakdown.map(([key, total]) => {
                    const cat    = TRAVEL_CATS[key] || { icon: '📦', label: key, color: '#8B5CF6' };
                    const catPct = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{cat.icon}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtMoney(total, sym)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{catPct.toFixed(0)}%</div>
                          </div>
                        </div>
                        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${catPct}%`, background: cat.color, borderRadius: 2, transition: 'width 0.4s' }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily expense entries */}
            {grouped.map(([date, exps]) => (
              <div key={date} style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 8 }}>
                  {fmtDate(date)}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 8 }}>
                  {exps.map((exp, idx) => {
                    const cat = TRAVEL_CATS[exp.category] || { icon: '📦', label: 'Other', color: '#8B5CF6' };
                    return (
                      <div
                        key={exp.id}
                        onClick={() => setEditingExpense(exp)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: idx < exps.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                      >
                        {/* Category icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>

                        {/* Label + category */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {exp.note || cat.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{cat.icon} {cat.label}</div>
                        </div>

                        {/* Amount + delete only */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtMoney(exp.amount, sym)}</div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteExpense(exp.id); }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                          ><TrashIcon /></button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Day subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Day total: {fmtMoney(exps.reduce((s, e) => s + e.amount, 0), sym)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'absolute', bottom: 24, right: 20, zIndex: 10,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${g0}, ${g1})`,
          color: '#fff', fontSize: 26, cursor: 'pointer',
          boxShadow: `0 6px 20px ${g0}77`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
      >
        <PlusIcon />
      </button>

      {/* Sheets */}
      {showAdd && (
        <AddExpenseSheet
          trip={trip}
          onSave={addExpense}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editingExpense && (
        <AddExpenseSheet
          trip={trip}
          initialExpense={editingExpense}
          onSave={updateExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
      {showDeleteConfirm && (
        <DeleteConfirmSheet
          tripName={trip.name}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete(trip.id); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Edit Trip Sheet */}
      {showEditTrip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={() => setShowEditTrip(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', width: '100%', background: 'var(--surface)',
            borderRadius: '24px 24px 0 0', padding: '16px 20px 34px',
            animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
            maxHeight: '85%', overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: 20 }}>Edit Trip</div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Trip Name</div>
              <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={32} className="form-input" style={{ fontSize: 15 }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Budget ({getCurrencySymbol(trip.currency)})</div>
              <input value={editBudget} onChange={e => setEditBudget(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" inputMode="decimal" className="form-input" style={{ fontSize: 15 }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Start Date</div>
              <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="form-input" style={{ fontSize: 15 }} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>End Date</div>
              <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} min={editStartDate || undefined} className="form-input" style={{ fontSize: 15 }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEditTrip(false)} style={{
                flex: 1, padding: 14, borderRadius: 12, border: '1.5px solid var(--border)',
                background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={saveEditTrip} disabled={!editName.trim()} style={{
                flex: 1, padding: 14, borderRadius: 12, border: 'none',
                background: editName.trim() ? 'var(--accent)' : 'var(--surface2)',
                color: editName.trim() ? '#fff' : 'var(--text-tertiary)',
                fontSize: 14, fontWeight: 700, cursor: editName.trim() ? 'pointer' : 'not-allowed',
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Create Trip Sheet ─────────────────────────────────────── */
function CreateTripSheet({ onSave, onClose }) {
  const [tripName,    setTripName]    = useState('');
  const [destination, setDestination] = useState(null);
  const [currency,    setCurrency]    = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [budget,      setBudget]      = useState('');
  const [gradIdx,     setGradIdx]     = useState(0);
  const [picker,      setPicker]      = useState(null); // 'dest' | 'currency' | null

  const isValid = tripName.trim().length > 0 && destination !== null;

  function selectDest(d) { setDestination(d); setCurrency(d.currency); setPicker(null); }
  function selectCurrency(c) { setCurrency(c.code); setPicker(null); }

  function handleSave() {
    if (!isValid) return;
    successTap();
    onSave({
      id:          `trip_${Date.now()}`,
      name:        tripName.trim(),
      destination: destination.country,
      flag:        destination.flag,
      currency:    currency || destination.currency,
      startDate,
      endDate,
      budget:      parseFloat(budget) || 0,
      gradient:    CARD_GRADIENTS[gradIdx],
      createdAt:   Date.now(),
      expenses:    [],
    });
    onClose();
  }

  const [g0, g1] = CARD_GRADIENTS[gradIdx];
  const selCurInfo = CURRENCIES.find(c => c.code === currency);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 900, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--surface)', borderRadius: '22px 22px 0 0', maxHeight: '93%', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '0 20px 44px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 20px' }}/>

          {/* Destination picker */}
          {picker === 'dest' && (
            <InlinePicker title="Select Destination" items={DESTINATIONS} selectedKey={destination?.country} onSelect={selectDest} onBack={() => setPicker(null)} keyField="country" labelField="country" subField="currency" flagField="flag" />
          )}

          {/* Currency picker */}
          {picker === 'currency' && (
            <InlinePicker title="Select Currency" items={CURRENCIES} selectedKey={currency} onSelect={selectCurrency} onBack={() => setPicker(null)} keyField="code" labelField="code" subField="name" rightField="symbol" flagField="flag" />
          )}

          {/* Main form */}
          {!picker && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>New Trip Book</div>
                <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
              </div>

              {/* Live card preview */}
              <div style={{ background: `linear-gradient(135deg, ${g0}, ${g1})`, borderRadius: 18, padding: '20px 22px', marginBottom: 22, position: 'relative', overflow: 'hidden', boxShadow: `0 8px 24px ${g0}55` }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 90, opacity: 0.12, lineHeight: 1, pointerEvents: 'none' }}>{destination?.flag || '✈️'}</div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 46, lineHeight: 1 }}>{destination?.flag || '✈️'}</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>{tripName || 'Trip Name'}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{destination?.country || 'Select a destination'}</div>
                    {(startDate || endDate) && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{fmtDate(startDate)} → {fmtDate(endDate)}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Trip name */}
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Trip Name *</div>
                <input type="text" value={tripName} onChange={e => setTripName(e.target.value)} placeholder="e.g. Summer in Tokyo" maxLength={32} style={inputStyle(!!tripName)} />
              </div>

              {/* Destination */}
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Destination *</div>
                <button onClick={() => setPicker('dest')} style={pickerBtnStyle(!!destination)}>
                  <span style={{ fontSize: 22 }}>{destination?.flag || '🌍'}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: destination ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{destination?.country || 'Select destination country'}</div>
                  </div>
                  <ChevronRight />
                </button>
              </div>

              {/* Currency */}
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Currency <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0, marginLeft: 6, fontSize: 10 }}>(auto-set from destination)</span></div>
                <button onClick={() => setPicker('currency')} style={pickerBtnStyle(!!currency)}>
                  <span style={{ fontSize: 22 }}>{selCurInfo?.flag || '💰'}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: currency ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{currency ? `${currency} · ${selCurInfo?.name}` : 'Select currency'}</div>
                  </div>
                  <ChevronRight />
                </button>
              </div>

              {/* Dates */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[['Start Date', startDate, setStartDate], ['End Date', endDate, setEndDate]].map(([lbl, val, setter]) => (
                  <div key={lbl} style={{ flex: 1, minWidth: 0 }}>
                    <div style={labelStyle}>{lbl}</div>
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
                      <div style={{
                        padding: '11px 8px', borderRadius: 12,
                        border: `1.5px solid ${val ? 'var(--accent)' : 'var(--border)'}`,
                        background: 'var(--surface2)', color: 'var(--text-primary)',
                        fontSize: 13, textAlign: 'center', boxSizing: 'border-box',
                      }}>
                        {val ? new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select'}
                      </div>
                      <input type="date" value={val} onChange={e => setter(e.target.value)} style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        opacity: 0, cursor: 'pointer', fontSize: 16, margin: 0, padding: 0, border: 'none',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Budget */}
              <div style={{ marginBottom: 18 }}>
                <div style={labelStyle}>Travel Budget <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'none', letterSpacing: 0, marginLeft: 6, fontSize: 10 }}>(optional)</span></div>
                <input type="number" min="0" step="any" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0.00" style={inputStyle(false)} />
              </div>

              {/* Card Color */}
              <div style={{ marginBottom: 24 }}>
                <div style={labelStyle}>Card Color</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {CARD_GRADIENTS.map((g, i) => (
                    <button key={i} onClick={() => setGradIdx(i)} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s', boxShadow: gradIdx === i ? `0 0 0 2px var(--surface), 0 0 0 4px ${g[0]}` : 'none' }} />
                  ))}
                </div>
              </div>

              {/* Save */}
              <button onClick={handleSave} disabled={!isValid} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: isValid ? `linear-gradient(135deg, ${g0}, ${g1})` : 'var(--border)', color: isValid ? '#fff' : 'var(--text-tertiary)', fontSize: 15, fontWeight: 700, cursor: isValid ? 'pointer' : 'default', transition: 'all 0.2s', boxShadow: isValid ? `0 4px 14px ${g0}55` : 'none' }}>
                Create Trip Book
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Trip Card ─────────────────────────────────────────────── */
function TripCard({ trip, onPress }) {
  const status = tripStatus(trip.startDate, trip.endDate);
  const days   = tripDays(trip.startDate, trip.endDate);
  const [g0, g1] = trip.gradient || ['#667eea', '#764ba2'];
  const totalSpent = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
  const sym = getCurrencySymbol(trip.currency);

  const statusLabel = { upcoming: 'Upcoming', active: '● Active', completed: 'Completed' }[status];

  return (
    <div
      onClick={onPress}
      style={{ background: `linear-gradient(135deg, ${g0}, ${g1})`, borderRadius: 20, padding: '20px 22px', marginBottom: 12, cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: `0 8px 28px ${g0}44`, transition: 'transform 0.15s, box-shadow 0.15s', WebkitTapHighlightColor: 'transparent' }}
    >
      <div style={{ position: 'absolute', top: -8, right: -8, fontSize: 96, opacity: 0.12, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>{trip.flag}</div>

      <div style={{ position: 'relative' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>{trip.flag}</div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', background: 'rgba(255,255,255,0.22)', color: '#fff', padding: '4px 10px', borderRadius: 20, backdropFilter: 'blur(8px)' }}>{statusLabel}</span>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.4px', marginBottom: 2 }}>{trip.name}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 14 }}>{trip.destination}</div>

        {/* Bottom row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            {trip.startDate ? `${fmtDateShort(trip.startDate)}${trip.endDate ? ` → ${fmtDateShort(trip.endDate)}` : ''}` : 'Dates not set'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {days && <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: '#fff', padding: '3px 9px', borderRadius: 8 }}>{days}d</span>}
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: '#fff', padding: '3px 9px', borderRadius: 8 }}>{trip.currency}</span>
          </div>
        </div>

        {/* Budget bar */}
        {trip.budget > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((totalSpent / trip.budget) * 100, 100)}%`, background: '#fff', borderRadius: 2 }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {totalSpent > 0 ? `Spent: ${fmtMoney(totalSpent, sym)}` : 'No expenses yet'}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Budget: {fmtMoney(trip.budget, sym)}</span>
            </div>
          </div>
        )}

        {/* Tap hint */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10, gap: 4 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Tap to open book</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>›</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Screen ───────────────────────────────────────────── */
export default function TravelTrackerScreen({ currentUser, onBack, registerBackHandler }) {
  const key = currentUser ? `coinova_trips_${currentUser.uid}` : 'coinova_trips_guest';

  const [trips,        setTrips]        = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [showCreate,   setShowCreate]   = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Re-read trips from localStorage when Firestore sync delivers new data from another device
  useEffect(() => {
    function handleSync() {
      try {
        const saved = localStorage.getItem(key);
        if (saved) setTrips(JSON.parse(saved));
      } catch {}
    }
    window.addEventListener('coinova-data-sync', handleSync);
    return () => window.removeEventListener('coinova-data-sync', handleSync);
  }, [key]);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (selectedTrip) { setSelectedTrip(null); return true; }
      if (showCreate) { setShowCreate(false); return true; }
      return false;
    });
    return () => registerBackHandler(null);
  }, [selectedTrip, showCreate, registerBackHandler]);

  function saveTrips(next) {
    setTrips(next);
    localStorage.setItem(key, JSON.stringify(next));
    if (currentUser?.uid) saveUserData(currentUser.uid, { trips: next });
  }

  function addTrip(trip)    { saveTrips([trip, ...trips]); }

  function updateTrip(updated) {
    const next = trips.map(t => t.id === updated.id ? updated : t);
    saveTrips(next);
    setSelectedTrip(updated); // keep detail view in sync
  }

  function deleteTrip(id) {
    errorTap();
    saveTrips(trips.filter(t => t.id !== id));
    setSelectedTrip(null);
  }

  /* ── If a trip is open, render Trip Book ── */
  if (selectedTrip) {
    // Always use the latest version of the trip from state
    const latestTrip = trips.find(t => t.id === selectedTrip.id) || selectedTrip;
    return (
      <TripBookScreen
        trip={latestTrip}
        onBack={() => setSelectedTrip(null)}
        onUpdate={updateTrip}
        onDelete={deleteTrip}
      />
    );
  }

  const byStatus = {
    active:    trips.filter(t => tripStatus(t.startDate, t.endDate) === 'active'),
    upcoming:  trips.filter(t => tripStatus(t.startDate, t.endDate) === 'upcoming'),
    completed: trips.filter(t => tripStatus(t.startDate, t.endDate) === 'completed'),
  };

  const stats = [
    { icon: '🗺️', label: 'Total',     value: trips.length },
    { icon: '✈️', label: 'Active',    value: byStatus.active.length },
    { icon: '📅', label: 'Upcoming',  value: byStatus.upcoming.length },
    { icon: '✅', label: 'Completed', value: byStatus.completed.length },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Header ── */}
      <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <BackIcon />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Travel Tracker</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
              {trips.length === 0 ? 'Create trip books for each journey' : `${trips.length} trip${trips.length !== 1 ? 's' : ''} · ${byStatus.active.length} active`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="screen-content" style={{ padding: '16px 20px 32px' }}>

        {trips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>✈️</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.3px' }}>No trips yet</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 28, lineHeight: 1.5 }}>Create a travel book for each destination to track your spending across currencies</div>
            <button data-tour="travel-create-first" onClick={() => setShowCreate(true)} style={{ padding: '13px 32px', borderRadius: 14, background: 'var(--accent)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(10,108,255,0.35)' }}>
              + Create First Trip
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div data-tour="travel-stats" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {stats.map(s => (
                <div key={s.label} className="card anim-fadeup" style={{ flex: 1, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {[
              { label: 'Active',    list: byStatus.active    },
              { label: 'Upcoming',  list: byStatus.upcoming  },
              { label: 'Completed', list: byStatus.completed },
            ].map(({ label, list }) =>
              list.length === 0 ? null : (
                <div key={label}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, marginTop: 4 }}>{label}</div>
                  {list.map((t, i) => <div key={t.id} {...(i === 0 && label === 'Active' ? { 'data-tour': 'travel-trip' } : {})}><TripCard trip={t} onPress={() => setSelectedTrip(t)} /></div>)}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <button onClick={() => { lightTap(); setShowCreate(true); }} style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--accent)', border: 'none', color: '#fff',
        fontSize: 28, fontWeight: 300, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 24px rgba(79,110,247,0.4)',
        zIndex: 10,
      }}><PlusIcon /></button>

      {showCreate && <CreateTripSheet onSave={addTrip} onClose={() => setShowCreate(false)} />}
      <FeatureTip tipId="travel" currentUser={currentUser} />
    </div>
  );
}
