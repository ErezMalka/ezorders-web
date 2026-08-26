-- 0024 · A contract without a quote in front of it
--
-- The portal had one road to a signed contract: build a quote, send it to the
-- customer, then draw the contract from it. That is the right order when there
-- is something to quote. It is the wrong order when the price was agreed on the
-- telephone and the customer is waiting for the agreement, not for a proposal
-- they have already said yes to.
--
-- What does NOT change is what a contract is made of. It renders the customer
-- and the lines that were agreed, its SHA-256 is taken over exactly those
-- words, and the pipeline counts the deal. All of that hangs off quote_id, and
-- a contract with nothing behind it would be a signed deal invisible in every
-- report the company reads.
--
-- So a direct contract still has a quote — it is simply a quote that was never
-- a proposal. `direct_contract` marks it: the portal writes the package onto it
-- and draws the contract in the same breath, and the quote itself is never sent
-- and never shown. It is the record of what was agreed, not a document anybody
-- reads.
--
--   · quotes_list drops those rows, so "ההצעות שלי" stays a list of proposals.
--     The deal appears under הסכמים, which is where the agent went looking.
--
--   · /q/<token> already refuses a draft, so the hidden quote has no reachable
--     address. Nothing about the customer's side changes.
--
--   · create_contract_from_quote accepts a draft when — and only when — it is
--     one of these. A quote an agent is still writing is not a contract.
--
--   · The freeze from 0022 grows one clause: a quote a live contract has been
--     drawn from cannot change either. Until now that was implied, because a
--     contract could only come from a quote that had already left draft. A
--     direct-contract quote stays a draft forever, and without this it would
--     stay editable underneath a document somebody had already signed.

begin;

alter table public.quotes
  add column if not exists direct_contract boolean not null default false;

comment on column public.quotes.direct_contract is
  'True when this quote exists only to carry a contract''s package: never sent, never listed. See 0024.';

-- ── the proposals list is a list of proposals ───────────────────────────────
create or replace view public.quotes_list
with (security_invoker = true) as
select
  q.id, q.quote_number, q.status,
  q.customer_name, q.customer_contact,
  q.setup_total, q.hardware_total, q.monthly_total, q.discount_percent, q.currency,
  q.setup_total + q.hardware_total + q.monthly_total * q.term_months::numeric as contract_value,
  q.term_months, q.valid_until, q.created_at, q.sent_at,
  q.first_viewed_at, q.view_count, q.public_token,
  q.agent_id, a.full_name as agent_name,
  (select count(*) from public.quote_items i where i.quote_id = q.id) as item_count,
  (q.valid_until < current_date and q.status in ('sent', 'viewed')) as is_expired
from public.quotes q
join public.agents a on a.id = q.agent_id
where q.deleted_at is null
  and not q.direct_contract;

grant select on public.quotes_list to authenticated;

-- ── a draft may become a contract, if that is what it was made for ──────────
create or replace function public.create_contract_from_quote(p_quote uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_quote    public.quotes;
  v_agent    uuid := auth.uid();
  v_template public.contract_templates;
  v_existing public.contracts;
  v_id       uuid;
  v_token    text;
begin
  if not public.is_active_agent() then
    return jsonb_build_object('ok', false, 'code', 'not_an_agent');
  end if;

  select * into v_quote from public.quotes
   where id = p_quote and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_such_quote');
  end if;

  if v_quote.agent_id <> v_agent and not public.is_manager() then
    return jsonb_build_object('ok', false, 'code', 'not_your_quote');
  end if;

  -- A proposal has to have been proposed. A direct-contract quote never will
  -- be, because nobody is meant to read it — it carries the package and
  -- nothing else.
  if v_quote.status not in ('sent', 'viewed', 'accepted')
     and not v_quote.direct_contract then
    return jsonb_build_object('ok', false, 'code', 'quote_not_sent');
  end if;

  select * into v_existing from public.contracts
   where quote_id = p_quote and deleted_at is null and status <> 'cancelled';
  if found then
    return jsonb_build_object(
      'ok', true, 'code', 'already_exists',
      'id', v_existing.id, 'token', v_existing.public_token,
      'contract_number', v_existing.contract_number);
  end if;

  select * into v_template from public.contract_templates
   where is_current and is_approved;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_approved_template');
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  insert into public.contracts (
    contract_number, quote_id, agent_id, template_version, status, public_token,
    customer_name, customer_tax_id, contact_name, contact_phone, customer_email,
    term_months
  ) values (
    public.next_contract_number(), p_quote, v_quote.agent_id, v_template.version,
    'draft', v_token,
    v_quote.customer_name, v_quote.customer_tax_id, v_quote.customer_contact,
    v_quote.customer_phone, v_quote.customer_email,
    coalesce(v_quote.term_months, 12)
  ) returning id into v_id;

  insert into public.contract_events (contract_id, event_type, meta)
  values (v_id, 'created',
          jsonb_build_object('quote_id', p_quote, 'direct', v_quote.direct_contract));

  return jsonb_build_object('ok', true, 'code', 'created',
                            'id', v_id, 'token', v_token,
                            'contract_number', (select contract_number from public.contracts where id = v_id));
end $function$;

-- ── and the freeze grows one clause ─────────────────────────────────────────
create or replace function public.quote_contents_are_frozen()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
begin
  if old.status = 'draft'
     and not exists (select 1 from public.contracts c
                      where c.quote_id = old.id
                        and c.deleted_at is null
                        and c.status <> 'cancelled')
  then
    return new;
  end if;

  if new.customer_name    is distinct from old.customer_name
     or new.customer_contact is distinct from old.customer_contact
     or new.customer_phone   is distinct from old.customer_phone
     or new.customer_email   is distinct from old.customer_email
     or new.customer_tax_id  is distinct from old.customer_tax_id
     or new.notes            is distinct from old.notes
     or new.valid_days       is distinct from old.valid_days
     or new.valid_until      is distinct from old.valid_until
     or new.vat_percent      is distinct from old.vat_percent
     or new.term_months      is distinct from old.term_months
  then
    raise exception 'quote % is no longer a draft nobody has acted on', old.quote_number
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create or replace function public.quote_lines_are_frozen()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_quote uuid := coalesce(new.quote_id, old.quote_id);
  v_status quote_status;
  v_number text;
  v_contract boolean;
begin
  select q.status, q.quote_number,
         exists (select 1 from public.contracts c
                  where c.quote_id = q.id
                    and c.deleted_at is null
                    and c.status <> 'cancelled')
    into v_status, v_number, v_contract
    from public.quotes q where q.id = v_quote;

  -- No parent row means the quote is being deleted around us; let the foreign
  -- key have the last word rather than raising a confusing error here.
  if v_status is null or (v_status = 'draft' and not v_contract) then
    return coalesce(new, old);
  end if;

  raise exception 'quote % is no longer a draft nobody has acted on; its lines cannot change', v_number
    using errcode = 'check_violation';
end $$;

revoke all on function public.quote_contents_are_frozen() from public, anon, authenticated, service_role;
revoke all on function public.quote_lines_are_frozen()    from public, anon, authenticated, service_role;

commit;
