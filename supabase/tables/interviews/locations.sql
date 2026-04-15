-- ============================================================
-- TABLE: interviews.locations
-- City/location lookup for interview posts — seeded with major hubs
-- Schema: interviews
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.locations (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    country     text        NOT NULL DEFAULT 'United States',
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_locations_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS ix_interview_locations_name ON interviews.locations (lower(name));
COMMENT ON TABLE interviews.locations IS 'Location lookup for interview posts — seeded with major tech hubs, grows automatically on interview creation';
