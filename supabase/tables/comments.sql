-- ============================================================
-- TABLE: comments
-- Threaded comments on bytes (one level of nesting via parent_id)
-- Depends on: users, bytes
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id   uuid        REFERENCES comments(id) ON DELETE CASCADE,
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_comments_byte_id    ON comments (byte_id);
CREATE INDEX IF NOT EXISTS ix_comments_author_id  ON comments (author_id);
CREATE INDEX IF NOT EXISTS ix_comments_parent_id  ON comments (parent_id) WHERE parent_id IS NOT NULL;

COMMENT ON TABLE  comments          IS 'Threaded comments on bytes';
COMMENT ON COLUMN comments.parent_id IS 'Self-referencing FK for nested replies (null = top-level)';
