#!/usr/bin/env bash
# ByteAI — Apply full schema + seeds
# Usage: ./supabase/apply_schema.sh
# Requires: psql in PATH  (brew install libpq && export PATH="/opt/homebrew/opt/libpq/bin:$PATH")
#
# Behaviour:
#   - Drops and recreates all schemas on each run (always reflects current state)
#   - Column additions, removals, type changes are automatically picked up
#   - Data is wiped on schema re-apply — run seeds after
#
# Schema layout:
#   lookups    — static lookup tables (domains, seniority, level, tech_stacks, badge_types, search_types, companies, notification_types)
#   users      — user profiles, social graph, notifications, badges, preferences, logs
#   bytes      — byte posts, comments, likes, views, bookmarks, drafts, trending, quality scores
#   interviews — interview posts, questions, comments, likes, views, bookmarks

set -e

DB="${BYTEAI_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

echo "==> Connecting to: $DB"
echo ""

# ── Extensions (idempotent — safe to re-run) ──────────────────────────────────
echo "--- Extensions ---"
psql "$DB" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql "$DB" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# ── Drop schemas in reverse dependency order ──────────────────────────────────
# CASCADE drops all tables, indexes, constraints within the schema.
echo ""
echo "--- Dropping schemas (reverse dependency order) ---"
psql "$DB" -c "DROP SCHEMA IF EXISTS interviews CASCADE;"
psql "$DB" -c "DROP SCHEMA IF EXISTS bytes      CASCADE;"
psql "$DB" -c "DROP SCHEMA IF EXISTS users      CASCADE;"
psql "$DB" -c "DROP SCHEMA IF EXISTS lookups    CASCADE;"

# ── Recreate schemas ──────────────────────────────────────────────────────────
echo ""
echo "--- Recreating schemas ---"
psql "$DB" -c "CREATE SCHEMA lookups;"
psql "$DB" -c "CREATE SCHEMA users;"
psql "$DB" -c "CREATE SCHEMA bytes;"
psql "$DB" -c "CREATE SCHEMA interviews;"

# ── lookups (no deps outside lookups) ────────────────────────────────────────
echo ""
echo "--- lookups ---"
psql "$DB" -f supabase/tables/lookups/domains.sql
psql "$DB" -f supabase/tables/lookups/seniority_types.sql
psql "$DB" -f supabase/tables/lookups/level_types.sql
psql "$DB" -f supabase/tables/lookups/badge_types.sql
psql "$DB" -f supabase/tables/lookups/search_types.sql
psql "$DB" -f supabase/tables/lookups/subdomains.sql           # depends on lookups.domains
psql "$DB" -f supabase/tables/lookups/tech_stacks.sql          # depends on lookups.subdomains
psql "$DB" -f supabase/tables/lookups/companies.sql
psql "$DB" -f supabase/tables/lookups/notification_types.sql
psql "$DB" -f supabase/tables/lookups/role_types.sql
psql "$DB" -f supabase/tables/lookups/feature_flag_types.sql

# ── users (depends on lookups) ────────────────────────────────────────────────
echo ""
echo "--- users ---"
psql "$DB" -f supabase/tables/users/users.sql                  # depends on lookups.*
psql "$DB" -f supabase/tables/users/user_roles.sql             # depends on role_types
psql "$DB" -f supabase/tables/users/user_feature_flags.sql     # depends on feature_flag_types
psql "$DB" -f supabase/tables/users/userfollowers.sql
psql "$DB" -f supabase/tables/users/userfollowing.sql
psql "$DB" -f supabase/tables/users/usersocials.sql
psql "$DB" -f supabase/tables/users/user_badges.sql            # depends on lookups.badge_types
psql "$DB" -f supabase/tables/users/user_tech_stacks.sql       # depends on lookups.tech_stacks
psql "$DB" -f supabase/tables/users/user_feed_preferences.sql
psql "$DB" -f supabase/tables/users/user_preferences.sql
psql "$DB" -f supabase/tables/users/notifications.sql          # depends on notification_types
psql "$DB" -f supabase/tables/users/logs.sql

# ── bytes (depends on users.users, lookups.tech_stacks) ──────────────────────
echo ""
echo "--- bytes ---"
psql "$DB" -f supabase/tables/bytes/bytes.sql
psql "$DB" -f supabase/tables/bytes/byte_tech_stacks.sql
psql "$DB" -f supabase/tables/bytes/byte_quality_scores.sql
psql "$DB" -f supabase/tables/bytes/comments.sql
psql "$DB" -f supabase/tables/bytes/user_likes.sql
psql "$DB" -f supabase/tables/bytes/user_bookmarks.sql
psql "$DB" -f supabase/tables/bytes/user_views.sql
psql "$DB" -f supabase/tables/bytes/drafts.sql
psql "$DB" -f supabase/tables/bytes/trending.sql

# ── interviews (depends on users.users, lookups.tech_stacks) ─────────────────
echo ""
echo "--- interviews ---"
psql "$DB" -f supabase/tables/interviews/interviews.sql
psql "$DB" -f supabase/tables/interviews/interview_roles.sql
psql "$DB" -f supabase/tables/interviews/locations.sql
psql "$DB" -f supabase/tables/interviews/interview_locations.sql
psql "$DB" -f supabase/tables/interviews/interview_tech_stacks.sql
psql "$DB" -f supabase/tables/interviews/interview_questions.sql
psql "$DB" -f supabase/tables/interviews/interview_comments.sql
psql "$DB" -f supabase/tables/interviews/interview_likes.sql
psql "$DB" -f supabase/tables/interviews/interview_bookmarks.sql
psql "$DB" -f supabase/tables/interviews/interview_views.sql
psql "$DB" -f supabase/tables/interviews/interview_question_comments.sql
psql "$DB" -f supabase/tables/interviews/interview_question_likes.sql

# ── Seeds: lookups ────────────────────────────────────────────────────────────
echo ""
echo "--- Seeds (lookups) ---"
psql "$DB" -f supabase/seeds/lookups/domains_seed.sql
psql "$DB" -f supabase/seeds/lookups/seniority_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/level_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/subdomains_seed.sql
psql "$DB" -f supabase/seeds/lookups/tech_stacks_seed.sql
psql "$DB" -f supabase/seeds/lookups/badge_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/search_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/notification_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/companies_seed.sql
psql "$DB" -f supabase/seeds/lookups/role_types_seed.sql

# ── Seeds: interviews ─────────────────────────────────────────────────────────
echo ""
echo "--- Seeds (interviews) ---"
psql "$DB" -f supabase/seeds/interviews/roles_seed.sql
psql "$DB" -f supabase/seeds/interviews/locations_seed.sql

echo ""
echo "✓ Schema + lookup seeds applied."
echo ""
echo "  To generate byte content (fills JSON files per tech stack), run:"
echo "  python3 ../seeds/generate-seed-json.py --domain frontend"
echo ""
echo "  To embed + insert bytes into DB, run:"
echo "  python3 ../seeds/generate_seed_data.py"
