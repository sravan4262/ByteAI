#!/usr/bin/env bash
# ByteAI — Apply full schema + seeds to local Supabase DB
# Usage: ./supabase/apply_schema.sh
# Requires: psql in PATH  (brew install libpq && export PATH="/opt/homebrew/opt/libpq/bin:$PATH")
#
# Schema layout:
#   lookups   — static lookup tables (seniority_types, domains, tech_stacks, badge_types, level_types, search_types)
#   users     — user profile + social graph + notifications + badges + logs
#   bytes     — byte posts + comments + likes + views + bookmarks + drafts + trending
#   interviews — interview posts + comments + likes + views + bookmarks

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

# ── lookups schema (no FK deps outside lookups) ───────────────────────────────
echo ""
echo "--- lookups schema ---"
psql "$DB" -f supabase/tables/seniority_types.sql
psql "$DB" -f supabase/tables/domains.sql
psql "$DB" -f supabase/tables/badge_types.sql
psql "$DB" -f supabase/tables/level_types.sql
psql "$DB" -f supabase/tables/search_types.sql
psql "$DB" -f supabase/tables/tech_stacks.sql      # depends on lookups.domains

# ── users schema (depends on lookups) ────────────────────────────────────────
echo ""
echo "--- users schema ---"
psql "$DB" -f supabase/tables/users.sql             # depends on lookups.*
psql "$DB" -f supabase/tables/user_badges.sql       # depends on users.users, lookups.badge_types
psql "$DB" -f supabase/tables/user_tech_stacks.sql  # depends on users.users, lookups.tech_stacks
psql "$DB" -f supabase/tables/user_feed_preferences.sql
psql "$DB" -f supabase/tables/follows.sql
psql "$DB" -f supabase/tables/followers.sql
psql "$DB" -f supabase/tables/following.sql
psql "$DB" -f supabase/tables/socials.sql
psql "$DB" -f supabase/tables/notifications.sql
psql "$DB" -f supabase/tables/logs.sql

# ── bytes schema (depends on users.users, lookups.tech_stacks) ───────────────
echo ""
echo "--- bytes schema ---"
psql "$DB" -f supabase/tables/bytes.sql             # depends on users.users
psql "$DB" -f supabase/tables/byte_tech_stacks.sql  # depends on bytes.bytes, lookups.tech_stacks
psql "$DB" -f supabase/tables/comments.sql          # depends on bytes.bytes, users.users
psql "$DB" -f supabase/tables/user_likes.sql        # depends on bytes.bytes, users.users
psql "$DB" -f supabase/tables/user_views.sql        # depends on bytes.bytes, users.users (nullable)
psql "$DB" -f supabase/tables/user_bookmarks.sql    # depends on bytes.bytes, users.users
psql "$DB" -f supabase/tables/drafts.sql            # depends on users.users
psql "$DB" -f supabase/tables/trending.sql          # depends on users.users (nullable)

# ── interviews schema (depends on users.users, lookups.tech_stacks) ──────────
echo ""
echo "--- interviews schema ---"
psql "$DB" -f supabase/tables/interviews.sql                        # depends on users.users
psql "$DB" -f supabase/tables/interview_tech_stacks.sql             # depends on interviews.interviews, lookups.tech_stacks
psql "$DB" -f supabase/tables/interview_comments.sql                # depends on interviews.interviews, users.users
psql "$DB" -f supabase/tables/interview_likes.sql                   # depends on interviews.interviews, users.users
psql "$DB" -f supabase/tables/interview_views.sql                   # depends on interviews.interviews, users.users
psql "$DB" -f supabase/tables/interview_bookmarks.sql               # depends on interviews.interviews, users.users
psql "$DB" -f supabase/tables/interview_questions.sql               # depends on interviews.interviews
psql "$DB" -f supabase/tables/interview_question_comments.sql       # depends on interviews.interview_questions, users.users
psql "$DB" -f supabase/tables/interview_question_likes.sql          # depends on interviews.interview_questions, users.users

# ── Seeds (dependency order: lookups → users → content) ──────────────────────
echo ""
echo "--- Seeds ---"
psql "$DB" -f supabase/seeds/seed_seniority.sql
psql "$DB" -f supabase/seeds/seed_domains.sql
psql "$DB" -f supabase/seeds/seed_tech_stacks.sql
psql "$DB" -f supabase/seeds/seed_badge_types.sql
psql "$DB" -f supabase/seeds/seed_level_types.sql
psql "$DB" -f supabase/seeds/seed_search_types.sql
psql "$DB" -f supabase/seeds/seed_users.sql
psql "$DB" -f supabase/seeds/seed_bytes.sql
psql "$DB" -f supabase/seeds/seed_byte_tech_stacks.sql
psql "$DB" -f supabase/seeds/seed_interviews.sql
psql "$DB" -f supabase/seeds/seed_interview_comments.sql

echo ""
echo "✓ Schema + seeds applied successfully."
