-- ════════════════════════════════════════════════════════════════════════════
--  Give each function exactly the callers it needs
--
--  0004 dealt with tables. Functions have the same problem and a sharper edge,
--  because Supabase also ships
--
--    alter default privileges in schema public
--      grant all on functions to anon, authenticated, service_role;
--
--  and an explicit grant to anon is not removed by `revoke ... from public`.
--  Every `revoke all on function ... from public` written in 0001 and 0003
--  therefore did nothing on this project: anon could execute all sixteen
--  functions in public. anon is not a secret — the key sits in the JavaScript
--  bundle of every page on the site.
--
--  Two of those mattered.
--
--  expire_stale_quotes() marks every sent-but-unanswered quote past its date as
--  expired. It exists to be run nightly. Exposed to anon it is a one-line way
--  for anyone at all to expire the company's entire outstanding pipeline —
--  reversible only by knowing which quotes to put back.
--
--  create_order_from_quote() is security definer with no authorisation of its
--  own, by design: the two functions that call it authorise first. Reachable
--  directly, it writes an order for any quote id the caller can name. A v4 uuid
--  is not guessable, so this was a lock with no handle rather than an open door
--  — but it was one leaked id away from being one.
--
--  The rest were merely wrong: helpers and trigger functions with no business
--  being callable over HTTP at all. Trigger functions in particular need no
--  EXECUTE grant to fire — Postgres checks privileges when the trigger is
--  created, not each time it runs — so revoking from everyone costs nothing.
--
--  What is deliberately kept:
--    is_active_agent / is_admin / is_manager  → authenticated. RLS policy
--      expressions are evaluated as the querying role, so revoking these would
--      break every policy that names them.
--    recalc_quote                             → authenticated. createQuote()
--      calls it as the agent after writing the lines.
--    quote_accept_by_agent                    → authenticated. Checks ownership
--      against auth.uid() itself.
--    quote_by_token / quote_respond_by_token  → anon. The customer's only door,
--      and each decides for itself what a token may see and do.
--
--  service_role keeps everything: it is the secret key, it already bypasses
--  RLS, and restricting it would buy nothing.
-- ════════════════════════════════════════════════════════════════════════════

-- Start from nothing, then hand back by name.
--
-- Both revokes are needed and neither is redundant. Postgres grants EXECUTE to
-- PUBLIC when a function is created, and Supabase's default privileges add a
-- separate explicit grant to anon and authenticated. Revoking one leaves the
-- other standing, which is why the `revoke ... from public` lines already in
-- 0001 and 0003 had no visible effect.
revoke all on function public.expire_stale_quotes()                      from public;
revoke all on function public.quote_discount_for(numeric)                from public;
revoke all on function public.set_quote_number()                         from public;
revoke all on function public.touch_updated_at()                         from public;
revoke all on function public.protect_last_admin()                       from public;
revoke all on function public.protect_last_admin_delete()                from public;
revoke all on function public.set_order_number()                         from public;
revoke all on function public.stamp_order_status()                       from public;
revoke all on function public.create_order_from_quote(uuid, timestamptz) from public;
revoke all on function public.recalc_quote(uuid, numeric)                from public;
revoke all on function public.is_active_agent()                          from public;
revoke all on function public.is_admin()                                 from public;
revoke all on function public.is_manager()                               from public;
revoke all on function public.quote_accept_by_agent(uuid, text)          from public;
revoke all on function public.quote_by_token(text, boolean)              from public;
revoke all on function public.quote_respond_by_token(
  text, text, text, text, text, text, text, text, text, text, text)      from public;

revoke all on function public.expire_stale_quotes()                     from anon, authenticated;
revoke all on function public.quote_discount_for(numeric)               from anon, authenticated;
revoke all on function public.set_quote_number()                        from anon, authenticated;
revoke all on function public.touch_updated_at()                        from anon, authenticated;
revoke all on function public.protect_last_admin()                      from anon, authenticated;
revoke all on function public.protect_last_admin_delete()               from anon, authenticated;
revoke all on function public.set_order_number()                        from anon, authenticated;
revoke all on function public.stamp_order_status()                      from anon, authenticated;
revoke all on function public.create_order_from_quote(uuid, timestamptz) from anon, authenticated;

revoke all on function public.recalc_quote(uuid, numeric)               from anon;
revoke all on function public.is_active_agent()                         from anon;
revoke all on function public.is_admin()                                from anon;
revoke all on function public.is_manager()                              from anon;
revoke all on function public.quote_accept_by_agent(uuid, text)         from anon;

grant execute on function public.recalc_quote(uuid, numeric)            to authenticated;
grant execute on function public.is_active_agent()                      to authenticated;
grant execute on function public.is_admin()                             to authenticated;
grant execute on function public.is_manager()                           to authenticated;
grant execute on function public.quote_accept_by_agent(uuid, text)      to authenticated;

grant execute on function public.quote_by_token(text, boolean)          to anon, authenticated;
grant execute on function public.quote_respond_by_token(
  text, text, text, text, text, text, text, text, text, text, text)     to anon, authenticated;

-- And for whatever gets written next, so this does not have to be remembered.
alter default privileges for role postgres in schema public
  revoke all on functions from anon;
