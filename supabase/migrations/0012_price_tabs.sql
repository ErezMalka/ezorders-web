-- 0012 · The category becomes a tab
--
-- The price page is about to grow tabs: software first, then the hardware
-- families. The obvious way to build that is a list of tabs in the page and a
-- mapping from each to some products, which means adding a printer costs a
-- deploy — the exact thing the catalogue was moved into the database to stop.
--
-- So the tab IS the category. A product typed with category 'מדפסות' makes a
-- מדפסות tab appear, and nothing in the codebase knows the word.
--
-- Which means the categories have to read like tabs, and until now they read
-- like admin shorthand: singular, and split finer than a customer cares about.
-- 'Cashbox' is a manufacturer's product name; a customer shopping for a machine
-- that takes banknotes wants the cash kiosks, all of them, in one place.

begin;

update public.products set category = 'עמדות קיוסק' where category = 'עמדת קיוסק';
update public.products set category = 'קיוסקי מזומן' where category in ('קיוסק מזומן', 'Cashbox');
update public.products set category = 'ציוד נוסף'   where category = 'אביזר';

-- ── sort_order now carries the tab order too ────────────────────────────────
--
-- One number instead of two. The tabs appear in the order their products first
-- appear, and the products inside a tab in their own order, so a single
-- `order by sort_order` produces both. Blocks of a hundred leave room to insert
-- a family — printers between the kiosks and the odds and ends, say — without
-- renumbering anything.
--
--   100–199  עמדות קיוסק      (cheapest first: it is a shopping list)
--   200–299  קיוסקי מזומן
--   300–399  reserved — מדפסות, when there are any
--   400–499  ציוד נוסף
--   900+     internal, never shown on the site
update public.products p
   set sort_order = base + rn
  from (
    select id,
           case category
             when 'עמדות קיוסק'   then 100
             when 'קיוסקי מזומן'  then 200
             when 'ציוד נוסף'     then 400
             else 900
           end as base,
           row_number() over (
             partition by category
             -- Ascending price inside a family. Someone deciding between eleven
             -- kiosks is deciding what to spend before deciding which model.
             order by setup, key
           ) as rn
      from public.products
     where item_group = 'hardware'
  ) ranked
 where p.id = ranked.id;

-- ── the showcase orders by that one number ─────────────────────────────────
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
      order by p.sort_order, p.key
    )
    from public.products p
    where p.is_active
      and p.show_on_website
      and p.item_group = 'hardware'
  ), '[]'::jsonb);
$$;

revoke all on function public.hardware_list() from public;
grant execute on function public.hardware_list() to anon, authenticated;

commit;
