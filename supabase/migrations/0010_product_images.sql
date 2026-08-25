-- 0010 · A picture of the thing being sold
--
-- Fourteen kiosk models differ from each other in ways a name cannot carry. A
-- 27-inch Balamuth and a 32-inch double-sided Wintec are the same sentence with
-- different numbers in it; they are not remotely the same object, and an agent
-- picking one from a dropdown has no way to know that.
--
-- The column holds a path under /images/products, not a URL. The files ship
-- with the site: they were copied out of the WordPress media library on
-- bite.co.il rather than linked to it, because a cross-site image link breaks
-- the first time someone renames a file over there, and the failure is silent
-- and lands on a customer's quote.

alter table public.products
  add column if not exists image text;

comment on column public.products.image is
  'Site-relative path, e.g. /images/products/kiosk-dangot-22.webp. Never an external URL.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_image_is_local'
  ) then
    -- A check constraint rather than a convention. "Never an external URL" is
    -- the whole point of copying the files, and a convention is not enforcement.
    alter table public.products
      add constraint products_image_is_local
      check (image is null or image ~ '^/images/products/[a-z0-9._-]+$');
  end if;
end $$;

update public.products
   set image = '/images/products/' || key || '.webp'
 where item_group = 'hardware'
   and image is null
   and key in (
     'kiosk-fp-k1', 'kiosk-panel-pc', 'kiosk-selfpos60v', 'kiosk-sco-32-wintec',
     'kiosk-selfpos27-wintec', 'kiosk-wintec-32', 'kiosk-selfpos70-32-double',
     'kiosk-dangot-22', 'kiosk-dangot-32', 'kiosk-balamuth-27',
     'kiosk-cash-balamuth', 'kiosk-cash-balamuth-2', 'kiosk-balamuth-credit-2',
     'cashbox-balamuth'
   );

-- ── The line remembers the picture it was sold with ────────────────────────
--
-- Frozen onto the line, like the label and the price already are. A quote is a
-- record of what the customer was shown; if a catalogue photo is swapped next
-- year, an old quote showing the new model's picture is a small lie in a
-- document whose whole value is that it does not change after it is sent.
alter table public.quote_items
  add column if not exists image text;

comment on column public.quote_items.image is
  'The photo as it was at issue time. Never re-read from products.';

-- ── The agent's catalogue carries the picture ───────────────────────────────
create or replace function public.agent_price_list()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select case when public.is_active_agent() then jsonb_build_object(
    'baseSetup', (select value from public.pricing_settings where key = 'base_setup'),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key',        p.key,
          'label',      p.label,
          'note',       p.note,
          'txNote',     p.tx_note,
          'group',      p.item_group,
          'supplier',   p.supplier,
          'category',   p.category,
          'image',      p.image,
          'setup',      p.setup,
          'monthly',    p.monthly,
          'maxQty',     p.max_qty,
          'icon',       p.icon,
          'sortOrder',  p.sort_order
        )
        order by p.item_group, p.sort_order, p.key
      )
      from public.products p
      where p.is_active
    ), '[]'::jsonb)
  ) end;
$$;

revoke all on function public.agent_price_list() from public;
revoke all on function public.agent_price_list() from anon;
grant execute on function public.agent_price_list() to authenticated;

-- ── and the customer's copy of the quote shows it ───────────────────────────
-- One column added to the item projection. The rest of quote_by_token is
-- reproduced verbatim; there is no way to add a field to a jsonb projection
-- without restating the function.
create or replace function public.quote_by_token(p_token text, p_record_view boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  v_quote public.quotes;
  v_items jsonb;
  v_resp  public.quote_responses;
begin
  select * into v_quote
    from public.quotes
   where public_token = p_token
     and deleted_at is null;

  if not found then
    return null;
  end if;

  if v_quote.status = 'draft' then
    return null;
  end if;

  if p_record_view then
    update public.quotes
       set view_count      = view_count + 1,
           first_viewed_at = coalesce(first_viewed_at, now()),
           last_viewed_at  = now(),
           status          = case when status = 'sent' then 'viewed'::quote_status else status end
     where id = v_quote.id;

    insert into public.quote_events (quote_id, event_type)
    values (v_quote.id, 'viewed');
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order), '[]'::jsonb)
    into v_items
    from (
      select component_key, item_group, label, note, image, quantity,
             setup_unit, monthly_unit, setup_total, monthly_total,
             is_discountable, sort_order
        from public.quote_items
       where quote_id = v_quote.id
    ) i;

  select * into v_resp from public.quote_responses where quote_id = v_quote.id;

  return jsonb_build_object(
    'quote_number',         v_quote.quote_number,
    'created_at',           v_quote.created_at,
    'valid_until',          v_quote.valid_until,
    'status',               v_quote.status,
    'customer_name',        v_quote.customer_name,
    'customer_contact',     v_quote.customer_contact,
    'customer_phone',       v_quote.customer_phone,
    'customer_email',       v_quote.customer_email,
    'customer_tax_id',      v_quote.customer_tax_id,
    'setup_total',          v_quote.setup_total,
    'hardware_total',       v_quote.hardware_total,
    'monthly_eligible',     v_quote.monthly_eligible,
    'discount_percent',     v_quote.discount_percent,
    'discount_amount',      v_quote.discount_amount,
    'monthly_non_eligible', v_quote.monthly_non_eligible,
    'monthly_total',        v_quote.monthly_total,
    'vat_percent',          v_quote.vat_percent,
    'term_months',          v_quote.term_months,
    'notes',                v_quote.notes,
    'agent_name',           (select full_name from public.agents a where a.id = v_quote.agent_id),
    'items',                v_items,
    'is_expired',           (v_quote.valid_until < current_date),
    'responded',            (v_resp.id is not null),
    'response',             v_resp.response,
    'responded_at',         v_resp.created_at,
    'order_number',         (select order_number from public.orders o where o.quote_id = v_quote.id)
  );
end $fn$;

revoke all on function public.quote_by_token(text, boolean) from public;
grant execute on function public.quote_by_token(text, boolean) to anon, authenticated;
