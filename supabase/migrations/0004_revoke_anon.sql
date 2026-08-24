-- ════════════════════════════════════════════════════════════════════════════
--  Take anon's table privileges away — for real this time
--
--  0001 said this:
--
--    "Note what is NOT here: anon gets no table privileges at all. The customer
--     link reaches its data only through quote_by_token(), so a caller holding
--     the anon key gets a permission error on public.quotes rather than an
--     empty result -- a stricter failure than relying on row-level filtering
--     alone."
--
--  It was verified by replaying the migration on a scratch Postgres, where it
--  was true. On a real Supabase project it is not. Supabase ships
--
--    alter default privileges in schema public
--      grant all on tables to anon, authenticated, service_role;
--
--  so every table created in public is granted to anon the moment it exists,
--  whatever the migration does or does not say. Checked on this project: anon
--  holds SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on
--  quotes, quote_items, quote_events, agents, orders, order_events and
--  quote_responses.
--
--  Nothing leaks today, because row-level security has no anon policy on any of
--  them and a table with RLS on and no matching policy returns nothing and
--  accepts nothing. But that means RLS is carrying the whole load alone, which
--  is exactly the arrangement 0001 set out not to depend on. One policy written
--  with `to public` instead of `to authenticated`, one future table that
--  somebody forgets to enable RLS on, and the anon key — which ships to every
--  browser that loads the site — becomes a way in.
--
--  So: revoke, explicitly, and set the default for tables added later. The
--  customer's route into this data is unchanged and unaffected: it is
--  quote_by_token() and quote_respond_by_token(), both security definer, both
--  granted to anon by name.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on public.agents                 from anon;
revoke all on public.quotes                 from anon;
revoke all on public.quote_items            from anon;
revoke all on public.quote_events           from anon;
revoke all on public.quote_responses        from anon;
revoke all on public.orders                 from anon;
revoke all on public.order_events           from anon;
revoke all on public.pricing_discount_tiers from anon;
revoke all on public.quotes_list            from anon;
revoke all on public.agents_list            from anon;
revoke all on public.orders_list            from anon;

-- Tables added by later migrations, so the next one does not quietly reopen it.
-- Scoped to the role that creates them (postgres), which is what the Supabase
-- SQL editor and the migration runner both connect as.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;

-- Same for the sequences behind the numbering. anon has no reason to read a
-- sequence, and nextval is a write.
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;

-- What anon keeps, and all it keeps: the ability to reach the schema, and the
-- two functions that decide for themselves what a token is allowed to see.
grant usage on schema public to anon;
grant execute on function public.quote_by_token(text, boolean) to anon;
grant execute on function public.quote_respond_by_token(
  text, text, text, text, text, text, text, text, text, text, text) to anon;
