-- ════════════════════════════════════════════════════════════════════════════
--  Actually run expire_stale_quotes()
--
--  0001 wrote the function and said, in its own comment, that nothing calls it:
--  "Run daily (pg_cron, or a scheduled function). Without it a stale quote keeps
--   showing as 'waiting on the customer' forever and pollutes the pipeline
--   figure."
--
--  Nobody did. The dashboard's headline number -- monthly revenue in the
--  pipeline -- counts every quote in 'sent' or 'viewed', so without this it
--  climbs forever and never comes down. A forecast that only goes up is not one
--  anybody keeps looking at.
--
--  03:10 Israel time, which is 00:10 UTC in winter and 01:10 in summer. The
--  exact hour does not matter; being outside working hours does, because the
--  update moves rows an agent might be looking at.
--
--  The job runs as the database owner, which is why 0005 could revoke
--  expire_stale_quotes() from anon and authenticated without breaking it.
-- ════════════════════════════════════════════════════════════════════════════
create extension if not exists pg_cron;

select cron.schedule(
  'expire-stale-quotes',
  '10 0 * * *',
  $$select public.expire_stale_quotes()$$
);

-- To check it later:
--   select jobname, schedule, active from cron.job;
--   select status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname='expire-stale-quotes')
--    order by start_time desc limit 5;
