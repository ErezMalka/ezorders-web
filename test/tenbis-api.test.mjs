// The one call the portal makes to תן ביס, and the ways it can go wrong.
//
// Run for real against a stubbed fetch rather than asserted from source, so the
// URL-building, the three places a token hides, and the failure classification
// are all exercised. The module takes its fetch as an option precisely so this
// suite can watch what it sends.
//
// The thing most worth guarding is not any single case but the distinction
// between them: "rejected" means the customer's details are wrong and an agent
// should go back to them, "unreachable" means nobody should be chased. The
// operational system this is drawn from collapses both into one error string,
// which is how an outage turns into a phone call to a restaurant.
import { test } from "node:test";
import assert from "node:assert/strict";

import { verifyTenbisCredentials } from "../src/lib/tenbis-api.ts";

const CREDS = { user: "shop", password: "p@ss/word", restaurantId: "4242" };

/** A fetch that answers with one JSON body, and records what it was asked. */
function stub(body, { status = 200, json = true } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (!json) throw new SyntaxError("not json");
        return body;
      },
    };
  };
  return { fetchImpl, calls };
}

test("a good login returns the token", async () => {
  const { fetchImpl } = stub({ Success: true, Token: "TKN-1" });
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.deepEqual(out, { ok: true, token: "TKN-1" });
});

test("the token is found in all three places it has been seen", async () => {
  // Their service has returned it at each of these. Dropping one would break
  // some accounts and not others, which is the worst kind of break.
  for (const body of [
    { Success: true, Token: "A" },
    { Success: true, Data: { Token: "A" } },
    { Success: true, Data: { TokenID: "A" } },
  ]) {
    const { fetchImpl } = stub(body);
    const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
    assert.deepEqual(out, { ok: true, token: "A" }, JSON.stringify(body));
  }
});

test("credentials are escaped into the path", async () => {
  // All three go in the URL path, and a password may contain a slash. Without
  // escaping, "p@ss/word" silently calls a different endpoint.
  const { fetchImpl, calls } = stub({ Success: true, Token: "T" });
  await verifyTenbisCredentials(CREDS, { fetchImpl });

  const url = calls[0].url;
  assert.ok(!url.includes("p@ss/word"), "the raw password landed in the path");
  assert.ok(url.includes(encodeURIComponent("p@ss/word")));
  assert.match(url, /\/LogIn\/shop\/p%40ss%2Fword\/4242\/[0-9a-f]{16}$/);
});

test("every call carries a fresh request id", async () => {
  const { fetchImpl, calls } = stub({ Success: true, Token: "T" });
  await verifyTenbisCredentials(CREDS, { fetchImpl });
  await verifyTenbisCredentials(CREDS, { fetchImpl });
  const id = (u) => u.split("/").pop();
  assert.notEqual(id(calls[0].url), id(calls[1].url));
});

test("it asks for JSON and gives up eventually", async () => {
  const { fetchImpl, calls } = stub({ Success: true, Token: "T" });
  await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.ok(calls[0].init.signal, "no timeout signal — a hung call would hang the request");
});

test("a refusal is reported in תן ביס's own words", async () => {
  const { fetchImpl } = stub({ Success: false, ErrorCode: 302, ErrorDesc: "שם משתמש או סיסמה שגויים" });
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "rejected");
  assert.equal(out.message, "שם משתמש או סיסמה שגויים");
  assert.equal(out.code, 302);
});

test("a refusal with no description still says something", async () => {
  const { fetchImpl } = stub({ Success: false });
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(out.reason, "rejected");
  assert.ok(out.message.length > 0);
  assert.equal(out.code, null);
});

test("an outage is not blamed on the customer", async () => {
  // The distinction this whole result type exists for.
  const { fetchImpl } = stub({}, { status: 503 });
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(out.reason, "unreachable");
  assert.match(out.message, /503/);
});

test("a timeout is its own message", async () => {
  const fetchImpl = async () => {
    const e = new Error("timed out");
    e.name = "TimeoutError";
    throw e;
  };
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(out.reason, "unreachable");
  assert.match(out.message, /בזמן/);
});

test("a non-JSON answer is a fault, not a rejection", async () => {
  const { fetchImpl } = stub(null, { json: false });
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(out.reason, "unreachable");
});

test("success without a token is their fault, not the customer's", async () => {
  // Sending the agent back to re-ask for a password that was accepted would be
  // the wrong instruction.
  const { fetchImpl } = stub({ Success: true });
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
  assert.equal(out.ok, false);
  assert.equal(out.reason, "unreachable");
});

test("missing fields never reach תן ביס", async () => {
  const { fetchImpl, calls } = stub({ Success: true, Token: "T" });
  for (const creds of [
    { user: "", password: "p", restaurantId: "1" },
    { user: "u", password: "", restaurantId: "1" },
    { user: "u", password: "p", restaurantId: " " },
  ]) {
    const out = await verifyTenbisCredentials(creds, { fetchImpl });
    assert.equal(out.ok, false, JSON.stringify(creds));
    assert.equal(out.reason, "rejected");
  }
  assert.equal(calls.length, 0, "an incomplete form was sent to their service");
});

test("nothing that comes back carries the password", async () => {
  // The password is in the request path, so any error that echoes a URL leaks
  // it. Check every failure shape, not just the obvious one.
  const shapes = [
    stub({ Success: false, ErrorDesc: "no" }),
    stub({}, { status: 500 }),
    stub(null, { json: false }),
  ];
  for (const { fetchImpl } of shapes) {
    const out = await verifyTenbisCredentials(CREDS, { fetchImpl });
    assert.ok(!JSON.stringify(out).includes("p@ss/word"), "a result carried the password");
    assert.ok(!JSON.stringify(out).includes("10bis.co.il"), "a result carried the request URL");
  }

  const thrower = async () => { throw new Error(`failed to fetch https://www.10bis.co.il/...p%40ss%2Fword...`); };
  const out = await verifyTenbisCredentials(CREDS, { fetchImpl: thrower });
  assert.ok(!JSON.stringify(out).includes("p%40ss%2Fword"),
    "the thrown error's message was passed through, and it held the password");
});
