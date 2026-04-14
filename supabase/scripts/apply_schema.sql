-- ============================================================
-- ByteAI — Full Schema + Seeds (single SQL file)
-- Run this in Supabase SQL editor or via psql:
--   psql $BYTEAI_DB_URL -f supabase/scripts/apply_schema.sql
--
-- Behaviour:
--   - Drops and recreates all schemas (always reflects current state)
--   - Column additions, removals, type changes are automatically picked up
--   - Seeds all lookup tables + system user after schema creation
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Drop schemas in reverse dependency order ──────────────────────────────────
DROP SCHEMA IF EXISTS interviews CASCADE;
DROP SCHEMA IF EXISTS bytes      CASCADE;
DROP SCHEMA IF EXISTS users      CASCADE;
DROP SCHEMA IF EXISTS lookups    CASCADE;

-- ── Recreate schemas ──────────────────────────────────────────────────────────
CREATE SCHEMA lookups;
CREATE SCHEMA users;
CREATE SCHEMA bytes;
CREATE SCHEMA interviews;


-- ============================================================
-- LOOKUPS
-- ============================================================

CREATE TABLE lookups.domains (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    icon        text    NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0
);
COMMENT ON TABLE lookups.domains IS 'Lookup: engineering domains for user onboarding (frontend, backend, devops, ai, etc.)';

CREATE TABLE lookups.seniority_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    icon        text    NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0
);
COMMENT ON TABLE lookups.seniority_types IS 'Lookup: seniority levels for user onboarding';

CREATE TABLE lookups.level_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    level       integer NOT NULL UNIQUE CHECK (level >= 1),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    xp_required integer NOT NULL DEFAULT 0 CHECK (xp_required >= 0),
    icon        text    NOT NULL DEFAULT '⭐'
);
COMMENT ON TABLE lookups.level_types IS 'Lookup: XP level definitions';

CREATE TABLE lookups.badge_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    icon        text    NOT NULL DEFAULT '🏅',
    description text    CHECK (char_length(description) <= 500)
);
COMMENT ON TABLE lookups.badge_types IS 'Lookup: gamification badge definitions';

CREATE TABLE lookups.search_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    description text    CHECK (char_length(description) <= 300),
    sort_order  integer NOT NULL DEFAULT 0
);
COMMENT ON TABLE lookups.search_types IS 'Lookup: searchable content types (bytes, interviews, devs)';

CREATE TABLE lookups.subdomains (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id   uuid    NOT NULL REFERENCES lookups.domains(id) ON DELETE CASCADE,
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order  integer NOT NULL DEFAULT 0
);
CREATE INDEX ix_subdomains_domain_id ON lookups.subdomains (domain_id);
COMMENT ON TABLE lookups.subdomains IS 'Lookup: sub-categories within each engineering domain';

CREATE TABLE lookups.tech_stacks (
    id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain_id uuid    NOT NULL REFERENCES lookups.subdomains(id) ON DELETE CASCADE,
    name         text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label        text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order   integer NOT NULL DEFAULT 0
);
CREATE INDEX ix_tech_stacks_subdomain_id ON lookups.tech_stacks (subdomain_id);
COMMENT ON TABLE lookups.tech_stacks IS 'Lookup: tech stack items grouped by subdomain';

CREATE TABLE lookups.companies (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_companies_name UNIQUE (name)
);
COMMENT ON TABLE lookups.companies IS 'Company lookup for interview posts';

CREATE TABLE lookups.notification_types (
    key       varchar(50)  NOT NULL,
    label     varchar(100) NOT NULL,
    icon_name varchar(50),
    CONSTRAINT pk_notification_types PRIMARY KEY (key)
);
COMMENT ON TABLE lookups.notification_types IS 'Lookup: valid notification types';

CREATE TABLE lookups.role_types (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE,
    label       text        NOT NULL,
    description text
);
CREATE UNIQUE INDEX uq_role_types_name ON lookups.role_types (name);
COMMENT ON TABLE  lookups.role_types      IS 'Definitions for system roles users can be granted.';
COMMENT ON COLUMN lookups.role_types.name IS 'Machine-readable identifier (e.g., ''admin'').';

CREATE TABLE lookups.feature_flag_types (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text        NOT NULL UNIQUE CHECK (char_length(key) BETWEEN 1 AND 100),
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    description text        CHECK (char_length(description) <= 500),
    global_open boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_feature_flag_types_key ON lookups.feature_flag_types (key);
COMMENT ON TABLE  lookups.feature_flag_types             IS 'Runtime feature definitions';
COMMENT ON COLUMN lookups.feature_flag_types.key         IS 'Unique machine-readable key used in code: useFeatureFlag(''key'')';
COMMENT ON COLUMN lookups.feature_flag_types.global_open IS 'When true, the feature is active for all users. When false it requires user_feature_flags.';

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users.users (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id            text        NOT NULL UNIQUE,
    username            text        NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 3 AND 50),
    display_name        text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
    bio                 text        CHECK (char_length(bio) <= 500),
    role_title          text,
    company             text,
    avatar_url          text,
    level               integer     NOT NULL DEFAULT 1 CHECK (level >= 1),
    xp                  integer     NOT NULL DEFAULT 0 CHECK (xp >= 0),
    streak              integer     NOT NULL DEFAULT 0 CHECK (streak >= 0),
    domain              text,
    seniority           text,
    seniority_id        uuid        REFERENCES lookups.seniority_types(id) ON DELETE SET NULL,
    domain_id           uuid        REFERENCES lookups.domains(id) ON DELETE SET NULL,
    level_type_id       uuid        REFERENCES lookups.level_types(id) ON DELETE SET NULL,
    interest_embedding  vector(768),
    is_verified         boolean     NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_clerk_id ON users.users (clerk_id);
CREATE UNIQUE INDEX uq_users_username  ON users.users (username);
CREATE INDEX        ix_users_domain    ON users.users (domain) WHERE domain IS NOT NULL;
COMMENT ON TABLE  users.users                    IS 'Platform users — synced from Clerk via webhook';
COMMENT ON COLUMN users.users.interest_embedding IS '768-dim embedding of user interests for personalised feed ranking';

CREATE TABLE users.user_roles (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    role_type_id  uuid        NOT NULL REFERENCES lookups.role_types(id) ON DELETE CASCADE,
    assigned_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_type_id)
);
CREATE INDEX ix_user_roles_role_type_id ON users.user_roles(role_type_id);
COMMENT ON TABLE users.user_roles IS 'Junction table assigning permissions/roles directly to users.';

CREATE TABLE users.user_feature_flags (
    user_id              uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    feature_flag_type_id uuid        NOT NULL REFERENCES lookups.feature_flag_types(id) ON DELETE CASCADE,
    granted_at           timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, feature_flag_type_id)
);
CREATE INDEX ix_user_feature_flags_feature_flag_type_id ON users.user_feature_flags(feature_flag_type_id);
COMMENT ON TABLE users.user_feature_flags IS 'Junction assigning feature flags to specific users individually';

CREATE TABLE users.userfollowers (
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    follower_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_userfollowers PRIMARY KEY (user_id, follower_id)
);
CREATE INDEX ix_userfollowers_follower_id ON users.userfollowers (follower_id);
COMMENT ON TABLE users.userfollowers IS '"Who follows me": user_id is being followed by follower_id';

CREATE TABLE users.userfollowing (
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    following_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_userfollowing PRIMARY KEY (user_id, following_id)
);
CREATE INDEX ix_userfollowing_following_id ON users.userfollowing (following_id);
COMMENT ON TABLE users.userfollowing IS '"Who I follow": user_id follows following_id';

CREATE TABLE users.usersocials (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    platform    text        NOT NULL CHECK (platform IN ('github', 'linkedin', 'twitter', 'website', 'youtube', 'other')),
    url         text        NOT NULL CHECK (char_length(url) BETWEEN 5 AND 500),
    label       text        CHECK (char_length(label) <= 100),
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_usersocials_user_platform UNIQUE (user_id, platform)
);
CREATE INDEX ix_usersocials_user_id ON users.usersocials (user_id);
COMMENT ON TABLE users.usersocials IS 'User social links (github, linkedin, twitter, website, etc.)';

CREATE TABLE users.user_badges (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    badge_type_id uuid        REFERENCES lookups.badge_types(id) ON DELETE SET NULL,
    badge_type    text        NOT NULL,
    earned_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX        ix_user_badges_user_id   ON users.user_badges (user_id);
CREATE UNIQUE INDEX uq_user_badges_user_type ON users.user_badges (user_id, badge_type);
COMMENT ON TABLE users.user_badges IS 'Gamification badges earned by users';

CREATE TABLE users.user_tech_stacks (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    tech_stack_id uuid        NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_tech_stacks PRIMARY KEY (user_id, tech_stack_id)
);
CREATE INDEX ix_user_tech_stacks_tech_stack_id ON users.user_tech_stacks (tech_stack_id);
COMMENT ON TABLE users.user_tech_stacks IS 'User tech stack selections — normalized junction table';

CREATE TABLE users.user_feed_preferences (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    tech_stack_id uuid        NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_feed_preferences PRIMARY KEY (user_id, tech_stack_id)
);
CREATE INDEX ix_user_feed_preferences_tech_stack_id ON users.user_feed_preferences (tech_stack_id);
COMMENT ON TABLE users.user_feed_preferences IS 'User feed preferences — tech stacks the user wants to see';

CREATE TABLE users.user_preferences (
    user_id           uuid        PRIMARY KEY REFERENCES users.users(id) ON DELETE CASCADE,
    theme             text        NOT NULL DEFAULT 'dark',
    visibility        text        NOT NULL DEFAULT 'public',
    notif_reactions   boolean     NOT NULL DEFAULT true,
    notif_comments    boolean     NOT NULL DEFAULT true,
    notif_followers   boolean     NOT NULL DEFAULT true,
    notif_unfollows   boolean     NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE users.user_preferences IS 'Per-user preferences: theme, profile visibility, and notification toggles';

CREATE TABLE users.notifications (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    type        text        NOT NULL REFERENCES lookups.notification_types(key) ON DELETE RESTRICT,
    payload     jsonb,
    read        boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_notifications_user_id     ON users.notifications (user_id);
CREATE INDEX ix_notifications_user_unread ON users.notifications (user_id) WHERE read = false;
COMMENT ON TABLE users.notifications IS 'In-app notifications — type must exist in notification_types';

CREATE TABLE users.logs (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    level        text        NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error', 'fatal')),
    message      text        NOT NULL,
    exception    text,
    source       text        CHECK (char_length(source) <= 200),
    user_id      uuid,
    request_path text        CHECK (char_length(request_path) <= 500),
    properties   text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_logs_level      ON users.logs (level);
CREATE INDEX ix_logs_created_at ON users.logs (created_at DESC);
CREATE INDEX ix_logs_user_id    ON users.logs (user_id) WHERE user_id IS NOT NULL;
COMMENT ON TABLE users.logs IS 'Application error log — structured events from the backend';


-- ============================================================
-- BYTES
-- ============================================================

CREATE TABLE bytes.bytes (
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
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_bytes_author_id     ON bytes.bytes (author_id);
CREATE INDEX ix_bytes_created_at    ON bytes.bytes (created_at DESC);
CREATE INDEX ix_bytes_search_vector ON bytes.bytes USING GIN (search_vector);
CREATE INDEX ix_bytes_embedding     ON bytes.bytes USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ix_bytes_is_active     ON bytes.bytes (is_active) WHERE is_active = true;
COMMENT ON TABLE  bytes.bytes           IS 'Core content unit — a short tech post';
COMMENT ON COLUMN bytes.bytes.embedding IS '768-dim embedding for semantic/vector search';

CREATE TABLE bytes.byte_tech_stacks (
    byte_id       uuid NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    tech_stack_id uuid NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    CONSTRAINT pk_byte_tech_stacks PRIMARY KEY (byte_id, tech_stack_id)
);
CREATE INDEX ix_byte_tech_stacks_tech_stack_id ON bytes.byte_tech_stacks (tech_stack_id);
COMMENT ON TABLE bytes.byte_tech_stacks IS 'Byte-to-tech-stack tags — normalized junction table';

CREATE TABLE bytes.byte_quality_scores (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    clarity     integer     NOT NULL CHECK (clarity BETWEEN 0 AND 10),
    specificity integer     NOT NULL CHECK (specificity BETWEEN 0 AND 10),
    relevance   integer     NOT NULL CHECK (relevance BETWEEN 0 AND 10),
    overall     integer     NOT NULL CHECK (overall BETWEEN 0 AND 10),
    computed_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_byte_quality_scores PRIMARY KEY (byte_id)
);
COMMENT ON TABLE bytes.byte_quality_scores IS 'AI quality scores per byte — clarity, specificity, relevance, overall (0–10 each)';

CREATE TABLE bytes.comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id   uuid        REFERENCES bytes.comments(id) ON DELETE CASCADE,
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_comments_byte_id   ON bytes.comments (byte_id);
CREATE INDEX ix_comments_author_id ON bytes.comments (author_id);
CREATE INDEX ix_comments_parent_id ON bytes.comments (parent_id) WHERE parent_id IS NOT NULL;
COMMENT ON TABLE bytes.comments IS 'Threaded comments on bytes';

CREATE TABLE bytes.user_likes (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_likes PRIMARY KEY (byte_id, user_id)
);
CREATE INDEX ix_user_likes_user_id ON bytes.user_likes (user_id);
COMMENT ON TABLE bytes.user_likes IS 'One like per user per byte';

CREATE TABLE bytes.user_bookmarks (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_bookmarks PRIMARY KEY (byte_id, user_id)
);
CREATE INDEX ix_user_bookmarks_user_id ON bytes.user_bookmarks (user_id);
COMMENT ON TABLE bytes.user_bookmarks IS 'Saved bytes per user';

CREATE TABLE bytes.user_views (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    viewed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_user_views_byte_id   ON bytes.user_views (byte_id);
CREATE INDEX ix_user_views_user_id   ON bytes.user_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_user_views_viewed_at ON bytes.user_views (viewed_at DESC);
COMMENT ON TABLE bytes.user_views IS 'View events per byte — user_id nullable for anonymous views';

CREATE TABLE bytes.drafts (
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
CREATE INDEX ix_drafts_author_id ON bytes.drafts (author_id);
COMMENT ON TABLE bytes.drafts IS 'Unpublished byte drafts — auto-saved, user-owned';

CREATE TABLE bytes.trending (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id   uuid        NOT NULL,
    content_type text        NOT NULL CHECK (content_type IN ('byte', 'interview')),
    user_id      uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    clicked_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_trending_content    ON bytes.trending (content_id, content_type);
CREATE INDEX ix_trending_clicked_at ON bytes.trending (clicked_at DESC);
CREATE INDEX ix_trending_user_id    ON bytes.trending (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_trending_24h        ON bytes.trending (content_type, clicked_at DESC, content_id);
COMMENT ON TABLE bytes.trending IS 'Click events for trending feed. Aggregate by content_id in past 24h to rank trending';


-- ============================================================
-- INTERVIEWS
-- ============================================================

CREATE TABLE interviews.interviews (
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
CREATE INDEX ix_interviews_author_id     ON interviews.interviews (author_id);
CREATE INDEX ix_interviews_created_at    ON interviews.interviews (created_at DESC);
CREATE INDEX ix_interviews_search_vector ON interviews.interviews USING GIN (search_vector);
CREATE INDEX ix_interviews_embedding     ON interviews.interviews USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ix_interviews_company       ON interviews.interviews (company) WHERE company IS NOT NULL;
CREATE INDEX ix_interviews_is_active     ON interviews.interviews (is_active) WHERE is_active = true;
COMMENT ON TABLE interviews.interviews IS 'Interview experience posts — separate content type from bytes';

CREATE TABLE interviews.interview_tech_stacks (
    interview_id  uuid NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    tech_stack_id uuid NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    CONSTRAINT pk_interview_tech_stacks PRIMARY KEY (interview_id, tech_stack_id)
);
CREATE INDEX ix_interview_tech_stacks_tech_stack_id ON interviews.interview_tech_stacks (tech_stack_id);
COMMENT ON TABLE interviews.interview_tech_stacks IS 'Interview-to-tech-stack tags — normalized junction table';

CREATE TABLE interviews.interview_questions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    question     text        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 2000),
    answer       text        NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 5000),
    order_index  integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_interview_questions_interview_id ON interviews.interview_questions (interview_id);
CREATE INDEX ix_interview_questions_order        ON interviews.interview_questions (interview_id, order_index);
COMMENT ON TABLE interviews.interview_questions IS 'Structured Q&A pairs — each interview has 1-N questions';

CREATE TABLE interviews.interview_comments (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    author_id    uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id    uuid        REFERENCES interviews.interview_comments(id) ON DELETE CASCADE,
    body         text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count   integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_interview_comments_interview_id ON interviews.interview_comments (interview_id);
CREATE INDEX ix_interview_comments_author_id    ON interviews.interview_comments (author_id);
CREATE INDEX ix_interview_comments_parent_id    ON interviews.interview_comments (parent_id) WHERE parent_id IS NOT NULL;
COMMENT ON TABLE interviews.interview_comments IS 'Threaded comments on interviews';

CREATE TABLE interviews.interview_likes (
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_interview_likes PRIMARY KEY (interview_id, user_id)
);
CREATE INDEX ix_interview_likes_user_id ON interviews.interview_likes (user_id);
COMMENT ON TABLE interviews.interview_likes IS 'One like per user per interview';

CREATE TABLE interviews.interview_bookmarks (
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_interview_bookmarks PRIMARY KEY (interview_id, user_id)
);
CREATE INDEX ix_interview_bookmarks_user_id ON interviews.interview_bookmarks (user_id);
COMMENT ON TABLE interviews.interview_bookmarks IS 'User bookmarks on interviews';

CREATE TABLE interviews.interview_views (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    viewed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_interview_views_interview_id ON interviews.interview_views (interview_id);
CREATE INDEX ix_interview_views_user_id      ON interviews.interview_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_interview_views_viewed_at    ON interviews.interview_views (viewed_at DESC);
COMMENT ON TABLE interviews.interview_views IS 'View events per interview — user_id nullable for anonymous views';

CREATE TABLE interviews.interview_question_comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid        NOT NULL REFERENCES interviews.interview_questions(id) ON DELETE CASCADE,
    author_id   uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    parent_id   uuid        REFERENCES interviews.interview_question_comments(id) ON DELETE CASCADE,
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
    vote_count  integer     NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_iq_comments_question_id ON interviews.interview_question_comments (question_id);
CREATE INDEX ix_iq_comments_author_id   ON interviews.interview_question_comments (author_id);
CREATE INDEX ix_iq_comments_parent_id   ON interviews.interview_question_comments (parent_id) WHERE parent_id IS NOT NULL;
COMMENT ON TABLE interviews.interview_question_comments IS 'Threaded comments on individual Q&A pairs';

CREATE TABLE interviews.interview_question_likes (
    question_id uuid        NOT NULL REFERENCES interviews.interview_questions(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_interview_question_likes PRIMARY KEY (question_id, user_id)
);
CREATE INDEX ix_iq_likes_question_id ON interviews.interview_question_likes (question_id);
CREATE INDEX ix_iq_likes_user_id     ON interviews.interview_question_likes (user_id);
COMMENT ON TABLE interviews.interview_question_likes IS 'Per-question likes';


-- ============================================================
-- SEEDS — Lookups
-- ============================================================

INSERT INTO lookups.domains (name, label, icon, sort_order) VALUES
  ('frontend',   'Frontend',           '🎨',  1),
  ('backend',    'Backend',            '🔧',  2),
  ('devops',     'DevOps / Cloud',     '🚀',  3),
  ('mobile',     'Mobile',             '📱',  4),
  ('ai_ml',      'AI / ML',            '🧠',  5),
  ('data',       'Data Engineering',   '📈',  6),
  ('security',   'Security',           '🛡️',  7),
  ('systems',    'Systems / Embedded', '⚡',  8),
  ('blockchain', 'Blockchain / Web3',  '🔗',  9),
  ('gaming',     'Game Development',   '👾', 10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO lookups.seniority_types (name, label, icon, sort_order) VALUES
  ('intern',        'Intern',               '🌱',  1),
  ('junior',        'Junior',               '🔰',  2),
  ('mid',           'Mid-Level',            '⚡',  3),
  ('senior',        'Senior',               '🔥',  4),
  ('staff',         'Staff Engineer',       '🚀',  5),
  ('principal',     'Principal Engineer',   '🏆',  6),
  ('architect',     'Architect',            '🏗️',  7),
  ('distinguished', 'Distinguished Eng',    '⭐',  8),
  ('manager',       'Engineering Manager',  '👥',  9),
  ('director',      'Director of Eng',      '🎯', 10),
  ('vp',            'VP Engineering',       '💎', 11),
  ('cto',           'CTO',                  '🔑', 12)
ON CONFLICT (name) DO NOTHING;

INSERT INTO lookups.level_types (level, name, label, xp_required, icon) VALUES
  (1,  'newcomer',    'Newcomer',    0,     '🌱'),
  (2,  'explorer',    'Explorer',    500,   '🔭'),
  (3,  'contributor', 'Contributor', 1500,  '⚙️'),
  (4,  'builder',     'Builder',     3000,  '🔨'),
  (5,  'craftsman',   'Craftsman',   5000,  '🛠️'),
  (6,  'specialist',  'Specialist',  8000,  '🎯'),
  (7,  'expert',      'Expert',      12000, '🧠'),
  (8,  'mentor',      'Mentor',      18000, '📚'),
  (9,  'authority',   'Authority',   25000, '🏆'),
  (10, 'legend',      'Legend',      35000, '⭐'),
  (11, 'grandmaster', 'Grandmaster', 50000, '👑'),
  (12, 'pioneer',     'Pioneer',     75000, '🚀')
ON CONFLICT (level) DO NOTHING;

INSERT INTO lookups.badge_types (name, label, icon, description) VALUES
  ('first_byte',    'First Byte',    '🥇', 'Posted your first byte'),
  ('byte_streak_7', '7-Day Streak',  '🔥', 'Posted bytes 7 days in a row'),
  ('reactions_100', '100 Reactions', '💡', 'Received 100 total reactions'),
  ('followers_100', '100 Followers', '🌟', 'Reached 100 followers'),
  ('mentor',        'Mentor',        '🧑‍🏫', 'Left 50+ comments helping others'),
  ('early_adopter', 'Early Adopter', '🚀', 'Joined during beta — you were here first')
ON CONFLICT (name) DO NOTHING;

INSERT INTO lookups.search_types (name, label, description, sort_order) VALUES
  ('bytes',      'Bytes',      'Short tech posts and snippets', 1),
  ('interviews', 'Interviews', 'Interview experience posts',    2),
  ('devs',       'Devs',       'Search for developers',         3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO lookups.notification_types (key, label, icon_name) VALUES
  ('like',     'Reaction',      'heart'),
  ('comment',  'Comment',       'message-circle'),
  ('follow',   'New Follower',  'user-plus'),
  ('unfollow', 'Unfollowed',    'user-minus'),
  ('badge',    'Badge Earned',  'award'),
  ('system',   'System Notice', 'bell')
ON CONFLICT (key) DO NOTHING;

INSERT INTO lookups.role_types (name, label, description) VALUES
  ('user', 'Standard User', 'Default platform access assigned upon user registration.'),
  ('admin', 'Administrator', 'Has complete system access including the admin dashboard and feature flags panel.')
ON CONFLICT (name) DO UPDATE SET
label = EXCLUDED.label,
description = EXCLUDED.description;

INSERT INTO lookups.companies (name) VALUES
  ('Google'), ('Meta'), ('Apple'), ('Amazon'), ('Microsoft'), ('Netflix'),
  ('Cloudflare'), ('Snowflake'), ('Databricks'), ('HashiCorp'), ('Datadog'), ('Vercel'), ('Supabase'),
  ('OpenAI'), ('Anthropic'), ('Hugging Face'), ('Mistral AI'), ('Cohere'),
  ('Nvidia'), ('Intel'), ('AMD'), ('Qualcomm'),
  ('Salesforce'), ('Oracle'), ('IBM'), ('ServiceNow'), ('Workday'), ('Palantir'), ('CrowdStrike'), ('Splunk'),
  ('GitHub'), ('GitLab'), ('Atlassian'), ('JetBrains'), ('Linear'), ('Notion'), ('Figma'),
  ('Stripe'), ('Coinbase'), ('Block'), ('PayPal'), ('Robinhood'), ('Plaid'),
  ('Uber'), ('Airbnb'), ('DoorDash'), ('Shopify'), ('Instacart'),
  ('Epic Games'), ('Roblox')
ON CONFLICT (name) DO NOTHING;

INSERT INTO lookups.subdomains (domain_id, name, label, sort_order) VALUES
  ((SELECT id FROM lookups.domains WHERE name = 'frontend'),    'ui_frameworks',   'UI Frameworks',    1),
  ((SELECT id FROM lookups.domains WHERE name = 'frontend'),    'meta_frameworks', 'Meta Frameworks',  2),
  ((SELECT id FROM lookups.domains WHERE name = 'frontend'),    'styling',         'Styling',          3),
  ((SELECT id FROM lookups.domains WHERE name = 'frontend'),    'build_tools',     'Build Tools',      4),
  ((SELECT id FROM lookups.domains WHERE name = 'frontend'),    'fe_testing',      'Testing',          5),
  ((SELECT id FROM lookups.domains WHERE name = 'backend'),     'be_languages',    'Languages',        1),
  ((SELECT id FROM lookups.domains WHERE name = 'backend'),     'be_frameworks',   'Frameworks',       2),
  ((SELECT id FROM lookups.domains WHERE name = 'backend'),     'api_protocols',   'API & Protocols',  3),
  ((SELECT id FROM lookups.domains WHERE name = 'backend'),     'queues_cache',    'Queues & Cache',   4),
  ((SELECT id FROM lookups.domains WHERE name = 'devops'),      'cloud_providers', 'Cloud Providers',  1),
  ((SELECT id FROM lookups.domains WHERE name = 'devops'),      'containers',      'Containers & K8s', 2),
  ((SELECT id FROM lookups.domains WHERE name = 'devops'),      'cicd',            'CI / CD',          3),
  ((SELECT id FROM lookups.domains WHERE name = 'devops'),      'iac',             'IaC',              4),
  ((SELECT id FROM lookups.domains WHERE name = 'devops'),      'observability',   'Observability',    5),
  ((SELECT id FROM lookups.domains WHERE name = 'mobile'),      'ios',             'iOS',              1),
  ((SELECT id FROM lookups.domains WHERE name = 'mobile'),      'android',         'Android',          2),
  ((SELECT id FROM lookups.domains WHERE name = 'mobile'),      'cross_platform',  'Cross-Platform',   3),
  ((SELECT id FROM lookups.domains WHERE name = 'ai_ml'),       'ml_frameworks',   'ML Frameworks',    1),
  ((SELECT id FROM lookups.domains WHERE name = 'ai_ml'),       'nlp_llms',        'NLP & LLMs',       2),
  ((SELECT id FROM lookups.domains WHERE name = 'ai_ml'),       'mlops',           'MLOps',            3),
  ((SELECT id FROM lookups.domains WHERE name = 'ai_ml'),       'data_science',    'Data Science',     4),
  ((SELECT id FROM lookups.domains WHERE name = 'data'),        'data_databases',  'Databases',        1),
  ((SELECT id FROM lookups.domains WHERE name = 'data'),        'data_warehouses', 'Data Warehouses',  2),
  ((SELECT id FROM lookups.domains WHERE name = 'data'),        'data_processing', 'Processing',       3),
  ((SELECT id FROM lookups.domains WHERE name = 'data'),        'data_viz',        'Visualization',    4),
  ((SELECT id FROM lookups.domains WHERE name = 'security'),    'appsec',          'AppSec',           1),
  ((SELECT id FROM lookups.domains WHERE name = 'security'),    'cloud_security',  'Cloud Security',   2),
  ((SELECT id FROM lookups.domains WHERE name = 'security'),    'cryptography',    'Cryptography',     3),
  ((SELECT id FROM lookups.domains WHERE name = 'security'),    'pentesting',      'Pentesting',       4),
  ((SELECT id FROM lookups.domains WHERE name = 'systems'),     'sys_languages',   'Languages',        1),
  ((SELECT id FROM lookups.domains WHERE name = 'systems'),     'embedded',        'Embedded',         2),
  ((SELECT id FROM lookups.domains WHERE name = 'systems'),     'os_kernel',       'OS & Kernel',      3),
  ((SELECT id FROM lookups.domains WHERE name = 'systems'),     'networking',      'Networking',       4),
  ((SELECT id FROM lookups.domains WHERE name = 'blockchain'),  'evm',             'EVM Chains',       1),
  ((SELECT id FROM lookups.domains WHERE name = 'blockchain'),  'non_evm',         'Non-EVM Chains',   2),
  ((SELECT id FROM lookups.domains WHERE name = 'blockchain'),  'web3_tools',      'Web3 Tools',       3),
  ((SELECT id FROM lookups.domains WHERE name = 'blockchain'),  'smart_contracts', 'Smart Contracts',  4),
  ((SELECT id FROM lookups.domains WHERE name = 'gaming'),      'game_engines',    'Game Engines',     1),
  ((SELECT id FROM lookups.domains WHERE name = 'gaming'),      'graphics',        'Graphics APIs',    2),
  ((SELECT id FROM lookups.domains WHERE name = 'gaming'),      'game_languages',  'Languages',        3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO lookups.tech_stacks (subdomain_id, name, label, sort_order) VALUES
  ((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'),   'react',           'React',            1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'),   'vue',             'Vue.js',           2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'),   'angular',         'Angular',          3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'),   'svelte',          'Svelte',           4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'),   'solidjs',         'Solid.js',         5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'),   'qwik',            'Qwik',             6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'nextjs',          'Next.js',          1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'nuxtjs',          'Nuxt.js',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'sveltekit',       'SvelteKit',        3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'astro',           'Astro',            4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'remix',           'Remix',            5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'tanstack_start',  'TanStack Start',   6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'styling'),         'tailwindcss',     'Tailwind CSS',     1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'styling'),         'css_modules',     'CSS Modules',      2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'styling'),         'sass',            'Sass / SCSS',      3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'styling'),         'styled_components','styled-components',4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'styling'),         'shadcn_ui',       'shadcn/ui',        5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'),     'vite',            'Vite',             1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'),     'webpack',         'Webpack',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'),     'esbuild',         'esbuild',          3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'),     'turbopack',       'Turbopack',        4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'),     'rollup',          'Rollup',           5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'),      'playwright',      'Playwright',       1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'),      'cypress',         'Cypress',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'),      'vitest',          'Vitest',           3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'),      'jest',            'Jest',             4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'),      'storybook',       'Storybook',        5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'nodejs',          'Node.js',          1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'python',          'Python',           2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'go',              'Go',               3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'java',            'Java',             4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'rust',            'Rust',             5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'csharp',          'C#',               6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'ruby',            'Ruby',             7),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'php',             'PHP',              8),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'elixir',          'Elixir',           9),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'kotlin_be',       'Kotlin',          10),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'scala',           'Scala',           11),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'bun',             'Bun',             12),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'),    'deno',            'Deno',            13),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'express',         'Express',          1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'fastify',         'Fastify',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'hono',            'Hono',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'fastapi',         'FastAPI',          4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'django',          'Django',           5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'flask',           'Flask',            6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'spring_boot',     'Spring Boot',      7),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'aspnet_core',     'ASP.NET Core',     8),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'gin',             'Gin',              9),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'axum',            'Axum',            10),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'rails',           'Rails',           11),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'phoenix',         'Phoenix',         12),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'nestjs',          'NestJS',          13),
  ((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'),   'fiber',           'Fiber (Go)',       14),
  ((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'),   'rest',            'REST',             1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'),   'graphql',         'GraphQL',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'),   'grpc',            'gRPC',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'),   'trpc',            'tRPC',             4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'),   'websockets',      'WebSockets',       5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'),   'openapi',         'OpenAPI',          6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'),    'redis',           'Redis',            1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'),    'kafka',           'Apache Kafka',     2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'),    'rabbitmq',        'RabbitMQ',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'),    'bullmq',          'BullMQ',           4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'),    'celery',          'Celery',           5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'),    'nats',            'NATS',             6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'aws',             'AWS',              1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'azure',           'Azure',            2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'gcp',             'GCP',              3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'cloudflare',      'Cloudflare',       4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'vercel',          'Vercel',           5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'railway',         'Railway',          6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'fly_io',          'Fly.io',           7),
  ((SELECT id FROM lookups.subdomains WHERE name = 'containers'),      'docker',          'Docker',           1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'containers'),      'kubernetes',      'Kubernetes',       2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'containers'),      'helm',            'Helm',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'containers'),      'podman',          'Podman',           4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'containers'),      'containerd',      'containerd',       5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cicd'),            'github_actions',  'GitHub Actions',   1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cicd'),            'gitlab_ci',       'GitLab CI',        2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cicd'),            'argocd',          'ArgoCD',           3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cicd'),            'jenkins',         'Jenkins',          4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cicd'),            'circleci',        'CircleCI',         5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'iac'),             'terraform',       'Terraform',        1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'iac'),             'bicep',           'Bicep',            2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'iac'),             'pulumi',          'Pulumi',           3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'iac'),             'ansible',         'Ansible',          4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'iac'),             'cdk',             'AWS CDK',          5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'observability'),   'prometheus',      'Prometheus',       1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'observability'),   'grafana',         'Grafana',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'observability'),   'datadog',         'Datadog',          3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'observability'),   'sentry',          'Sentry',           4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'observability'),   'opentelemetry',   'OpenTelemetry',    5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'observability'),   'new_relic',       'New Relic',        6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ios'),             'swift',           'Swift',            1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ios'),             'swiftui',         'SwiftUI',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ios'),             'uikit',           'UIKit',            3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ios'),             'xcode',           'Xcode',            4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'android'),         'kotlin',          'Kotlin',           1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'android'),         'jetpack_compose', 'Jetpack Compose',  2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'android'),         'android_sdk',     'Android SDK',      3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'),  'react_native',    'React Native',     1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'),  'flutter',         'Flutter',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'),  'expo',            'Expo',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'),  'ionic',           'Ionic',            4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'),  'capacitor',       'Capacitor',        5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'),   'pytorch',         'PyTorch',          1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'),   'tensorflow',      'TensorFlow',       2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'),   'jax',             'JAX',              3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'),   'keras',           'Keras',            4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'),   'scikit_learn',    'scikit-learn',     5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'),   'xgboost',         'XGBoost',          6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'huggingface',     'Hugging Face',     1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'langchain',       'LangChain',        2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'llamaindex',      'LlamaIndex',       3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'openai_api',      'OpenAI API',       4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'anthropic_api',   'Anthropic API',    5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'groq',            'Groq',             6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'),        'ollama',          'Ollama',           7),
  ((SELECT id FROM lookups.subdomains WHERE name = 'mlops'),           'mlflow',          'MLflow',           1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'mlops'),           'wandb',           'Weights & Biases', 2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'mlops'),           'dvc',             'DVC',              3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'mlops'),           'onnx',            'ONNX',             4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'mlops'),           'tensorrt',        'TensorRT',         5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'mlops'),           'ray',             'Ray',              6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_science'),    'pandas',          'Pandas',           1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_science'),    'numpy',           'NumPy',            2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_science'),    'polars',          'Polars',           3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_science'),    'jupyter',         'Jupyter',          4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_science'),    'matplotlib',      'Matplotlib',       5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_science'),    'seaborn',         'Seaborn',          6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'),  'postgresql_de',   'PostgreSQL',       1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'),  'cassandra',       'Cassandra',        2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'),  'dynamodb',        'DynamoDB',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'),  'elasticsearch',   'Elasticsearch',    4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'),  'clickhouse',      'ClickHouse',       5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'),  'timescaledb',     'TimescaleDB',      6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'snowflake',       'Snowflake',        1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'bigquery',        'BigQuery',         2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'redshift',        'Redshift',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'databricks',      'Databricks',       4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'spark',           'Apache Spark',     1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'flink',           'Apache Flink',     2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'dbt',             'dbt',              3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'airflow',         'Apache Airflow',   4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'prefect',         'Prefect',          5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'dagster',         'Dagster',          6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'),        'tableau',         'Tableau',          1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'),        'looker',          'Looker',           2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'),        'metabase',        'Metabase',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'),        'superset',        'Apache Superset',  4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'),        'grafana_de',      'Grafana',          5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'appsec'),          'owasp',           'OWASP',            1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'appsec'),          'burp_suite',      'Burp Suite',       2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'appsec'),          'snyk',            'Snyk',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'appsec'),          'sonarqube',       'SonarQube',        4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'appsec'),          'semgrep',         'Semgrep',          5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'),  'iam',             'IAM',              1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'),  'zero_trust',      'Zero Trust',       2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'),  'vault',           'HashiCorp Vault',  3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'),  'waf',             'WAF',              4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'),    'tls_ssl',         'TLS / SSL',        1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'),    'jwt',             'JWT',              2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'),    'oauth2',          'OAuth 2.0',        3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'),    'oidc',            'OpenID Connect',   4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'),      'metasploit',      'Metasploit',       1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'),      'nmap',            'Nmap',             2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'),      'wireshark',       'Wireshark',        3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'),      'kali_linux',      'Kali Linux',       4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'),   'c',               'C',                1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'),   'cpp',             'C++',              2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'),   'rust_sys',        'Rust',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'),   'assembly',        'Assembly',         4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'),   'zig',             'Zig',              5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'embedded'),        'arduino',         'Arduino',          1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'embedded'),        'freertos',        'FreeRTOS',         2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'embedded'),        'zephyr',          'Zephyr RTOS',      3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'embedded'),        'raspberry_pi',    'Raspberry Pi',     4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'embedded'),        'esp32',           'ESP32',            5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'),       'linux_kernel',    'Linux Kernel',     1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'),       'ebpf',            'eBPF',             2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'),       'freebsd',         'FreeBSD',          3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'),       'wasm',            'WebAssembly',      4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'networking'),      'tcp_ip',          'TCP / IP',         1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'networking'),      'quic',            'QUIC',             2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'networking'),      'dpdk',            'DPDK',             3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'evm'),             'ethereum',        'Ethereum',         1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'evm'),             'polygon',         'Polygon',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'evm'),             'arbitrum',        'Arbitrum',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'evm'),             'optimism',        'Optimism',         4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'evm'),             'base',            'Base',             5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'),         'solana',          'Solana',           1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'),         'bitcoin',         'Bitcoin',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'),         'polkadot',        'Polkadot',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'),         'cosmos',          'Cosmos',           4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'),      'ipfs',            'IPFS',             1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'),      'the_graph',       'The Graph',        2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'),      'wagmi',           'wagmi',            3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'),      'ethers_js',       'ethers.js',        4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'),      'viem',            'viem',             5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'solidity',        'Solidity',         1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'hardhat',         'Hardhat',          2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'foundry',         'Foundry',          3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'vyper',           'Vyper',            4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'),    'unity',           'Unity',            1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'),    'unreal',          'Unreal Engine',    2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'),    'godot',           'Godot',            3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'),    'bevy',            'Bevy',             4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'),    'pygame',          'pygame',           5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'graphics'),        'opengl',          'OpenGL',           1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'graphics'),        'vulkan',          'Vulkan',           2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'graphics'),        'webgl',           'WebGL',            3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'graphics'),        'metal',           'Metal',            4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'graphics'),        'directx',         'DirectX',          5),
  ((SELECT id FROM lookups.subdomains WHERE name = 'graphics'),        'webgpu',          'WebGPU',           6),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'),  'csharp_game',     'C#',               1),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'),  'cpp_game',        'C++',              2),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'),  'gdscript',        'GDScript',         3),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'),  'lua',             'Lua',              4),
  ((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'),  'blueprint',       'Blueprint',        5)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- SEEDS — System User
-- ============================================================

INSERT INTO users.users (
    id, clerk_id, username, display_name, bio,
    role_title, company, avatar_url,
    level, xp, streak, is_verified, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'seed_system',
    'byteai',
    'ByteAI',
    'Official ByteAI content — curated technical bytes across every domain.',
    'Content System',
    'ByteAI',
    'https://api.dicebear.com/7.x/bottts/svg?seed=byteai',
    99, 999999, 0, true, now(), now()
) ON CONFLICT (clerk_id) DO NOTHING;
