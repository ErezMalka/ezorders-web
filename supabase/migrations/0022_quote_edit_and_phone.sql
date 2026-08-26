-- 0022 · A phone number is required, and a quote is frozen once it leaves draft
--
-- Two rules the application is about to rely on, written here because the
-- application is not the only thing that can reach these tables. An agent holds
-- a real session; RLS lets them update their own quotes and rewrite their own
-- lines, and it always has. Nothing edited a quote before, so nothing had to
-- say when editing stops being allowed. Now something does.
--
-- THE PHONE. A quote with no way to call the customer back is a quote nobody
-- follows up. `quotes_customer_named` already refuses an unnamed customer; this
-- is the same rule for the number the agent will actually dial.
--
-- Added NOT VALID on purpose. One draft predates the rule (Q-2026-0006) and
-- there is no honest phone number to backfill it with — inventing one is worse
-- than leaving it. NOT VALID exempts the rows that are already stored and
-- checks every insert and every update from here on, which means that draft is
-- fixed the first time somebody opens it to edit, and not by us guessing.
--
-- THE FREEZE. An agent may edit a quote while it is a draft. Once it has been
-- sent, the document at /q/<token> is the thing the customer is reading and,
-- if they press the button, the thing whose SHA-256 is stored as evidence in
-- quote_responses. Editing it afterwards would leave a stored fingerprint that
-- disagrees with the stored text — the one claim anybody would dispute. So the
-- contents freeze, and a change after that starts life as a duplicate: a new
-- draft, a new number, a new link, and the sent one left exactly as it was.
--
-- Only the CONTENT columns are frozen. Status, timestamps, view counts and the
-- money columns keep moving, because that is the quote being read and answered
-- rather than rewritten — and recalc_quote() must stay able to do its job.

begin;

alter table public.quotes
  add constraint quotes_customer_reachable
  check (customer_phone is not null and length(btrim(customer_phone)) > 0)
  not valid;

create or replace function public.quote_contents_are_frozen()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
begin
  if old.status = 'draft' then
    return new;
  end if;

  if new.customer_name    is distinct from old.customer_name
     or new.customer_contact is distinct from old.customer_contact
     or new.customer_phone   is distinct from old.customer_phone
     or new.customer_email   is distinct from old.customer_email
     or new.customer_tax_id  is distinct from old.customer_tax_id
     or new.notes            is distinct from old.notes
     or new.valid_days       is distinct from old.valid_days
     or new.valid_until      is distinct from old.valid_until
     or new.vat_percent      is distinct from old.vat_percent
     or new.term_months      is distinct from old.term_months
  then
    raise exception 'quote % has left draft; duplicate it instead of editing it', old.quote_number
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger quotes_frozen_trg
  before update on public.quotes
  for each row execute function public.quote_contents_are_frozen();

create or replace function public.quote_lines_are_frozen()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $$
declare
  v_quote uuid := coalesce(new.quote_id, old.quote_id);
  v_status quote_status;
  v_number text;
begin
  select status, quote_number into v_status, v_number
    from public.quotes where id = v_quote;

  -- No parent row means the quote is being deleted around us; let the foreign
  -- key have the last word rather than raising a confusing error here.
  if v_status is null or v_status = 'draft' then
    return coalesce(new, old);
  end if;

  raise exception 'quote % has left draft; its lines cannot change', v_number
    using errcode = 'check_violation';
end $$;

create trigger quote_items_frozen_trg
  before insert or update or delete on public.quote_items
  for each row execute function public.quote_lines_are_frozen();

-- Supabase grants execute on everything created in `public` to anon,
-- authenticated and service_role by default, and these two arrived through that
-- door like any other function. A trigger function needs no EXECUTE privilege
-- to fire — the privilege is checked when the trigger is created, not when it
-- runs — so taking it away costs nothing and keeps two functions that raise
-- exceptions out of reach of a key that ships in the JavaScript of every page.
-- See 0005, and the assertion in test/sql/20_privileges.sql.
revoke all on function public.quote_contents_are_frozen() from public, anon, authenticated, service_role;
revoke all on function public.quote_lines_are_frozen()    from public, anon, authenticated, service_role;

commit;
