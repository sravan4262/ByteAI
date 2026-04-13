-- ============================================================
-- TABLE: lookups.tech_stacks
-- Lookup table for technology stacks, grouped by subdomain
-- Schema: lookups
-- Depends on: lookups.subdomains
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.tech_stacks (
    id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain_id uuid    NOT NULL REFERENCES lookups.subdomains(id) ON DELETE CASCADE,
    name         text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label        text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_tech_stacks_subdomain_id ON lookups.tech_stacks (subdomain_id);

COMMENT ON TABLE lookups.tech_stacks IS 'Lookup: tech stack items grouped by subdomain. name is the canonical tag identifier.';
