-- ============================================================
-- TABLE: users.user_feed_preferences
-- Many-to-many: users ↔ tech_stacks for feed filtering
-- Schema: users
-- Depends on: users.users, lookups.tech_stacks
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_feed_preferences (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    tech_stack_id uuid        NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_user_feed_preferences PRIMARY KEY (user_id, tech_stack_id)
);

CREATE INDEX IF NOT EXISTS ix_user_feed_preferences_tech_stack_id ON users.user_feed_preferences (tech_stack_id);

COMMENT ON TABLE users.user_feed_preferences IS 'User feed preferences — tech stacks the user wants to see in their feed';
