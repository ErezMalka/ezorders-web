-- 0023 · A family for the products that had none
--
-- `category` was added for hardware, where twenty-seven models needed sorting
-- into the tabs the price page draws. Everything else was left null, which was
-- fine while nothing read it — the quote builder grouped by item_group and
-- item_group alone.
--
-- It reads `category` now, so a product without one stands under a heading it
-- shares with nobody. These are the families the sales conversation already
-- uses: what the restaurant runs on, what is added to it, how it takes money,
-- and the app.
--
-- item_group still decides the money. This is merchandising: which heading a
-- product appears under, and nothing else. A family can be renamed from
-- /he/agent/products without a migration, which is the point of it living in a
-- column rather than in the code.

begin;

update public.products set category = 'תוכנה'          where key in ('pos', 'website', 'kiosk')      and category is null;
update public.products set category = 'תוספות'         where key in ('loyalty', 'ezwallet', 'feedback') and category is null;
update public.products set category = 'תשלומים וסליקה' where key in ('bit', 'applepay', 'secure3d')   and category is null;
update public.products set category = 'אפליקציה'       where key = 'app'                              and category is null;

-- And one rename. The card readers arrived in 0021 under 'סליקה', which now
-- sits one heading away from the software family called 'תשלומים וסליקה' — two
-- names a tired agent reads as the same thing. The terminals are the boxes.
update public.products set category = 'מסופי סליקה' where category = 'סליקה';

commit;
