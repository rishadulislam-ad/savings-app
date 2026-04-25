import { useState, useEffect, useRef } from 'react';
import { lightTap, mediumTap, errorTap, successTap } from '../../utils/haptics';
import { saveCardSecrets, loadCardSecrets, deleteCardSecrets, hasCardSecrets } from '../../utils/cardVault';
import FeatureTip from '../../components/FeatureTip';

/* ─── Card Gradients ─────────────────────────────────────────── */
const CARD_GRADIENTS = [
  { id: 'navy',    gradient: 'linear-gradient(160deg, #0c1033 0%, #162060 40%, #1e2d80 70%, #2838a0 100%)' },
  { id: 'dark',    gradient: 'linear-gradient(160deg, #111115 0%, #1a1a24 40%, #222230 70%, #18182a 100%)' },
  { id: 'gold',    gradient: 'linear-gradient(160deg, #2a1800 0%, #5c3a00 30%, #8a6010 60%, #6b4a08 100%)' },
  { id: 'forest',  gradient: 'linear-gradient(160deg, #081a12 0%, #0d3028 40%, #125040 70%, #0a3a2e 100%)' },
  { id: 'galaxy',  gradient: 'linear-gradient(160deg, #150228 0%, #2a0e55 40%, #4a1e90 70%, #3515a0 100%)' },
  { id: 'sunset',  gradient: 'linear-gradient(160deg, #5c1000 0%, #8a2008 35%, #b84010 65%, #c85818 100%)' },
  { id: 'rose',    gradient: 'linear-gradient(160deg, #350020 0%, #600838 40%, #901060 70%, #a01870 100%)' },
  { id: 'ocean',   gradient: 'linear-gradient(160deg, #001030 0%, #002060 40%, #003898 70%, #0048b8 100%)' },
];

/* ─── Card Graphic (Apple Wallet style) ──────────────────────── */
function CardGraphic({ card }) {
  const gradObj = CARD_GRADIENTS.find(g => g.id === card.gradient) || CARD_GRADIENTS[0];
  const digits = card.last4 || '••••';
  const numDisplay = `••••  ••••  ••••  ${digits.slice(-4) || '••••'}`;

  return (
    <div style={{
      background: gradObj.gradient, borderRadius: 18, aspectRatio: '1.586',
      position: 'relative', overflow: 'hidden', color: '#fff', userSelect: 'none',
      boxShadow: '0 1px 2px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
      transition: 'box-shadow 0.4s ease',
    }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', border: '1px solid rgba(255,255,255,0.08)', zIndex: 6, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 45%, transparent 70%)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)', zIndex: 1, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 30, borderRadius: 6, background: 'linear-gradient(145deg, #d4a83a, #f0d860, #d4a83a, #a07808)', boxShadow: '0 1px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.12)' }} />
              <div style={{ position: 'absolute', top: '62%', left: 0, right: 0, height: 1, background: 'rgba(0,0,0,0.12)' }} />
              <div style={{ position: 'absolute', left: '34%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.12)' }} />
              <div style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, background: 'rgba(0,0,0,0.12)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.35), transparent 55%)', borderRadius: 'inherit' }} />
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.45, transform: 'rotate(90deg)' }}>
              <path d="M8.5 16.5a5 5 0 0 1 0-9"/><path d="M12 19a9 9 0 0 1 0-14"/><path d="M5 14a1.5 1.5 0 0 1 0-4"/>
            </svg>
          </div>
          <div>
            {card.network === 'visa' && <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, fontSize: 22, letterSpacing: -0.5, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>VISA</span>}
            {card.network === 'mastercard' && (
              <div style={{ position: 'relative', width: 42, height: 26 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, width: 26, height: 26, borderRadius: '50%', background: '#EB001B', opacity: 0.9 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: 26, height: 26, borderRadius: '50%', background: '#F79E1B', opacity: 0.85 }} />
              </div>
            )}
            {card.network === 'amex' && <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.2em', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>AMEX</span>}
          </div>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 400, letterSpacing: 2.5, opacity: 0.9, textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>{numDisplay}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ overflow: 'hidden', flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.6, marginBottom: 3 }}>Card Name</div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{card.label || 'My Card'}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.45, marginBottom: 3 }}>Expires</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, fontFamily: 'monospace', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>{card.expiry || 'MM/YY'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Cards Sheet (Apple Wallet) ─────────────────────────────── */
export default function CardsSheet({ onClose, cards, onAddCard, onDeleteCard, currentUser, onOpenSecurity }) {
  const [expandedId, setExpandedId] = useState(null);
  const [cardOrder,  setCardOrder]  = useState(cards.map(c => c.id));
  const [showAdd,    setShowAdd]    = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [revealedSecrets, setRevealedSecrets] = useState({}); // { [cardId]: { number, cvv } }

  const appLockKey = currentUser ? `coinova_app_lock_${currentUser.uid}` : null;
  const pinKey = currentUser ? `coinova_app_lock_${currentUser.uid}_pin` : null;
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(false);
  // Cached "PIN exists" flag — checked via hasPin() which inspects both the
  // legacy localStorage entry AND the v4 Keychain entry. We can't call hasPin
  // synchronously from inside event handlers, so we mirror its result here.
  const [pinExists, setPinExists] = useState(() => !!(pinKey && localStorage.getItem(pinKey)));
  useEffect(() => {
    if (!currentUser?.uid) { setPinExists(false); return; }
    let cancelled = false;
    import('../../utils/hash.js').then(({ hasPin }) => hasPin(currentUser.uid)).then(v => {
      if (!cancelled) setPinExists(v);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  // Security is set up if Face ID OR PIN exists
  function isSecuritySetUp() {
    const hasAppLock = appLockKey && localStorage.getItem(appLockKey) === 'true';
    return hasAppLock || pinExists;
  }

  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinPromptInput, setPinPromptInput] = useState('');
  const [pinPromptError, setPinPromptError] = useState('');
  const [pinPromptResolve, setPinPromptResolve] = useState(null);

  async function authenticate() {
    const biometricEnabled = appLockKey && localStorage.getItem(appLockKey) === 'true';
    // pinExists is the cached result of hasPin() (inspects Keychain + localStorage).
    const pinSet = pinExists;

    // Try biometric first if it was explicitly enabled
    if (biometricEnabled) {
      try {
        const { NativeBiometric } = await import('capacitor-native-biometric');
        await NativeBiometric.verifyIdentity({ reason: 'Unlock card details', title: 'Coinova Wallet' });
        return true;
      } catch {
        // Biometric failed — fall through to PIN if available
        if (!pinSet) return false;
      }
    }

    // Use PIN if set
    if (pinSet) {
      return new Promise((resolve) => {
        setPinPromptInput('');
        setPinPromptError('');
        setPinPromptResolve(() => resolve);
        setShowPinPrompt(true);
      });
    }

    return false;
  }

  async function handlePinPromptSubmit() {
    if (!currentUser?.uid || pinPromptInput.length < 4) return;
    const savedPin = localStorage.getItem(`coinova_app_lock_${currentUser.uid}_pin`);
    const { verifyPin } = await import('../../utils/hash.js');
    // verifyPin tries v3 (random salt) first, falls back to legacy v1 — works
    // for both new PINs and existing users not yet migrated.
    const ok = await verifyPin(pinPromptInput, currentUser.uid, savedPin);
    if (ok) {
      setShowPinPrompt(false);
      setPinPromptInput('');
      setPinPromptError('');
      if (pinPromptResolve) pinPromptResolve(true);
    } else {
      setPinPromptError('Incorrect PIN');
      setPinPromptInput('');
    }
  }

  function handlePinPromptCancel() {
    setShowPinPrompt(false);
    setPinPromptInput('');
    setPinPromptError('');
    if (pinPromptResolve) pinPromptResolve(false);
  }
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardNetwork, setCardNetwork] = useState('visa');
  const [cardGradient, setCardGradient] = useState('navy');
  const [cardLabel, setCardLabel] = useState('');

  useEffect(() => { setCardOrder(cards.map(c => c.id)); }, [cards]);
  const orderedCards = cardOrder.map(id => cards.find(c => c.id === id)).filter(Boolean);

  async function toggleCard(id) {
    if (expandedId === id) { setExpandedId(null); setRevealedSecrets({}); return; }
    // Must have security set up on this device to view card details
    if (!isSecuritySetUp()) { setShowSecurityPrompt(true); return; }
    // Always require auth to view any card details
    const ok = await authenticate();
    if (!ok) return;
    mediumTap();
    setRevealedSecrets({}); // Clear any previously revealed secrets
    setCardOrder(prev => [id, ...prev.filter(i => i !== id)]);
    setExpandedId(id);
  }

  function copyField(text, fieldKey) {
    const cleaned = text.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleaned).catch(() => {});
    successTap();
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1500);
    // Auto-wipe sensitive card secrets from the clipboard. PAN/CVV field
    // keys start with `num_`/`cvv_`; cardholder and expiry are skipped
    // because clobbering the user's clipboard for them would be hostile.
    if (fieldKey?.startsWith('num_') || fieldKey?.startsWith('cvv_')) {
      pendingClipboardWipe.current = true;
      // 30s passive wipe.
      setTimeout(() => {
        if (!pendingClipboardWipe.current) return;
        pendingClipboardWipe.current = false;
        navigator.clipboard.writeText('').catch(() => {});
      }, 30000);
    }
  }

  // Backgrounding wipe — if the user switches away to paste in another app,
  // that's fine, but if iOS suspends our process before the 30s timer
  // fires, the PAN/CVV could linger in the clipboard until the next reboot.
  // Wipe immediately on visibility change / pagehide as a backstop.
  const pendingClipboardWipe = useRef(false);
  useEffect(() => {
    function wipeIfPending() {
      if (!pendingClipboardWipe.current) return;
      pendingClipboardWipe.current = false;
      try { navigator.clipboard.writeText(''); } catch {}
    }
    function onVis() { if (document.visibilityState === 'hidden') wipeIfPending(); }
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', wipeIfPending);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', wipeIfPending);
    };
  }, []);

  async function revealCard(cardId) {
    if (revealedSecrets[cardId]) {
      // Already revealed — hide it
      setRevealedSecrets(prev => { const next = {...prev}; delete next[cardId]; return next; });
      return;
    }
    // Must have security set up on this device
    if (!isSecuritySetUp()) { setShowSecurityPrompt(true); return; }
    // Always require auth to reveal card secrets
    const ok = await authenticate();
    if (!ok) return;
    // Load from encrypted vault
    if (currentUser?.uid) {
      const secrets = await loadCardSecrets(currentUser.uid, cardId);
      if (secrets) {
        setRevealedSecrets(prev => ({ ...prev, [cardId]: secrets }));
        // Auto-hide after 30 seconds
        setTimeout(() => {
          setRevealedSecrets(prev => { const next = {...prev}; delete next[cardId]; return next; });
        }, 30000);
      }
    }
  }

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
    setCardExpiry(clean.slice(0, 5));
  }

  const rawNumber = cardNumber.replace(/\s/g, '');
  // Only ONE field is required so the card can be identified — either a
  // name/label OR at least 4 digits of the card number. Everything else
  // (full number, expiry, CVV) is optional. CVV especially is a sensitive
  // value many users prefer never to type into any app.
  const canSave = !!(cardName.trim() || cardLabel.trim() || rawNumber.length >= 4);

  function handleSave() {
    if (!canSave) return;
    successTap();
    const cardId = `card_${Date.now()}`;
    // Save display data (syncs to Firestore — last4 only, NEVER full number/CVV)
    onAddCard({
      id: cardId,
      label: cardLabel.trim() || (cardNetwork.charAt(0).toUpperCase() + cardNetwork.slice(1) + ' Card'),
      name: cardName.trim(),
      last4: rawNumber.slice(-4),
      expiry: cardExpiry,
      network: cardNetwork,
      gradient: cardGradient,
    });
    // Save full number + CVV encrypted locally (never leaves device).
    // Only persist secrets if the user actually provided a full number —
    // otherwise there's nothing meaningful to encrypt/reveal later.
    if (currentUser?.uid && rawNumber.length >= 13) {
      saveCardSecrets(currentUser.uid, cardId, rawNumber, cardCVC);
    }
    setShowAdd(false);
    setCardNumber(''); setCardName('');
    setCardExpiry(''); setCardCVC(''); setCardLabel('');
    setCardGradient('navy'); setCardNetwork('visa');
  }

  function handleDelete(id) {
    errorTap();
    onDeleteCard(id);
    setExpandedId(null);
    if (currentUser?.uid) deleteCardSecrets(currentUser.uid, id);
  }

  // Drag-to-dismiss add sheet
  const sheetRef = useRef(null);
  const dragState = useRef({ startY: 0, currentY: 0, dragging: false });

  function handleSheetTouchStart(e) {
    dragState.current.startY = e.touches[0].clientY;
    dragState.current.dragging = true;
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }
  function handleSheetTouchMove(e) {
    if (!dragState.current.dragging) return;
    const diff = e.touches[0].clientY - dragState.current.startY;
    const offset = Math.max(0, diff);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${offset}px)`;
    }
    if (offset > 0) e.preventDefault();
  }
  function handleSheetTouchEnd(e) {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    const diff = e.changedTouches[0].clientY - dragState.current.startY;
    if (!sheetRef.current) return;
    sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    if (diff > 80) {
      sheetRef.current.style.transform = 'translateY(110%)';
      setTimeout(() => setShowAdd(false), 280);
    } else {
      sheetRef.current.style.transform = 'translateY(0)';
    }
  }

  const previewCard = { last4: cardNumber.replace(/\D/g, '').slice(-4), name: cardName, expiry: cardExpiry, network: cardNetwork, gradient: cardGradient, label: cardLabel };

  return (
    <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="safe-top" style={{ padding: '0 20px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.8 }}>Wallet</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{cards.length} card{cards.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 100px' }}>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}><rect x="1" y="4" width="22" height="16" rx="3"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No cards yet</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Tap + to add your first card</div>
          </div>
        ) : (
          orderedCards.map((card, i) => {
            const isExp = expandedId === card.id;
            const isDim = expandedId !== null && !isExp;
            return (
              <div key={card.id} onClick={() => toggleCard(card.id)} style={{
                marginBottom: expandedId === null ? -150 : 0,
                zIndex: isExp ? 50 : orderedCards.length - i,
                opacity: isDim ? 0 : 1,
                pointerEvents: isDim ? 'none' : 'auto',
                transform: isDim ? 'scale(0.95)' : 'none',
                height: isDim ? 0 : 'auto',
                overflow: isDim ? 'hidden' : 'visible',
                transition: 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
                cursor: 'pointer', position: 'relative',
              }}>
                <CardGraphic card={card} />
                <div style={{
                  overflow: 'hidden', maxHeight: isExp ? 500 : 0, opacity: isExp ? 1 : 0,
                  marginTop: isExp ? 14 : 0,
                  transition: 'max-height 0.45s cubic-bezier(0.32,0.72,0,1), opacity 0.35s ease 0.08s, margin-top 0.45s cubic-bezier(0.32,0.72,0,1)',
                }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                    {hasCardSecrets(currentUser?.uid, card.id) && (() => {
                      const secrets = revealedSecrets[card.id];
                      return (
                        <button onClick={() => revealCard(card.id)} style={{
                          width: '100%', padding: 12, border: 'none',
                          background: secrets ? 'rgba(239,68,68,0.06)' : 'rgba(79,110,247,0.06)',
                          borderBottom: '1px solid var(--border)',
                          color: secrets ? '#ef4444' : 'var(--accent)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {secrets ? (
                              <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                            ) : (
                              <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                            )}
                          </svg>
                          {secrets ? 'Hide Card Details' : 'Reveal Card Details'}
                        </button>
                      );
                    })()}
                    {(() => {
                      const secrets = revealedSecrets[card.id];
                      // Handle the case where the user only saved a number (no CVV)
                      // or saved nothing (last4-only display card).
                      const cvvSaved = secrets && secrets.cvv && secrets.cvv.length > 0;
                      const numberSaved = secrets && secrets.number && secrets.number.length > 0;
                      const detailItems = [
                        {
                          label: 'Card Number',
                          hidden: card.last4
                            ? `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${card.last4}`
                            : 'Not saved',
                          revealed: numberSaved ? secrets.number.replace(/(.{4})/g, '$1 ').trim() : null,
                          copyValue: numberSaved ? secrets.number : null,
                          key: `num_${card.id}`,
                          mono: true
                        },
                        { label: 'Cardholder', hidden: card.name || 'Not saved', copyValue: card.name || null, key: `name_${card.id}` },
                        { label: 'Expiry Date', hidden: card.expiry || 'Not saved', copyValue: card.expiry || null, key: `exp_${card.id}`, mono: true },
                        {
                          label: 'CVV',
                          hidden: '\u2022\u2022\u2022',
                          revealed: secrets ? (cvvSaved ? secrets.cvv : 'Not saved') : null,
                          copyValue: cvvSaved ? secrets.cvv : null,
                          key: `cvv_${card.id}`,
                          mono: true
                        },
                        { label: 'Network', hidden: card.network?.charAt(0).toUpperCase() + card.network?.slice(1), key: `net_${card.id}` },
                      ];
                      return detailItems.map(item => (
                        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', fontFamily: item.mono ? 'monospace' : 'inherit', letterSpacing: item.mono ? 1 : 0 }}>
                              {item.revealed || item.hidden}
                            </div>
                          </div>
                          {item.copyValue && (
                            <button onClick={() => copyField(item.copyValue, item.key)} style={{
                              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              border: `1px solid ${copiedField === item.key ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
                              background: copiedField === item.key ? 'rgba(52,211,153,0.12)' : 'var(--surface2)',
                              color: copiedField === item.key ? '#34D399' : 'var(--text-secondary)',
                              transition: 'all 0.2s',
                            }}>{copiedField === item.key ? 'Copied!' : 'Copy'}</button>
                          )}
                        </div>
                      ));
                    })()}
                    {!hasCardSecrets(currentUser?.uid, card.id) && (
                      <div style={{ padding: '12px 18px', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5, background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                        Full card details are only available on the device where you added this card. Card numbers and CVV are encrypted and never leave your device.
                      </div>
                    )}
                    <button onClick={() => handleDelete(card.id)} style={{ width: '100%', padding: 14, border: 'none', background: 'rgba(239,68,68,0.06)', borderTop: '1px solid var(--border)', color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Remove Card</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button onClick={() => {
        if (!isSecuritySetUp()) {
          setShowSecurityPrompt(true);
          return;
        }
        setShowAdd(true);
      }} style={{
        position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: '50%',
        background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 28, fontWeight: 300,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 24px rgba(79,110,247,0.4)', zIndex: 60,
      }}>+</button>

      {/* Security Required Prompt */}
      {showSecurityPrompt && (
        <div data-kb-push onClick={() => setShowSecurityPrompt(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease both',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'calc(100% - 48px)', maxWidth: 340, background: 'var(--surface)',
            borderRadius: 24, padding: '32px 24px', textAlign: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'rgba(245,158,11,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 28,
            }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Set Up Security First
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 8 }}>
              Your card details are protected with encryption. Set up Face ID or a PIN on this device to access your cards.
            </div>
            <div style={{ marginBottom: 24 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowSecurityPrompt(false)} style={{
                flex: 1, padding: 14, borderRadius: 14,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => { setShowSecurityPrompt(false); onOpenSecurity?.(); }} style={{
                flex: 2, padding: 14, borderRadius: 14, border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
              }}>Set Up Now</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Prompt Modal */}
      {showPinPrompt && (
        <div data-kb-push onClick={handlePinPromptCancel} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease both',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'calc(100% - 48px)', maxWidth: 300, background: 'var(--surface)',
            borderRadius: 24, padding: '32px 24px', textAlign: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Enter PIN</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 20 }}>Enter your 4-digit PIN to view card details</div>
            {pinPromptError && <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginBottom: 12 }}>{pinPromptError}</div>}
            <input
              type="tel" pattern="[0-9]*" maxLength={4} value={pinPromptInput} autoFocus
              onChange={e => { setPinPromptInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinPromptError(''); }}
              onKeyDown={e => e.key === 'Enter' && handlePinPromptSubmit()}
              placeholder="• • • •" autoComplete="off"
              style={{
                width: 160, padding: 14, borderRadius: 14, textAlign: 'center',
                background: 'var(--surface2)', border: '1.5px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 24, fontWeight: 800,
                letterSpacing: 12, outline: 'none', boxSizing: 'border-box',
                marginBottom: 20, WebkitTextSecurity: 'disc',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handlePinPromptCancel} style={{
                flex: 1, padding: 12, borderRadius: 12,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handlePinPromptSubmit} style={{
                flex: 1, padding: 12, borderRadius: 12, border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
                opacity: pinPromptInput.length < 4 ? 0.5 : 1,
              }}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div data-kb-push onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.25s ease both' }}>
          <div data-keyboard-scroll ref={el => { sheetRef.current = el; if (el && !el._entered) { el._entered = true; el.style.transform = 'translateY(100%)'; requestAnimationFrame(() => { el.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)'; el.style.transform = 'translateY(0)'; }); } }} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: '0 20px 40px', maxHeight: '92dvh', overflowY: 'auto' }}>
            <div onTouchStart={handleSheetTouchStart} onTouchMove={handleSheetTouchMove} onTouchEnd={handleSheetTouchEnd} style={{ width: '100%', padding: '14px 0 18px', cursor: 'grab', touchAction: 'none' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto', opacity: 0.5 }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, letterSpacing: -0.3, color: 'var(--text-primary)' }}>Add Card</div>
            <div style={{ marginBottom: 22 }}><CardGraphic card={previewCard} /></div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 10 }}>Card Style</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', scrollbarWidth: 'none', padding: '6px 4px' }}>
              {CARD_GRADIENTS.map(g => (
                <div key={g.id} onClick={() => { lightTap(); setCardGradient(g.id); }} style={{
                  width: 44, height: 28, borderRadius: 8, background: g.gradient, flexShrink: 0, cursor: 'pointer',
                  opacity: cardGradient === g.id ? 1 : 0.5, transform: cardGradient === g.id ? 'scale(1.15)' : 'scale(1)', transition: 'all 0.2s',
                }} />
              ))}
            </div>
            <div className="form-group"><label className="form-label">Card Number <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label><input className="form-input" type="text" inputMode="numeric" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => handleNumberInput(e.target.value)} maxLength={19} style={{ fontFamily: 'monospace', letterSpacing: 2 }} /></div>
            <div className="form-group"><label className="form-label">Cardholder Name <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label><input className="form-input" type="text" placeholder="YOUR NAME" value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }} /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">Expiry <span style={{ opacity: 0.5, fontWeight: 400 }}>(opt.)</span></label><input className="form-input" type="text" inputMode="numeric" placeholder="MM/YY" value={cardExpiry} onChange={e => handleExpiryInput(e.target.value)} maxLength={5} style={{ fontFamily: 'monospace' }} /></div>
              <div className="form-group" style={{ flex: 1 }}><label className="form-label">CVV <span style={{ opacity: 0.5, fontWeight: 400 }}>(opt.)</span></label><input className="form-input" type="password" inputMode="numeric" placeholder="•••" value={cardCVC} onChange={e => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} style={{ fontFamily: 'monospace' }} /></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: -8, marginBottom: 16, lineHeight: 1.5, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🔒 Privacy:</span> the full card number and CVV are AES-256 encrypted on this device. The encryption key is stored in the iOS Keychain / Android Keystore — released only to this app. Card secrets never leave your phone or sync to the cloud. Skip any field you don't want to enter.
            </div>
            <div className="form-group"><label className="form-label">Network</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['visa','Visa'],['mastercard','Mastercard'],['amex','Amex'],['other','Other']].map(([n, lbl]) => (
                  <button key={n} onClick={() => { lightTap(); setCardNetwork(n); }} style={{ flex: 1, padding: '10px 4px', borderRadius: 12, border: `1.5px solid ${cardNetwork === n ? 'var(--accent)' : 'var(--border)'}`, background: cardNetwork === n ? 'rgba(79,110,247,0.1)' : 'var(--surface2)', color: cardNetwork === n ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Label <span style={{ opacity: 0.5, fontWeight: 400 }}>(bank or card name)</span></label><input className="form-input" type="text" placeholder="e.g. Chase, HSBC, Personal..." value={cardLabel} onChange={e => setCardLabel(e.target.value)} /></div>
            <button onClick={handleSave} className="btn-primary" style={{ opacity: canSave ? 1 : 0.4, transition: 'opacity 0.2s', boxShadow: canSave ? '0 4px 20px rgba(79,110,247,0.3)' : 'none' }} disabled={!canSave}>Save Card</button>
          </div>
        </div>
      )}
      <FeatureTip tipId="cards" currentUser={currentUser} />
    </div>
  );
}
