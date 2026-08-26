-- 0021 · Eight more physical goods: KDS screens and their mounts, a printer,
--        and two payment terminals
--
-- All eight are `hardware`: bought outright, never discounted, never monthly.
-- A recurring charge on an object is a rental, which is a different product and
-- a different contract — so `monthly` is 0 here and stays 0.
--
-- Three new categories join the four that exist, because the kiosk headings do
-- not describe a kitchen screen or a card reader, and an agent choosing between
-- a 15.6" and a 22" should not scroll past cash kiosks to find them.
--
-- `on conflict (key) do update` so re-running this migration corrects a price
-- rather than failing — the prices are the point of the change, and a product
-- key that already exists is a re-run, not a collision.

begin;

insert into public.products
  (key, label, note, item_group, setup, monthly, max_qty, icon, sort_order,
   is_active, show_on_website, supplier, category)
values
  ('kds-wintec-15',  'מסך מטבח KDS ‎15.6"‎', '', 'hardware',  3300, 0, 10, 'box',  301, true, true,  'Wintec', 'מסכי מטבח (KDS)'),
  ('kds-wintec-22',  'מסך מטבח KDS ‎22"‎',   '', 'hardware',  5600, 0, 10, 'box',  302, true, true,  'Wintec', 'מסכי מטבח (KDS)'),
  ('acc-kds-stand',  'סטנד שולחני ל-KDS',    '', 'hardware',   520, 0, 20, 'box',  311, true, true,  null,     'אביזרים ל-KDS'),
  ('acc-kds-arm',    'זרוע ל-KDS',           '', 'hardware',   580, 0, 20, 'box',  312, true, true,  null,     'אביזרים ל-KDS'),
  ('acc-kds-wall',   'מתקן קיר ל-KDS',       '', 'hardware',   240, 0, 20, 'box',  313, true, true,  null,     'אביזרים ל-KDS'),
  ('printer-snbc',   'מדפסת SNBC',           '', 'hardware',  1250, 0, 20, 'box',  321, true, true,  'SNBC',   'מדפסות'),
  ('pax-a35',        'סולק אשראי PAX A35',   '', 'hardware',  1250, 0, 20, 'card', 331, true, true,  'PAX',    'סליקה'),
  ('pax-a77',        'סולק אשראי PAX A77',   '', 'hardware',  1500, 0, 20, 'card', 332, true, true,  'PAX',    'סליקה')
on conflict (key) do update
  set label            = excluded.label,
      item_group       = excluded.item_group,
      setup            = excluded.setup,
      monthly          = excluded.monthly,
      max_qty          = excluded.max_qty,
      icon             = excluded.icon,
      sort_order       = excluded.sort_order,
      is_active        = excluded.is_active,
      show_on_website  = excluded.show_on_website,
      supplier         = excluded.supplier,
      category         = excluded.category,
      updated_at       = now();

commit;
