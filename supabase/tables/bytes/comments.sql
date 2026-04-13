-- ============================================================
-- TABLE: bytes.comments
-- Threaded comments on bytes (one level of nesting via parent_id)
-- Schema: bytes
-- Depends on: users.users, bytes.bytes
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id   uuid        REFERENCES bytes.comments(id) ON DELETE CASCADE,
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_comments_byte_id   ON bytes.comments (byte_id);
CREATE INDEX IF NOT EXISTS ix_comments_author_id ON bytes.comments (author_id);
CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON bytes.comments (parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON TABLE  bytes.comments           IS 'Threaded comments on bytes';
COMMENT ON COLUMN bytes.comments.parent_id IS 'Self-referencing FK for nested replies (null = top-level)';
