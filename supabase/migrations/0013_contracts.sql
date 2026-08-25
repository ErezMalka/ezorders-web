-- 0013 · From a quote a customer accepted to a contract they sign
--
-- The quote already carries an acceptance: a name, a tax ID, a timestamp, an IP
-- and a hash of the exact document. That is strong evidence and it is not a
-- contract. A contract has terms — what happens when the customer wants out at
-- month seven, who owns the data, which court hears the argument — and none of
-- that fits on a price list.
--
-- Three ideas here, and the second is the one that matters.

begin;

-- ════════════════════════════════════════════════════════════════════════════
--  1 · The terms live in the database, with versions
-- ════════════════════════════════════════════════════════════════════════════
--
-- The same move as the price list, for a stronger reason. When a lawyer changes
-- clause 2.8, that must not be a deploy — but more importantly, a contract
-- already signed must keep showing the words that were signed, forever. A
-- document that silently re-renders under new terms is worth nothing in an
-- argument, which is the only moment it is ever read.
--
-- So: templates are versioned and immutable once published, contracts point at
-- the version they were issued under, and editing the terms creates a new
-- version rather than changing an old one.

create table if not exists public.contract_templates (
  version      integer primary key,
  title        text        not null,
  -- [{ num: '1.0', title: 'כללי', clauses: [{ num: '1.1', text: '…' }] }]
  sections     jsonb       not null,
  notes        text,
  -- A template nobody has read is not a contract, it is a draft that renders.
  -- create_contract_from_quote refuses to use one, which is the interlock
  -- between "the text has been transcribed" and "a customer may be asked to
  -- sign it".
  is_approved  boolean     not null default false,
  approved_by  uuid        references public.agents(id),
  approved_at  timestamptz,
  is_current   boolean     not null default false,
  created_at   timestamptz not null default now(),
  constraint contract_templates_sections_is_array check (jsonb_typeof(sections) = 'array')
);

-- Exactly one current template, enforced rather than agreed.
create unique index if not exists contract_templates_one_current
  on public.contract_templates ((true)) where is_current;

-- ════════════════════════════════════════════════════════════════════════════
--  2 · The contract
-- ════════════════════════════════════════════════════════════════════════════
do $$ begin
  create type public.contract_status as enum ('draft', 'sent', 'viewed', 'signed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.contracts (
  id                uuid primary key default gen_random_uuid(),
  contract_number   text unique not null,
  quote_id          uuid not null references public.quotes(id),
  agent_id          uuid not null references public.agents(id),
  template_version  integer not null references public.contract_templates(version),
  status            public.contract_status not null default 'draft',
  public_token      text unique not null,

  -- Snapshot, not a join. The contract states who the parties were on the day
  -- it was signed; a customer renaming their company next year does not rewrite
  -- a document they already signed.
  customer_name     text not null,
  customer_tax_id   text,
  customer_address  text,
  business_phone    text,
  contact_name      text,
  contact_phone     text,
  customer_email    text,
  pos_company       text,
  term_months       integer not null default 12,

  -- The signature and who made it.
  signer_name       text,
  signer_id_number  text,
  signer_role       text,
  signature_png     text,
  -- SHA-256 of the exact rendered document at the moment of signing. The thing
  -- that answers "that is not what I signed".
  document_hash     text,

  created_at        timestamptz not null default now(),
  sent_at           timestamptz,
  first_viewed_at   timestamptz,
  last_viewed_at    timestamptz,
  signed_at         timestamptz,
  cancelled_at      timestamptz,
  deleted_at        timestamptz,

  -- A signature without its evidence is a drawing.
  constraint contracts_signed_is_complete check (
    status <> 'signed' or (
      signer_name is not null and signature_png is not null
      and document_hash is not null and signed_at is not null
    )
  )
);

create index if not exists contracts_quote_idx  on public.contracts (quote_id);
create index if not exists contracts_agent_idx  on public.contracts (agent_id, created_at desc);

-- One live contract per quote. A second one is either a mistake or a
-- renegotiation, and a renegotiation is a new quote.
create unique index if not exists contracts_one_live_per_quote
  on public.contracts (quote_id) where deleted_at is null and status <> 'cancelled';

-- ════════════════════════════════════════════════════════════════════════════
--  3 · The audit trail
-- ════════════════════════════════════════════════════════════════════════════
--
-- Every touch, with where it came from. This is what gets printed as the annex:
-- opened at 13:11 from 38.56.233.89 on Chrome, reopened three days later from
-- somewhere else, signed at 12:13. A drawn squiggle proves nothing on its own —
-- the timeline around it is the evidence.
do $$ begin
  create type public.contract_event as enum (
    'created', 'sent', 'opened', 'reopened', 'signed', 'signature_cleared', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.contract_events (
  id          bigint generated always as identity primary key,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  event_type  public.contract_event not null,
  at          timestamptz not null default now(),
  -- inet, not text: a value that is not an address should fail on the way in.
  ip          inet,
  user_agent  text,
  meta        jsonb
);

create index if not exists contract_events_contract_idx
  on public.contract_events (contract_id, at);

-- ── numbering ───────────────────────────────────────────────────────────────
create sequence if not exists public.contract_number_seq;

create or replace function public.next_contract_number()
returns text
language sql
volatile
set search_path = public, pg_catalog
as $$
  select 'A-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.contract_number_seq')::text, 4, '0');
$$;

commit;
