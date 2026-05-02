-- ============================================================
-- Migration 009: Moderation
-- Depends on: 003_users_tables
-- ============================================================
--
-- Adds the moderation schema:
--   * moderation.flagged_content — every system auto-flag and every user report
--   * moderation.user_bans       — kill switch for repeat offenders
--
-- Row-level security: locked down by default. Only the service role (the API
-- itself) is allowed to read/write either table — there are no end-user RLS
-- policies, mirroring how support.feedback and users.logs are treated.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS moderation;

-- ── flagged_content ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation.flagged_content (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type       TEXT        NOT NULL
                                   CHECK (content_type IN ('byte','comment','interview','chat','support','profile','unknown')),
    content_id         UUID        NOT NULL,
    reporter_user_id   UUID        REFERENCES users.users(id) ON DELETE SET NULL,
    reason_code        TEXT        NOT NULL
                                   CHECK (reason_code IN ('TOXICITY','PROFANITY','PII','SPAM','GIBBERISH','LENGTH','USER_REPORT')),
    reason_message     TEXT,
    severity           TEXT        NOT NULL
                                   CHECK (severity IN ('low','medium','high')),
    status             TEXT        NOT NULL DEFAULT 'open'
                                   CHECK (status IN ('open','reviewing','removed','dismissed')),
    score              DOUBLE PRECISION,
    metadata           JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at        TIMESTAMPTZ,
    resolved_by        UUID        REFERENCES users.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_flagged_content_status
    ON moderation.flagged_content(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_flagged_content_target
    ON moderation.flagged_content(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_flagged_content_reporter
    ON moderation.flagged_content(reporter_user_id)
    WHERE reporter_user_id IS NOT NULL;

COMMENT ON TABLE  moderation.flagged_content
    IS 'System auto-flags and user-submitted content reports. Reviewed by admins.';
COMMENT ON COLUMN moderation.flagged_content.reporter_user_id
    IS 'NULL when the system auto-flagged the content (e.g. medium severity from Layer 1/2).';
COMMENT ON COLUMN moderation.flagged_content.reason_code
    IS 'TOXICITY | PROFANITY | PII | SPAM | GIBBERISH | LENGTH | USER_REPORT';
COMMENT ON COLUMN moderation.flagged_content.severity
    IS 'low | medium | high — high-severity items are blocked at submission and never persisted as content rows.';

-- ── user_bans ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moderation.user_bans (
    user_id     UUID        PRIMARY KEY REFERENCES users.users(id) ON DELETE CASCADE,
    reason      TEXT        NOT NULL,
    banned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    banned_by   UUID        REFERENCES users.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_bans_expires
    ON moderation.user_bans(expires_at)
    WHERE expires_at IS NOT NULL;

COMMENT ON TABLE moderation.user_bans
    IS 'Active or scheduled bans. NULL expires_at = permanent.';

-- ── RLS — service-role only ─────────────────────────────────────────────────
-- Enable RLS and add NO permissive policies. Combined with FORCE ROW LEVEL
-- SECURITY this denies all access to authenticated and anon roles. Only the
-- service_role / postgres bypass-RLS roles can read or write.

ALTER TABLE moderation.flagged_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation.flagged_content FORCE  ROW LEVEL SECURITY;

ALTER TABLE moderation.user_bans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation.user_bans       FORCE  ROW LEVEL SECURITY;

-- Revoke any default schema-level grants from non-service roles so even
-- bypass-RLS attempts on these tables fail with permission denied.
REVOKE ALL ON moderation.flagged_content FROM PUBLIC, anon, authenticated;
REVOKE ALL ON moderation.user_bans       FROM PUBLIC, anon, authenticated;
