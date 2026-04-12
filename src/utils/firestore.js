import { doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Firestore sync service for Coinova.
 * All user data lives in a single document at users/{uid}.
 *
 * DATA PROTECTION RULES:
 * 1. NEVER write empty arrays/objects if cloud has existing data
 * 2. Always back up to localStorage before overwriting
 * 3. saveUserData refuses to write if data looks like an accidental wipe
 */

const DEFAULTS = {
  transactions: [],
  customCategories: [],
  customTags: [],
  savingsGoals: [],
  cards: [],
  budgets: {},
  trips: [],
  currency: 'USD',
  settings: {},
};

// Track what we last loaded from Firestore — used to detect accidental wipes
let _lastKnownCounts = null;

/**
 * Load the full user document from Firestore.
 * Returns the data object or null if no document exists.
 */
export async function loadUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = { ...DEFAULTS, ...snap.data() };
      // Remember what we loaded so we can detect wipes later
      _lastKnownCounts = {
        transactions: (data.transactions || []).length,
        cards: (data.cards || []).length,
        savingsGoals: (data.savingsGoals || []).length,
        trips: (data.trips || []).length,
      };
      return data;
    }
    _lastKnownCounts = null;
    return null;
  } catch (err) {
    console.warn('[Firestore] loadUserData failed:', err);
    throw err;
  }
}

/**
 * Debounced save — writes the user document with merge: true.
 * Cancels any pending save and schedules a new one in 500ms.
 *
 * DATA PROTECTION: Refuses to write if it looks like an accidental wipe
 * (writing empty arrays when we know cloud had data).
 */
let _saveTimer = null;
let _pendingSave = null;

// Flush any pending debounced save immediately (called when app is closing)
export function flushPendingSave() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_pendingSave) {
    const { uid, data } = _pendingSave;
    _pendingSave = null;
    _doSave(uid, data);
  }
}

// Listen for app going to background/closing — flush pending writes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSave();
  });
  window.addEventListener('pagehide', flushPendingSave);
}

async function _doSave(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Update known counts after successful write
    if (data.transactions) _lastKnownCounts = { ...(_lastKnownCounts || {}), transactions: data.transactions.length };
    if (data.cards) _lastKnownCounts = { ...(_lastKnownCounts || {}), cards: data.cards.length };
    if (data.savingsGoals) _lastKnownCounts = { ...(_lastKnownCounts || {}), savingsGoals: data.savingsGoals.length };
    if (data.trips) _lastKnownCounts = { ...(_lastKnownCounts || {}), trips: data.trips.length };
  } catch (err) {
    console.warn('[Firestore] saveUserData failed:', err);
  }
}

export function saveUserData(uid, data) {
  // Merge with any pending save so we don't lose fields
  if (_pendingSave && _pendingSave.uid === uid) {
    _pendingSave = { uid, data: { ..._pendingSave.data, ...data } };
  } else {
    _pendingSave = { uid, data };
  }
  if (_saveTimer) clearTimeout(_saveTimer);
  const mergedData = _pendingSave.data;
  _saveTimer = setTimeout(() => {
    _pendingSave = null;
    _doSave(uid, mergedData);
  }, 500);
}

/**
 * Subscribe to real-time updates on the user document.
 * Calls callback(data) when the document changes (from another device).
 * Returns an unsubscribe function.
 */
/**
 * Permanently delete the user's Firestore document.
 * Used by account deletion. Cancels any pending debounced save first
 * so we don't race a delete against a save.
 */
export async function deleteUserData(uid) {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  _pendingSave = null;
  _lastKnownCounts = null;
  await deleteDoc(doc(db, 'users', uid));
}

export function subscribeToUserData(uid, callback) {
  let retryDelay = 1000;
  let retryTimer = null;

  function startListener() {
    try {
      let isFirstSnapshot = true;
      const unsub = onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          retryDelay = 1000;
          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            return;
          }
          if (snap.exists()) {
            const data = { ...DEFAULTS, ...snap.data() };
            _lastKnownCounts = {
              transactions: (data.transactions || []).length,
              cards: (data.cards || []).length,
              savingsGoals: (data.savingsGoals || []).length,
              trips: (data.trips || []).length,
            };
            callback(data);
          } else {
            callback(null);
          }
        },
        () => {
          // Retry with exponential backoff (max 60s)
          retryTimer = setTimeout(() => startListener(), retryDelay);
          retryDelay = Math.min(retryDelay * 2, 60000);
        }
      );
      // Store unsub so cleanup can call it
      currentUnsub = unsub;
    } catch {}
  }

  let currentUnsub = null;
  startListener();

  return () => {
    if (retryTimer) clearTimeout(retryTimer);
    if (currentUnsub) currentUnsub();
  };
}
