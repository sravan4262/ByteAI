-- ============================================================
-- TABLE: users.userfollowing
-- "Who I follow" — user_id follows following_id
-- Schema: users
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.userfollowing (
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    following_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_userfollowing PRIMARY KEY (user_id, following_id)
);

CREATE INDEX IF NOT EXISTS ix_userfollowing_following_id ON users.userfollowing (following_id);

COMMENT ON TABLE users.userfollowing IS '"Who I follow": user_id follows following_id';
