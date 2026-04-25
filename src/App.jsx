import { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { safeGetJSON, safeSetJSON, uuid } from './utils/storage';
import { loadUserData, saveUserData, subscribeToUserData, addTransactionToCloud, removeTransactionFromCloud, updateTransactionInCloud, addTransactionsBatch, removeTransactionsBatch } from './utils/firestore';
import { localYMD, todayLocal } from './utils/date';
import { scheduleAllNotifications } from './utils/notificationScheduler';
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

/**
 * Newest-first ordering for transactions. We use Firestore's atomic
 * arrayUnion for adds, which appends to the END of the cloud array — so the
 * order returned by the realtime subscription doesn't reflect insertion
 * recency. Sort here to keep the UI's "newest at top" promise.
 *
 * Sort key: date (YYYY-MM-DD) descending, then createdAt (Date.now() at
 * insertion time) descending as a tie-breaker. Transactions added before
 * createdAt was introduced fall back to 0 — they end up after newer same-day
 * entries, which is fine.
 */
function sortTxsNewestFirst(txs) {
  if (!Array.isArray(txs)) return [];
  return [...txs].sort((a, b) => {
    const dateCmp = (b?.date || '').localeCompare(a?.date || '');
    if (dateCmp !== 0) return dateCmp;
    return (b?.createdAt || 0) - (a?.createdAt || 0);
  });
}

function AppInner() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [profileResetKey, setProfileResetKey] = useState(0);
  // Pending profile sub-sheet to open on next ProfileScreen mount/focus.
  // Used when a deep-link (e.g. Insights widget on Home) wants to switch
  // to the Profile tab AND open a specific sheet inside it. A pure window
  // event would race with ProfileScreen's mount, so we hold the intent in
  // App-level state until ProfileScreen consumes + clears it via callback.
  const [pendingProfileSheet, setPendingProfileSheet] = useState(null);
  const openMyFinanceFromHome = useCallback(() => {
    setPendingProfileSheet('finances');
    setActiveTab('profile');
  }, []);
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
  // Local-change protection window. After a user adds/deletes data on THIS
  // device, the Firestore subscription can deliver a stale snapshot before
  // our own write has propagated through the round-trip. Without protection,
  // that stale snapshot overwrites local state, undoing the user's change.
  // Any code path that mutates a synced field should call markLocalChange(field).
  // The subscription handler then ignores remote updates for that field for
  // a few seconds, giving our write time to round-trip.
  if (typeof window !== 'undefined') {
    window.__coinovaLocalChange = window.__coinovaLocalChange || {};
  }
  const registerBackHandler = useCallback((handler) => {
    screenBackHandler.current = handler;
  }, []);

  // Firebase auth state — uses cached session for offline support
  const [currentUser, setCurrentUser] = useState(() => {
    // On mount, restore cached user immediately so app works offline
    return safeGetJSON('coinova_cached_user', null);
  });
  const [authLoading, setAuthLoading] = useState(() => {
    // If we have a cached user, don't show auth loading
    return !safeGetJSON('coinova_cached_user', null);
  });

  useEffect(() => {
    // Safety net: if auth doesn't respond within 3 seconds (offline scenario),
    // stop waiting and use cached user
    const offlineFallback = setTimeout(() => {
      setAuthLoading(false);
      const cached = safeGetJSON('coinova_cached_user', null);
      if (cached && !currentUser) setCurrentUser(cached);
      SplashScreen.hide().catch(() => {});
    }, 3000);

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(offlineFallback);
      if (firebaseUser) {
        const user = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          avatar: null,
          provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google'
                   : firebaseUser.providerData[0]?.providerId === 'apple.com' ? 'apple' : null,
        };
        const savedAvatar = safeGetJSON(`coinova_avatar_${firebaseUser.uid}`);
        if (savedAvatar) user.avatar = savedAvatar;
        setCurrentUser(user);
        // Cache the user for offline access on next launch — but DROP email.
        // Email is sensitive (phishing / account-recovery vector). Firebase
        // Auth has it on disk in the SDK's own encrypted store; we just
        // don't keep a duplicate plaintext copy in our own localStorage.
        // When online, currentUser.email is repopulated from firebaseUser
        // above — UI works as normal. When offline-only (3-second fallback
        // path below), email displays empty until next online auth.
        const { email: _omit, ...userForCache } = user;
        safeSetJSON('coinova_cached_user', userForCache);

        const tourDone = safeGetJSON(`coinova_tour_complete_${firebaseUser.uid}`);
        if (!tourDone) {
          setTimeout(() => setShowTour(true), 800);
        }
      } else {
        setCurrentUser(null);
        // Clear cached user only if we're actually online and Firebase says logged out
        if (navigator.onLine) {
          try { localStorage.removeItem('coinova_cached_user'); } catch {}
        }
      }
      setAuthLoading(false);
      if (!firebaseUser && navigator.onLine) SplashScreen.hide().catch(() => {});
    });
    return () => { clearTimeout(offlineFallback); unsub(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle iOS Google redirect result on app startup
  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
  }, []);

  // Check app lock on startup
  useEffect(() => {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    const lockEnabled = localStorage.getItem(`coinova_app_lock_${uid}`) === 'true';
    let cancelled = false;
    // hasPin() checks Keychain (v4) AND localStorage (legacy v1/v3) — needed
    // because v4 wipes the localStorage PIN entry after migration.
    (async () => {
      const { hasPin } = await import('./utils/hash.js');
      const pinSet = await hasPin(uid);
      if (cancelled) return;
      if (!lockEnabled && !pinSet) return;
      setAppLocked(true);
      if (lockEnabled) {
        try {
          const { NativeBiometric } = await import('capacitor-native-biometric');
          NativeBiometric.verifyIdentity({ reason: 'Unlock Coinova', title: 'Coinova' })
            .then(() => { if (!cancelled) setAppLocked(false); })
            .catch(() => { /* Stay locked — user can enter PIN */ });
        } catch { /* Plugin not available — use PIN */ }
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockUntil, setPinLockUntil] = useState(0);

  // Restore PIN attempt counter and lockout timestamp from disk on user login.
  // Without this persistence, an attacker could bypass the exponential backoff
  // by force-quitting the app between failed attempts (state resets to 0).
  useEffect(() => {
    if (!currentUser?.uid) return;
    const aRaw = localStorage.getItem(`coinova_pin_attempts_${currentUser.uid}`);
    const lRaw = localStorage.getItem(`coinova_pin_lock_until_${currentUser.uid}`);
    const a = parseInt(aRaw || '0', 10) || 0;
    const l = parseInt(lRaw || '0', 10) || 0;
    if (a) setPinAttempts(a);
    if (l && l > Date.now()) {
      setPinLockUntil(l);
    } else if (l) {
      // Lockout expired while app was closed — clean up.
      localStorage.removeItem(`coinova_pin_lock_until_${currentUser.uid}`);
    }
  }, [currentUser?.uid]);

  async function handlePinUnlock() {
    if (!currentUser?.uid) return;
    const uid = currentUser.uid;
    // Check lockout
    if (pinLockUntil > Date.now()) {
      const secs = Math.ceil((pinLockUntil - Date.now()) / 1000);
      setPinError(`Too many attempts. Try again in ${secs}s`);
      setPinInput('');
      return;
    }
    const savedPin = localStorage.getItem(`coinova_app_lock_${uid}_pin`);
    const { verifyPin, upgradePinHash } = await import('./utils/hash.js');
    const ok = await verifyPin(pinInput, uid, savedPin);
    if (ok) {
      // Silently upgrade to v4 (Keychain) if the PIN material is still in
      // localStorage. After upgrade, the localStorage entries are wiped so a
      // future localStorage exfil can't be used to brute-force the PIN.
      try {
        const stillInLocalStorage = !!localStorage.getItem(`coinova_app_lock_${uid}_pin`);
        if (stillInLocalStorage) await upgradePinHash(pinInput, uid);
      } catch {}
      setAppLocked(false);
      setPinInput('');
      setPinError('');
      setPinAttempts(0);
      // Clear the persisted lockout state — successful login resets it.
      localStorage.removeItem(`coinova_pin_attempts_${uid}`);
      localStorage.removeItem(`coinova_pin_lock_until_${uid}`);
    } else {
      const attempts = pinAttempts + 1;
      setPinAttempts(attempts);
      localStorage.setItem(`coinova_pin_attempts_${uid}`, String(attempts));
      // Exponential backoff: 30s, 2min, 5min, 15min
      const lockDurations = [0, 0, 0, 0, 30000, 120000, 300000, 900000];
      const lockMs = lockDurations[Math.min(attempts, lockDurations.length - 1)];
      if (lockMs > 0) {
        const lockUntil = Date.now() + lockMs;
        setPinLockUntil(lockUntil);
        // Persist so force-quit doesn't bypass the lockout.
        localStorage.setItem(`coinova_pin_lock_until_${uid}`, String(lockUntil));
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
  const [dataReady, setDataReady] = useState(false); // Don't render app until cache is loaded
  // Tracks whether initial data load is complete — prevents empty-state overwrite race condition
  const dataLoaded = useRef(false);
  // Dispatches a custom event when Firestore subscription delivers new data — screens listen without re-rendering parent

  useEffect(() => {
    if (!currentUser?.uid) {
      setTransactions([]);
      setCustomCategories([]);
      setCustomTags([]);
      setDataReady(false);
      return;
    }
    const uid = currentUser.uid;
    let cancelled = false;

    dataLoaded.current = false;

    // Load from localStorage cache SYNCHRONOUSLY in the effect body
    // This sets state before the next render, so the user never sees []
    const cachedTx = safeGetJSON(`coinova_transactions_${uid}`, []);
    const cachedCats = safeGetJSON(`coinova_user_cats_${uid}`, []);
    const cachedTags = safeGetJSON(`coinova_user_tags_${uid}`, []);
    const cachedTxStr = JSON.stringify(cachedTx);
    setTransactions(sortTxsNewestFirst(cachedTx));
    setCustomCategories(cachedCats);
    setCustomTags(cachedTags);
    setDataReady(true);
    SplashScreen.hide().catch(() => {});

    // Sync from Firestore in background.
    //
    // CRITICAL OFFLINE-FIRST RULE: localStorage is the source of truth.
    // loadUserData's result (from Firestore's persistentLocalCache) can be:
    //   - Up to date (online, same-device)
    //   - Stale (offline, pending write not yet in cache)
    //   - Partial (doc exists with some fields missing)
    //   - Empty array fields (wipe risk)
    //
    // Rule: NEVER reduce the size of the local array based on loadUserData.
    // Only let it ADD information that local was missing (e.g. first login on
    // new device where localStorage is empty). The realtime subscription
    // handles live updates from other devices with its own wipe guards.
    loadUserData(uid).then(data => {
      if (cancelled) return;
      if (data) {
        // Only overwrite React state / localStorage when cloud has STRICTLY
        // MORE data than local — or when local is empty (fresh login).
        // This protects offline-added entries from being clobbered by an
        // older Firestore cached doc that hasn't been refreshed yet.
        const cloudTx = Array.isArray(data.transactions) ? data.transactions : null;
        const cloudCats = Array.isArray(data.customCategories) ? data.customCategories : null;
        const cloudTags = Array.isArray(data.customTags) ? data.customTags : null;

        const acceptTx = cloudTx !== null && cloudTx.length >= cachedTx.length;
        const acceptCats = cloudCats !== null && cloudCats.length >= cachedCats.length;
        const acceptTags = cloudTags !== null && cloudTags.length >= cachedTags.length;

        if (acceptTx && JSON.stringify(cloudTx) !== cachedTxStr) {
          setTransactions(sortTxsNewestFirst(cloudTx));
        }
        if (acceptCats) {
          setCustomCategories(cloudCats);
        }
        if (acceptTags) {
          setCustomTags(cloudTags);
        }

        // Only mirror to localStorage when we accepted the update.
        if (acceptTx) safeSetJSON(`coinova_transactions_${uid}`, cloudTx);
        if (acceptCats) safeSetJSON(`coinova_user_cats_${uid}`, cloudCats);
        if (acceptTags) safeSetJSON(`coinova_user_tags_${uid}`, cloudTags);

        // If local has MORE entries than cloud (offline-added data not yet
        // synced), push the LOCAL-ONLY entries back to Firestore via atomic
        // arrayUnion so we don't overwrite concurrent additions made on
        // another device. Bare saveUserData here would do a full-array
        // replace and clobber a parallel device's writes.
        if (cloudTx !== null && cloudTx.length < cachedTx.length) {
          const cloudIds = new Set(cloudTx.map(t => t?.id));
          const missingFromCloud = cachedTx.filter(t => t?.id && !cloudIds.has(t.id));
          if (missingFromCloud.length > 0) {
            hasLocalChange.current = true;
            addTransactionsBatch(uid, missingFromCloud);
          }
        }
        // customCategories / customTags still go through saveUserData for
        // now — these are very low-frequency changes (typically once during
        // setup) so the residual race is acceptable. If we ever see real
        // races there, convert them to arrayUnion the same way.
        if (cloudCats !== null && cloudCats.length < cachedCats.length) {
          hasLocalChange.current = true;
          saveUserData(uid, { customCategories: cachedCats });
        }
        if (cloudTags !== null && cloudTags.length < cachedTags.length) {
          hasLocalChange.current = true;
          saveUserData(uid, { customTags: cachedTags });
        }
        if (data.savingsGoals !== undefined) {
          const localGoals = safeGetJSON(`coinova_savings_goals_${uid}`, []);
          if (!(Array.isArray(data.savingsGoals) && data.savingsGoals.length === 0 && localGoals.length > 0)) {
            safeSetJSON(`coinova_savings_goals_${uid}`, data.savingsGoals);
          }
        }
        if (data.cards !== undefined) {
          const localCards = safeGetJSON(`coinova_cards_${uid}`, []);
          if (!(Array.isArray(data.cards) && data.cards.length === 0 && localCards.length > 0)) {
            safeSetJSON(`coinova_cards_${uid}`, data.cards);
          }
        }
        if (data.budgets !== undefined) safeSetJSON(`coinova_budgets_${uid}`, data.budgets);
        if (data.trips !== undefined) {
          const localTrips = safeGetJSON(`coinova_trips_${uid}`, []);
          if (!(Array.isArray(data.trips) && data.trips.length === 0 && localTrips.length > 0)) {
            safeSetJSON(`coinova_trips_${uid}`, data.trips);
          }
        }
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
    }).catch(() => {
      dataLoaded.current = true;
    });

    // Subscribe to real-time updates from other devices
    const unsub = subscribeToUserData(uid, (data) => {
      if (data) {
        // Local-change protection: ignore remote updates for a field if the user
        // modified it on this device within the last 5 seconds. Prevents stale
        // pre-write snapshots from undoing fresh local adds/deletes during the
        // brief window before Firestore confirms our own write.
        const PROTECT_MS = 5000;
        const recentlyChanged = (field) =>
          Date.now() - (window.__coinovaLocalChange?.[field] || 0) < PROTECT_MS;

        // Transactions sync via atomic arrayUnion/arrayRemove ops, so the
        // realtime snapshot is always authoritative — no protection window
        // needed. Still keep the empty-wipe guard as a safety net for the
        // rare case where the cloud doc is missing the `transactions` field.
        // Sort by date desc + createdAt desc so arrayUnion's append-order
        // doesn't bury new entries at the bottom of the list.
        if (data.transactions !== undefined) {
          setTransactions(prev => {
            const cloudTx = sortTxsNewestFirst(data.transactions || []);
            if (cloudTx.length === 0 && prev.length > 0) return prev;
            return JSON.stringify(prev) !== JSON.stringify(cloudTx) ? cloudTx : prev;
          });
        }
        if (data.customCategories !== undefined && Array.isArray(data.customCategories) && !recentlyChanged('customCategories')) {
          setCustomCategories(prev => {
            if (data.customCategories.length === 0 && prev.length > 0) return prev;
            return JSON.stringify(prev) !== JSON.stringify(data.customCategories) ? data.customCategories : prev;
          });
        }
        if (data.customTags !== undefined && Array.isArray(data.customTags) && !recentlyChanged('customTags')) {
          setCustomTags(prev => {
            if (data.customTags.length === 0 && prev.length > 0) return prev;
            return JSON.stringify(prev) !== JSON.stringify(data.customTags) ? data.customTags : prev;
          });
        }

        // Sync other data types to localStorage. Only overwrite if the field
        // actually exists in the cloud doc, isn't an empty wipe, AND wasn't
        // just modified locally.
        if (data.savingsGoals !== undefined && !recentlyChanged('savingsGoals')) {
          const localGoals = safeGetJSON(`coinova_savings_goals_${uid}`, []);
          if (!(Array.isArray(data.savingsGoals) && data.savingsGoals.length === 0 && localGoals.length > 0)) {
            safeSetJSON(`coinova_savings_goals_${uid}`, data.savingsGoals);
          }
        }
        // Cards: real-time sync. Local mutations on this device go through
        // atomic arrayUnion/arrayRemove (see ProfileScreen.addCard/deleteCard),
        // which means the local Firestore cache reflects the change synchronously
        // and the subscription's first snapshot after the change carries the
        // already-correct data. So we can apply the cloud snapshot directly
        // without protection windows — there's no stale-snapshot window to defend
        // against. This makes adds and deletes propagate to other devices
        // (and back to this one for confirmation) within a single round-trip.
        if (data.cards !== undefined && Array.isArray(data.cards)) {
          safeSetJSON(`coinova_cards_${uid}`, data.cards);
        }
        if (data.budgets !== undefined && !recentlyChanged('budgets')) safeSetJSON(`coinova_budgets_${uid}`, data.budgets);
        if (data.trips !== undefined && !recentlyChanged('trips')) {
          const localTrips = safeGetJSON(`coinova_trips_${uid}`, []);
          if (!(Array.isArray(data.trips) && data.trips.length === 0 && localTrips.length > 0)) {
            safeSetJSON(`coinova_trips_${uid}`, data.trips);
          }
        }
        if (data.currency) localStorage.setItem(`coinova-currency-${uid}`, data.currency);
        // Signal screens to re-read their data from localStorage (event-based to avoid parent re-render)
        window.dispatchEvent(new CustomEvent('coinova-data-sync'));
      }
    });

    return () => { cancelled = true; unsub(); };
  }, [currentUser?.uid]);

  // Persist data to localStorage AND Firestore.
  //
  // Gate on `dataReady` (React state, set synchronously after the localStorage
  // cache is loaded into React state — line ~194), NOT on `dataLoaded.current`
  // (the async flag set inside loadUserData().then()). Reason: when offline,
  // loadUserData can take a long time or fail entirely (App Check token
  // fetching, network hang, etc.), leaving dataLoaded.current forever false.
  // That used to block ALL localStorage writes — so offline-added transactions
  // were only in React state and were lost when the app was closed.
  // dataReady flips to true as soon as the cache is loaded, independent of
  // the async Firestore fetch, so offline writes persist correctly.
  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!dataReady) return;
    // Always update localStorage (offline cache) — this is the durable store
    // that survives app close/reopen.
    safeSetJSON(`coinova_transactions_${currentUser.uid}`, transactions);
    safeSetJSON(`coinova_user_cats_${currentUser.uid}`, customCategories);
    safeSetJSON(`coinova_user_tags_${currentUser.uid}`, customTags);
    // Firestore sync:
    //   - `transactions` is intentionally OMITTED from this saveUserData. It
    //     syncs through atomic arrayUnion/arrayRemove ops in handleSave/
    //     handleDelete/handleUndo/recurring effect. Bundling it here would
    //     overwrite the whole array and undo concurrent additions from
    //     another device when an offline device's write replays on reconnect.
    //   - customCategories/customTags still go through saveUserData for now
    //     (they change rarely and we accept the residual race).
    if (!hasLocalChange.current) return;
    hasLocalChange.current = false;
    saveUserData(currentUser.uid, { customCategories, customTags });
  }, [transactions, customCategories, customTags, currentUser?.uid, dataReady]);

  // Recompute scheduled notifications whenever the source data changes.
  // Throttled internally to once per 5s to avoid thrashing the plugin
  // during initial cloud sync. Runs only on native (web no-ops).
  useEffect(() => {
    if (!currentUser?.uid || !dataReady) return;
    let budgets = {};
    let savingsGoals = [];
    try { budgets      = JSON.parse(localStorage.getItem(`coinova_budgets_${currentUser.uid}`)      || '{}'); } catch {}
    try { savingsGoals = JSON.parse(localStorage.getItem(`coinova_savings_goals_${currentUser.uid}`) || '[]'); } catch {}
    scheduleAllNotifications({ uid: currentUser.uid, transactions, budgets, savingsGoals });
  }, [currentUser?.uid, dataReady, transactions]);

  // Auto-generate recurring transactions on load — handles multiple missed cycles
  const [recurringChecked, setRecurringChecked] = useState(false);
  useEffect(() => {
    if (!currentUser?.uid || recurringChecked) return;
    setRecurringChecked(true);

    setTransactions(prev => {
      if (prev.length === 0) return prev;
      const today = todayLocal();
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

          const nextStr = localYMD(nextDate);
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
            newTxs.push({ ...t, id: uuid(), date: nextStr, recurring: true, createdAt: Date.now() });
          }
          lastDate = nextDate;
        }
      });

      if (newTxs.length > 0) {
        hasLocalChange.current = true;
        // Atomic bulk-add to Firestore so concurrent additions from another
        // device aren't lost when our offline writes replay.
        if (currentUser?.uid) addTransactionsBatch(currentUser.uid, newTxs);
      }
      return newTxs.length > 0 ? sortTxsNewestFirst([...newTxs, ...prev]) : prev;
    });
  }, [currentUser?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(tx) {
    hasLocalChange.current = true;
    const uid = currentUser?.uid;
    if (editingTx) {
      const oldTx = transactions.find(t => t.id === editingTx.id);
      // Preserve the original createdAt so edits don't jump to the top of
      // the list. Fall back to the old tx's createdAt or now() for legacy
      // entries created before this field was introduced.
      const newTx = { ...tx, id: editingTx.id, createdAt: oldTx?.createdAt || Date.now() };
      setTransactions(prev => sortTxsNewestFirst(prev.map(t => t.id === editingTx.id ? newTx : t)));
      setEditingTx(null);
      if (uid && oldTx) updateTransactionInCloud(uid, oldTx, newTx);
    } else {
      // createdAt is the insertion-recency tie-breaker that keeps newest-first
      // order even when arrayUnion appends to the end of the cloud array.
      const newTx = { ...tx, id: uuid(), createdAt: Date.now() };
      setTransactions(prev => sortTxsNewestFirst([newTx, ...prev]));
      if (uid) addTransactionToCloud(uid, newTx);
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
    // IMPORTANT: do NOT call setTransactions([]) etc. here.
    // If we did, the persist effect would fire with empty arrays while the
    // user's uid is still set (signOut is async, onAuthStateChanged hasn't
    // cleared currentUser yet) — wiping the user's localStorage cache for
    // their uid. The data effect's `if (!currentUser?.uid)` branch handles
    // state reset correctly via setDataReady(false), which gates the persist
    // effect and keeps the per-uid localStorage cache intact for next login.
    signOut(auth).catch(() => {});
    try { localStorage.removeItem('coinova_cached_user'); } catch {}
    // Clear the Service Worker / PWA caches on sign-out. On a shared computer
    // (or shared device), the next visitor would otherwise get the cached
    // app shell + cached responses for the previous user from the SW. We
    // intentionally do NOT unregister the SW itself — it'll re-cache fresh
    // app assets on the next visit, preserving offline support for the
    // legitimate next-login.
    try {
      if (typeof caches !== 'undefined') {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
      }
    } catch {}
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
  const quickAmountRef = useRef(null);
  // Centered-modal flow: focus the input on the next frame so the modal's
  // scale-in animation has begun rendering, then the keyboard slides up.
  // Because the modal is CENTERED (not bottom-anchored), the keyboard rising
  // from the bottom doesn't cover its content, so the two animations don't
  // fight for the same screen real estate.
  useEffect(() => {
    if (!showQuickAdd) return;
    const t = setTimeout(() => {
      quickAmountRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [showQuickAdd]);
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
      date: todayLocal(),
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
      if (currentUser?.uid) removeTransactionFromCloud(currentUser.uid, tx);
    }
  }

  function handleUndo() {
    if (deletedTxs.length > 0) {
      hasLocalChange.current = true;
      const undoList = deletedTxs;
      setTransactions(prev => sortTxsNewestFirst([...undoList, ...prev]));
      setDeletedTxs([]);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (currentUser?.uid) addTransactionsBatch(currentUser.uid, undoList);
    }
  }

  // Bulk delete from the Transactions screen's select mode. Single atomic
  // arrayRemove call to Firestore (instead of N separate calls), and a
  // single undo bucket so the user can restore everything in one tap.
  function handleBulkDelete(ids) {
    if (!ids || ids.length === 0) return;
    hasLocalChange.current = true;
    const idSet = new Set(ids);
    const removed = transactions.filter(t => idSet.has(t.id));
    setTransactions(prev => prev.filter(t => !idSet.has(t.id)));
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setDeletedTxs(prev => [...prev, ...removed]);
    undoTimerRef.current = setTimeout(() => setDeletedTxs([]), 5000);
    if (currentUser?.uid && removed.length > 0) {
      removeTransactionsBatch(currentUser.uid, removed);
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
    // Render a dark full-screen surface (not null) during loading windows.
    // Returning null exposes whatever is behind the React tree — on warm
    // app starts that's briefly the WebView's default white, producing the
    // occasional white flash. A solid #0E0F14 div bridges the gap so the
    // visual chain stays dark from splash → loading → mounted UI.
    if (authLoading) {
      return <div style={{ position: 'fixed', inset: 0, background: '#0E0F14' }} />;
    }
    if (!currentUser) {
      return <AuthScreen />;
    }
    if (!dataReady) {
      // Splash may still be visible; even after it hides, this dark surface
      // covers the WebView until the real screen is ready to mount.
      return <div style={{ position: 'fixed', inset: 0, background: '#0E0F14' }} />;
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
        return <HomeScreen transactions={transactions} onEdit={handleEdit} onNavigate={setActiveTab} onOpenMyFinance={openMyFinanceFromHome} datePeriod={datePeriod} onPeriodChange={setDatePeriod} currentUser={currentUser} customCategories={customCategories} />;
      case 'transactions':
        return <TransactionsScreen transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} onBulkDelete={handleBulkDelete} datePeriod={datePeriod} onPeriodChange={setDatePeriod} customCategories={customCategories} currentUser={currentUser} />;
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
            pendingSheet={pendingProfileSheet}
            onPendingSheetConsumed={() => setPendingProfileSheet(null)}
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

      {/* Quick Add Modal — centered iOS-alert style.
          Centered (not bottom-anchored) so the rising keyboard never covers
          its content. The modal is small enough that even with the keyboard
          up, it sits comfortably in the upper visible area. */}
      {showQuickAdd && (
        <div data-kb-push style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
        }}>
          <div onClick={() => setShowQuickAdd(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.22s cubic-bezier(0.32, 0.72, 0, 1) both',
          }} />
          <div style={{
            position: 'relative', width: 'calc(100% - 32px)', maxWidth: 360,
            padding: '20px 20px 22px', borderRadius: 24,
            background: 'var(--surface)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
            animation: 'quickAddIn 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
            willChange: 'transform, opacity',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, textAlign: 'center' }}>Quick Add Expense</div>

            {/* Amount */}
            <input
              ref={quickAmountRef}
              type="number"
              inputMode="decimal"
              value={quickAmount}
              onChange={e => setQuickAmount(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 14, fontSize: 26, fontWeight: 800,
                background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text-primary)',
                textAlign: 'center', outline: 'none', boxSizing: 'border-box', marginBottom: 14,
              }}
            />

            {/* Quick categories */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
              {QUICK_CATS.map(c => (
                <div key={c.id} onClick={() => setQuickCat(c.id)} style={{
                  padding: '8px 6px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                  background: quickCat === c.id ? 'var(--accent-light)' : 'var(--surface2)',
                  border: quickCat === c.id ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{c.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: quickCat === c.id ? 'var(--accent)' : 'var(--text-secondary)' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowQuickAdd(false)} style={{
                flex: 1, padding: 12, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleQuickSave} style={{
                flex: 2, padding: 12, borderRadius: 12, background: 'var(--accent)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Add Expense</button>
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
  // Seed userId synchronously from the cached user blob so ThemeProvider
  // mounts with the right uid on the very first render. Without this seed,
  // userId starts as null → ThemeProvider reads the GENERIC currency key
  // (no per-user suffix) → defaults to USD → AnimatedNumber starts the
  // count-up with a "$" prefix → onAuthStateChanged fires a moment later,
  // userId updates, ThemeProvider re-reads the per-user currency key, and
  // the prefix flips mid-animation. Reading the uid from the same cache
  // AppInner uses eliminates the flip entirely.
  const [userId, setUserId] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('coinova_cached_user') || 'null');
      return cached?.uid || null;
    } catch { return null; }
  });

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
