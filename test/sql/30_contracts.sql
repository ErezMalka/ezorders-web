-- The contract lifecycle, exercised through the same entry points the
-- application uses. Each check raises on failure, so a clean run is a pass.
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
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@ez.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@ez.com'),
  ('33333333-3333-3333-3333-333333333333', 'm@ez.com')
on conflict do nothing;

insert into public.agents (id, full_name, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'Agent A', 'a@ez.com', 'agent'),
  ('22222222-2222-2222-2222-222222222222', 'Agent B', 'b@ez.com', 'agent'),
  ('33333333-3333-3333-3333-333333333333', 'Manager', 'm@ez.com', 'manager')
on conflict do nothing;

insert into public.quotes (id, agent_id, customer_name, customer_tax_id, customer_email,
                           valid_until, status, public_token, term_months)
values
  ('c0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'מסעדת הבדיקה', '515000111', 'x@t.co.il', current_date + 30, 'sent',  'tok-sent',  12),
  ('c0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'טיוטה',        null,        null,        current_date + 30, 'draft', 'tok-draft', 12);

insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total,
                                is_discountable, sort_order)
values ('c0000001-0000-0000-0000-000000000001', 'pos', 'core', 'קופה', 2, 490, 350, 980, 700, true, 0);

-- ════════════════════════════════════════════════════════════════════════════
--  the interlock: no approved template, no contract
-- ════════════════════════════════════════════════════════════════════════════
-- The seeded template is deliberately unapproved. A transcription nobody has
-- read renders perfectly and means nothing, and this is the one document where
-- that difference is the whole point.
do $$
declare v jsonb;
begin
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  v := public.create_contract_from_quote('c0000001-0000-0000-0000-000000000001');
  reset role;
  perform test_assert(v->>'code' = 'no_approved_template',
                      'an unapproved template cannot become a contract');
end $$;

-- ── the seeded terms are the ones that were decided on ─────────────────────
-- Cheap assertions that catch a re-seed quietly losing an amendment. Each one
-- is a decision somebody made about a contract they will be sued under.
select test_assert(jsonb_array_length(sections) = 7, 'the terms have seven sections')
  from public.contract_templates where is_current;

select test_assert(
  (select count(*) from jsonb_array_elements(sections) s,
                        jsonb_array_elements(s->'clauses') c) = 44,
  'and forty-four clauses')
  from public.contract_templates where is_current;

select test_assert(
  sections::text like '%{{termWords}}%' and sections::text like '%{{termMonths}}%',
  'clause 1.4 carries the term placeholders rather than a hard-coded twelve')
  from public.contract_templates where is_current;

-- 2.8 set a percentage penalty that duplicated 2.9's remaining-payments rule.
select test_assert(
  not exists (
    select 1 from jsonb_array_elements(sections) s,
                  jsonb_array_elements(s->'clauses') c
     where c->>'text' like '%50!%%' escape '!' and c->>'text' like '%75!%%' escape '!'
  ),
  'the duplicate compensation formula is gone')
  from public.contract_templates where is_current;

select test_assert(
  sections::text not like '%48 שעות עסקים%' and sections::text not like '%3 ימי עסקים%'
  and sections::text like '%8 שעות שירות%',
  'one response time, counted in service hours')
  from public.contract_templates where is_current;

select test_assert(
  sections::text not like '%על פי בחירת בייט טכנולוגיה בע״מ%',
  'jurisdiction is exclusive, not chosen')
  from public.contract_templates where is_current;

select test_assert(
  sections::text like '%לפי סעיף 6.1 לעיל%',
  'the licence cross-reference points at the clause that grants it')
  from public.contract_templates where is_current;

-- ── version 2 · a term is not a commitment ─────────────────────────────────
-- The company sells no minimum period: a customer leaves on 60 days' notice and
-- owes nothing for months nobody will serve. A contract that said otherwise
-- would be the sales conversation's opposite, in writing.
select test_assert(
  sections::text like '%60 יום מראש%'
  and sections::text like '%אין בתקופה זו התחייבות%',
  'the terms carry a 60-day notice and no minimum period')
  from public.contract_templates where is_current;

select test_assert(
  sections::text not like '%מלוא התשלומים הנותרים%'
  and sections::text like '%אינו גורר תשלום בגין חודשים עתידיים%',
  'and charge nothing for future months')
  from public.contract_templates where is_current;

-- The notice exists so third-party systems can be unwound in order, and the
-- clause says which. A notice period without a reason reads as an obstacle.
select test_assert(
  sections::text like '%תעודות אבטחה (SSL)%'
  and sections::text like '%מסופי סליקה%',
  'and say what the notice period is for')
  from public.contract_templates where is_current;

select test_assert(
  sections::text not like '%כל הטבה שניתנה%',
  'a customer who leaves early does not repay their discount')
  from public.contract_templates where is_current;

-- Versions accumulate. A version that was approved is never edited, because a
-- contract issued under it must keep rendering the words that were signed.
select test_assert(count(*) >= 2, 'earlier versions are kept, not overwritten')
  from public.contract_templates;

select test_assert(count(*) = 1, 'exactly one version is current')
  from public.contract_templates where is_current;

-- An admin reads it and says so.
update public.contract_templates set is_approved = true, approved_at = now() where is_current;

-- ════════════════════════════════════════════════════════════════════════════
--  drafting
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v jsonb; v2 jsonb;
begin
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;

  -- A contract restates what the customer was already shown, so a quote that
  -- was never sent has nothing to restate.
  v := public.create_contract_from_quote('c0000002-0000-0000-0000-000000000002');
  perform test_assert(v->>'code' = 'quote_not_sent',
                      'a draft quote cannot become a contract');

  v := public.create_contract_from_quote('c0000001-0000-0000-0000-000000000001');
  perform test_assert((v->>'ok')::boolean and v->>'code' = 'created',
                      'a sent quote becomes a contract');
  perform test_assert(v->>'contract_number' like 'A-%',
                      'the contract is numbered');

  -- Asking twice must not produce two contracts: that is how a customer signs
  -- the wrong one.
  v2 := public.create_contract_from_quote('c0000001-0000-0000-0000-000000000001');
  perform test_assert(v2->>'code' = 'already_exists' and v2->>'id' = v->>'id',
                      'drafting twice hands back the same contract');

  reset role;
end $$;

do $$
declare v jsonb;
begin
  perform become('22222222-2222-2222-2222-222222222222');
  set local role authenticated;
  v := public.create_contract_from_quote('c0000001-0000-0000-0000-000000000001');
  reset role;
  perform test_assert(v->>'code' = 'not_your_quote',
                      'an agent cannot draft a contract on a colleague''s deal');
end $$;

select test_assert(count(*) = 1, 'exactly one contract exists')
  from public.contracts;

select test_assert(customer_name = 'מסעדת הבדיקה' and customer_tax_id = '515000111',
                   'the customer is snapshotted onto the contract')
  from public.contracts;

-- ════════════════════════════════════════════════════════════════════════════
--  a draft is invisible to the customer
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_token text; v jsonb;
begin
  select public_token into v_token from public.contracts;
  set local role anon;
  v := public.contract_by_token(v_token, '1.2.3.4', 'Chrome/1', true);
  reset role;
  perform test_assert(v is null, 'an unsent contract is not readable by token');
end $$;

select test_assert(count(*) = 0, 'and opening a draft records nothing')
  from public.contract_events where event_type in ('opened', 'reopened');

-- ════════════════════════════════════════════════════════════════════════════
--  sending, opening, reopening
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_id uuid; v jsonb;
begin
  select id into v_id from public.contracts;
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  v := public.contract_send(v_id);
  reset role;
  perform test_assert((v->>'ok')::boolean and v->>'code' = 'sent', 'the agent sends it');
end $$;

do $$
declare v_token text; v jsonb;
begin
  select public_token into v_token from public.contracts;
  set local role anon;
  v := public.contract_by_token(v_token, '38.56.233.89', 'Chrome/147', true);
  perform test_assert(v->>'contract_number' is not null, 'the customer can open it');
  perform test_assert(jsonb_array_length(v->'sections') = 7,
                      'and the terms come with it');
  perform test_assert(jsonb_array_length(v->'items') = 1,
                      'and so do the lines they were quoted');

  v := public.contract_by_token(v_token, '141.226.93.15', 'Safari/26', true);
  reset role;
end $$;

select test_assert(status = 'viewed', 'opening moves it from sent to viewed')
  from public.contracts;

select test_assert(count(*) = 1, 'the first open is recorded as opened')
  from public.contract_events where event_type = 'opened';
select test_assert(count(*) = 1, 'and the second as reopened')
  from public.contract_events where event_type = 'reopened';
select test_assert(host(ip) = '141.226.93.15' and user_agent = 'Safari/26',
                   'each visit carries its own address and browser')
  from public.contract_events where event_type = 'reopened';

-- A proxy that reports something that is not an address must not stop a
-- customer reading their own contract.
do $$
declare v_token text; v jsonb;
begin
  select public_token into v_token from public.contracts;
  set local role anon;
  v := public.contract_by_token(v_token, 'unknown', 'Chrome/147', true);
  reset role;
  perform test_assert(v is not null, 'a junk address does not block the read');
end $$;

select test_assert(ip is null, 'and is stored as null rather than guessed')
  from public.contract_events
 where event_type = 'reopened' order by at desc limit 1;

-- ════════════════════════════════════════════════════════════════════════════
--  signing
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_token text; v jsonb; v_sig text := 'data:image/png;base64,' || repeat('A', 400);
begin
  select public_token into v_token from public.contracts;
  set local role anon;

  v := public.contract_sign_by_token(v_token, '   ', '023541295', 'מנהל', v_sig, 'abc', '1.1.1.1', 'C');
  perform test_assert(v->>'code' = 'signer_required', 'a signature needs a name beside it');

  -- An empty canvas posts as a tiny string, and a tiny string is not a
  -- signature however sincerely it was submitted.
  v := public.contract_sign_by_token(v_token, 'יהודה', '023541295', 'מנהל', 'data:,', 'abc', '1.1.1.1', 'C');
  perform test_assert(v->>'code' = 'signature_required', 'an empty canvas is not a signature');

  v := public.contract_sign_by_token(v_token, 'יהודה', '023541295', 'מנהל', v_sig, '  ', '1.1.1.1', 'C');
  perform test_assert(v->>'code' = 'hash_required', 'a signature without a document hash is refused');

  v := public.contract_sign_by_token(v_token, 'יהודה בן סעדון', '023541295', 'מנהל',
                                     v_sig, 'deadbeef', '149.106.136.119', 'Chrome/147');
  perform test_assert((v->>'ok')::boolean and v->>'code' = 'signed', 'the customer signs');

  -- Refreshing the page after signing must not throw.
  v := public.contract_sign_by_token(v_token, 'יהודה בן סעדון', '023541295', 'מנהל',
                                     v_sig, 'deadbeef', '149.106.136.119', 'Chrome/147');
  perform test_assert(v->>'code' = 'already_signed', 'signing twice is idempotent');

  reset role;
end $$;

select test_assert(status = 'signed' and signer_name = 'יהודה בן סעדון'
                   and document_hash = 'deadbeef' and signed_at is not null,
                   'the signature and its evidence land together')
  from public.contracts;

select test_assert(host(ip) = '149.106.136.119' and user_agent = 'Chrome/147',
                   'the signing event carries the address it was signed from')
  from public.contract_events where event_type = 'signed';

-- The constraint, not just the function: no path leaves a signed contract
-- without the evidence that makes the signature mean anything.
do $$
begin
  begin
    update public.contracts set signature_png = null;
    raise exception 'FAIL: a signed contract kept its status without a signature';
  exception when check_violation then
    raise notice 'ok  a signed contract cannot lose its signature';
  end;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
--  after signing
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare v_id uuid; v jsonb;
begin
  select id into v_id from public.contracts;
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  v := public.contract_cancel(v_id);
  reset role;
  -- Ending a signed contract is a conversation between lawyers. A button that
  -- claimed to do it would be lying about what it does.
  perform test_assert(v->>'code' = 'already_signed',
                      'a signed contract cannot be cancelled by clicking');
end $$;

-- ════════════════════════════════════════════════════════════════════════════
--  who sees what
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  perform become('22222222-2222-2222-2222-222222222222');
  set local role authenticated;
  select count(*) into n from public.contracts;
  reset role;
  perform test_assert(n = 0, 'another agent sees no contracts at all');
end $$;

do $$
declare n int;
begin
  perform become('33333333-3333-3333-3333-333333333333');
  set local role authenticated;
  select count(*) into n from public.contracts_list;
  reset role;
  perform test_assert(n = 1, 'a manager sees every contract');
end $$;

do $$
declare n int;
begin
  set local role anon;
  select count(*) into n from public.contracts;
  reset role;
  perform test_assert(n = 0, 'anon reads no contract rows');
exception when insufficient_privilege then
  reset role;
  raise notice 'ok  anon reads no contract rows';
end $$;

-- The terms are readable by an agent and writable only by an admin — the same
-- rule as the price list, and for the same reason: an agent who could edit the
-- terms could sell a different contract than the one the company agreed to.
do $$
begin
  perform become('11111111-1111-1111-1111-111111111111');
  set local role authenticated;
  begin
    update public.contract_templates set sections = '[]'::jsonb where version = 1;
    if found then
      reset role;
      raise exception 'FAIL: a plain agent rewrote the terms';
    end if;
    raise notice 'ok  a plain agent cannot rewrite the terms';
  exception when insufficient_privilege then
    raise notice 'ok  a plain agent cannot rewrite the terms';
  end;
  reset role;
end $$;

select test_assert(jsonb_array_length(sections) = 7, 'the terms are unchanged after the attempt')
  from public.contract_templates where is_current;

select test_assert(count(*) = 0, 'every contract table has row level security')
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
   and c.relname in ('contracts', 'contract_events', 'contract_templates');

do $$ begin raise notice '── all contract tests passed'; end $$;
