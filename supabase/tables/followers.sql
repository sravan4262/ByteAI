-- ============================================================
-- TABLE: users.followers
-- "Who follows me" — user_id is followed by follower_id
-- Schema: users
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.followers (
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    follower_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_followers PRIMARY KEY (user_id, follower_id),
    CONSTRAINT chk_followers_no_self CHECK (user_id <> follower_id)
);

CREATE INDEX IF NOT EXISTS ix_followers_follower_id ON users.followers (follower_id);

COMMENT ON TABLE users.followers IS '"Who follows me": user_id is being followed by follower_id';
