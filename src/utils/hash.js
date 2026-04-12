export async function hashPin(pin, userId) {
  const encoder = new TextEncoder();
  const salt = encoder.encode(userId + ':coinova_pin_v2');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
}
