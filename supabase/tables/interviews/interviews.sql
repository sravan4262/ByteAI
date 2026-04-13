-- ============================================================
-- TABLE: interviews.interviews
-- Interview experience posts — separate from bytes
-- Schema: interviews
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interviews (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    title         text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    body          text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    code_snippet  text        CHECK (char_length(code_snippet) <= 10000),
    language      text        CHECK (char_length(language) <= 50),
    company       text        CHECK (char_length(company) <= 100),
    role          text        CHECK (char_length(role) <= 100),
    difficulty    text        NOT NULL DEFAULT 'medium'
                              CHECK (difficulty IN ('easy', 'medium', 'hard')),
    embedding     vector(768),
    search_vector tsvector    GENERATED ALWAYS AS (
                      to_tsvector('english'::regconfig,
                          coalesce(title, '') || ' ' || coalesce(body, '') || ' ' ||
                          coalesce(company, '') || ' ' || coalesce(role, ''))
                  ) STORED,
    type          text        NOT NULL DEFAULT 'interview'
                              CHECK (type IN ('interview', 'system_design', 'behavioral', 'coding')),
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_interviews_author_id     ON interviews.interviews (author_id);
CREATE INDEX IF NOT EXISTS ix_interviews_created_at    ON interviews.interviews (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_interviews_search_vector ON interviews.interviews USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS ix_interviews_embedding     ON interviews.interviews USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS ix_interviews_company       ON interviews.interviews (company) WHERE company IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_interviews_is_active     ON interviews.interviews (is_active) WHERE is_active = true;

COMMENT ON TABLE interviews.interviews IS 'Interview experience posts — separate content type from bytes';
COMMENT ON COLUMN interviews.interviews.is_active IS 'Soft-delete flag — false hides the interview from all feeds';
