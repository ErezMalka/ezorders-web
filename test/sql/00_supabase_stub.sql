-- Enough of Supabase to replay the migrations on a plain Postgres: the auth
-- schema, the roles the policies name, and — importantly — the default
-- privileges a real project ships with.
--
-- That last part is not decoration. The first version of this stub created the
-- roles and stopped there, so `revoke all on function ... from public` appeared
-- to work and anon appeared to hold no table privileges. On a real project
-- neither was true, because Supabase grants everything in `public` to anon,
-- authenticated and service_role by default and an explicit grant survives a
-- revoke aimed at PUBLIC. Two real holes hid in that gap between the test
-- database and the live one. A stub that is more permissive than production is
-- worse than no stub at all: it produces confident, wrong verification.

-- pgcrypto lives in `extensions` on Supabase, not in `public`. Putting it in
-- public here would leave three dozen crypto functions in the schema the
-- privilege tests inspect, and drown the ones that matter.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase reads the JWT from a GUC; the tests set that GUC directly.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
grant select on auth.users   to authenticated, service_role;

-- ── the part that matters ───────────────────────────────────────────────────
-- Copied from what a Supabase project actually has. Everything created in
-- public from here on is handed to all three roles automatically, so a
-- migration that means to keep anon out has to say so explicitly — exactly as
-- it must in production.
alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- Supabase puts `extensions` on the search path for everyone.
grant usage on schema extensions to anon, authenticated, service_role;
do $$ begin
  execute format('alter database %I set search_path = "$user", public, extensions',
                 current_database());
end $$;
set search_path = "$user", public, extensions;
