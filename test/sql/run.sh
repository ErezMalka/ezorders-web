#!/usr/bin/env bash
# Replay every migration onto a scratch database and run the SQL suites.
#   test/sql/run.sh            → uses a local postgres on $PGHOST/$PGPORT
set -euo pipefail
DB="${1:-ez_test}"
cd "$(dirname "$0")/../.."
dropdb --if-exists "$DB"; createdb "$DB"

# Three migrations add an enum value and then use it, which Postgres refuses
# inside the transaction that created it. Each carries a "── 0002b ──" style
# marker where the halves part. Splitting here rather than in the repository
# keeps one file per migration — which is what gets pasted into the Supabase
# SQL editor, and what the setup instructions describe.
SPLIT=$(mktemp -d)
trap 'rm -rf "$SPLIT"' EXIT
split_at() {  # split_at <file> <marker> <first-half> <second-half>
  awk -v m="$2" -v a="$3" -v b="$4" '
    index($0, m) { part = 2 }
    { print > (part == 2 ? b : a) }
  ' "$1"
}
split_at supabase/migrations/0002_team_management.sql  '── 0002b' "$SPLIT/0002a.sql" "$SPLIT/0002b.sql"
split_at supabase/migrations/0003_orders.sql           '── 0003b' "$SPLIT/0003a.sql" "$SPLIT/0003b.sql"
split_at supabase/migrations/0008_product_catalogue.sql '── 0008b' "$SPLIT/0008a.sql" "$SPLIT/0008b.sql"

# 0006 is missing on purpose: it schedules a job with pg_cron, which a scratch
# database has no reason to install and no way to run.
for f in test/sql/00_supabase_stub.sql \
         supabase/migrations/0001_agent_portal.sql \
         "$SPLIT/0002a.sql" \
         "$SPLIT/0002b.sql" \
         "$SPLIT/0003a.sql" \
         "$SPLIT/0003b.sql" \
         supabase/migrations/0004_revoke_anon.sql \
         supabase/migrations/0005_lock_function_execution.sql \
         supabase/migrations/0007_base_setup_is_not_an_argument.sql \
         "$SPLIT/0008a.sql" \
         "$SPLIT/0008b.sql" \
         supabase/migrations/0009_product_taxonomy.sql \
         supabase/migrations/0010_product_images.sql \
         supabase/migrations/0011_hardware_showcase.sql \
         supabase/migrations/0012_price_tabs.sql \
         supabase/migrations/0013_contracts.sql \
         supabase/migrations/0014_contract_flow.sql \
         supabase/migrations/0015_contract_template_v1.sql \
         supabase/migrations/0016_contract_copy_email.sql \
         supabase/migrations/0017_contract_template_v2.sql \
         supabase/migrations/0018_contract_notes.sql \
         supabase/migrations/0019_contract_template_v3.sql \
         supabase/migrations/0020_contract_template_v4.sql \
         supabase/migrations/0021_hardware_kds_payment_printer.sql \
         supabase/migrations/0022_quote_edit_and_phone.sql \
         supabase/migrations/0023_software_families.sql \
         supabase/migrations/0024_direct_contract.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" > /dev/null
done
for t in test/sql/10_orders.sql test/sql/20_privileges.sql test/sql/30_contracts.sql \
         test/sql/40_quote_editing.sql test/sql/50_direct_contract.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$t" 2>&1 | grep -E 'NOTICE:  ok|ERROR|── ' | sed 's/^psql:[^ ]* //'
done
