-- ============================================================
-- TABLE: users.logs
-- Application error/event log — persists to DB for audit trail
-- Schema: users
-- Note: user_id intentionally has no FK — log survives user deletion
-- ============================================================
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

COMMENT ON TABLE users.logs IS 'Application error log — structured events from the backend';
