/**
 * Client-side E2E encryption for Forge direct messages.
 *
 * Scheme: ECDH P-256 key agreement → AES-256-GCM symmetric encryption.
 *
 * Key lifecycle:
 *   - A P-256 keypair is generated once per browser profile and stored in
 *     localStorage.  The private key never leaves the device.
 *   - The public key (JWK) is published to `profiles.public_key` so any
 *     conversation partner can fetch it.
 *   - When sending a DM: derive a shared AES key from your private key +
 *     the recipient's public key, then AES-GCM encrypt the plaintext.
 *   - When receiving: derive the same shared key using your private key +
 *     the sender's public key, then decrypt.
 *
 * Security properties:
 *   - Protects against database breaches — Supabase never sees plaintext.
 *   - Not forward-secret (key rotation not implemented).
 *   - Falls back gracefully: messages sent before encryption was set up are
 *     stored as plain text and rendered without decryption.
 */

const PRIV_KEY_STORE = 'forge-e2e-priv';
const PUB_KEY_STORE  = 'forge-e2e-pub';

const ECDH_ALGO  = { name: 'ECDH', namedCurve: 'P-256' } as const;
const AES_ALGO   = { name: 'AES-GCM', length: 256 }      as const;

// ── Key initialisation ────────────────────────────────────────────────────────

/**
 * Returns the current public key JWK (generating a new keypair if needed).
 * Call this once on login; the returned JWK should be saved to the user's
 * profile row in Supabase.
 */
export async function initEncryptionKeys(): Promise<JsonWebKey | null> {
  try {
    const storedPriv = localStorage.getItem(PRIV_KEY_STORE);
    const storedPub  = localStorage.getItem(PUB_KEY_STORE);

    if (storedPriv && storedPub) {
      return JSON.parse(storedPub) as JsonWebKey;
    }

    const keyPair = await crypto.subtle.generateKey(ECDH_ALGO, true, ['deriveKey']);
    const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const pubJwk  = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

    localStorage.setItem(PRIV_KEY_STORE, JSON.stringify(privJwk));
    localStorage.setItem(PUB_KEY_STORE,  JSON.stringify(pubJwk));
    return pubJwk;
  } catch {
    return null;
  }
}

/** Returns the stored public key JWK, or null if not yet initialised. */
export function getMyPublicKeyJwk(): JsonWebKey | null {
  const stored = localStorage.getItem(PUB_KEY_STORE);
  return stored ? (JSON.parse(stored) as JsonWebKey) : null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function loadPrivateKey(): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(PRIV_KEY_STORE);
  if (!stored) return null;
  try {
    return await crypto.subtle.importKey('jwk', JSON.parse(stored), ECDH_ALGO, false, ['deriveKey']);
  } catch {
    return null;
  }
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.importKey('jwk', jwk, ECDH_ALGO, false, []);
  } catch {
    return null;
  }
}

async function deriveAesKey(myPrivate: CryptoKey, theirPublic: CryptoKey): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.deriveKey(
      { name: 'ECDH', public: theirPublic },
      myPrivate,
      AES_ALGO,
      false,
      ['encrypt', 'decrypt'],
    );
  } catch {
    return null;
  }
}

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypts `plaintext` for the given recipient public key.
 * Returns `{ ciphertext, iv }` — both base-64 encoded — or `null` on failure.
 */
export async function encryptMessage(
  plaintext: string,
  recipientPublicKeyJwk: JsonWebKey,
): Promise<{ ciphertext: string; iv: string } | null> {
  try {
    const myPrivate    = await loadPrivateKey();
    const theirPublic  = await importPublicKey(recipientPublicKeyJwk);
    if (!myPrivate || !theirPublic) return null;

    const sharedKey = await deriveAesKey(myPrivate, theirPublic);
    if (!sharedKey) return null;

    const iv      = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const cipher  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded);

    return { ciphertext: b64encode(cipher), iv: b64encode(iv.buffer) };
  } catch {
    return null;
  }
}

/**
 * Decrypts a message.
 * `ciphertext` and `iv` must be the base-64 strings returned by `encryptMessage`.
 * `senderPublicKeyJwk` is the *sender's* public key (for ECDH key agreement).
 * Returns the plaintext string, or `null` if decryption fails.
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  senderPublicKeyJwk: JsonWebKey,
): Promise<string | null> {
  try {
    const myPrivate   = await loadPrivateKey();
    const theirPublic = await importPublicKey(senderPublicKeyJwk);
    if (!myPrivate || !theirPublic) return null;

    const sharedKey = await deriveAesKey(myPrivate, theirPublic);
    if (!sharedKey) return null;

    const ivBytes     = b64decode(iv);
    const cipherBytes = b64decode(ciphertext);
    const plain       = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, sharedKey, cipherBytes);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
