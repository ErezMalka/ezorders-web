-- 0029 · A payment link for a signed contract
--
-- Once a customer has signed, the one-time part of the deal — hardware and
-- setup — can be paid by card straight away, through GROW (Meshulam), the same
-- processor the client platform already bills through. This table is the
-- record of each link that was made: what was asked for, what GROW answered,
-- and whether the money arrived.
--
-- One row per link, not one per contract. A link can be superseded — the agent
-- changes the amount, the customer lets a page expire — and the old one must
-- stay visible with its outcome rather than be overwritten. "The current link"
-- is simply the newest row that is not cancelled.
--
-- Nothing in the website ever holds card data. GROW hosts the payment page;
-- what comes back is a transaction id and a status.

begin;

-- ── the table ────────────────────────────────────────────────────────────────
create table if not exists public.contract_payments (
  id                     uuid primary key default gen_random_uuid(),
  contract_id            uuid not null references public.contracts(id) on delete cascade,

  -- What the customer is asked to pay, VAT included: this is the sum on the
  -- card, not a contract figure. ILS only; GROW charges in shekels.
  amount                 numeric(12,2) not null check (amount > 0),
  currency               text not null default 'ILS' check (currency = 'ILS'),
  -- How many instalments the page may offer. 1 = a single charge.
  max_installments       smallint not null default 1 check (max_installments between 1 and 36),

  status                 text not null default 'pending'
                         check (status in ('pending', 'paid', 'failed', 'cancelled')),

  -- What GROW handed back when the page was created. The url is what the
  -- customer opens; the process id/token pair is what getPaymentProcessInfo
  -- wants to say how it went.
  grow_process_id        text,
  grow_process_token     text,
  payment_url            text,

  -- What GROW reported once the customer paid. Both are needed to refund
  -- through the API rather than by hand in GROW's back office.
  grow_transaction_id    text,
  grow_transaction_token text,
  paid_at                timestamptz,
  -- The last notification as received, for when a status has to be argued.
  grow_notify            jsonb,

  -- Who asked for the link: the agent, or null when the site made it on its
  -- own the moment the contract was signed.
  created_by             uuid references public.agents(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists contract_payments_contract_idx
  on public.contract_payments (contract_id, created_at desc);

comment on table public.contract_payments is
  'One row per GROW (Meshulam) payment link issued for a contract. The current link is the newest non-cancelled row. See 0029.';

-- ── who may see it ───────────────────────────────────────────────────────────
-- Agents read the payments of the contracts they can read — the same rule as
-- contracts_read, expressed by joining to it. No insert/update policy at all:
-- links are made and moved by server code holding the service role, after it
-- has checked what a policy cannot (that GROW actually answered, that the
-- notification names a real process).
alter table public.contract_payments enable row level security;

drop policy if exists contract_payments_read on public.contract_payments;
create policy contract_payments_read on public.contract_payments
  for select to authenticated
  using (
    exists (
      select 1 from public.contracts c
       where c.id = contract_payments.contract_id
         and c.deleted_at is null
         and (c.agent_id = auth.uid() or public.is_manager())
    )
  );

revoke all on public.contract_payments from anon;
grant select on public.contract_payments to authenticated;

-- ── the timeline learns two words ────────────────────────────────────────────
-- 'payment_link' when a link is issued (meta carries the amount and who asked),
-- 'paid' when GROW confirms the money. Both print in the agent's timeline; the
-- customer-facing evidence annex lists only what it always did.
alter type public.contract_event add value if not exists 'payment_link';
alter type public.contract_event add value if not exists 'paid';

commit;
