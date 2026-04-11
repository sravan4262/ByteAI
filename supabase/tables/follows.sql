-- ============================================================
-- TABLE: users.follows
-- Social graph — who follows whom. Composite PK prevents duplicates.
-- Schema: users
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.follows (
    follower_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    following_id    uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_follows PRIMARY KEY (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS ix_follows_following_id ON users.follows (following_id);

COMMENT ON TABLE users.follows IS 'Social graph — follower → following. No self-follows enforced by check constraint.';
