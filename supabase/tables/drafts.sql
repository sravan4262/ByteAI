-- ============================================================
-- TABLE: bytes.drafts
-- Unpublished byte drafts saved by users
-- Schema: bytes
-- Depends on: users.users
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.drafts (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    title           text        CHECK (char_length(title) <= 200),
    body            text        CHECK (char_length(body) <= 5000),
    code_snippet    text        CHECK (char_length(code_snippet) <= 10000),
    language        text        CHECK (char_length(language) <= 50),
    tags            text[]      NOT NULL DEFAULT '{}',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_drafts_author_id ON bytes.drafts (author_id);

COMMENT ON TABLE bytes.drafts IS 'Unpublished byte drafts — auto-saved, user-owned. tags kept as text[] for draft flexibility.';
