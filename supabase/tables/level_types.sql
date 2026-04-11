-- ============================================================
-- TABLE: lookups.level_types
-- Lookup table for XP level definitions
-- Schema: lookups
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.level_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    level       integer NOT NULL UNIQUE CHECK (level >= 1),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    xp_required integer NOT NULL DEFAULT 0 CHECK (xp_required >= 0),
    icon        text    NOT NULL DEFAULT '⭐'
);

COMMENT ON TABLE lookups.level_types IS 'Lookup: XP level definitions. level=1 is beginner, higher is more senior.';
