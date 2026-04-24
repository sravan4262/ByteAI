-- ============================================================
-- Migration 008: User Activity Views
-- Depends on: 003_users_tables
-- ============================================================

-- Panel 1: users who signed in today
CREATE OR REPLACE VIEW users.v_logged_in_today AS
SELECT
    u.id            AS user_id,
    u.display_name,
    u.username,
    u.avatar_url,
    au.email,
    au.last_sign_in_at AS activity_at
FROM users.users u
JOIN auth.users au ON au.id = u.supabase_user_id
WHERE au.last_sign_in_at >= CURRENT_DATE;

-- Panel 2: users with a live (non-expired) session
-- DISTINCT ON ensures one row per user (most recent session wins)
CREATE OR REPLACE VIEW users.v_currently_logged_in AS
SELECT DISTINCT ON (u.id)
    u.id            AS user_id,
    u.display_name,
    u.username,
    u.avatar_url,
    au.email,
    s.created_at    AS activity_at
FROM users.users u
JOIN auth.sessions s  ON s.user_id  = u.supabase_user_id
JOIN auth.users    au ON au.id      = u.supabase_user_id
WHERE s.not_after IS NULL OR s.not_after > NOW()
ORDER BY u.id, s.created_at DESC;
