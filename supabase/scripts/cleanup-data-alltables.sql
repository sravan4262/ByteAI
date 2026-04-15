-- ============================================================
-- CLEANUP SCRIPT — ByteAI
-- Deletes all data in dependency order (children first).
-- Safe to re-run. Does NOT drop tables or schema.
-- Run this before re-seeding to start from a clean state.
-- ============================================================

-- ── Interviews (deepest children first) ──────────────────────
DELETE FROM interviews.interview_question_comments;
DELETE FROM interviews.interview_question_likes;
DELETE FROM interviews.interview_questions;
DELETE FROM interviews.interview_comments;
DELETE FROM interviews.interview_likes;
DELETE FROM interviews.interview_views;
DELETE FROM interviews.interview_tech_stacks;
DELETE FROM interviews.interview_bookmarks;
DELETE FROM interviews.interview_locations;
DELETE FROM interviews.interviews;
DELETE FROM interviews.roles;
DELETE FROM interviews.locations;

-- ── Bytes (deepest children first) ───────────────────────────
DELETE FROM bytes.trending;
DELETE FROM bytes.byte_quality_scores;
DELETE FROM bytes.user_likes;
DELETE FROM bytes.user_bookmarks;
DELETE FROM bytes.user_views;
DELETE FROM bytes.comments;
DELETE FROM bytes.byte_tech_stacks;
DELETE FROM bytes.drafts;
DELETE FROM bytes.bytes;

-- ── Users (after bytes/interviews are cleared) ────────────────
DELETE FROM users.notifications;
DELETE FROM users.user_badges;
DELETE FROM users.user_tech_stacks;
DELETE FROM users.userfollowers;
DELETE FROM users.userfollowing;
DELETE FROM users.users;

-- ── Lookups (last — everything else references these) ─────────
DELETE FROM lookups.tech_stacks;
DELETE FROM lookups.subdomains;
DELETE FROM lookups.domains;
DELETE FROM lookups.badge_types;
DELETE FROM lookups.level_types;
DELETE FROM lookups.seniority_types;
DELETE FROM lookups.companies;
DELETE FROM lookups.notification_types;
DELETE FROM lookups.search_types;
