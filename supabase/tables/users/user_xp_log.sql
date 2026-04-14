-- ============================================================
-- TABLE: users.user_xp_log
-- Audit log of every XP award. Used to enforce one-time and
-- daily caps without adding flag columns to the users table.
-- Schema: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_xp_log (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    action_name text        NOT NULL CHECK (char_length(action_name) BETWEEN 1 AND 100),
    xp_amount   integer     NOT NULL CHECK (xp_amount > 0),
    awarded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_user_xp_log_user_action ON users.user_xp_log (user_id, action_name);
CREATE INDEX ix_user_xp_log_awarded_at  ON users.user_xp_log (awarded_at);

COMMENT ON TABLE  users.user_xp_log             IS 'Audit log of XP awards. One-time actions use this to prevent double-awarding.';
COMMENT ON COLUMN users.user_xp_log.action_name IS 'Matches lookups.xp_action_types.name.';
