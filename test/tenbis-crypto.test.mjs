// The cipher that keeps a customer's תן ביס password out of the database.
//
// Most of this repo's suites assert against source text, because the source is
// TypeScript and the runner is not. This one does not need to: node imports the
// module directly and the cipher is exercised for real, with a key generated
// here. A crypto module checked by reading its source is a crypto module nobody
// has run.
//
// What is being guarded is specific. The system this feature borrows from keeps
// the same credential in clear and returns it to the browser on request; the
// whole point of this module is that neither is possible, and the assertions
// below are the ones that would fail if it stopped being true.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import {
  encryptSecret,
  decryptSecret,
  tenbisKey,
  TenbisCryptoError,
} from "../src/lib/agent/tenbis-crypto.ts";

const key = () => randomBytes(32);

test("a password survives a round trip", () => {
  const k = key();
  const secret = "S3cr3t-תן-ביס-!@#";
  assert.equal(decryptSecret(encryptSecret(secret, k), k), secret);
});

test("hebrew and emoji survive it too", () => {
  // The field is filled in by hand from whatever תן ביס sent the customer.
  const k = key();
  for (const secret of ["סיסמה בעברית", "🍕🔑", "a".repeat(512), ""]) {
    assert.equal(decryptSecret(encryptSecret(secret, k), k), secret);
  }
});

test("the same password encrypts differently every time", () => {
  // The IV is fresh per call. If this ever fails, two customers with the same
  // password become visibly the same row, and GCM's worst failure mode is open.
  const k = key();
  const a = encryptSecret("same", k);
  const b = encryptSecret("same", k);
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a, k), "same");
  assert.equal(decryptSecret(b, k), "same");
});

test("the stored form is versioned, and holds nothing readable", () => {
  const blob = encryptSecret("hunter2", key());
  const [version, iv, tag, ct] = blob.split(".");
  assert.equal(version, "v1", "the version is what lets a key rotation tell rows apart");
  assert.equal(Buffer.from(iv, "base64").length, 12);
  assert.equal(Buffer.from(tag, "base64").length, 16);
  assert.ok(ct.length > 0);
  // The plaintext must not be sitting in there.
  assert.ok(!blob.includes("hunter2"));
});

test("the wrong key does not decrypt", () => {
  const blob = encryptSecret("hunter2", key());
  assert.throws(() => decryptSecret(blob, key()), TenbisCryptoError);
});

test("a tampered row fails rather than yielding something else", () => {
  // The reason for GCM over CBC: an edited ciphertext is caught, not decrypted
  // into rubbish that then gets sent to תן ביס as a login attempt.
  const k = key();
  const [v, iv, tag, ct] = encryptSecret("hunter2", k).split(".");
  const flipped = Buffer.from(ct, "base64");
  flipped[0] ^= 0xff;
  assert.throws(
    () => decryptSecret([v, iv, tag, flipped.toString("base64")].join("."), k),
    TenbisCryptoError,
  );
});

test("a malformed blob is refused", () => {
  const k = key();
  for (const bad of ["", "nonsense", "v1.only.three", "v2.a.b.c"]) {
    assert.throws(() => decryptSecret(bad, k), TenbisCryptoError, `accepted ${JSON.stringify(bad)}`);
  }
});

test("a key of the wrong size is refused, not padded", () => {
  assert.throws(() => encryptSecret("x", randomBytes(16)), TenbisCryptoError);
  assert.throws(() => encryptSecret("x", randomBytes(31)), TenbisCryptoError);
});

test("no key set means the feature is off, not broken", () => {
  const before = process.env.TENBIS_ENC_KEY;
  try {
    delete process.env.TENBIS_ENC_KEY;
    assert.equal(tenbisKey(), null);

    process.env.TENBIS_ENC_KEY = randomBytes(32).toString("base64");
    assert.equal(tenbisKey()?.length, 32);
  } finally {
    if (before === undefined) delete process.env.TENBIS_ENC_KEY;
    else process.env.TENBIS_ENC_KEY = before;
  }
});

test("a mis-pasted key is loud, because the alternative is a feature that looks fine", () => {
  const before = process.env.TENBIS_ENC_KEY;
  try {
    process.env.TENBIS_ENC_KEY = "dG9vLXNob3J0";  // decodes to 9 bytes
    assert.throws(() => tenbisKey(), (e) => {
      assert.ok(e instanceof TenbisCryptoError);
      // The message has to say what to do, not just that something is wrong.
      assert.match(e.message, /openssl rand -base64 32/);
      return true;
    });
  } finally {
    if (before === undefined) delete process.env.TENBIS_ENC_KEY;
    else process.env.TENBIS_ENC_KEY = before;
  }
});
