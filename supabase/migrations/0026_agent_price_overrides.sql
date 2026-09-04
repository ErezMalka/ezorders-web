-- 0026 · An agent may name a price
--
-- Until now the price list was the price. 0007 took the base fee out of the
-- caller's hands, and every line was priced from the catalogue with no way to
-- say otherwise. The business has decided differently: an agent closing a deal
-- may set the setup and monthly fee of any line, the ₪1,950 base fee, and the
-- discount — without asking first.
--
-- What replaces the interlock is visibility. Every departure from the list is:
--   · stored beside the list price it departed from, on the line itself;
--   · written to quote_price_changes, with who and when;
--   · flagged on the quote (price_overridden), which the list shows;
--   · mailed to the owner when the quote goes out.
--
-- So the invariant changes from "nobody can" to "nobody can quietly".

begin;

-- ── the lines remember the list ────────────────────────────────────────────
alter table public.quote_items
  add column if not exists list_setup_unit   numeric(12,2),
  add column if not exists list_monthly_unit numeric(12,2),
  add column if not exists price_overridden  boolean not null default false;

-- Lines written before this migration were priced from the list by definition.
-- The freeze trigger (0022) refuses any touch to a sent quote's lines, which
-- is right for the application and wrong for a backfill that changes no
-- price; it is stepped around for exactly this statement.
alter table public.quote_items disable trigger quote_items_frozen_trg;
update public.quote_items
   set list_setup_unit   = setup_unit,
       list_monthly_unit = monthly_unit
 where list_setup_unit is null;
alter table public.quote_items enable trigger quote_items_frozen_trg;

comment on column public.quote_items.list_setup_unit is
  'The catalogue''s per-unit setup fee on the day. setup_unit is what was actually charged.';
comment on column public.quote_items.list_monthly_unit is
  'The catalogue''s per-unit monthly fee on the day. monthly_unit is what was actually charged.';
comment on column public.quote_items.price_overridden is
  'True when setup_unit or monthly_unit was set by the agent rather than taken from the list.';

-- ── the quote remembers its two headline overrides ─────────────────────────
alter table public.quotes
  add column if not exists base_setup_override   numeric(12,2),
  add column if not exists discount_override_pct numeric(5,2),
  add column if not exists price_overridden      boolean not null default false,
  add column if not exists price_alert_sent_at   timestamptz;

alter table public.quotes drop constraint if exists quotes_base_setup_override_range;
alter table public.quotes add constraint quotes_base_setup_override_range
  check (base_setup_override is null or (base_setup_override >= 0 and base_setup_override <= 100000));
alter table public.quotes drop constraint if exists quotes_discount_override_range;
alter table public.quotes add constraint quotes_discount_override_range
  check (discount_override_pct is null or (discount_override_pct >= 0 and discount_override_pct <= 100));

comment on column public.quotes.base_setup_override is
  'When set, replaces pricing_settings.base_setup for this quote. Null = the list.';
comment on column public.quotes.discount_override_pct is
  'When set, replaces the tier discount for this quote. 0 is a valid override. Null = the tier.';
comment on column public.quotes.price_overridden is
  'Maintained by recalc_quote: true when any figure on the quote departs from the list.';
comment on column public.quotes.price_alert_sent_at is
  'When the owner was mailed about the manual prices on this quote. Null = not yet.';

-- ── the document layout is frozen once it is accepted ──────────────────────
-- Same arrangement as contracts.layout_version (0025): the quote a customer
-- accepted was hashed as rendered, so it keeps rendering that way. Everything
-- else moves to layout 2 — the one with the equipment / setup / monthly
-- summary and the list prices beside the given ones.
alter table public.quotes
  add column if not exists layout_version smallint not null default 2;

update public.quotes q
   set layout_version = 1
 where exists (
   select 1 from public.quote_responses r
    where r.quote_id = q.id and r.document_hash is not null
 );

alter table public.quotes drop constraint if exists quotes_layout_version_known;
alter table public.quotes add constraint quotes_layout_version_known
  check (layout_version in (1, 2));

comment on column public.quotes.layout_version is
  'Which rendering of the document this quote uses. Frozen at acceptance because the hash covers it. See 0026.';

-- ── the audit trail ────────────────────────────────────────────────────────
create table if not exists public.quote_price_changes (
  id            bigserial primary key,
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  agent_id      uuid not null references public.agents(id),
  at            timestamptz not null default now(),
  -- 'base_setup' | 'discount_pct' | 'setup_unit' | 'monthly_unit'
  field         text not null,
  -- The line, for the per-unit fields. Null for the quote-level ones.
  component_key text,
  label         text,
  list_value    numeric(12,2),
  new_value     numeric(12,2) not null
);

create index if not exists quote_price_changes_quote_idx on public.quote_price_changes (quote_id, at);

comment on table public.quote_price_changes is
  'Every price an agent set by hand on a quote, beside the list price it replaced. Append-only.';

alter table public.quote_price_changes enable row level security;

-- An agent writes rows for their own quotes and reads their own; a manager
-- reads everyone's. Nobody updates or deletes: the trail is the point.
drop policy if exists quote_price_changes_insert on public.quote_price_changes;
create policy quote_price_changes_insert on public.quote_price_changes
  for insert to authenticated
  with check (
    agent_id = auth.uid()
    and exists (select 1 from public.quotes q where q.id = quote_id and q.agent_id = auth.uid())
  );

drop policy if exists quote_price_changes_read on public.quote_price_changes;
create policy quote_price_changes_read on public.quote_price_changes
  for select to authenticated
  using (agent_id = auth.uid() or public.is_manager());

grant select, insert on public.quote_price_changes to authenticated;
grant usage on sequence public.quote_price_changes_id_seq to authenticated;
revoke all on public.quote_price_changes from anon;

-- ── recalc_quote honours the overrides ─────────────────────────────────────
-- Same shape as 0008; two coalesces and one flag. The base fee still comes
-- from pricing_settings unless the quote carries its own, and the tier still
-- comes from quote_discount_for unless the quote carries its own.
create or replace function public.recalc_quote(p_quote uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_q     public.quotes;
  v_setup numeric(12,2);
  v_hw    numeric(12,2);
  v_elig  numeric(12,2);
  v_non   numeric(12,2);
  v_pct   numeric(5,2);
  v_amt   numeric(12,2);
  v_base  numeric(12,2);
  v_lines_overridden boolean;
begin
  select * into v_q from public.quotes where id = p_quote;
  if not found then
    raise exception 'quote % not found', p_quote;
  end if;

  select value into v_base
    from public.pricing_settings where key = 'base_setup';
  if v_base is null then
    raise exception 'pricing_settings.base_setup is missing';
  end if;
  v_base := coalesce(v_q.base_setup_override, v_base);

  select coalesce(sum(setup_total) filter (where item_group <> 'hardware'), 0),
         coalesce(sum(setup_total) filter (where item_group =  'hardware'), 0),
         coalesce(sum(monthly_total) filter (where is_discountable), 0),
         coalesce(sum(monthly_total) filter (where not is_discountable), 0),
         coalesce(bool_or(price_overridden), false)
    into v_setup, v_hw, v_elig, v_non, v_lines_overridden
    from public.quote_items
   where quote_id = p_quote;

  v_pct := coalesce(v_q.discount_override_pct, public.quote_discount_for(v_elig));
  v_amt := round(v_elig * v_pct / 100);

  update public.quotes
     set setup_total          = v_base + v_setup,
         hardware_total       = v_hw,
         monthly_eligible     = v_elig,
         discount_percent     = v_pct,
         discount_amount      = v_amt,
         monthly_non_eligible = v_non,
         monthly_total        = (v_elig - v_amt) + v_non,
         price_overridden     = v_lines_overridden
                                or v_q.base_setup_override is not null
                                or v_q.discount_override_pct is not null,
         updated_at           = now()
   where id = p_quote;
end $$;

revoke all    on function public.recalc_quote(uuid) from public, anon;
grant execute on function public.recalc_quote(uuid) to authenticated;

-- ── the list shows the flag ────────────────────────────────────────────────
create or replace view public.quotes_list
with (security_invoker = true) as
  select q.id,
    q.quote_number,
    q.status,
    q.customer_name,
    q.customer_contact,
    q.setup_total,
    q.hardware_total,
    q.monthly_total,
    q.discount_percent,
    q.currency,
    q.setup_total + q.hardware_total + q.monthly_total * q.term_months::numeric as contract_value,
    q.term_months,
    q.valid_until,
    q.created_at,
    q.sent_at,
    q.first_viewed_at,
    q.view_count,
    q.public_token,
    q.agent_id,
    a.full_name as agent_name,
    (select count(*) from public.quote_items i where i.quote_id = q.id) as item_count,
    q.valid_until < current_date and q.status in ('sent', 'viewed') as is_expired,
    q.price_overridden
  from public.quotes q
  join public.agents a on a.id = q.agent_id
  where q.deleted_at is null and not q.direct_contract;

-- ── the customer's payload carries the list prices ─────────────────────────
-- The document prints "before discount" from the list and "to pay" from the
-- line, so it needs both. Restated in full, as the contract's function is.
create or replace function public.quote_by_token(p_token text, p_record_view boolean default true)
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
      select component_key, item_group, label, note, image, quantity,
             setup_unit, monthly_unit, setup_total, monthly_total,
             is_discountable, sort_order,
             coalesce(list_setup_unit, setup_unit)     as list_setup_unit,
             coalesce(list_monthly_unit, monthly_unit) as list_monthly_unit,
             price_overridden
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
    'base_setup_override',  v_quote.base_setup_override,
    -- What the list said for the base fee on the day. Recorded when the agent
    -- changed it; otherwise the base fee IS the list's, and the document
    -- derives it from setup_total minus the lines.
    'list_base_setup',      (select c.list_value from public.quote_price_changes c
                              where c.quote_id = v_quote.id and c.field = 'base_setup'
                              order by c.at desc, c.id desc limit 1),
    'layout_version',       v_quote.layout_version,
    'agent_name',           (select full_name from public.agents a where a.id = v_quote.agent_id),
    'items',                v_items,
    'is_expired',           (v_quote.valid_until < current_date),
    'responded',            (v_resp.id is not null),
    'response',             v_resp.response,
    'responded_at',         v_resp.created_at,
    'order_number',         (select order_number from public.orders o where o.quote_id = v_quote.id)
  );
end $$;

commit;
