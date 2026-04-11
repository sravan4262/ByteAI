-- ============================================================
-- TABLE: bytes.bytes
-- Core content unit — a short tech post
-- Schema: bytes
-- Depends on: users.users
-- NOTE: tags removed — use bytes.byte_tech_stacks junction table
--       like_count, comment_count, view_count, bookmark_count removed — derived from junction tables
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.bytes (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    title         text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    body          text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    code_snippet  text        CHECK (char_length(code_snippet) <= 10000),
    language      text        CHECK (char_length(language) <= 50),
    embedding     vector(384),  -- ONNX all-MiniLM-L6-v2 embedding of title + body
    search_vector tsvector    GENERATED ALWAYS AS (
                      to_tsvector('english'::regconfig,
                          coalesce(title, '') || ' ' || coalesce(body, ''))
                  ) STORED,
    type          text        NOT NULL DEFAULT 'article'
                              CHECK (type IN ('article', 'tutorial', 'snippet', 'discussion')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_bytes_author_id     ON bytes.bytes (author_id);
CREATE INDEX IF NOT EXISTS ix_bytes_created_at    ON bytes.bytes (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_bytes_search_vector ON bytes.bytes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS ix_bytes_embedding     ON bytes.bytes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE  bytes.bytes           IS 'Core content unit — a short tech post';
COMMENT ON COLUMN bytes.bytes.embedding IS '384-dim ONNX embedding for semantic/vector search';
COMMENT ON COLUMN bytes.bytes.search_vector IS 'PostgreSQL generated tsvector for full-text search';
