#!/usr/bin/env bash
# Replay every migration onto a scratch database and run the SQL suites.
#   test/sql/run.sh            → uses a local postgres on $PGHOST/$PGPORT
set -euo pipefail
DB="${1:-ez_test}"
cd "$(dirname "$0")/../.."
dropdb --if-exists "$DB"; createdb "$DB"
for f in test/sql/00_supabase_stub.sql \
         supabase/migrations/0001_agent_portal.sql \
         supabase/migrations/0002_team_management.a.sql \
         supabase/migrations/0002_team_management.b.sql \
         supabase/migrations/0003_orders.a.sql \
         supabase/migrations/0003_orders.b.sql \
         supabase/migrations/0004_revoke_anon.sql \
         supabase/migrations/0005_lock_function_execution.sql \
         supabase/migrations/0007_base_setup_is_not_an_argument.sql \
         supabase/migrations/0008_product_catalogue.a.sql \
         supabase/migrations/0008_product_catalogue.b.sql \
         supabase/migrations/0009_product_taxonomy.sql \
         supabase/migrations/0010_product_images.sql \
         supabase/migrations/0011_hardware_showcase.sql \
         supabase/migrations/0012_price_tabs.sql \
         supabase/migrations/0013_contracts.sql \
         supabase/migrations/0014_contract_flow.sql \
         supabase/migrations/0015_contract_template_v1.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" > /dev/null
done
for t in test/sql/10_orders.sql test/sql/20_privileges.sql test/sql/30_contracts.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$t" 2>&1 | grep -E 'NOTICE:  ok|ERROR|── ' | sed 's/^psql:[^ ]* //'
done
