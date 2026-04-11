-- ============================================================
-- TABLE: lookups.seniority_types
-- Lookup table for user seniority levels shown in onboarding
-- Schema: lookups
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.seniority_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    icon        text    NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE lookups.seniority_types IS 'Lookup: seniority levels for user onboarding (intern, junior, mid, senior, staff, principal, etc.)';
