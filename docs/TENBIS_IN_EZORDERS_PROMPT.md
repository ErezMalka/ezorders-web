# PROMPT — the תן ביס (10bis) integration, in EZORDERS

Paste this whole file as the first message of a fresh session opened on
`C:\Projects\ezorders-web`.

Everything below was read on 2026-09-19 out of live code and live schemas —
`ezorders-web`, `NEW-CLIENT`, `Bite-CRM`, and the Supabase projects
`mhfzhxojqauxbsteajje` (EZORDERS) and `kehxjxgtirztorakgfuy` (Bite/NEW-CLIENT) —
and re-verified against source. You should not need to rediscover any of it.

---

## THE TASK

Add the תן ביס (10bis) integration to EZORDERS.

**Read §1 before writing anything.** "Add the integration" turns out to mean one
of three quite different builds, and the evidence points at one of them. Settle
it with the user first — the wrong choice here is weeks, not hours.

---

## 1. WHAT "ADD THE INTEGRATION" ACTUALLY MEANS — settle this first

### The thing that already exists

In `NEW-CLIENT` there is a complete, deployed 10bis integration: three edge
functions, two tables, an orders tab. It pulls a **restaurant's food orders**
from 10bis and shows them to that restaurant's own staff, per branch,
authenticated by a Bite session.

### Why it cannot simply be copied into EZORDERS

EZORDERS is not that kind of system. Verified from its schema and code:

- Its users are **agents**, not restaurants — `agents` table, roles
  `agent | manager | admin`, sign-in at `/he/agent/login`.
- Its `orders` table is a **sales** order: `setup_total`, `monthly_total`,
  `term_months`, `setup_started_at`, `went_live_at`, `status` of
  `pending_setup | in_setup | live`. It is a POS package somebody bought. It is
  not a food order and there is no food-order concept anywhere in the schema.
- There is **no branch, tenant or restaurant-staff model**. Nothing for a
  per-branch order feed to hang off, and nobody to show it to.

Copying the orders tab here would mean inventing a restaurant-facing product
inside a sales portal. That may be what is wanted, but it should be said out
loud rather than arrived at by accident.

### What EZORDERS already does with 10bis

`tenbis` is already a **sellable product** in EZORDERS. Verified:

```
key      label      item_group     setup    monthly   is_active
tenbis   תן ביס     integrations   95.00    85.00     true
wolt     וולט       integrations   95.00    85.00     true
mishloha משלוחה     integrations   95.00    85.00     true
```

And the full commercial chain, end to end, is:

1. **EZORDERS** — an agent puts `tenbis` on a quote (₪95 setup + ₪85/month).
2. Quote → contract → signed → paid through GROW.
3. `src/lib/agent/crm-sync.ts` pushes the signed contract into **Bite-CRM** as an
   order, which fires the CRM's onboarding triggers.
4. **Bite-CRM** raises onboarding tasks, and one of them is literally the manual
   step — from `20260524160000_onboarding_checklist_v2.sql`:
   > `להעביר ללקוח את ההודעה המובנית עם הנחיות להקמת ממשק תן ביס`

   plus test tasks for the website and the kiosk.
5. Somebody then gets the customer's 10bis username, password and restaurant id
   into **NEW-CLIENT's** `tenbis_branch_config` (or into Bite's own
   `CashRegisterParams`). **This step is entirely manual and nothing links it
   back to the sale.**
6. NEW-CLIENT polls 10bis and shows the orders.

**Step 5 is the hole.** A thing is sold in EZORDERS, and the credentials that
make it work are typed in somewhere else by hand, with no record in the system
that sold it.

### The three readings

| | What it is | Fits EZORDERS? |
|---|---|---|
| **A. Provisioning** | Collect the customer's 10bis credentials as part of the sale/onboarding and deliver them to the operational system, closing step 5 | **Yes** — this is the job EZORDERS already does, and the gap is real |
| **B. Commercial only** | Better handling of `tenbis` as a product — bundling, pricing, the standard instructions message | Yes, but small; most of it already exists |
| **C. Operational** | Run the restaurant's 10bis order feed inside EZORDERS | Needs a restaurant/branch/tenant model EZORDERS does not have |

**Recommend A**, and say why: it is the only one that closes a gap the evidence
shows is actually open, and it is the shape of what EZORDERS already is.

Ask the user to confirm A, B or C before building. If C, say plainly that it
needs a tenant model first and is the largest of the three.

---

## 2. EZORDERS ARCHITECTURE — match these conventions

Next.js App Router (`next` 14), TypeScript, Supabase. Hebrew-first, RTL.

```
src/app/(he)/he/agent/...   the portal: quotes, contracts, orders, products, team
src/app/api/agent/...       its API routes
src/lib/agent/...           server-only business logic (session, quotes, orders, crm-sync)
src/lib/supabase/           server.ts, client.ts, env.ts
```

**Auth** — `src/lib/agent/session.ts`:

```ts
getAgentSession()        // AgentSession | null; verifies with getUser(), not getSession()
requireAgentSession()    // redirects to login, and bounces a forced password change
requireAdminSession()    // admins only
```

`AgentSession` carries `{ id, email, fullName, role, isManager, isAdmin,
mustChangePassword }`. A user who authenticates but has no `agents` row, or is
`is_active = false`, is treated as signed out.

**The security model is RLS, and it is better than the one you are porting
from.** Straight from `src/app/api/agent/products/route.ts`:

> The admin check here is a courtesy, not the boundary: this route runs as the
> caller's own Supabase session, so the RLS policy on `public.products` is what
> actually decides.

Three clients exist — `createSupabaseServerClient()` (the caller's session, the
default and correct choice), `createSupabaseAnonClient()`, and
`createSupabaseAdminClient()` (service role). **Reach for the admin client only
where you can say in a sentence why RLS cannot express the rule.** The
NEW-CLIENT 10bis functions are all service-role with hand-rolled checks; do not
bring that pattern here.

Route conventions: `export const runtime = "nodejs"`, `export const dynamic =
"force-dynamic"`, JSON errors in Hebrew with the right status.

Commands: `npm run typecheck`, `npm run lint`, `npm test`.

---

## 3. THE CROSS-PROJECT PROBLEM — the crux of option A

EZORDERS and the operational system are **different Supabase projects**:

| | Project ref | Holds |
|---|---|---|
| EZORDERS | `mhfzhxojqauxbsteajje` | agents, quotes, contracts, orders, products |
| Bite / NEW-CLIENT | `kehxjxgtirztorakgfuy` | `tenbis_branch_config`, `tenbis_tokens` |

So "store the credentials" has to answer: stored where, and how do they travel?

Three options, and this is a real design decision:

1. **EZORDERS stores them, Bite pulls.** A table here, and NEW-CLIENT reads it
   when a branch has no local config. Adds a cross-project dependency to the
   order path — the thing that runs every 60 seconds.
2. **EZORDERS pushes into Bite.** Write into `tenbis_branch_config` over the
   Bite project's API at provisioning time. Needs that project's service key in
   EZORDERS, which is a serious secret to hold, and needs the Bite `branch_id`
   — which EZORDERS does not know (see §6).
3. **EZORDERS collects and hands off.** Store here, expose to whoever runs
   onboarding, and let the existing manual step become a copy-paste from a
   screen instead of from an email. Least coupling, least automation.

There is a fourth consideration that may decide it: **credentials must not be
stored in plaintext anywhere** (§5.2). Whichever option, encrypt at rest and
never return the password to a browser.

---

## 4. THE 10bis PROTOCOL

Only needed if you are validating credentials or building option C.

Base: `https://www.10bis.co.il/api/reshome/v2/reshomeservice.svc`

Path-parameter calls, no API key. `Accept: application/json`. Every response is
`{ Success, ErrorCode, ErrorDesc, Data }`. `reqId` is a fresh 16-char hex per
call — `crypto.randomUUID().replace(/-/g,"").slice(0,16)`.

| Call | Shape |
|---|---|
| Login | `GET /LogIn/{user}/{password}/{resId}/{reqId}` |
| Today's orders | `GET /GetTodaysOrders/{token}/All/{reqId}` |
| One order's detail | `GET /GetSingleOrder/{lookupId}/{token}/{reqId}` |
| Change status | `POST /changestandardorderstatusandsetmetadata/{poolId}/{newStatus}/{token}/{reqId}` |

- Login token comes back in one of three places:
  `data.Token ?? data.Data?.Token ?? data.Data?.TokenID`.
- `lookupId` is `PoolID` when present and non-zero, else `OrderID`.
- `GetTodaysOrders` does **not** include dish lines — only `GetSingleOrder` does.
- `newStatus` must be `2` (InProcess) or `3` (OutForDelivery).
- Error `701` / `704` mean the token expired: force a re-login, retry once.
- Statuses: `1` ממתינה · `2` בטיפול · `3` בדרך · `4` בוטלה · `5` בטיפול תן-ביס
- Delivery method: `1` delivery, `2` takeaway.
- Tokens are cached for 2 hours, keyed by restaurant id.

**A credential check is one call:** `LogIn` with the three fields. `Success:
true` means they work. That is the cheapest possible win for option A — the
agent finds out on the spot instead of three weeks later during onboarding.

Reference implementation to copy from, already written and typechecked:
`C:\Projects\NEW-CLIENT\docs\TENBIS_INTEGRATION_PORT_PROMPT.md` §5, and the
source at `NEW-CLIENT/supabase/functions/tenbis-{config,orders,order-action}/`.

---

## 5. DO NOT REPRODUCE THESE

Both are live in NEW-CLIENT today and both would be trivially inherited by a
copy-paste port.

### 5.1 No authorization on the branch

All three NEW-CLIENT functions verify the caller holds *a* valid Bite session
and then take `branchId` from the request body without checking they are
entitled to it — the `GetCurrentUser` response is fetched and discarded
(verified: zero calls to `authCheck.json()` across all three files). Any
authenticated user can read any restaurant's 10bis credentials and move its
orders.

In EZORDERS this maps to: never trust an identifier from the request body.
Express the rule in RLS and let the caller's own session hit it.

### 5.2 Passwords in plaintext, and readable

`tenbis_branch_config.tenbis_password` is stored as given, and the config
endpoint selects it and returns it to the browser.

Here: encrypt at rest, and never return it. Return `{ hasPassword: boolean }`
and accept writes only. If an agent needs to know whether it is set, that is a
boolean; if they need to know it works, that is a `LogIn` call (§4), not a
readback.

---

## 6. THE MISSING LINK — worth surfacing early

For anything to reach the operational system automatically, EZORDERS must know
**which Bite branch** a sold order corresponds to. It does not.

EZORDERS identifies a customer by `customer_name`, `customer_phone`,
`customer_tax_id`. `tenbis_branch_config` is keyed by Bite's integer
`branch_id`. Nothing in EZORDERS holds one, and `crm_product_map` maps products,
not customers.

This is not an oversight to be patched with a column — the schema has **no**
branch, tenant, restaurant or franchise column anywhere (checked against
`information_schema`: zero matches). A multi-branch customer is handled
commercially instead, as separate quotes; from `QuoteActions.tsx`:

> the common case is a second branch of the same customer, or a variation the
> agent wants to send alongside the first

So two branches of one restaurant are two quotes with the same customer details
and no identifier distinguishing which branch is which. Any automatic delivery
of credentials has to invent that identity somewhere.

So option A needs one of: a Bite branch id captured during onboarding, a lookup
through Bite-CRM (which does find customers by tax id or phone — see
`crm-sync.ts`), or an explicit decision that the handoff stays manual (option 3
in §3). **Raise this before estimating.**

---

## 7. DEFINITION OF DONE

For option A, the recommended build:

1. An agent on an order that includes the `tenbis` product can enter the
   customer's 10bis username, password and restaurant id.
2. Pressing check validates them against 10bis `LogIn` and says plainly whether
   they work.
3. The password is encrypted at rest and appears in no HTTP response — assert
   this in a test, not by eye.
4. Another agent who should not see that order cannot read or write its
   credentials, and this is enforced by **RLS**, not by a check in the route.
   Test it by querying as the wrong agent.
5. Whoever runs onboarding can get the credentials to where they are needed, by
   whichever of §3's routes was chosen — and that choice is written down.
6. `npm run typecheck` and `npm test` clean.

---

## 8. UNKNOWNS — verify against a real 10bis account

Nothing in the existing code answers these; it guesses at all of them:

- Does `GetTodaysOrders` include cancelled (status 4) orders?
- What is `Choices` shaped like? The code tries `Name`, `ChoiceName`,
  `OptionName` — three guesses at one field.
- Is the token really valid for 2 hours, or was that defensive?
- Are there statuses beyond 1–5? Unknown values fall through to the raw number.
- What is `TenbisVendor`? Parsed from `CashRegisterParams`, never used.
- Does a 10bis account cover one restaurant or several? `tenbis_tokens` is keyed
  by restaurant id and shared across branches, which assumes one.
