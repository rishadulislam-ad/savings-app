import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, CURRENCIES, CATEGORIES } from '../data/transactions';
import CurrencyPicker from '../components/CurrencyPicker';

const OTHER_SETTINGS = [
  { icon: '🔔', label: 'Notifications',   sub: 'Push & Email on' },
  { icon: '🔒', label: 'Security',        sub: 'Face ID on' },
  { icon: '❓', label: 'Help & Support',  sub: 'FAQ, Contact us' },
  { icon: '⭐', label: 'Rate Findo',      sub: 'Love the app?' },
];

const CAT_COLORS = [
  '#667eea', '#f97316', '#ec4899', '#10b981',
  '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444',
];

const CAT_EMOJIS = ['🏷️','🎮','🏠','📚','🎵','⚽','🌿','🎁','🐾','🍕','☕','🚀','🌟','💡','🎨','🏋️'];

/* ─── Card Gradients ─────────────────────────────────────────── */
const CARD_GRADIENTS = [
  { id: 'navy',    gradient: 'linear-gradient(135deg, #0D0D2B 0%, #1B1B5E 40%, #2E3191 100%)' },
  { id: 'dark',    gradient: 'linear-gradient(135deg, #141414 0%, #1e1e30 55%, #0f0f1e 100%)' },
  { id: 'gold',    gradient: 'linear-gradient(135deg, #3B2000 0%, #8B5E00 45%, #C8940C 75%, #9A6C00 100%)' },
  { id: 'forest',  gradient: 'linear-gradient(135deg, #0A1A2E 0%, #0E3D35 50%, #145244 100%)' },
  { id: 'galaxy',  gradient: 'linear-gradient(135deg, #1A0338 0%, #3D1A7A 45%, #7B41D0 100%)' },
  { id: 'sunset',  gradient: 'linear-gradient(135deg, #8B1500 0%, #C93B08 40%, #E8720F 75%, #F5A520 100%)' },
  { id: 'rose',    gradient: 'linear-gradient(135deg, #4A0028 0%, #921058 45%, #C83080 100%)' },
  { id: 'ocean',   gradient: 'linear-gradient(135deg, #001640 0%, #003399 45%, #0055D4 100%)' },
];

/* ─── Card Graphic ───────────────────────────────────────────── */
function CardGraphic({ card, size = 'full', showNumber = false }) {
  const gradObj = CARD_GRADIENTS.find(g => g.id === card.gradient) || CARD_GRADIENTS[0];
  const sm = size === 'small';
  const digits = (card.number || '').replace(/\D/g, '');

  const numDisplay = showNumber && digits.length > 0
    ? [0,1,2,3].map(i => (digits.slice(i*4, i*4+4) || '••••').padEnd(4,'•')).join('  ')
    : [0,1,2,3].map(i => i < 3 ? '••••' : (digits.slice(12) || '••••')).join('  ');

  return (
    <div style={{
      background: gradObj.gradient,
      borderRadius: sm ? 14 : 22,
      padding: sm ? '14px 16px' : '24px 26px',
      aspectRatio: '1.586',
      position: 'relative',
      overflow: 'hidden',
      color: '#fff',
      userSelect: 'none',
      border: '1px solid rgba(255,255,255,0.13)',
      boxShadow: sm
        ? '0 8px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.14)'
        : '0 32px 72px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.15)',
      transform: sm ? undefined : 'perspective(1400px) rotateX(5deg) rotateY(-4deg)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    }}>
      {/* Gloss shine overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0) 62%)',
      }} />
      {/* Bottom-edge dark depth */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, transparent 100%)',
      }} />
      {/* Decorative glow circles */}
      <div style={{ position: 'absolute', top: '-28%', right: '-14%', width: '56%', height: '56%', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-22%', left: '-8%', width: '44%', height: '44%', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      {/* Top: chip + network */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sm ? 12 : 26, position: 'relative', zIndex: 4 }}>
        {/* EMV Chip */}
        <div style={{
          width: sm ? 28 : 44, height: sm ? 20 : 33,
          borderRadius: sm ? 4 : 7,
          background: 'linear-gradient(145deg, #deb84a 0%, #f7e070 30%, #e8c535 55%, #b8900a 100%)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2)',
          position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.18)' }} />
          <div style={{ position: 'absolute', top: '63%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.18)' }} />
          <div style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.18)' }} />
          <div style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.18)' }} />
          {/* Chip shine */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.3) 0%, transparent 55%)', borderRadius: 'inherit' }} />
        </div>
        {/* Network logo */}
        <div style={{ zIndex: 1 }}>
          {card.network === 'visa' && (
            <span style={{ fontStyle: 'italic', fontWeight: 900, fontSize: sm ? 17 : 30, letterSpacing: '-0.5px', fontFamily: 'Georgia, "Times New Roman", serif', textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1 }}>VISA</span>
          )}
          {card.network === 'mastercard' && (
            <div style={{ position: 'relative', width: sm ? 34 : 52, height: sm ? 20 : 32 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, width: sm ? 20 : 32, height: sm ? 20 : 32, borderRadius: '50%', background: '#EB001B', opacity: 0.93, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
              <div style={{ position: 'absolute', right: 0, top: 0, width: sm ? 20 : 32, height: sm ? 20 : 32, borderRadius: '50%', background: '#F79E1B', opacity: 0.88, boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
            </div>
          )}
          {card.network === 'amex' && (
            <span style={{ fontWeight: 900, fontSize: sm ? 11 : 15, letterSpacing: '0.15em', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>AMEX</span>
          )}
          {(!card.network || card.network === 'other') && (
            <span style={{ fontWeight: 700, fontSize: sm ? 11 : 15, opacity: 0.85 }}>{card.label || '●●●'}</span>
          )}
        </div>
      </div>

      {/* Card number */}
      <div style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: sm ? 13 : 19,
        fontWeight: 700,
        letterSpacing: sm ? 2 : 3.5,
        marginBottom: sm ? 10 : 20,
        position: 'relative', zIndex: 4, opacity: 0.97,
        textShadow: '0 2px 6px rgba(0,0,0,0.45), 0 -0.5px 0 rgba(255,255,255,0.12)',
      }}>
        {numDisplay}
      </div>

      {/* Bottom: name + expiry */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 4 }}>
        <div style={{ overflow: 'hidden', flex: 1, marginRight: 8 }}>
          <div style={{ fontSize: sm ? 7 : 9, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: sm ? 2 : 3, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>Card Holder</div>
          <div style={{ fontSize: sm ? 11 : 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 5px rgba(0,0,0,0.4), 0 -0.5px 0 rgba(255,255,255,0.12)' }}>
            {card.name || 'YOUR NAME'}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: sm ? 7 : 9, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: sm ? 2 : 3, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>Expires</div>
          <div style={{ fontSize: sm ? 11 : 14, fontWeight: 700, fontFamily: '"Courier New", Courier, monospace', textShadow: '0 2px 5px rgba(0,0,0,0.4), 0 -0.5px 0 rgba(255,255,255,0.12)' }}>
            {card.expiry || 'MM/YY'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Cards Sheet ────────────────────────────────────────────── */
function CardsSheet({ onClose, cards, onAddCard, onDeleteCard, currentUser }) {
  const [view,           setView]           = useState('list');
  const [selectedCard,   setSelectedCard]   = useState(null);
  const [showCVC,        setShowCVC]        = useState(false);
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [cardNumber,   setCardNumber]   = useState('');
  const [cardName,     setCardName]     = useState(currentUser?.name?.toUpperCase() || '');
  const [cardExpiry,   setCardExpiry]   = useState('');
  const [cardCVC,      setCardCVC]      = useState('');
  const [cardNetwork,  setCardNetwork]  = useState('visa');
  const [cardGradient, setCardGradient] = useState('navy');
  const [cardLabel,    setCardLabel]    = useState('');

  const previewCard = { number: cardNumber.replace(/\s/g, ''), name: cardName, expiry: cardExpiry, network: cardNetwork, gradient: cardGradient, label: cardLabel };

  function handleNumberInput(val) {
    const d = val.replace(/\D/g, '').slice(0, 16);
    setCardNumber(d.replace(/(.{4})/g, '$1 ').trim());
    if (d[0] === '4') setCardNetwork('visa');
    else if (d[0] === '5' || d[0] === '2') setCardNetwork('mastercard');
    else if (d[0] === '3') setCardNetwork('amex');
  }

  function handleExpiryInput(val) {
    let clean = val.replace(/[^0-9/]/g, '');
    if (clean.length === 2 && !clean.includes('/') && val.length > cardExpiry.length) clean += '/';
    if (clean.length > 5) clean = clean.slice(0, 5);
    setCardExpiry(clean);
  }

  const canSave = cardNumber.replace(/\s/g, '').length >= 13 && cardName.trim() && cardExpiry.length === 5 && cardCVC.length >= 3;

  function handleSaveCard() {
    if (!canSave) return;
    onAddCard({
      id: `card_${Date.now()}`,
      label: cardLabel.trim() || (cardNetwork.charAt(0).toUpperCase() + cardNetwork.slice(1) + ' Card'),
      name: cardName.trim(),
      number: cardNumber.replace(/\s/g, ''),
      expiry: cardExpiry,
      cvc: cardCVC,
      network: cardNetwork,
      gradient: cardGradient,
    });
    setView('list');
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease both' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--surface)', borderRadius: '22px 22px 0 0', padding: '0 20px 48px', maxHeight: '93%', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 0' }} />

        {/* ── View Card ── */}
        {view === 'view' && selectedCard && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => { setView('list'); setShowCVC(false); setShowFullNumber(false); }} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}>←</button>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedCard.label}</div>
            </div>
            <CardGraphic card={selectedCard} size="full" showNumber={showFullNumber} />
            <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: '18px', marginTop: 20 }}>
              <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Card Number</div>
                  <button onClick={() => setShowFullNumber(v => !v)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, border: 'none', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>
                    {showFullNumber ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 3 }}>
                  {showFullNumber
                    ? selectedCard.number.replace(/(.{4})/g, '$1 ').trim()
                    : `•••• •••• •••• ${selectedCard.number.slice(-4)}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 28 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expires</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{selectedCard.expiry}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>CVC / CVV</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: 3 }}>{showCVC ? selectedCard.cvc : '•••'}</div>
                    <button onClick={() => setShowCVC(v => !v)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, border: 'none', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>{showCVC ? 'Hide' : 'Show'}</button>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => { onDeleteCard(selectedCard.id); setView('list'); }} style={{ marginTop: 14, width: '100%', padding: '14px', background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', borderRadius: 14, color: '#ef4444', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              🗑 Remove Card
            </button>
          </div>
        )}

        {/* ── Add Card ── */}
        {view === 'add' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button onClick={() => setView('list')} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}>←</button>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>New Card</div>
            </div>

            {/* Live card preview */}
            <div style={{ marginBottom: 22 }}>
              <CardGraphic card={previewCard} size="full" />
            </div>

            {/* Style picker */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Card Style</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
              {CARD_GRADIENTS.map(g => (
                <div key={g.id} onClick={() => setCardGradient(g.id)} style={{ width: 48, height: 30, borderRadius: 9, background: g.gradient, flexShrink: 0, cursor: 'pointer', transition: 'box-shadow 0.15s', boxShadow: cardGradient === g.id ? `0 0 0 2.5px var(--surface), 0 0 0 4.5px var(--accent)` : '0 2px 8px rgba(0,0,0,0.22)' }} />
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input className="form-input" type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => handleNumberInput(e.target.value)} maxLength={19} />
            </div>
            <div className="form-group">
              <label className="form-label">Cardholder Name</label>
              <input className="form-input" type="text" placeholder="YOUR NAME" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Expiry</label>
                <input className="form-input" type="text" inputMode="numeric" placeholder="MM/YY" value={cardExpiry} onChange={e => handleExpiryInput(e.target.value)} maxLength={5} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">CVC / CVV</label>
                <input className="form-input" type="password" inputMode="numeric" placeholder="•••" value={cardCVC} onChange={e => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Network</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['visa','Visa'],['mastercard','Mastercard'],['amex','Amex'],['other','Other']].map(([n, lbl]) => (
                  <button key={n} onClick={() => setCardNetwork(n)} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, border: `1.5px solid ${cardNetwork === n ? 'var(--accent)' : 'var(--border)'}`, background: cardNetwork === n ? 'var(--accent-light)' : 'var(--surface2)', color: cardNetwork === n ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Label <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" type="text" placeholder="e.g. Personal, Work, Travel..." value={cardLabel} onChange={e => setCardLabel(e.target.value)} />
            </div>

            <button onClick={handleSaveCard} className="btn-primary" style={{ opacity: canSave ? 1 : 0.4, transition: 'opacity 0.2s' }} disabled={!canSave}>
              ✓ Save Card
            </button>
          </div>
        )}

        {/* ── Card List ── */}
        {view === 'list' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>My Cards</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{cards.length} {cards.length === 1 ? 'card' : 'cards'} saved</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setView('add')} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
                <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
              </div>
            </div>

            {cards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '44px 0 24px' }}>
                <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="3"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>No cards saved</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.5 }}>Store your card details for quick reference</div>
                <button onClick={() => setView('add')} style={{ padding: '12px 28px', borderRadius: 14, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Add Your First Card</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cards.map(card => (
                  <div key={card.id} onClick={() => { setSelectedCard(card); setView('view'); setShowCVC(false); }} style={{ cursor: 'pointer' }}>
                    <CardGraphic card={card} size="small" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingLeft: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{card.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>•••• {card.number.slice(-4)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Categories & Tags Management Sheet ─────────────────────── */
function CategoriesTagsSheet({ onClose, customCategories, customTags, onAddCustomCategory, onDeleteCustomCategory, onAddCustomTag, onDeleteCustomTag }) {
  const [view, setView]               = useState('list'); // 'list' | 'addCat'
  const [newCatEmoji, setNewCatEmoji] = useState('🏷️');
  const [newCatName, setNewCatName]   = useState('');
  const [newCatColor, setNewCatColor] = useState('#667eea');
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  function handleAddCategory() {
    if (!newCatName.trim()) return;
    onAddCustomCategory({
      id: `custom_${Date.now()}`,
      label: newCatName.trim(),
      icon: newCatEmoji,
      color: newCatColor,
      bg: `${newCatColor}22`,
    });
    setNewCatName('');
    setNewCatEmoji('🏷️');
    setNewCatColor('#667eea');
    setView('list');
  }

  function handleAddTag() {
    const tag = newTagInput.trim();
    if (!tag) return;
    onAddCustomTag(tag);
    setNewTagInput('');
    setShowTagInput(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.2s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', background: 'var(--surface)',
          borderRadius: '22px 22px 0 0', padding: '0 20px 48px',
          maxHeight: '88%', overflowY: 'auto',
          animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 0' }} />

        {/* ── Add Category Sub-view ── */}
        {view === 'addCat' && (
          <div style={{ paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => setView('list')}
                style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)' }}
              >←</button>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>New Category</div>
            </div>

            {/* Emoji + Name */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                border: '1.5px solid var(--border)',
                background: newCatColor + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>{newCatEmoji}</div>
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

            {/* Emoji picker */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Icon</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {CAT_EMOJIS.map(em => (
                <button key={em} onClick={() => setNewCatEmoji(em)}
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: `2px solid ${newCatEmoji === em ? newCatColor : 'var(--border)'}`,
                    background: newCatEmoji === em ? newCatColor + '22' : 'var(--surface2)',
                    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >{em}</button>
              ))}
            </div>

            {/* Color picker */}
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>Color</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {CAT_COLORS.map(col => (
                <div key={col} onClick={() => setNewCatColor(col)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: col,
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: newCatColor === col ? `0 0 0 2px var(--surface), 0 0 0 4px ${col}` : 'none',
                    transition: 'box-shadow 0.15s',
                  }}
                />
              ))}
            </div>

            <button onClick={handleAddCategory} className="btn-primary" style={{ opacity: !newCatName.trim() ? 0.45 : 1 }}>
              ✓ Save Category
            </button>
          </div>
        )}

        {/* ── Main List View ── */}
        {view === 'list' && (
          <div style={{ paddingTop: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                  Categories & Tags
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  Manage your custom categories and tags
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
            </div>

            {/* ── Custom Categories section ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Custom Categories
              </div>
              <button
                onClick={() => setView('addCat')}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >+ Add</button>
            </div>

            {customCategories.length === 0 ? (
              <div style={{
                padding: '20px', background: 'var(--surface2)', borderRadius: 14,
                textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏷️</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  No custom categories yet
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Tap "+ Add" to create your first one
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface2)', borderRadius: 14, padding: '0 14px', marginBottom: 20 }}>
                {customCategories.map((cat, i) => (
                  <div key={cat.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                    borderBottom: i < customCategories.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11,
                      background: cat.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}>{cat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Custom</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteCustomCategory(cat.id)}
                      style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: 'rgba(239,68,68,0.1)', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', fontSize: 14, flexShrink: 0,
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Custom Tags section ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Custom Tags
              </div>
              {!showTagInput && (
                <button
                  onClick={() => setShowTagInput(true)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >+ Add</button>
              )}
            </div>

            {/* Add tag input */}
            {showTagInput && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  autoFocus
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); if (e.key === 'Escape') { setNewTagInput(''); setShowTagInput(false); } }}
                  placeholder="Tag name…"
                  className="form-input"
                  style={{ flex: 1, margin: 0 }}
                />
                <button onClick={handleAddTag}
                  style={{ padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                >Add</button>
                <button onClick={() => { setNewTagInput(''); setShowTagInput(false); }}
                  style={{ padding: '0 12px', borderRadius: 12, border: 'none', background: 'var(--surface2)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
                >Cancel</button>
              </div>
            )}

            {customTags.length === 0 && !showTagInput ? (
              <div style={{
                padding: '20px', background: 'var(--surface2)', borderRadius: 14,
                textAlign: 'center', marginBottom: 20,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🔖</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  No custom tags yet
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Tap "+ Add" to create your first tag
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {customTags.map(tag => (
                  <div key={tag} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 10px 6px 12px', borderRadius: 20,
                    background: 'var(--accent-light)',
                    border: '1px solid rgba(10,108,255,0.2)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{tag}</span>
                    <button
                      onClick={() => onDeleteCustomTag(tag)}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', border: 'none',
                        background: 'rgba(10,108,255,0.15)', color: 'var(--accent)',
                        fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, flexShrink: 0,
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Note about built-in tags */}
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                💡 Default tags (Food, Work, Family, etc.) are always available in transactions. Custom tags appear alongside them.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Currency Converter Sheet ──────────────────────────────── */
function CurrencyConverterSheet({ onClose, defaultCurrency }) {
  const [fromCur,    setFromCur]    = useState(defaultCurrency || 'USD');
  const [toCur,      setToCur]      = useState(defaultCurrency === 'USD' ? 'EUR' : 'USD');
  const [amount,     setAmount]     = useState('100');
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
      } else {
        throw new Error('Bad response');
      }
    } catch {
      setError('Could not fetch live rates. Check your connection.');
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
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end',
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
    </div>
  );
}

/* ─── My Finances — Multi-Goal + Auto-Transaction ─────────── */
function ProfileEditorC({ onClose, transactions, currentUser, isDark, currency, onAddTransaction }) {
  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const storageKey = currentUser ? `findo_savings_goals_${currentUser.email}` : null;

  // Load savings goals from localStorage
  const [goals, setGoals] = useState(() => {
    try {
      if (!storageKey) return [];
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist goals on change
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(goals));
    }
  }, [goals, storageKey]);

  const [expandedGoal, setExpandedGoal] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [newDepAmount, setNewDepAmount] = useState('');
  const [newDepNote, setNewDepNote] = useState('');
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalColor, setNewGoalColor] = useState('#10B981');

  // All deposits across all goals
  const allDeposits = goals.flatMap(g => g.deposits.map(d => ({ ...d, goalLabel: g.label, goalColor: g.color })));
  const totalAllSaved = allDeposits.reduce((s, d) => s + d.amount, 0);

  // Monthly data from real transactions
  const monthlyData = {};
  transactions.forEach(t => {
    const m = t.date.slice(0, 7);
    if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 };
    if (t.type === 'income') monthlyData[m].income += t.amount;
    else monthlyData[m].expense += t.amount;
  });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' });
  const thisMonth = monthlyData[currentMonth] || { income: 0, expense: 0 };

  // This month's savings across all goals
  const thisMonthSaved = allDeposits.filter(d => d.date.startsWith(currentMonth)).reduce((s, d) => s + d.amount, 0);

  // Balance = Earned - Spent (spent already includes savings as auto-transactions)
  const thisBalance = thisMonth.income - thisMonth.expense;

  // Averages
  const monthKeys = Object.keys(monthlyData).sort();
  const numMonths = monthKeys.length || 1;
  const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgIncome = Math.round(allIncome / numMonths);
  const avgExpense = Math.round(allExpense / numMonths);

  // Category breakdown (current month expenses)
  const catMap = {};
  transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonth)).forEach(t => {
    const key = t.category;
    if (!catMap[key]) catMap[key] = 0;
    catMap[key] += t.amount;
  });
  const totalMonthExpense = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
  const catSpending = Object.entries(catMap)
    .map(([key, amount]) => {
      const cat = CATEGORIES[key] || { label: key, icon: key === 'savings' ? '🏦' : '📦', color: key === 'savings' ? '#10B981' : '#6B7280' };
      return { key, label: cat.label || key, emoji: cat.icon, amount, pct: Math.round((amount / totalMonthExpense) * 100), color: cat.color };
    })
    .sort((a, b) => b.amount - a.amount);

  // 6-month trend
  const monthlySavings = {};
  allDeposits.forEach(d => {
    const m = d.date.slice(0, 7);
    if (!monthlySavings[m]) monthlySavings[m] = 0;
    monthlySavings[m] += d.amount;
  });
  const last6 = monthKeys.slice(-6);
  const trendData = last6.map(m => ({
    month: new Date(m + '-15').toLocaleString('en', { month: 'short' }),
    income: monthlyData[m].income,
    expense: monthlyData[m].expense,
    saved: monthlySavings[m] || 0,
  }));
  const maxTrend = Math.max(...trendData.map(d => Math.max(d.income, d.expense, d.saved)), 1);

  function fmtK(n) {
    if (n >= 1000) return selectedCur.symbol + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return selectedCur.symbol + n.toLocaleString();
  }

  function addDeposit(goalId) {
    const amt = parseFloat(newDepAmount.replace(/,/g, ''));
    if (!amt || amt <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const goal = goals.find(g => g.id === goalId);
    const depNote = newDepNote || `Savings: ${goal?.label}`;

    // 1. Add deposit to goal
    setGoals(prev => prev.map(g => g.id === goalId ? {
      ...g,
      deposits: [{ id: 's' + Date.now(), amount: amt, date: today, note: depNote }, ...g.deposits],
    } : g));

    // 2. Auto-create expense transaction (shows in Transactions screen)
    if (onAddTransaction) {
      onAddTransaction({
        type: 'expense',
        category: 'savings',
        amount: amt,
        date: today,
        note: `Savings: ${goal?.label}`,
      });
    }

    setNewDepAmount('');
    setNewDepNote('');
    setAddingTo(null);
  }

  function deleteDeposit(goalId, depId) {
    setGoals(prev => prev.map(g => g.id === goalId ? {
      ...g,
      deposits: g.deposits.filter(d => d.id !== depId),
    } : g));
  }

  function addNewGoal() {
    if (!newGoalLabel.trim()) return;
    const target = parseFloat(newGoalTarget.replace(/,/g, '')) || 0;
    setGoals(prev => [...prev, {
      id: 'g' + Date.now(),
      label: newGoalLabel.trim(),
      target,
      color: newGoalColor,
      deposits: [],
    }]);
    setNewGoalLabel('');
    setNewGoalTarget('');
    setNewGoalColor('#10B981');
    setShowNewGoal(false);
  }

  function deleteGoal(goalId) {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    if (expandedGoal === goalId) setExpandedGoal(null);
  }

  const goalColors = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#06B6D4', '#F97316'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '48px 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>My Finances</div>
        <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

        {/* ── This Month Overview ── */}
        <div style={{
          borderRadius: 'var(--radius-xl)', padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(145deg, var(--accent), #0044B8)',
          boxShadow: '0 8px 32px rgba(10,108,255,0.25)',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{currentMonthLabel}</div>

            {/* Balance large */}
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>
              {formatCurrency(thisBalance, currency)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Available balance</div>

            {/* Income / Expense row */}
            <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 9V3M3.5 5.5L6 3l2.5 2.5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}>Earned</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{formatCurrency(thisMonth.income, currency)}</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 3v6M3.5 6.5L6 9l2.5-2.5" stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.03em' }}>Spent</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{formatCurrency(thisMonth.expense, currency)}</div>
              </div>
            </div>

            {thisMonthSaved > 0 && (
              <div style={{ marginTop: 14, padding: '7px 12px', borderRadius: 20, background: 'rgba(179,255,217,0.12)', border: '1px solid rgba(179,255,217,0.15)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#B3FFD9" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#B3FFD9' }}>{formatCurrency(thisMonthSaved, currency)} saved this month</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Savings Goals ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Savings Goals ({goals.length})
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>
            Total: {formatCurrency(totalAllSaved, currency)}
          </div>
        </div>

        {goals.map((goal) => {
          const goalSaved = goal.deposits.reduce((s, d) => s + d.amount, 0);
          const progress = goal.target > 0 ? Math.min(100, Math.round((goalSaved / goal.target) * 100)) : 0;
          const remaining = Math.max(0, goal.target - goalSaved);
          const isExpanded = expandedGoal === goal.id;

          return (
            <div key={goal.id} className="card" style={{ marginBottom: 10, overflow: 'hidden', border: isExpanded ? `1px solid ${goal.color}30` : undefined }}>
              {/* Goal summary row */}
              <div onClick={() => setExpandedGoal(isExpanded ? null : goal.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: goal.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{goal.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: goal.color }}>{formatCurrency(goalSaved, currency)}</div>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', borderRadius: 3, background: goal.color, transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: progress >= 100 ? goal.color : 'var(--text-tertiary)', minWidth: 36 }}>
                    {progress}%
                  </span>
                </div>
                {goal.target > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {progress >= 100 ? 'Goal reached!' : `${formatCurrency(remaining, currency)} to go · Target: ${formatCurrency(goal.target, currency)}`}
                  </div>
                )}
              </div>

              {/* Expanded: deposits + add */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
                  {/* Add deposit */}
                  {addingTo === goal.id ? (
                    <div style={{ padding: 12, borderRadius: 10, background: `${goal.color}08`, border: `1.5px solid ${goal.color}25`, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: goal.color, marginBottom: 8 }}>New Deposit</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: goal.color, background: `${goal.color}15`, padding: '7px 10px', borderRadius: 8 }}>{selectedCur.symbol}</span>
                        <input value={newDepAmount} onChange={e => setNewDepAmount(e.target.value)} placeholder="Amount" type="number" style={{
                          flex: 1, padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                          color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, outline: 'none',
                        }} />
                      </div>
                      <input value={newDepNote} onChange={e => setNewDepNote(e.target.value)} placeholder="Note (optional)" style={{
                        width: '100%', padding: '7px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', fontSize: 13, outline: 'none', marginBottom: 6, boxSizing: 'border-box',
                      }} />
                      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10, lineHeight: 1.4 }}>
                        This will also create an expense transaction automatically.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setAddingTo(null); setNewDepAmount(''); setNewDepNote(''); }} style={{
                          flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
                          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>Cancel</button>
                        <button onClick={() => addDeposit(goal.id)} style={{
                          flex: 1, padding: 9, borderRadius: 8, border: 'none', background: goal.color,
                          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        }}>Add Deposit</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setAddingTo(goal.id)} style={{
                      width: '100%', padding: '9px', borderRadius: 8, border: `1.5px dashed ${goal.color}40`,
                      background: `${goal.color}06`, color: goal.color, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 12,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      Add Deposit
                    </button>
                  )}

                  {/* Deposit history */}
                  {goal.deposits.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>{goal.deposits.length} deposit{goal.deposits.length !== 1 ? 's' : ''}</div>
                      {goal.deposits.sort((a, b) => b.date.localeCompare(a.date)).map((dep, i) => (
                        <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < goal.deposits.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: goal.color, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{dep.note}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{dep.date}</div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: goal.color }}>{formatCurrency(dep.amount, currency)}</span>
                          <div onClick={() => deleteDeposit(goal.id, dep.id)} style={{ cursor: 'pointer', padding: 3 }}>
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0' }}>No deposits yet</div>
                  )}

                  {/* Delete goal */}
                  <div onClick={() => deleteGoal(goal.id)} style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, padding: 4 }}>
                    Delete Goal
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new goal */}
        {!showNewGoal ? (
          <button onClick={() => setShowNewGoal(true)} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: '1.5px dashed var(--border)',
            background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add New Goal
          </button>
        ) : (
          <div className="card" style={{ padding: 16, marginBottom: 16, border: '1.5px solid var(--accent)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>New Savings Goal</div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Goal Name</label>
              <input value={newGoalLabel} onChange={e => setNewGoalLabel(e.target.value)} placeholder="e.g. New Car, Wedding, Trip..." style={{
                display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
              }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Target Amount ({selectedCur.code})</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '6px 10px', borderRadius: 8 }}>{selectedCur.symbol}</span>
                <input value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} placeholder="0" type="number" style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none',
                }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Color</label>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {goalColors.map(c => (
                  <div key={c} onClick={() => setNewGoalColor(c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: newGoalColor === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    transition: 'border 0.15s ease',
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewGoal(false)} style={{
                flex: 1, padding: 9, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={addNewGoal} style={{
                flex: 1, padding: 9, borderRadius: 8, border: 'none', background: 'var(--accent)',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Create Goal</button>
            </div>
          </div>
        )}

        {/* ── Spending Breakdown (now includes Savings category) ── */}
        <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Spending Breakdown</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>{formatCurrency(thisMonth.expense, currency)}</div>
          </div>
          {catSpending.map((cat, i) => (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < catSpending.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cat.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{cat.label}</span>
                    {cat.key === 'savings' && (
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '1px 5px', borderRadius: 4 }}>AUTO</span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(cat.amount, currency)}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.pct}%`, height: '100%', borderRadius: 2, background: cat.color, transition: 'width 0.5s ease' }} />
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 28, textAlign: 'right' }}>{cat.pct}%</span>
            </div>
          ))}
        </div>

        {/* ── 6-Month Trend ── */}
        <div className="card" style={{ padding: '18px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>6-Month Trend</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90 }}>
            {trendData.map((m) => (
              <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', height: 70 }}>
                  <div style={{ flex: 1, height: `${(m.income / maxTrend) * 70}px`, background: 'rgba(16,185,129,0.35)', borderRadius: '3px 3px 0 0' }} />
                  <div style={{ flex: 1, height: `${(m.expense / maxTrend) * 70}px`, background: 'rgba(239,68,68,0.35)', borderRadius: '3px 3px 0 0' }} />
                  <div style={{ flex: 1, height: `${(m.saved / maxTrend) * 70}px`, background: 'rgba(10,108,255,0.35)', borderRadius: '3px 3px 0 0' }} />
                </div>
                <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontWeight: 600 }}>{m.month}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {[['Income','rgba(16,185,129,0.5)'],['Expense','rgba(239,68,68,0.5)'],['Saved','rgba(10,108,255,0.5)']].map(([l,c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Averages ── */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>6-Month Averages</div>
          {[
            ['Monthly Income', formatCurrency(avgIncome, currency), '#10B981'],
            ['Monthly Spending', formatCurrency(avgExpense, currency), '#EF4444'],
            ['Avg Remaining', formatCurrency(avgIncome - avgExpense, currency), 'var(--accent)'],
          ].map(([label, val, color], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

/* ─── Profile Screen ────────────────────────────────────────── */
export default function ProfileScreen({ transactions, currentUser, onLogout, onNavigate, onAddTransaction, onUpdateUser, customCategories = [], customTags = [], onAddCustomCategory, onDeleteCustomCategory, onAddCustomTag, onDeleteCustomTag }) {
  const { isDark, toggleTheme, currency, setCurrency } = useTheme();
  const [showCurrencyPicker,  setShowCurrencyPicker]  = useState(false);
  const [showConverter,       setShowConverter]        = useState(false);
  const [showCatTags,         setShowCatTags]          = useState(false);
  const [showCards,           setShowCards]            = useState(false);
  const [showFinances,        setShowFinances]         = useState(false);
  const [editingProfile,      setEditingProfile]       = useState(false);
  const [editName,            setEditName]             = useState('');
  const [editAvatar,          setEditAvatar]           = useState('');
  const AVATARS = ['🧑‍💼','👩‍💻','👨‍🎨','👩‍🔬','🧑‍🚀','👨‍💻','👩‍🎤','🧑‍🍳','👩‍⚕️','🧑‍🎓','👨‍🔧','👩‍🏫','🧑‍💻','👸','🤴','🦸'];

  const [cards, setCards] = useState(() => {
    try {
      if (!currentUser) return [];
      const saved = localStorage.getItem(`findo_cards_${currentUser.email}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`findo_cards_${currentUser.email}`, JSON.stringify(cards));
    }
  }, [cards, currentUser]);

  function addCard(card) { setCards(prev => [...prev, card]); }
  function deleteCard(id) { setCards(prev => prev.filter(c => c.id !== id)); }

  const totalIncome  = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '48px 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Profile</div>
      </div>

      <div className="screen-content" style={{ padding: '20px' }}>
        {/* Avatar + Info */}
        <div className="card anim-fadeup" style={{ padding: '24px', textAlign: 'center', marginBottom: 16, position: 'relative' }}>
          {/* Edit button */}
          <div onClick={() => {
            if (editingProfile) {
              // Save
              if (onUpdateUser) {
                const updates = {};
                if (editName.trim() && editName.trim() !== currentUser?.name) updates.name = editName.trim();
                if (editAvatar && editAvatar !== currentUser?.avatar) updates.avatar = editAvatar;
                if (Object.keys(updates).length > 0) onUpdateUser(updates);
              }
              setEditingProfile(false);
            } else {
              setEditName(currentUser?.name || '');
              setEditAvatar(currentUser?.avatar || '🧑‍💼');
              setEditingProfile(true);
            }
          }} style={{
            position: 'absolute', top: 14, right: 14, padding: '4px 12px', borderRadius: 8, cursor: 'pointer',
            fontSize: 11, fontWeight: 700, transition: 'all 0.2s ease',
            background: editingProfile ? 'var(--accent)' : 'var(--accent-light)',
            color: editingProfile ? '#fff' : 'var(--accent)',
          }}>
            {editingProfile ? 'Save' : 'Edit'}
          </div>

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', position: 'relative',
            border: editingProfile ? '3px solid var(--accent)' : '3px solid rgba(102,126,234,0.3)',
            transition: 'border 0.2s ease',
          }}>
            <span style={{ fontSize: 40 }}>{editingProfile ? editAvatar : (currentUser?.avatar || '🧑‍💼')}</span>
          </div>

          {editingProfile ? (
            <>
              {/* Avatar picker */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                {AVATARS.map((a, i) => (
                  <div key={i} onClick={() => setEditAvatar(a)} style={{
                    width: 38, height: 38, borderRadius: '50%', fontSize: 18,
                    background: editAvatar === a ? 'var(--accent)' : 'var(--surface2)',
                    border: editAvatar === a ? '2px solid var(--accent)' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}>{a}</div>
                ))}
              </div>
              {/* Name input */}
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" style={{
                width: '100%', maxWidth: 240, padding: '10px 14px', borderRadius: 12, textAlign: 'center',
                background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)',
                fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
              }} />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{currentUser?.email || ''}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{currentUser?.name || 'User'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{currentUser?.email || ''}</div>
            </>
          )}

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.5px' }}>{formatCurrency(totalIncome, currency)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Total Income</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)', letterSpacing: '-0.5px' }}>{formatCurrency(totalExpense, currency)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Total Spent</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>{transactions.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Records</div>
            </div>
          </div>
        </div>

        {/* Settings Label */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Settings
        </div>

        <div className="card anim-fadeup" style={{ padding: '0 16px', marginBottom: 16, animationDelay: '0.06s' }}>

          {/* My Finances */}
          <div onClick={() => setShowFinances(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>My Finances</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Savings goals, spending & trends</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Dark Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: isDark ? 'rgba(61,142,255,0.15)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {isDark ? '🌙' : '☀️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Appearance</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{isDark ? 'Dark mode' : 'Light mode'}</div>
            </div>
            <div onClick={toggleTheme} style={{ width: 48, height: 28, borderRadius: 14, cursor: 'pointer', background: isDark ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.25s ease', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: isDark ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} />
            </div>
          </div>

          {/* Currency Row */}
          <div onClick={() => setShowCurrencyPicker(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {selectedCur.flag}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Currency</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{selectedCur.code} · {selectedCur.name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '3px 8px', borderRadius: 8 }}>
                {selectedCur.symbol}
              </span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Cards Row */}
          <div onClick={() => setShowCards(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #302B63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Cards</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {cards.length === 0 ? 'No cards saved' : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} saved`}
              </div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Categories & Tags Row */}
          <div onClick={() => setShowCatTags(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🏷️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Categories & Tags</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {customCategories.length} custom {customCategories.length === 1 ? 'category' : 'categories'} · {customTags.length} custom {customTags.length === 1 ? 'tag' : 'tags'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Currency Converter Row */}
          <div onClick={() => setShowConverter(true)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(10,108,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              💱
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Currency Converter</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Live exchange rates</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 7px', borderRadius: 6 }}>
                LIVE
              </span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Travel Tracker Row */}
          <div onClick={() => onNavigate?.('travel')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(67,233,123,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              ✈️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Travel Tracker</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Track spending per trip & country</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', padding: '3px 7px', borderRadius: 6 }}>
                NEW
              </span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Other Settings */}
          {OTHER_SETTINGS.map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < OTHER_SETTINGS.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {s.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{s.sub}</div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ))}
        </div>

        {/* Sign Out */}
        <button onClick={onLogout} style={{ width: '100%', padding: '14px', background: isDark ? 'rgba(255,90,90,0.1)' : '#FFF0F0', border: `1.5px solid ${isDark ? 'rgba(255,90,90,0.25)' : '#FECACA'}`, borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Sign Out
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Findo v1.0.0 · Made with ❤️
        </div>
      </div>

      {/* Cards Sheet */}
      {showCards && (
        <CardsSheet
          onClose={() => setShowCards(false)}
          cards={cards}
          onAddCard={addCard}
          onDeleteCard={deleteCard}
          currentUser={currentUser}
        />
      )}

      {/* Currency Picker Sheet */}
      {showCurrencyPicker && (
        <CurrencyPicker selected={currency} onSelect={setCurrency} onClose={() => setShowCurrencyPicker(false)} />
      )}

      {/* Currency Converter Sheet */}
      {showConverter && (
        <CurrencyConverterSheet
          onClose={() => setShowConverter(false)}
          defaultCurrency={currency}
        />
      )}

      {/* Categories & Tags Sheet */}
      {showCatTags && (
        <CategoriesTagsSheet
          onClose={() => setShowCatTags(false)}
          customCategories={customCategories}
          customTags={customTags}
          onAddCustomCategory={onAddCustomCategory}
          onDeleteCustomCategory={onDeleteCustomCategory}
          onAddCustomTag={onAddCustomTag}
          onDeleteCustomTag={onDeleteCustomTag}
        />
      )}

      {/* My Finances */}
      {showFinances && (
        <ProfileEditorC
          onClose={() => setShowFinances(false)}
          transactions={transactions}
          currentUser={currentUser}
          isDark={isDark}
          currency={currency}
          onAddTransaction={onAddTransaction}
        />
      )}
    </div>
  );
}
