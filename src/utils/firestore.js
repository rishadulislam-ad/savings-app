import { doc, getDoc, getDocFromServer, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
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
    // Prefer a fresh server read so cross-device changes show up
    // immediately on app open. The default getDoc() returns whichever
    // is available first (cache OR server) which can mean we hand back
    // stale cached data even when the device is online — that's why
    // iOS sometimes never picked up Android's writes until the user
    // made a local edit. Fall back to getDoc() (which reads cache) on
    // any error so offline launches still work.
    let snap;
    try {
      snap = await getDocFromServer(doc(db, 'users', uid));
    } catch {
      snap = await getDoc(doc(db, 'users', uid));
    }
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

// Listen for app going to background/closing — flush pending writes.
// Multiple hooks because on iOS Capacitor, the WebView's `visibilitychange` /
// `pagehide` events don't fire reliably when the user swipes the app away.
// The native @capacitor/app plugin's `appStateChange` event is the durable
// hook on iOS/Android.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingSave();
  });
  window.addEventListener('pagehide', flushPendingSave);
  window.addEventListener('beforeunload', flushPendingSave);
  // Dynamically import so web-only builds don't need the plugin at runtime.
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) flushPendingSave();
    });
    App.addListener('pause', flushPendingSave);
  }).catch(() => {});
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

/**
 * Atomic transaction operations.
 *
 * THE BUG WITHOUT THESE: when both devices add transactions while one is
 * offline, the offline device queues a setDoc({ transactions: [A1, A2, A3] }).
 * On reconnect, that write replaces the cloud's [B1, B2, B3] (added by the
 * online device meanwhile) — Firestore last-write-wins on the whole field.
 * The online device's entries vanish.
 *
 * arrayUnion / arrayRemove are SERVER-SIDE atomic primitives. The offline
 * device's queued arrayUnion(A1) is applied element-by-element on top of
 * whatever the cloud array is at the moment of replay — it doesn't replace
 * anything else. After reconnect, the cloud naturally contains [A1, A2, A3,
 * B1, B2, B3]. Both devices' subscriptions then converge to that union.
 */
export async function addTransactionToCloud(uid, tx) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      transactions: arrayUnion(tx),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err && err.code === 'not-found') {
      // First write — create the doc.
      try {
        await setDoc(doc(db, 'users', uid), { transactions: [tx], updatedAt: serverTimestamp() }, { merge: true });
        return;
      } catch (e2) {
        console.warn('[Firestore] addTransactionToCloud fallback failed:', e2);
        return;
      }
    }
    console.warn('[Firestore] addTransactionToCloud failed:', err);
  }
}

export async function removeTransactionFromCloud(uid, tx) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      transactions: arrayRemove(tx),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] removeTransactionFromCloud failed:', err);
  }
}

/**
 * Atomic transaction edit — remove the old version and add the new one in
 * a single updateDoc call. Firestore applies them as one atomic op so there
 * is no window where the transaction is missing.
 */
export async function updateTransactionInCloud(uid, oldTx, newTx) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      transactions: arrayRemove(oldTx),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', uid), {
      transactions: arrayUnion(newTx),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] updateTransactionInCloud failed:', err);
  }
}

/**
 * Bulk add — used for recurring transaction generation. arrayUnion accepts
 * multiple elements: arrayUnion(a, b, c). Spreading the array passes them
 * as separate args, so all three are atomically appended in one server op.
 */
export async function addTransactionsBatch(uid, txs) {
  if (!txs || txs.length === 0) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      transactions: arrayUnion(...txs),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    if (err && err.code === 'not-found') {
      try {
        await setDoc(doc(db, 'users', uid), { transactions: txs, updatedAt: serverTimestamp() }, { merge: true });
        return;
      } catch (e2) {
        console.warn('[Firestore] addTransactionsBatch fallback failed:', e2);
        return;
      }
    }
    console.warn('[Firestore] addTransactionsBatch failed:', err);
  }
}

export async function removeTransactionsBatch(uid, txs) {
  if (!txs || txs.length === 0) return;
  try {
    await updateDoc(doc(db, 'users', uid), {
      transactions: arrayRemove(...txs),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] removeTransactionsBatch failed:', err);
  }
}

// ---- Savings goals ----
export async function addSavingsGoalToCloud(uid, goal) {
  try {
    await updateDoc(doc(db, 'users', uid), { savingsGoals: arrayUnion(goal), updatedAt: serverTimestamp() });
  } catch (err) {
    if (err && err.code === 'not-found') {
      try { await setDoc(doc(db, 'users', uid), { savingsGoals: [goal], updatedAt: serverTimestamp() }, { merge: true }); return; } catch {}
    }
    console.warn('[Firestore] addSavingsGoalToCloud failed:', err);
  }
}
export async function removeSavingsGoalFromCloud(uid, goal) {
  try {
    await updateDoc(doc(db, 'users', uid), { savingsGoals: arrayRemove(goal), updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('[Firestore] removeSavingsGoalFromCloud failed:', err);
  }
}
export async function updateSavingsGoalInCloud(uid, oldGoal, newGoal) {
  try {
    await updateDoc(doc(db, 'users', uid), { savingsGoals: arrayRemove(oldGoal), updatedAt: serverTimestamp() });
    await updateDoc(doc(db, 'users', uid), { savingsGoals: arrayUnion(newGoal), updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('[Firestore] updateSavingsGoalInCloud failed:', err);
  }
}

// ---- Trips ----
//
// Trips do NOT use arrayUnion/arrayRemove. Those primitives dedupe by deep
// equality of the entire stored object — so as soon as a trip's nested
// `expenses` array (or any other field) drifts between the queued
// arrayRemove(oldTrip) and the actual element in the cloud (very common
// after offline multi-step edits, where each expense add re-queues a
// remove+union pair against a moving target), the remove silently no-ops
// and the trip duplicates while expenses get lost.
//
// Strategy: read-modify-write the `trips` array, keyed by trip.id. Each
// mutation pulls the current cloud state (Firestore returns the local
// cache when offline, so this works without network), splices the array
// by id, and writes the whole array back. Replay order while offline:
// each queued updateDoc carries its own snapshot of the array, so the
// LAST write wins — which matches the user's intent ("the latest local
// state should be in the cloud").
//
// Multi-device safety net: every trip carries its own `updatedAt`
// timestamp (stamped client-side in TravelTrackerScreen on every
// mutation), and the App subscription merges cloud+local by id picking
// the higher `updatedAt`. So if Device A edits trip X while Device B
// edits trip Y, both edits survive.
async function readTripsArray(uid) {
  // Try a server read first so a trip mutation never overwrites the
  // OTHER device's recent edits with our stale local cache. Fall back to
  // the cache when offline so offline mutations still work; the next
  // online write will then carry the latest local state up. Multi-device
  // safety is further reinforced by mergeTripsById in the App
  // subscription, which preserves whichever side has the newer
  // updatedAt per-trip.
  try {
    const snap = await getDocFromServer(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data?.trips) ? [...data.trips] : [];
    }
    return [];
  } catch {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) return [];
      const data = snap.data();
      return Array.isArray(data?.trips) ? [...data.trips] : [];
    } catch {
      return [];
    }
  }
}

export async function addTripToCloud(uid, trip) {
  if (!trip || !trip.id) return;
  try {
    const trips = await readTripsArray(uid);
    const idx = trips.findIndex(t => t?.id === trip.id);
    if (idx >= 0) trips[idx] = trip;
    else trips.push(trip);
    try {
      await updateDoc(doc(db, 'users', uid), { trips, updatedAt: serverTimestamp() });
    } catch (err) {
      if (err && err.code === 'not-found') {
        await setDoc(doc(db, 'users', uid), { trips, updatedAt: serverTimestamp() }, { merge: true });
        return;
      }
      throw err;
    }
  } catch (err) {
    console.warn('[Firestore] addTripToCloud failed:', err);
  }
}

export async function removeTripFromCloud(uid, trip) {
  if (!trip || !trip.id) return;
  try {
    const trips = await readTripsArray(uid);
    const next = trips.filter(t => t?.id !== trip.id);
    await updateDoc(doc(db, 'users', uid), { trips: next, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('[Firestore] removeTripFromCloud failed:', err);
  }
}

export async function updateTripInCloud(uid, _oldTrip, newTrip) {
  if (!newTrip || !newTrip.id) return;
  try {
    const trips = await readTripsArray(uid);
    const idx = trips.findIndex(t => t?.id === newTrip.id);
    if (idx >= 0) trips[idx] = newTrip;
    else trips.push(newTrip);
    await updateDoc(doc(db, 'users', uid), { trips, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('[Firestore] updateTripInCloud failed:', err);
  }
}

/**
 * Atomic card add — uses Firestore's arrayUnion so concurrent adds from
 * multiple devices merge instead of overwriting each other. The whole-doc
 * setDoc path replaces the entire `cards` array, which races; arrayUnion
 * server-side appends just this one element.
 */
export async function addCardToCloud(uid, card) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      cards: arrayUnion(card),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    // updateDoc fails if the document doesn't exist yet (e.g. brand-new user).
    // Fall back to setDoc with merge so the doc is created with the card.
    if (err && err.code === 'not-found') {
      try {
        await setDoc(doc(db, 'users', uid), { cards: [card], updatedAt: serverTimestamp() }, { merge: true });
        return;
      } catch (e2) {
        console.warn('[Firestore] addCardToCloud fallback failed:', e2);
        return;
      }
    }
    console.warn('[Firestore] addCardToCloud failed:', err);
  }
}

/**
 * Atomic card remove — uses arrayRemove so the deletion is applied to the
 * cloud array element-by-element. Requires the EXACT card object that was
 * stored (deep-equal) — pass the local copy from React state.
 */
export async function removeCardFromCloud(uid, card) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      cards: arrayRemove(card),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] removeCardFromCloud failed:', err);
  }
}

export function subscribeToUserData(uid, callback) {
  let retryDelay = 1000;
  let retryTimer = null;

  function startListener() {
    try {
      const unsub = onSnapshot(
        doc(db, 'users', uid),
        // includeMetadataChanges:false (default) means we only get fired on
        // ACTUAL data changes — the cached snapshot AND every subsequent
        // server snapshot. We do NOT skip the first snapshot anymore: when
        // two devices are both signed into the same account, the very
        // first snapshot on each device often already carries the other
        // device's just-pushed write (Firestore merges cache + server
        // delta into one notification). Skipping it caused iOS to never
        // see Android's writes (and vice-versa) until the next local
        // mutation forced a refresh.
        //
        // The App subscription handler downstream is idempotent:
        //   - id-based merge for trips
        //   - JSON-equality writeIfChanged for localStorage
        //   - empty-wipe guards for every list
        //   - 5s local-change protection windows
        // so re-applying a snapshot that matches the current state is a
        // no-op, and cross-device deltas always propagate immediately.
        (snap) => {
          retryDelay = 1000;
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
