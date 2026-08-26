-- When a quote may still be changed, and what stops it once it may not.
-- Each check raises on failure, so a clean run is a pass.
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ── a quote carries a phone number ──────────────────────────────────────────
-- The agent portal asks for one and the API refuses without it. Neither is the
-- last word: RLS lets an agent write to this table with their own session, so
-- the rule belongs where every writer meets it.
do $$
begin
  begin
    insert into public.quotes (id, agent_id, customer_name, valid_until, status, public_token)
    values ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
            'בלי טלפון', current_date + 14, 'draft', repeat('1', 48));
    raise exception 'FAIL: a quote with no phone was stored';
  exception when check_violation then
    raise notice 'ok  a quote with no phone number is refused';
  end;

  begin
    insert into public.quotes (id, agent_id, customer_name, customer_phone, valid_until, status, public_token)
    values ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
            'רווח בלבד', '   ', current_date + 14, 'draft', repeat('2', 48));
    raise exception 'FAIL: a quote with a blank phone was stored';
  exception when check_violation then
    raise notice 'ok  and so is one whose number is only whitespace';
  end;
end $$;

-- ── seed: one draft and one that has been sent ──────────────────────────────
insert into public.quotes (id, agent_id, customer_name, customer_phone, valid_until, status, public_token)
values
  ('cccccccc-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
   'טיוטה', '050-1111111', current_date + 14, 'draft', repeat('3', 48)),
  ('cccccccc-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111',
   'כבר נשלחה', '050-2222222', current_date + 14, 'draft', repeat('4', 48));

insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
values
  ('cccccccc-0000-0000-0000-00000000000a', 'pos', 'core', 'קופה', 1, 490, 350, 490, 350, true),
  ('cccccccc-0000-0000-0000-00000000000b', 'pos', 'core', 'קופה', 1, 490, 350, 490, 350, true);

select public.recalc_quote('cccccccc-0000-0000-0000-00000000000a');
select public.recalc_quote('cccccccc-0000-0000-0000-00000000000b');

-- Both were built as drafts, because that is the only way a quote can be built:
-- the lines go on first and the status moves afterwards. The second one is now
-- sent, and from here on it is a document rather than a draft.
update public.quotes set status = 'sent', sent_at = now()
 where id = 'cccccccc-0000-0000-0000-00000000000b';

-- ── a draft is still being written ──────────────────────────────────────────
update public.quotes
   set customer_name = 'טיוטה, בשם אחר', customer_phone = '050-9999999', notes = 'הערה'
 where id = 'cccccccc-0000-0000-0000-00000000000a';

select test_assert(customer_name = 'טיוטה, בשם אחר' and customer_phone = '050-9999999',
                   'a draft can still be rewritten')
  from public.quotes where id = 'cccccccc-0000-0000-0000-00000000000a';

-- Editing replaces the lines rather than reconciling them: a line is not a
-- thing with an identity, it is what the package came to when it was priced.
delete from public.quote_items where quote_id = 'cccccccc-0000-0000-0000-00000000000a';
insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
values ('cccccccc-0000-0000-0000-00000000000a', 'website', 'core', 'אתר', 1, 490, 450, 490, 450, true);

select test_assert(count(*) = 1, 'and its lines can be replaced')
  from public.quote_items where quote_id = 'cccccccc-0000-0000-0000-00000000000a';

-- ── a quote that has gone out is the document the customer is reading ───────
-- If they press the button, the SHA-256 of that document is stored as the
-- evidence of what they agreed to. Editing it afterwards would leave a stored
-- fingerprint that disagrees with the stored text.
do $$
begin
  begin
    update public.quotes set customer_name = 'שם חדש'
     where id = 'cccccccc-0000-0000-0000-00000000000b';
    raise exception 'FAIL: a sent quote was rewritten';
  exception when check_violation then
    raise notice 'ok  a sent quote will not take a new customer name';
  end;

  begin
    update public.quotes set notes = 'תנאי תשלום אחרים'
     where id = 'cccccccc-0000-0000-0000-00000000000b';
    raise exception 'FAIL: a sent quote took new notes';
  exception when check_violation then
    raise notice 'ok  nor new notes';
  end;

  begin
    insert into public.quote_items (quote_id, component_key, item_group, label, quantity,
                                    setup_unit, monthly_unit, setup_total, monthly_total, is_discountable)
    values ('cccccccc-0000-0000-0000-00000000000b', 'kiosk', 'core', 'קיוסק', 1, 490, 350, 490, 350, true);
    raise exception 'FAIL: a line was added to a sent quote';
  exception when check_violation then
    raise notice 'ok  nor another line';
  end;

  begin
    update public.quote_items set quantity = 5
     where quote_id = 'cccccccc-0000-0000-0000-00000000000b';
    raise exception 'FAIL: a line on a sent quote was changed';
  exception when check_violation then
    raise notice 'ok  nor a different quantity on the line it has';
  end;

  begin
    delete from public.quote_items where quote_id = 'cccccccc-0000-0000-0000-00000000000b';
    raise exception 'FAIL: a line was removed from a sent quote';
  exception when check_violation then
    raise notice 'ok  and its lines cannot be removed';
  end;
end $$;

-- ── what still moves ────────────────────────────────────────────────────────
-- Only the CONTENTS freeze. A sent quote is still being read, answered and
-- repriced by recalc_quote(), and a freeze that stopped any of those would
-- break the thing it was meant to protect.
update public.quotes
   set status = 'viewed', view_count = view_count + 1, first_viewed_at = now()
 where id = 'cccccccc-0000-0000-0000-00000000000b';

select test_assert(status = 'viewed' and view_count = 1,
                   'a sent quote still records that it was opened')
  from public.quotes where id = 'cccccccc-0000-0000-0000-00000000000b';

select public.recalc_quote('cccccccc-0000-0000-0000-00000000000b');
select test_assert(monthly_total = 350, 'and recalc_quote can still price it')
  from public.quotes where id = 'cccccccc-0000-0000-0000-00000000000b';

do $$ begin raise notice '── all quote editing tests passed'; end $$;
