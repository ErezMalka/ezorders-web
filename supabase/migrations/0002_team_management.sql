-- ════════════════════════════════════════════════════════════════════════════
--  Team management — a third role, and the rows it is allowed to touch
--
--  Adding an agent used to mean opening the SQL editor. That is tolerable for
--  the first agent and untenable by the fifth, so `admin` exists to do it from
--  inside the product.
--
--  The three roles, in full:
--    agent    — their own quotes
--    manager  — every quote, from every agent
--    admin    — every quote, plus the team: add, deactivate, change role,
--               reset a password
--
--  Creating the login itself is NOT done here. Passwords belong to Supabase
--  Auth, and the server reaches its admin API with the service-role key; this
--  migration only governs the public.agents row that sits beside it.
--
--  Run 0002a first (it adds the enum value), then 0002b. Postgres will not let
--  a new enum value be used in the same transaction that created it.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0002a ───────────────────────────────────────────────────────────────────
alter type agent_role add value if not exists 'admin';


-- ── 0002b ───────────────────────────────────────────────────────────────────

-- Set when an admin hands out a password. The portal then refuses to show
-- anything else until the agent has replaced it, so a password that was spoken
-- aloud or pasted into a chat has a short life.
alter table public.agents
  add column if not exists must_change_password boolean not null default false;

-- Who invited whom. Useful when an account turns up that nobody remembers
-- creating.
alter table public.agents
  add column if not exists invited_by uuid references public.agents(id);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from public.agents
     where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- Managers already see every quote; admins must too. is_manager() is the
-- predicate the quote policies use, so widening it here covers all of them at
-- once rather than editing four policies.
create or replace function public.is_manager()
returns boolean language sql stable security definer
set search_path = public, pg_catalog as $$
  select exists (
    select 1 from public.agents
     where id = auth.uid() and role in ('manager', 'admin') and is_active
  );
$$;

-- ── agents policies ─────────────────────────────────────────────────────────
-- Replaced rather than added to: the old update policy pinned `role` to its
-- current value for everyone, which is right for self-service and wrong for an
-- admin whose whole job is changing it.
drop policy if exists agents_read_self   on public.agents;
drop policy if exists agents_update_self on public.agents;

create policy agents_select on public.agents
  for select to authenticated
  using (id = auth.uid() or public.is_manager());

-- An agent may edit their own row, but not their own role and not their own
-- active flag. Both subqueries read the pre-update snapshot, so they compare
-- against the values as they stand now.
create policy agents_update_self on public.agents
  for update to authenticated
  using (id = auth.uid() and not public.is_admin())
  with check (
    id = auth.uid()
    and role      = (select role      from public.agents where id = auth.uid())
    and is_active = (select is_active from public.agents where id = auth.uid())
  );

create policy agents_admin_manage on public.agents
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── guard rails ─────────────────────────────────────────────────────────────
-- Two ways to lock everyone out of team management: demote the last admin, or
-- deactivate them. Both are easy to do by accident and impossible to undo from
-- inside the product, so the database refuses.
create or replace function public.protect_last_admin()
returns trigger language plpgsql security definer
set search_path = public, pg_catalog as $$
declare v_remaining integer;
begin
  if old.role = 'admin' and (new.role <> 'admin' or new.is_active = false) then
    select count(*) into v_remaining
      from public.agents
     where role = 'admin' and is_active and id <> old.id;

    if v_remaining = 0 then
      raise exception 'לא ניתן להשבית או לשנות את תפקיד המנהל האחרון'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists agents_protect_last_admin on public.agents;
create trigger agents_protect_last_admin
  before update on public.agents
  for each row execute function public.protect_last_admin();

create or replace function public.protect_last_admin_delete()
returns trigger language plpgsql security definer
set search_path = public, pg_catalog as $$
declare v_remaining integer;
begin
  if old.role = 'admin' then
    select count(*) into v_remaining
      from public.agents
     where role = 'admin' and is_active and id <> old.id;
    if v_remaining = 0 then
      raise exception 'לא ניתן למחוק את המנהל האחרון'
        using errcode = 'check_violation';
    end if;
  end if;
  return old;
end $$;

drop trigger if exists agents_protect_last_admin_delete on public.agents;
create trigger agents_protect_last_admin_delete
  before delete on public.agents
  for each row execute function public.protect_last_admin_delete();

-- ── team roster ─────────────────────────────────────────────────────────────
-- Quote counts alongside each agent, so the team screen can answer "is this
-- account still in use?" before someone deactivates it.
create or replace view public.agents_list
with (security_invoker = true) as
select
  a.id, a.full_name, a.email, a.phone, a.role, a.is_active,
  a.must_change_password, a.created_at,
  (select count(*) from public.quotes q
    where q.agent_id = a.id and q.deleted_at is null) as quote_count,
  (select max(q.created_at) from public.quotes q
    where q.agent_id = a.id and q.deleted_at is null) as last_quote_at
from public.agents a;

grant select on public.agents_list to authenticated;
grant delete on public.agents      to authenticated;
