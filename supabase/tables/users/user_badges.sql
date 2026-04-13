-- ============================================================
-- TABLE: users.user_badges
-- Earned badges per user
-- Schema: users
-- Depends on: users.users, lookups.badge_types
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_badges (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    badge_type_id uuid        REFERENCES lookups.badge_types(id) ON DELETE SET NULL,
    badge_type    text        NOT NULL,
    earned_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX        IF NOT EXISTS ix_user_badges_user_id    ON users.user_badges (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_badges_user_type  ON users.user_badges (user_id, badge_type);

COMMENT ON TABLE users.user_badges IS 'Gamification badges earned by users';
