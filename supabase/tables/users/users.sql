-- ============================================================
-- TABLE: users.users
-- Synced from Clerk via webhook (user.created / user.updated)
-- Schema: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users.users (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id            text        NOT NULL UNIQUE,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_clerk_id ON users.users (clerk_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username  ON users.users (username);
CREATE INDEX        IF NOT EXISTS ix_users_domain    ON users.users (domain) WHERE domain IS NOT NULL;

COMMENT ON TABLE  users.users                    IS 'Platform users — synced from Clerk via webhook';
COMMENT ON COLUMN users.users.interest_embedding IS '768-dim embedding of user interests for personalised feed ranking';
