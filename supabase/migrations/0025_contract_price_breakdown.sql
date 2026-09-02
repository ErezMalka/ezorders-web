-- 0025 · The contract shows the base fee and the discount
--
-- The contract's price table printed the quote's lines and, under them, the
-- quote's totals. The two did not add up, because two things live in the
-- totals and nowhere in the lines: the ₪1,950 base setup fee (inside
-- setup_total) and the tier discount (subtracted from monthly_total). A
-- customer who summed the column got a different number from the one they
-- were asked to sign, and was never told they had a discount at all.
--
-- The fix is in the renderer; this migration hands it the figures. And one
-- flag, because the document is hashed: a contract signed under the old table
-- must render as the old table forever, or its stored fingerprint stops
-- matching its stored fields.

begin;

-- ── layout_version ─────────────────────────────────────────────────────────
-- 1 is the original table. 2 shows the base fee line and the discount.
-- Anything not yet signed — including contracts already sent — moves to 2;
-- there is no fingerprint yet, and the customer should see the right table.
-- Everything signed stays exactly as signed.
alter table public.contracts
  add column if not exists layout_version smallint not null default 2;

update public.contracts
   set layout_version = 1
 where status = 'signed';

alter table public.contracts drop constraint if exists contracts_layout_version_known;
alter table public.contracts add constraint contracts_layout_version_known
  check (layout_version in (1, 2));

comment on column public.contracts.layout_version is
  'Which rendering of the price table this contract uses. Frozen at signing because the document hash covers the table. See 0025.';

-- ── contract_by_token ──────────────────────────────────────────────────────
-- Restated in full, as 0018 did, so one file shows every field it returns.
--
-- base_setup is derived, not looked up: setup_total minus the setup fees of
-- the software lines is exactly the base fee the quote was priced with, even
-- if pricing_settings.base_setup has since changed.
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
  v_q        public.quotes;
  v_template public.contract_templates;
  v_items    jsonb;
  v_events   jsonb;
  v_first    boolean;
  v_lines_setup numeric(12,2);
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

  select * into v_q from public.quotes q where q.id = v_c.quote_id;

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

  select coalesce(sum(setup_total) filter (where item_group <> 'hardware'), 0)
    into v_lines_setup
    from public.quote_items where quote_id = v_c.quote_id;

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
    'quote_number',    v_q.quote_number,
    'setup_total',     v_q.setup_total,
    'hardware_total',  v_q.hardware_total,
    'monthly_total',   v_q.monthly_total,
    'vat_percent',     v_q.vat_percent,
    'layout_version',  v_c.layout_version,
    'base_setup',      greatest(coalesce(v_q.setup_total, 0) - v_lines_setup, 0),
    'monthly_eligible',     v_q.monthly_eligible,
    'discount_percent',     v_q.discount_percent,
    'discount_amount',      v_q.discount_amount,
    'monthly_non_eligible', v_q.monthly_non_eligible,
    'items',           v_items,
    'events',          v_events
  );
end $$;

revoke all on function public.contract_by_token(text, text, text, boolean) from public;
grant execute on function public.contract_by_token(text, text, text, boolean) to anon, authenticated;

commit;
