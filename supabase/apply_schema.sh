#!/usr/bin/env bash
# ByteAI — Apply full schema + seeds to a fresh DB
# Usage: ./supabase/apply_schema.sh
# Requires: psql in PATH  (brew install libpq && export PATH="/opt/homebrew/opt/libpq/bin:$PATH")
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

# ── Extensions ────────────────────────────────────────────────────────────────
echo "--- Extensions ---"
psql "$DB" -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql "$DB" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# ── Schemas ───────────────────────────────────────────────────────────────────
echo ""
echo "--- Schemas ---"
psql "$DB" -c "CREATE SCHEMA IF NOT EXISTS lookups;"
psql "$DB" -c "CREATE SCHEMA IF NOT EXISTS users;"
psql "$DB" -c "CREATE SCHEMA IF NOT EXISTS bytes;"
psql "$DB" -c "CREATE SCHEMA IF NOT EXISTS interviews;"

# ── lookups (no deps outside lookups) ────────────────────────────────────────
echo ""
echo "--- lookups ---"
psql "$DB" -f supabase/tables/lookups/domains.sql
psql "$DB" -f supabase/tables/lookups/seniority_types.sql
psql "$DB" -f supabase/tables/lookups/level_types.sql
psql "$DB" -f supabase/tables/lookups/badge_types.sql
psql "$DB" -f supabase/tables/lookups/search_types.sql
psql "$DB" -f supabase/tables/lookups/tech_stacks.sql          # depends on lookups.domains
psql "$DB" -f supabase/tables/lookups/companies.sql            # moved from interviews/
psql "$DB" -f supabase/tables/lookups/notification_types.sql   # moved from users/

# ── users (depends on lookups) ────────────────────────────────────────────────
echo ""
echo "--- users ---"
psql "$DB" -f supabase/tables/users/users.sql                  # depends on lookups.*
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
psql "$DB" -f supabase/tables/interviews/interview_tech_stacks.sql
psql "$DB" -f supabase/tables/interviews/interview_questions.sql
psql "$DB" -f supabase/tables/interviews/interview_comments.sql
psql "$DB" -f supabase/tables/interviews/interview_likes.sql
psql "$DB" -f supabase/tables/interviews/interview_bookmarks.sql
psql "$DB" -f supabase/tables/interviews/interview_views.sql
psql "$DB" -f supabase/tables/interviews/interview_question_comments.sql
psql "$DB" -f supabase/tables/interviews/interview_question_likes.sql

# ── Seeds (lookups first, then content via seed_data.py) ─────────────────────
echo ""
echo "--- Seeds (lookups) ---"
psql "$DB" -f supabase/seeds/lookups/domains_seed.sql
psql "$DB" -f supabase/seeds/lookups/seniority_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/level_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/tech_stacks_seed.sql
psql "$DB" -f supabase/seeds/lookups/badge_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/search_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/notification_types_seed.sql
psql "$DB" -f supabase/seeds/lookups/companies_seed.sql

echo ""
echo "✓ Schema + lookup seeds applied."
echo ""
echo "  To seed content (bytes + interviews with embeddings), run:"
echo "  python3 supabase/seeds/seed_data.py | psql \$BYTEAI_DB_URL"
