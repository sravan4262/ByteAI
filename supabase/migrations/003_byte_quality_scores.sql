-- Migration 003: byte_quality_scores table
-- Stores per-byte AI quality scores computed by Groq after publish.

CREATE TABLE IF NOT EXISTS bytes.byte_quality_scores (
    byte_id      UUID        NOT NULL PRIMARY KEY REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    clarity      SMALLINT    NOT NULL CHECK (clarity BETWEEN 1 AND 10),
    specificity  SMALLINT    NOT NULL CHECK (specificity BETWEEN 1 AND 10),
    relevance    SMALLINT    NOT NULL CHECK (relevance BETWEEN 1 AND 10),
    overall      SMALLINT    NOT NULL CHECK (overall BETWEEN 1 AND 10),
    computed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE bytes.byte_quality_scores IS
    'AI-generated quality scores (1-10) per byte. Populated async by ByteCreatedEventHandler via Groq.';
