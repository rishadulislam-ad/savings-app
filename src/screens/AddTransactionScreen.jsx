import { useState } from 'react';
import { CATEGORIES, WALLETS } from '../data/transactions';

const DEFAULT_TAGS = ['Food', 'Work', 'Family', 'Health', 'Fun', 'Travel', 'Bills', 'Gifts'];

const CAT_COLORS = [
  '#667eea', '#f97316', '#ec4899', '#10b981',
  '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444',
];

const CAT_EMOJIS = ['🏷️','🎮','🏠','📚','🎵','⚽','🌿','🎁','🐾','🍕','☕','🚀','🌟','💡','🎨','🏋️'];

export default function AddTransactionScreen({ onClose, onSave, onDelete, initialTx, customCategories = [], customTags = [], onAddCustomCategory, onAddCustomTag }) {
  const isEditing = !!initialTx;
  const [type, setType] = useState(initialTx?.type || 'expense');
  const [amount, setAmount] = useState(initialTx ? String(initialTx.amount) : '');
  const [title, setTitle] = useState(initialTx?.title || '');
  const [category, setCategory] = useState(initialTx?.category || 'eating_out');
  const [wallet, setWallet] = useState(initialTx?.wallet || 'main');
  const [tags, setTags] = useState(initialTx?.tags || []);
  const [note, setNote] = useState(initialTx?.note || '');
  const [date, setDate] = useState(initialTx?.date || new Date().toISOString().slice(0, 10));
  const [isRecurring, setIsRecurring] = useState(initialTx?.recurring || false);
  const [recurFreq, setRecurFreq] = useState(initialTx?.recurFreq || 'monthly');

  // Custom category sheet state
  const [showAddCat, setShowAddCat]     = useState(false);
  const [newCatEmoji, setNewCatEmoji]   = useState('🏷️');
  const [newCatName, setNewCatName]     = useState('');
  const [newCatColor, setNewCatColor]   = useState('#667eea');

  // Custom tag input state
  const [showTagInput, setShowTagInput] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  // Merged categories: built-in + custom
  const allCategories = customCategories.length
    ? { ...CATEGORIES, ...Object.fromEntries(customCategories.map(c => [c.id, c])) }
    : CATEGORIES;

  const expenseCategories = ['eating_out', 'groceries', 'transport', 'entertainment', 'health', 'shopping', 'childcare', 'other'];
  const incomeCategories  = ['salary', 'freelance', 'other'];
  const builtInCats = type === 'expense' ? expenseCategories : incomeCategories;
  // Show ALL custom categories regardless of type
  const cats = [...builtInCats, ...customCategories.map(c => c.id)];

  // Merged tags: default + custom
  const allTags = [...DEFAULT_TAGS, ...customTags];

  function toggleTag(t) {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  function handleAmountInput(e) {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(val);
  }

  function handleSave() {
    if (!amount || parseFloat(amount) <= 0) return;
    const tx = {
      type,
      amount: parseFloat(amount),
      title: title || allCategories[category]?.label || 'Transaction',
      category,
      wallet,
      tags,
      note,
      date,
    };
    if (isRecurring) {
      tx.recurring = true;
      tx.recurFreq = recurFreq;
    }
    onSave(tx);
    onClose();
  }

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    const newCat = {
      id: `custom_${Date.now()}`,
      label: newCatName.trim(),
      icon: newCatEmoji,
      color: newCatColor,
      bg: `${newCatColor}22`,
    };
    onAddCustomCategory?.(newCat);
    setCategory(newCat.id);
    setNewCatName('');
    setNewCatEmoji('🏷️');
    setNewCatColor('#667eea');
    setShowAddCat(false);
  }

  function handleAddCustomTag() {
    const tag = customTagInput.trim();
    if (!tag) return;
    setTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
    onAddCustomTag?.(tag);
    setCustomTagInput('');
    setShowTagInput(false);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* Header */}
      <div style={{
        padding: '48px 20px 0', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <button onClick={onClose} style={{
            background: 'var(--surface2)', border: 'none', width: 36, height: 36,
            borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9L11 14" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</span>
          {isEditing ? (
            <button onClick={() => onDelete(initialTx.id)} style={{
              background: '#FF4444', border: 'none', padding: '8px 16px',
              borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
              Delete
            </button>
          ) : (
            <button onClick={handleSave} style={{
              background: 'var(--accent)', border: 'none', padding: '8px 16px',
              borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff',
              opacity: (!amount || parseFloat(amount) <= 0) ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}>
              Save
            </button>
          )}
        </div>

        {/* Type Toggle */}
        <div style={{ padding: '12px 0 16px' }}>
          <div className="type-toggle">
            <button
              className={`type-toggle-btn ${type === 'expense' ? 'active-expense' : ''}`}
              onClick={() => { setType('expense'); setCategory('eating_out'); }}
            >
              Expense
            </button>
            <button
              className={`type-toggle-btn ${type === 'income' ? 'active-income' : ''}`}
              onClick={() => { setType('income'); setCategory('salary'); }}
            >
              Income
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Form */}
      <div className="screen-content" style={{ padding: '20px' }}>
        {/* Amount */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
          }}>
            Amount
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="amount-display" style={{
              color: type === 'expense' ? 'var(--danger)' : 'var(--success)',
            }}>
              {amount ? (
                <>
                  <span style={{ color: type === 'expense' ? '#FCA5A5' : '#6EE7B7' }}>$</span>
                  {parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </>
              ) : (
                <span style={{ color: 'var(--border)' }}>$0.00</span>
              )}
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountInput}
              placeholder=""
              style={{
                position: 'absolute', inset: 0, opacity: 0, cursor: 'text',
                fontSize: 48, width: '100%',
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <input
            className="form-input"
            type="text"
            placeholder={`e.g. ${allCategories[category]?.label}`}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label className="form-label" style={{ margin: 0 }}>Category</label>
          </div>
          <div className="category-grid">
            {cats.map(catKey => {
              const c = allCategories[catKey];
              if (!c) return null;
              const isActive = category === catKey;
              const isCustom = !!customCategories.find(cc => cc.id === catKey);
              return (
                <button
                  key={catKey}
                  className={`category-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCategory(catKey)}
                >
                  <div className="category-icon-wrap" style={{
                    background: isActive ? (c.bg || `${c.color}22`) : 'var(--surface2)',
                    position: 'relative',
                  }}>
                    <span>{c.icon}</span>
                    {isCustom && (
                      <div style={{
                        position: 'absolute', top: -3, right: -3,
                        width: 10, height: 10, borderRadius: '50%',
                        background: c.color, border: '1.5px solid var(--surface)',
                      }} />
                    )}
                  </div>
                  <span className="category-name">{c.label}</span>
                </button>
              );
            })}
            {/* + New Category button */}
            <button
              className="category-btn"
              onClick={() => setShowAddCat(true)}
            >
              <div className="category-icon-wrap" style={{
                background: 'var(--surface2)',
                border: '1.5px dashed var(--border)',
              }}>
                <span style={{ fontSize: 18, color: 'var(--text-tertiary)' }}>+</span>
              </div>
              <span className="category-name" style={{ color: 'var(--text-tertiary)' }}>New</span>
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            className="form-input"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Recurring Toggle */}
        <div className="form-group">
          <label className="form-label">Recurring</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div onClick={() => setIsRecurring(!isRecurring)} style={{
              width: 48, height: 28, borderRadius: 14, cursor: 'pointer',
              background: isRecurring ? 'var(--accent)' : 'var(--border)',
              position: 'relative', transition: 'background 0.25s ease', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3, left: isRecurring ? 23 : 3,
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isRecurring ? 'This transaction repeats' : 'One-time transaction'}
            </span>
          </div>
          {isRecurring && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {['weekly', 'monthly', 'yearly'].map(freq => (
                <button key={freq} onClick={() => setRecurFreq(freq)} style={{
                  flex: 1, padding: '8px 6px', borderRadius: 10,
                  background: recurFreq === freq ? 'var(--accent-light)' : 'var(--surface2)',
                  color: recurFreq === freq ? 'var(--accent)' : 'var(--text-secondary)',
                  border: recurFreq === freq ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                }}>{freq}</button>
              ))}
            </div>
          )}
        </div>

        {/* Wallet */}
        <div className="form-group">
          <label className="form-label">Wallet</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {WALLETS.map(w => (
              <button
                key={w.id}
                onClick={() => setWallet(w.id)}
                style={{
                  flex: 1, padding: '10px 8px',
                  background: wallet === w.id ? 'var(--accent-light)' : 'var(--surface2)',
                  border: `1.5px solid ${wallet === w.id ? 'var(--accent)' : 'transparent'}`,
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 20 }}>{w.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: wallet === w.id ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {w.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="tag-scroll">
            {allTags.map(t => (
              <button
                key={t}
                className={`chip ${tags.includes(t) ? 'chip-solid' : 'chip-outline'}`}
                onClick={() => toggleTag(t)}
              >
                {tags.includes(t) && <span>✓ </span>}
                {t}
              </button>
            ))}
            {/* Custom tag input / button */}
            {showTagInput ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <input
                  autoFocus
                  type="text"
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCustomTag();
                    if (e.key === 'Escape') { setCustomTagInput(''); setShowTagInput(false); }
                  }}
                  placeholder="Tag name…"
                  style={{
                    padding: '5px 12px', borderRadius: 20,
                    border: '1.5px solid var(--accent)',
                    background: 'var(--surface2)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none', width: 110, fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleAddCustomTag}
                  style={{
                    padding: '5px 10px', borderRadius: 20, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}
                >Add</button>
                <button
                  onClick={() => { setCustomTagInput(''); setShowTagInput(false); }}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none',
                    background: 'var(--surface2)', color: 'var(--text-tertiary)',
                    fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >✕</button>
              </div>
            ) : (
              <button
                className="chip chip-outline"
                onClick={() => setShowTagInput(true)}
                style={{ borderStyle: 'dashed', color: 'var(--text-tertiary)', flexShrink: 0 }}
              >
                + Tag
              </button>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="form-group">
          <label className="form-label">Note (optional)</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Add a note..."
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Save Button */}
        <button className="btn-primary" onClick={handleSave}>
          {isEditing ? 'Save Changes' : (type === 'expense' ? '− Add Expense' : '+ Add Income')}
        </button>
      </div>

      {/* ── Add Custom Category Sheet ── */}
      {showAddCat && (
        <div
          onClick={() => setShowAddCat(false)}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)', zIndex: 100,
            display: 'flex', alignItems: 'flex-end',
            animation: 'fadeIn 0.2s ease both',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--surface)',
              borderRadius: '22px 22px 0 0', padding: '0 20px 44px',
              animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 20px' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>New Category</div>
              <button
                onClick={() => setShowAddCat(false)}
                style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
            </div>

            {/* Emoji + Name row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, border: '1.5px solid var(--border)',
                  background: newCatColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, cursor: 'pointer',
                }}>{newCatEmoji}</div>
              </div>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name…"
                className="form-input"
                style={{ flex: 1, margin: 0 }}
                autoFocus
              />
            </div>

            {/* Emoji picker row */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
              Icon
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {CAT_EMOJIS.map(em => (
                <button
                  key={em}
                  onClick={() => setNewCatEmoji(em)}
                  style={{
                    width: 38, height: 38, borderRadius: 10, border: `2px solid ${newCatEmoji === em ? newCatColor : 'var(--border)'}`,
                    background: newCatEmoji === em ? newCatColor + '22' : 'var(--surface2)',
                    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >{em}</button>
              ))}
            </div>

            {/* Color picker */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
              Color
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
              {CAT_COLORS.map(col => (
                <div
                  key={col}
                  onClick={() => setNewCatColor(col)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: col,
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: newCatColor === col ? `0 0 0 2px var(--surface), 0 0 0 4px ${col}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>

            {/* Save button */}
            <button
              onClick={handleAddCategory}
              className="btn-primary"
              style={{ opacity: !newCatName.trim() ? 0.45 : 1 }}
            >
              ✓ Add Category
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
