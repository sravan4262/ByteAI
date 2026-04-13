-- ============================================================
-- TABLE: users.notifications
-- In-app notifications for users
-- Schema: users
-- Depends on: users.users, users.notification_types
-- ============================================================
CREATE TABLE IF NOT EXISTS users.notifications (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    type        text        NOT NULL REFERENCES users.notification_types(key) ON DELETE RESTRICT,
    payload     jsonb,
    read        boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_id     ON users.notifications (user_id);
CREATE INDEX IF NOT EXISTS ix_notifications_user_unread ON users.notifications (user_id) WHERE read = false;

COMMENT ON TABLE  users.notifications         IS 'In-app notifications — type must exist in notification_types';
COMMENT ON COLUMN users.notifications.payload IS 'nullable jsonb payload — varies by type (e.g. { byteId, actorId, actorName })';
