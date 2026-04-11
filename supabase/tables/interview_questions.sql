-- ============================================================
-- TABLE: interviews.interview_questions
-- Structured Q&A pairs belonging to an interview post
-- Schema: interviews
-- Depends on: interviews.interviews
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interview_questions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    question     text        NOT NULL CHECK (char_length(question) BETWEEN 1 AND 2000),
    answer       text        NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 5000),
    order_index  integer     NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_interview_questions_interview_id ON interviews.interview_questions (interview_id);
CREATE INDEX IF NOT EXISTS ix_interview_questions_order       ON interviews.interview_questions (interview_id, order_index);

COMMENT ON TABLE interviews.interview_questions IS 'Structured Q&A pairs — each interview has 1-N questions with ordered answers';
