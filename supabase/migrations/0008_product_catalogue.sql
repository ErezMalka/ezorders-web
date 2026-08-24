-- ════════════════════════════════════════════════════════════════════════════
--  A product catalogue an admin can edit, and a third thing to sell
--
--  Until now the price list was a TypeScript file. src/lib/pricing.ts held every
--  component and every price, the public calculator and the portal both imported
--  it, and that is exactly why the two could never disagree — one module, one
--  answer. It is a good property and this migration keeps it.
--
--  What it could not do is let anyone add a product. A new item meant editing
--  code and shipping a deploy, which is fine for the person who wrote the file
--  and impossible for the person selling from it.
--
--  So the catalogue moves into a table, and the file becomes the DEFAULT rather
--  than the truth. The application reads products from here when it can and
--  falls back to the file when it cannot. That fallback is not defensive
--  padding: the marketing site is built to work with no Supabase configuration
--  at all, and /he/price must keep rendering prices if this database is
--  unreachable. A price list that goes blank during an outage is worse than one
--  that is briefly out of date.
--
--  The table is seeded with exactly the values the file holds today, so nothing
--  reprices on the day this runs. Verified by comparing the calculator's output
--  before and after.
--
--  ── the third block ──
--
--  A quote used to have two kinds of money: a one-time setup charge and a
--  recurring monthly one. Physical goods — a screen, a printer, a cash drawer —
--  fit neither. They are one-time like setup, but they are not setup: nobody
--  installs a cash drawer, and putting a ₪1,200 monitor inside "הקמת מערכת"
--  makes the setup line look like a services fee that grew teeth.
--
--  They also must not touch the discount. The volume tiers exist to reward
--  recurring commitment; letting hardware raise the tier would let an agent
--  discount the monthly charge by adding a screen to the order.
--
--  So hardware is its own group, its own column, and its own block on the
--  document. Its price lives in the line's setup_unit — a hardware line is
--  simply one whose monthly is zero — which is why no new column is needed on
--  quote_items.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0008a ───────────────────────────────────────────────────────────────────
-- An enum value cannot be used in the transaction that created it. Run this
-- half, then the next.

alter type quote_item_group add value if not exists 'hardware';


-- ── 0008b ───────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
--  The catalogue
-- ════════════════════════════════════════════════════════════════════════════
create table public.products (
  id  uuid primary key default gen_random_uuid(),

  -- The stable identifier. Written onto every quote line as component_key, so
  -- renaming a product is safe and changing its key is not.
  key text not null unique,

  label   text not null,
  note    text,          -- "המחיר פר קופה"
  tx_note text,          -- the 3D Secure per-transaction footnote

  item_group quote_item_group not null,

  -- Prices, pre-VAT. A subscription item may set either or both; a hardware
  -- item sets setup only.
  setup   numeric(12,2) not null default 0,
  monthly numeric(12,2) not null default 0,

  max_qty integer not null default 1,
  icon    text    not null default 'box',

  sort_order integer not null default 0,

  -- Retired rather than deleted. A product that has been quoted must keep
  -- existing, because a stored quote refers to its key.
  is_active boolean not null default true,

  -- Whether it appears on the public calculator at /he/price. An agent-only
  -- item — a bespoke integration, a partner rate — is sellable without being
  -- advertised.
  show_on_website boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_key_shape    check (key ~ '^[a-z0-9][a-z0-9_-]*$'),
  constraint products_labelled     check (length(btrim(label)) > 0),
  constraint products_qty_positive check (max_qty between 1 and 999),
  constraint products_prices_sane  check (setup >= 0 and monthly >= 0),
  -- Hardware is a one-time purchase. A recurring charge on a physical object is
  -- a rental, which is a different product and a different contract.
  constraint products_hardware_has_no_monthly
    check (item_group <> 'hardware' or monthly = 0)
);

create index products_group_idx on public.products(item_group, sort_order)
  where is_active;

create trigger products_touch_trg
  before update on public.products
  for each row execute function public.touch_updated_at();

comment on table public.products is
  'The sellable catalogue. Mirrors PRICING_CONFIG in src/lib/pricing.ts, which '
  'remains the fallback when this table is empty or unreachable. See 0008.';


-- ── seed: exactly what the file holds today ─────────────────────────────────
insert into public.products (key, label, note, tx_note, item_group, setup, monthly, max_qty, icon, sort_order) values
  ('pos',       'קופה (POS)',              'המחיר פר קופה',  null, 'core',           490,  350, 20, 'pos',    10),
  ('website',   'אתר אינטרנט',              'המחיר פר סניף',  null, 'core',           490,  450,  1, 'globe',  20),
  ('kiosk',     'קיוסק',                    'המחיר פר עמדה',  null, 'core',           490,  350, 10, 'kiosk',  30),

  ('loyalty',   'מועדון לקוחות',            'פר סניף',        null, 'addon_included',   0,  350,  1, 'users',  10),
  ('ezwallet',  'EzWallet',                 null,             null, 'addon_included',   0,  150,  1, 'wallet', 20),
  ('feedback',  'מודול פידבק',              null,             null, 'addon_included',   0,  150,  1, 'chat',   30),

  ('bit',       'תשלומי BIT',               null,             null, 'addon_excluded',  95,   25,  1, 'card',   10),
  ('applepay',  'Apple Pay / Google Pay',   null,             null, 'addon_excluded',  95,   50,  1, 'card',   20),
  ('secure3d',  '3D Secure',                null,
                '+ ₪0.90 לעסקה מאומתת (לא כלול בסה״כ)',            'addon_excluded', 350,   79,  1, 'shield', 30),

  ('app',       'אפליקציה ממותגת',          null,             null, 'mobile_app',    4900,  190,  1, 'phone',  10);


-- ════════════════════════════════════════════════════════════════════════════
--  Hardware gets its own total
--
--  setup_total keeps meaning what it has always meant — the services charge —
--  so no historical quote changes value. Hardware is added alongside it.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.quotes add column if not exists hardware_total numeric(12,2) not null default 0;
alter table public.orders add column if not exists hardware_total numeric(12,2) not null default 0;


-- ── totals, now in three parts ──────────────────────────────────────────────
create or replace function public.recalc_quote(p_quote uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_setup numeric(12,2);
  v_hw    numeric(12,2);
  v_elig  numeric(12,2);
  v_non   numeric(12,2);
  v_pct   numeric(5,2);
  v_amt   numeric(12,2);
  v_base  numeric(12,2);
begin
  select value into v_base
    from public.pricing_settings where key = 'base_setup';
  if v_base is null then
    raise exception 'pricing_settings.base_setup is missing';
  end if;

  -- Hardware is one-time like setup, and separated from it here rather than in
  -- the application so every reader of the table agrees.
  select coalesce(sum(setup_total) filter (where item_group <> 'hardware'), 0),
         coalesce(sum(setup_total) filter (where item_group =  'hardware'), 0),
         coalesce(sum(monthly_total) filter (where is_discountable), 0),
         coalesce(sum(monthly_total) filter (where not is_discountable), 0)
    into v_setup, v_hw, v_elig, v_non
    from public.quote_items
   where quote_id = p_quote;

  v_pct := public.quote_discount_for(v_elig);
  v_amt := round(v_elig * v_pct / 100);

  update public.quotes
     set setup_total          = v_base + v_setup,
         hardware_total       = v_hw,
         monthly_eligible     = v_elig,
         discount_percent     = v_pct,
         discount_amount      = v_amt,
         monthly_non_eligible = v_non,
         monthly_total        = (v_elig - v_amt) + v_non,
         updated_at           = now()
   where id = p_quote;
end $$;

revoke all    on function public.recalc_quote(uuid) from public, anon;
grant execute on function public.recalc_quote(uuid) to authenticated;


-- ── the order copies it too ─────────────────────────────────────────────────
create or replace function public.create_order_from_quote(
  p_quote_id uuid,
  p_accepted_at timestamptz default now()
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote public.quotes;
  v_order public.orders;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then
    raise exception 'quote % not found', p_quote_id;
  end if;

  insert into public.orders (
    quote_id, agent_id,
    customer_name, customer_contact, customer_phone, customer_email, customer_tax_id,
    currency, setup_total, hardware_total, monthly_eligible, discount_percent, discount_amount,
    monthly_non_eligible, monthly_total, vat_percent, term_months,
    accepted_at
  ) values (
    v_quote.id, v_quote.agent_id,
    v_quote.customer_name, v_quote.customer_contact, v_quote.customer_phone,
    v_quote.customer_email, v_quote.customer_tax_id,
    v_quote.currency, v_quote.setup_total, v_quote.hardware_total, v_quote.monthly_eligible,
    v_quote.discount_percent, v_quote.discount_amount,
    v_quote.monthly_non_eligible, v_quote.monthly_total,
    v_quote.vat_percent, v_quote.term_months,
    p_accepted_at
  )
  returning * into v_order;

  insert into public.order_events (order_id, event_type, meta)
  values (v_order.id, 'created',
          jsonb_build_object('quote_number', v_quote.quote_number));

  return v_order;
end $$;

revoke all on function public.create_order_from_quote(uuid, timestamptz) from public, anon, authenticated;


-- ── the list views count hardware in the contract value ─────────────────────
-- Dropped and recreated rather than replaced: `create or replace view` can add
-- columns at the end but cannot insert one in the middle, and hardware_total
-- belongs next to setup_total where a reader will look for it.
drop view if exists public.quotes_list;
drop view if exists public.orders_list;

create view public.quotes_list
with (security_invoker = true) as
select
  q.id, q.quote_number, q.status,
  q.customer_name, q.customer_contact,
  q.setup_total, q.hardware_total, q.monthly_total, q.discount_percent, q.currency,
  q.setup_total + q.hardware_total + q.monthly_total * q.term_months as contract_value,
  q.term_months, q.valid_until, q.created_at, q.sent_at,
  q.first_viewed_at, q.view_count, q.public_token,
  q.agent_id, a.full_name as agent_name,
  (select count(*) from public.quote_items i where i.quote_id = q.id) as item_count,
  (q.valid_until < current_date and q.status in ('sent', 'viewed')) as is_expired
from public.quotes q
join public.agents a on a.id = q.agent_id
where q.deleted_at is null;

create view public.orders_list
with (security_invoker = true) as
select
  o.id, o.order_number, o.status,
  o.customer_name, o.customer_contact, o.customer_phone, o.customer_email,
  o.setup_total, o.hardware_total, o.monthly_total, o.discount_percent, o.currency,
  o.setup_total + o.hardware_total + o.monthly_total * o.term_months as contract_value,
  o.term_months, o.accepted_at, o.target_live_on, o.went_live_at, o.created_at,
  o.agent_id, a.full_name as agent_name,
  q.quote_number, q.public_token,
  r.channel      as accept_channel,
  r.signer_name  as signer_name,
  case when o.went_live_at is not null
       then extract(day from o.went_live_at - o.accepted_at)::integer
  end as days_to_live
from public.orders o
join public.agents a on a.id = o.agent_id
join public.quotes q on q.id = o.quote_id
left join public.quote_responses r on r.quote_id = o.quote_id;

grant select on public.quotes_list to authenticated;
grant select on public.orders_list to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--
--  Reference data: every signed-in agent reads it, only an admin changes it.
--  Prices are the one thing in this product an agent must not be able to edit —
--  the whole "the client never sends money" arrangement rests on the catalogue
--  being something they can read and not write.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.products enable row level security;

create policy products_read on public.products
  for select to authenticated using (true);

create policy products_admin_manage on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.products to authenticated;
revoke all on public.products from anon;


-- ── what the public calculator reads ────────────────────────────────────────
-- /he/price is a marketing page with no session, and anon holds no table
-- privilege by design (0004). So the price list arrives the same way a customer
-- quote does: through one security-definer function that decides what is
-- public. Retired products and agent-only items never leave the database.
create or replace function public.price_list()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'baseSetup', (select value from public.pricing_settings where key = 'base_setup'),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key',        p.key,
          'label',      p.label,
          'note',       p.note,
          'txNote',     p.tx_note,
          'group',      p.item_group,
          'setup',      p.setup,
          'monthly',    p.monthly,
          'maxQty',     p.max_qty,
          'icon',       p.icon,
          'sortOrder',  p.sort_order
        )
        order by p.item_group, p.sort_order, p.key
      )
      from public.products p
      where p.is_active and p.show_on_website
    ), '[]'::jsonb)
  );
$$;

revoke all    on function public.price_list() from public;
grant execute on function public.price_list() to anon, authenticated;

-- The agent's catalogue: everything still sellable, advertised or not.
create or replace function public.agent_price_list()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select case when public.is_active_agent() then jsonb_build_object(
    'baseSetup', (select value from public.pricing_settings where key = 'base_setup'),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key',        p.key,
          'label',      p.label,
          'note',       p.note,
          'txNote',     p.tx_note,
          'group',      p.item_group,
          'setup',      p.setup,
          'monthly',    p.monthly,
          'maxQty',     p.max_qty,
          'icon',       p.icon,
          'sortOrder',  p.sort_order
        )
        order by p.item_group, p.sort_order, p.key
      )
      from public.products p
      where p.is_active
    ), '[]'::jsonb)
  ) end;
$$;

revoke all    on function public.agent_price_list() from public, anon;
grant execute on function public.agent_price_list() to authenticated;


-- ── the customer's copy carries the third total ─────────────────────────────
-- Recreated rather than patched: the function returns one jsonb object and the
-- page reads it whole, so a missing key would silently render ₪0 of hardware on
-- a document that has some.
create or replace function public.quote_by_token(
  p_token       text,
  p_record_view boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote public.quotes;
  v_items jsonb;
  v_resp  public.quote_responses;
begin
  select * into v_quote
    from public.quotes
   where public_token = p_token
     and deleted_at is null;

  if not found then
    return null;
  end if;

  if v_quote.status = 'draft' then
    return null;
  end if;

  if p_record_view then
    update public.quotes
       set view_count      = view_count + 1,
           first_viewed_at = coalesce(first_viewed_at, now()),
           last_viewed_at  = now(),
           status          = case when status = 'sent' then 'viewed'::quote_status else status end
     where id = v_quote.id;

    insert into public.quote_events (quote_id, event_type)
    values (v_quote.id, 'viewed');
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order), '[]'::jsonb)
    into v_items
    from (
      select component_key, item_group, label, note, quantity,
             setup_unit, monthly_unit, setup_total, monthly_total,
             is_discountable, sort_order
        from public.quote_items
       where quote_id = v_quote.id
    ) i;

  select * into v_resp from public.quote_responses where quote_id = v_quote.id;

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
    'hardware_total',       v_quote.hardware_total,
    'monthly_eligible',     v_quote.monthly_eligible,
    'discount_percent',     v_quote.discount_percent,
    'discount_amount',      v_quote.discount_amount,
    'monthly_non_eligible', v_quote.monthly_non_eligible,
    'monthly_total',        v_quote.monthly_total,
    'vat_percent',          v_quote.vat_percent,
    'term_months',          v_quote.term_months,
    'notes',                v_quote.notes,
    'agent_name',           (select full_name from public.agents a where a.id = v_quote.agent_id),
    'items',                v_items,
    'is_expired',           (v_quote.valid_until < current_date),
    'responded',            (v_resp.id is not null),
    'response',             v_resp.response,
    'responded_at',         v_resp.created_at,
    'order_number',         (select order_number from public.orders o where o.quote_id = v_quote.id)
  );
end $$;

revoke all    on function public.quote_by_token(text, boolean) from public;
grant execute on function public.quote_by_token(text, boolean) to anon, authenticated;
