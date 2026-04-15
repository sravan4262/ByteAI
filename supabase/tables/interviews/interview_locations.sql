-- ============================================================
-- TABLE: interviews.interview_locations
-- Mapping table — one interview can be tagged with multiple locations
-- Schema: interviews
-- Depends on: interviews.interviews, interviews.locations
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interview_locations (
    interview_id  uuid NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    location_id   uuid NOT NULL REFERENCES interviews.locations(id)  ON DELETE CASCADE,
    PRIMARY KEY (interview_id, location_id)
);

CREATE INDEX IF NOT EXISTS ix_interview_locations_location_id ON interviews.interview_locations (location_id);
COMMENT ON TABLE interviews.interview_locations IS 'Maps interviews to locations — one company can post across multiple cities';
