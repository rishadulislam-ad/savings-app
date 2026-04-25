/**
 * Optional encryption for exported backup files.
 *
 * Use case: a user exports their backup (transactions, cards-metadata,
 * savings goals, etc.) and shares it via Files / iCloud Drive / email.
 * Without encryption, anyone with the file gets a plaintext copy of the
 * user's entire financial history. With a user-chosen passphrase, the file
 * is opaque to anyone who doesn't know it.
 *
 * Wrapper format:
 *   {
 *     "format": "coinova-backup-encrypted",
 *     "v": 1,
 *     "kdf":    { "name": "PBKDF2", "iterations": 200000, "hash": "SHA-256", "salt": "<hex>" },
 *     "cipher": { "name": "AES-GCM", "iv": "<hex>", "ct": "<hex>" }
 *   }
 *
 * 200k PBKDF2 iterations + SHA-256 makes a 10-character random passphrase
 * uncrackable in any reasonable time; an 8-char dictionary passphrase is
 * still ~weeks of GPU time. Users should pick something memorable but not
 * a single common word.
 */

const FORMAT = 'coinova-backup-encrypted';
const VERSION = 1;
const PBKDF2_ITERATIONS = 200000;

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function deriveKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    km,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext JSON string with a user passphrase. Returns the
 * stringified wrapper object — write this to disk instead of the plaintext.
 */
export async function encryptBackup(plaintext, passphrase) {
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new Error('Passphrase is required');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  );
  return JSON.stringify({
    format: FORMAT,
    v: VERSION,
    kdf:    { name: 'PBKDF2', iterations: PBKDF2_ITERATIONS, hash: 'SHA-256', salt: bytesToHex(salt) },
    cipher: { name: 'AES-GCM', iv: bytesToHex(iv), ct: bytesToHex(new Uint8Array(ct)) },
  });
}

/**
 * Returns true if the given parsed JSON object is an encrypted backup wrapper.
 */
export function isEncryptedBackup(obj) {
  return !!(obj && obj.format === FORMAT && obj.v === VERSION && obj.kdf && obj.cipher);
}

/**
 * Decrypt an encrypted backup wrapper with the user-provided passphrase.
 * Returns the plaintext JSON string. Throws on wrong passphrase or
 * tampered ciphertext (AES-GCM detects bit-flips).
 */
export async function decryptBackup(wrapper, passphrase) {
  if (!isEncryptedBackup(wrapper)) {
    throw new Error('Not an encrypted backup');
  }
  const salt = hexToBytes(wrapper.kdf.salt);
  const iv = hexToBytes(wrapper.cipher.iv);
  const ct = hexToBytes(wrapper.cipher.ct);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
