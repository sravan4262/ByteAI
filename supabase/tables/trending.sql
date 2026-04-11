-- ============================================================
-- TABLE: bytes.trending
-- Click/view events for trending feed calculation
-- Schema: bytes
-- Depends on: users.users (nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.trending (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id   uuid        NOT NULL,
    content_type text        NOT NULL CHECK (content_type IN ('byte', 'interview')),
    user_id      uuid        REFERENCES users.users(id) ON DELETE SET NULL,
    clicked_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_trending_content    ON bytes.trending (content_id, content_type);
CREATE INDEX IF NOT EXISTS ix_trending_clicked_at ON bytes.trending (clicked_at DESC);
CREATE INDEX IF NOT EXISTS ix_trending_user_id    ON bytes.trending (user_id) WHERE user_id IS NOT NULL;
-- Composite index for the 24h trending query: WHERE content_type = ? AND clicked_at >= ?
CREATE INDEX IF NOT EXISTS ix_trending_24h        ON bytes.trending (content_type, clicked_at DESC, content_id);

COMMENT ON TABLE bytes.trending IS 'Click events for trending feed. Aggregate by content_id in past 24h to rank trending.';
