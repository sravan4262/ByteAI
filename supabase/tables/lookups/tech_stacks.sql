-- ============================================================
-- TABLE: lookups.tech_stacks
-- Lookup table for technology stacks, grouped by domain
-- Schema: lookups
-- Depends on: lookups.domains
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.tech_stacks (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id   uuid    NOT NULL REFERENCES lookups.domains(id) ON DELETE CASCADE,
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order  integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_tech_stacks_domain_id ON lookups.tech_stacks (domain_id);

COMMENT ON TABLE lookups.tech_stacks IS 'Lookup: tech stack items grouped by domain. name is the canonical tag identifier.';
