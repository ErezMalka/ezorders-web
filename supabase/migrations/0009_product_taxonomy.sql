-- 0009 · Two words that let a long catalogue be searched
--
-- The price list started at ten software items and could be read at a glance.
-- Hardware changes that: kiosk stands alone run to a dozen models from four
-- different manufacturers, and "which one was the 32-inch Wintec" is not a
-- question a scrolling table answers.
--
-- item_group cannot do this job. It is a pricing classification — it decides
-- whether a line lands in the setup block or the hardware block, and whether it
-- counts toward the volume discount. Every kiosk stand is 'hardware' and always
-- will be. What distinguishes them is who makes them and what kind of thing
-- they are, which is merchandising, not pricing. Two separate ideas, two
-- separate columns.
--
-- Free text rather than lookup tables, deliberately. A suppliers table means a
-- second admin screen, a foreign key, and a decision about what happens to
-- products when a supplier is removed — all to constrain a field that one
-- person types into a handful of times a year. The UI offers the values already
-- in use as suggestions, which is what a lookup table would have bought.

begin;

alter table public.products
  add column if not exists supplier text,
  add column if not exists category text;

comment on column public.products.supplier is
  'Who makes or sells it — Balamuth, Wintec, Dangot. Null for software.';
comment on column public.products.category is
  'What kind of thing it is — עמדת קיוסק, אביזר, מסך. Merchandising, not pricing: item_group decides the money.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_supplier_length'
  ) then
    alter table public.products
      add constraint products_supplier_length check (supplier is null or char_length(supplier) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_category_length'
  ) then
    alter table public.products
      add constraint products_category_length check (category is null or char_length(category) between 1 and 80);
  end if;
end $$;

-- The two kiosk stands entered before this column existed.
update public.products set supplier = 'Balamuth', category = 'עמדת קיוסק'
  where key = 'kiosk-balamuth-27' and supplier is null;
update public.products set supplier = 'Wintec', category = 'עמדת קיוסק'
  where key = 'kiosk-wintec-32' and supplier is null;

-- ── The agent's catalogue carries the two new words ──────────────────────────
--
-- price_list() deliberately does not. The public calculator sells outcomes, not
-- part numbers; "who manufactures this" is a question for someone already in a
-- conversation with a salesperson. Adding it there would put supplier names on
-- a marketing page for no one's benefit.
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

commit;
