import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, CURRENCIES } from '../data/transactions';
import CurrencyPicker from '../components/CurrencyPicker';

const OTHER_SETTINGS = [
  { icon: '👤', label: 'Edit Profile',    sub: 'Alex Johnson' },
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
                <div style={{ fontSize: 52, marginBottom: 14 }}>💳</div>
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

/* ─── Profile Screen ────────────────────────────────────────── */
export default function ProfileScreen({ transactions, currentUser, onLogout, onNavigate, customCategories = [], customTags = [], onAddCustomCategory, onDeleteCustomCategory, onAddCustomTag, onDeleteCustomTag }) {
  const { isDark, toggleTheme, currency, setCurrency } = useTheme();
  const [showCurrencyPicker,  setShowCurrencyPicker]  = useState(false);
  const [showConverter,       setShowConverter]        = useState(false);
  const [showCatTags,         setShowCatTags]          = useState(false);
  const [showCards,           setShowCards]            = useState(false);

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
        <div className="card anim-fadeup" style={{ padding: '24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 12px',
            boxShadow: '0 4px 16px rgba(102,126,234,0.4)',
          }}>🧑‍💼</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{currentUser?.name || 'User'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{currentUser?.email || ''}</div>
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
    </div>
  );
}
