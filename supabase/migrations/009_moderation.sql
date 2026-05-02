-- ============================================================
-- Migration 009: Moderation
-- Depends on: 003_users_tables
-- ============================================================
--
-- The moderation schema:
--   * moderation.flagged_content    — every system auto-flag and every user report
--   * moderation.user_bans          — kill switch for repeat offenders (currently-active projection)
--   * moderation.user_ban_history   — append-only audit log of every ban event
--   * moderation.ban_hidden_content — audit log of bytes/interviews hidden by a ban,
--                                     consumed on unban to restore is_hidden=false
--
-- Row-level security: locked down by default. Only the service role (the API
-- itself) is allowed to read/write any of these tables — there are no end-user
-- RLS policies, mirroring how support.feedback and users.logs are treated.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS moderation;

-- ── flagged_content ─────────────────────────────────────────────────────────
-- content_type values:
--   * 'byte', 'interview', 'chat', 'support', 'profile', 'unknown' — primary surfaces
--   * 'comment'                     — bytes.comments
--   * 'interview_comment'           — interviews.interview_comments
--   * 'interview_question_comment'  — interviews.interview_question_comments
-- The three comment variants are kept distinct so the admin triage UI's "Remove"
-- action can route to the correct source table.
--
-- reason_code values cover every code emitted by:
--   * Layer 1 (deterministic):        PROFANITY, PII, SPAM, GIBBERISH, LENGTH
--   * Layer 2 (Gemini LLM):           TOXICITY, OFF_TOPIC, HARASSMENT, HATE,
--                                     SEXUAL, HARM, PROMPT_INJECTION
--   * User reports:                   USER_REPORT
CREATE TABLE IF NOT EXISTS moderation.flagged_content (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type       TEXT        NOT NULL
                                   CHECK (content_type IN (
                                       'byte','comment','interview_comment','interview_question_comment',
                                       'interview','chat','support','profile','unknown')),
    content_id         UUID        NOT NULL,
    reporter_user_id   UUID        REFERENCES users.users(id) ON DELETE SET NULL,
    -- Set to the internal user_id of the user who created the flagged content
    -- (NULL when the content was rejected before persistence and the author is
    -- recorded only on the content table). Powers the admin "At-Risk Users"
    -- watchlist + the per-user flag drilldown.
    content_author_id  UUID        REFERENCES users.users(id) ON DELETE SET NULL,
    reason_code        TEXT        NOT NULL
                                   CHECK (reason_code IN (
                                       'PROFANITY','PII','SPAM','GIBBERISH','LENGTH',
                                       'TOXICITY','OFF_TOPIC','HARASSMENT','HATE','SEXUAL','HARM','PROMPT_INJECTION',
                                       'USER_REPORT')),
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

CREATE INDEX IF NOT EXISTS idx_flagged_content_author
    ON moderation.flagged_content(content_author_id)
    WHERE content_author_id IS NOT NULL;

COMMENT ON TABLE  moderation.flagged_content
    IS 'System auto-flags and user-submitted content reports. Reviewed by admins.';
COMMENT ON COLUMN moderation.flagged_content.reporter_user_id
    IS 'NULL when the system auto-flagged the content (e.g. medium severity from Layer 1/2).';
COMMENT ON COLUMN moderation.flagged_content.content_author_id
    IS 'User who created the flagged content. Powers the at-risk-users watchlist and per-user drilldown.';
COMMENT ON COLUMN moderation.flagged_content.reason_code
    IS 'Layer1: PROFANITY|PII|SPAM|GIBBERISH|LENGTH | Layer2: TOXICITY|OFF_TOPIC|HARASSMENT|HATE|SEXUAL|HARM|PROMPT_INJECTION | User: USER_REPORT';
COMMENT ON COLUMN moderation.flagged_content.severity
    IS 'low | medium | high — high-severity items are blocked at submission and never persisted as content rows.';

-- ── user_bans ───────────────────────────────────────────────────────────────
-- Currently-active ban projection — fast PK lookup for BanEnforcementMiddleware.
-- The full append-only history lives in moderation.user_ban_history below.
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
    IS 'Active or scheduled bans. NULL expires_at = permanent. Source of truth for the BanEnforcementMiddleware.';

-- ── user_ban_history ────────────────────────────────────────────────────────
-- Append-only audit log. Every ban event inserts a new row; unban / re-ban
-- closes the prior open row by setting lifted_at + lifted_by. Distinct from
-- user_bans, which is the "currently active" projection.
CREATE TABLE IF NOT EXISTS moderation.user_ban_history (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    reason      TEXT        NOT NULL,
    banned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    banned_by   UUID        REFERENCES users.users(id) ON DELETE SET NULL,
    lifted_at   TIMESTAMPTZ,
    lifted_by   UUID        REFERENCES users.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ban_history_user
    ON moderation.user_ban_history (user_id, banned_at DESC);

-- Partial index over the (typically tiny) set of currently-open ban events.
-- Used when re-banning to find and close the prior open row.
CREATE INDEX IF NOT EXISTS idx_ban_history_open
    ON moderation.user_ban_history (user_id) WHERE lifted_at IS NULL;

COMMENT ON TABLE moderation.user_ban_history
    IS 'Append-only ban audit. One row per ban event. lifted_at IS NULL means the ban is still active.';

-- ── ban_hidden_content ──────────────────────────────────────────────────────
-- Tracks bytes/interviews hidden by a ban event so unban can flip them back.
-- Comments are NOT tracked: a ban hard-deletes them and they have no restore path.
CREATE TABLE IF NOT EXISTS moderation.ban_hidden_content (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    content_type  TEXT        NOT NULL CHECK (content_type IN ('byte','interview')),
    content_id    UUID        NOT NULL,
    hidden_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ban_hidden_user
    ON moderation.ban_hidden_content (user_id);

COMMENT ON TABLE moderation.ban_hidden_content
    IS 'Audit log of bytes/interviews hidden by a ban event. Consumed on unban to restore is_hidden=false.';

-- ── RLS — service-role only ─────────────────────────────────────────────────
-- Enable RLS and add NO permissive policies. Combined with FORCE ROW LEVEL
-- SECURITY this denies all access to authenticated and anon roles. Only the
-- service_role / postgres bypass-RLS roles can read or write.

ALTER TABLE moderation.flagged_content     ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation.flagged_content     FORCE  ROW LEVEL SECURITY;

ALTER TABLE moderation.user_bans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation.user_bans           FORCE  ROW LEVEL SECURITY;

ALTER TABLE moderation.user_ban_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation.user_ban_history    FORCE  ROW LEVEL SECURITY;

ALTER TABLE moderation.ban_hidden_content  ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation.ban_hidden_content  FORCE  ROW LEVEL SECURITY;

-- Revoke any default schema-level grants from non-service roles so even
-- bypass-RLS attempts on these tables fail with permission denied.
REVOKE ALL ON moderation.flagged_content    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON moderation.user_bans          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON moderation.user_ban_history   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON moderation.ban_hidden_content FROM PUBLIC, anon, authenticated;
