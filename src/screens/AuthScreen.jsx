import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AuthScreen({ onAuth }) {
  const { isDark } = useTheme();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    if (mode === 'signup') {
      const existing = localStorage.getItem(`findo_user_${email.toLowerCase()}`);
      if (existing) { setError('An account with this email already exists.'); return; }
      const user = { name: name.trim(), email: email.toLowerCase() };
      localStorage.setItem(`findo_user_${email.toLowerCase()}`, JSON.stringify({ ...user, password }));
      localStorage.setItem('findo_session', JSON.stringify(user));
      onAuth(user, []);
    } else {
      const stored = localStorage.getItem(`findo_user_${email.toLowerCase()}`);
      if (!stored) { setError('No account found with this email.'); return; }
      const userData = JSON.parse(stored);
      if (userData.password !== password) { setError('Incorrect password.'); return; }
      const user = { name: userData.name, email: email.toLowerCase() };
      localStorage.setItem('findo_session', JSON.stringify(user));
      const savedTx = localStorage.getItem(`findo_transactions_${email.toLowerCase()}`);
      onAuth(user, savedTx ? JSON.parse(savedTx) : []);
    }
  }

  function handleSocialLogin(provider) {
    const providerName = provider === 'google' ? 'Google' : 'Apple';
    const mockEmail = `${provider}_${Date.now()}@${provider}.com`;
    const user = { name: `${providerName} User`, email: mockEmail, provider };
    localStorage.setItem('findo_session', JSON.stringify(user));
    onAuth(user, []);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 24px 32px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 76, height: 76, borderRadius: 24,
            background: 'linear-gradient(145deg, #1A7FFF, #0044CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(10,108,255,0.4)',
            fontSize: 34,
          }}>
            💰
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>Findo</div>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Smart money management</div>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 16, padding: 4, marginBottom: 24 }}>
          {[{ id: 'signin', label: 'Sign In' }, { id: 'signup', label: 'Sign Up' }].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setError(''); }}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                background: mode === m.id ? 'var(--surface)' : 'transparent',
                color: mode === m.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: mode === m.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s',
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <input className="form-input" placeholder="Full name"
              value={name} onChange={e => setName(e.target.value)} />
          )}
          <input className="form-input" type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} />
          <input className="form-input" type="password" placeholder="Password (min 6 characters)"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

          {error && (
            <div style={{
              fontSize: 13, color: 'var(--danger)', textAlign: 'center',
              background: isDark ? 'rgba(255,90,90,0.1)' : '#FFF5F5',
              border: '1px solid ' + (isDark ? 'rgba(255,90,90,0.2)' : '#FECACA'),
              borderRadius: 10, padding: '8px 12px',
            }}>{error}</div>
          )}

          <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 4 }}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Social Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => handleSocialLogin('google')} style={{
            flex: 1, padding: '13px', borderRadius: 16,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            transition: 'opacity 0.15s',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.131 17.64 11.824 17.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button onClick={() => handleSocialLogin('apple')} style={{
            flex: 1, padding: '13px', borderRadius: 16,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            transition: 'opacity 0.15s',
          }}>
            <svg width="14" height="17" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
            </svg>
            Apple
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px 32px', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: 'var(--accent)' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: 'var(--accent)' }}>Privacy Policy</span>
        </span>
      </div>
    </div>
  );
}
