-- ─── תן ביס: from sold to working ─────────────────────────────────────────────
--
-- The portal has been able to sell the תן ביס integration since the catalogue
-- was written — ₪95 setup, ₪85 a month, sitting in the integrations group
-- beside wolt and mishloha. What it has never been able to do is deliver one.
--
-- Today the contract syncs to the CRM, the CRM raises a task that says "send
-- the customer the standard instructions", the customer eventually receives a
-- username and password from תן ביס, and somebody types those into the
-- operational system by hand. Nothing connects the credentials back to the
-- order that sold them, so nobody can answer "what have we sold and not
-- delivered" — the question this table exists to make answerable.
--
-- One row per order, created on the first save rather than for every order that
-- ever carried the product: the absence of a row IS the 'sold' state, and the
-- provisioning list left-joins for it. That keeps the table the size of the
-- work actually in progress.

create table if not exists public.tenbis_accounts (
  order_id        uuid primary key references public.orders(id) on delete cascade,

  tenbis_user     text        not null default '',
  -- Never the password itself. AES-256-GCM, encrypted and decrypted only by the
  -- server, and never sent to a browser — the implementation this is drawn from
  -- stores it in clear and hands it back on request, which is the single thing
  -- most worth not repeating. See src/lib/agent/tenbis-crypto.ts.
  password_enc    text,
  restaurant_id   text        not null default '',

  -- Bite's integer branch id, which the portal has no way to know: a customer's
  -- second branch is a second quote with identical details. Resolved by
  -- matching the order's phone against the CRM's branch cache and then
  -- CONFIRMED BY A PERSON, so this column holds a fact rather than a guess.
  -- Null until somebody has confirmed it.
  bite_branch_id  integer,

  -- Text with a check rather than an enum, deliberately. Three migrations in
  -- this repo already have to be split in half because Postgres refuses to use
  -- an enum value in the transaction that added it, and test/sql/run.sh carries
  -- the workaround. A state machine that will grow should not cost that every
  -- time; adding a state here is one line and no split.
  state           text        not null default 'sold'
    check (state in ('sold','instructed','entered','verified','failed','delivered')),

  -- What תן ביס said when it last refused. Kept so the agent has something to
  -- act on rather than "failed", and cleared on the next success.
  last_error      text,

  instructed_at   timestamptz,
  verified_at     timestamptz,
  delivered_at    timestamptz,

  updated_by      uuid references public.agents(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.tenbis_accounts is
  'One sold תן ביס integration, from sale to working. Keyed by the order that sold it.';
comment on column public.tenbis_accounts.password_enc is
  'AES-256-GCM, v1.<iv>.<tag>.<ciphertext> in base64. Never returned to a client.';
comment on column public.tenbis_accounts.bite_branch_id is
  'Bite branch id, suggested from the CRM branch cache by phone and confirmed by a person.';

-- The provisioning list asks "everything not yet delivered, worst first", and
-- an agent's own orders are a small slice of the table.
create index if not exists tenbis_accounts_state_idx
  on public.tenbis_accounts (state);

alter table public.tenbis_accounts enable row level security;

-- ── Who reaches a row ────────────────────────────────────────────────────────
--
-- Reached through the order, so the answer is the one orders already gives:
-- the agent who owns it, or any manager. Written as a policy rather than as a
-- check inside a route on purpose — a route check passes while the policy is
-- missing, and the thing being guarded here is another company's credentials.
-- is_manager() is already defined, SECURITY DEFINER, and true for manager and
-- admin on an active agent row.

drop policy if exists tenbis_accounts_all on public.tenbis_accounts;
create policy tenbis_accounts_all on public.tenbis_accounts for all
  using (
    exists (
      select 1 from public.orders o
       where o.id = tenbis_accounts.order_id
         and (o.agent_id = auth.uid() or public.is_manager())
    )
  )
  with check (
    exists (
      select 1 from public.orders o
       where o.id = tenbis_accounts.order_id
         and (o.agent_id = auth.uid() or public.is_manager())
    )
  );

-- Matching what 0004 did for every other portal table: the anon key is in the
-- JavaScript of every page, and it has no business here.
revoke all on public.tenbis_accounts from anon;
grant select, insert, update, delete on public.tenbis_accounts to authenticated;

-- updated_at, the way the rest of the schema does it.
drop trigger if exists tenbis_accounts_touch on public.tenbis_accounts;
create trigger tenbis_accounts_touch
  before update on public.tenbis_accounts
  for each row execute function public.touch_updated_at();
