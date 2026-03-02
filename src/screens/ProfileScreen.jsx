import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, CURRENCIES } from '../data/transactions';
import CurrencyPicker from '../components/CurrencyPicker';

const OTHER_SETTINGS = [
  { icon: '👤', label: 'Edit Profile',    sub: 'Alex Johnson' },
  { icon: '💳', label: 'Payment Methods', sub: '3 cards linked' },
  { icon: '🔔', label: 'Notifications',   sub: 'Push & Email on' },
  { icon: '🔒', label: 'Security',        sub: 'Face ID on' },
  { icon: '❓', label: 'Help & Support',  sub: 'FAQ, Contact us' },
  { icon: '⭐', label: 'Rate Findo',      sub: 'Love the app?' },
];

export default function ProfileScreen({ transactions }) {
  const { isDark, toggleTheme, currency, setCurrency } = useTheme();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const totalIncome  = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
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
          }}>
            🧑‍💼
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Alex Johnson</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>alex@example.com</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.5px' }}>
                {formatCurrency(totalIncome, currency)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Total Income</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)', letterSpacing: '-0.5px' }}>
                {formatCurrency(totalExpense, currency)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Total Spent</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
                {transactions.length}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Records</div>
            </div>
          </div>
        </div>

        {/* Settings Label */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Settings
        </div>

        <div className="card anim-fadeup" style={{ padding: '0 16px', marginBottom: 16, animationDelay: '0.05s' }}>

          {/* Dark Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: isDark ? 'rgba(61,142,255,0.15)' : 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {isDark ? '🌙' : '☀️'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Appearance</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{isDark ? 'Dark mode' : 'Light mode'}</div>
            </div>
            <div onClick={toggleTheme} style={{
              width: 48, height: 28, borderRadius: 14, cursor: 'pointer',
              background: isDark ? 'var(--accent)' : 'var(--border)',
              position: 'relative', transition: 'background 0.25s ease', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: 3, left: isDark ? 23 : 3,
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          </div>

          {/* Currency Row */}
          <div
            onClick={() => setShowCurrencyPicker(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {selectedCur.flag}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Currency</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {selectedCur.code} · {selectedCur.name}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 13, fontWeight: 700, color: 'var(--accent)',
                background: 'var(--accent-light)', padding: '3px 8px', borderRadius: 8,
              }}>
                {selectedCur.symbol}
              </span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Other Settings */}
          {OTHER_SETTINGS.map((s, i) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
              borderBottom: i < OTHER_SETTINGS.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11, background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
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
        <button style={{
          width: '100%', padding: '14px',
          background: isDark ? 'rgba(255,90,90,0.1)' : '#FFF0F0',
          border: `1.5px solid ${isDark ? 'rgba(255,90,90,0.25)' : '#FECACA'}`,
          borderRadius: 'var(--radius-md)',
          color: 'var(--danger)', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}>
          Sign Out
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Findo v1.0.0 · Made with ❤️
        </div>
      </div>

      {/* Currency Picker Sheet */}
      {showCurrencyPicker && (
        <CurrencyPicker
          selected={currency}
          onSelect={setCurrency}
          onClose={() => setShowCurrencyPicker(false)}
        />
      )}
    </div>
  );
}
