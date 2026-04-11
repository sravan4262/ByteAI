-- ============================================================
-- TABLE: interviews.interview_bookmarks
-- User bookmarks on interviews — composite PK prevents duplicates
-- Schema: interviews
-- Depends on: users.users, interviews.interviews
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interview_bookmarks (
    interview_id uuid        NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_interview_bookmarks PRIMARY KEY (interview_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_interview_bookmarks_user_id ON interviews.interview_bookmarks (user_id);

COMMENT ON TABLE interviews.interview_bookmarks IS 'User bookmarks on interviews — one per user per interview';
