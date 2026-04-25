// PIN hashing.
//
// History:
//   v1 (legacy): salt = utf8(`${userId}:coinova_pin_v2`) — deterministic per
//                user. Hash in localStorage. Attacker with localStorage access
//                can brute-force the 10000-PIN space offline.
//   v3:          random 32-byte per-user salt + hash, both in localStorage.
//                Removes cross-user precomputation but the hash is still
//                offline-attackable from a localStorage exfil.
//   v4 (current): hash + salt stored in iOS Keychain / Android Keystore via
//                the already-installed capacitor-native-biometric plugin's
//                setCredentials API. No PIN material in localStorage. An
//                attacker with localStorage access can no longer brute-force
//                the PIN at all — they need to extract the keystore entry,
//                which the OS only releases to this app's bundle id.
//
// On web/PWA (no keystore), v4 falls back to v3 (random salt in localStorage).
//
// Verification (verifyPin) tries v4 → v3 → v1 in order. After any successful
// non-v4 verification, the caller invokes upgradePinHash to silently migrate
// to v4 (or v3 on web). Migration is transparent — the user typed the same PIN.

import { Capacitor } from '@capacitor/core';

const PBKDF2_ITERATIONS = 100000;
const KC_SERVER = 'com.coinova.pinlock';
const KC_USERNAME = 'pin';

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function pbkdf2(pin, saltBytes) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derived));
}

/**
 * Legacy v1 hash — DO NOT use for new PINs. Kept exported because some call
 * sites still verify against legacy hashes; verifyPin() handles both formats.
 */
export async function hashPin(pin, userId) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(userId + ':coinova_pin_v2');
  return pbkdf2(pin, salt);
}

/**
 * v3: hash with an explicit random per-user salt. Use this for new PIN setup
 * and PIN changes. Returns the hex hash; the caller stores the salt separately
 * (under `coinova_app_lock_${uid}_pin_salt`).
 */
export async function hashPinV3(pin, saltHex) {
  const saltBytes = hexToBytes(saltHex);
  return pbkdf2(pin, saltBytes);
}

/**
 * Generate a fresh 32-byte random salt as hex.
 */
export function generatePinSalt() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// ---------- v4: Keychain-stored PIN material ----------
// Stored as a single concatenated string "salt:hash" in the Keychain entry's
// password field, keyed by server="com.coinova.pinlock:<uid>". This keeps
// it to one keystore round-trip per verify and is opaque to localStorage.

async function readKeychainPin(uid) {
  if (!Capacitor.isNativePlatform?.()) return null;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const creds = await NativeBiometric.getCredentials({ server: `${KC_SERVER}:${uid}` });
    if (!creds || typeof creds.password !== 'string') return null;
    const idx = creds.password.indexOf(':');
    if (idx <= 0) return null;
    return { salt: creds.password.slice(0, idx), hash: creds.password.slice(idx + 1) };
  } catch {
    return null;
  }
}

async function writeKeychainPin(uid, salt, hash) {
  if (!Capacitor.isNativePlatform?.()) return false;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.setCredentials({
      username: KC_USERNAME,
      password: `${salt}:${hash}`,
      server: `${KC_SERVER}:${uid}`,
    });
    return true;
  } catch {
    return false;
  }
}

async function deleteKeychainPin(uid) {
  if (!Capacitor.isNativePlatform?.()) return;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.deleteCredentials({ server: `${KC_SERVER}:${uid}` });
  } catch {}
}

/**
 * Returns true if a PIN is set for this user — checks both v4 keystore and
 * legacy v1/v3 localStorage. Use this in place of
 * `localStorage.getItem(coinova_app_lock_<uid>_pin)` so v4 users (whose
 * localStorage entry has been wiped) are still recognized as having a PIN.
 */
export async function hasPin(uid) {
  if (typeof localStorage !== 'undefined' &&
      localStorage.getItem(`coinova_app_lock_${uid}_pin`)) return true;
  if (Capacitor.isNativePlatform?.()) {
    const kc = await readKeychainPin(uid);
    if (kc) return true;
  }
  return false;
}

/**
 * Verify an entered PIN. Tries v4 (Keychain), then v3 (random-salt
 * localStorage), then legacy v1 (deterministic-salt localStorage). Returns
 * true on first match.
 */
export async function verifyPin(pin, uid, savedHashFromLocalStorage) {
  // v4: Keychain
  if (Capacitor.isNativePlatform?.()) {
    const kc = await readKeychainPin(uid);
    if (kc) {
      try {
        const candidate = await hashPinV3(pin, kc.salt);
        if (candidate === kc.hash) return true;
      } catch {}
    }
  }
  // v3: random salt + hash in localStorage
  if (savedHashFromLocalStorage) {
    try {
      const saltHex = typeof localStorage !== 'undefined'
        ? localStorage.getItem(`coinova_app_lock_${uid}_pin_salt`)
        : null;
      if (saltHex) {
        const v3 = await hashPinV3(pin, saltHex);
        if (v3 === savedHashFromLocalStorage) return true;
      }
    } catch {}
    // v1: legacy deterministic salt
    try {
      const v1 = await hashPin(pin, uid);
      if (v1 === savedHashFromLocalStorage) return true;
    } catch {}
  }
  return false;
}

/**
 * After a successful legacy verification (v1 or v3), promote storage to v4
 * (Keychain). The user typed the same PIN; this runs silently and wipes the
 * old localStorage entries so a future localStorage exfil yields nothing.
 */
export async function upgradePinHash(pin, uid) {
  const salt = generatePinSalt();
  const hash = await hashPinV3(pin, salt);
  if (Capacitor.isNativePlatform?.()) {
    const ok = await writeKeychainPin(uid, salt, hash);
    if (ok) {
      // Wipe the (now redundant and exfil-able) localStorage copy.
      try {
        localStorage.removeItem(`coinova_app_lock_${uid}_pin`);
        localStorage.removeItem(`coinova_app_lock_${uid}_pin_salt`);
      } catch {}
      return;
    }
  }
  // Web fallback: keep v3 in localStorage.
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`coinova_app_lock_${uid}_pin_salt`, salt);
    localStorage.setItem(`coinova_app_lock_${uid}_pin`, hash);
  }
}

/**
 * For new PIN setup or PIN change. Stores in Keychain on native, falls back
 * to localStorage on web.
 */
export async function setNewPin(pin, uid) {
  const salt = generatePinSalt();
  const hash = await hashPinV3(pin, salt);
  if (Capacitor.isNativePlatform?.()) {
    const ok = await writeKeychainPin(uid, salt, hash);
    if (ok) {
      // Defensive: ensure no legacy localStorage entry lingers.
      try {
        localStorage.removeItem(`coinova_app_lock_${uid}_pin`);
        localStorage.removeItem(`coinova_app_lock_${uid}_pin_salt`);
      } catch {}
      return;
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(`coinova_app_lock_${uid}_pin_salt`, salt);
    localStorage.setItem(`coinova_app_lock_${uid}_pin`, hash);
  }
}

/**
 * Wipe ALL PIN material for this user — Keychain entry AND localStorage
 * entries (legacy and v3). Used by remove-PIN, account deletion, and
 * delete-all-data flows.
 */
export async function wipePin(uid) {
  await deleteKeychainPin(uid);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`coinova_app_lock_${uid}_pin`);
      localStorage.removeItem(`coinova_app_lock_${uid}_pin_salt`);
    } catch {}
  }
}
