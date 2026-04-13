-- ============================================================
-- TABLE: lookups.search_types
-- Lookup table for searchable content types
-- Schema: lookups
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.search_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    description text    CHECK (char_length(description) <= 300),
    sort_order  integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE lookups.search_types IS 'Lookup: searchable content types (bytes, interviews, devs, topics)';
