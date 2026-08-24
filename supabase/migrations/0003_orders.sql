-- ════════════════════════════════════════════════════════════════════════════
--  Orders — what happens after the customer says yes
--
--  Until now the lifecycle stopped at 'viewed'. The customer could read the
--  quote and nothing more; `accepted`, `rejected` and `responded_at` existed in
--  the schema and were never written, because no screen could write them. An
--  agent learned the answer by telephone and the pipeline figure never moved.
--
--  This migration closes that loop and starts the next one:
--
--    quote  draft → sent → viewed → accepted        (the customer decides)
--    order         pending_setup → in_setup → live  (we deliver)
--
--  Three things are worth knowing before changing anything here.
--
--  AN ORDER IS A COPY, NOT A JOIN. Every figure the customer agreed to is
--  written onto the order row rather than read back through quote_id. A quote's
--  lines are already frozen at issue time; freezing the order too means a later
--  correction to the quote -- a fixed typo, a re-send -- cannot silently change
--  what was sold. quote_id stays as provenance, not as a source of truth.
--
--  ACCEPTANCE IS EVIDENCE, AND EVIDENCE IS SEPARATE. public.quote_responses
--  records who pressed the button: the name and company id they typed, when,
--  from which address, with which browser, and the SHA-256 of the exact
--  document they were looking at. That last field is the one that matters. A
--  drawn signature proves very little; a hash proves the document has not
--  changed since it was agreed, which is the claim anyone would actually
--  dispute. Rejections are recorded in the same table -- a "no" and its reason
--  is worth as much to a sales team as a "yes".
--
--  THE CUSTOMER HAS NO LOGIN, SO THE FUNCTION IS THE BOUNDARY. As with
--  quote_by_token(), anon gets no privilege on any table here. It can call
--  exactly one function, and that function decides what is allowed.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0003a ───────────────────────────────────────────────────────────────────
-- Enum values must be committed before they can be used, so this file is split
-- the same way 0002 was. Run 0003a, then 0003b.

create type order_status as enum (
  'pending_setup',  -- signed, waiting for onboarding to start
  'in_setup',       -- being installed and configured
  'live',           -- serving real orders
  'cancelled'       -- did not survive to go-live
);

create type quote_response as enum ('accepted', 'rejected');


-- ── 0003b ───────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════════════
--  The acceptance record
-- ════════════════════════════════════════════════════════════════════════════
create table public.quote_responses (
  id        uuid primary key default gen_random_uuid(),
  quote_id  uuid not null references public.quotes(id) on delete cascade,
  response  quote_response not null,

  -- What the person typed into the acceptance form. Deliberately not copied
  -- from the quote: the point is that THIS person, by this name, agreed. A
  -- mismatch with customer_name is a fact worth preserving, not correcting.
  signer_name    text,
  signer_role    text,
  signer_tax_id  text,
  signer_email   text,
  signer_phone   text,

  -- Why not. Only ever set on a rejection, and only when they bothered to say.
  reason  text,

  -- SHA-256 of the rendered document, hex. Recompute the document from the
  -- frozen lines and compare: equal means this is what was agreed to.
  document_hash text,

  -- Where from. inet rather than text so a range query is possible later; the
  -- address is whatever the proxy reported, which is honest enough for this.
  ip          inet,
  user_agent  text,

  -- 'customer' = pressed the button on their own link.
  -- 'agent'    = said yes on the telephone and an agent recorded it.
  -- The distinction matters: only the first carries evidence.
  channel     text not null default 'customer',
  recorded_by uuid references public.agents(id),

  created_at timestamptz not null default now(),

  constraint quote_responses_channel_check
    check (channel in ('customer', 'agent')),
  -- An agent-recorded response has no signer and no hash; a customer one must
  -- carry a name, or it is not evidence of anything.
  constraint quote_responses_customer_signed
    check (channel <> 'customer' or response = 'rejected'
           or length(btrim(coalesce(signer_name, ''))) > 0)
);

-- One live answer per quote. A customer who reloads the page after accepting
-- gets their existing order back rather than a second one.
create unique index quote_responses_one_per_quote
  on public.quote_responses(quote_id);

create index quote_responses_created_idx
  on public.quote_responses(created_at desc);


-- ════════════════════════════════════════════════════════════════════════════
--  Orders
-- ════════════════════════════════════════════════════════════════════════════
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique,                    -- O-2026-0001

  -- Provenance. restrict rather than cascade: deleting a quote that has been
  -- sold is a mistake, and the database should say so rather than take the
  -- order with it.
  quote_id  uuid not null unique references public.quotes(id) on delete restrict,
  agent_id  uuid not null references public.agents(id) on delete restrict,

  -- ── frozen copy of the customer ──
  customer_name     text not null,
  customer_contact  text,
  customer_phone    text,
  customer_email    text,
  customer_tax_id   text,

  -- ── frozen copy of the money, all pre-VAT ──
  currency              text          not null default 'ILS',
  setup_total           numeric(12,2) not null,
  monthly_eligible      numeric(12,2) not null,
  discount_percent      numeric(5,2)  not null,
  discount_amount       numeric(12,2) not null,
  monthly_non_eligible  numeric(12,2) not null,
  monthly_total         numeric(12,2) not null,
  vat_percent           numeric(5,2)  not null,
  term_months           integer       not null,

  -- ── delivery ──
  status        order_status not null default 'pending_setup',
  accepted_at   timestamptz  not null,
  setup_started_at timestamptz,
  went_live_at  timestamptz,
  cancelled_at  timestamptz,
  cancel_reason text,

  -- When we told the customer they would be live. Set by the agent; nullable
  -- because at acceptance nobody knows yet.
  target_live_on date,

  -- Internal. Never shown to the customer.
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_term_positive check (term_months > 0),
  constraint orders_cancel_has_reason
    check (status <> 'cancelled' or cancelled_at is not null)
);

create index orders_agent_idx   on public.orders(agent_id);
create index orders_status_idx  on public.orders(status);
create index orders_created_idx on public.orders(created_at desc);


-- ── order numbering ─────────────────────────────────────────────────────────
-- A sequence of its own, so order numbers are not gapped by every quote that
-- was never sold. O-2026-0001 is the first sale of the year, and reads like it.
create sequence if not exists order_number_seq;

create or replace function public.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'O-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('order_number_seq')::text, 4, '0');
  end if;
  return new;
end $$;

create trigger orders_number_trg
  before insert on public.orders
  for each row execute function public.set_order_number();

create trigger orders_touch_trg
  before update on public.orders
  for each row execute function public.touch_updated_at();


-- ── order event log ─────────────────────────────────────────────────────────
-- Append-only, same shape as quote_events. "When did this go live, and who
-- moved it?" is asked far more often than anyone expects.
create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  event_type text not null,   -- created|setup_started|went_live|cancelled|note
  actor_id   uuid references public.agents(id),
  meta       jsonb,
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events(order_id, created_at desc);


-- ── status transitions ──────────────────────────────────────────────────────
-- The timestamps are derived from the status rather than trusted from the
-- caller. An agent moving an order to 'live' should not also have to remember
-- to stamp went_live_at, and a UI that forgets would leave the column empty
-- forever.
create or replace function public.stamp_order_status()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'in_setup' then
      new.setup_started_at := coalesce(new.setup_started_at, now());
    elsif new.status = 'live' then
      new.setup_started_at := coalesce(new.setup_started_at, now());
      new.went_live_at     := coalesce(new.went_live_at, now());
    elsif new.status = 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, now());
    end if;

    -- Reopening a cancelled order clears the cancellation, or the row would
    -- claim to be live and cancelled at the same time.
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      new.cancelled_at  := null;
      new.cancel_reason := null;
    end if;
  end if;
  return new;
end $$;

create trigger orders_stamp_status_trg
  before update on public.orders
  for each row execute function public.stamp_order_status();


-- ════════════════════════════════════════════════════════════════════════════
--  Accepting a quote
--
--  One function, called two ways. The customer reaches it through their token
--  with no login; an agent reaches the sibling below with their own session
--  after a telephone yes. Both land in the same place, so an order created by
--  telephone is not a second-class row with fields nobody filled in.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.create_order_from_quote(
  p_quote_id uuid,
  p_accepted_at timestamptz default now()
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote public.quotes;
  v_order public.orders;
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if not found then
    raise exception 'quote % not found', p_quote_id;
  end if;

  insert into public.orders (
    quote_id, agent_id,
    customer_name, customer_contact, customer_phone, customer_email, customer_tax_id,
    currency, setup_total, monthly_eligible, discount_percent, discount_amount,
    monthly_non_eligible, monthly_total, vat_percent, term_months,
    accepted_at
  ) values (
    v_quote.id, v_quote.agent_id,
    v_quote.customer_name, v_quote.customer_contact, v_quote.customer_phone,
    v_quote.customer_email, v_quote.customer_tax_id,
    v_quote.currency, v_quote.setup_total, v_quote.monthly_eligible,
    v_quote.discount_percent, v_quote.discount_amount,
    v_quote.monthly_non_eligible, v_quote.monthly_total,
    v_quote.vat_percent, v_quote.term_months,
    p_accepted_at
  )
  returning * into v_order;

  insert into public.order_events (order_id, event_type, meta)
  values (v_order.id, 'created',
          jsonb_build_object('quote_number', v_quote.quote_number));

  return v_order;
end $$;

-- Not callable by anybody. It performs no authorisation of its own -- the two
-- functions below do that before calling it -- so leaving Postgres's default
-- execute-to-public in place would let any signed-in agent conjure an order
-- against a quote id they merely guessed.
revoke all on function public.create_order_from_quote(uuid, timestamptz) from public;


-- ── the customer's answer ───────────────────────────────────────────────────
-- Reached from /q/<token> with no account. Everything this function is allowed
-- to do is decided here, because the caller is anonymous by design.
--
-- Returns jsonb rather than raising, so the page can tell the customer WHY --
-- "this quote expired on the 3rd" is a useful thing to read, and a 500 is not.
create or replace function public.quote_respond_by_token(
  p_token         text,
  p_response      text,
  p_signer_name   text default null,
  p_signer_role   text default null,
  p_signer_tax_id text default null,
  p_signer_email  text default null,
  p_signer_phone  text default null,
  p_reason        text default null,
  p_document_hash text default null,
  p_ip            text default null,
  p_user_agent    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote    public.quotes;
  v_existing public.quote_responses;
  v_order    public.orders;
  v_resp     quote_response;
begin
  if p_response not in ('accepted', 'rejected') then
    return jsonb_build_object('ok', false, 'code', 'bad_response');
  end if;
  v_resp := p_response::quote_response;

  select * into v_quote
    from public.quotes
   where public_token = p_token
     and deleted_at is null
     for update;

  -- Same answer for "no such quote" and "still a draft", so a caller holding a
  -- guessed token cannot learn which tokens exist.
  if not found or v_quote.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- Already answered. Idempotent rather than an error: a customer who reloads,
  -- or double-taps on a slow phone, should see their confirmation again and not
  -- a failure.
  select * into v_existing
    from public.quote_responses where quote_id = v_quote.id;

  if found then
    select * into v_order from public.orders where quote_id = v_quote.id;
    return jsonb_build_object(
      'ok', true,
      'code', 'already_' || v_existing.response,
      'response', v_existing.response,
      'order_number', v_order.order_number,
      'responded_at', v_existing.created_at
    );
  end if;

  -- Expiry is checked only on the way in. A quote that expired while the
  -- customer had the page open still counts -- they were reading the version we
  -- sent them, and the alternative is telling someone their yes arrived too
  -- late by four minutes.
  if v_quote.valid_until < current_date and v_resp = 'accepted' then
    return jsonb_build_object(
      'ok', false, 'code', 'expired', 'valid_until', v_quote.valid_until
    );
  end if;

  if v_resp = 'accepted'
     and length(btrim(coalesce(p_signer_name, ''))) = 0 then
    return jsonb_build_object('ok', false, 'code', 'signer_required');
  end if;

  insert into public.quote_responses (
    quote_id, response, signer_name, signer_role, signer_tax_id,
    signer_email, signer_phone, reason, document_hash, ip, user_agent, channel
  ) values (
    v_quote.id, v_resp,
    nullif(btrim(coalesce(p_signer_name, '')), ''),
    nullif(btrim(coalesce(p_signer_role, '')), ''),
    nullif(btrim(coalesce(p_signer_tax_id, '')), ''),
    nullif(btrim(coalesce(p_signer_email, '')), ''),
    nullif(btrim(coalesce(p_signer_phone, '')), ''),
    nullif(btrim(coalesce(p_reason, '')), ''),
    nullif(btrim(coalesce(p_document_hash, '')), ''),
    -- A malformed forwarded-for header must not cost us the acceptance.
    (select case when p_ip ~ '^[0-9a-fA-F:.]+$' then p_ip::inet else null end),
    left(coalesce(p_user_agent, ''), 500),
    'customer'
  );

  update public.quotes
     set status       = v_resp::text::quote_status,
         responded_at = now()
   where id = v_quote.id;

  insert into public.quote_events (quote_id, event_type, meta)
  values (v_quote.id, p_response,
          jsonb_build_object('signer', p_signer_name, 'channel', 'customer'));

  if v_resp = 'accepted' then
    v_order := public.create_order_from_quote(v_quote.id, now());
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', p_response,
    'response', p_response,
    'order_number', v_order.order_number,
    'quote_number', v_quote.quote_number
  );
end $$;

revoke all on function public.quote_respond_by_token(
  text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.quote_respond_by_token(
  text, text, text, text, text, text, text, text, text, text, text)
  to anon, authenticated;


-- ── the telephone yes ───────────────────────────────────────────────────────
-- Most deals close on a call. Refusing to record that, or making the agent ask
-- the customer to go and click a link they have already verbally agreed to,
-- would mean the orders list quietly under-counts the business -- and a report
-- nobody trusts stops being read.
--
-- What it does NOT do is manufacture evidence. channel='agent' and there is no
-- signer, no hash, no address; the screen says "recorded by <agent>" rather
-- than pretending the customer signed.
create or replace function public.quote_accept_by_agent(
  p_quote_id uuid,
  p_note     text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote    public.quotes;
  v_order    public.orders;
  v_existing public.quote_responses;
begin
  if not public.is_active_agent() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  select * into v_quote
    from public.quotes
   where id = p_quote_id and deleted_at is null
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- The security-definer body bypasses RLS, so the ownership check that the
  -- policies would have made has to be made here instead. This line is the
  -- whole boundary: without it any signed-in agent could close anyone's deal.
  if v_quote.agent_id <> auth.uid() and not public.is_manager() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_quote.status = 'draft' then
    return jsonb_build_object('ok', false, 'code', 'not_sent');
  end if;

  select * into v_existing
    from public.quote_responses where quote_id = v_quote.id;
  if found then
    select * into v_order from public.orders where quote_id = v_quote.id;
    return jsonb_build_object(
      'ok', true, 'code', 'already_' || v_existing.response,
      'order_number', v_order.order_number
    );
  end if;

  insert into public.quote_responses (
    quote_id, response, reason, channel, recorded_by
  ) values (
    v_quote.id, 'accepted',
    nullif(btrim(coalesce(p_note, '')), ''), 'agent', auth.uid()
  );

  update public.quotes
     set status = 'accepted', responded_at = now()
   where id = v_quote.id;

  insert into public.quote_events (quote_id, event_type, actor_id, meta)
  values (v_quote.id, 'accepted', auth.uid(),
          jsonb_build_object('channel', 'agent', 'note', p_note));

  v_order := public.create_order_from_quote(v_quote.id, now());

  return jsonb_build_object(
    'ok', true, 'code', 'accepted', 'order_number', v_order.order_number
  );
end $$;

revoke all on function public.quote_accept_by_agent(uuid, text) from public;
grant execute on function public.quote_accept_by_agent(uuid, text) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--
--  Same rule as quotes, for the same reason: an agent sees their own orders, a
--  manager sees every order. Inserts are not granted to anyone -- an order is
--  created by create_order_from_quote() and nowhere else, so there is no path
--  that produces an order with no quote behind it.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.orders          enable row level security;
alter table public.order_events    enable row level security;
alter table public.quote_responses enable row level security;

create policy orders_select on public.orders
  for select to authenticated
  using (agent_id = auth.uid() or public.is_manager());

create policy orders_update on public.orders
  for update to authenticated
  using (agent_id = auth.uid() or public.is_manager())
  with check (agent_id = auth.uid() or public.is_manager());

create policy order_events_read on public.order_events
  for select to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id
                    and (o.agent_id = auth.uid() or public.is_manager())));

create policy order_events_insert on public.order_events
  for insert to authenticated
  with check (exists (select 1 from public.orders o
                       where o.id = order_id
                         and (o.agent_id = auth.uid() or public.is_manager())));

-- The acceptance record is readable by whoever can read the quote, and writable
-- by nobody. It is evidence; an editable audit trail is not one.
create policy quote_responses_read on public.quote_responses
  for select to authenticated
  using (exists (select 1 from public.quotes q
                  where q.id = quote_id
                    and (q.agent_id = auth.uid() or public.is_manager())));


-- ── portal list view ────────────────────────────────────────────────────────
create or replace view public.orders_list
with (security_invoker = true) as
select
  o.id, o.order_number, o.status,
  o.customer_name, o.customer_contact, o.customer_phone, o.customer_email,
  o.setup_total, o.monthly_total, o.discount_percent, o.currency,
  o.setup_total + o.monthly_total * o.term_months as contract_value,
  o.term_months, o.accepted_at, o.target_live_on, o.went_live_at, o.created_at,
  o.agent_id, a.full_name as agent_name,
  q.quote_number, q.public_token,
  r.channel      as accept_channel,
  r.signer_name  as signer_name,
  -- How long from "yes" to serving customers. Null while still in setup, which
  -- is what makes the average meaningful rather than optimistic.
  case when o.went_live_at is not null
       then extract(day from o.went_live_at - o.accepted_at)::integer
  end as days_to_live
from public.orders o
join public.agents a on a.id = o.agent_id
join public.quotes q on q.id = o.quote_id
left join public.quote_responses r on r.quote_id = o.quote_id;


-- ── grants ──────────────────────────────────────────────────────────────────
-- anon appears nowhere. The customer's only reach into any of this is
-- quote_respond_by_token(), granted above.
grant select, update on public.orders          to authenticated;
grant select, insert on public.order_events    to authenticated;
grant select         on public.quote_responses to authenticated;
grant select         on public.orders_list     to authenticated;


-- ── reading a quote without counting it as a view ───────────────────────────
-- The acceptance POST has to re-render the document to hash it, and that read
-- must not inflate view_count or move a 'sent' quote to 'viewed'. Rather than a
-- second function that would drift from the first, the existing one grows a
-- flag: the old one-argument call site keeps working, because the parameter has
-- a default and the old signature is dropped rather than overloaded (an
-- overload would make quote_by_token('...') ambiguous).
drop function if exists public.quote_by_token(text);

create or replace function public.quote_by_token(
  p_token       text,
  p_record_view boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_quote public.quotes;
  v_items jsonb;
  v_resp  public.quote_responses;
begin
  select * into v_quote
    from public.quotes
   where public_token = p_token
     and deleted_at is null;

  if not found then
    return null;
  end if;

  -- A draft has not been sent yet; the link must not work until it has.
  if v_quote.status = 'draft' then
    return null;
  end if;

  if p_record_view then
    update public.quotes
       set view_count      = view_count + 1,
           first_viewed_at = coalesce(first_viewed_at, now()),
           last_viewed_at  = now(),
           status          = case when status = 'sent' then 'viewed'::quote_status else status end
     where id = v_quote.id;

    insert into public.quote_events (quote_id, event_type)
    values (v_quote.id, 'viewed');
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order), '[]'::jsonb)
    into v_items
    from (
      select component_key, item_group, label, note, quantity,
             setup_unit, monthly_unit, setup_total, monthly_total,
             is_discountable, sort_order
        from public.quote_items
       where quote_id = v_quote.id
    ) i;

  -- Whether this quote has already been answered, so the page can show the
  -- confirmation instead of the buttons. Only the fact and the date -- the
  -- evidence itself is nobody's business but ours.
  select * into v_resp from public.quote_responses where quote_id = v_quote.id;

  return jsonb_build_object(
    'quote_number',         v_quote.quote_number,
    'created_at',           v_quote.created_at,
    'valid_until',          v_quote.valid_until,
    'status',               v_quote.status,
    'customer_name',        v_quote.customer_name,
    'customer_contact',     v_quote.customer_contact,
    'customer_phone',       v_quote.customer_phone,
    'customer_email',       v_quote.customer_email,
    'customer_tax_id',      v_quote.customer_tax_id,
    'setup_total',          v_quote.setup_total,
    'monthly_eligible',     v_quote.monthly_eligible,
    'discount_percent',     v_quote.discount_percent,
    'discount_amount',      v_quote.discount_amount,
    'monthly_non_eligible', v_quote.monthly_non_eligible,
    'monthly_total',        v_quote.monthly_total,
    'vat_percent',          v_quote.vat_percent,
    'term_months',          v_quote.term_months,
    'notes',                v_quote.notes,
    'agent_name',           (select full_name from public.agents a where a.id = v_quote.agent_id),
    'items',                v_items,
    'is_expired',           (v_quote.valid_until < current_date),
    'responded',            (v_resp.id is not null),
    'response',             v_resp.response,
    'responded_at',         v_resp.created_at,
    'order_number',         (select order_number from public.orders o where o.quote_id = v_quote.id)
  );
end $$;

revoke all on function public.quote_by_token(text, boolean) from public;
grant execute on function public.quote_by_token(text, boolean) to anon, authenticated;
