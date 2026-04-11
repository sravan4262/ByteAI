-- ============================================================
-- Migration 002: Add interview questions, question comments, question likes
-- Run: psql $BYTEAI_DB_URL -f supabase/migrations/002_add_interview_questions.sql
-- ============================================================

-- ── interview_questions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews.interview_questions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    question     text        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 1000),
    answer       text        NOT NULL,
    order_index  integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_interview_questions_interview_id ON interviews.interview_questions (interview_id);
CREATE INDEX IF NOT EXISTS ix_interview_questions_order        ON interviews.interview_questions (interview_id, order_index);

-- ── interview_question_comments ──────────────────────────────────────────────
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

-- ── interview_question_likes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews.interview_question_likes (
    question_id uuid        NOT NULL REFERENCES interviews.interview_questions(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_interview_question_likes PRIMARY KEY (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_iq_likes_question_id ON interviews.interview_question_likes (question_id);
