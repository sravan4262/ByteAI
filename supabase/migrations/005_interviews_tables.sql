-- ============================================================
-- Migration 005: Interviews Tables
-- Depends on: 002_lookups_tables, 003_users_tables
-- ============================================================

-- interviews.companies
CREATE TABLE IF NOT EXISTS interviews.companies (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_companies_name UNIQUE (name)
);
COMMENT ON TABLE interviews.companies IS 'Company lookup for interview posts';

-- interviews.roles
CREATE TABLE IF NOT EXISTS interviews.roles (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_roles_name UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS ix_interview_roles_name ON interviews.roles (lower(name));
COMMENT ON TABLE interviews.roles IS 'Role lookup for interview posts — populated automatically on interview creation';

-- interviews.locations
CREATE TABLE IF NOT EXISTS interviews.locations (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    country     text        NOT NULL DEFAULT 'United States',
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_locations_name UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS ix_interview_locations_name ON interviews.locations (lower(name));
COMMENT ON TABLE interviews.locations IS 'Location lookup — seeded with major tech hubs, grows automatically on interview creation';

-- interviews.interviews
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
    is_anonymous  boolean     NOT NULL DEFAULT false,
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

-- interviews.interview_questions
CREATE TABLE IF NOT EXISTS interviews.interview_questions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    question     text        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 2000),
    answer       text        NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 5000),
    order_index  integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_interview_questions_interview_id ON interviews.interview_questions (interview_id);
CREATE INDEX IF NOT EXISTS ix_interview_questions_order        ON interviews.interview_questions (interview_id, order_index);
COMMENT ON TABLE interviews.interview_questions IS 'Structured Q&A pairs — each interview has 1-N questions with ordered answers';

-- interviews.interview_likes
CREATE TABLE IF NOT EXISTS interviews.interview_likes (
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_interview_likes PRIMARY KEY (interview_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_interview_likes_user_id ON interviews.interview_likes (user_id);
COMMENT ON TABLE interviews.interview_likes IS 'One like per user per interview';

-- interviews.interview_bookmarks
CREATE TABLE IF NOT EXISTS interviews.interview_bookmarks (
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_interview_bookmarks PRIMARY KEY (interview_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_interview_bookmarks_user_id ON interviews.interview_bookmarks (user_id);
COMMENT ON TABLE interviews.interview_bookmarks IS 'User bookmarks on interviews';

-- interviews.interview_views
CREATE TABLE IF NOT EXISTS interviews.interview_views (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    viewed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_interview_views_interview_id ON interviews.interview_views (interview_id);
CREATE INDEX IF NOT EXISTS ix_interview_views_user_id      ON interviews.interview_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_interview_views_viewed_at    ON interviews.interview_views (viewed_at DESC);
COMMENT ON TABLE interviews.interview_views IS 'View events per interview — user_id nullable for anonymous views';

-- interviews.interview_comments
CREATE TABLE IF NOT EXISTS interviews.interview_comments (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    author_id    uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id    uuid        REFERENCES interviews.interview_comments(id) ON DELETE CASCADE,
    body         text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count   integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_interview_comments_interview_id ON interviews.interview_comments (interview_id);
CREATE INDEX IF NOT EXISTS ix_interview_comments_author_id    ON interviews.interview_comments (author_id);
CREATE INDEX IF NOT EXISTS ix_interview_comments_parent_id    ON interviews.interview_comments (parent_id) WHERE parent_id IS NOT NULL;
COMMENT ON TABLE interviews.interview_comments IS 'Threaded comments on interviews';

-- interviews.interview_question_likes
CREATE TABLE IF NOT EXISTS interviews.interview_question_likes (
    question_id uuid        NOT NULL REFERENCES interviews.interview_questions(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_interview_question_likes PRIMARY KEY (question_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_iq_likes_question_id ON interviews.interview_question_likes (question_id);
CREATE INDEX IF NOT EXISTS ix_iq_likes_user_id     ON interviews.interview_question_likes (user_id);
COMMENT ON TABLE interviews.interview_question_likes IS 'Per-question likes — composite PK prevents duplicates';

-- interviews.interview_question_comments
CREATE TABLE IF NOT EXISTS interviews.interview_question_comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid        NOT NULL REFERENCES interviews.interview_questions(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id   uuid        REFERENCES interviews.interview_question_comments(id) ON DELETE CASCADE,
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_iq_comments_question_id ON interviews.interview_question_comments (question_id);
CREATE INDEX IF NOT EXISTS ix_iq_comments_author_id   ON interviews.interview_question_comments (author_id);
CREATE INDEX IF NOT EXISTS ix_iq_comments_parent_id   ON interviews.interview_question_comments (parent_id) WHERE parent_id IS NOT NULL;
COMMENT ON TABLE interviews.interview_question_comments IS 'Threaded comments on individual Q&A pairs within an interview post';

-- interviews.interview_tech_stacks
CREATE TABLE IF NOT EXISTS interviews.interview_tech_stacks (
    interview_id  uuid NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    tech_stack_id uuid NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    CONSTRAINT pk_interview_tech_stacks PRIMARY KEY (interview_id, tech_stack_id)
);
CREATE INDEX IF NOT EXISTS ix_interview_tech_stacks_tech_stack_id ON interviews.interview_tech_stacks (tech_stack_id);
COMMENT ON TABLE interviews.interview_tech_stacks IS 'Interview-to-tech-stack tags — normalized junction table';

-- interviews.interview_locations
CREATE TABLE IF NOT EXISTS interviews.interview_locations (
    interview_id  uuid NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    location_id   uuid NOT NULL REFERENCES interviews.locations(id)  ON DELETE CASCADE,
    PRIMARY KEY (interview_id, location_id)
);
CREATE INDEX IF NOT EXISTS ix_interview_locations_location_id ON interviews.interview_locations (location_id);
COMMENT ON TABLE interviews.interview_locations IS 'Maps interviews to locations';
