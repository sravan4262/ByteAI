-- ============================================================
-- Migration 003: Users Tables
-- Depends on: 002_lookups_tables
-- ============================================================

-- users.notification_types (lookup — lives in users schema)
CREATE TABLE IF NOT EXISTS users.notification_types (
    key       varchar(50)  NOT NULL,
    label     varchar(100) NOT NULL,
    icon_name varchar(50),
    CONSTRAINT pk_notification_types PRIMARY KEY (key)
);
COMMENT ON TABLE users.notification_types IS 'Lookup: valid notification types (like, comment, follow, badge, system)';

-- users.users
CREATE TABLE IF NOT EXISTS users.users (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_user_id    uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email               text        UNIQUE CHECK (char_length(email) <= 320),
    username            text        NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 3 AND 50),
    display_name        text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
    bio                 text        CHECK (char_length(bio) <= 500),
    role_title          text,
    company             text,
    avatar_url          text,
    level               integer     NOT NULL DEFAULT 1 CHECK (level >= 1),
    xp                  integer     NOT NULL DEFAULT 0 CHECK (xp >= 0),
    streak              integer     NOT NULL DEFAULT 0 CHECK (streak >= 0),
    domain              text,
    seniority           text,
    seniority_id        uuid        REFERENCES lookups.seniority_types(id) ON DELETE SET NULL,
    domain_id           uuid        REFERENCES lookups.domains(id) ON DELETE SET NULL,
    level_type_id       uuid        REFERENCES lookups.level_types(id) ON DELETE SET NULL,
    interest_embedding  vector(768),
    is_onboarded        boolean     NOT NULL DEFAULT false,
    is_verified         boolean     NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_supabase_user_id ON users.users (supabase_user_id) WHERE supabase_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username         ON users.users (username);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email            ON users.users (email) WHERE email IS NOT NULL;
CREATE INDEX        IF NOT EXISTS ix_users_domain           ON users.users (domain) WHERE domain IS NOT NULL;
COMMENT ON TABLE  users.users                    IS 'Platform users — provisioned via POST /auth/provision after Supabase OAuth';
COMMENT ON COLUMN users.users.supabase_user_id  IS 'FK to auth.users.id — NULL only for internal system users (e.g. seed user)';
COMMENT ON COLUMN users.users.interest_embedding IS '768-dim embedding of user interests for personalised feed ranking';

-- users.userfollowers
CREATE TABLE IF NOT EXISTS users.userfollowers (
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    follower_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_userfollowers PRIMARY KEY (user_id, follower_id)
);
CREATE INDEX IF NOT EXISTS ix_userfollowers_follower_id ON users.userfollowers (follower_id);
COMMENT ON TABLE users.userfollowers IS '"Who follows me": user_id is being followed by follower_id';

-- users.userfollowing
CREATE TABLE IF NOT EXISTS users.userfollowing (
    user_id      uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    following_id uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_userfollowing PRIMARY KEY (user_id, following_id)
);
CREATE INDEX IF NOT EXISTS ix_userfollowing_following_id ON users.userfollowing (following_id);
COMMENT ON TABLE users.userfollowing IS '"Who I follow": user_id follows following_id';

-- users.usersocials
CREATE TABLE IF NOT EXISTS users.usersocials (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    platform    text        NOT NULL CHECK (platform IN ('github', 'linkedin', 'twitter', 'website', 'youtube', 'other')),
    url         text        NOT NULL CHECK (char_length(url) BETWEEN 5 AND 500),
    label       text        CHECK (char_length(label) <= 100),
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_usersocials_user_platform UNIQUE (user_id, platform)
);
CREATE INDEX IF NOT EXISTS ix_usersocials_user_id ON users.usersocials (user_id);
COMMENT ON TABLE users.usersocials IS 'User social links (github, linkedin, twitter, website, etc.)';

-- users.notifications
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
COMMENT ON TABLE users.notifications IS 'In-app notifications — type must exist in notification_types';

-- users.user_badges
CREATE TABLE IF NOT EXISTS users.user_badges (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    badge_type_id uuid        REFERENCES lookups.badge_types(id) ON DELETE SET NULL,
    badge_type    text        NOT NULL,
    earned_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX        IF NOT EXISTS ix_user_badges_user_id   ON users.user_badges (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_badges_user_type ON users.user_badges (user_id, badge_type);
COMMENT ON TABLE users.user_badges IS 'Gamification badges earned by users';

-- users.user_preferences
CREATE TABLE IF NOT EXISTS users.user_preferences (
    user_id           uuid        PRIMARY KEY REFERENCES users.users(id) ON DELETE CASCADE,
    theme             text        NOT NULL DEFAULT 'dark',
    visibility        text        NOT NULL DEFAULT 'public',
    notif_reactions   boolean     NOT NULL DEFAULT true,
    notif_comments    boolean     NOT NULL DEFAULT true,
    notif_followers   boolean     NOT NULL DEFAULT true,
    notif_unfollows   boolean     NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE users.user_preferences IS 'Per-user preferences: theme, profile visibility, and notification toggles.';

-- users.user_roles
CREATE TABLE IF NOT EXISTS users.user_roles (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    role_type_id  uuid        NOT NULL REFERENCES lookups.role_types(id) ON DELETE CASCADE,
    assigned_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_type_id)
);
CREATE INDEX IF NOT EXISTS ix_user_roles_role_type_id ON users.user_roles (role_type_id);
COMMENT ON TABLE users.user_roles IS 'Junction table assigning permissions/roles directly to users.';

-- users.user_tech_stacks
CREATE TABLE IF NOT EXISTS users.user_tech_stacks (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    tech_stack_id uuid        NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pk_user_tech_stacks PRIMARY KEY (user_id, tech_stack_id)
);
CREATE INDEX IF NOT EXISTS ix_user_tech_stacks_tech_stack_id ON users.user_tech_stacks (tech_stack_id);
COMMENT ON TABLE users.user_tech_stacks IS 'User tech stack selections — normalized junction table';

-- users.user_feature_flags
CREATE TABLE IF NOT EXISTS users.user_feature_flags (
    user_id              uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    feature_flag_type_id uuid        NOT NULL REFERENCES lookups.feature_flag_types(id) ON DELETE CASCADE,
    granted_at           timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, feature_flag_type_id)
);
CREATE INDEX IF NOT EXISTS ix_user_feature_flags_feature_flag_type_id ON users.user_feature_flags (feature_flag_type_id);
COMMENT ON TABLE users.user_feature_flags IS 'Junction assigning feature flags to specific users individually';

-- users.user_xp_log
CREATE TABLE IF NOT EXISTS users.user_xp_log (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    action_name text        NOT NULL CHECK (char_length(action_name) BETWEEN 1 AND 100),
    xp_amount   integer     NOT NULL CHECK (xp_amount > 0),
    awarded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_user_xp_log_user_action ON users.user_xp_log (user_id, action_name);
CREATE INDEX IF NOT EXISTS ix_user_xp_log_awarded_at  ON users.user_xp_log (awarded_at);
COMMENT ON TABLE  users.user_xp_log             IS 'Audit log of XP awards.';
COMMENT ON COLUMN users.user_xp_log.action_name IS 'Matches lookups.xp_action_types.name.';

-- users.logs
CREATE TABLE IF NOT EXISTS users.logs (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    level        text        NOT NULL CHECK (level IN ('trace', 'debug', 'info', 'warn', 'error', 'fatal')),
    message      text        NOT NULL,
    exception    text,
    source       text        CHECK (char_length(source) <= 200),
    user_id      uuid,
    request_path text        CHECK (char_length(request_path) <= 500),
    properties   text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_logs_level      ON users.logs (level);
CREATE INDEX IF NOT EXISTS ix_logs_created_at ON users.logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ix_logs_user_id    ON users.logs (user_id) WHERE user_id IS NOT NULL;
COMMENT ON TABLE users.logs IS 'Application error log — structured events from the backend. user_id has no FK — log survives user deletion.';


CREATE TABLE IF NOT EXISTS users.device_tokens (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    platform      text        NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    token         text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    last_seen_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_device_tokens_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS ix_device_tokens_user_id ON users.device_tokens (user_id);

COMMENT ON TABLE  users.device_tokens IS 'Push notification tokens per (user, device). Unique on token; ownership transfers via UPSERT on sign-in.';
COMMENT ON COLUMN users.device_tokens.token IS 'APNs hex token (iOS) or FCM token (Android/web).';
COMMENT ON COLUMN users.device_tokens.last_seen_at IS 'Bumped on every register call. Used to prune stale tokens.';
