import { useState, useEffect, useMemo } from 'react';
import { formatCurrency, CURRENCIES } from '../../data/transactions';
import FeatureTip from '../../components/FeatureTip';
import { lightTap, successTap } from '../../utils/haptics';

const CONV_EXP_CATS = [
  { id: 'eating_out', icon: '🍔', label: 'Eating Out' },
  { id: 'groceries', icon: '🛒', label: 'Groceries' },
  { id: 'transport', icon: '🚌', label: 'Transport' },
  { id: 'shopping', icon: '👜', label: 'Shopping' },
  { id: 'entertainment', icon: '🎬', label: 'Entertainment' },
  { id: 'health', icon: '💊', label: 'Health' },
  { id: 'other', icon: '📦', label: 'Other' },
];
const CONV_INC_CATS = [
  { id: 'salary', icon: '💼', label: 'Salary' },
  { id: 'freelance', icon: '💰', label: 'Freelance' },
  { id: 'investment', icon: '📈', label: 'Investment' },
  { id: 'gift', icon: '🎁', label: 'Gift' },
  { id: 'other', icon: '📦', label: 'Other' },
];

function ConvAddSheet({ addSheetType, fromCur, toCur, exchangeRate, convertedAmount, amount, onAddTransaction, onClose, onCancel }) {
  const isExp = addSheetType === 'expense';
  const cats = isExp ? CONV_EXP_CATS : CONV_INC_CATS;
  const [selCat, setSelCat] = useState(cats[0].id);
  const [desc, setDesc] = useState('');
  const [note, setNote] = useState(`Rate: 1 ${fromCur} = ${exchangeRate?.toFixed(4)} ${toCur}`);
  const convAmt = Math.round(convertedAmount * 100) / 100;
  const toInfo = CURRENCIES.find(c => c.code === toCur) || CURRENCIES[0];

  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.25s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: '0 20px 40px', maxHeight: '90%', overflowY: 'auto', animation: 'slideUp 0.4s cubic-bezier(0.32,0.72,0,1) both' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--text-tertiary)', margin: '12px auto 20px', opacity: 0.4 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Add Transaction</div>
          <div onClick={onCancel} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}>✕</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, marginBottom: 16, background: isExp ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: isExp ? 'var(--danger)' : 'var(--success)', border: `1px solid ${isExp ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)'}` }}>
          {isExp ? '↓' : '↑'} {isExp ? 'Expense' : 'Income'} · From currency conversion
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div><span style={{ fontSize: 20, opacity: 0.5, color: isExp ? 'var(--danger)' : 'var(--success)' }}>{toInfo.symbol}</span><span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: isExp ? 'var(--danger)' : 'var(--success)' }}>{convAmt.toLocaleString('en-US', { minimumFractionDigits: convAmt % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}</span></div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Converted from {parseFloat(amount)} {fromCur} at {exchangeRate?.toFixed(4)}</div>
        </div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 6 }}>Description</div><input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Currency exchange, Payment received..." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} /></div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 6 }}>Category</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{cats.map(c => (<div key={c.id} onClick={() => { lightTap(); setSelCat(c.id); }} style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selCat === c.id ? 'rgba(79,110,247,0.1)' : 'var(--surface2)', border: `1.5px solid ${selCat === c.id ? 'var(--accent)' : 'var(--border)'}`, color: selCat === c.id ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all 0.15s' }}>{c.icon} {c.label}</div>))}</div></div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 6 }}>Date</div><div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-secondary)', fontSize: 14 }}>Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
        <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 6 }}>Note <span style={{ opacity: 0.5, fontWeight: 400, textTransform: 'none' }}>(optional)</span></div><input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} /></div>
        <button onClick={() => { successTap(); onAddTransaction({ type: addSheetType, amount: convAmt, title: desc.trim() || (cats.find(c => c.id === selCat)?.label || 'Transaction'), category: selCat, wallet: 'main', tags: [], note: note.trim(), date: new Date().toISOString().slice(0, 10) }); onClose(); }} style={{ width: '100%', padding: 15, borderRadius: 14, border: 'none', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, background: isExp ? 'linear-gradient(135deg, #FF6B6B, #e05555)' : 'linear-gradient(135deg, #34D399, #20b080)', boxShadow: isExp ? '0 4px 16px rgba(255,107,107,0.3)' : '0 4px 16px rgba(52,211,153,0.3)' }}>Save</button>
      </div>
    </div>
  );
}

export default function CurrencyConverterSheet({ onClose, defaultCurrency, onAddTransaction, currentUser }) {
  const [fromCur,    setFromCur]    = useState(defaultCurrency === 'USD' ? 'EUR' : (defaultCurrency || 'EUR'));
  const [toCur,      setToCur]      = useState('USD');
  const [amount,     setAmount]     = useState('100');
  const [addSheetType, setAddSheetType] = useState(null); // 'expense' | 'income' | null
  const [rates,      setRates]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pickerMode, setPickerMode] = useState(null); // 'from' | 'to' | null
  const [search,     setSearch]     = useState('');

  async function fetchRates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://open.exchangerate-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (data.result === 'success') {
        setRates(data.rates);
        setLastUpdated(new Date());
        // Cache for offline use
        try { localStorage.setItem('coinova_cached_rates', JSON.stringify({ rates: data.rates, time: Date.now() })); } catch {}
      } else {
        throw new Error('Bad response');
      }
    } catch {
      // Try cached rates
      try {
        const cached = JSON.parse(localStorage.getItem('coinova_cached_rates'));
        if (cached?.rates) {
          setRates(cached.rates);
          setLastUpdated(new Date(cached.time));
          setError('Using cached rates (offline)');
        } else {
          setError('Could not fetch live rates. Check your connection.');
        }
      } catch {
        setError('Could not fetch live rates. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRates(); }, []);

  /* Convert: from → USD → to */
  const convertedAmount = useMemo(() => {
    if (!rates || !amount) return null;
    const a = parseFloat(amount);
    if (isNaN(a) || a < 0) return null;
    const usdAmount = fromCur === 'USD' ? a : a / rates[fromCur];
    return usdAmount * (rates[toCur] || 1);
  }, [rates, fromCur, toCur, amount]);

  const exchangeRate = useMemo(() => {
    if (!rates) return null;
    const usdAmount = fromCur === 'USD' ? 1 : 1 / rates[fromCur];
    return usdAmount * (rates[toCur] || 1);
  }, [rates, fromCur, toCur]);

  function swapCurrencies() {
    setFromCur(toCur);
    setToCur(fromCur);
  }

  function selectCurrency(code) {
    if (pickerMode === 'from') setFromCur(code);
    else                       setToCur(code);
    setPickerMode(null);
    setSearch('');
  }

  const fromInfo = CURRENCIES.find(c => c.code === fromCur) || CURRENCIES[0];
  const toInfo   = CURRENCIES.find(c => c.code === toCur)   || CURRENCIES[0];

  const timeAgo = lastUpdated
    ? (() => {
        const s = Math.floor((Date.now() - lastUpdated) / 1000);
        if (s < 60)  return 'just now';
        if (s < 3600) return `${Math.floor(s/60)}m ago`;
        return `${Math.floor(s/3600)}h ago`;
      })()
    : null;

  const filteredCurrencies = useMemo(() =>
    CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 900, display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--surface)',
          borderRadius: '22px 22px 0 0', padding: '0 20px 44px',
          maxHeight: '92%', overflowY: 'auto',
          animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 0' }}/>

        {/* ── Inline Currency Picker ── */}
        {pickerMode && (
          <div style={{ paddingTop: 20 }}>
            {/* Back header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => { setPickerMode(null); setSearch(''); }}
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)',
                }}
              >←</button>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Select {pickerMode === 'from' ? 'From' : 'To'} Currency
              </div>
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search currency…"
                style={{
                  width: '100%', padding: '10px 12px 10px 38px',
                  borderRadius: 12, border: '1.5px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text-primary)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {/* Currency list */}
            <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredCurrencies.map(c => {
                const isActive = (pickerMode === 'from' ? fromCur : toCur) === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => selectCurrency(c.code)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                      borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? 'var(--accent-light)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{c.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {c.code}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.name}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {c.symbol}
                    </span>
                    {isActive && (
                      <span style={{ color: 'var(--accent)', fontSize: 16 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main Converter UI ── */}
        {!pickerMode && (
          <div style={{ paddingTop: 20 }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
                  Currency Converter
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Live exchange rates
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16,
              }}>✕</button>
            </div>

            {loading && (
              <div style={{
                textAlign: 'center', padding: '32px 0',
                color: 'var(--text-tertiary)', fontSize: 14,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
                Fetching live rates…
              </div>
            )}

            {error && (
              <div style={{
                textAlign: 'center', padding: '20px',
                background: '#FFF0F0', borderRadius: 14, marginBottom: 16,
                color: 'var(--danger)', fontSize: 13,
              }}>
                {error}
                <button onClick={fetchRates} style={{
                  display: 'block', margin: '10px auto 0',
                  padding: '8px 16px', borderRadius: 10, border: 'none',
                  background: 'var(--danger)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Retry</button>
              </div>
            )}

            {!loading && rates && (
              <>
                {/* FROM box */}
                <div style={{
                  background: 'var(--surface2)', borderRadius: 16,
                  padding: '14px 16px', marginBottom: 4,
                  border: '1.5px solid var(--border)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    From
                  </div>
                  <button
                    onClick={() => setPickerMode('from')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      background: 'var(--surface)', borderRadius: 12, padding: '10px 12px',
                      border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 12,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{fromInfo.flag}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fromInfo.code}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fromInfo.name}</div>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                      <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      width: '100%', padding: '12px 14px',
                      background: 'var(--surface)', borderRadius: 12,
                      border: '1.5px solid var(--accent)',
                      color: 'var(--text-primary)', fontSize: 22, fontWeight: 800,
                      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      letterSpacing: '-0.5px',
                    }}
                  />
                </div>

                {/* Swap button */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                  <button
                    onClick={swapCurrencies}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--accent)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#fff', fontSize: 18,
                      boxShadow: '0 4px 12px rgba(10,108,255,0.35)',
                      transition: 'transform 0.2s',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'rotate(180deg)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'rotate(0deg)'}
                  >⇅</button>
                </div>

                {/* TO box */}
                <div style={{
                  background: 'var(--surface2)', borderRadius: 16,
                  padding: '14px 16px',
                  border: '1.5px solid var(--border)',
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                    To
                  </div>
                  <button
                    onClick={() => setPickerMode('to')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      background: 'var(--surface)', borderRadius: 12, padding: '10px 12px',
                      border: '1px solid var(--border)', cursor: 'pointer', marginBottom: 12,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{toInfo.flag}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{toInfo.code}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{toInfo.name}</div>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                      <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {/* Result */}
                  <div style={{
                    padding: '12px 14px', background: 'var(--surface)', borderRadius: 12,
                    border: '1.5px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
                      {convertedAmount !== null
                        ? formatCurrency(convertedAmount, toCur)
                        : '—'}
                    </div>
                    {exchangeRate !== null && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                        1 {fromCur} = {exchangeRate.toFixed(4)} {toCur}
                      </div>
                    )}
                  </div>
                </div>

                {/* Add as Transaction */}
                {convertedAmount !== null && onAddTransaction && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button onClick={(e) => { e.stopPropagation(); lightTap(); setAddSheetType('expense'); }} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: 14, borderRadius: 14, cursor: 'pointer',
                      background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.18)',
                      color: 'var(--danger)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                      Expense
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); lightTap(); setAddSheetType('income'); }} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: 14, borderRadius: 14, cursor: 'pointer',
                      background: 'rgba(52,211,153,0.08)', border: '1.5px solid rgba(52,211,153,0.18)',
                      color: 'var(--success)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                      Income
                    </button>
                  </div>
                )}

                {/* Footer: last updated + refresh */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🟢</span>
                    Live rate · Updated {timeAgo}
                  </div>
                  <button
                    onClick={fetchRates}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >↻ Refresh</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dedicated Add Transaction Sheet */}
      {addSheetType && (
        <ConvAddSheet
          addSheetType={addSheetType}
          fromCur={fromCur}
          toCur={toCur}
          exchangeRate={exchangeRate}
          convertedAmount={convertedAmount}
          amount={amount}
          onAddTransaction={onAddTransaction}
          onClose={() => { setAddSheetType(null); onClose(); }}
          onCancel={() => setAddSheetType(null)}
        />
      )}
      <FeatureTip tipId="converter" currentUser={currentUser} />
    </div>
  );
}
