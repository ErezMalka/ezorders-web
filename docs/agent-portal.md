# Agent portal — `/he/agent`

An agent picks a package from the price list, fills in the customer, and gets a
branded quote they can send. The customer reads it at their own link and answers
there; a yes becomes an order, which the portal then tracks through installation
to go-live.

    quote   draft → sent → viewed → accepted / rejected / expired
    order                   pending_setup → in_setup → live
                                          ↘ cancelled

The document the customer reads is grouped by WHEN money is paid rather than by
which part of the calculator produced it: setup once, monthly for the term, and
hardware bought outright. A component with both a setup and a monthly fee appears
in two blocks with the relevant half of its price in each — showing ₪490 and ₪350
on one row invites the reader to add them together.

The portal is additive: with no Supabase configuration the marketing site builds
and behaves exactly as it did before, and `/he/agent/login` renders a
"not configured" notice rather than a form that cannot work.

## Setup

**1. Create the schema.** Run the migrations in `supabase/migrations/` in order
— Supabase dashboard → SQL Editor, or `supabase db push`. Files 0002 and 0003
are each split by a `0002a` / `0002b` marker comment: Postgres will not let a new
enum value be used in the transaction that created it, so run the halves
separately.

**2. Set the environment variables** listed under "Agent portal" in
`.env.example`, in Vercel → Project Settings → Environment Variables. Add them
to Production *and* Preview, or preview deploys will show the notice.

**3. Create the first admin — by hand, once.** Supabase Auth owns the password;
the `agents` row owns the name and the role. Both are needed: a user with no
`agents` row is treated as signed out.

Dashboard → Authentication → Users → *Add user* (set a password, tick
*Auto Confirm User*), then in the SQL editor:

```sql
insert into public.agents (id, full_name, email, role)
select id, 'ניר שרון', email, 'admin'
  from auth.users where email = 'nir@ezorders.com';
```

This is the only account that needs SQL. Everyone after them is added from
**/he/agent/team**.

## Orders

A quote the customer accepts becomes an order, and the two are deliberately not
the same row.

**An order is a copy, not a join.** Every figure is written onto the order at
acceptance rather than read back through `quote_id`. The quote's lines were
already frozen at issue time; freezing the order too means a later correction to
the quote — a fixed typo, a re-send — cannot quietly change what was sold.

**Acceptance is evidence, and it lives apart.** `public.quote_responses` records
who pressed the button: the name and company id they typed, when, from which
address, with which browser, and the SHA-256 of the exact document they were
looking at. The hash is the part that matters. A drawn signature proves very
little; a hash proves the document has not changed since it was agreed, which is
the claim anyone would actually dispute. Recompute the document from the frozen
lines, hash it, compare. Rejections go in the same table with their reason,
because a no is worth as much to a sales team as a yes.

**Two ways in, and the screen says which.** The customer presses the button on
their own link (`channel = 'customer'`, full evidence). Or the deal closes on a
telephone call and the agent records it from the quote screen (`channel =
'agent'`, no signer, no hash, no address — the order page says "recorded by
&lt;agent&gt;" rather than implying anybody signed). Refusing the second would
have meant the orders list quietly under-counting the business, and a report
nobody trusts stops being read.

**Answering twice is harmless.** A reload, or a double-tap on a slow phone,
returns the existing order rather than creating a second one — `quote_responses`
has one row per quote and the function is written to be idempotent.

**Timestamps are the database's job.** A trigger stamps `setup_started_at` and
`went_live_at` from the status itself, so a screen that forgets to send one
cannot leave the column empty forever.

## Roles

| role | sees | can also |
|---|---|---|
| `agent` | their own quotes | — |
| `manager` | every agent's quotes | — |
| `admin` | every agent's quotes | manage the team |

An admin adds a colleague, sets a starting password, changes roles, resets a
forgotten password, and deactivates whoever has left. Deactivation takes effect
on that person's next request and leaves their quotes intact, which is why it is
the right move rather than deletion.

**The last admin is protected.** A database trigger refuses to demote or
deactivate the only remaining active admin — that mistake is a single click away
and cannot be undone from inside the product.

**A password an admin sets is temporary by construction.** The account is
flagged, and `requireAgentSession()` bounces it to `/he/agent/password` until a
new one is chosen. Every protected page goes through that function, so there is
no route that quietly skips the check.

The password is shown once, in the clear, with a copy button. That is
deliberate: it is about to be read out over the phone, and hiding it only means
it gets screenshotted instead. The forced change is what limits the exposure.

## How it works

**Prices come from one place.** `src/lib/pricing.ts` holds `PRICING_CONFIG` and
`computeQuote`. `/he/price` and the portal both call it, so they cannot disagree.
Editing a price is a one-line change there.

**The client never sends money.** The browser POSTs which components were
selected; the server looks the prices up and `recalc_quote()` recomputes the
totals in Postgres. The figures on screen are a preview. A tampered request can
order a different package, never the same one cheaper.

**RLS decides who sees what.** An agent sees their own quotes, a manager sees
everyone's — enforced in the database, so a missing `WHERE` clause in future
code cannot leak one agent's pipeline to another.

**One document template.** `src/lib/agent/quote-html.ts` renders the quote as a
standalone HTML document, used by both the agent's print view and the customer's
link. The agent cannot approve one thing and the customer receive another.

## Getting a PDF

The agent opens **תצוגה מקדימה והורדה כ-PDF**, which serves the document at
`/he/agent/quotes/<id>/print`, then prints to PDF (Ctrl/Cmd+P → *Save as PDF*).
The page carries `@page { size: A4 }` and print rules that keep the totals block
and each table row from breaking across pages.

This is browser printing rather than a server-rendered PDF, for two reasons.
Hebrew needs proper bidi text shaping, and a real browser is the one engine
guaranteed to get it right. And generating PDFs on Vercel means bundling a
headless Chromium (`@sparticuz/chromium` + `puppeteer-core`), which is a large,
fragile dependency to carry for a document the agent is looking at anyway.

If a PDF *attachment* becomes a requirement — some customers want a file, not a
link — that is the point to add the dependency. The document template already
returns a complete HTML string, so the route is a thin wrapper: render
`renderQuoteDocument(...)`, `page.setContent`, `page.pdf`. Nothing else changes.

## Sending

**Email** goes through Resend, the same provider the contact form already uses,
so `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` cover it. Replies go to the agent.

**WhatsApp** returns a `wa.me` link with the message pre-filled for the agent to
send. Sending from a server needs the WhatsApp Business API and an approved
template; until that exists, handing the agent a ready message is the honest
version of the feature.

Both send a **link** rather than a file. A link records that the customer opened
it — which is the question an agent actually asks before following up — and lets
a corrected quote replace the old one at the same address.

## The customer's link

`/q/<token>`, where the token is 24 random bytes. No account, no login: a
customer will not sign up to read a price, and a link they can forward to their
partner is a feature.

The token is never used to query the table. It goes to `quote_by_token()`, a
security-definer function that returns only display fields, refuses quotes still
in draft, and records the view. A guessed token learns nothing about any other
quote, and "no such quote" and "not sent yet" return the same page so a caller
cannot probe for which tokens exist.

## Things worth knowing before you change something

**The discount comparison is strict `>`.** Exactly ₪1,000 of eligible monthly
earns 20%, not 25%. This is pinned by `test/pricing.test.mjs` and mirrored in
`quote_discount_for()` in SQL. Changing one without the other splits the price
the website quotes from the price the database stores.

**Quote lines are frozen at issue time.** Labels and prices are copied onto
`quote_items`, not referenced. A quote sent last month keeps last month's price
even after the price list changes — which is what makes it a quote.

**VAT and the term are stored per quote.** Changing the default is never
retroactive.

**Expired quotes are swept nightly.** `expire_stale_quotes()` runs at 00:10 UTC
via pg_cron — see 0006. Check it with `select jobname, schedule, active from
cron.job`. Without it the pipeline figure only ever climbs.

## The catalogue

**Products live in `public.products`, editable from /he/agent/products.** Admins
only — the write policy checks `is_admin()`, because prices are the one thing an
agent must not be able to change. Adding a product there makes it sellable in the
quote builder and, unless `show_on_website` is off, visible on `/he/price`.

**`src/lib/pricing.ts` is still shipped, as the fallback.** Everything reads the
database first and drops to the file if the table is empty or the read fails.
That is load-bearing rather than defensive: the marketing site is built to work
with no Supabase configuration at all, and a price list that goes blank during an
outage is worse than one that is briefly out of date. The table was seeded with
exactly the values the file holds, so the two agreed on the day this shipped —
and the file is where the fallback prices should be kept current.

**The public list is read with a session-less client.** `createSupabaseAnonClient`
exists because reading cookies would make `/he/price` dynamic, and that page is
meant to be pre-rendered and revalidated on a timer (`revalidate = 60`). If you
ever switch it back to the session client, the page silently stops being cached.

**Products are retired, never deleted.** A stored quote refers to a product by
key; removing the row would erase the only record of what that key meant.

**Physical goods are a third kind of money.** `hardware` items are one-time like
setup but charged and presented apart from it, never earn a discount, and carry
no monthly price — a recurring charge on an object is a rental, which is a
different product and a different contract. `quotes.hardware_total` and
`orders.hardware_total` hold the figure; the line's own price lives in
`setup_unit`, so no new column was needed on `quote_items`.

**Two numbers are still mirrored in SQL** because the database computes the
totals: the tiers in `pricing_discount_tiers`, and the base setup fee in
`pricing_settings`. Changing either means changing it in both places.

**The base setup fee used to be a function argument.** It is not any more, and
that was a real hole rather than a tidy-up: `recalc_quote(quote, base_setup)` was
security definer and granted to `authenticated`, and Supabase exposes every such
function at `/rest/v1/rpc/`, so an agent could reprice their own quote ₪1,950
cheaper with one request and nothing in the audit trail would look odd. See
0007.

**Supabase's default privileges are more generous than any migration.** A real
project ships with

    alter default privileges in schema public
      grant all on tables, functions, sequences to anon, authenticated, service_role;

so every `revoke ... from public` written in 0001 and 0003 did nothing: anon —
whose key is in the JavaScript of every page — held full DML on every portal
table and could execute every function, `expire_stale_quotes()` included. 0004
and 0005 close that, `test/sql/20_privileges.sql` pins it, and
`test/sql/00_supabase_stub.sql` now carries the same default privileges so the
test database stops being more permissive than production. **If you add a table
or a function to `public`, assume anon can reach it until you have revoked it and
added an assertion.**

## Testing

`test/sql/run.sh` replays every migration onto a scratch Postgres and runs two
suites: `10_orders.sql` walks the acceptance lifecycle through the same functions
the application calls, and `20_privileges.sql` asserts who may reach what. Both
raise on the first failure, so a clean run is a pass.

    createdb -h /path/to/socket scratch && test/sql/run.sh scratch
