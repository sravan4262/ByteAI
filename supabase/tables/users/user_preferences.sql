-- ============================================================
-- TABLE: users.user_preferences
-- Stores per-user app preferences: theme, visibility, notification toggles.
-- One row per user, created on first save (upsert pattern).
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_preferences (
    user_id           uuid        PRIMARY KEY REFERENCES users.users(id) ON DELETE CASCADE,
    theme             text        NOT NULL DEFAULT 'dark',
    visibility        text        NOT NULL DEFAULT 'public',  -- 'public' | 'private'
    notif_reactions   boolean     NOT NULL DEFAULT true,
    notif_comments    boolean     NOT NULL DEFAULT true,
    notif_followers   boolean     NOT NULL DEFAULT true,
    notif_unfollows   boolean     NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE users.user_preferences IS 'Per-user preferences: theme, profile visibility, and notification toggles.';
