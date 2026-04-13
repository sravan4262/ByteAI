-- ============================================================
-- TABLE: interviews.interview_question_comments
-- Threaded comments on individual interview questions
-- Schema: interviews
-- Depends on: users.users, interviews.interview_questions
-- ============================================================
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
