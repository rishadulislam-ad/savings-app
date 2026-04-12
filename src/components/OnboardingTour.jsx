import { useState, useEffect, useRef, useCallback } from 'react';

export const HOME_TOUR_STEPS = [
  { id: 'welcome', target: null, title: 'Welcome to Coinova!', desc: 'Let us give you a quick tour of the app. It only takes 30 seconds.', emoji: '👋', placement: 'center' },
  { id: 'balance', target: '[data-tour="balance-card"]', title: 'Your Financial Overview', desc: 'Your net balance, income, and spending — all in one card. Switch views to see expenses or income separately.', placement: 'bottom', radius: 20 },
  { id: 'insights', target: '[data-tour="insights"]', title: 'Smart Insights', desc: 'AI-powered analysis of your spending patterns, savings rate, and trends compared to last month.', placement: 'bottom', radius: 18 },
  { id: 'breakdown', target: '[data-tour="breakdown"]', title: 'Spending Breakdown', desc: 'Visual breakdown of where your money goes. Tap to see detailed budgets by category.', placement: 'bottom', radius: 18 },
  { id: 'fab', target: '[data-tour="fab-button"]', title: 'Add Transactions', desc: 'Your main action button. Tap to log income or expenses with full details.', placement: 'top', radius: 28 },
  { id: 'quickadd', target: '[data-tour="quick-add"]', title: 'Quick Add', desc: 'The lightning bolt — a faster way to log expenses. Just pick a category and amount.', placement: 'top', radius: 18 },
  { id: 'nav', target: '[data-tour="bottom-nav"]', title: 'Navigate the App', desc: 'Switch between Home, Transactions, Budgets, and Profile with a single tap.', placement: 'top', radius: 0 },
  { id: 'profile', target: '[data-tour="profile-tab"]', title: 'Your Profile', desc: 'Cards & wallet, currency converter, travel tracker, security, and all your settings live here.', placement: 'top', radius: 14 },
  { id: 'done', target: null, title: 'You\'re All Set!', desc: 'Start managing your finances like a pro. You can replay this tour anytime from Help & Support.', emoji: '🚀', placement: 'center' },
];

export const TRAVEL_TOUR_STEPS = [
  { id: 'welcome', target: null, title: 'Travel Tracker', desc: 'Create trip books for each journey. Track spending in local currency, set budgets, and never overspend abroad.', emoji: '✈️', placement: 'center' },
  { id: 'create-first', target: '[data-tour="travel-create-first"]', title: 'Create Your First Trip', desc: 'Pick a destination, set your dates and budget. All trip expenses are tracked separately in the local currency.', placement: 'top', radius: 14 },
  { id: 'create-btn', target: '[data-tour="travel-create"]', title: 'Quick Create', desc: 'You can also tap this + button anytime to create a new trip.', placement: 'bottom', radius: 12 },
  { id: 'stats', target: '[data-tour="travel-stats"]', title: 'Trip Overview', desc: 'See all your trips at a glance — active, upcoming, and completed with totals.', placement: 'bottom', radius: 14 },
  { id: 'trip-card', target: '[data-tour="travel-trip"]', title: 'Your Trips', desc: 'Each trip shows spending, budget, and progress. Tap a trip to see detailed expenses by category.', placement: 'bottom', radius: 20 },
  { id: 'done', target: null, title: 'Bon Voyage!', desc: 'You\'re ready to track your travel spending. Create your first trip to get started!', emoji: '🌍', placement: 'center' },
];

export default function OnboardingTour({ isActive, onComplete, steps, accentColor }) {
  const TOUR_STEPS = steps || HOME_TOUR_STEPS;
  const accent = accentColor || '#4F6EF7';
  const accentRgba = (opacity) => {
    const r = parseInt(accent.slice(1,3),16), g = parseInt(accent.slice(3,5),16), b = parseInt(accent.slice(5,7),16);
    return `rgba(${r},${g},${b},${opacity})`;
  };
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  const measureTimer = useRef(null);

  useEffect(() => {
    if (isActive) { setStep(0); setRect(null); setAnimKey(0); }
  }, [isActive]);

  // Measure target element when step changes
  useEffect(() => {
    if (!isActive) return;
    const s = TOUR_STEPS[step];
    if (!s || !s.target) { setRect(null); return; }

    if (measureTimer.current) clearTimeout(measureTimer.current);

    const el = document.querySelector(s.target);
    if (!el) { setRect(null); return; }

    // Check if element is already in viewport
    const r = el.getBoundingClientRect();
    const inView = r.top >= 0 && r.bottom <= window.innerHeight;

    if (inView && r.width > 0) {
      // Already visible — measure immediately
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      // Scroll into view, then measure
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      measureTimer.current = setTimeout(() => {
        const r2 = el.getBoundingClientRect();
        if (r2.width > 0 && r2.height > 0) {
          setRect({ top: r2.top, left: r2.left, width: r2.width, height: r2.height });
        }
      }, 350);
    }

    return () => { if (measureTimer.current) clearTimeout(measureTimer.current); };
  }, [step, isActive]);

  if (!isActive) return null;

  const s = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;
  const pad = 10;

  function next() {
    let n = step + 1;
    while (n < total && TOUR_STEPS[n].target && !document.querySelector(TOUR_STEPS[n].target)) n++;
    if (n >= total) { onComplete(); return; }
    // Don't clear rect — keep previous spotlight visible for smooth transition
    setAnimKey(k => k + 1);
    setStep(n);
  }

  function skip() { onComplete(); }

  // Progress bar
  const progress = ((step) / (total - 1)) * 100;
  const progressBar = (
    <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', marginBottom: 18, overflow: 'hidden' }}>
      <div style={{ width: `${progress}%`, height: '100%', borderRadius: 2, background: accent, transition: 'width 0.4s ease' }} />
    </div>
  );

  // ─── Centered cards (welcome / done) ───
  if (s.placement === 'center') {
    const isWelcome = step === 0;
    const isDone = step === total - 1;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div key={animKey} style={{
          width: '100%', maxWidth: 340,
          background: 'linear-gradient(145deg, #1a1d2e, #161821)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28, padding: '36px 28px 28px', textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${accentRgba(0.08)}',
          animation: 'scaleIn 0.45s cubic-bezier(0.32,0.72,0,1) both',
        }}>
          {/* Glow circle behind emoji */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: accentRgba(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 40px ${accentRgba(0.15)}` }}>
            <span style={{ fontSize: 40 }}>{s.emoji}</span>
          </div>
          {progressBar}
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8, letterSpacing: -0.5 }}>{s.title}</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>{s.desc}</div>
          <button onClick={next} style={{
            width: '100%', padding: 16, borderRadius: 16, border: 'none',
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 6px 24px ${accentRgba(0.35)}`,
            transition: 'transform 0.2s',
          }}>{isDone ? 'Get Started' : isWelcome ? 'Start Tour' : 'Next'}</button>
          {isWelcome && (
            <button onClick={skip} style={{
              marginTop: 12, padding: '10px 16px', border: 'none', background: 'transparent',
              color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Skip tour</button>
          )}
        </div>
      </div>
    );
  }

  // ─── Spotlight step ───
  // Show dark overlay while measuring
  if (!rect) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
  );

  const rx = s.radius || 18;
  const cx = rect.left - pad;
  const cy = rect.top - pad;
  const cw = rect.width + pad * 2;
  const ch = rect.height + pad * 2;

  // Tooltip positioning
  const tooltipW = Math.min(320, window.innerWidth - 40);
  let tooltipTop, arrowSide;

  if (s.placement === 'bottom') {
    tooltipTop = rect.top + rect.height + pad + 18;
    arrowSide = 'top';
  } else {
    tooltipTop = rect.top - pad - 18;
    arrowSide = 'bottom';
  }

  // Measure tooltip height estimate
  const tooltipH = 200;
  if (s.placement === 'top') {
    tooltipTop = rect.top - pad - 18 - tooltipH;
  }

  // Clamp to viewport
  tooltipTop = Math.max(16, Math.min(tooltipTop, window.innerHeight - tooltipH - 16));

  let tooltipLeft = rect.left + rect.width / 2 - tooltipW / 2;
  tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - tooltipW - 20));

  let arrowLeft = rect.left + rect.width / 2 - tooltipLeft - 7;
  arrowLeft = Math.max(24, Math.min(arrowLeft, tooltipW - 38));

  const featureSteps = TOUR_STEPS.filter(st => st.placement !== 'center');
  const featureIdx = featureSteps.findIndex(st => st.id === s.id) + 1;

  return (
    <>
      {/* SVG overlay */}
      <svg style={{ position: 'fixed', inset: 0, zIndex: 10000, width: '100%', height: '100%' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={cx} y={cy} width={cw} height={ch} rx={rx} ry={rx} fill="black"
              style={{ transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)' }} />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.78)" mask="url(#tour-mask)" />
        {/* Outer glow ring */}
        <rect x={cx - 3} y={cy - 3} width={cw + 6} height={ch + 6} rx={rx + 3} ry={rx + 3}
          fill="none" stroke={accentRgba(0.3)} strokeWidth="1.5"
          style={{ transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)' }}>
          <animate attributeName="stroke-opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
        </rect>
        {/* Inner highlight border */}
        <rect x={cx} y={cy} width={cw} height={ch} rx={rx} ry={rx}
          fill="none" stroke={accentRgba(0.15)} strokeWidth="1"
          style={{ transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)' }} />
      </svg>

      {/* Tooltip */}
      <div key={animKey} style={{
        position: 'fixed', top: tooltipTop, left: tooltipLeft, width: tooltipW,
        zIndex: 10001,
        background: 'linear-gradient(145deg, #1a1d2e, #161821)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22, padding: '20px 22px',
        boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px ${accentRgba(0.06)}`,
        animation: 'fadeUp 0.35s cubic-bezier(0.32,0.72,0,1) both',
      }}>
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          [arrowSide]: -8,
          left: arrowLeft,
          width: 16, height: 16,
          background: arrowSide === 'top' ? '#1a1d2e' : '#161821',
          border: '1px solid rgba(255,255,255,0.08)',
          transform: 'rotate(45deg)',
          ...(arrowSide === 'top' ? { borderBottom: 'none', borderRight: 'none' } : { borderTop: 'none', borderLeft: 'none' }),
        }} />

        {progressBar}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>{s.title}</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 700, background: accentRgba(0.1), padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>
            {featureIdx}/{featureSteps.length}
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{s.desc}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={skip} style={{
            padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Skip</button>
          <button onClick={next} style={{
            padding: '10px 28px', borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 14px ${accentRgba(0.3)}`,
          }}>Next</button>
        </div>
      </div>
    </>
  );
}
