-- ============================================================
-- TABLE: interviews.interview_views
-- User views on interviews — tracks unique view events
-- Schema: interviews
-- Depends on: users.users, interviews.interviews
-- NOTE: user_id nullable — anonymous views are recorded too
-- ============================================================
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
