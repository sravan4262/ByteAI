-- ============================================================
-- TABLE: badges
-- Earned badges per user
-- Depends on: users
-- ============================================================
CREATE TABLE IF NOT EXISTS badges (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_type  text        NOT NULL,
    earned_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_badges_user_id ON badges (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_badges_user_type ON badges (user_id, badge_type);

COMMENT ON TABLE badges IS 'Gamification badges earned by users';
