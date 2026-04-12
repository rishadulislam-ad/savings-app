/**
 * Encrypted Card Vault
 *
 * Full card numbers and CVVs are encrypted with AES-GCM using a key
 * derived from the user's UID. Encrypted data stays on-device only
 * (localStorage). Only last4/name/expiry/network sync to Firestore.
 */

// Get or create a device-specific salt (random, persists per device)
function getDeviceSalt() {
  let salt = localStorage.getItem('coinova_device_salt');
  if (!salt) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    salt = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('coinova_device_salt', salt);
  }
  return salt;
}

// Derive an AES key from user UID + device salt
async function deriveKey(uid) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(getDeviceSalt() + ':coinova_card_vault');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(uid),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a string
async function encrypt(uid, plaintext) {
  const key = await deriveKey(uid);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  // Combine IV + ciphertext, encode as hex
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return Array.from(combined).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Decrypt a hex string
async function decrypt(uid, hexString) {
  const key = await deriveKey(uid);
  const bytes = new Uint8Array(hexString.match(/.{2}/g).map(b => parseInt(b, 16)));
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

// Save encrypted card secrets (full number + CVV) to localStorage
export async function saveCardSecrets(uid, cardId, fullNumber, cvv) {
  try {
    const secrets = JSON.stringify({ number: fullNumber, cvv });
    const encrypted = await encrypt(uid, secrets);
    const key = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    all[cardId] = encrypted;
    localStorage.setItem(key, JSON.stringify(all));
    return true;
  } catch (err) {
    console.warn('[CardVault] encrypt failed:', err);
    return false;
  }
}

// Load and decrypt card secrets for a specific card
export async function loadCardSecrets(uid, cardId) {
  try {
    const key = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    if (!all[cardId]) return null;
    const decrypted = await decrypt(uid, all[cardId]);
    return JSON.parse(decrypted);
  } catch (err) {
    console.warn('[CardVault] decrypt failed:', err);
    return null;
  }
}

// Delete card secrets for a specific card
export function deleteCardSecrets(uid, cardId) {
  try {
    const key = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    delete all[cardId];
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    // silently ignore
  }
}

// Check if secrets exist for a card
export function hasCardSecrets(uid, cardId) {
  try {
    const key = `coinova_card_secrets_${uid}`;
    const all = JSON.parse(localStorage.getItem(key) || '{}');
    return !!all[cardId];
  } catch {
    return false;
  }
}
