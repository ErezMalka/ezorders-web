-- A contract with no proposal in front of it, and the quote that carries it.
-- Each check raises on failure, so a clean run is a pass.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ── the package, written but never proposed ─────────────────────────────────
insert into public.quotes (id, agent_id, customer_name, customer_phone, valid_until,
                           status, public_token, direct_contract)
values ('dddddddd-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
        'נסגר בטלפון', '050-4000001', current_date + 14, 'draft', repeat('5', 48), true);

insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
values ('dddddddd-0000-0000-0000-00000000000a', 'pos', 'core', 'קופה', 2, 490, 350, 980, 700, true);

select public.recalc_quote('dddddddd-0000-0000-0000-00000000000a');

-- ── it is not a proposal, so it is not in the list of proposals ─────────────
select test_assert(not exists (
  select 1 from public.quotes_list where id = 'dddddddd-0000-0000-0000-00000000000a'),
  'a direct-contract quote stays out of the proposals list');

select test_assert(exists (
  select 1 from public.quotes where id = 'dddddddd-0000-0000-0000-00000000000a'),
  'while still being a row the pipeline can count');

-- ── a draft becomes a contract only when that is what it was made for ───────
do $$
declare v jsonb; v_id uuid;
begin
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;

  -- The ordinary draft from 30_contracts is still refused: a proposal has to
  -- have been proposed.
  v := public.create_contract_from_quote('c0000002-0000-0000-0000-000000000002');
  perform test_assert(v->>'code' = 'quote_not_sent',
                      'an ordinary draft still cannot become a contract');

  v := public.create_contract_from_quote('dddddddd-0000-0000-0000-00000000000a');
  perform test_assert((v->>'ok')::boolean and v->>'code' = 'created',
                      'a direct-contract draft becomes a contract');

  v_id := (v->>'id')::uuid;
  reset role;

  perform test_assert(
    (select customer_name from public.contracts where id = v_id) = 'נסגר בטלפון',
    'and the contract carries the customer it was written for');
end $$;

select test_assert(count(*) = 1, 'exactly one contract came out of it')
  from public.contracts where quote_id = 'dddddddd-0000-0000-0000-00000000000a';

-- ── and from that moment the package is the signed package ─────────────────
-- Until now the freeze rested on the quote having left draft. A direct-contract
-- quote never does, and without this it would stay editable underneath a
-- document somebody had already signed.
do $$
begin
  begin
    update public.quotes set customer_name = 'שם אחר'
     where id = 'dddddddd-0000-0000-0000-00000000000a';
    raise exception 'FAIL: the quote behind a contract was rewritten';
  exception when check_violation then
    raise notice 'ok  once a contract exists the quote cannot be rewritten';
  end;

  begin
    update public.quote_items set quantity = 9
     where quote_id = 'dddddddd-0000-0000-0000-00000000000a';
    raise exception 'FAIL: a line behind a contract was changed';
  exception when check_violation then
    raise notice 'ok  nor can its lines';
  end;
end $$;

-- A quote nobody has drawn a contract from is untouched by any of this.
insert into public.quotes (id, agent_id, customer_name, customer_phone, valid_until,
                           status, public_token, direct_contract)
values ('dddddddd-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
        'עוד טיוטה', '050-4000002', current_date + 14, 'draft', repeat('6', 48), false);

update public.quotes set customer_name = 'עוד טיוטה, בשם אחר'
 where id = 'dddddddd-0000-0000-0000-00000000000b';

select test_assert(customer_name = 'עוד טיוטה, בשם אחר',
                   'and a plain draft is still a plain draft')
  from public.quotes where id = 'dddddddd-0000-0000-0000-00000000000b';

do $$ begin raise notice '── all direct contract tests passed'; end $$;
