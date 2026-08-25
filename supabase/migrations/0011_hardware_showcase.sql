-- 0011 · The hardware gets a page of its own
--
-- Nineteen physical products have been sellable by an agent since this morning
-- and invisible to everyone else. A customer deciding between a 27-inch credit
-- kiosk and a double-sided cash kiosk cannot do that from a price they have not
-- seen and a photo nobody showed them.
--
-- Two functions rather than one flag doing two jobs. show_on_website has always
-- meant "a visitor may see this", and it still does; what changed is that there
-- are now two different places a visitor might see something, and they want
-- different lists.

begin;

-- ── price_list() is the calculator's list, and says so ──────────────────────
--
-- It was "everything flagged for the website", which was the same set until now.
-- The calculator adds up a monthly subscription; dropping a ₪29,800 cash kiosk
-- into that arithmetic changes what the page is, and hardware earns no discount
-- so it would sit in the totals contributing nothing but a number. The filter is
-- explicit so that flagging hardware for the website — which the next statement
-- does — cannot quietly redefine the calculator.
create or replace function public.price_list()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'baseSetup', (select value from public.pricing_settings where key = 'base_setup'),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'key',        p.key,
          'label',      p.label,
          'note',       p.note,
          'txNote',     p.tx_note,
          'group',      p.item_group,
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
        and p.show_on_website
        and p.item_group <> 'hardware'
    ), '[]'::jsonb)
  );
$$;

-- ── hardware_list() is the showcase ────────────────────────────────────────
--
-- Price, picture, category. No supplier: the manufacturer is a fact about our
-- supply chain, not about what the customer is buying, and printing it invites
-- them to go around us. Same reasoning that kept it out of price_list().
create or replace function public.hardware_list()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'key',      p.key,
        'label',    p.label,
        'note',     p.note,
        'category', p.category,
        'image',    p.image,
        'setup',    p.setup
      )
      order by p.category nulls last, p.sort_order, p.key
    )
    from public.products p
    where p.is_active
      and p.show_on_website
      and p.item_group = 'hardware'
  ), '[]'::jsonb);
$$;

revoke all on function public.price_list()    from public;
revoke all on function public.hardware_list() from public;
grant execute on function public.price_list()    to anon, authenticated;
grant execute on function public.hardware_list() to anon, authenticated;

-- ── show the goods, not the errands ────────────────────────────────────────
-- Delivery and installation are line items an agent adds to a quote, not things
-- a customer shops for. They stay off the page and get a sentence instead.
update public.products
   set show_on_website = true
 where item_group = 'hardware'
   and is_active
   and category is distinct from 'הובלה והתקנה';

commit;
