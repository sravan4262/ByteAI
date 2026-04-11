-- ============================================================
-- TABLE: interviews.interview_question_likes
-- Per-question likes — composite PK prevents duplicate likes
-- Schema: interviews
-- Depends on: users.users, interviews.interview_questions
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interview_question_likes (
    question_id uuid        NOT NULL REFERENCES interviews.interview_questions(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_interview_question_likes PRIMARY KEY (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_iql_user_id     ON interviews.interview_question_likes (user_id);
CREATE INDEX IF NOT EXISTS ix_iql_question_id ON interviews.interview_question_likes (question_id);

COMMENT ON TABLE interviews.interview_question_likes IS 'Per-question likes — composite PK (question_id, user_id) prevents duplicate likes';
