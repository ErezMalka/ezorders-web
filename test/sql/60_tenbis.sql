-- Who can reach a customer's תן ביס credentials.
--
-- This suite exists because of a specific failure in the system this feature
-- borrows from. There, three endpoints check that the caller holds a valid
-- session and then take the branch id straight out of the request body without
-- ever asking whether the caller is entitled to it — so any authenticated user
-- can read any restaurant's תן ביס username and password. The mistake is not
-- exotic: a route-level check was written, and it checked the wrong thing.
--
-- So the rule here lives in a policy, and it is tested here rather than through
-- a route. A test that drives the API would pass just as happily with no policy
-- at all, which makes it the wrong test for this.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function test_assert(p_cond boolean, p_what text)
returns void language plpgsql as $$
begin
  if not p_cond then raise exception 'FAIL: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create or replace function become(p_id uuid) returns void
language sql as $$ select set_config('request.jwt.claim.sub', coalesce(p_id::text,''), false); $$;

-- ── seed ────────────────────────────────────────────────────────────────────
-- Two agents and a manager, and one order each for the agents, so "sees their
-- own" and "sees nothing of anyone else's" are both real questions.

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ten-a@ez.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'ten-b@ez.com'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'ten-m@ez.com')
on conflict (id) do nothing;

insert into public.agents (id, full_name, email, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Tenbis A', 'ten-a@ez.com', 'agent'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Tenbis B', 'ten-b@ez.com', 'agent'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Tenbis M', 'ten-m@ez.com', 'manager')
on conflict (id) do nothing;

insert into public.orders (id, order_number, agent_id, customer_name)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'TEN-A-1',
   'aaaaaaaa-0000-0000-0000-000000000001', 'מסעדת א'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'TEN-B-1',
   'aaaaaaaa-0000-0000-0000-000000000002', 'מסעדת ב')
on conflict (id) do nothing;

insert into public.tenbis_accounts (order_id, tenbis_user, restaurant_id, password_enc, state)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'user-a', '1001', 'v1.x.y.z', 'entered'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'user-b', '1002', 'v1.x.y.z', 'entered');

-- ── 1. the shape of the table ───────────────────────────────────────────────

do $$
declare v_n integer;
begin
  select count(*) into v_n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'tenbis_accounts'
     and column_name = 'tenbis_password';
  perform test_assert(v_n = 0,
    'there is no plaintext password column at all');

  select count(*) into v_n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'tenbis_accounts'
     and column_name = 'password_enc';
  perform test_assert(v_n = 1, 'the password is stored encrypted');
end $$;

-- A state outside the set is refused rather than stored and puzzled over later.
do $$
begin
  begin
    insert into public.tenbis_accounts (order_id, state)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'whatever');
    perform test_assert(false, 'an unknown state was accepted');
  exception when check_violation or unique_violation then
    perform test_assert(true, 'an unknown state is refused');
  end;
end $$;

-- ── 2. one row per order, and it goes when the order goes ───────────────────

do $$
declare v_n integer;
begin
  begin
    insert into public.tenbis_accounts (order_id, tenbis_user)
    values ('bbbbbbbb-0000-0000-0000-000000000001', 'second');
    perform test_assert(false, 'a second row for one order was accepted');
  exception when unique_violation then
    perform test_assert(true, 'an order carries at most one תן ביס account');
  end;

  -- Credentials outliving the order that justified holding them is exactly the
  -- kind of leftover nobody goes looking for.
  insert into public.orders (id, order_number, agent_id, customer_name)
  values ('bbbbbbbb-0000-0000-0000-00000000000f', 'TEN-DEL',
          'aaaaaaaa-0000-0000-0000-000000000001', 'למחיקה');
  insert into public.tenbis_accounts (order_id, tenbis_user)
  values ('bbbbbbbb-0000-0000-0000-00000000000f', 'doomed');
  delete from public.orders where id = 'bbbbbbbb-0000-0000-0000-00000000000f';

  select count(*) into v_n from public.tenbis_accounts
   where order_id = 'bbbbbbbb-0000-0000-0000-00000000000f';
  perform test_assert(v_n = 0, 'deleting an order takes its credentials with it');
end $$;

-- ── 3. row level security ───────────────────────────────────────────────────
grant usage on schema public to authenticated;

do $$
declare v_n integer;
begin
  -- The owning agent reaches their own.
  perform become('aaaaaaaa-0000-0000-0000-000000000001');
  set local role authenticated;
  select count(*) into v_n from public.tenbis_accounts;
  perform test_assert(v_n = 1, 'the owning agent reaches their own credentials');
  reset role;

  -- The other agent reaches nothing. This is the whole suite in one line.
  perform become('aaaaaaaa-0000-0000-0000-000000000002');
  set local role authenticated;
  select count(*) into v_n from public.tenbis_accounts
   where order_id = 'bbbbbbbb-0000-0000-0000-000000000001';
  perform test_assert(v_n = 0,
    'another agent cannot read a customer they do not own');
  reset role;

  -- And cannot write to one either: reading is the loud failure, but writing
  -- would let somebody point another restaurant at credentials of their own.
  perform become('aaaaaaaa-0000-0000-0000-000000000002');
  set local role authenticated;
  update public.tenbis_accounts
     set tenbis_user = 'stolen'
   where order_id = 'bbbbbbbb-0000-0000-0000-000000000001';
  get diagnostics v_n = row_count;
  perform test_assert(v_n = 0, 'another agent cannot overwrite them either');
  reset role;

  -- Nor insert a row against an order that is not theirs, which the WITH CHECK
  -- half of the policy is there for — USING alone would allow it.
  perform become('aaaaaaaa-0000-0000-0000-000000000002');
  set local role authenticated;
  begin
    insert into public.tenbis_accounts (order_id, tenbis_user)
    values ('bbbbbbbb-0000-0000-0000-00000000000e', 'planted');
    perform test_assert(false, 'an agent planted a row on a foreign order');
  exception when insufficient_privilege or foreign_key_violation then
    perform test_assert(true, 'an agent cannot plant a row on a foreign order');
  end;
  reset role;

  -- A manager sees the lot, the same as everywhere else in the portal.
  perform become('aaaaaaaa-0000-0000-0000-000000000003');
  set local role authenticated;
  select count(*) into v_n from public.tenbis_accounts;
  perform test_assert(v_n >= 2, 'a manager reaches every one');
  reset role;

  perform become(null);
end $$;

-- ── 4. the anon key reaches none of it ──────────────────────────────────────
--
-- The anon key ships in the JavaScript of every page. 0004 revoked it from the
-- rest of the portal; this asserts the new table did not quietly reopen it.

do $$
declare v_n integer;
begin
  select count(*) into v_n
    from information_schema.role_table_grants
   where table_schema = 'public' and table_name = 'tenbis_accounts'
     and grantee = 'anon';
  perform test_assert(v_n = 0, 'anon holds no privilege on tenbis_accounts');
end $$;
