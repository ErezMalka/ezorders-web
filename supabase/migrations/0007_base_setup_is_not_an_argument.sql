-- ════════════════════════════════════════════════════════════════════════════
--  Take the base setup fee out of the caller's hands
--
--  0001's promise, in its own words: "MONEY IS COMPUTED SERVER-SIDE. The client
--  sends the package selection, never a price." recalc_quote() delivers that for
--  every line — they are summed from quote_items, which RLS ties to the agent's
--  own quote — with one exception it left open:
--
--    recalc_quote(p_quote uuid, p_base_setup numeric default 1950)
--
--  The ₪1,950 initial setup fee is not a line. It arrives as an argument, from
--  src/lib/agent/quotes.ts, which passes PRICING_CONFIG.initialSetup.setup. That
--  is correct when the call comes from the API route. But the function is
--  security definer and granted to `authenticated`, and Supabase exposes every
--  such function at /rest/v1/rpc/. An agent holding their own perfectly
--  legitimate session can therefore run
--
--    POST /rest/v1/rpc/recalc_quote { "p_quote": "<their quote>", "p_base_setup": 0 }
--
--  and the quote reprices itself ₪1,950 cheaper, with the document, the customer
--  link and the eventual order all agreeing on the lower figure. Nothing in the
--  audit trail looks unusual: the totals were recomputed by the database, which
--  is exactly what is supposed to happen.
--
--  This is an insider hole rather than an outsider one, and there is no evidence
--  anyone has used it — the table is empty. But "the client cannot change what a
--  package costs" is either true or it is not, and a discount an agent can grant
--  themselves without a manager seeing it is the kind of thing that is
--  discovered years later.
--
--  So the fee stops being a parameter and becomes data, the same shape as the
--  discount tiers: a row the SQL reads and only the service role can write.
--  Changing the price is still a one-line change, and it is now the same
--  one-line change for both halves of the system.
-- ════════════════════════════════════════════════════════════════════════════

create table public.pricing_settings (
  key   text          primary key,
  value numeric(12,2) not null,
  note  text
);

comment on table public.pricing_settings is
  'Scalar prices the SQL side needs. Mirrors src/lib/pricing.ts; see 0007.';

insert into public.pricing_settings (key, value, note) values
  ('base_setup', 1950, 'PRICING_CONFIG.initialSetup.setup — הקמת מערכת ראשונית');

alter table public.pricing_settings enable row level security;

-- Reference data: readable by any signed-in agent, writable only with the
-- service role. Same arrangement as pricing_discount_tiers.
create policy pricing_settings_read on public.pricing_settings
  for select to authenticated using (true);

grant select on public.pricing_settings to authenticated;
revoke all  on public.pricing_settings from anon;


-- The same function, one argument shorter. Dropped and recreated rather than
-- overloaded, so that no call site can reach the old signature by accident.
drop function if exists public.recalc_quote(uuid, numeric);

create or replace function public.recalc_quote(p_quote uuid)
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
  v_base  numeric(12,2);
begin
  select value into v_base
    from public.pricing_settings where key = 'base_setup';
  if v_base is null then
    raise exception 'pricing_settings.base_setup is missing';
  end if;

  select coalesce(sum(setup_total), 0),
         coalesce(sum(monthly_total) filter (where is_discountable), 0),
         coalesce(sum(monthly_total) filter (where not is_discountable), 0)
    into v_setup, v_elig, v_non
    from public.quote_items
   where quote_id = p_quote;

  v_pct := public.quote_discount_for(v_elig);
  v_amt := round(v_elig * v_pct / 100);

  update public.quotes
     set setup_total          = v_base + v_setup,
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


-- ── while we are here: pin the two search_paths that were left mutable ──────
-- Flagged by Supabase's linter. touch_updated_at is the more interesting of the
-- two: it fires on quotes, agents and orders, including during security-definer
-- functions, and a function without a pinned search_path resolves its names
-- against whatever the caller's search_path happens to be.
create or replace function public.quote_discount_for(p_eligible numeric)
returns numeric
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce((
    select pct
      from public.pricing_discount_tiers
     where p_eligible > threshold
     order by threshold desc
     limit 1
  ), 0);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.quote_discount_for(numeric) from public, anon, authenticated;
revoke all on function public.touch_updated_at()          from public, anon, authenticated;
