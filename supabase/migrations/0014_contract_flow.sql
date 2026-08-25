-- 0014 · Who may do what to a contract
--
-- Split from 0013 because the enums created there cannot be referenced by
-- functions in the same transaction that created them.

begin;

alter table public.contract_templates enable row level security;
alter table public.contracts          enable row level security;
alter table public.contract_events    enable row level security;

-- ── templates: every agent reads, only an admin writes ─────────────────────
-- Same rule as the price list, same reason. An agent who could edit the terms
-- could sell a different contract than the one the company agreed to.
drop policy if exists contract_templates_read  on public.contract_templates;
drop policy if exists contract_templates_write on public.contract_templates;

create policy contract_templates_read on public.contract_templates
  for select using (public.is_active_agent());

create policy contract_templates_write on public.contract_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- ── contracts: your own, or everything if you manage ───────────────────────
drop policy if exists contracts_read on public.contracts;
create policy contracts_read on public.contracts
  for select using (
    deleted_at is null and (agent_id = auth.uid() or public.is_manager())
  );

-- No insert/update policy at all. Contracts are created and moved by the
-- security-definer functions below, which check what a policy cannot: that the
-- quote was actually sent, that the template was approved, that the customer
-- holds the token. An UPDATE policy here would be a second door into the same
-- room with a worse lock.

drop policy if exists contract_events_read on public.contract_events;
create policy contract_events_read on public.contract_events
  for select using (
    exists (
      select 1 from public.contracts c
       where c.id = contract_id
         and c.deleted_at is null
         and (c.agent_id = auth.uid() or public.is_manager())
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
--  create_contract_from_quote
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.create_contract_from_quote(p_quote uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
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

  -- A contract restates what the customer was already shown. Drafting one from
  -- a quote that was never sent would be drafting from a number nobody saw.
  if v_quote.status not in ('sent', 'viewed', 'accepted') then
    return jsonb_build_object('ok', false, 'code', 'quote_not_sent');
  end if;

  -- Already drafted? Hand back the same one. Two contracts for one quote is
  -- how a customer ends up signing the wrong one.
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
    -- The interlock: a transcribed but unread template renders perfectly and
    -- means nothing. Somebody has to say they read it.
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
  values (v_id, 'created', jsonb_build_object('quote_id', p_quote));

  return jsonb_build_object('ok', true, 'code', 'created',
                            'id', v_id, 'token', v_token,
                            'contract_number', (select contract_number from public.contracts where id = v_id));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
--  contract_by_token — the customer's view, and the thing that logs the visit
-- ════════════════════════════════════════════════════════════════════════════
--
-- Postgres cannot see the request, so the caller passes the address and the
-- user agent in. That is not a weakness in the evidence: the route that calls
-- this reads them from the connection, and the customer's browser never gets
-- to choose its own IP.
create or replace function public.contract_by_token(
  p_token  text,
  p_ip     text default null,
  p_ua     text default null,
  p_record boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_c        public.contracts;
  v_template public.contract_templates;
  v_items    jsonb;
  v_events   jsonb;
  v_first    boolean;
begin
  select * into v_c from public.contracts
   where public_token = p_token and deleted_at is null;
  if not found or v_c.status = 'draft' then
    return null;
  end if;

  if p_record and v_c.status <> 'cancelled' then
    v_first := v_c.first_viewed_at is null;

    update public.contracts
       set first_viewed_at = coalesce(first_viewed_at, now()),
           last_viewed_at  = now(),
           status = case when status = 'sent' then 'viewed'::public.contract_status else status end
     where id = v_c.id;

    insert into public.contract_events (contract_id, event_type, ip, user_agent)
    values (v_c.id,
            (case when v_first then 'opened' else 'reopened' end)::public.contract_event,
            -- A malformed address is dropped rather than failing the read. A
            -- customer must be able to open their contract even from behind
            -- something that reports its address strangely.
            (select case when p_ip ~ '^[0-9a-fA-F:.]+$' then p_ip::inet else null end),
            left(p_ua, 400));
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order), '[]'::jsonb)
    into v_items
    from (
      select component_key, item_group, label, note, image, quantity,
             setup_unit, monthly_unit, setup_total, monthly_total, sort_order
        from public.quote_items where quote_id = v_c.quote_id
    ) i;

  select * into v_template from public.contract_templates where version = v_c.template_version;

  select coalesce(jsonb_agg(jsonb_build_object(
           'at', e.at, 'type', e.event_type, 'ip', host(e.ip), 'ua', e.user_agent
         ) order by e.at, e.id), '[]'::jsonb)
    into v_events
    from public.contract_events e where e.contract_id = v_c.id;

  return jsonb_build_object(
    'contract_number', v_c.contract_number,
    'status',          v_c.status,
    'created_at',      v_c.created_at,
    'sent_at',         v_c.sent_at,
    'signed_at',       v_c.signed_at,
    'customer_name',   v_c.customer_name,
    'customer_tax_id', v_c.customer_tax_id,
    'customer_address', v_c.customer_address,
    'business_phone',  v_c.business_phone,
    'contact_name',    v_c.contact_name,
    'contact_phone',   v_c.contact_phone,
    'customer_email',  v_c.customer_email,
    'pos_company',     v_c.pos_company,
    'term_months',     v_c.term_months,
    'signer_name',     v_c.signer_name,
    'signer_id_number', v_c.signer_id_number,
    'signer_role',     v_c.signer_role,
    'signature_png',   v_c.signature_png,
    'document_hash',   v_c.document_hash,
    'agent_name',      (select full_name from public.agents a where a.id = v_c.agent_id),
    'template_version', v_template.version,
    'template_title',  v_template.title,
    'sections',        v_template.sections,
    'quote_number',    (select quote_number from public.quotes q where q.id = v_c.quote_id),
    'setup_total',     (select setup_total    from public.quotes q where q.id = v_c.quote_id),
    'hardware_total',  (select hardware_total from public.quotes q where q.id = v_c.quote_id),
    'monthly_total',   (select monthly_total  from public.quotes q where q.id = v_c.quote_id),
    'vat_percent',     (select vat_percent    from public.quotes q where q.id = v_c.quote_id),
    'items',           v_items,
    'events',          v_events
  );
end $$;

-- ════════════════════════════════════════════════════════════════════════════
--  contract_sign_by_token
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.contract_sign_by_token(
  p_token     text,
  p_signer    text,
  p_id_number text,
  p_role      text,
  p_signature text,
  p_hash      text,
  p_ip        text default null,
  p_ua        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_c public.contracts;
begin
  select * into v_c from public.contracts
   where public_token = p_token and deleted_at is null
   for update;

  -- Codes, not exceptions. The caller is a public route rendering a page for a
  -- customer; "this was already signed" is a sentence, not a stack trace.
  if not found or v_c.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_c.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'cancelled');
  end if;
  if v_c.status = 'signed' then
    return jsonb_build_object('ok', true, 'code', 'already_signed',
                              'contract_number', v_c.contract_number);
  end if;

  if coalesce(btrim(p_signer), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'signer_required');
  end if;
  -- A signature is a picture; an empty canvas posts as a tiny string.
  if coalesce(length(p_signature), 0) < 200 then
    return jsonb_build_object('ok', false, 'code', 'signature_required');
  end if;
  if coalesce(btrim(p_hash), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'hash_required');
  end if;

  update public.contracts
     set status           = 'signed',
         signer_name      = btrim(p_signer),
         signer_id_number = nullif(btrim(p_id_number), ''),
         signer_role      = nullif(btrim(p_role), ''),
         signature_png    = p_signature,
         document_hash    = btrim(p_hash),
         signed_at        = now(),
         last_viewed_at   = now()
   where id = v_c.id;

  insert into public.contract_events (contract_id, event_type, ip, user_agent, meta)
  values (v_c.id, 'signed',
          (select case when p_ip ~ '^[0-9a-fA-F:.]+$' then p_ip::inet else null end),
          left(p_ua, 400),
          jsonb_build_object('signer', btrim(p_signer), 'hash', btrim(p_hash)));

  return jsonb_build_object('ok', true, 'code', 'signed',
                            'contract_number', v_c.contract_number);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
--  the agent's side
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.contract_send(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_c public.contracts;
begin
  select * into v_c from public.contracts where id = p_id and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_c.agent_id <> auth.uid() and not public.is_manager() then
    return jsonb_build_object('ok', false, 'code', 'not_yours');
  end if;
  if v_c.status <> 'draft' then
    return jsonb_build_object('ok', true, 'code', 'already_sent',
                              'token', v_c.public_token);
  end if;

  update public.contracts set status = 'sent', sent_at = now() where id = p_id;
  insert into public.contract_events (contract_id, event_type) values (p_id, 'sent');

  return jsonb_build_object('ok', true, 'code', 'sent', 'token', v_c.public_token);
end $$;

create or replace function public.contract_cancel(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_c public.contracts;
begin
  select * into v_c from public.contracts where id = p_id and deleted_at is null;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  if v_c.agent_id <> auth.uid() and not public.is_manager() then
    return jsonb_build_object('ok', false, 'code', 'not_yours');
  end if;
  -- A signed contract is not cancellable by clicking. Ending it is a
  -- conversation between lawyers, and pretending otherwise here would put a
  -- button on the screen that lies about what it does.
  if v_c.status = 'signed' then
    return jsonb_build_object('ok', false, 'code', 'already_signed');
  end if;

  update public.contracts set status = 'cancelled', cancelled_at = now() where id = p_id;
  insert into public.contract_events (contract_id, event_type) values (p_id, 'cancelled');
  return jsonb_build_object('ok', true, 'code', 'cancelled');
end $$;

-- ── the list the agent portal reads ────────────────────────────────────────
create or replace view public.contracts_list
with (security_invoker = true) as
  select c.id, c.contract_number, c.status, c.customer_name, c.agent_id,
         a.full_name as agent_name,
         q.quote_number,
         c.created_at, c.sent_at, c.signed_at,
         c.signer_name,
         (select count(*) from public.contract_events e
           where e.contract_id = c.id and e.event_type in ('opened', 'reopened')) as view_count
    from public.contracts c
    join public.agents a on a.id = c.agent_id
    join public.quotes q on q.id = c.quote_id
   where c.deleted_at is null;

-- ── grants: nothing is callable that does not have to be ───────────────────
revoke all on function public.create_contract_from_quote(uuid)                     from public;
revoke all on function public.contract_by_token(text, text, text, boolean)         from public;
revoke all on function public.contract_sign_by_token(text, text, text, text, text, text, text, text) from public;
revoke all on function public.contract_send(uuid)                                  from public;
revoke all on function public.contract_cancel(uuid)                                from public;
-- Both revokes are needed and neither is redundant: Postgres grants EXECUTE to
-- PUBLIC when a function is created, and Supabase's default privileges add a
-- separate explicit grant to anon and authenticated. next_contract_number is
-- only ever called from inside a definer function, so it needs no grant at all.
revoke all on function public.next_contract_number() from public;
revoke all on function public.next_contract_number() from anon, authenticated;

revoke all on function public.create_contract_from_quote(uuid) from anon;
revoke all on function public.contract_send(uuid)                from anon;
revoke all on function public.contract_cancel(uuid)              from anon;

grant execute on function public.create_contract_from_quote(uuid) to authenticated;
grant execute on function public.contract_send(uuid)              to authenticated;
grant execute on function public.contract_cancel(uuid)            to authenticated;

-- The customer holds a token and no session. These two are the whole public
-- surface of the contract, and neither of them takes an id.
grant execute on function public.contract_by_token(text, text, text, boolean) to anon, authenticated;
grant execute on function public.contract_sign_by_token(text, text, text, text, text, text, text, text) to anon, authenticated;

commit;
