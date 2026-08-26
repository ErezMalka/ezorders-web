-- Behaviour of the orders migration, exercised through the same entry points
-- the application uses. Each check raises on failure, so a clean run is a pass.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function test_assert(p_cond boolean, p_what text)
returns void language plpgsql as $$
begin
  if not p_cond then raise exception 'FAIL: %', p_what; end if;
  raise notice 'ok  %', p_what;
end $$;

create or replace function become(p_id uuid) returns void
language sql as $$ select set_config('request.jwt.claim.sub', coalesce(p_id::text,''), false); $$;

-- ── seed ────────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@ez.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@ez.com'),
  ('33333333-3333-3333-3333-333333333333', 'm@ez.com');

insert into public.agents (id, full_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'Agent A',  'a@ez.com', 'agent'),
  ('22222222-2222-2222-2222-222222222222', 'Agent B',  'b@ez.com', 'agent'),
  ('33333333-3333-3333-3333-333333333333', 'Manager',  'm@ez.com', 'manager');

-- Four quotes belonging to agent A: one to accept, one to reject, one expired,
-- one left as a draft.
-- Every quote carries a phone number: since 0022 the database refuses one
-- without. An email is still optional — plenty of customers do not give one and
-- the link goes out on WhatsApp.
insert into public.quotes (id, agent_id, customer_name, customer_phone, customer_email, valid_until, status, public_token)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'מסעדת הדג', '050-1000001', 'dag@x.com', current_date + 14, 'draft', repeat('a', 48)),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'פיצה רומא', '050-1000002', null, current_date + 14, 'draft', repeat('b', 48)),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'קפה נחמד', '050-1000003', null, current_date - 1, 'draft', repeat('c', 48)),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'בורגר בר', '050-1000004', null, current_date + 14, 'draft', repeat('d', 48)),
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111',
   'סושי סאן', '050-1000005', null, current_date + 14, 'draft', repeat('e', 48));

insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
select id, 'pos', 'core', 'קופה', 1, 0, 800, 0, 800, true from public.quotes;

select public.recalc_quote(id) from public.quotes;

-- Built the way the portal builds one: the lines go on while the quote is still
-- a draft, and the status moves afterwards. Since 0022 that is not a stylistic
-- choice — a quote that has gone out is the document the customer is reading,
-- and the database refuses to let its lines change.
update public.quotes set status = 'sent'
 where id in ('aaaaaaaa-0000-0000-0000-000000000001',
              'aaaaaaaa-0000-0000-0000-000000000003',
              'aaaaaaaa-0000-0000-0000-000000000005');
update public.quotes set status = 'viewed'
 where id = 'aaaaaaaa-0000-0000-0000-000000000002';

-- ── 1. the customer accepts ─────────────────────────────────────────────────
do $$
declare r jsonb;
begin
  r := public.quote_respond_by_token(
        repeat('a', 48), 'accepted', 'דנה כהן', 'בעלים', '514999888',
        'dana@x.com', '050-1234567', null, repeat('f', 64), '203.0.113.7', 'Mozilla/5.0');

  perform test_assert((r->>'ok')::boolean, 'accept returns ok');
  perform test_assert(r->>'code' = 'accepted', 'accept code is accepted');
  perform test_assert(r->>'order_number' = 'O-' || to_char(now(),'YYYY') || '-0001',
                      'first order is numbered 0001');
end $$;

select test_assert(status = 'accepted' and responded_at is not null,
                   'quote moves to accepted with a timestamp')
  from public.quotes where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select test_assert(count(*) = 1, 'exactly one order exists')
  from public.orders;

-- The money is copied, not joined.
select test_assert(o.setup_total = q.setup_total and o.monthly_total = q.monthly_total
                   and o.term_months = q.term_months and o.vat_percent = q.vat_percent,
                   'order freezes the quote figures')
  from public.orders o join public.quotes q on q.id = o.quote_id;

select test_assert(signer_name = 'דנה כהן' and document_hash = repeat('f', 64)
                   and ip = '203.0.113.7'::inet and channel = 'customer',
                   'acceptance evidence is recorded')
  from public.quote_responses where quote_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Editing the quote afterwards must not move the order.
update public.quotes set monthly_total = 1
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select test_assert(monthly_total <> 1, 'a later edit to the quote does not reprice the order')
  from public.orders where quote_id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── 2. reloading the page does not sell it twice ────────────────────────────
do $$
declare r jsonb;
begin
  r := public.quote_respond_by_token(repeat('a', 48), 'accepted', 'דנה כהן');
  perform test_assert((r->>'ok')::boolean, 'second accept still returns ok');
  perform test_assert(r->>'code' = 'already_accepted', 'second accept is recognised as a repeat');
  perform test_assert(r->>'order_number' = 'O-' || to_char(now(),'YYYY') || '-0001',
                      'the repeat returns the same order');
end $$;

select test_assert(count(*) = 1, 'still exactly one order') from public.orders;

-- ── 3. rejection ────────────────────────────────────────────────────────────
do $$
declare r jsonb;
begin
  r := public.quote_respond_by_token(repeat('b', 48), 'rejected', null, null, null, null, null,
                                     'יקר מדי');
  perform test_assert((r->>'ok')::boolean, 'reject returns ok');
  perform test_assert(r->>'order_number' is null, 'a rejection creates no order');
end $$;

select test_assert(status = 'rejected', 'quote moves to rejected')
  from public.quotes where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select test_assert(reason = 'יקר מדי', 'the reason is kept')
  from public.quote_responses where quote_id = 'aaaaaaaa-0000-0000-0000-000000000002';
select test_assert(count(*) = 1, 'a rejection did not create an order') from public.orders;

-- ── 4. the refusals ─────────────────────────────────────────────────────────
do $$
declare r jsonb;
begin
  r := public.quote_respond_by_token(repeat('c', 48), 'accepted', 'מישהו');
  perform test_assert(r->>'code' = 'expired', 'an expired quote cannot be accepted');

  r := public.quote_respond_by_token(repeat('d', 48), 'accepted', 'מישהו');
  perform test_assert(r->>'code' = 'not_found', 'a draft is invisible through its token');

  r := public.quote_respond_by_token(repeat('9', 48), 'accepted', 'מישהו');
  perform test_assert(r->>'code' = 'not_found', 'an unknown token says nothing');

  r := public.quote_respond_by_token(repeat('e', 48), 'accepted', '   ');
  perform test_assert(r->>'code' = 'signer_required', 'accepting requires a name');

  r := public.quote_respond_by_token(repeat('e', 48), 'maybe', 'מישהו');
  perform test_assert(r->>'code' = 'bad_response', 'only accept or reject are answers');

  -- An expired quote may still be turned down. Nobody is harmed by a late no,
  -- and the reason is worth having.
  r := public.quote_respond_by_token(repeat('c', 48), 'rejected', null, null, null, null, null,
                                     'עברנו למתחרה');
  perform test_assert((r->>'ok')::boolean, 'an expired quote can still be rejected');
end $$;

-- A malformed forwarded-for header must not cost the acceptance.
do $$
declare r jsonb;
begin
  r := public.quote_respond_by_token(repeat('e', 48), 'accepted', 'רון לוי', null, null, null, null,
                                     null, null, 'not-an-ip', 'UA');
  perform test_assert((r->>'ok')::boolean, 'a junk IP header does not block the acceptance');
end $$;
select test_assert(ip is null, 'the junk IP is stored as null rather than guessed')
  from public.quote_responses where quote_id = 'aaaaaaaa-0000-0000-0000-000000000005';

-- ── 5. the telephone yes, and who may record it ─────────────────────────────
insert into public.quotes (id, agent_id, customer_name, customer_phone, valid_until, status, public_token)
values ('aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111',
        'שווארמה מרכזית', '050-1000006', current_date + 14, 'draft', repeat('7', 48));
insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
values ('aaaaaaaa-0000-0000-0000-000000000006', 'pos', 'core', 'קופה', 1, 0, 800, 0, 800, true);
select public.recalc_quote('aaaaaaaa-0000-0000-0000-000000000006');
update public.quotes set status = 'sent' where id = 'aaaaaaaa-0000-0000-0000-000000000006';

do $$
declare r jsonb;
begin
  perform become('22222222-2222-2222-2222-222222222222');   -- another agent
  r := public.quote_accept_by_agent('aaaaaaaa-0000-0000-0000-000000000006');
  perform test_assert(r->>'code' = 'forbidden', 'an agent cannot close a colleague''s deal');

  perform become('11111111-1111-1111-1111-111111111111');   -- the owner
  r := public.quote_accept_by_agent('aaaaaaaa-0000-0000-0000-000000000006', 'אישר טלפונית');
  perform test_assert((r->>'ok')::boolean, 'the owning agent can record a telephone yes');

  perform become(null);
end $$;

select test_assert(channel = 'agent' and signer_name is null and document_hash is null
                   and recorded_by = '11111111-1111-1111-1111-111111111111',
                   'a telephone yes carries no forged evidence')
  from public.quote_responses where quote_id = 'aaaaaaaa-0000-0000-0000-000000000006';

-- ── 6. status stamping ──────────────────────────────────────────────────────
do $$
declare v_id uuid;
begin
  select id into v_id from public.orders
   where quote_id = 'aaaaaaaa-0000-0000-0000-000000000001';

  update public.orders set status = 'in_setup' where id = v_id;
  perform test_assert((select setup_started_at is not null from public.orders where id = v_id),
                      'moving to in_setup stamps the start');

  update public.orders set status = 'live' where id = v_id;
  perform test_assert((select went_live_at is not null from public.orders where id = v_id),
                      'moving to live stamps go-live');

  update public.orders set status = 'cancelled', cancel_reason = 'סגרו את העסק' where id = v_id;
  perform test_assert((select cancelled_at is not null from public.orders where id = v_id),
                      'cancelling stamps the cancellation');

  update public.orders set status = 'live' where id = v_id;
  perform test_assert((select cancelled_at is null and cancel_reason is null
                         from public.orders where id = v_id),
                      'reopening clears the cancellation');
end $$;

-- ── 7. row level security ───────────────────────────────────────────────────
grant usage on schema public to authenticated;

do $$
declare v_n integer;
begin
  -- Agent A sees their own orders.
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  select count(*) into v_n from public.orders;
  perform test_assert(v_n = 3, 'the owning agent sees their orders');
  reset role;

  -- Agent B sees none of them.
  perform become('22222222-2222-2222-2222-222222222222');
  set local role authenticated;
  select count(*) into v_n from public.orders;
  perform test_assert(v_n = 0, 'another agent sees no orders at all');
  reset role;

  -- The manager sees everything.
  perform become('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  select count(*) into v_n from public.orders;
  perform test_assert(v_n = 3, 'a manager sees every order');
  select count(*) into v_n from public.orders_list;
  perform test_assert(v_n = 3, 'and the list view agrees');
  reset role;

  perform become(null);
end $$;

-- Nobody may write an acceptance record by hand, or edit one.
do $$
begin
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  begin
    insert into public.quote_responses (quote_id, response, signer_name)
    values ('aaaaaaaa-0000-0000-0000-000000000003', 'accepted', 'מזויף');
    reset role;
    raise exception 'FAIL: an agent was able to write an acceptance record';
  exception when insufficient_privilege or check_violation then
    reset role;
    raise notice 'ok  the acceptance record cannot be written by hand';
  end;
  perform become(null);
end $$;

-- anon reaches exactly one function and no table.
do $$
begin
  set local role anon;
  begin
    perform count(*) from public.orders;
    reset role;
    raise exception 'FAIL: anon can read orders';
  exception when insufficient_privilege then
    reset role;
    raise notice 'ok  anon cannot read orders';
  end;
end $$;

do $$
begin
  set local role authenticated;
  begin
    perform public.create_order_from_quote('aaaaaaaa-0000-0000-0000-000000000003');
    reset role;
    raise exception 'FAIL: create_order_from_quote is callable directly';
  exception when insufficient_privilege then
    reset role;
    raise notice 'ok  create_order_from_quote is not callable directly';
  end;
end $$;

-- ── 8. the list view ────────────────────────────────────────────────────────
select test_assert(count(*) = 3, 'orders_list returns every order') from public.orders_list;
select test_assert(contract_value = setup_total + monthly_total * term_months,
                   'contract value is setup plus the whole term')
  from public.orders_list limit 1;
select test_assert(accept_channel = 'customer' and signer_name = 'דנה כהן',
                   'the list carries how it was accepted')
  from public.orders_list where quote_number is not null
   and accept_channel = 'customer' limit 1;

\echo '── all order tests passed'
