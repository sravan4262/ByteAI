#!/usr/bin/env bash
# ByteAI — Seed runner (idempotent)
# Usage: ./supabase/scripts/seed.sh
# Env:   BYTEAI_DB_URL  (default: local Supabase)
#        SKIP_BYTES_SEED=true  (default: true — bytes seed is large and excluded by default)
#
# All seeds use ON CONFLICT DO NOTHING — safe to re-run any number of times.
# The bytes seed is excluded by default; enable only for local dev if needed.

set -euo pipefail

DB="${BYTEAI_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SEEDS_DIR="$(cd "$(dirname "$0")/../seeds" && pwd)"

echo "==> ByteAI seeds"
echo "    DB: $DB"
echo ""

run_seed() {
    local file="$1"
    echo "  [seed] $(basename "$file")"
    psql "$DB" -f "$file"
}

# ── Lookups (no deps) ─────────────────────────────────────────────────────────
echo "--- lookups ---"
run_seed "$SEEDS_DIR/lookups/domains_seed.sql"
run_seed "$SEEDS_DIR/lookups/seniority_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/level_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/badge_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/role_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/search_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/feature_flag_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/xp_action_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/subdomains_seed.sql"
run_seed "$SEEDS_DIR/lookups/tech_stacks_seed.sql"
run_seed "$SEEDS_DIR/lookups/notification_types_seed.sql"
run_seed "$SEEDS_DIR/lookups/companies_seed.sql"

# ── Users ─────────────────────────────────────────────────────────────────────
echo ""
echo "--- users ---"
run_seed "$SEEDS_DIR/users/seed_user.sql"

# ── Interviews ────────────────────────────────────────────────────────────────
echo ""
echo "--- interviews ---"
run_seed "$SEEDS_DIR/interviews/locations_seed.sql"
run_seed "$SEEDS_DIR/interviews/roles_seed.sql"

# ── Bytes — excluded by default (large dataset, not needed for most dev work) ─
echo ""
SKIP_BYTES="${SKIP_BYTES_SEED:-true}"
if [ "$SKIP_BYTES" = "true" ]; then
    echo "--- bytes seed: skipped (set SKIP_BYTES_SEED=false to enable) ---"
else
    echo "--- bytes ---"
    find "$SEEDS_DIR/bytes" -name "*.sql" | sort | while read -r f; do
        run_seed "$f"
    done
fi

echo ""
echo "==> Seeds complete."
