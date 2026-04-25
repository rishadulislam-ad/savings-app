import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const isNative = typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || navigator.userAgent.includes('Capacitor'));


function firebaseErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/weak-password':
      return 'Password needs 6+ characters with uppercase, lowercase & a number.';
    case 'auth/email-already-in-use':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed. Please try again.';
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Please allow popups and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export default function AuthScreen() {
  const { isDark } = useTheme();
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLockUntil, setLoginLockUntil] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    // Rate limiting
    if (loginLockUntil > Date.now()) {
      const secs = Math.ceil((loginLockUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${secs}s`);
      return;
    }
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup' && !name.trim()) { setError('Please enter your name.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (mode === 'signup') {
      if (!/[A-Z]/.test(password)) { setError('Password needs at least one uppercase letter.'); return; }
      if (!/[a-z]/.test(password)) { setError('Password needs at least one lowercase letter.'); return; }
      if (!/[0-9]/.test(password)) { setError('Password needs at least one number.'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: name.trim() });
        sendEmailVerification(credential.user).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= 5) {
        setLoginLockUntil(Date.now() + 60000);
        setError('Too many failed attempts. Please wait 1 minute.');
        setLoginAttempts(0);
      } else {
        const msg = firebaseErrorMessage(err.code);
        if (msg) setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      if (isNative) {
        // Android — use native Google Sign-In plugin
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        const result = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(result.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // Web — use Firebase popup
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error('Google login error:', err);
      const msg = firebaseErrorMessage(err.code || err.message);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    setError('');
    setLoading(true);
    try {
      if (isNative) {
        const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
        const result = await SignInWithApple.authorize({
          clientId: 'com.coinova.app',
          redirectURI: 'https://coinova-2219a.firebaseapp.com/__/auth/handler',
          scopes: 'email name',
        });
        const { identityToken, givenName, familyName } = result.response;
        const credential = new OAuthProvider('apple.com').credential({
          idToken: identityToken,
          rawNonce: undefined,
        });
        const userCred = await signInWithCredential(auth, credential);
        // Apple only sends name on FIRST sign-in, so save it if present
        if ((givenName || familyName) && !userCred.user.displayName) {
          const fullName = [givenName, familyName].filter(Boolean).join(' ');
          if (fullName) await updateProfile(userCred.user, { displayName: fullName });
        }
      } else {
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        await signInWithPopup(auth, appleProvider);
      }
    } catch (err) {
      console.error('Apple login error:', err);
      if (err.message?.includes('1001') || err.code === 'ERR_SIGN_IN_CANCELLED') return; // User cancelled
      const msg = firebaseErrorMessage(err.code || err.message);
      if (msg) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setResetMsg('');
    if (!resetEmail.trim()) { setResetMsg('Enter your email'); return; }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
    } catch (_) {
      // Silently ignore errors to prevent user enumeration
    } finally {
      setResetLoading(false);
      setResetMsg('If an account exists, a reset link has been sent.');
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px 32px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 76, height: 76, borderRadius: 24,
            background: 'linear-gradient(145deg, #1A1A2E, #16213E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 16px rgba(10,108,255,0.1)',
          }}>
            <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
              <rect x="12" y="38" width="40" height="7" rx="3.5" fill="#0A6CFF" opacity="0.25"/>
              <rect x="15" y="29" width="34" height="7" rx="3.5" fill="#0A6CFF" opacity="0.45"/>
              <rect x="18" y="20" width="28" height="7" rx="3.5" fill="#0A6CFF" opacity="0.7"/>
              <rect x="21" y="11" width="22" height="7" rx="3.5" fill="#0A6CFF"/>
              <path d="M32 52V44" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M28 48L32 44L36 48" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '2px', textTransform: 'uppercase' }}>Coinova</div>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Where your money makes sense.</div>
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
              value={name} onChange={e => setName(e.target.value)} disabled={loading} />
          )}
          <input className="form-input" type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
          <input className="form-input" type="password" placeholder="Password (A-z, 0-9, min 6 chars)"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()} disabled={loading} />

          {mode === 'signup' && password.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: '6+ chars', met: password.length >= 6 },
                { label: 'A-Z', met: /[A-Z]/.test(password) },
                { label: 'a-z', met: /[a-z]/.test(password) },
                { label: '0-9', met: /[0-9]/.test(password) },
              ].map(r => (
                <span key={r.label} style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                  background: r.met ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: r.met ? 'var(--success)' : 'var(--danger)',
                }}>{r.met ? '\u2713' : '\u2717'} {r.label}</span>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 13, color: 'var(--danger)', textAlign: 'center',
              background: isDark ? 'rgba(255,90,90,0.1)' : '#FFF5F5',
              border: '1px solid ' + (isDark ? 'rgba(255,90,90,0.2)' : '#FECACA'),
              borderRadius: 10, padding: '8px 12px',
            }}>{error}</div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}>
            {loading
              ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')
            }
          </button>

          {mode === 'signin' && (
            <div onClick={() => { setShowReset(true); setResetEmail(email); setResetMsg(''); }} style={{
              textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--accent)',
              fontWeight: 600, cursor: 'pointer',
            }}>
              Forgot Password?
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Social Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleGoogleLogin} disabled={loading} style={{
            flex: 1, padding: '13px', borderRadius: 16,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            transition: 'opacity 0.15s', opacity: loading ? 0.6 : 1,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.131 17.64 11.824 17.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button onClick={handleAppleLogin} disabled={loading} style={{
            flex: 1, padding: '13px', borderRadius: 16,
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            transition: 'opacity 0.15s', opacity: loading ? 0.6 : 1,
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
          <a
            href="https://rishadulislam-ad.github.io/savings-app/terms-of-service.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >Terms of Service</a>{' '}and{' '}
          <a
            href="https://rishadulislam-ad.github.io/savings-app/privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >Privacy Policy</a>.
        </span>
      </div>

      {/* Forgot Password Sheet */}
      {showReset && (
        <div data-kb-push style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowReset(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 420, padding: '24px 20px 32px',
            borderRadius: '24px 24px 0 0', background: 'var(--surface)', animation: 'slideUp 0.3s ease both',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Reset Password</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>Enter your email to receive a password reset link.</div>

            {resetMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 600,
                background: 'rgba(16,185,129,0.1)',
                color: 'var(--success)',
              }}>{resetMsg}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="form-input" type="email" placeholder="Email address"
                value={resetEmail} onChange={e => setResetEmail(e.target.value)} disabled={resetLoading} />

              <button className="btn-primary" onClick={handleResetPassword} disabled={resetLoading} style={{ marginTop: 4, opacity: resetLoading ? 0.6 : 1 }}>
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
