-- 0027 — English names for the catalogue
--
-- /en/price runs the same calculator as /he/price, but the database has held
-- one label column, written in Hebrew by whoever adds a product in
-- /he/agent/products. The English page carried a hard-coded map of names for
-- the software products and showed no hardware at all, because nobody had
-- named a kiosk in English anywhere.
--
-- Three nullable columns: label_en, note_en, category_en. Null means "no
-- English name yet"; the site then falls back to the Hebrew label rather than
-- hiding the product, so a new product an admin adds still appears on /en,
-- just untranslated, and the gap is visible rather than silent.
--
-- The three read functions gain the columns. Their bodies are otherwise
-- reproduced verbatim from 0010/0011: there is no way to add a key to a jsonb
-- projection without restating it.

alter table public.products
  add column if not exists label_en    text,
  add column if not exists note_en     text,
  add column if not exists category_en text;

comment on column public.products.label_en is
  'English product name for /en. Null = not translated yet; the site shows the Hebrew label.';
comment on column public.products.note_en is
  'English counterpart of note (the small line under the name).';
comment on column public.products.category_en is
  'English counterpart of category (hardware family shown as a tab / section title).';

-- ── the names ────────────────────────────────────────────────────────────────
update public.products p
   set label_en = v.label_en,
       note_en  = v.note_en
  from (values
    -- software
    ('pos',        'Point of sale (POS)',        'per till'),
    ('website',    'Ordering website',           'per branch'),
    ('kiosk',      'Self-service kiosk',         'per station'),
    ('loyalty',    'Loyalty club',               'per branch'),
    ('ezwallet',   'EzWallet',                   null),
    ('feedback',   'Feedback module',            null),
    ('kds',        'Kitchen display (KDS)',      'per screen'),
    ('cds',        'Customer display (CDS)',     'per station'),
    ('bit',        'Bit payments',               null),
    ('applepay',   'Apple Pay / Google Pay',     null),
    ('secure3d',   '3D Secure',                  null),
    ('app',        'Branded mobile app',         null),
    ('tenbis',     'Tenbis',                     'ordering interface'),
    ('cibus',      'Cibus',                      'payment interface'),
    ('mishloha',   'Mishloha',                   'ordering interface'),
    ('wolt',       'Wolt',                       'ordering interface'),
    ('wolt_drive', 'Wolt Drive',                 'delivery interface'),
    ('haat',       'HAAT',                       'ordering interface'),
    -- hardware
    ('kiosk-panel-pc',            'Panel PC kiosk',                          null),
    ('kiosk-balamuth-27',         'Balamuth 27" card kiosk',                 null),
    ('kiosk-fp-k1',               'FP-K1 payment station',                   null),
    ('kiosk-selfpos60v',          'SELFPOS60V payment station',              null),
    ('kiosk-selfpos27-wintec',    'SelfPOS27 Wintec kiosk',                  null),
    ('kiosk-dangot-22',           'Dangot 22" kiosk',                        null),
    ('kiosk-sco-32-wintec',       'Sco 32" Wintec kiosk',                    null),
    ('kiosk-wintec-32',           'Wintec 32" card kiosk',                   null),
    ('kiosk-dangot-32',           'Dangot 32" kiosk',                        null),
    ('kiosk-balamuth-credit-2',   'Balamuth double-sided card kiosk',        null),
    ('kiosk-selfpos70-32-double', 'SelfPos70 Black 32" double-sided kiosk',  null),
    ('cashbox-balamuth',          'Balamuth counter cashbox',                null),
    ('kiosk-cash-balamuth',       'Balamuth cash kiosk',                     null),
    ('kiosk-cash-balamuth-2',     'Balamuth double-sided cash kiosk',        null),
    ('kds-wintec-15',             'Kitchen display (KDS) 15.6"',             null),
    ('kds-wintec-22',             'Kitchen display (KDS) 22"',               null),
    ('acc-kds-stand',             'KDS desk stand',                          null),
    ('acc-kds-arm',               'KDS arm mount',                           null),
    ('acc-kds-wall',              'KDS wall mount',                          null),
    ('printer-snbc',              'SNBC receipt printer',                    null),
    ('pax-a35',                   'PAX A35 card terminal',                   null),
    ('pax-a77',                   'PAX A77 card terminal',                   null),
    ('acc-kiosk-wheels',          'Kiosk wheels',                            null),
    ('acc-stand-legs',            'Cashbox counter legs',                    null),
    ('acc-admin-display',         'Manager display (Android)',               null),
    ('svc-delivery-center',       'Delivery (central Israel)',               null),
    ('svc-installation',          'Installation',                            null)
  ) as v(key, label_en, note_en)
 where p.key = v.key;

-- 3D Secure carries a per-transaction note; the English one lives in code
-- (EN_LABELS in PricingCalculator.tsx) since tx_note has no _en twin. One
-- string; not worth a column.

update public.products p
   set category_en = v.category_en
  from (values
    ('עמדות קיוסק',      'Self-service kiosks'),
    ('קיוסקי מזומן',     'Cash kiosks'),
    ('מסכי מטבח (KDS)',  'Kitchen displays (KDS)'),
    ('אביזרים ל-KDS',    'KDS accessories'),
    ('מדפסות',           'Printers'),
    ('מסופי סליקה',      'Card terminals'),
    ('ציוד נוסף',        'Other equipment'),
    ('הובלה והתקנה',     'Delivery and installation'),
    ('תוכנה',            'Software'),
    ('תוספות',           'Add-ons'),
    ('תשלומים וסליקה',   'Payments'),
    ('אפליקציה',         'App')
  ) as v(category, category_en)
 where p.category = v.category;

-- ── the read functions ───────────────────────────────────────────────────────
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
          'labelEn',    p.label_en,
          'note',       p.note,
          'noteEn',     p.note_en,
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
        'key',        p.key,
        'label',      p.label,
        'labelEn',    p.label_en,
        'note',       p.note,
        'noteEn',     p.note_en,
        'category',   p.category,
        'categoryEn', p.category_en,
        'image',      p.image,
        'setup',      p.setup
      )
      order by p.category nulls last, p.sort_order, p.key
    )
    from public.products p
    where p.is_active
      and p.show_on_website
      and p.item_group = 'hardware'
  ), '[]'::jsonb);
$$;

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
          'labelEn',    p.label_en,
          'note',       p.note,
          'noteEn',     p.note_en,
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

revoke all on function public.price_list()       from public;
revoke all on function public.hardware_list()    from public;
revoke all on function public.agent_price_list() from public;
revoke all on function public.agent_price_list() from anon;
grant execute on function public.price_list()       to anon, authenticated;
grant execute on function public.hardware_list()    to anon, authenticated;
grant execute on function public.agent_price_list() to authenticated;
