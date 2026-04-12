import { useState, useEffect } from 'react';
import FeatureTip from '../../components/FeatureTip';

export default function SecuritySheet({ currentUser, onClose, hasCards = false }) {
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('');

  const [showCardsBlockModal, setShowCardsBlockModal] = useState(false);
  const lockKey = currentUser ? `coinova_app_lock_${currentUser.uid}` : null;
  const [appLockEnabled, setAppLockEnabled] = useState(() => {
    try { return lockKey ? localStorage.getItem(lockKey) === 'true' : false; } catch { return false; }
  });
  const [pinEnabled, setPinEnabled] = useState(() => {
    try { return lockKey ? !!localStorage.getItem(lockKey + '_pin') : false; } catch { return false; }
  });
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinStep, setPinStep] = useState('enter');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    try {
      import('capacitor-native-biometric').then(({ NativeBiometric }) => {
        NativeBiometric.isAvailable().then(result => {
          setBiometricAvailable(result.isAvailable);
        }).catch(() => {});
      }).catch(() => {});
    } catch {}
  }, []);

  async function toggleBiometric() {
    if (appLockEnabled) {
      // Block if this is the only security method and cards exist
      if (hasCards && !pinEnabled) {
        setShowCardsBlockModal(true);
        return;
      }
      try {
        const { NativeBiometric } = await import('capacitor-native-biometric');
        await NativeBiometric.verifyIdentity({ reason: 'Disable app lock', title: 'Coinova' });
        if (lockKey) localStorage.removeItem(lockKey);
        setAppLockEnabled(false);
      } catch {}
    } else {
      try {
        const { NativeBiometric } = await import('capacitor-native-biometric');
        await NativeBiometric.verifyIdentity({ reason: 'Enable app lock', title: 'Coinova' });
        if (lockKey) localStorage.setItem(lockKey, 'true');
        setAppLockEnabled(true);
      } catch {
        setMsg('Biometric verification failed. Please try again.');
        setMsgType('error');
      }
    }
  }

  function handlePinSave() {
    if (pinStep === 'enter') { if (pinInput.length < 4) return; setPinStep('confirm'); return; }
    if (pinInput !== pinConfirm) {
      setPinConfirm(''); setPinStep('enter'); setPinInput('');
      setMsg('PINs did not match. Try again.'); setMsgType('error'); return;
    }
    if (lockKey) {
      import('../../utils/hash.js').then(({ hashPin }) => {
        hashPin(pinInput, currentUser?.uid || '').then(hashed => {
          localStorage.setItem(lockKey + '_pin', hashed);
        });
      });
    }
    setPinEnabled(true); setShowPinSetup(false); setPinInput(''); setPinConfirm(''); setPinStep('enter');
    setMsg('PIN set successfully!'); setMsgType('success');
  }

  const [showRemovePinPrompt, setShowRemovePinPrompt] = useState(false);
  const [removePinInput, setRemovePinInput] = useState('');
  const [removePinError, setRemovePinError] = useState('');

  async function handleRemovePin() {
    if (removePinInput.length < 4) return;
    // Block if this is the only security method and cards exist
    if (hasCards && !appLockEnabled) {
      setShowRemovePinPrompt(false);
      setShowCardsBlockModal(true);
      return;
    }
    const savedPin = lockKey ? localStorage.getItem(lockKey + '_pin') : null;
    if (!savedPin) return;
    const { hashPin } = await import('../../utils/hash.js');
    const hashed = await hashPin(removePinInput, currentUser?.uid || '');
    if (hashed === savedPin) {
      localStorage.removeItem(lockKey + '_pin');
      setPinEnabled(false);
      setShowRemovePinPrompt(false);
      setRemovePinInput('');
      setRemovePinError('');
      setMsg('PIN removed successfully');
      setMsgType('success');
    } else {
      setRemovePinError('Incorrect PIN');
      setRemovePinInput('');
    }
  }

  async function handleChangePw() {
    setMsg('');
    if (!curPw || !newPw || !confirmPw) { setMsg('Fill in all fields'); setMsgType('error'); return; }
    if (newPw.length < 6) { setMsg('New password must be at least 6 characters'); setMsgType('error'); return; }
    if (newPw !== confirmPw) { setMsg('New passwords do not match'); setMsgType('error'); return; }
    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      const { auth } = await import('../../firebase');
      const user = auth.currentUser;
      if (!user || !user.email) { setMsg('Not signed in'); setMsgType('error'); return; }
      const credential = EmailAuthProvider.credential(user.email, curPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setMsg('Password changed successfully!'); setMsgType('success');
      setCurPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') setMsg('Current password is incorrect');
      else if (err.code === 'auth/weak-password') setMsg('New password is too weak');
      else setMsg('Failed to change password. Try again.');
      setMsgType('error');
    }
  }

  return (
    <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Security</div>
        <div onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {currentUser?.provider ? (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Signed in with {currentUser.provider === 'google' ? 'Google' : 'Apple'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Password is managed by your {currentUser.provider === 'google' ? 'Google' : 'Apple'} account.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Change Password</div>
            {msg && (<div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, background: msgType === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: msgType === 'success' ? 'var(--success)' : 'var(--danger)', border: `1px solid ${msgType === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>{msg}</div>)}
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Password</label><input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Enter current password" style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters" style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            <div style={{ marginBottom: 20 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm New Password</label><input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password" onKeyDown={e => e.key === 'Enter' && handleChangePw()} style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            <button onClick={handleChangePw} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Update Password</button>
          </div>
        )}
        <div className="card" style={{ padding: '0 16px', marginTop: 16 }}>
          <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>App Lock</div><div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 4 }}>Require authentication when opening Coinova</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(10,108,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Face ID / Touch ID</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{appLockEnabled ? 'Enabled' : biometricAvailable ? 'Available on this device' : 'Not available on this device'}</div></div>
            <div onClick={toggleBiometric} style={{ width: 48, height: 28, borderRadius: 14, cursor: 'pointer', flexShrink: 0, background: appLockEnabled ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.25s ease' }}><div style={{ position: 'absolute', top: 3, left: appLockEnabled ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>PIN Lock</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{pinEnabled ? '4-digit PIN is set' : 'Set a 4-digit PIN'}</div></div>
            {pinEnabled ? (<div onClick={() => { setShowRemovePinPrompt(true); setRemovePinInput(''); setRemovePinError(''); }} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', cursor: 'pointer' }}>Remove</div>) : (<div onClick={() => { setShowPinSetup(true); setPinInput(''); setPinConfirm(''); setPinStep('enter'); }} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', cursor: 'pointer' }}>Set PIN</div>)}
          </div>
        </div>
        {showPinSetup && (
          <div className="card" style={{ padding: 20, marginTop: 12, border: '1.5px solid var(--accent)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>{pinStep === 'enter' ? 'Enter a 4-digit PIN' : 'Confirm your PIN'}</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><input type="tel" pattern="[0-9]*" maxLength={4} value={pinStep === 'enter' ? pinInput : pinConfirm} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); pinStep === 'enter' ? setPinInput(v) : setPinConfirm(v); }} placeholder="• • • •" autoFocus autoComplete="off" style={{ width: 160, padding: '14px', borderRadius: 12, textAlign: 'center', background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, letterSpacing: 12, outline: 'none', boxSizing: 'border-box', WebkitTextSecurity: 'disc' }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowPinSetup(false); setPinInput(''); setPinConfirm(''); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handlePinSave} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (pinStep === 'enter' ? pinInput : pinConfirm).length < 4 ? 0.5 : 1 }}>{pinStep === 'enter' ? 'Next' : 'Confirm'}</button>
            </div>
          </div>
        )}
        {showRemovePinPrompt && (
          <div className="card" style={{ padding: 20, marginTop: 12, border: '1.5px solid var(--danger)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Remove PIN</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>Enter your current PIN to confirm removal</div>
            {removePinError && <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>{removePinError}</div>}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <input type="tel" pattern="[0-9]*" maxLength={4} value={removePinInput} autoFocus
                onChange={e => { setRemovePinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setRemovePinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleRemovePin()}
                placeholder="• • • •"
                style={{ width: 160, padding: '14px', borderRadius: 12, textAlign: 'center', background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, letterSpacing: 12, outline: 'none', boxSizing: 'border-box', WebkitTextSecurity: 'disc' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowRemovePinPrompt(false); setRemovePinInput(''); setRemovePinError(''); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleRemovePin} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: 'var(--danger)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: removePinInput.length < 4 ? 0.5 : 1 }}>Remove PIN</button>
            </div>
          </div>
        )}
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Account Info</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Email</span><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{currentUser?.email}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Auth Method</span><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{currentUser?.provider ? currentUser.provider : 'Email & Password'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Security</span><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>Firebase Auth</span></div>
        </div>
      </div>

      {/* Cards blocking security removal modal */}
      {showCardsBlockModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={() => setShowCardsBlockModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 340, padding: 24, borderRadius: 20, background: 'var(--surface)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Cannot Remove Security</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                You have saved cards in your Wallet. Security is required to protect your card details.
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 12 }}>
                To remove this security method, go to <strong style={{ color: 'var(--text-primary)' }}>Profile &gt; Cards</strong> and delete all your cards first.
              </div>
            </div>
            <button onClick={() => setShowCardsBlockModal(false)} style={{
              width: '100%', padding: 14, borderRadius: 14, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>Got It</button>
          </div>
        </div>
      )}
      <FeatureTip tipId="security" currentUser={currentUser} />
    </div>
  );
}
