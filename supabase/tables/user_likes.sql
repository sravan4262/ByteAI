-- ============================================================
-- TABLE: bytes.user_likes
-- User likes on bytes — composite PK prevents duplicates
-- Schema: bytes
-- Depends on: users.users, bytes.bytes
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.user_likes (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_user_likes PRIMARY KEY (byte_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_user_likes_user_id ON bytes.user_likes (user_id);

COMMENT ON TABLE bytes.user_likes IS 'One like per user per byte — composite PK enforces uniqueness';
