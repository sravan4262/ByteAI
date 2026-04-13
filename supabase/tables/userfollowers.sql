-- ============================================================
-- TABLE: users.userfollowers
-- "Who follows me" — user_id is followed by follower_id
-- Schema: users
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.userfollowers (
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    follower_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_userfollowers PRIMARY KEY (user_id, follower_id)
);

CREATE INDEX IF NOT EXISTS ix_userfollowers_follower_id ON users.userfollowers (follower_id);

COMMENT ON TABLE users.userfollowers IS '"Who follows me": user_id is being followed by follower_id';
