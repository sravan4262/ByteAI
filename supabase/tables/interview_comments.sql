-- ============================================================
-- TABLE: interviews.interview_comments
-- Threaded comments on interviews
-- Schema: interviews
-- Depends on: users.users, interviews.interviews
-- ============================================================
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
