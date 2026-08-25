-- 0018 · The agent's own words on the contract
--
-- The terms come from an approved template and the numbers come from the quote,
-- and neither is editable — that is deliberate and stays. But every deal has
-- something the template cannot know: which branch the second kiosk goes to,
-- that the printer is the customer's own, that installation waits for the
-- renovation. Until now the agent wrote that in a WhatsApp message, which is
-- not part of anything.
--
-- Two places for it, and no more: a note per line, and a note on the deal.
--
-- Both are inside the document, which means both are inside the hash. A note
-- added after the customer signed would change the fingerprint of a signed
-- contract, so the setter refuses once there is a signature.

begin;

alter table public.contracts
  add column if not exists notes            text,
  add column if not exists item_notes       jsonb not null default '{}'::jsonb,
  add column if not exists notes_updated_at timestamptz;

comment on column public.contracts.notes is
  'Free text the agent added to this deal. Rendered in the contract and covered by the document hash.';
comment on column public.contracts.item_notes is
  'component_key -> note, for the lines of the quote this contract was drafted from.';

-- Length is a correctness constraint here, not tidiness: this text is printed
-- into a document somebody signs, and there is no page that can hold a novel.
alter table public.contracts drop constraint if exists contracts_notes_length;
alter table public.contracts add constraint contracts_notes_length
  check (notes is null or char_length(notes) <= 4000);

alter table public.contracts drop constraint if exists contracts_item_notes_object;
alter table public.contracts add constraint contracts_item_notes_object
  check (jsonb_typeof(item_notes) = 'object');

-- ════════════════════════════════════════════════════════════════════════════
--  contract_set_notes
-- ════════════════════════════════════════════════════════════════════════════
-- The only writer. There is still no UPDATE policy on contracts, so this is the
-- door, and it is the door that enforces the two rules that matter: a signed or
-- cancelled contract is frozen, and a note can only hang off a line that
-- actually exists on the quote.
create or replace function public.contract_set_notes(
  p_id         uuid,
  p_notes      text,
  p_item_notes jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_c     public.contracts;
  v_clean jsonb;
begin
  select * into v_c from public.contracts where id = p_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_c.agent_id <> auth.uid() and not public.is_manager() then
    return jsonb_build_object('ok', false, 'code', 'not_yours');
  end if;

  -- The notes are part of the document, and the document hash is the whole
  -- point of the signature. Editing them afterwards would make the stored
  -- fingerprint disagree with the stored text, which is worse than not being
  -- able to edit at all.
  if v_c.status = 'signed' then
    return jsonb_build_object('ok', false, 'code', 'already_signed');
  end if;
  if v_c.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'code', 'cancelled');
  end if;

  if p_item_notes is not null and jsonb_typeof(p_item_notes) <> 'object' then
    return jsonb_build_object('ok', false, 'code', 'bad_item_notes');
  end if;

  -- Blank notes are absent notes, unknown keys are dropped rather than stored,
  -- and every value is cut to something that fits in a table cell.
  select coalesce(jsonb_object_agg(s.k, s.v), '{}'::jsonb)
    into v_clean
    from (
      select e.key as k, left(btrim(e.value), 400) as v
        from jsonb_each_text(coalesce(p_item_notes, '{}'::jsonb)) e
       where btrim(e.value) <> ''
         and exists (
           select 1 from public.quote_items qi
            where qi.quote_id = v_c.quote_id and qi.component_key = e.key
         )
    ) s;

  update public.contracts
     set notes            = nullif(btrim(left(p_notes, 4000)), ''),
         item_notes       = v_clean,
         notes_updated_at = now()
   where id = p_id;

  return jsonb_build_object('ok', true, 'code', 'saved', 'item_notes', v_clean);
end $$;

-- ════════════════════════════════════════════════════════════════════════════
--  the customer's payload carries them
-- ════════════════════════════════════════════════════════════════════════════
-- Restated in full rather than patched: this function is what the signed
-- document is rendered from, and a reader a year from now should be able to
-- open one file and see every field it returns.
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
            (select case when p_ip ~ '^[0-9a-fA-F:.]+$' then p_ip::inet else null end),
            left(p_ua, 400));
  end if;

  -- Each line carries the agent's note for it, under its own name: `note` is
  -- the catalogue's description of the product and `agent_note` is what this
  -- particular customer was told about it. Merging them would lose which is
  -- which the first time one of them has to be corrected.
  select coalesce(
           jsonb_agg(
             to_jsonb(i) || jsonb_build_object('agent_note', v_c.item_notes ->> i.component_key)
             order by i.sort_order
           ),
           '[]'::jsonb)
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
    'notes',           v_c.notes,
    'signer_name',     v_c.signer_name,
    'signer_id_number', v_c.signer_id_number,
    'signer_role',     v_c.signer_role,
    'signature_png',   v_c.signature_png,
    'document_hash',   v_c.document_hash,
    'agent_name',      (select full_name from public.agents a where a.id = v_c.agent_id),
    'agent_email',     (select email     from public.agents a where a.id = v_c.agent_id),
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

-- ── grants ─────────────────────────────────────────────────────────────────
-- Both revokes are needed: Postgres grants EXECUTE to PUBLIC on creation, and
-- Supabase's default privileges add their own grant to anon and authenticated.
revoke all on function public.contract_set_notes(uuid, text, jsonb) from public;
revoke all on function public.contract_set_notes(uuid, text, jsonb) from anon, authenticated;
grant execute on function public.contract_set_notes(uuid, text, jsonb) to authenticated;

revoke all on function public.contract_by_token(text, text, text, boolean) from public;
grant execute on function public.contract_by_token(text, text, text, boolean) to anon, authenticated;

commit;
