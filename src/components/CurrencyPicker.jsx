import { useState, useMemo } from 'react';
import { CURRENCIES } from '../data/transactions';

export default function CurrencyPicker({ selected, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return CURRENCIES;
    const q = search.toLowerCase();
    return CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.includes(q) ||
      c.region.toLowerCase().includes(q)
    );
  }, [search]);

  // Group by region
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      if (!map[c.region]) map[c.region] = [];
      map[c.region].push(c);
    });
    return Object.entries(map);
  }, [filtered]);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '88%' }}>
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Select Currency
          </span>
          <button onClick={onClose} style={{
            background: 'var(--surface2)', border: 'none', width: 32, height: 32,
            borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="var(--text-tertiary)" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search currency or country..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', maxHeight: 460, scrollbarWidth: 'none' }}>
          {grouped.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No currencies found</div>
            </div>
          ) : (
            grouped.map(([region, currencies]) => (
              <div key={region} style={{ marginBottom: 8 }}>
                {/* Region label */}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  padding: '6px 4px 6px',
                }}>
                  {region}
                </div>

                {/* Currency rows */}
                <div className="card" style={{ padding: '0 14px' }}>
                  {currencies.map((c, i) => {
                    const isSelected = c.code === selected;
                    return (
                      <div
                        key={c.code}
                        onClick={() => { onSelect(c.code); onClose(); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '13px 0',
                          borderBottom: i < currencies.length - 1 ? '1px solid var(--border)' : 'none',
                          cursor: 'pointer',
                          background: 'transparent',
                        }}
                      >
                        {/* Flag */}
                        <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>

                        {/* Name + code */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 14, fontWeight: 600,
                            color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                          }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                            {c.code} · {c.symbol}
                          </div>
                        </div>

                        {/* Check */}
                        {isSelected && (
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                              <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
