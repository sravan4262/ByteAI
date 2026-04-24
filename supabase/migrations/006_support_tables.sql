-- ============================================================
-- Migration 006: Support Tables
-- Depends on: 003_users_tables
-- ============================================================

CREATE SCHEMA IF NOT EXISTS support;

-- support.feedback
CREATE TABLE IF NOT EXISTS support.feedback (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        REFERENCES users.users(id) ON DELETE SET NULL,
    type         TEXT        NOT NULL CHECK (type IN ('good', 'bad', 'idea')),
    message      TEXT        NOT NULL CHECK (char_length(message) BETWEEN 5 AND 1000),
    page_context TEXT,
    status       TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open', 'reviewed', 'closed')),
    admin_note   TEXT        CHECK (char_length(admin_note) <= 500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_feedback_user_id ON support.feedback(user_id);
CREATE INDEX IF NOT EXISTS ix_feedback_type    ON support.feedback(type);
CREATE INDEX IF NOT EXISTS ix_feedback_status  ON support.feedback(status);
CREATE INDEX IF NOT EXISTS ix_feedback_created ON support.feedback(created_at DESC);

COMMENT ON TABLE support.feedback IS 'User-submitted app feedback — positive, negative, or feature ideas';
COMMENT ON COLUMN support.feedback.type IS 'good | bad | idea';
COMMENT ON COLUMN support.feedback.status IS 'open | reviewed | closed — managed by admin';
COMMENT ON COLUMN support.feedback.admin_note IS 'Optional admin message shown to user via notification when status changes';

-- ── Notification type seed ──────────────────────────────────────────────────
INSERT INTO users.notification_types (key, label, icon_name)
VALUES ('feedback_update', 'Feedback Update', 'message-square')
ON CONFLICT (key) DO NOTHING;
