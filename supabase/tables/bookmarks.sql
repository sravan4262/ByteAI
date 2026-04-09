-- ============================================================
-- TABLE: bookmarks
-- User-saved bytes — composite PK prevents duplicate bookmarks
-- Depends on: users, bytes
-- ============================================================
CREATE TABLE IF NOT EXISTS bookmarks (
    byte_id     uuid        NOT NULL REFERENCES bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_bookmarks PRIMARY KEY (byte_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_bookmarks_user_id ON bookmarks (user_id);

COMMENT ON TABLE bookmarks IS 'Saved bytes per user — composite PK enforces uniqueness';
