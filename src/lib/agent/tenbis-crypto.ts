// ─── The תן ביס password, at rest ─────────────────────────────────────────────
//
// This exists because of how the same credential is handled in the system this
// feature borrows from: stored in clear, and returned to the browser by the
// endpoint that reads the config. Combined with a missing authorization check
// there, one request yields another restaurant's login. Neither half of that is
// repeated here — the check lives in the RLS policy on tenbis_accounts, and the
// password is never stored or returned in a form anyone can read.
//
// AES-256-GCM: authenticated, so a row edited in the database fails to decrypt
// rather than quietly yielding something else. The stored form is
//
//   v1.<iv>.<tag>.<ciphertext>          each part base64
//
// and it carries its version so a future key rotation can tell old rows from
// new ones without guessing at lengths.
//
// The cipher takes its key as an argument and reads no environment of its own.
// That is what lets the test exercise it for real, with a key it generates,
// instead of asserting on the shape of this file.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
/** 96 bits, the size GCM is specified for and the only one worth using. */
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class TenbisCryptoError extends Error {}

/**
 * Encrypt one secret.
 *
 * A fresh IV every time, which is why encrypting the same password twice gives
 * two different rows — reusing an IV under one key is the mistake GCM punishes
 * hardest, so it is generated here rather than taken from the caller.
 */
export function encryptSecret(plain: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/**
 * Decrypt one secret, or throw.
 *
 * Throwing rather than returning null is deliberate: every caller here is about
 * to send these credentials somewhere, and a silent empty password would reach
 * תן ביס as a failed login that looks like the customer's fault.
 */
export function decryptSecret(blob: string, key: Buffer): string {
  assertKey(key);
  const parts = blob.split(".");
  if (parts.length !== 4) throw new TenbisCryptoError("Stored secret is malformed");

  const [version, ivB64, tagB64, ctB64] = parts;
  if (version !== VERSION) throw new TenbisCryptoError(`Unknown secret version: ${version}`);

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_BYTES) throw new TenbisCryptoError("Stored secret has a bad IV");

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // The tag failed, the key is wrong, or the row was edited. Which of those
    // it is cannot be told apart, and saying so would be a guess.
    throw new TenbisCryptoError("Stored secret could not be decrypted");
  }
}

function assertKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new TenbisCryptoError(`Key must be ${KEY_BYTES} bytes`);
  }
}

/**
 * The key, from the environment, or null when the feature is not configured.
 *
 * Null rather than a throw, so the panel can say "not configured" the way
 * crmEnabled() already does for the CRM. A feature that half-works — accepting
 * a password it cannot encrypt — would be worse than one that is plainly off.
 *
 * Generate one with:  openssl rand -base64 32
 */
export function tenbisKey(): Buffer | null {
  const raw = (process.env.TENBIS_ENC_KEY ?? "").trim();
  if (!raw) return null;

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    // Loud, because the alternative is a feature that looks configured and
    // fails on the first save with something unrecognisable.
    throw new TenbisCryptoError(
      `TENBIS_ENC_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). Generate one with: openssl rand -base64 32`,
    );
  }
  return key;
}

/**
 * Whether the feature is configured at all.
 *
 * A malformed key is deliberately NOT caught here: "configured but broken" must
 * not be reported as "off", or the panel would quietly disappear and the person
 * who mis-pasted the key would have nothing to go on. tenbisKey() throws for
 * that case and its message says what to fix.
 */
export function tenbisCryptoEnabled(): boolean {
  return tenbisKey() !== null;
}
