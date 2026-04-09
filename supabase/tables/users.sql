-- ============================================================
-- TABLE: users
-- Synced from Clerk via webhook (user.created / user.updated)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
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
    tech_stack          text[]      NOT NULL DEFAULT '{}',
    feed_preferences    text[]      NOT NULL DEFAULT '{}',
    interest_embedding  vector(384),  -- personalised feed: ONNX embedding of user's interests
    is_verified         boolean     NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_clerk_id  ON users (clerk_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username   ON users (username);
CREATE INDEX        IF NOT EXISTS ix_users_domain      ON users (domain) WHERE domain IS NOT NULL;

COMMENT ON TABLE  users                    IS 'Platform users — synced from Clerk via webhook';
COMMENT ON COLUMN users.interest_embedding IS '384-dim ONNX embedding of user interests for personalised feed ranking';
