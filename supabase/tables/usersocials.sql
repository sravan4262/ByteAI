-- ============================================================
-- TABLE: users.usersocials
-- User social links — 1 user : many social profiles
-- Schema: users
-- Depends on: users.users
-- ============================================================
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
