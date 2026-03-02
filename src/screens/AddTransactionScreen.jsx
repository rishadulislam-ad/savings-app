import { useState } from 'react';
import { CATEGORIES, WALLETS } from '../data/transactions';

const TAGS = ['Food', 'Work', 'Family', 'Health', 'Fun', 'Travel', 'Bills', 'Gifts'];

export default function AddTransactionScreen({ onClose, onSave, onDelete, initialTx }) {
  const isEditing = !!initialTx;
  const [type, setType] = useState(initialTx?.type || 'expense');
  const [amount, setAmount] = useState(initialTx ? String(initialTx.amount) : '');
  const [title, setTitle] = useState(initialTx?.title || '');
  const [category, setCategory] = useState(initialTx?.category || 'eating_out');
  const [wallet, setWallet] = useState(initialTx?.wallet || 'main');
  const [tags, setTags] = useState(initialTx?.tags || []);
  const [note, setNote] = useState(initialTx?.note || '');
  const [date, setDate] = useState(initialTx?.date || new Date().toISOString().slice(0, 10));

  const expenseCategories = ['eating_out', 'groceries', 'transport', 'entertainment', 'health', 'shopping', 'childcare', 'other'];
  const incomeCategories  = ['salary', 'freelance', 'other'];
  const cats = type === 'expense' ? expenseCategories : incomeCategories;

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
    onSave({
      type,
      amount: parseFloat(amount),
      title: title || CATEGORIES[category]?.label || 'Transaction',
      category,
      wallet,
      tags,
      note,
      date,
    });
    onClose();
  }

  const displayAmount = amount
    ? `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '$0.00';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
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
            placeholder={`e.g. ${CATEGORIES[category]?.label}`}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="category-grid">
            {cats.map(catKey => {
              const c = CATEGORIES[catKey];
              const isActive = category === catKey;
              return (
                <button
                  key={catKey}
                  className={`category-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setCategory(catKey)}
                >
                  <div className="category-icon-wrap" style={{
                    background: isActive ? c.bg : 'var(--surface2)',
                  }}>
                    <span>{c.icon}</span>
                  </div>
                  <span className="category-name">{c.label}</span>
                </button>
              );
            })}
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
                  {w.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label className="form-label">Tags</label>
          <div className="tag-scroll">
            {TAGS.map(t => (
              <button
                key={t}
                className={`chip ${tags.includes(t) ? 'chip-solid' : 'chip-outline'}`}
                onClick={() => toggleTag(t)}
              >
                {tags.includes(t) && <span>✓</span>}
                {t}
              </button>
            ))}
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
    </div>
  );
}
