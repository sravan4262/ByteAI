-- ============================================================
-- TABLE: users.notification_types
-- Lookup table for notification type definitions
-- Schema: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.notification_types (
    key       varchar(50)  NOT NULL,
    label     varchar(100) NOT NULL,
    icon_name varchar(50),

    CONSTRAINT pk_notification_types PRIMARY KEY (key)
);

COMMENT ON TABLE users.notification_types IS 'Lookup: valid notification types (like, comment, follow, unfollow, badge, system)';
