-- ============================================================
-- TABLE: bytes.user_bookmarks
-- User-saved bytes — composite PK prevents duplicate bookmarks
-- Schema: bytes
-- Depends on: users.users, bytes.bytes
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.user_bookmarks (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_user_bookmarks PRIMARY KEY (byte_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_user_bookmarks_user_id ON bytes.user_bookmarks (user_id);

COMMENT ON TABLE bytes.user_bookmarks IS 'Saved bytes per user — composite PK enforces uniqueness';
