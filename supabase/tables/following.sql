-- ============================================================
-- TABLE: users.following
-- "Who I follow" — user_id follows following_id
-- Schema: users
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.following (
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    following_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_following PRIMARY KEY (user_id, following_id),
    CONSTRAINT chk_following_no_self CHECK (user_id <> following_id)
);

CREATE INDEX IF NOT EXISTS ix_following_following_id ON users.following (following_id);

COMMENT ON TABLE users.following IS '"Who I follow": user_id follows following_id';
