import { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { safeGetJSON, safeSetJSON, uuid } from './utils/storage';
import { loadUserData, saveUserData, subscribeToUserData } from './utils/firestore';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import BudgetsScreen from './screens/BudgetsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import TravelTrackerScreen from './screens/TravelTrackerScreen';
import OnboardingTour, { HOME_TOUR_STEPS } from './components/OnboardingTour';

function AppInner() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [profileResetKey, setProfileResetKey] = useState(0);
  const [showTour, setShowTour] = useState(false);

  function handleTabChange(tab) {
    if (tab === activeTab && tab === 'profile') {
      setProfileResetKey(k => k + 1);
    }
    setActiveTab(tab);
  }
  const [showAdd, setShowAdd] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [datePeriod, setDatePeriod] = useState('month');
  const [appLocked, setAppLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Back button ref for screen-level back handling
  const screenBackHandler = useRef(null);
  // Only save to Firestore when a LOCAL change happened on this device.
  // Cloud loads and subscription updates do NOT set this flag.
  const hasLocalChange = useRef(false);
  const registerBackHandler = useCallback((handler) => {
    screenBackHandler.current = handler;
  }, []);

  // Firebase auth state — replaces localStorage session
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          avatar: null,
          provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google'
                   : firebaseUser.providerData[0]?.providerId === 'apple.com' ? 'apple' : null,
        };
        // Load persisted avatar
        const savedAvatar = safeGetJSON(`coinova_avatar_${firebaseUser.uid}`);
        if (savedAvatar) user.avatar = savedAvatar;
        setCurrentUser(user);

        // Show tour for first-time users
        const tourDone = safeGetJSON(`coinova_tour_complete_${firebaseUser.uid}`);
        if (!tourDone) {
          setTimeout(() => setShowTour(true), 800);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
      // For logged-out users, hide splash now (show login screen).
      // For logged-in users, splash stays until data loads.
      if (!firebaseUser) SplashScreen.hide().catch(() => {});
    });
    return () => unsub();
  }, []);

  // Handle iOS Google redirect result on app startup
  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
  }, []);

  // Check app lock on startup
  useEffect(() => {
    if (!currentUser?.uid) return;
    const lockEnabled = localStorage.getItem(`coinova_app_lock_${currentUser.uid}`) === 'true';
    const pinSet = !!localStorage.getItem(`coinova_app_lock_${currentUser.uid}_pin`);
    if (!lockEnabled && !pinSet) return;

    setAppLocked(true);

    // Try biometric first
    if (lockEnabled) {
      import('capacitor-native-biometric').then(({ NativeBiometric }) => {
        NativeBiometric.verifyIdentity({ reason: 'Unlock Coinova', title: 'Coinova' })
          .then(() => setAppLocked(false))
          .catch(() => { /* Stay locked — user can enter PIN */ });
      }).catch(() => { /* Plugin not available — use PIN */ });
    }
  }, [currentUser?.uid]);

  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState(0);

  async function handlePinUnlock() {
    if (!currentUser?.uid) return;
    // Check lockout
    if (pinLockUntil > Date.now()) {
      const secs = Math.ceil((pinLockUntil - Date.now()) / 1000);
      setPinError(`Too many attempts. Try again in ${secs}s`);
      setPinInput('');
      return;
    }
    const savedPin = localStorage.getItem(`coinova_app_lock_${currentUser.uid}_pin`);
    const { hashPin } = await import('./utils/hash.js');
    const hashedInput = await hashPin(pinInput, currentUser.uid);
    if (hashedInput === savedPin) {
      setAppLocked(false);
      setPinInput('');
      setPinError('');
      setPinAttempts(0);
    } else {
      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      // Exponential backoff: 30s, 2min, 5min, 15min
      const lockDurations = [0, 0, 0, 0, 30000, 120000, 300000, 900000];
      const lockMs = lockDurations[Math.min(attempts, lockDurations.length - 1)];
      if (lockMs > 0) {
        setPinLockUntil(Date.now() + lockMs);
        const label = lockMs >= 60000 ? `${Math.round(lockMs / 60000)} minutes` : `${lockMs / 1000} seconds`;
        setPinError(`Too many attempts. Locked for ${label}`);
      } else {
        setPinError(`Incorrect PIN (${4 - attempts} attempts left)`);
      }
      setPinInput('');
    }
  }

  // User data — loaded when currentUser changes
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  // Tracks whether initial data load is complete — prevents empty-state overwrite race condition
  const dataLoaded = useRef(false);
  // Dispatches a custom event when Firestore subscription delivers new data — screens listen without re-rendering parent

  useEffect(() => {
    if (!currentUser?.uid) {
      setTransactions([]);
      setCustomCategories([]);
      setCustomTags([]);
      return;
    }
    const uid = currentUser.uid;

    // Reset loaded flag while loading new user
    dataLoaded.current = false;

    // Show cached local data instantly (will be replaced by cloud data)
    setTransactions(safeGetJSON(`coinova_transactions_${uid}`, []));
    setCustomCategories(safeGetJSON(`coinova_user_cats_${uid}`, []));
    setCustomTags(safeGetJSON(`coinova_user_tags_${uid}`, []));

    // Firestore is the SINGLE SOURCE OF TRUTH.
    // Local storage is only a cache for instant display.
    // Cloud always wins when it exists.
    loadUserData(uid).then(data => {
      if (data) {
        // Cloud document exists — use it, update local cache
        setTransactions(data.transactions || []);
        setCustomCategories(Array.isArray(data.customCategories) ? data.customCategories : []);
        setCustomTags(Array.isArray(data.customTags) ? data.customTags : []);
        // Cache everything to localStorage
        safeSetJSON(`coinova_transactions_${uid}`, data.transactions || []);
        safeSetJSON(`coinova_user_cats_${uid}`, data.customCategories || []);
        safeSetJSON(`coinova_user_tags_${uid}`, data.customTags || []);
        safeSetJSON(`coinova_savings_goals_${uid}`, data.savingsGoals || []);
        safeSetJSON(`coinova_cards_${uid}`, data.cards || []);
        safeSetJSON(`coinova_budgets_${uid}`, data.budgets || {});
        safeSetJSON(`coinova_trips_${uid}`, data.trips || []);
        if (data.currency) localStorage.setItem(`coinova-currency-${uid}`, data.currency);
        if (data.tourComplete) safeSetJSON(`coinova_tour_complete_${uid}`, true);
        window.dispatchEvent(new CustomEvent('coinova-data-sync'));
      } else {
        // No cloud document — first-time user. Migrate local data to cloud.
        const localTx = safeGetJSON(`coinova_transactions_${uid}`, []);
        const localCats = safeGetJSON(`coinova_user_cats_${uid}`, []);
        const localTags = safeGetJSON(`coinova_user_tags_${uid}`, []);
        const localTotal = localTx.length + localCats.length + localTags.length;
        if (localTotal > 0) {
          saveUserData(uid, {
            transactions: localTx, customCategories: localCats, customTags: localTags,
            savingsGoals: safeGetJSON(`coinova_savings_goals_${uid}`, []),
            cards: safeGetJSON(`coinova_cards_${uid}`, []),
            budgets: safeGetJSON(`coinova_budgets_${uid}`, {}),
            trips: safeGetJSON(`coinova_trips_${uid}`, []),
            currency: localStorage.getItem(`coinova-currency-${uid}`) || 'USD',
          });
        }
      }
      dataLoaded.current = true;
      SplashScreen.hide().catch(() => {});
    }).catch(() => {
      // Firestore unavailable — local cache already shown above
      dataLoaded.current = true;
      SplashScreen.hide().catch(() => {});
    });

    // Subscribe to real-time updates from other devices
    const unsub = subscribeToUserData(uid, (data) => {
      if (data) {
        setTransactions(data.transactions || []);
        setCustomCategories(Array.isArray(data.customCategories) ? data.customCategories : []);
        setCustomTags(Array.isArray(data.customTags) ? data.customTags : []);

        // Sync other data types to localStorage for screens that read from there
        // Only overwrite if the field actually exists in the cloud document
        if (data.savingsGoals !== undefined) safeSetJSON(`coinova_savings_goals_${uid}`, data.savingsGoals);
        if (data.cards !== undefined) safeSetJSON(`coinova_cards_${uid}`, data.cards);
        if (data.budgets !== undefined) safeSetJSON(`coinova_budgets_${uid}`, data.budgets);
        if (data.trips !== undefined) safeSetJSON(`coinova_trips_${uid}`, data.trips);
        if (data.currency) localStorage.setItem(`coinova-currency-${uid}`, data.currency);
        // Signal screens to re-read their data from localStorage (event-based to avoid parent re-render)
        window.dispatchEvent(new CustomEvent('coinova-data-sync'));
      }
    });

    return () => unsub();
  }, [currentUser?.uid]);

  // Persist data to localStorage AND Firestore
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!dataLoaded.current) return;
    // Always update localStorage (offline cache)
    safeSetJSON(`coinova_transactions_${currentUser.uid}`, transactions);
    safeSetJSON(`coinova_user_cats_${currentUser.uid}`, customCategories);
    safeSetJSON(`coinova_user_tags_${currentUser.uid}`, customTags);
    // Only save to Firestore if user made a LOCAL change on this device
    if (!hasLocalChange.current) return;
    hasLocalChange.current = false;
    saveUserData(currentUser.uid, { transactions, customCategories, customTags });
  }, [transactions, customCategories, customTags, currentUser?.uid]);

  // Auto-generate recurring transactions on load — handles multiple missed cycles
  const [recurringChecked, setRecurringChecked] = useState(false);
  useEffect(() => {
    if (!currentUser?.uid || recurringChecked) return;
    setRecurringChecked(true);

    setTransactions(prev => {
      if (prev.length === 0) return prev;
      const today = new Date().toISOString().slice(0, 10);
      const recurring = prev.filter(t => t.recurring);
      const newTxs = [];

      recurring.forEach(t => {
        let lastDate = new Date(t.date);
        // Generate ALL missed occurrences, not just one
        while (true) {
          let nextDate = new Date(lastDate);
          if (t.recurFreq === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (t.recurFreq === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
          else nextDate.setMonth(nextDate.getMonth() + 1);

          const nextStr = nextDate.toISOString().slice(0, 10);
          if (nextStr > today) break;

          const alreadyExists = prev.some(existing =>
            existing.title === t.title &&
            existing.category === t.category &&
            existing.amount === t.amount &&
            existing.date === nextStr
          ) || newTxs.some(existing =>
            existing.title === t.title &&
            existing.category === t.category &&
            existing.amount === t.amount &&
            existing.date === nextStr
          );

          if (!alreadyExists) {
            newTxs.push({ ...t, id: uuid(), date: nextStr, recurring: true });
          }
          lastDate = nextDate;
        }
      });

      if (newTxs.length > 0) hasLocalChange.current = true;
      return newTxs.length > 0 ? [...newTxs, ...prev] : prev;
    });
  }, [currentUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(tx) {
    hasLocalChange.current = true;
    if (editingTx) {
      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...tx, id: editingTx.id } : t));
      setEditingTx(null);
    } else {
      setTransactions(prev => [{ ...tx, id: uuid() }, ...prev]);
    }
  }

  function handleUpdateUser(updates) {
    setCurrentUser(prev => {
      const updated = { ...prev, ...updates };
      if (updated.avatar && updated.uid) {
        safeSetJSON(`coinova_avatar_${updated.uid}`, updated.avatar);
      }
      return updated;
    });
  }

  function handleTourComplete() {
    setShowTour(false);
    if (currentUser?.uid) {
      safeSetJSON(`coinova_tour_complete_${currentUser.uid}`, true);
      saveUserData(currentUser.uid, { tourComplete: true });
    }
  }

  function handleReplayTour() {
    setActiveTab('home');
    setTimeout(() => setShowTour(true), 400);
  }

  function handleLogout() {
    signOut(auth).catch(() => {});
    setTransactions([]);
    setCustomCategories([]);
    setCustomTags([]);
    setActiveTab('home');
    setShowAdd(false);
    setEditingTx(null);
    setShowTour(false);
    setPinAttempts(0);
    setPinLockUntil(0);
    setAppLocked(false);
    setPinInput('');
    setPinError('');
  }

  function handleEdit(tx) {
    setEditingTx(tx);
    setShowAdd(true);
  }


  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCat, setQuickCat] = useState('eating_out');

  // Android back button / iOS gesture handling
  useEffect(() => {
    const listener = CapApp.addListener('backButton', () => {
      if (screenBackHandler.current && screenBackHandler.current()) return;
      if (showQuickAdd) { setShowQuickAdd(false); return; }
      if (showAdd) { setShowAdd(false); setEditingTx(null); return; }
      if (activeTab !== 'home') { setActiveTab('home'); return; }
      CapApp.minimizeApp();
    });
    return () => { listener.then(l => l.remove()); };
  }, [showQuickAdd, showAdd, activeTab]);
  const QUICK_CATS = [
    { id: 'eating_out', icon: '🍔', label: 'Food' },
    { id: 'groceries', icon: '🛒', label: 'Groceries' },
    { id: 'transport', icon: '🚌', label: 'Transport' },
    { id: 'shopping', icon: '👜', label: 'Shopping' },
    { id: 'entertainment', icon: '🎬', label: 'Fun' },
    { id: 'health', icon: '💊', label: 'Health' },
  ];

  function handleQuickSave() {
    const amt = parseFloat(quickAmount);
    if (!amt || amt <= 0) return;
    handleSave({
      type: 'expense',
      amount: amt,
      title: QUICK_CATS.find(c => c.id === quickCat)?.label || 'Expense',
      category: quickCat,
      wallet: 'main',
      tags: [],
      note: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setQuickAmount('');
    setQuickCat('eating_out');
    setShowQuickAdd(false);
  }

  // Bulk delete undo — supports undoing ALL deleted items
  const [deletedTxs, setDeletedTxs] = useState([]);
  const undoTimerRef = useRef(null);

  function handleDelete(id) {
    hasLocalChange.current = true;
    const tx = transactions.find(t => t.id === id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    handleCloseAdd();
    if (tx) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setDeletedTxs(prev => [...prev, tx]);
      undoTimerRef.current = setTimeout(() => setDeletedTxs([]), 5000);
    }
  }

  function handleUndo() {
    if (deletedTxs.length > 0) {
      hasLocalChange.current = true;
      setTransactions(prev => [...deletedTxs, ...prev]);
      setDeletedTxs([]);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  }

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);

  function handleCloseAdd() {
    setShowAdd(false);
    setEditingTx(null);
  }

  function addCustomCategory(cat) {
    hasLocalChange.current = true;
    setCustomCategories(prev => [...prev, cat]);
  }
  function deleteCustomCategory(id) {
    hasLocalChange.current = true;
    setCustomCategories(prev => prev.filter(c => c.id !== id));
  }
  function addCustomTag(tag) {
    const t = typeof tag === 'string' ? tag.trim() : '';
    if (t && !customTags.includes(t)) {
      hasLocalChange.current = true;
      setCustomTags(prev => [...prev, t]);
    }
  }
  function deleteCustomTag(tag) {
    hasLocalChange.current = true;
    setCustomTags(prev => prev.filter(t => t !== tag));
  }

  function renderScreen() {
    if (authLoading) {
      return null;
    }
    if (!currentUser) {
      return <AuthScreen />;
    }
    if (showAdd) {
      return (
        <AddTransactionScreen
          onClose={handleCloseAdd}
          onSave={handleSave}
          onDelete={handleDelete}
          initialTx={editingTx}
          customCategories={customCategories}
          customTags={customTags}
          onAddCustomCategory={addCustomCategory}
          onAddCustomTag={addCustomTag}
        />
      );
    }
    switch (activeTab) {
      case 'home':
        return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} customCategories={customCategories} />;
      case 'transactions':
        return <TransactionsScreen transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} datePeriod={datePeriod} onPeriodChange={setDatePeriod} customCategories={customCategories} currentUser={currentUser} />;
      case 'budgets':
        return <BudgetsScreen transactions={transactions} currentUser={currentUser} registerBackHandler={registerBackHandler} customCategories={customCategories} onAddCustomCategory={addCustomCategory} onDeleteCustomCategory={deleteCustomCategory} onAddTransaction={handleSave} onDeleteTransaction={handleDelete} />;
      case 'profile':
        return (
          <ProfileScreen
            transactions={transactions}
            currentUser={currentUser}
            onLogout={handleLogout}
            onNavigate={setActiveTab}
            onAddTransaction={handleSave}
            onUpdateUser={handleUpdateUser}
            customCategories={customCategories}
            customTags={customTags}
            onAddCustomCategory={addCustomCategory}
            onDeleteCustomCategory={deleteCustomCategory}
            onAddCustomTag={addCustomTag}
            onDeleteCustomTag={deleteCustomTag}
            registerBackHandler={registerBackHandler}
            resetKey={profileResetKey}
            onReplayTour={handleReplayTour}
          />
        );
      case 'travel':
        return <TravelTrackerScreen currentUser={currentUser} onBack={() => setActiveTab('profile')} registerBackHandler={registerBackHandler} />;
      default:
        return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} customCategories={customCategories} />;
    }
  }

  // Lock Screen
  if (appLocked && currentUser) {
    return (
      <div className={`phone-shell ${isDark ? 'dark' : ''}`}>
        <div className="screen">
          <div className="safe-top" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'linear-gradient(145deg, #1A1A2E, #16213E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
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
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Coinova</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 32 }}>Enter PIN to unlock</div>
            {pinError && <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 16, fontWeight: 600 }}>{pinError}</div>}
            <input type="tel" pattern="[0-9]*" maxLength={4} value={pinInput}
              onChange={e => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="• • • •" autoComplete="off"
              style={{ width: 180, padding: 16, borderRadius: 16, textAlign: 'center', background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)', fontSize: 28, fontWeight: 800, letterSpacing: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20, WebkitTextSecurity: 'disc' }}
            />
            <button onClick={handlePinUnlock} style={{ width: 180, padding: 14, borderRadius: 14, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: pinInput.length < 4 ? 0.5 : 1, marginBottom: 16 }}>Unlock</button>
            {localStorage.getItem(`coinova_app_lock_${currentUser.uid}`) === 'true' && (
              <div onClick={() => {
                import('capacitor-native-biometric').then(({ NativeBiometric }) => {
                  NativeBiometric.verifyIdentity({ reason: 'Unlock Coinova', title: 'Coinova' })
                    .then(() => setAppLocked(false)).catch(() => {});
                }).catch(() => {});
              }} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>Use Face ID / Touch ID</div>
            )}
            <div onClick={() => {
              if (confirm('This will sign you out. You can sign back in to access your data.')) {
                // Clear lock state for this user
                localStorage.removeItem(`coinova_app_lock_${currentUser.uid}`);
                localStorage.removeItem(`coinova_app_lock_${currentUser.uid}_pin`);
                handleLogout();
              }
            }} style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer', marginTop: 8 }}>Forgot PIN? Sign out</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`phone-shell ${isDark ? 'dark' : ''}`} onKeyDown={(e) => { if (e.key === 'Escape') { if (showQuickAdd) setShowQuickAdd(false); else if (showAdd) handleCloseAdd(); } }}>
      <div className="screen">
<div key={showAdd ? 'add' : activeTab} className={showAdd ? 'screen-enter-up' : 'screen-enter'} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderScreen()}
        </div>
        {currentUser && !showAdd && activeTab !== 'travel' && !authLoading && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAdd={() => setShowAdd(true)}
            onQuickAdd={() => setShowQuickAdd(true)}
          />
        )}
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowQuickAdd(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 420, padding: '24px 20px 32px', borderRadius: '24px 24px 0 0',
            background: 'var(--surface)', animation: 'slideUp 0.3s ease both',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Add Expense</div>

            {/* Amount */}
            <input
              type="number"
              value={quickAmount}
              onChange={e => setQuickAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 14, fontSize: 28, fontWeight: 800,
                background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)',
                textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 16,
              }}
            />

            {/* Quick categories */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {QUICK_CATS.map(c => (
                <div key={c.id} onClick={() => setQuickCat(c.id)} style={{
                  padding: '10px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                  background: quickCat === c.id ? 'var(--accent-light)' : 'var(--surface2)',
                  border: quickCat === c.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  transition: 'all 0.15s ease',
                }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{c.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: quickCat === c.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowQuickAdd(false)} style={{
                flex: 1, padding: 14, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleQuickSave} style={{
                flex: 2, padding: 14, borderRadius: 14, background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Add Expense</button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)' }}>
              Tap + button for full form with more options
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tour */}
      <OnboardingTour isActive={showTour} onComplete={handleTourComplete} steps={HOME_TOUR_STEPS} accentColor="#4F6EF7" />

      {/* Undo Delete Toast */}
      {deletedTxs.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 90, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 9999,
          animation: 'fadeUp 0.3s ease both', pointerEvents: 'none',
        }}>
        <div style={{
          background: 'var(--text-primary)', color: 'var(--bg)', padding: '10px 16px',
          borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          maxWidth: 'calc(100% - 40px)', pointerEvents: 'auto',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
            {deletedTxs.length === 1 ? 'Transaction deleted' : `${deletedTxs.length} transactions deleted`}
          </span>
          <button onClick={handleUndo} style={{
            background: 'var(--accent)', color: '#fff', border: 'none', padding: '5px 14px',
            borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>Undo</button>
          <div onClick={() => setDeletedTxs([])} style={{ cursor: 'pointer', flexShrink: 0, padding: 2 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider userId={userId}>
        <AppInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
