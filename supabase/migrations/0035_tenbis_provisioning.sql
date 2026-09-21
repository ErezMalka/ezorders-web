-- ─── What we have sold, and what we have delivered ────────────────────────────
--
-- Nobody can currently answer that for תן ביס. The sale is in this portal, the
-- onboarding task is in the CRM, and the credentials end up in the operational
-- system by hand — so an integration that was paid for four months ago and
-- never connected looks exactly like one sold yesterday. This view is the
-- answer, and it is the reason the feature is worth more than the panel alone.
--
-- security_invoker, like every other view here: the RLS policies on orders and
-- tenbis_accounts decide the rows, so an agent sees their own and a manager
-- sees everyone's without this view knowing anything about either rule.

create or replace view public.tenbis_provisioning
with (security_invoker = true) as
select
  o.id                              as order_id,
  o.order_number,
  o.customer_name,
  o.customer_phone,
  o.agent_id,
  o.accepted_at,
  o.status::text                    as order_status,

  -- No row means sold and untouched. The panel creates one on the first save,
  -- so the table stays the size of the work in progress rather than of every
  -- integration ever sold.
  coalesce(t.state, 'sold')         as state,
  t.last_error,
  t.instructed_at,
  t.verified_at,
  t.delivered_at,
  t.bite_branch_id,
  t.updated_at                      as account_updated_at,

  -- A fact about the password, never the column itself. This view is read by a
  -- list screen and there is no reason for the ciphertext to travel to one.
  (t.password_enc is not null)      as has_password,

  -- Worst first, and the ordering states a rule rather than a taste: anything
  -- broken, then everything waiting on US, then what is waiting on the
  -- customer, then what is finished. An agent opening this list should find the
  -- rows they can act on at the top, and "waiting on them" is not one of those.
  case coalesce(t.state, 'sold')
    when 'failed'     then 0   -- broken; somebody must look
    when 'entered'    then 1   -- ours, and one click from done
    when 'verified'   then 2   -- ours, ready to hand to setup
    when 'sold'       then 3   -- ours, not started
    when 'instructed' then 4   -- theirs
    when 'delivered'  then 5   -- done
    else 6
  end                               as sort_rank

from public.orders o
left join public.tenbis_accounts t on t.order_id = o.id
-- EXISTS rather than a join to quote_items: a quote may carry the line more
-- than once, and a join would then show the same order twice.
where exists (
  select 1
    from public.quote_items qi
   where qi.quote_id = o.quote_id
     and qi.component_key = 'tenbis'
)
  and o.status <> 'cancelled';

comment on view public.tenbis_provisioning is
  'Every order that bought תן ביס and where its setup stands. Worst first.';

-- The view asks quote_items "does this quote carry tenbis" once per order on
-- every render of the list, and the existing indexes are on quote_id alone.
create index if not exists quote_items_component_key_idx
  on public.quote_items (component_key);

revoke all on public.tenbis_provisioning from anon;
grant select on public.tenbis_provisioning to authenticated;
