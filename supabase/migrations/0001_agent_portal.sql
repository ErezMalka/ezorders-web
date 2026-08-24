-- ════════════════════════════════════════════════════════════════════════════
--  EZOrders agent portal — schema
--
--  Agents authenticate against Supabase Auth. This is a store of its own,
--  separate from the CRM's users table: the people who quote from the website
--  are not necessarily the people who work the CRM, and coupling the two would
--  make the website's login depend on the CRM's availability.
--
--  A row in public.agents extends auth.users with the role and the display name
--  that appear on a quote. Auth handles the password, the reset flow and the
--  session; this table handles who the agent IS.
--
--  MONEY IS COMPUTED SERVER-SIDE. The client sends the package selection, never
--  a price. Totals are derived here by recalc_quote() from the line rows, so a
--  doctored request body cannot produce a cheaper quote. The line rows in turn
--  are written from src/lib/pricing.ts by the API route. Both sides implement
--  the same rules; the tier table below is the SQL half.
-- ════════════════════════════════════════════════════════════════════════════

-- ── enums ───────────────────────────────────────────────────────────────────
create type quote_status as enum (
  'draft',      -- saved, not yet sent
  'sent',       -- delivered to the customer
  'viewed',     -- the customer opened the link
  'accepted',
  'rejected',
  'expired'
);

-- Which section of the calculator a line came from. Persisted per line so a
-- stored quote re-renders exactly as it was presented, even if a component
-- later moves between groups.
create type quote_item_group as enum (
  'core',            -- POS / website / kiosk        → counts toward the discount
  'addon_included',  -- loyalty / EzWallet / feedback → counts toward the discount
  'addon_excluded',  -- BIT / Apple Pay / 3DS        → never discounted
  'mobile_app'       -- branded app                  → never discounted
);

create type agent_role as enum ('agent', 'manager');


-- ── agents ──────────────────────────────────────────────────────────────────
create table public.agents (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  email       text        not null unique,
  phone       text,
  role        agent_role  not null default 'agent',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.agents is
  'Sales agents for the website portal. One row per auth.users row.';

-- Used by every RLS policy below, so it must not itself be subject to RLS —
-- hence security definer with a pinned search_path.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.agents
     where id = auth.uid() and role = 'manager' and is_active
  );
$$;

create or replace function public.is_active_agent()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.agents where id = auth.uid() and is_active
  );
$$;


-- ── discount tiers ──────────────────────────────────────────────────────────
-- The SQL half of the rule in src/lib/pricing.ts. Kept as a table rather than
-- inline constants so the two can be diffed, and so a tier change is a data
-- change rather than a deploy.
create table public.pricing_discount_tiers (
  threshold numeric(12,2) primary key,
  pct       numeric(5,2)  not null
);

insert into public.pricing_discount_tiers (threshold, pct)
values (2000, 40), (1500, 30), (1000, 25), (600, 20);

-- STRICT greater-than, matching getDiscount() in src/lib/pricing.ts:
-- exactly 600 earns nothing, exactly 1000 earns 20%, exactly 2000 earns 30%.
-- Changing this to >= silently reprices every package on a boundary.
create or replace function public.quote_discount_for(p_eligible numeric)
returns numeric
language sql
stable
as $$
  select coalesce((
    select pct
      from public.pricing_discount_tiers
     where p_eligible > threshold
     order by threshold desc
     limit 1
  ), 0);
$$;


-- ── quotes ──────────────────────────────────────────────────────────────────
create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  quote_number  text not null unique,                  -- Q-2026-0001

  agent_id      uuid not null references public.agents(id) on delete restrict,

  -- The customer. Free text rather than a foreign key: the website has no
  -- customer table of its own, and a quote must survive the customer record
  -- being renamed or removed in whatever system it came from.
  customer_name     text not null,
  customer_contact  text,
  customer_phone    text,
  customer_email    text,
  customer_tax_id   text,

  -- ── money, all pre-VAT and all written by recalc_quote() ──
  currency              text          not null default 'ILS',
  setup_total           numeric(12,2) not null default 0,
  monthly_eligible      numeric(12,2) not null default 0,
  discount_percent      numeric(5,2)  not null default 0,
  discount_amount       numeric(12,2) not null default 0,
  monthly_non_eligible  numeric(12,2) not null default 0,
  monthly_total         numeric(12,2) not null default 0,

  -- Stored per quote, so a rate change is never retroactive.
  vat_percent   numeric(5,2) not null default 18,
  term_months   integer      not null default 12,

  valid_days    integer not null default 14,
  valid_until   date    not null,
  notes         text,

  -- ── lifecycle ──
  status            quote_status not null default 'draft',
  sent_at           timestamptz,
  sent_channel      text,
  first_viewed_at   timestamptz,
  last_viewed_at    timestamptz,
  view_count        integer not null default 0,
  responded_at      timestamptz,

  pdf_path          text,
  pdf_generated_at  timestamptz,

  -- The customer-facing link. 24 random bytes: long enough that the URL is the
  -- capability, so the customer needs no account to read their own quote.
  public_token  text not null unique default encode(gen_random_bytes(24), 'hex'),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,

  constraint quotes_discount_range check (discount_percent between 0 and 100),
  constraint quotes_vat_range      check (vat_percent between 0 and 100),
  constraint quotes_term_positive  check (term_months > 0),
  constraint quotes_valid_positive check (valid_days > 0),
  constraint quotes_customer_named check (length(btrim(customer_name)) > 0)
);

create index quotes_agent_idx   on public.quotes(agent_id) where deleted_at is null;
create index quotes_status_idx  on public.quotes(status)   where deleted_at is null;
create index quotes_created_idx on public.quotes(created_at desc);
create index quotes_token_idx   on public.quotes(public_token);


-- ── quote lines ─────────────────────────────────────────────────────────────
create table public.quote_items (
  id        uuid primary key default gen_random_uuid(),
  quote_id  uuid not null references public.quotes(id) on delete cascade,

  -- The component id from PRICING_CONFIG ('pos', 'kiosk', 'app', ...). Not a
  -- foreign key: the price list is a code module, not a table.
  component_key text not null,
  item_group    quote_item_group not null,

  -- Frozen at issue time so an old quote keeps the wording and the price it was
  -- sold at, whatever the price list says today.
  label   text not null,
  note    text,

  quantity      integer       not null default 1,
  setup_unit    numeric(12,2) not null default 0,
  monthly_unit  numeric(12,2) not null default 0,
  setup_total   numeric(12,2) not null default 0,
  monthly_total numeric(12,2) not null default 0,

  -- Whether this line counts toward the discount tier. Denormalised from
  -- item_group so recalc_quote() needs no group-to-rule mapping of its own.
  is_discountable boolean not null default false,

  sort_order integer     not null default 0,
  created_at timestamptz not null default now(),

  constraint quote_items_qty_positive check (quantity > 0)
);

create index quote_items_quote_idx on public.quote_items(quote_id, sort_order);


-- ── event log ───────────────────────────────────────────────────────────────
-- Append-only. Answers "did they even open it?", which is the question an agent
-- actually asks before following up.
create table public.quote_events (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes(id) on delete cascade,
  event_type text not null,   -- created|sent|viewed|downloaded|accepted|rejected|edited
  actor_id   uuid references public.agents(id),   -- null = the customer
  channel    text,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create index quote_events_quote_idx on public.quote_events(quote_id, created_at desc);


-- ── quote numbering ─────────────────────────────────────────────────────────
create sequence if not exists quote_number_seq;

create or replace function public.set_quote_number()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.quote_number is null or new.quote_number = '' then
    new.quote_number := 'Q-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('quote_number_seq')::text, 4, '0');
  end if;
  return new;
end $$;

create trigger quotes_number_trg
  before insert on public.quotes
  for each row execute function public.set_quote_number();


-- ── totals ──────────────────────────────────────────────────────────────────
-- The authoritative price. The API writes lines, then calls this; the client's
-- numbers are only ever a preview.
--
--   setup_total          = base setup + Σ line setup
--   monthly_eligible     = Σ monthly where is_discountable
--   discount_percent     = quote_discount_for(monthly_eligible)
--   discount_amount      = round(eligible × pct / 100)   ← whole shekels, as in the TS
--   monthly_total        = (eligible − discount) + non-eligible
create or replace function public.recalc_quote(p_quote uuid, p_base_setup numeric default 1950)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_setup numeric(12,2);
  v_elig  numeric(12,2);
  v_non   numeric(12,2);
  v_pct   numeric(5,2);
  v_amt   numeric(12,2);
begin
  select coalesce(sum(setup_total), 0),
         coalesce(sum(monthly_total) filter (where is_discountable), 0),
         coalesce(sum(monthly_total) filter (where not is_discountable), 0)
    into v_setup, v_elig, v_non
    from public.quote_items
   where quote_id = p_quote;

  v_pct := public.quote_discount_for(v_elig);
  v_amt := round(v_elig * v_pct / 100);

  update public.quotes
     set setup_total          = p_base_setup + v_setup,
         monthly_eligible     = v_elig,
         discount_percent     = v_pct,
         discount_amount      = v_amt,
         monthly_non_eligible = v_non,
         monthly_total        = (v_elig - v_amt) + v_non,
         updated_at           = now()
   where id = p_quote;
end $$;


-- ── updated_at ──────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger quotes_touch_trg
  before update on public.quotes
  for each row execute function public.touch_updated_at();

create trigger agents_touch_trg
  before update on public.agents
  for each row execute function public.touch_updated_at();


-- ── expiry ──────────────────────────────────────────────────────────────────
-- Run daily (pg_cron, or a scheduled function). Without it a stale quote keeps
-- showing as "waiting on the customer" forever and pollutes the pipeline figure.
create or replace function public.expire_stale_quotes()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_n integer;
begin
  update public.quotes
     set status = 'expired'
   where status in ('sent', 'viewed')
     and valid_until < current_date
     and deleted_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--
--  An agent sees only their own quotes; a manager sees everything. Enforced
--  here rather than in the application, so a missing WHERE clause in a future
--  query cannot leak one agent's pipeline to another.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.agents                 enable row level security;
alter table public.quotes                 enable row level security;
alter table public.quote_items            enable row level security;
alter table public.quote_events           enable row level security;
alter table public.pricing_discount_tiers enable row level security;

-- agents: read yourself; managers read everyone. Nobody self-promotes — role
-- changes are a service-role operation.
create policy agents_read_self on public.agents
  for select to authenticated
  using (id = auth.uid() or public.is_manager());

create policy agents_update_self on public.agents
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.agents where id = auth.uid()));

-- quotes
create policy quotes_select on public.quotes
  for select to authenticated
  using (deleted_at is null and (agent_id = auth.uid() or public.is_manager()));

create policy quotes_insert on public.quotes
  for insert to authenticated
  with check (agent_id = auth.uid() and public.is_active_agent());

create policy quotes_update on public.quotes
  for update to authenticated
  using (agent_id = auth.uid() or public.is_manager())
  with check (agent_id = auth.uid() or public.is_manager());

-- lines and events inherit the visibility of their quote
create policy quote_items_all on public.quote_items
  for all to authenticated
  using (exists (select 1 from public.quotes q
                  where q.id = quote_id
                    and (q.agent_id = auth.uid() or public.is_manager())))
  with check (exists (select 1 from public.quotes q
                       where q.id = quote_id
                         and (q.agent_id = auth.uid() or public.is_manager())));

create policy quote_events_read on public.quote_events
  for select to authenticated
  using (exists (select 1 from public.quotes q
                  where q.id = quote_id
                    and (q.agent_id = auth.uid() or public.is_manager())));

create policy quote_events_insert on public.quote_events
  for insert to authenticated
  with check (exists (select 1 from public.quotes q
                       where q.id = quote_id
                         and (q.agent_id = auth.uid() or public.is_manager())));

-- the tier table is reference data: readable by any signed-in agent, writable
-- only with the service role
create policy tiers_read on public.pricing_discount_tiers
  for select to authenticated using (true);


-- ════════════════════════════════════════════════════════════════════════════
--  CUSTOMER-FACING READ
--
--  quotes is NOT exposed to anon. The customer link is served by a function
--  that takes the token, records the view, and returns only display fields.
--  Anything else would let a caller enumerate other people's quotes.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.quote_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote public.quotes;
  v_items jsonb;
begin
  select * into v_quote
    from public.quotes
   where public_token = p_token
     and deleted_at is null;

  if not found then
    return null;
  end if;

  -- A draft has not been sent yet; the link must not work until it has.
  if v_quote.status = 'draft' then
    return null;
  end if;

  update public.quotes
     set view_count      = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at  = now(),
         status          = case when status = 'sent' then 'viewed'::quote_status else status end
   where id = v_quote.id;

  insert into public.quote_events (quote_id, event_type)
  values (v_quote.id, 'viewed');

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order), '[]'::jsonb)
    into v_items
    from (
      select component_key, item_group, label, note, quantity,
             setup_unit, monthly_unit, setup_total, monthly_total,
             is_discountable, sort_order
        from public.quote_items
       where quote_id = v_quote.id
    ) i;

  return jsonb_build_object(
    'quote_number',         v_quote.quote_number,
    'created_at',           v_quote.created_at,
    'valid_until',          v_quote.valid_until,
    'status',               v_quote.status,
    'customer_name',        v_quote.customer_name,
    'customer_contact',     v_quote.customer_contact,
    'customer_phone',       v_quote.customer_phone,
    'customer_email',       v_quote.customer_email,
    'customer_tax_id',      v_quote.customer_tax_id,
    'setup_total',          v_quote.setup_total,
    'monthly_eligible',     v_quote.monthly_eligible,
    'discount_percent',     v_quote.discount_percent,
    'discount_amount',      v_quote.discount_amount,
    'monthly_non_eligible', v_quote.monthly_non_eligible,
    'monthly_total',        v_quote.monthly_total,
    'vat_percent',          v_quote.vat_percent,
    'term_months',          v_quote.term_months,
    'notes',                v_quote.notes,
    'agent_name',           (select full_name from public.agents a where a.id = v_quote.agent_id),
    'items',                v_items
  );
end $$;

revoke all on function public.quote_by_token(text) from public;
grant execute on function public.quote_by_token(text) to anon, authenticated;


-- ── convenience view for the portal list ────────────────────────────────────
create or replace view public.quotes_list
with (security_invoker = true) as
select
  q.id, q.quote_number, q.status,
  q.customer_name, q.customer_contact,
  q.setup_total, q.monthly_total, q.discount_percent, q.currency,
  q.setup_total + q.monthly_total * q.term_months as contract_value,
  q.term_months, q.valid_until, q.created_at, q.sent_at,
  q.first_viewed_at, q.view_count, q.public_token,
  q.agent_id, a.full_name as agent_name,
  (select count(*) from public.quote_items i where i.quote_id = q.id) as item_count,
  (q.valid_until < current_date and q.status in ('sent', 'viewed')) as is_expired
from public.quotes q
join public.agents a on a.id = q.agent_id
where q.deleted_at is null;


-- ── grants ──────────────────────────────────────────────────────────────────
-- Supabase's default privileges already grant these for objects created in
-- public, but stating them makes the intent explicit and keeps the migration
-- correct if it is ever replayed somewhere those defaults are not configured.
--
-- Note what is NOT here: anon gets no table privileges at all. The customer
-- link reaches its data only through quote_by_token(), which is granted below.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.quotes       to authenticated;
grant select, insert, update, delete on public.quote_items to authenticated;
grant select, insert on public.quote_events         to authenticated;
grant select, update on public.agents               to authenticated;
grant select on public.pricing_discount_tiers       to authenticated;
grant select on public.quotes_list                  to authenticated;
