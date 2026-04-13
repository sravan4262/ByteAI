-- ============================================================
-- TABLE: lookups.subdomains
-- Sub-categories within each engineering domain
-- Schema: lookups
-- Depends on: lookups.domains
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.subdomains (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id   uuid    NOT NULL REFERENCES lookups.domains(id) ON DELETE CASCADE,
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order  integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_subdomains_domain_id ON lookups.subdomains (domain_id);

COMMENT ON TABLE lookups.subdomains IS 'Lookup: sub-categories within each engineering domain (e.g. "UI Frameworks" under "Frontend").';
