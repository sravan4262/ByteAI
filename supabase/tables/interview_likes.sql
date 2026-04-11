-- ============================================================
-- TABLE: interviews.interview_likes
-- User likes on interviews — composite PK prevents duplicates
-- Schema: interviews
-- Depends on: users.users, interviews.interviews
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interview_likes (
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_interview_likes PRIMARY KEY (interview_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_interview_likes_user_id ON interviews.interview_likes (user_id);

COMMENT ON TABLE interviews.interview_likes IS 'One like per user per interview — composite PK enforces uniqueness';
