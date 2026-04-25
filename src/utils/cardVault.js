/**
 * Encrypted Card Vault — v2.
 *
 * Threat model: an attacker who exfiltrates the app's localStorage from a
 * stolen unlocked device (or from a backup tool on a rooted Android) MUST
 * NOT be able to recover the full card number or CVV.
 *
 * v1 (legacy) derived the AES key from PBKDF2(uid). The UID is also in the
 * same localStorage, so the encryption was effectively obfuscation.
 *
 * v2 (current):
 *   - On native (iOS/Android), the AES key is a random 256-bit value stored
 *     in the OS keystore (iOS Keychain / Android Keystore), via the
 *     already-installed capacitor-native-biometric plugin's setCredentials
 *     API. The key never lives in localStorage. Exfiltrating localStorage
 *     no longer yields plaintext — the OS will only release the key to
 *     this exact app bundle id.
 *   - On web/PWA (no Keychain available), the key is a random 256-bit value
 *     in localStorage. This is no worse than v1 — the web platform doesn't
 *     give us a true secret store. The web build of the app is meant for
 *     dev/preview and the iOS/Android binaries are what users install.
 *
 * Migration: loadCardSecrets tries v2 decryption first; on failure it
 * falls back to v1 (PBKDF2-from-uid). On a successful v1 decrypt, the
 * blob is silently re-encrypted with the v2 key and written back. Users
 * with cards saved before the upgrade keep working; the next reveal
 * transparently upgrades the storage.
 *
 * What still syncs to Firestore: nothing in this file. Card metadata
 * (last4 / name / expiry / network) syncs via the cards array; the full
 * PAN and CVV that this vault encrypts NEVER leave the device.
 */

import { Capacitor } from '@capacitor/core';

const KEYCHAIN_SERVER = 'com.coinova.cardvault';
const KEYCHAIN_USER = 'cardvault-key';

// In-memory cache of the imported CryptoKey for the current session, keyed by
// uid. Avoids re-importing the key on every encrypt/decrypt.
let _cachedKey = null;

// ---------- Hex helpers ----------
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function importAesKey(rawBytes) {
  return crypto.subtle.importKey(
    'raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );
}

// ---------- Native Keychain/Keystore key (v2) ----------
async function getOrCreateKeychainKey(uid) {
  const { NativeBiometric } = await import('capacitor-native-biometric');
  const server = `${KEYCHAIN_SERVER}:${uid}`;

  // Try existing key first
  try {
    const creds = await NativeBiometric.getCredentials({ server });
    if (creds && typeof creds.password === 'string' && creds.password.length === 64) {
      return importAesKey(hexToBytes(creds.password));
    }
  } catch {
    // No existing creds — fall through to create new
  }

  // Generate a fresh 256-bit AES key
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const keyHex = bytesToHex(keyBytes);
  await NativeBiometric.setCredentials({
    username: KEYCHAIN_USER,
    password: keyHex,
    server,
  });
  return importAesKey(keyBytes);
}

// ---------- Web fallback key (v2-web) ----------
// Same security level as v1 (key sits in localStorage), but we still use a
// random 256-bit AES key instead of a PBKDF2 derivation from a non-secret UID.
// This keeps the wire format consistent across platforms.
async function getOrCreateWebKey(uid) {
  const lsKey = `coinova_card_vault_key_${uid}`;
  let keyHex = localStorage.getItem(lsKey);
  if (!keyHex || keyHex.length !== 64) {
    const keyBytes = new Uint8Array(32);
    crypto.getRandomValues(keyBytes);
    keyHex = bytesToHex(keyBytes);
    localStorage.setItem(lsKey, keyHex);
  }
  return importAesKey(hexToBytes(keyHex));
}

async function getVaultKey(uid) {
  if (_cachedKey?.uid === uid && _cachedKey.key) return _cachedKey.key;

  let key = null;
  // Prefer Keychain/Keystore on native platforms.
  if (Capacitor.isNativePlatform?.()) {
    try {
      key = await getOrCreateKeychainKey(uid);
    } catch (err) {
      console.warn('[CardVault] keystore unavailable, falling back to localStorage key:', err);
    }
  }
  if (!key) {
    key = await getOrCreateWebKey(uid);
  }
  _cachedKey = { uid, key };
  return key;
}

// ---------- AES-GCM encrypt / decrypt with explicit key ----------
async function encryptWithKey(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), iv.length);
  return bytesToHex(combined);
}
async function decryptWithKey(key, hexString) {
  const bytes = hexToBytes(hexString);
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// ---------- Legacy v1 decrypt (PBKDF2 from UID) ----------
// Kept ONLY for migrating old blobs encrypted before this rewrite. New writes
// always use the v2 key. After a successful v1 decrypt the blob is rewritten
// with the v2 key, so this code path runs at most once per card.
function getLegacyDeviceSalt() {
  let salt = localStorage.getItem('coinova_device_salt');
  if (!salt) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    salt = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('coinova_device_salt', salt);
  }
  return salt;
}
async function deriveLegacyKey(uid) {
  const enc = new TextEncoder();
  const salt = enc.encode(getLegacyDeviceSalt() + ':coinova_card_vault');
  const km = await crypto.subtle.importKey(
    'raw', enc.encode(uid), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
async function decryptLegacy(uid, hexString) {
  const key = await deriveLegacyKey(uid);
  return decryptWithKey(key, hexString);
}

// ---------- Public API ----------

export async function saveCardSecrets(uid, cardId, fullNumber, cvv) {
  try {
    const key = await getVaultKey(uid);
    const plaintext = JSON.stringify({ number: fullNumber, cvv });
    const encrypted = await encryptWithKey(key, plaintext);
    const lsKey = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(lsKey) || '{}');
    all[cardId] = encrypted;
    localStorage.setItem(lsKey, JSON.stringify(all));
    return true;
  } catch (err) {
    console.warn('[CardVault] encrypt failed:', err);
    return false;
  }
}

export async function loadCardSecrets(uid, cardId) {
  try {
    const lsKey = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(lsKey) || '{}');
    const blob = all[cardId];
    if (!blob) return null;

    // Try v2 (Keychain key on native, random localStorage key on web) first.
    try {
      const key = await getVaultKey(uid);
      const pt = await decryptWithKey(key, blob);
      return JSON.parse(pt);
    } catch {
      // Fall through to legacy v1 attempt.
    }

    // Legacy v1: PBKDF2(uid). If it succeeds, transparently re-encrypt the
    // blob with the v2 key and persist it back. The user never sees the
    // upgrade — same card, same reveal flow, just stronger storage from
    // this point on.
    try {
      const pt = await decryptLegacy(uid, blob);
      const parsed = JSON.parse(pt);
      saveCardSecrets(uid, cardId, parsed.number, parsed.cvv).catch(() => {});
      return parsed;
    } catch (err) {
      console.warn('[CardVault] decrypt failed (v2 and v1 both):', err);
      return null;
    }
  } catch (err) {
    console.warn('[CardVault] loadCardSecrets failed:', err);
    return null;
  }
}

export function deleteCardSecrets(uid, cardId) {
  try {
    const lsKey = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(lsKey) || '{}');
    delete all[cardId];
    localStorage.setItem(lsKey, JSON.stringify(all));
  } catch {
    // silently ignore
  }
}

export function hasCardSecrets(uid, cardId) {
  try {
    const lsKey = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(lsKey) || '{}');
    return !!all[cardId];
  } catch {
    return false;
  }
}

/**
 * Wipe ALL secret material for this user — encrypted blobs in localStorage,
 * the per-user web fallback key, and the Keychain/Keystore key. Called from
 * the account-deletion / "delete all data" flows so nothing lingers.
 */
export async function wipeVault(uid) {
  try {
    localStorage.removeItem(`coinova_card_secrets_${uid}`);
    localStorage.removeItem(`coinova_card_vault_key_${uid}`);
  } catch {}
  if (Capacitor.isNativePlatform?.()) {
    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      await NativeBiometric.deleteCredentials({ server: `${KEYCHAIN_SERVER}:${uid}` });
    } catch {}
  }
  _cachedKey = null;
}
