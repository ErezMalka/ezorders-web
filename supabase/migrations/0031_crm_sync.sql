-- 0031 · A signed contract becomes an order in the CRM — once, on approval
--
-- The CRM (BITECRM2026) is where installation, onboarding and billing are run.
-- Until now every deal closed on the website was typed into it again by hand.
-- Now a manager approves the contract in the portal and the site writes the
-- order, its lines, the customer and the payment into the CRM itself.
--
-- Two things are remembered here so it cannot happen twice and so the CRM's
-- own catalogue is not asked to mirror ours by hand:
--
--   contracts.crm_*      which CRM order this contract became, when, and who
--                        pressed the button. Set once; a second press is a
--                        no-op that shows the existing order number.
--   crm_product_map      which CRM product stands for each website product
--                        key. Filled the first time a key is pushed — the CRM
--                        product is created on the spot, tagged EZ-<key> — so
--                        an agent never has to pair catalogues by hand.

begin;

alter table public.contracts
  add column if not exists crm_order_id     uuid,
  add column if not exists crm_order_number text,
  add column if not exists crm_customer_id  uuid,
  add column if not exists crm_synced_at    timestamptz,
  add column if not exists crm_synced_by    uuid references public.agents(id);

comment on column public.contracts.crm_order_id is
  'The order this contract became in the CRM (BITECRM2026 orders.id). Null until a manager approves it in the portal. See 0031.';

create table if not exists public.crm_product_map (
  key            text primary key,
  crm_product_id uuid not null,
  crm_sku        text not null,
  created_at     timestamptz not null default now()
);

alter table public.crm_product_map enable row level security;
revoke all on public.crm_product_map from anon, authenticated;
-- Service role only: the map is read and written by the sync, never by a page.

alter type public.contract_event add value if not exists 'crm_synced';

commit;
