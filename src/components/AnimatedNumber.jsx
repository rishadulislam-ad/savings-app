import { useState, useEffect, useRef } from 'react';

export default function AnimatedNumber({ value, duration = 600, prefix = '', suffix = '', style }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const frameRef = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    const from = mounted.current ? prevValue.current : 0;
    const to = value;
    prevValue.current = value;
    mounted.current = true;

    if (from === to) { setDisplay(to); return; }

    const start = performance.now();
    const diff = to - from;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + diff * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  const hasDecimals = Math.abs(value) % 1 !== 0;
  const formatted = hasDecimals
    ? Math.abs(display).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.abs(display).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const sign = display < 0 ? '-' : '';
  return <span style={style}>{sign}{prefix}{formatted}{suffix}</span>;
}
