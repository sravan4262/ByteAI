#!/usr/bin/env bash
# ByteAI — Idempotent migration runner
# Usage: ./supabase/scripts/migrate.sh
# Env:   BYTEAI_DB_URL  (default: local Supabase)
#
# Behaviour:
#   - Creates schema_migrations tracking table if it doesn't exist
#   - Runs each migration file in order, skipping already-applied ones
#   - Records applied migrations so re-runs are safe
#   - Exits non-zero on first failure

set -euo pipefail

DB="${BYTEAI_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"

echo "==> ByteAI migrations"
echo "    DB:         $DB"
echo "    Migrations: $MIGRATIONS_DIR"
echo ""

# ── Bootstrap: create tracking table (once, idempotent) ───────────────────────
psql "$DB" -q <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version    text        PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

echo "--- Checking pending migrations ---"

APPLIED=0
SKIPPED=0

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    version="$(basename "$migration_file")"

    # Check if already applied
    already_applied=$(psql "$DB" -t -A -c \
        "SELECT COUNT(1) FROM public.schema_migrations WHERE version = '$version'")

    if [ "$already_applied" = "1" ]; then
        echo "  [skip] $version (already applied)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    echo "  [run]  $version"
    psql "$DB" -f "$migration_file"

    # Record as applied
    psql "$DB" -q -c \
        "INSERT INTO public.schema_migrations (version) VALUES ('$version') ON CONFLICT DO NOTHING"

    APPLIED=$((APPLIED + 1))
done

echo ""
echo "==> Done. Applied: $APPLIED  Skipped: $SKIPPED"
