-- ============================================================
-- Migration 004: Bytes Tables
-- Depends on: 002_lookups_tables, 003_users_tables
-- ============================================================

-- bytes.bytes
CREATE TABLE IF NOT EXISTS bytes.bytes (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    title         text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    body          text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
    code_snippet  text        CHECK (char_length(code_snippet) <= 10000),
    language      text        CHECK (char_length(language) <= 50),
    embedding     vector(768),
    search_vector tsvector    GENERATED ALWAYS AS (
                      to_tsvector('english'::regconfig,
                          coalesce(title, '') || ' ' || coalesce(body, ''))
                  ) STORED,
    type          text        NOT NULL DEFAULT 'article'
                              CHECK (type IN ('article', 'tutorial', 'snippet', 'discussion')),
    is_active     boolean     NOT NULL DEFAULT true,
    -- is_hidden: moderation/ban-driven hide. Distinct from is_active (user soft-delete)
    -- so unbanning doesn't accidentally restore content the user themselves removed.
    -- Reads filter `is_active AND NOT is_hidden`.
    is_hidden     boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bytes_author_id     ON bytes.bytes (author_id);
CREATE INDEX IF NOT EXISTS ix_bytes_created_at    ON bytes.bytes (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_bytes_search_vector ON bytes.bytes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS ix_bytes_embedding     ON bytes.bytes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS ix_bytes_is_active     ON bytes.bytes (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS ix_bytes_is_hidden     ON bytes.bytes (is_hidden) WHERE is_hidden = false;
COMMENT ON TABLE  bytes.bytes           IS 'Core content unit — a short tech post';
COMMENT ON COLUMN bytes.bytes.embedding IS '768-dim embedding for semantic/vector search';
COMMENT ON COLUMN bytes.bytes.is_active IS 'Soft-delete flag';
COMMENT ON COLUMN bytes.bytes.is_hidden IS 'True when hidden by moderation/ban. Distinct from is_active (user soft-delete).';

-- bytes.comments
-- parent_id uses ON DELETE SET NULL so hard-deleting a banned user's comments
-- doesn't cascade-delete other users' replies underneath them. Replies become
-- flat root-level comments instead of disappearing.
CREATE TABLE IF NOT EXISTS bytes.comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id   uuid        REFERENCES bytes.comments(id) ON DELETE SET NULL,
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_comments_byte_id   ON bytes.comments (byte_id);
CREATE INDEX IF NOT EXISTS ix_comments_author_id ON bytes.comments (author_id);
CREATE INDEX IF NOT EXISTS ix_comments_parent_id ON bytes.comments (parent_id) WHERE parent_id IS NOT NULL;
COMMENT ON TABLE bytes.comments IS 'Threaded comments on bytes';

-- bytes.user_likes
CREATE TABLE IF NOT EXISTS bytes.user_likes (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_likes PRIMARY KEY (byte_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_user_likes_user_id ON bytes.user_likes (user_id);
COMMENT ON TABLE bytes.user_likes IS 'One like per user per byte';

-- bytes.user_bookmarks
CREATE TABLE IF NOT EXISTS bytes.user_bookmarks (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_bookmarks PRIMARY KEY (byte_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_user_bookmarks_user_id ON bytes.user_bookmarks (user_id);
COMMENT ON TABLE bytes.user_bookmarks IS 'Saved bytes per user';

-- bytes.user_views
CREATE TABLE IF NOT EXISTS bytes.user_views (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    viewed_at   timestamptz NOT NULL DEFAULT now(),
    dwell_ms    int
);
CREATE INDEX IF NOT EXISTS ix_user_views_byte_id   ON bytes.user_views (byte_id);
CREATE INDEX IF NOT EXISTS ix_user_views_user_id   ON bytes.user_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_user_views_viewed_at ON bytes.user_views (viewed_at DESC);
COMMENT ON TABLE bytes.user_views IS 'View events per byte — user_id nullable for anonymous views';

-- bytes.byte_tech_stacks
CREATE TABLE IF NOT EXISTS bytes.byte_tech_stacks (
    byte_id       uuid NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    tech_stack_id uuid NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    CONSTRAINT pk_byte_tech_stacks PRIMARY KEY (byte_id, tech_stack_id)
);
CREATE INDEX IF NOT EXISTS ix_byte_tech_stacks_tech_stack_id ON bytes.byte_tech_stacks (tech_stack_id);
COMMENT ON TABLE bytes.byte_tech_stacks IS 'Byte-to-tech-stack tags — normalized junction table';

-- bytes.byte_quality_scores
CREATE TABLE IF NOT EXISTS bytes.byte_quality_scores (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    clarity     integer     NOT NULL CHECK (clarity BETWEEN 0 AND 10),
    specificity integer     NOT NULL CHECK (specificity BETWEEN 0 AND 10),
    relevance   integer     NOT NULL CHECK (relevance BETWEEN 0 AND 10),
    overall     integer     NOT NULL CHECK (overall BETWEEN 0 AND 10),
    computed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_byte_quality_scores PRIMARY KEY (byte_id)
);
COMMENT ON TABLE bytes.byte_quality_scores IS 'AI quality scores per byte — clarity, specificity, relevance, overall (0–10)';

-- bytes.drafts
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
COMMENT ON TABLE bytes.drafts IS 'Unpublished byte drafts — auto-saved, user-owned.';

