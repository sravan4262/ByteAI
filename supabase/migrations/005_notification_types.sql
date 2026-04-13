-- ============================================================
-- MIGRATION: 005_notification_types
-- Creates notification_types lookup table and adds FK from
-- users.notifications.type → users.notification_types.key.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Create the lookup table
CREATE TABLE IF NOT EXISTS users.notification_types (
    key       varchar(50)  PRIMARY KEY,
    label     varchar(100) NOT NULL,
    icon_name varchar(50)
);

-- 2. Seed rows (upsert so re-runs are safe)
INSERT INTO users.notification_types (key, label, icon_name) VALUES
    ('like',    'Like',    'heart'),
    ('comment', 'Comment', 'message-circle'),
    ('follow',  'Follow',  'user-plus'),
    ('badge',   'Badge',   'award')
ON CONFLICT (key) DO UPDATE
    SET label     = EXCLUDED.label,
        icon_name = EXCLUDED.icon_name;

-- 3. Add FK on notifications.type (only if not already present)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'users'
          AND table_name   = 'notifications'
          AND constraint_name = 'fk_notifications_type'
    ) THEN
        ALTER TABLE users.notifications
            ADD CONSTRAINT fk_notifications_type
            FOREIGN KEY (type)
            REFERENCES users.notification_types(key)
            ON DELETE RESTRICT;
    END IF;
END $$;
