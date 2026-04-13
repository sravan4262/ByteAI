-- ============================================================
-- TABLE: bytes.byte_quality_scores
-- AI-generated quality scores per byte (Groq scoring)
-- Schema: bytes
-- Depends on: bytes.bytes
-- One row per byte — created/updated by background job after publish
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.byte_quality_scores (
    byte_id     uuid        NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    clarity     integer     NOT NULL CHECK (clarity BETWEEN 0 AND 10),
    specificity integer     NOT NULL CHECK (specificity BETWEEN 0 AND 10),
    relevance   integer     NOT NULL CHECK (relevance BETWEEN 0 AND 10),
    overall     integer     NOT NULL CHECK (overall BETWEEN 0 AND 10),
    computed_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_byte_quality_scores PRIMARY KEY (byte_id)
);

COMMENT ON TABLE bytes.byte_quality_scores IS 'AI quality scores per byte — clarity, specificity, relevance, overall (0–10 each)';
