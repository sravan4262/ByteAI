-- ============================================================
-- TABLE: bytes.user_views
-- User views on bytes — tracks unique view events
-- Schema: bytes
-- Depends on: users.users, bytes.bytes
-- NOTE: user_id nullable — anonymous views are recorded too
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.user_views (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    user_id     uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    viewed_at   timestamptz NOT NULL DEFAULT now(),
    dwell_ms    int
);

CREATE INDEX IF NOT EXISTS ix_user_views_byte_id  ON bytes.user_views (byte_id);
CREATE INDEX IF NOT EXISTS ix_user_views_user_id  ON bytes.user_views (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_user_views_viewed_at ON bytes.user_views (viewed_at DESC);

COMMENT ON TABLE bytes.user_views IS 'View events per byte — user_id nullable for anonymous views';
