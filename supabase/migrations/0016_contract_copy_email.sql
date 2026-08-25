-- 0016 · A copy of the signed contract, to both sides
--
-- Signing produced a row and a link. What the two parties actually need is a
-- copy each: the customer needs to file what they signed, and the company needs
-- it to arrive somewhere that is not a database.
--
-- Two small things the route needs to send it.

begin;

-- When the copy went out. Null on a contract signed before this existed, and on
-- one whose email failed — which must never fail the signature, so the column
-- records a fact rather than gating anything.
alter table public.contracts
  add column if not exists signed_email_sent_at timestamptz;

comment on column public.contracts.signed_email_sent_at is
  'When the signed copy was emailed to both parties. Null means it was not sent; the signature stands either way.';

-- ── the payload carries the agent's address ────────────────────────────────
-- So the copy can go to the person handling the deal and not only to a shared
-- inbox. The customer already knows who their agent is; this is not a
-- disclosure, it is the reply-to they would have used anyway.
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

revoke all on function public.contract_by_token(text, text, text, boolean) from public;
grant execute on function public.contract_by_token(text, text, text, boolean) to anon, authenticated;

commit;
