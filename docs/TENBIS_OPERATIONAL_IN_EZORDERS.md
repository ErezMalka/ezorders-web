# תן ביס inside EZORDERS — running the order feed here

**Status: a plan, not a build. Nothing in this document is implemented.**

The handoff to the Bite operational system is **parked** by decision. Steps 1–8
(the provisioning half) are built and deployed: an agent captures a customer's
10bis credentials on the order that sold the integration, proves them against
10bis on the spot, confirms which Bite branch it is, and delivers them. That
last hop is what is now on hold — and it changes this build's starting position
in a useful way, because the credentials it needs are already here, encrypted,
one row per order in `tenbis_accounts`.

What follows is how the *operational* half would be built in EZORDERS: pulling
a restaurant's food orders from 10bis and showing them to the people who cook
them.

---

## 1. Say plainly what this is

It is a new product surface inside a sales portal. Not an extension of what
EZORDERS does — a second thing it would do.

Verified against the live schema (`mhfzhxojqauxbsteajje`, 17 tables, 5 views):

- Every table is sales-side: `quotes`, `quote_items`, `orders`, `contracts`,
  `contract_payments`, `products`, `agents`. Plus `tenbis_accounts`, which we
  added.
- There is **no customer table at all**. A customer is a set of columns on a
  quote and on an order: `customer_name`, `customer_phone`, `customer_tax_id`.
- There is no branch, tenant, restaurant or franchise column anywhere.
- Every human in the system is an `agent` — roles `agent | manager | admin`.
  There is no such thing as a user who is a customer.

So "show the restaurant its 10bis orders" has, today, no restaurant to show
them to and nobody to log in as. That gap is the build. The feed itself is the
easy part, and the reference implementation for it already exists.

**If that is not wanted, the cheaper reading is §7.**

---

## 2. What already exists to build on

**In this repo, written and tested:**

| Piece | What it gives |
|---|---|
| `src/lib/tenbis-api.ts` | The 10bis client. Today it makes one call, `LogIn`, and classifies the answer into rejected / unreachable. The call-building, the three places a token hides, and the failure classification are all done and covered by a suite that runs against a stubbed fetch. |
| `src/lib/agent/tenbis-crypto.ts` | AES-256-GCM at rest, versioned (`v1.<iv>.<tag>.<ciphertext>`), key passed in rather than read from the environment, tested for real. |
| `tenbis_accounts` | Per order: username, encrypted password, restaurant id, confirmed Bite branch id, state. RLS reaches through to the order. |
| `tenbis_provisioning` | Which sales carry the integration and where each stands. |

**In NEW-CLIENT, as a reference to read and not to copy:**
`supabase/functions/tenbis-{config,orders,order-action}/`, 605 lines, deployed
and working. It is the proof that the feed works. It also carries four defects
that a copy-paste port would inherit — see §6.

---

## 3. The crux: who is this for, and how do they get in

Three ways to give the feed an audience. They differ by an order of magnitude
in cost, and the choice decides everything else in this document.

### A. Restaurant accounts — the full tenant model

New `restaurants`, new `restaurant_users`, a second sign-in path, invitations,
password resets, roles, and RLS rewritten to answer "is this caller staff of
this restaurant" alongside "is this caller the agent who owns this order".

Honest cost: this is the largest thing in this document by a wide margin, and
most of it is not about 10bis at all. Every screen EZORDERS ever shows a
customer afterwards would use it, which is the argument for it — but it should
be built because that is wanted, not as a side effect of an integration.

### B. A signed screen link — **recommended**

No accounts. A branch gets a URL carrying an unguessable token; opening it
shows that branch's live orders. Revoking the token ends access.

This is not an invention: EZORDERS already works this way for customers. A
quote is opened by `quote_by_token`, a contract by its `public_token` — the
established pattern here for "a customer sees a thing without having an
account". Bite does the same for KDS screens (`kds_branch_tokens`,
`get_kds_stations_by_branch_token`).

It fits what a kitchen screen actually is: a tablet on a wall that nobody logs
into, left running. Accounts would be a worse fit even if they existed.

### C. Agents only — no customer access at all

The feed lives inside the agent portal, and an agent looking at a customer's
order can see that customer's 10bis orders. Useful for support ("are orders
arriving?"), useless as a product. Smallest of the three, and it needs no new
identity model at all: `tenbis_accounts` is already keyed by order, and the
order already has an owning agent.

**Recommendation: B, and C on the way there.** C is a few days and immediately
useful to support; B turns it into something a customer can be given. A is a
decision about EZORDERS as a whole and should be taken on its own merits.

---

## 4. Data model for B

```
restaurants
  id                uuid pk
  display_name      text          -- from the order that created it
  tenbis_restaurant_id text       -- 10bis's own id, the natural key on their side
  created_from_order uuid → orders(id)
  created_at, updated_at

restaurant_screens                -- one per physical screen, so one can be revoked alone
  id                uuid pk
  restaurant_id     uuid → restaurants(id) on delete cascade
  public_token      text unique   -- 24 random bytes, url-safe
  label             text          -- "מטבח", "דלפק"
  last_seen_at      timestamptz
  revoked_at        timestamptz
  created_by        uuid → agents(id)

tenbis_orders_cache               -- what 10bis said, and when
  restaurant_id     uuid → restaurants(id) on delete cascade
  tenbis_order_id   text
  pool_id           text
  status            integer
  payload           jsonb         -- the GetSingleOrder body, as given
  fetched_at        timestamptz
  primary key (restaurant_id, tenbis_order_id)
```

`tenbis_accounts` gains `restaurant_id`. The credentials stay where they are —
they were captured per sale and that record is worth keeping — but the feed
reads them through the restaurant, because two branches of a chain can
legitimately share one 10bis account (`tenbis_tokens` in Bite is keyed by
restaurant id and shared, which assumes they can; **unverified — see §8**).

The cache earns its place twice: it is what stops a screen refresh from
becoming a fan-out of API calls (§6.3), and it is what makes a status change
idempotent — the screen can show what it believes and reconcile on the next
poll.

---

## 5. How the feed runs

**Token exchange.** 10bis tokens are valid ~2 hours and are keyed by restaurant
id. Cache per restaurant, not per request. Errors `701` and `704` mean expired:
force one re-login and retry once, then give up and say so.

**Fetching.** `GetTodaysOrders` returns orders without dish lines;
`GetSingleOrder` is needed per order for the lines. Start on demand — a screen
asks, the server fetches what is stale — with a short TTL (15–30s) per
restaurant. A scheduled pull is the obvious next step once more than a handful
of restaurants are live, and the cache table is what makes that a change of
trigger rather than a rewrite.

**Acting.** `changestandardorderstatusandsetmetadata` with `newStatus` 2
(בטיפול) or 3 (בדרך), and nothing else — those are the only two values their
API accepts from us.

**Serving a screen.** One security-definer function that takes the screen token
and returns that restaurant's cached orders — the shape Bite uses for KDS, and
the shape this repo uses for `quote_by_token`. Never a branch or restaurant id
from the request body (§6.1).

Statuses to render: `1` ממתינה · `2` בטיפול · `3` בדרך · `4` בוטלה ·
`5` בטיפול תן-ביס. Delivery method `1` delivery, `2` takeaway.

---

## 6. Four things not to inherit

All four are live in NEW-CLIENT today and all four are one copy-paste away.

**6.1 No authorization on the branch.** All three functions there check that the
caller holds *a* valid Bite session and then read `branchId` straight out of the
request body — the identity response is fetched and discarded. Any
authenticated user can read any restaurant's 10bis credentials and move its
orders. Here: the token or the session decides what you may see, expressed in
RLS or in the function's own lookup, never in an id the caller supplied.

**6.2 Plaintext passwords, readable.** `tenbis_branch_config.tenbis_password` is
stored as given and returned to the browser by the config endpoint. This repo
already does the opposite and must keep doing it: encrypted at rest, never in a
response, `hasPassword: boolean` and a `LogIn` call for "does it work".

**6.3 N+1 fan-out.** `GetTodaysOrders` then a `GetSingleOrder` per order, on
every screen load. That is what `tenbis_orders_cache` is for.

**6.4 Today only.** `GetTodaysOrders` is the only listing call their API offers,
so yesterday does not exist. If a history is wanted, the cache is the only place
it can come from — which is an argument for writing every fetch into it from
day one, even while the screen only shows today.

---

## 7. If §3's audience question is not wanted yet

Reading C alone — the agent-facing view — needs none of §4. `tenbis_accounts`
already holds the credentials, keyed by an order that already has an owning
agent, and RLS already answers who may see it. A single server component on the
existing order page, calling `GetTodaysOrders` with the stored credentials,
would answer the support question ("are their orders arriving?") in an
afternoon.

It is also the honest first step toward B: the same fetching, caching and
status code lives in `src/lib/tenbis-*`, and B adds an audience rather than a
mechanism.

---

## 8. Verify against a real account before building

Nothing below is answered by the existing code — it guesses at all of them, and
the guesses are load-bearing here in a way they were not for a credential check.

- Does one 10bis account cover several branches? **This decides whether
  `restaurants` is one row per branch or per chain.**
- Does `GetTodaysOrders` include cancelled (status 4) orders?
- What is `Choices` shaped like? The reference tries `Name`, `ChoiceName`,
  `OptionName` — three guesses at one field.
- Is the token really valid for two hours, or was that defensive?
- Are there statuses beyond 1–5?
- What is `TenbisVendor`? Parsed from Bite's `CashRegisterParams`, never used.

The provisioning flow already built is the cheapest way to answer most of these:
the first real customer credentials that pass verification can answer every
question on this list in one sitting.

---

## 9. Definition of done, for B

1. An agent can create a restaurant from an order that bought תן ביס, and mint
   a screen token for it.
2. Opening that link on a tablet shows today's orders with their dish lines,
   refreshing on its own, with no login.
3. A screen can move an order to בטיפול and to בדרך, and 10bis agrees.
4. A revoked token stops working immediately.
5. One restaurant's screen cannot reach another's orders — tested by asking for
   them with the wrong token, not by reading the code.
6. The password is never in a response and never in a log, asserted in a test.
7. A screen refresh costs no 10bis call when nothing is stale.
8. `npm run typecheck`, `npm run lint`, `npm test` clean.
