import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../data/transactions';
import {
  calculateSavingsScore,
  generatePredictions,
  analyzeBehavioralPatterns,
  determineMoneyPersonality,
} from '../utils/smartInsights';

/* ═══════════════════════════════════════════════════════════
   Smart Insights Carousel — Swipeable insight cards
   ═══════════════════════════════════════════════════════════ */
export default function SmartInsightsCarousel({ transactions, currency, currentUser }) {
  const userId = currentUser?.uid || 'guest';

  // Analysis (memoized — only recalculates when transactions change)
  const score = useMemo(() => calculateSavingsScore(transactions, userId), [transactions, userId]);
  const predictions = useMemo(() => generatePredictions(transactions, currency, formatCurrency), [transactions, currency]);
  const patterns = useMemo(() => analyzeBehavioralPatterns(transactions), [transactions]);
  const personality = useMemo(() => determineMoneyPersonality(transactions, userId), [transactions, userId]);

  // Build available slides
  const slides = useMemo(() => {
    const s = [];
    if (score) s.push({ key: 'score', component: <ScoreCard data={score} /> });
    if (predictions.length > 0) s.push({ key: 'predictions', component: <PredictionsCard items={predictions} /> });
    if (patterns) s.push({ key: 'patterns', component: <PatternsCard data={patterns} /> });
    if (personality) s.push({ key: 'personality', component: <PersonalityCard data={personality} /> });
    return s;
  }, [score, predictions, patterns, personality]);

  const [active, setActive] = useState(0);
  const autoRef = useRef(null);
  const pauseRef = useRef(null);
  const touchRef = useRef(0);

  const goTo = useCallback((i) => {
    setActive(i);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1) return;
    autoRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(autoRef.current);
  }, [slides.length]);

  const pauseAuto = useCallback(() => {
    clearInterval(autoRef.current);
    clearTimeout(pauseRef.current);
    pauseRef.current = setTimeout(() => {
      if (slides.length > 1) {
        autoRef.current = setInterval(() => {
          setActive(prev => (prev + 1) % slides.length);
        }, 6000);
      }
    }, 10000);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="card" style={{ padding: '18px 16px', marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Smart Insights</span>
        {slides.length > 1 && (
          <div style={{ display: 'flex', gap: 5 }}>
            {slides.map((_, i) => (
              <div
                key={i}
                onClick={() => { goTo(i); pauseAuto(); }}
                style={{
                  width: i === active ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === active ? 'var(--accent)' : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Carousel */}
      <div
        style={{ position: 'relative', overflow: 'hidden' }}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const diff = touchRef.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) {
            if (diff > 0 && active < slides.length - 1) goTo(active + 1);
            else if (diff < 0 && active > 0) goTo(active - 1);
            pauseAuto();
          }
        }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            style={{
              width: '100%',
              opacity: i === active ? 1 : 0,
              visibility: i === active ? 'visible' : 'hidden',
              position: i === active ? 'relative' : 'absolute',
              top: 0,
              left: 0,
              transition: 'opacity 0.35s ease',
            }}
          >
            {slide.component}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Score Card ─── */
function ScoreCard({ data }) {
  const { score, trend, breakdown } = data;
  const color = score >= 71 ? 'var(--success)' : score >= 51 ? '#FFAA20' : score >= 31 ? '#F59E0B' : 'var(--danger)';
  const circumference = 2 * Math.PI * 42; // ~264
  const offset = circumference - (circumference * score / 100);

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginBottom: 16 }}>
        {/* Ring */}
        <div style={{ position: 'relative', width: 90, height: 90 }}>
          <svg width="90" height="90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface2)" strokeWidth="7" />
            <circle
              cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1, color: 'var(--text-primary)' }}>{score}</span>
            <span style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 2 }}>Score</span>
          </div>
        </div>

        {/* Trend */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: trend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {trend >= 0 ? '↑' : '↓'} {trend >= 0 ? '+' : ''}{trend}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>from last month</div>
          <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 1 }}>
            {score >= 70 ? 'Great discipline' : score >= 40 ? 'Room to improve' : 'Needs attention'}
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: 'Savings', value: breakdown.savings, color: 'var(--success)' },
          { label: 'Budgets', value: breakdown.budgets, color: 'var(--accent)' },
          { label: 'Consistency', value: breakdown.consistency, color: '#FFAA20' },
        ].map(sub => (
          <div key={sub.label} style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 5 }}>{sub.label}</div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ width: `${sub.value}%`, height: '100%', borderRadius: 2, background: sub.color, transition: 'width 1s ease' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: sub.color, marginTop: 4 }}>{sub.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Predictions Card ─── */
function PredictionsCard({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
      {items.slice(0, 4).map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: 'var(--surface2)', borderRadius: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 500, color: p.color, lineHeight: 1.4 }}>{p.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Patterns Card ─── */
function PatternsCard({ data }) {
  const { chartData, patterns } = data;
  const headline = patterns[0];
  const subPatterns = patterns.slice(1);

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Headline */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
          {headline.headline}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>Based on your recent activity</div>
      </div>

      {/* Day-of-week chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5, height: 56, margin: '0 6px 12px' }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%' }}>
            <div style={{
              width: '100%',
              marginTop: 'auto',
              height: `${Math.max(8, d.value)}%`,
              borderRadius: 3,
              background: d.isMax ? 'var(--danger)' : 'var(--accent)',
              opacity: d.isMax ? 1 : 0.4 + (d.value / 200),
              transition: 'height 0.8s ease',
            }} />
            <span style={{
              fontSize: 8, fontWeight: d.isMax ? 700 : 600,
              color: d.isMax ? 'var(--danger)' : 'var(--text-tertiary)',
            }}>{d.label}</span>
          </div>
        ))}
      </div>

      {/* Sub-patterns */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {subPatterns.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: 'var(--surface2)', borderRadius: 8 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{p.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Personality Card ─── */
function PersonalityCard({ data }) {
  const { emoji, label, description, traits } = data;

  return (
    <div style={{ textAlign: 'center', padding: '12px 8px', position: 'relative', overflow: 'hidden', borderRadius: 14 }}>
      {/* Subtle bg gradient */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: 'linear-gradient(135deg, var(--success), var(--accent))', opacity: 0.05, pointerEvents: 'none' }} />

      <div style={{ fontSize: 40, marginBottom: 6, position: 'relative', zIndex: 1 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4, position: 'relative', zIndex: 1 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto 12px', position: 'relative', zIndex: 1 }}>{description}</div>

      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
        {traits.map(t => (
          <span key={t} style={{
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 100,
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
