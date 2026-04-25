import { useEffect, useRef } from 'react';

// Cache formatters per (decimals, currency-style) — Intl.NumberFormat construction
// is itself surprisingly expensive on iOS WKWebView (~0.3-1ms each). Reusing a
// single instance per format lets the per-frame text update stay under a few
// hundred microseconds, well inside a 16ms frame budget.
const formatterCache = new Map();
function getFormatter(decimals) {
  const key = `${decimals}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatterCache.set(key, f);
  }
  return f;
}

/**
 * Smooth count-up number, optimized for iOS WKWebView.
 *
 * Why this exists rather than `useState(display)` + setState-per-frame:
 *   - Per-frame setState forces React reconciliation + virtual-DOM diff every
 *     frame (~60× per second). On iOS that adds up to noticeable jank.
 *   - We bypass React entirely during the tween: a ref points to the <span>'s
 *     text node and we write `textContent` directly. React only commits when
 *     `value` actually changes from the parent.
 *   - `font-variant-numeric: tabular-nums` keeps digit columns the same width
 *     so the browser doesn't re-layout on every tick. Variable-width digits
 *     are the #1 cause of count-up choppiness in WebKit.
 *   - `will-change: contents` + `translateZ(0)` promotes the span to its own
 *     compositor layer so a digit change doesn't repaint the surrounding card.
 */
export default function AnimatedNumber({ value, duration = 600, prefix = '', suffix = '', style }) {
  const spanRef = useRef(null);
  const prevValue = useRef(0);
  const mounted = useRef(false);
  const frameRef = useRef(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const from = mounted.current ? prevValue.current : 0;
    const to = Number(value) || 0;
    prevValue.current = to;
    mounted.current = true;

    // Decimals are based on the TARGET value — not the current frame's
    // fractional value — so the displayed precision doesn't flicker between
    // 2-decimal and 0-decimal during the tween.
    const hasDecimals = Math.abs(to) % 1 !== 0;
    const decimals = hasDecimals ? 2 : 0;
    const fmt = getFormatter(decimals);

    function render(n) {
      const sign = n < 0 ? '-' : '';
      el.textContent = `${sign}${prefix}${fmt.format(Math.abs(n))}${suffix}`;
    }

    if (from === to) {
      render(to);
      return;
    }

    const start = performance.now();
    const diff = to - from;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out-cubic — same curve as before, matches iOS spring feel.
      const eased = 1 - Math.pow(1 - progress, 3);
      render(from + diff * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        frameRef.current = null;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value, duration, prefix, suffix]);

  // Initial textContent before the effect runs — avoids a flash of "0" on mount.
  const initial = (() => {
    const v = Number(value) || 0;
    const decimals = Math.abs(v) % 1 !== 0 ? 2 : 0;
    return `${v < 0 ? '-' : ''}${prefix}${getFormatter(decimals).format(Math.abs(0))}${suffix}`;
  })();

  return (
    <span
      ref={spanRef}
      style={{
        // Tabular figures — fixed-width digits prevent layout thrash as the
        // number ticks. Without this, every frame the browser re-measures and
        // re-lays out the surrounding row.
        fontVariantNumeric: 'tabular-nums',
        // GPU compositor layer — a digit-change repaint stays inside this
        // layer instead of invalidating the parent card.
        willChange: 'contents',
        transform: 'translateZ(0)',
        ...style,
      }}
    >
      {initial}
    </span>
  );
}
