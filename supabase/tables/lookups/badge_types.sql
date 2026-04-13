-- ============================================================
-- TABLE: lookups.badge_types
-- Lookup table for badge definitions
-- Schema: lookups
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.badge_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    icon        text    NOT NULL DEFAULT '🏅',
    description text    CHECK (char_length(description) <= 500)
);

COMMENT ON TABLE lookups.badge_types IS 'Lookup: gamification badge definitions (first_byte, top_contributor, etc.)';
