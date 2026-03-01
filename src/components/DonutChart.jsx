import { useMemo } from 'react';

export default function DonutChart({ data, size = 140, stroke = 28, centerLabel, centerSub }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  const slices = useMemo(() => {
    let offset = 0;
    return data.map(d => {
      const pct = total > 0 ? d.value / total : 0;
      const dash = pct * circ;
      const gap  = circ - dash;
      const s = { ...d, offset, dash, gap };
      offset += dash;
      return s;
    });
  }, [data, total, circ]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#F0F2F8"
          strokeWidth={stroke}
        />
        {slices.map((s, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
            style={{ transition: `stroke-dasharray 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.08}s` }}
          />
        ))}
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.02em' }}>
          {centerSub}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#0D1117', letterSpacing: '-0.5px', marginTop: 2 }}>
          {centerLabel}
        </span>
      </div>
    </div>
  );
}
