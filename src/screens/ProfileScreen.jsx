import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, CURRENCIES, CATEGORIES } from '../data/transactions';
import CurrencyPicker from '../components/CurrencyPicker';
import MyFinances from './profile/MyFinances';
import ReportsSheet from './profile/ReportsSheet';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { lightTap, mediumTap, successTap, errorTap, warningTap } from '../utils/haptics';
import { saveUserData, deleteUserData, addCardToCloud, removeCardFromCloud } from '../utils/firestore';
import { todayLocal } from '../utils/date';
import { getWeekStart, setWeekStart, weekStartLabel } from '../utils/weekStart';
import { saveCardSecrets, loadCardSecrets, deleteCardSecrets, hasCardSecrets, wipeVault } from '../utils/cardVault';
import { HELP_FAQS } from './profile/helpFaqs';
import NotifSheet from './profile/NotifSheet';
import SecuritySheet from './profile/SecuritySheet';
import CategoriesTagsSheet from './profile/CategoriesTagsSheet';
import CurrencyConverterSheet from './profile/CurrencyConverterSheet';
import CardsSheet from './profile/CardsSheet';

/* ─── Profile Screen ────────────────────────────────────────── */
export default function ProfileScreen({ transactions, currentUser, onLogout, onNavigate, onAddTransaction, onUpdateUser, customCategories = [], customTags = [], onAddCustomCategory, onDeleteCustomCategory, onAddCustomTag, onDeleteCustomTag, registerBackHandler, resetKey, pendingSheet, onPendingSheetConsumed, onReplayTour }) {
  const { isDark, toggleTheme, currency, setCurrency } = useTheme();
  const [showCurrencyPicker,  setShowCurrencyPicker]  = useState(false);
  const [showConverter,       setShowConverter]        = useState(false);
  const [showCatTags,         setShowCatTags]          = useState(false);
  const [showCards,           setShowCards]            = useState(false);
  const [showFinances,        setShowFinances]         = useState(false);
  const [showReports,         setShowReports]          = useState(false);
  const [showSecurity,        setShowSecurity]         = useState(false);
  const [showHelp,            setShowHelp]             = useState(false);
  const [showNotifications,   setShowNotifications]    = useState(false);
  const [showYourData,        setShowYourData]         = useState(false);
  const [showAccount,         setShowAccount]          = useState(false);
  const [editingProfile,      setEditingProfile]       = useState(false);
  const [editName,            setEditName]             = useState('');
  const [editAvatar,          setEditAvatar]           = useState('');
  const [showWeekStartPicker, setShowWeekStartPicker]  = useState(false);
  // Live-bound to localStorage so the row label updates the moment the
  // user picks a new value. Listens to the broadcast event so any other
  // screen could (in future) change it and Profile would still mirror.
  const [weekStartValue, setWeekStartValue] = useState(() => getWeekStart(currentUser?.uid));
  useEffect(() => {
    function refresh() { setWeekStartValue(getWeekStart(currentUser?.uid)); }
    window.addEventListener('coinova-week-start-change', refresh);
    return () => window.removeEventListener('coinova-week-start-change', refresh);
  }, [currentUser?.uid]);
  const AVATARS = ['🧑‍💼','👩‍💻','👨‍🎨','👩‍🔬','🧑‍🚀','👨‍💻','👩‍🎤','🧑‍🍳','👩‍⚕️','🧑‍🎓','👨‍🔧','👩‍🏫','🧑‍💻','👸','🤴','🦸'];

  function closeAllSheets() {
    setShowCurrencyPicker(false); setShowConverter(false); setShowCatTags(false);
    setShowCards(false); setShowFinances(false); setShowReports(false);
    setShowSecurity(false); setShowHelp(false); setShowNotifications(false);
    setShowYourData(false);
  }
  function openSheet(setter) { closeAllSheets(); lightTap(); setter(true); }

  // Deep-link from HomeScreen's Insights widget: open the requested sheet
  // on mount (or whenever the parent sets a new pending sheet). Prop-based
  // instead of window-event-based so it survives the tab switch + remount —
  // the prop is already set when this component first renders.
  useEffect(() => {
    if (!pendingSheet) return;
    if (pendingSheet === 'finances')  openSheet(setShowFinances);
    else if (pendingSheet === 'reports')   openSheet(setShowReports);
    else if (pendingSheet === 'cards')     openSheet(setShowCards);
    else if (pendingSheet === 'security')  openSheet(setShowSecurity);
    if (onPendingSheetConsumed) onPendingSheetConsumed();
  }, [pendingSheet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete all data modal state
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');

  async function handleDeleteAllData() {
    if (!currentUser?.uid) return;
    errorTap();
    // Wipe Keychain-stored secrets (card-vault key + PIN hash) BEFORE clearing
    // localStorage, so we still know the uid to look up the keystore entries.
    if (currentUser?.uid) {
      try { await wipeVault(currentUser.uid); } catch {}
      try {
        const { wipePin } = await import('../utils/hash.js');
        await wipePin(currentUser.uid);
      } catch {}
    }
    // Cancel any scheduled notifications so we don't ping a wiped account.
    try {
      const { wipeAllNotifications } = await import('../utils/notificationScheduler');
      await wipeAllNotifications();
    } catch {}
    // Clear all coinova keys from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('coinova')) localStorage.removeItem(key);
    });
    // Clear Firestore document
    try {
      const { deleteUserData } = await import('../utils/firestore');
      await deleteUserData(currentUser.uid);
    } catch {}
    setShowDeleteAll(false);
    onLogout();
  }

  // Account deletion modal state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState('confirm'); // 'confirm' | 'reauth' | 'deleting'
  const [deleteAccountPw, setDeleteAccountPw] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('');

  async function handleDeleteAccount() {
    setDeleteAccountError('');
    setDeleteAccountStep('deleting');
    try {
      const { auth } = await import('../firebase');
      const user = auth.currentUser;
      if (!user) {
        setDeleteAccountError('Not signed in.');
        setDeleteAccountStep('confirm');
        return;
      }

      // Re-authenticate before destroying the account.
      //   - Email/password users: prompt for the password (handled by the
      //     reauth-step UI). Re-auth via reauthenticateWithCredential.
      //   - OAuth users (Google / Apple): no password to verify. Without
      //     friction, anyone with brief access to the unlocked phone could
      //     delete the account in two taps. Require biometric verification
      //     (Face ID / Touch ID / fingerprint). Falls back to the existing
      //     PIN modal in CardsSheet's authenticate() helper if biometric
      //     isn't available — same pattern used to gate card-vault reveals.
      if (deleteAccountPw && user.email) {
        const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
        const credential = EmailAuthProvider.credential(user.email, deleteAccountPw);
        await reauthenticateWithCredential(user, credential);
      } else {
        // OAuth user — require biometric or PIN. If neither is set up on
        // this device, we still proceed (we can't lock the user out of
        // their own account-delete entirely just because they never set
        // up a lock), but at least if they DO have a lock, we honour it.
        const lockKey = `coinova_app_lock_${user.uid}`;
        const biometricEnabled = localStorage.getItem(lockKey) === 'true';
        const { hasPin } = await import('../utils/hash.js');
        const pinSet = await hasPin(user.uid);
        if (biometricEnabled || pinSet) {
          let verified = false;
          if (biometricEnabled) {
            try {
              const { NativeBiometric } = await import('capacitor-native-biometric');
              await NativeBiometric.verifyIdentity({
                reason: 'Verify to delete your account',
                title: 'Delete Coinova account',
              });
              verified = true;
            } catch { /* fall through to PIN if available */ }
          }
          if (!verified && pinSet) {
            const enteredPin = window.prompt('Enter your PIN to confirm account deletion:');
            if (!enteredPin) {
              setDeleteAccountError('Cancelled.');
              setDeleteAccountStep('confirm');
              return;
            }
            const { verifyPin } = await import('../utils/hash.js');
            const savedPin = localStorage.getItem(`${lockKey}_pin`);
            verified = await verifyPin(enteredPin, user.uid, savedPin);
            if (!verified) {
              setDeleteAccountError('Incorrect PIN. Account not deleted.');
              setDeleteAccountStep('confirm');
              return;
            }
          }
          if (!verified) {
            setDeleteAccountError('Verification failed. Account not deleted.');
            setDeleteAccountStep('confirm');
            return;
          }
        }
      }

      // 1. Delete the Firestore document
      try {
        await deleteUserData(user.uid);
      } catch (err) {
        console.warn('[DeleteAccount] Firestore deletion failed:', err);
        // Continue anyway — we'd rather orphan a Firestore doc than leave a
        // Firebase Auth account behind that the user can't sign back into.
      }

      // 2. Wipe all local data for this user, including the OS-keystore
      //    entries (card-vault key + PIN hash) and scheduled notifications.
      try { await wipeVault(user.uid); } catch {}
      try {
        const { wipePin } = await import('../utils/hash.js');
        await wipePin(user.uid);
      } catch {}
      try {
        const { wipeAllNotifications } = await import('../utils/notificationScheduler');
        await wipeAllNotifications();
      } catch {}
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('coinova_') || (currentUser?.email && key.includes(currentUser.email))) {
            localStorage.removeItem(key);
          }
        });
      } catch {}

      // 3. Delete the Firebase Auth account itself
      await user.delete();

      // 4. Sign out and reset app state
      successTap();
      onLogout();
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteAccountError('Incorrect password.');
        setDeleteAccountStep('reauth');
      } else if (err.code === 'auth/requires-recent-login') {
        setDeleteAccountError('For security, please sign out and sign in again, then try deleting your account.');
        setDeleteAccountStep('confirm');
      } else {
        setDeleteAccountError('Could not delete account. Please try again.');
        setDeleteAccountStep('confirm');
      }
    }
  }

  // Close all sheets when profile tab is re-tapped
  useEffect(() => {
    if (resetKey > 0) {
      setShowCurrencyPicker(false); setShowConverter(false); setShowCatTags(false);
      setShowCards(false); setShowFinances(false); setShowReports(false);
      setShowSecurity(false); setShowHelp(false); setShowNotifications(false);
      setShowYourData(false); setEditingProfile(false);
    }
  }, [resetKey]);

  const [cards, setCards] = useState(() => {
    try {
      if (!currentUser) return [];
      const saved = localStorage.getItem(`coinova_cards_${currentUser.uid}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist cards to localStorage on every change. NOTE: cards are NOT pushed
  // to Firestore here — they sync via atomic arrayUnion/arrayRemove operations
  // inside addCard/deleteCard. Bundling them in saveUserData would replace
  // the entire `cards` array on every change and race against concurrent
  // updates from another device (last-write-wins would silently drop cards).
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`coinova_cards_${currentUser.uid}`, JSON.stringify(cards));
    }
  }, [cards, currentUser]);

  // Re-read cards from localStorage on the initial Firestore sync after sign-in
  // (loadUserData populates localStorage with the cloud's cards on app open).
  // The realtime subscription deliberately does NOT touch cards (see App.jsx),
  // so this handler effectively only fires once per session — picking up
  // changes made on other devices since the last app open.
  useEffect(() => {
    function handleSync() {
      if (!currentUser?.uid) return;
      try {
        const saved = localStorage.getItem(`coinova_cards_${currentUser.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setCards(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
        }
      } catch {}
    }
    window.addEventListener('coinova-data-sync', handleSync);
    return () => window.removeEventListener('coinova-data-sync', handleSync);
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!registerBackHandler) return;
    registerBackHandler(() => {
      if (showAccount)         { setShowAccount(false); return true; }
      if (showYourData)        { setShowYourData(false); return true; }
      if (showHelp)            { setShowHelp(false); return true; }
      if (showNotifications)   { setShowNotifications(false); return true; }
      if (showSecurity)        { setShowSecurity(false); return true; }
      if (showReports)         { setShowReports(false); return true; }
      if (showFinances)        { setShowFinances(false); return true; }
      if (showCards)           { setShowCards(false); return true; }
      if (showCatTags)         { setShowCatTags(false); return true; }
      if (showConverter)       { setShowConverter(false); return true; }
      if (showCurrencyPicker)  { setShowCurrencyPicker(false); return true; }
      if (showWeekStartPicker) { setShowWeekStartPicker(false); return true; }
      if (editingProfile)      { setEditingProfile(false); return true; }
      return false;
    });
    return () => registerBackHandler(null);
  }, [showCurrencyPicker, showConverter, showCatTags, showCards, showFinances, showReports, showSecurity, showHelp, showNotifications, showYourData, showAccount, editingProfile, showWeekStartPicker, registerBackHandler]);

  // Card mutations use Firestore's atomic array operations (arrayUnion /
  // arrayRemove). These are race-free across devices: concurrent adds and
  // deletes from multiple devices merge correctly server-side, and our own
  // local cache reflects the change synchronously, so the realtime
  // subscription never delivers stale data that would undo the change.
  function addCard(card) {
    setCards(prev => [...prev, card]);
    if (currentUser?.uid) {
      addCardToCloud(currentUser.uid, card);
    }
  }
  function deleteCard(id) {
    const card = cards.find(c => c.id === id);
    setCards(prev => prev.filter(c => c.id !== id));
    if (currentUser?.uid) {
      if (card) removeCardFromCloud(currentUser.uid, card);
      try { deleteCardSecrets(currentUser.uid, id); } catch {}
    }
  }

  const totalIncome  = transactions.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const selectedCur = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Profile</div>
      </div>

      <div className="screen-content" style={{ padding: '20px' }}>
        {/* Avatar + Info */}
        <div className="card anim-fadeup" style={{ padding: '24px', textAlign: 'center', marginBottom: 16, position: 'relative' }}>
          {/* Edit button */}
          <div onClick={() => {
            if (editingProfile) {
              // Save
              if (onUpdateUser) {
                const updates = {};
                if (editName.trim() && editName.trim() !== currentUser?.name) updates.name = editName.trim();
                if (editAvatar && editAvatar !== currentUser?.avatar) updates.avatar = editAvatar;
                if (Object.keys(updates).length > 0) onUpdateUser(updates);
              }
              setEditingProfile(false);
            } else {
              setEditName(currentUser?.name || '');
              setEditAvatar(currentUser?.avatar || '🧑‍💼');
              setEditingProfile(true);
            }
          }} style={{
            position: 'absolute', top: 14, right: 14, padding: '4px 12px', borderRadius: 8, cursor: 'pointer',
            fontSize: 11, fontWeight: 700, transition: 'all 0.2s ease',
            background: editingProfile ? 'var(--accent)' : 'var(--accent-light)',
            color: editingProfile ? '#fff' : 'var(--accent)',
          }}>
            {editingProfile ? 'Save' : 'Edit'}
          </div>

          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', position: 'relative',
            border: editingProfile ? '3px solid var(--accent)' : '3px solid rgba(102,126,234,0.3)',
            transition: 'border 0.2s ease',
          }}>
            <span style={{ fontSize: 40 }}>{editingProfile ? editAvatar : (currentUser?.avatar || '🧑‍💼')}</span>
          </div>

          {editingProfile ? (
            <>
              {/* Avatar picker */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                {AVATARS.map((a, i) => (
                  <div key={i} onClick={() => setEditAvatar(a)} style={{
                    width: 38, height: 38, borderRadius: '50%', fontSize: 18,
                    background: editAvatar === a ? 'var(--accent)' : 'var(--surface2)',
                    border: editAvatar === a ? '2px solid var(--accent)' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}>{a}</div>
                ))}
              </div>
              {/* Name input */}
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name" style={{
                width: '100%', maxWidth: 240, padding: '10px 14px', borderRadius: 12, textAlign: 'center',
                background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)',
                fontSize: 16, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
              }} />
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{currentUser?.email || ''}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{currentUser?.name || 'User'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{currentUser?.email || ''}</div>
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 0, alignItems: 'center', marginTop: 16 }}>
            <div style={{ textAlign: 'center', overflow: 'hidden', padding: '0 4px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(totalIncome, currency)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Income</div>
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', overflow: 'hidden', padding: '0 4px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--danger)', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCurrency(totalExpense, currency)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Spent</div>
            </div>
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center', padding: '0 4px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-0.5px' }}>{transactions.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500, marginTop: 2 }}>Records</div>
            </div>
          </div>
        </div>

        {/* Settings Label */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Settings
        </div>

        <div className="card anim-fadeup" style={{ padding: '0 16px', marginBottom: 16, animationDelay: '0.06s' }}>

          {/* My Finances */}
          <div onClick={() => openSheet(setShowFinances)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>My Finances</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>AI health score, insights & trends</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Reports */}
          <div onClick={() => openSheet(setShowReports)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(139,92,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Reports</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Monthly & yearly summaries</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Dark Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: isDark ? 'rgba(61,142,255,0.15)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D8EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Appearance</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{isDark ? 'Dark mode' : 'Light mode'}</div>
            </div>
            <div onClick={() => { mediumTap(); toggleTheme(); }} style={{ width: 48, height: 28, borderRadius: 14, cursor: 'pointer', background: isDark ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.25s ease', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: isDark ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)' }} />
            </div>
          </div>

          {/* Currency Row */}
          <div onClick={() => { lightTap(); setShowCurrencyPicker(true); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {selectedCur.flag}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Currency</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{selectedCur.code} · {selectedCur.name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '3px 8px', borderRadius: 8 }}>
                {selectedCur.symbol}
              </span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Week Starts On Row */}
          <div onClick={() => { lightTap(); setShowWeekStartPicker(true); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Week starts on</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Affects “This Week” filters &amp; weekly summary</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '3px 8px', borderRadius: 8 }}>
                {weekStartLabel(weekStartValue)}
              </span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Currency Converter Row */}
          <div onClick={() => openSheet(setShowConverter)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Currency Converter</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Live exchange rates</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 7px', borderRadius: 6 }}>LIVE</span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Travel Tracker Row */}
          <div onClick={() => onNavigate?.('travel')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Travel Tracker</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Track spending per trip & country</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', padding: '3px 7px', borderRadius: 6 }}>NEW</span>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Cards Row */}
          <div onClick={() => openSheet(setShowCards)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: isDark ? 'linear-gradient(135deg, #302B63, #24243e)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#a78bfa' : '#6366F1'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="3"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Cards</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>
                {cards.length === 0 ? 'No cards saved' : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} saved`}
              </div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* Notifications */}
          <div onClick={() => openSheet(setShowNotifications)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Reminders & alerts</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Security */}
          <div onClick={() => openSheet(setShowSecurity)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Security</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Password, Face ID, PIN</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Your Data Row */}
          <div onClick={() => { lightTap(); setShowYourData(true); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 002-2V7.5L14.5 2H6a2 2 0 00-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="M9 18l3-3-3-3"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Your Data</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Categories, tags, backup & restore</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Help & Support */}
          <div onClick={() => openSheet(setShowHelp)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Help & Support</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>FAQ & contact</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Rate Coinova — open the platform's store listing directly.
              The previous version showed an in-app sheet first; users
              expected this to take them straight to the App Store / Play
              Store, which is the standard pattern. */}
          <div onClick={async () => {
            lightTap();
            const isIOS = Capacitor?.getPlatform?.() === 'ios';
            const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
            const url = (isIOS || /iphone|ipad|ipod/i.test(ua))
              ? 'https://apps.apple.com/us/app/coinova/id6762043129'
              : 'https://play.google.com/store/apps/details?id=com.coinova.app';
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.open({ url });
            } catch {
              try { window.open(url, '_blank'); } catch {}
            }
          }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Rate Coinova</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>Love the app? Let us know!</div>
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          {/* Terms & Privacy */}
          {[
            { label: 'Terms of Service', sub: 'Usage terms and conditions', url: 'https://rishadulislam-ad.github.io/savings-app/terms-of-service.html', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
            { label: 'Privacy Policy', sub: 'How your data is handled', url: 'https://rishadulislam-ad.github.io/savings-app/privacy-policy.html', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
          ].map((item, i) => (
            <div key={i} onClick={async () => {
              lightTap();
              try {
                const { Browser } = await import('@capacitor/browser');
                await Browser.open({ url: item.url });
              } catch {
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }
            }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', cursor: 'pointer', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(107,114,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 1 }}>{item.sub}</div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>

        {/* Sign Out */}
        <button onClick={() => { warningTap(); onLogout(); }} style={{ width: '100%', padding: '14px', background: isDark ? 'rgba(255,90,90,0.1)' : '#FFF0F0', border: `1.5px solid ${isDark ? 'rgba(255,90,90,0.25)' : '#FECACA'}`, borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Sign Out
        </button>

        {/* Delete All Data */}
        <button onClick={() => { warningTap(); setShowDeleteAll(true); setDeleteAllConfirm(''); }} style={{ width: '100%', padding: '14px', marginTop: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Delete All Data & Reset
        </button>

        {/* Delete Account — permanently removes Firebase auth account + cloud data */}
        <button onClick={() => {
          warningTap();
          setDeleteAccountStep('confirm');
          setDeleteAccountConfirmText('');
          setDeleteAccountPw('');
          setDeleteAccountError('');
          setShowDeleteAccount(true);
        }} style={{ width: '100%', padding: '14px', marginTop: 10, background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Delete My Account
        </button>

        {/* Add bottom margin so the floating BottomNav + FAB don't cover
            this. The FAB sits above the nav and pokes ~28px higher than
            the nav strip itself, so we need roughly nav-height (62px) +
            FAB overflow (32px) + safe-area + breathing room. */}
        <div style={{
          textAlign: 'center',
          marginTop: 16,
          marginBottom: 'calc(120px + env(safe-area-inset-bottom))',
          fontSize: 12,
          color: 'var(--text-tertiary)',
        }}>
          Coinova v1.2.1 · Made with ❤️
        </div>
      </div>

      {/* Delete All Data Modal */}
      {showDeleteAll && (
        <div onClick={() => setShowDeleteAll(false)} data-kb-push style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 360, padding: 24, borderRadius: 24,
            background: 'var(--surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Delete All Data</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                This will permanently delete all your transactions, budgets, cards, savings goals, and settings from this device and the cloud. You will be signed out.
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Type DELETE to confirm:</div>
            <input
              type="text" value={deleteAllConfirm} autoFocus
              onChange={e => setDeleteAllConfirm(e.target.value)}
              placeholder="DELETE"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                background: 'var(--surface2)', border: '1.5px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 15, fontWeight: 700,
                textAlign: 'center', letterSpacing: 2, outline: 'none', boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteAll(false)} style={{
                flex: 1, padding: 14, borderRadius: 14,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={() => deleteAllConfirm === 'DELETE' && handleDeleteAllData()}
                disabled={deleteAllConfirm !== 'DELETE'}
                style={{
                  flex: 1, padding: 14, borderRadius: 14, border: 'none',
                  background: deleteAllConfirm === 'DELETE' ? 'var(--danger)' : 'var(--surface2)',
                  color: deleteAllConfirm === 'DELETE' ? '#fff' : 'var(--text-tertiary)',
                  fontSize: 14, fontWeight: 700,
                  cursor: deleteAllConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                }}>Delete Everything</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div data-kb-push onClick={() => deleteAccountStep !== 'deleting' && setShowDeleteAccount(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease both',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'calc(100% - 48px)', maxWidth: 360, background: 'var(--surface)',
            borderRadius: 24, padding: '28px 24px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          }}>
            {deleteAccountStep === 'confirm' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28 }}>⚠️</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Delete Your Account?</div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                    This permanently deletes your account, all your transactions, budgets, cards, savings goals, and settings. This <strong>cannot</strong> be undone.
                  </div>
                </div>
                {deleteAccountError && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {deleteAccountError}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Type <span style={{ color: 'var(--danger)' }}>DELETE</span> to confirm
                </div>
                <input
                  type="text"
                  value={deleteAccountConfirmText}
                  onChange={e => setDeleteAccountConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    background: 'var(--surface2)', border: '1.5px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', marginBottom: 18,
                    fontWeight: 700, letterSpacing: '0.1em',
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowDeleteAccount(false)} style={{
                    flex: 1, padding: 14, borderRadius: 14,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>Cancel</button>
                  <button
                    onClick={() => {
                      if (deleteAccountConfirmText !== 'DELETE') return;
                      // For email/password users, ask for password. For social users, skip to deletion.
                      if (currentUser?.provider) {
                        handleDeleteAccount();
                      } else {
                        setDeleteAccountStep('reauth');
                      }
                    }}
                    disabled={deleteAccountConfirmText !== 'DELETE'}
                    style={{
                      flex: 1, padding: 14, borderRadius: 14, border: 'none',
                      background: deleteAccountConfirmText === 'DELETE' ? 'var(--danger)' : 'var(--surface2)',
                      color: deleteAccountConfirmText === 'DELETE' ? '#fff' : 'var(--text-tertiary)',
                      fontSize: 14, fontWeight: 700,
                      cursor: deleteAccountConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >Continue</button>
                </div>
              </>
            )}

            {deleteAccountStep === 'reauth' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔐</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Confirm with Password</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    Enter your password to permanently delete your account.
                  </div>
                </div>
                {deleteAccountError && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 12, fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {deleteAccountError}
                  </div>
                )}
                <input
                  type="password"
                  value={deleteAccountPw}
                  onChange={e => { setDeleteAccountPw(e.target.value); setDeleteAccountError(''); }}
                  onKeyDown={e => e.key === 'Enter' && deleteAccountPw && handleDeleteAccount()}
                  placeholder="Your password"
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 12,
                    background: 'var(--surface2)', border: '1.5px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', marginBottom: 18,
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowDeleteAccount(false)} style={{
                    flex: 1, padding: 14, borderRadius: 14,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>Cancel</button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={!deleteAccountPw}
                    style={{
                      flex: 1, padding: 14, borderRadius: 14, border: 'none',
                      background: deleteAccountPw ? 'var(--danger)' : 'var(--surface2)',
                      color: deleteAccountPw ? '#fff' : 'var(--text-tertiary)',
                      fontSize: 14, fontWeight: 700,
                      cursor: deleteAccountPw ? 'pointer' : 'not-allowed',
                      transition: 'all 0.15s',
                    }}
                  >Delete Account</button>
                </div>
              </>
            )}

            {deleteAccountStep === 'deleting' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Deleting your account…</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Removing all data and signing you out.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards Sheet */}
      {showCards && (
        <CardsSheet
          onClose={() => setShowCards(false)}
          cards={cards}
          onAddCard={addCard}
          onDeleteCard={deleteCard}
          currentUser={currentUser}
          onOpenSecurity={() => { setShowCards(false); setTimeout(() => setShowSecurity(true), 300); }}
        />
      )}

      {/* Currency Picker Sheet */}
      {showCurrencyPicker && (
        <CurrencyPicker selected={currency} onSelect={setCurrency} onClose={() => setShowCurrencyPicker(false)} />
      )}

      {/* Week-Start Picker Sheet — Sun / Mon / Sat options. Country preference
          comes from device locale on first launch; this sheet just lets the
          user override it.
          Uses .sheet-overlay so the global rule in index.css hides the
          BottomNav while open (otherwise the FAB + nav bar bleed through
          and clip the sheet). maxHeight + overflowY keeps the content
          scrollable on small devices, and the bottom padding adds the
          iPhone home-indicator safe area. */}
      {showWeekStartPicker && (
        <div className="sheet-overlay" onClick={() => setShowWeekStartPicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 950, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease both' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%',
            background: 'var(--surface)',
            borderRadius: '22px 22px 0 0',
            padding: '12px 20px calc(28px + env(safe-area-inset-bottom))',
            maxHeight: '85dvh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: 4 }}>Week starts on</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16 }}>
              Used by the “This Week” filter on Home &amp; Transactions, and by the weekly summary notification.
            </div>
            {[
              { v: 0, label: 'Sunday',   sub: 'US, Canada, Japan, India, Brazil…' },
              { v: 1, label: 'Monday',   sub: 'UK, Europe, Russia, China, Australia…' },
              { v: 6, label: 'Saturday', sub: 'Saudi Arabia, UAE, Egypt, Qatar…' },
            ].map(opt => {
              const isSel = weekStartValue === opt.v;
              return (
                <div
                  key={opt.v}
                  onClick={() => {
                    successTap();
                    setWeekStart(currentUser?.uid, opt.v);
                    setWeekStartValue(opt.v);
                    setShowWeekStartPicker(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 14px',
                    borderRadius: 12,
                    background: isSel ? 'var(--accent-light)' : 'var(--surface2)',
                    border: `1.5px solid ${isSel ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: 8,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{opt.sub}</div>
                  </div>
                  {isSel && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Currency Converter Sheet */}
      {showConverter && (
        <CurrencyConverterSheet
          onClose={() => setShowConverter(false)}
          defaultCurrency={currency}
          onAddTransaction={onAddTransaction}
          currentUser={currentUser}
        />
      )}

      {/* Categories & Tags Sheet */}
      {showCatTags && (
        <CategoriesTagsSheet
          onClose={() => setShowCatTags(false)}
          customCategories={customCategories}
          customTags={customTags}
          onAddCustomCategory={onAddCustomCategory}
          onDeleteCustomCategory={onDeleteCustomCategory}
          onAddCustomTag={onAddCustomTag}
          onDeleteCustomTag={onDeleteCustomTag}
        />
      )}

      {/* My Finances */}
      {showFinances && (
        <MyFinances
          onClose={() => setShowFinances(false)}
          transactions={transactions}
          currentUser={currentUser}
          currency={currency}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* Reports */}
      {showReports && (
        <ReportsSheet
          onClose={() => setShowReports(false)}
          transactions={transactions}
          currency={currency}
        />
      )}

      {/* Security Sheet */}
      {showSecurity && (
        <SecuritySheet currentUser={currentUser} onClose={() => setShowSecurity(false)} hasCards={cards.length > 0} />
      )}

      {/* Help & Support Sheet */}
      {showHelp && (
        <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Help & Support</div>
            <div onClick={() => setShowHelp(false)} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            {/* Replay Tour */}
            {onReplayTour && (
              <div onClick={() => { lightTap(); setShowHelp(false); onReplayTour(); }} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: 'rgba(79,110,247,0.08)', border: '1.5px solid rgba(79,110,247,0.15)',
                borderRadius: 14, marginBottom: 18, cursor: 'pointer',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,110,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>Replay App Tour</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>See the walkthrough again</div>
                </div>
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}

            {/* Feature Guide */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Feature Guide
            </div>
            <div className="card" style={{ padding: '0 16px', marginBottom: 20 }}>
              {[
                { icon: '🏠', title: 'Home Dashboard', desc: 'Balance overview, spending breakdown, insights, and heatmap', color: '#0A6CFF' },
                { icon: '📋', title: 'Transactions', desc: 'Search, filter, export CSV, edit, and delete entries', color: '#10B981' },
                { icon: '📊', title: 'Monthly Budgets', desc: 'Per-month category limits with ← → navigation', color: '#F59E0B' },
                { icon: '🎯', title: 'Savings Goals', desc: 'Targets, deadlines, deposits, milestones, and archive', color: '#8B5CF6' },
                { icon: '🧠', title: 'AI Financial Health', desc: 'Health score, AI insights, spending predictions', color: '#06B6D4' },
                { icon: '💳', title: 'Secure Wallet', desc: 'AES-256 encrypted cards with Face ID / PIN protection', color: '#EC4899' },
                { icon: '✈️', title: 'Travel Tracker', desc: 'Trip books with local currency budgets and expenses', color: '#3B82F6' },
                { icon: '💱', title: 'Currency Converter', desc: 'Live rates for 150+ currencies with offline caching', color: '#F97316' },
                { icon: '🔐', title: 'App Security', desc: 'Face ID, Touch ID, PIN lock, exponential lockout', color: '#EF4444' },
                { icon: '☁️', title: 'Cloud Sync', desc: 'Real-time sync across all your devices via Firebase', color: '#14B8A6' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Frequently Asked Questions
            </div>
            <div className="card" style={{ padding: '0 16px', marginBottom: 20 }}>
              {HELP_FAQS.map((faq, i) => (
                <details key={i} style={{ borderBottom: i < HELP_FAQS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <summary style={{ padding: '14px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {faq.q}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: 8 }}>
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </summary>
                  <div style={{ padding: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>

            {/* Contact */}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Contact Us
            </div>
            <div className="card" style={{ padding: 16 }}>
              <a href="mailto:hello@advergemedia.com" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(10,108,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Email Support</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>hello@advergemedia.com</div>
                </div>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>App Version</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>Coinova v1.2.1</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Sheet */}
      {showNotifications && (
        <NotifSheet currentUser={currentUser} isDark={isDark} onClose={() => setShowNotifications(false)} />
      )}

      {/* Your Data Sheet */}
      {showYourData && (
        <div className="sheet-slide-in" style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
          <div className="safe-top" style={{ padding: '0 20px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Your Data</div>
            <button onClick={() => setShowYourData(false)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {/* Categories & Tags */}
            <div onClick={() => { lightTap(); setShowYourData(false); setTimeout(() => setShowCatTags(true), 100); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Categories & Tags</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {customCategories.length} custom {customCategories.length === 1 ? 'category' : 'categories'} · {customTags.length} custom {customTags.length === 1 ? 'tag' : 'tags'}
                </div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>

            {/* Backup Data */}
            <div onClick={async () => {
              lightTap();
              if (!currentUser) return;
              const uid = currentUser.uid;
              const data = {
                version: 2,
                exportDate: new Date().toISOString(),
                user: { name: currentUser.name, email: currentUser.email, avatar: currentUser.avatar },
                transactions,
                savingsGoals: JSON.parse(localStorage.getItem(`coinova_savings_goals_${uid}`) || '[]'),
                cards: JSON.parse(localStorage.getItem(`coinova_cards_${uid}`) || '[]'),
                budgets: JSON.parse(localStorage.getItem(`coinova_budgets_${uid}`) || '{}'),
                trips: JSON.parse(localStorage.getItem(`coinova_trips_${uid}`) || '[]'),
                currency: localStorage.getItem(`coinova-currency-${uid}`) || 'USD',
                customCategories,
                customTags,
              };
              let jsonStr = JSON.stringify(data, null, 2);
              // Optional encryption — prompt for a passphrase. Empty/cancelled
               // means plaintext (current behavior); a typed passphrase wraps
               // the plaintext in PBKDF2(200k)+AES-GCM-256. Anyone with the
               // exported file but not the passphrase gets opaque ciphertext.
              const passphrase = window.prompt('Encrypt this backup with a password?\n\nLeave empty to export as plain JSON, or enter a strong password to encrypt.\n\nIMPORTANT: if you forget this password, the backup CANNOT be recovered.');
              let isEncrypted = false;
              if (passphrase && passphrase.length >= 6) {
                try {
                  const { encryptBackup } = await import('../utils/backupCrypto');
                  jsonStr = await encryptBackup(jsonStr, passphrase);
                  isEncrypted = true;
                } catch (err) {
                  alert('Encryption failed. Backup not created.');
                  return;
                }
              } else if (passphrase && passphrase.length > 0 && passphrase.length < 6) {
                alert('Password too short — must be at least 6 characters. Backup not created.');
                return;
              }
              const fileExt = isEncrypted ? '.json.enc' : '.json';
              const fileName = `coinova-backup-${todayLocal()}${fileExt}`;
              try {
                const result = await Filesystem.writeFile({
                  path: fileName,
                  data: btoa(new TextEncoder().encode(jsonStr).reduce((s, b) => s + String.fromCharCode(b), '')),
                  directory: Directory.Cache,
                });
                await Share.share({ title: isEncrypted ? 'Coinova Backup (encrypted)' : 'Coinova Backup', url: result.uri });
                successTap();
              } catch {
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = fileName; a.click();
                URL.revokeObjectURL(url);
                successTap();
              }
            }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, marginBottom: 10, cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(10,108,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Backup Data</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Export all data as JSON file</div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>

            {/* Restore Data */}
            <div onClick={() => { lightTap(); document.getElementById('restore-file-input-yd')?.click(); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Restore Data</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Import from a backup file</div>
              </div>
              <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1L6 6L1 11" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <input id="restore-file-input-yd" type="file" accept=".json,.enc" style={{ display: 'none' }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file || !currentUser) return;
              if (file.size > 5 * 1024 * 1024) { alert('Backup file too large (max 5MB)'); e.target.value = ''; return; }
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  let parsed = JSON.parse(reader.result);
                  // If this is an encrypted backup wrapper, prompt for the
                  // passphrase and decrypt before treating as a normal backup.
                  const { isEncryptedBackup, decryptBackup } = await import('../utils/backupCrypto');
                  if (isEncryptedBackup(parsed)) {
                    const passphrase = window.prompt('This backup is encrypted. Enter the password used when it was created:');
                    if (!passphrase) { e.target.value = ''; return; }
                    try {
                      const plaintext = await decryptBackup(parsed, passphrase);
                      parsed = JSON.parse(plaintext);
                    } catch {
                      alert('Wrong password, or the backup file has been modified.');
                      e.target.value = '';
                      return;
                    }
                  }
                  const data = parsed;
                  if (!data.version || typeof data.version !== 'number') { alert('Invalid backup file format'); return; }
                  if (!Array.isArray(data.transactions)) { alert('Invalid backup: transactions must be an array'); return; }
                  // Caps below MUST match the Firestore rule limits in
                  // firestore.rules — otherwise restored data exceeds the
                  // server-side allowlist and silently fails to sync to
                  // other devices, leaving the user with local-only data.
                  // Rule caps: tx<=10000, cards<=50, goals<=100, trips<=500,
                  // customCategories<=500, customTags<=500.
                  if (data.transactions.length > 10000) {
                    alert('Backup contains too many transactions (max 10,000). Older entries will be skipped.');
                  }
                  const validTxAll = data.transactions.filter(t =>
                    t && typeof t === 'object' &&
                    typeof t.amount === 'number' && isFinite(t.amount) && t.amount >= 0 &&
                    ['income', 'expense'].includes(t.type) &&
                    typeof t.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
                    typeof t.category === 'string' && t.category.length <= 100
                  );
                  // Newest first, then take the most recent 10000 — matches
                  // the user's likely intent if they're at the cap.
                  validTxAll.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                  const validTx = validTxAll.slice(0, 10000);
                  if (validTx.length === 0 && data.transactions.length > 0) { alert('No valid transactions found in backup'); return; }
                  const validCats = Array.isArray(data.customCategories) ? data.customCategories.filter(c => c && typeof c.id === 'string' && typeof c.label === 'string' && c.label.length <= 50).slice(0, 500) : [];
                  const validTags = Array.isArray(data.customTags) ? data.customTags.filter(t => typeof t === 'string' && t.length <= 50).slice(0, 500) : [];
                  const validGoals = Array.isArray(data.savingsGoals) ? data.savingsGoals.filter(g => g && typeof g.label === 'string' && typeof g.target === 'number').slice(0, 100) : [];
                  const validCards = Array.isArray(data.cards) ? data.cards.filter(c => c && typeof c.id === 'string' && typeof c.last4 === 'string').slice(0, 50) : [];
                  const validTrips = Array.isArray(data.trips) ? data.trips.filter(t => t && typeof t.id === 'string' && typeof t.name === 'string').slice(0, 500) : [];
                  const validBudgets = (data.budgets && typeof data.budgets === 'object' && !Array.isArray(data.budgets)) ? data.budgets : {};
                  const validCurrency = (typeof data.currency === 'string' && data.currency.length === 3) ? data.currency : null;

                  if (!confirm(`Restore from ${data.exportDate?.slice(0, 10) || 'backup'}?\n\n${validTx.length} transactions, ${validGoals.length} goals, ${validCards.length} cards, ${validTrips.length} trips\n\nThis will replace ALL your current data.`)) return;

                  const uid = currentUser.uid;
                  localStorage.setItem(`coinova_transactions_${uid}`, JSON.stringify(validTx));
                  localStorage.setItem(`coinova_savings_goals_${uid}`, JSON.stringify(validGoals));
                  localStorage.setItem(`coinova_user_cats_${uid}`, JSON.stringify(validCats));
                  localStorage.setItem(`coinova_user_tags_${uid}`, JSON.stringify(validTags));
                  localStorage.setItem(`coinova_cards_${uid}`, JSON.stringify(validCards));
                  localStorage.setItem(`coinova_budgets_${uid}`, JSON.stringify(validBudgets));
                  localStorage.setItem(`coinova_trips_${uid}`, JSON.stringify(validTrips));
                  if (validCurrency) localStorage.setItem(`coinova-currency-${uid}`, validCurrency);
                  window.location.reload();
                } catch { alert('Failed to read backup file'); }
              };
              reader.readAsText(file);
              e.target.value = '';
            }} />
          </div>
        </div>
      )}

    </div>
  );
}
