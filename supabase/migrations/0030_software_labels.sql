-- 0030 · The software lines say what they are: licences, not objects
--
-- "קופה (POS)" beside a ₪5,500 register called "קופה Wintec" reads as the
-- same thing twice, and a customer asked which one they were paying for. The
-- software lines now name the licence and the unit it covers; the hardware
-- lines keep naming the object. Same keys, same prices — only the words.
--
-- Existing quotes and contracts are untouched: quote_items carries its own
-- copy of the label, and a signed contract is hashed over what was shown.
-- Only documents made from now on pick these up.

begin;

update public.products p
   set label    = v.label,
       label_en = v.label_en,
       updated_at = now()
  from (values
    ('pos',     'רשיון תוכנה קופה 1',            'POS software licence (1 till)'),
    ('website', 'אתר הזמנות',                    'Ordering website'),
    ('kiosk',   'תוכנה לקיוסק אחד',              'Kiosk software (1 station)'),
    ('kds',     'תוכנה KDS',                     'KDS software'),
    ('cds',     'תוכנה מסך סטטוס הזמנה CDS',     'Order status display (CDS) software')
  ) as v(key, label, label_en)
 where p.key = v.key;

commit;
