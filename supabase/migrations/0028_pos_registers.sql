-- 0028 · Two point-of-sale registers, sold as complete stations
--
-- Both are `hardware`: bought outright, never monthly. Each price is for the
-- whole station — the terminal, what ships inside it, delivery and installation
-- — so the delivery/installation lines in the catalogue must NOT be added on
-- top of these. That is why the label says so.
--
--   pos-wintec   ₪5,500  Wintec register with a built-in receipt printer
--   pos-posbank  ₪7,500  POSBANK register with a card terminal and an SNBC printer
--
-- A new category, 'קופות', because a register is neither a kiosk nor a
-- kitchen screen and an agent should find it under its own heading. It sorts
-- FIRST among the hardware tabs (block 50–99): the register is the thing most
-- of the software runs on, and the kiosks — which begin at 100 — keep their
-- order behind it.
--
-- `on conflict (key) do update` so re-running corrects a price rather than
-- failing, as 0021 does.

begin;

insert into public.products
  (key, label, label_en, note, item_group, setup, monthly, max_qty, icon, sort_order,
   is_active, show_on_website, supplier, category, category_en)
values
  ('pos-wintec',
   'קופה Wintec כולל מדפסת פנימית, הובלה והתקנה',
   'Wintec POS register incl. built-in printer, delivery and installation',
   'המחיר כולל הובלה והתקנה — אין להוסיף שורות הובלה/התקנה בנפרד',
   'hardware', 5500, 0, 20, 'pos', 51, true, true, 'Wintec', 'קופות', 'POS registers'),
  ('pos-posbank',
   'קופה POSBANK כולל מסופון סליקה, מדפסת SNBC, הובלה והתקנה',
   'POSBANK POS register incl. card terminal, SNBC printer, delivery and installation',
   'המחיר כולל הובלה והתקנה — אין להוסיף שורות הובלה/התקנה בנפרד',
   'hardware', 7500, 0, 20, 'pos', 52, true, true, 'POSBANK', 'קופות', 'POS registers')
on conflict (key) do update
  set label            = excluded.label,
      label_en         = excluded.label_en,
      note             = excluded.note,
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
      category_en      = excluded.category_en,
      updated_at       = now();

commit;
