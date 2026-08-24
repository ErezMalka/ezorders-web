-- Who can reach what.
--
-- These assertions exist because the answer was wrong for months and nothing
-- noticed. Every `revoke ... from public` in 0001 and 0003 was a no-op on a real
-- project, so anon — whose key is in the JavaScript of every page — could read
-- and write every portal table and execute every function, including
-- expire_stale_quotes(), which would have wiped the pipeline in one request.
--
-- Run against a database built with the Supabase stub, which now carries the
-- same default privileges a live project does. Without those defaults these
-- tests pass trivially and prove nothing.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function test_assert(p_cond boolean, p_what text)
returns void language plpgsql as $$
begin
  if not p_cond then raise exception 'FAIL: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

-- ── anon reaches no table, view or sequence ─────────────────────────────────
select test_assert(count(*) = 0,
  'anon holds no privilege on any portal table or view (found: ' ||
  coalesce(string_agg(distinct table_name || ':' || privilege_type, ', '), 'none') || ')')
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon';

select test_assert(count(*) = 0, 'anon holds no privilege on any sequence')
from information_schema.role_usage_grants
where object_schema = 'public' and grantee = 'anon' and object_type = 'SEQUENCE';

-- ── anon reaches exactly two functions ──────────────────────────────────────
select test_assert(
  coalesce(string_agg(p.proname, ', ' order by p.proname), '') =
    'quote_by_token, quote_respond_by_token',
  'anon may execute only the two token functions (found: ' ||
  coalesce(string_agg(p.proname, ', ' order by p.proname), 'none') || ')')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
  -- helpers this suite defines for itself, not part of the schema under test
  and p.proname not in ('test_assert', 'become');

-- ── what a signed-in agent may call directly ────────────────────────────────
-- The three is_* helpers are load-bearing: RLS policy expressions run as the
-- querying role, so revoking them would silently break every policy.
select test_assert(
  coalesce(string_agg(p.proname, ', ' order by p.proname), '') =
    'is_active_agent, is_admin, is_manager, quote_accept_by_agent, '
    || 'quote_by_token, quote_respond_by_token, recalc_quote',
  'authenticated may execute only the seven functions it needs (found: ' ||
  coalesce(string_agg(p.proname, ', ' order by p.proname), 'none') || ')')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute')
  and p.proname not in ('test_assert', 'become');

-- The two that matter most, named so a future edit that reopens them fails on a
-- line that says why.
select test_assert(
  not has_function_privilege('anon', 'public.expire_stale_quotes()', 'execute')
  and not has_function_privilege('authenticated', 'public.expire_stale_quotes()', 'execute'),
  'expire_stale_quotes is not reachable over the API — it would wipe the pipeline');

select test_assert(
  not has_function_privilege('anon', 'public.create_order_from_quote(uuid, timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'public.create_order_from_quote(uuid, timestamptz)', 'execute'),
  'create_order_from_quote is not reachable directly — it authorises nothing itself');

-- ── the base setup fee is not the caller's to choose ────────────────────────
select test_assert(count(*) = 0,
  'recalc_quote no longer takes a base-setup argument')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'recalc_quote'
  and pg_get_function_identity_arguments(p.oid) <> 'p_quote uuid';

select test_assert(value = 1950, 'the base setup fee lives in pricing_settings')
  from public.pricing_settings where key = 'base_setup';

-- And prove it: price a quote, then try to reprice it cheaply as an agent.
insert into auth.users (id, email) values ('44444444-4444-4444-4444-444444444444','p@ez.com');
insert into public.agents (id, full_name, email, role)
values ('44444444-4444-4444-4444-444444444444','Priv Test','p@ez.com','agent');
insert into public.quotes (id, agent_id, customer_name, valid_until, status, public_token)
values ('bbbbbbbb-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444',
        'בדיקת הרשאות', current_date + 14, 'sent', repeat('1', 48));
insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
values ('bbbbbbbb-0000-0000-0000-000000000001','pos','core','קופה',1,490,350,490,350,true);

select public.recalc_quote('bbbbbbbb-0000-0000-0000-000000000001');
select test_assert(setup_total = 2440, 'setup is the base fee plus the lines (1950 + 490)')
  from public.quotes where id = 'bbbbbbbb-0000-0000-0000-000000000001';

do $$
begin
  perform set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
  set local role authenticated;
  begin
    -- The call an agent would make against /rest/v1/rpc/recalc_quote to give
    -- themselves 1,950 off. There is no longer a signature that accepts it.
    execute 'select public.recalc_quote($1, 0)'
      using 'bbbbbbbb-0000-0000-0000-000000000001'::uuid;
    reset role;
    raise exception 'FAIL: an agent could still choose the base setup fee';
  exception when undefined_function or insufficient_privilege then
    reset role;
    raise notice 'ok  an agent cannot choose the base setup fee';
  end;
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

select test_assert(setup_total = 2440, 'the quote still carries the full setup fee')
  from public.quotes where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- ── every portal table has RLS on ───────────────────────────────────────────
-- The revokes above are defence in depth; RLS is the actual defence. A table
-- added later without it would be readable by anyone the moment somebody grants
-- select back.
select test_assert(count(*) = 0,
  'every portal table has row level security enabled (missing: ' ||
  coalesce(string_agg(relname, ', '), 'none') || ')')
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

\echo '── all privilege tests passed'
