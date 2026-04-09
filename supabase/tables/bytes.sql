-- ============================================================
-- TABLE: bytes
-- Core content unit — a short tech post
-- Depends on: users
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    body            text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    code_snippet    text        CHECK (char_length(code_snippet) <= 10000),
    language        text        CHECK (char_length(language) <= 50),
    tags            text[]      NOT NULL DEFAULT '{}',
    like_count      integer     NOT NULL DEFAULT 0 CHECK (like_count >= 0),
    comment_count   integer     NOT NULL DEFAULT 0 CHECK (comment_count >= 0),
    bookmark_count  integer     NOT NULL DEFAULT 0 CHECK (bookmark_count >= 0),
    view_count      integer     NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    embedding       vector(384),  -- ONNX all-MiniLM-L6-v2 embedding of title + body
    search_vector   tsvector    GENERATED ALWAYS AS (
                        to_tsvector('english',
                            coalesce(title, '') || ' ' ||
                            coalesce(body, '') || ' ' ||
                            coalesce(array_to_string(tags, ' '), ''))
                    ) STORED,
    type            text        NOT NULL DEFAULT 'article'
                                CHECK (type IN ('article', 'tutorial', 'snippet', 'discussion')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_bytes_author_id      ON bytes (author_id);
CREATE INDEX IF NOT EXISTS ix_bytes_created_at     ON bytes (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_bytes_search_vector  ON bytes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS ix_bytes_embedding      ON bytes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS ix_bytes_tags           ON bytes USING GIN (tags);

COMMENT ON TABLE  bytes           IS 'Core content unit — a short tech post';
COMMENT ON COLUMN bytes.embedding IS '384-dim ONNX embedding for semantic/vector search';
COMMENT ON COLUMN bytes.search_vector IS 'PostgreSQL generated tsvector for full-text search';
