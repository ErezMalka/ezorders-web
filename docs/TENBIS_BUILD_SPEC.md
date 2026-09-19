# תן ביס × EZORDERS — build spec

For building together in `ezorders-web`. Written 2026-09-19 against live code and
both Supabase projects. Supersedes `TENBIS_IN_EZORDERS_PROMPT.md`, which was the
research; this is the plan.

---

## 1. What we are building, in one paragraph

EZORDERS already **sells** תן ביס — ₪95 setup, ₪85/month, `item_group =
integrations`, beside wolt and mishloha. What it does not do is **deliver** it.
Today a customer buys it, the contract syncs to the CRM, the CRM raises a task
saying "send the customer the instructions", the customer eventually gets a
username and password from 10bis, and then somebody types those into Bite by
hand with nothing linking any of it back to the sale. We are building the
missing middle: EZORDERS collects the credentials against the order that sold
them, proves they work by logging into 10bis on the spot, tracks where every
sold integration stands, and delivers the credentials into Bite automatically.

Everything from "sold" to "working", inside the system that sold it.

## 2. Why this and not a copy of the Bite orders screen

The screen in `NEW-CLIENT` shows a restaurant its own food orders. EZORDERS has
no restaurants signed in — only agents — and no branch, tenant or restaurant
column anywhere in its schema (checked: zero matches in `information_schema`).
Copying that screen would mean building a restaurant-facing product inside a
sales portal, and there would be nobody to show it to. The gap that is actually
open is delivery, so that is what we close.

---

## 3. The feature, screen by screen

### 3.1 On the order page — `/he/agent/orders/[id]`

Shown only when the order carries the `tenbis` product. A panel, "ממשק תן ביס",
with:

- **A state line** — one sentence saying exactly where this stands, and what
  happens next. Not a coloured dot: "נשלחו הנחיות ללקוח ב־3.9. ממתינים לפרטי
  ההתחברות מתן ביס."
- **The instructions button** — generates the standard message the customer
  needs (what to ask 10bis for, and what to send back). This is the CRM task
  `להעביר ללקוח את ההודעה המובנית עם הנחיות להקמת ממשק תן ביס`, done here
  instead, with the customer's own name in it. Copy to clipboard; sending it is
  the agent's business.
- **Three fields** — `שם משתמש`, `סיסמה`, `מזהה מסעדה`.
- **"בדיקת חיבור"** — logs into 10bis with what was typed and answers plainly:
  connected, or the error 10bis gave, in Hebrew. This is the whole point of
  doing it here: the agent finds out in five seconds instead of during
  onboarding three weeks later.
- **"העברה לבייט"** — once verified, writes them into the operational system
  (§7). Disabled until verified, and until a Bite branch id is set.
- **A short history** — who entered them, when they were last verified, what
  failed last time.

### 3.2 A provisioning list — `/he/agent/orders/tenbis`

Every order with תן ביס sold, and where each one stands. Managers see all;
an agent sees their own — the same rule the orders list already uses. This is
the screen that answers "what have we sold and not delivered", which today
nobody can answer at all.

Columns: customer, order number, sold on, state, last checked. Sorted worst
first — failed, then waiting on the customer, then never touched.

### 3.3 On the quote builder

Nothing. Resist adding anything here: at quote time there is no customer
account yet and nothing to configure. Provisioning belongs to a sold order.

---

## 4. Data model

One table, keyed by order. Migration `supabase/migrations/0034_tenbis_accounts.sql`,
following the numbering already in that folder.

```sql
-- The lifecycle of one sold תן ביס integration, from sale to working.
CREATE TYPE tenbis_state AS ENUM (
  'sold',        -- on the order, nothing done yet
  'instructed',  -- the customer has been told what to ask 10bis for
  'entered',     -- credentials captured, not yet proven
  'verified',    -- 10bis accepted them
  'failed',      -- 10bis rejected them; last_error says why
  'delivered'    -- written into the operational system
);

CREATE TABLE tenbis_accounts (
  order_id        uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,

  tenbis_user     text        NOT NULL DEFAULT '',
  -- Never plaintext. AES-256-GCM, written and read only by the server (§5).
  password_enc    text,
  restaurant_id   text        NOT NULL DEFAULT '',

  -- Bite's integer branch id. Looked up from the CRM branch cache by phone,
  -- then confirmed by a person — see §7. Null until confirmed.
  bite_branch_id  integer,

  state           tenbis_state NOT NULL DEFAULT 'sold',
  last_error      text,
  instructed_at   timestamptz,
  verified_at     timestamptz,
  delivered_at    timestamptz,

  updated_by      uuid REFERENCES agents(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenbis_accounts ENABLE ROW LEVEL SECURITY;

-- Exactly the rule orders already uses, reached through the order. RLS is the
-- boundary here, not a check in a route — see §6.
CREATE POLICY tenbis_accounts_all ON tenbis_accounts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM orders o
     WHERE o.id = tenbis_accounts.order_id
       AND (o.agent_id = auth.uid() OR is_manager())
  ));
```

`is_manager()` already exists — `SECURITY DEFINER`, true for `manager` and
`admin` on an active agent row.

**Row created lazily**, on first save. Do not backfill a row for every order
that ever sold תן ביס; `sold` is the absence of a row and the list in §3.2 can
left-join for it.

---

## 5. The password

Never in plaintext, never returned to a browser. Not negotiable — the system
being ported from does exactly that and it is one of the two reasons not to copy
it.

- **At rest**: AES-256-GCM in Node, key from `TENBIS_ENC_KEY` (32 random bytes,
  base64, set in Vercel). Store `iv:tag:ciphertext` base64 in one text column.
- **In transit out**: never. The API returns `{ hasPassword: true }` and nothing
  else. There is no "show password" control — if an agent needs to know it
  works, that is a verify call, not a readback.
- **Decrypted**: only server-side, only in the two places that need it — the
  10bis login and the delivery to Bite.
- **No key set**: the panel says the feature is not configured, the same way
  `crmEnabled()` already handles a missing CRM. It does not half-work.

`src/lib/agent/tenbis-crypto.ts`, about thirty lines, with its own test. Keep it
separate from the business logic so the test is about the cipher and nothing
else.

---

## 6. Server code

Follow the conventions this repo already has. The important one, stated in
`src/app/api/agent/products/route.ts`:

> The admin check here is a courtesy, not the boundary: this route runs as the
> caller's own Supabase session, so the RLS policy is what actually decides.

So: `createSupabaseServerClient()` everywhere. `createSupabaseAdminClient()`
**nowhere** in this feature — the RLS policy in §4 expresses the rule
completely, and reaching for the service role would be throwing that away.

### `src/lib/agent/tenbis.ts` — `import "server-only"`

```ts
getTenbisAccount(orderId): Promise<TenbisAccount | null>   // never returns the password
saveTenbisAccount(orderId, { user, password?, restaurantId, biteBranchId? })
verifyTenbisAccount(orderId): Promise<{ ok: true } | { ok: false; error: string }>
markInstructed(orderId)
deliverToBite(orderId): Promise<...>                        // §7
listTenbisProvisioning(): Promise<Row[]>                    // the §3.2 list
instructionsFor(orderId): Promise<string>                   // the standard message
```

A saved password moves the row to `entered` and clears `verified_at` — changed
credentials are unproven credentials.

### `src/lib/tenbis-api.ts` — the 10bis client

Only one call is needed for this feature:

```
GET https://www.10bis.co.il/api/reshome/v2/reshomeservice.svc/LogIn/{user}/{password}/{resId}/{reqId}
```

- `reqId` = `crypto.randomUUID().replace(/-/g,"").slice(0,16)` — fresh per call.
- `Accept: application/json`.
- Response `{ Success, ErrorCode, ErrorDesc, Data }`.
- Token is in one of three places — `Token ?? Data.Token ?? Data.TokenID` — but
  for verification we only care that `Success` is true.
- Surface `ErrorDesc` to the agent; it is already Hebrew.
- Timeout it (`AbortSignal.timeout(10_000)`) — this runs inside a request.

Every `??` chain above is a variation 10bis has actually been observed to
produce. Do not tidy them.

### API routes

```
GET    /api/agent/orders/[id]/tenbis          current state, no password
POST   /api/agent/orders/[id]/tenbis          save
POST   /api/agent/orders/[id]/tenbis/verify   log in to 10bis
POST   /api/agent/orders/[id]/tenbis/instruct mark instructed, return the message
POST   /api/agent/orders/[id]/tenbis/deliver  push to Bite
```

`runtime = "nodejs"`, `dynamic = "force-dynamic"`, Hebrew JSON errors, matching
the existing routes in `src/app/api/agent/`.

---

## 7. Delivery into Bite — and the one thing missing

The operational system is a **different Supabase project**:
`kehxjxgtirztorakgfuy`, holding `tenbis_branch_config (branch_id, tenbis_user,
tenbis_password, restaurant_id, updated_at)`.

There is already a proven pattern for this in the repo — `src/lib/crm.ts`
reaches BITECRM2026 with its own service key, server-only, off when unset. Copy
that shape exactly:

```ts
// src/lib/bite.ts
biteConfig()   // BITE_SUPABASE_URL / BITE_SUPABASE_SERVICE_ROLE_KEY, or null
biteEnabled()
createBiteClient()
```

Delivery is an upsert into `tenbis_branch_config` on `branch_id`, then
`state = 'delivered'`, `delivered_at = now()`.

### Finding the branch id — checked, and mostly solved

EZORDERS itself holds no Bite branch id, and a customer's second branch is
modelled as a second quote with identical customer details. But the CRM does
hold one, and better than expected. Measured on the live CRM:

| Source | Rows | Usable |
|---|---|---|
| `bite_branches_cache (bite_branch_id, bite_franchise_id, franchise_name, branch_phone)` | 1,170 branches over 700 franchises | **1,151 carry a phone — 98%** |
| `customers.branch_number` | 1,029 customers | only 84 filled — 8%, too sparse to rely on |

So the lookup is: **EZORDERS `orders.customer_phone` → `bite_branches_cache.branch_phone`
→ `bite_branch_id`.** Normalise both sides before comparing — strip everything
but digits and drop a leading zero, since one side is hand-typed by an agent.

Build it as **suggest, then confirm**, not as silent resolution:

- One match → show it with the franchise name and let the agent confirm.
  Writing another system's credentials to a branch guessed from a phone number
  is not something to do without a person looking at it.
- Several matches, or none → the agent picks or pastes the id. A chain with
  four branches on one switchboard number is the normal case, not the edge.
- The confirmed id is stored on `tenbis_accounts.bite_branch_id`, so the guess
  happens once and the record afterwards is a fact, not a heuristic.

Reaching the CRM needs no new secret — `CRM_SUPABASE_URL` and
`CRM_SUPABASE_SERVICE_ROLE_KEY` are already in Vercel and `src/lib/crm.ts`
already wraps them.

If the lookup misses, delivery stays manual for that order and everything else
in the feature still works. Do not let it block steps 1–6.

---

## 8. Tests

`npm test`. The ones that must exist:

- **Crypto**: round-trips; ciphertext differs across calls for the same input
  (the IV is doing its job); a tampered tag fails to decrypt.
- **The password never leaves**: call every GET route's handler and assert no
  response body contains the plaintext. This is the bug being avoided — assert
  it, do not eyeball it.
- **RLS is the boundary**: query `tenbis_accounts` as a second agent who does
  not own the order and get nothing back. Test against the policy, not the
  route — a route check would pass while the policy was missing.
- **State transitions**: saving a new password drops `verified`; a failed verify
  records `last_error` and does not clear the credentials.
- **10bis client**: `Success:false` maps to its `ErrorDesc`; a non-200 does not
  throw past the route as a 500.

`npm run typecheck` and `npm run lint` clean.

---

## 9. Build order

Each step is useful on its own, which is deliberate — if we stop after any of
them, what exists still works.

1. Migration + crypto module + their tests. Nothing visible yet.
2. `tenbis-api.ts` with the login call, and a test against a stubbed fetch.
3. `lib/agent/tenbis.ts` + the GET/POST/verify routes.
4. The order-page panel (§3.1). **At this point the feature is already worth
   having** — credentials captured, verified, attached to the sale.
5. The provisioning list (§3.2).
6. The instructions message.
7. The branch lookup against the CRM cache, as suggest-and-confirm.
8. `lib/bite.ts` and the delivery write.

---

## 10. Decisions to settle before step 7

- ~~Does the CRM hold the Bite branch id?~~ **Checked: yes.** bite_branches_cache,
  1,170 branches, 98% with a phone. Match on phone, confirm with a person (§7).
- Who sets `TENBIS_ENC_KEY` in Vercel, and is there an existing key-rotation
  practice to match?
- Should delivery to Bite be a button, or automatic on verify? Button, unless
  there is a reason — automatic writes to another system on a keystroke.
- Is one 10bis account ever shared across several branches? `tenbis_tokens` in
  Bite is keyed by restaurant id and shared, which assumes it can be. If so, the
  same credentials may legitimately land on two orders.
