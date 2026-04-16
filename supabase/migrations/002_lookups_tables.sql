-- ============================================================
-- Migration 002: Lookup Tables
-- All static reference tables with no cross-schema deps.
-- Run order within this file matters (subdomains → tech_stacks).
-- ============================================================

-- lookups.domains
CREATE TABLE IF NOT EXISTS lookups.domains (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    icon        text    NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0
);
COMMENT ON TABLE lookups.domains IS 'Lookup: engineering domains for user onboarding (frontend, backend, devops, ai, etc.)';

-- lookups.seniority_types
CREATE TABLE IF NOT EXISTS lookups.seniority_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    icon        text    NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0
);
COMMENT ON TABLE lookups.seniority_types IS 'Lookup: seniority levels for user onboarding';

-- lookups.level_types
CREATE TABLE IF NOT EXISTS lookups.level_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    level       integer NOT NULL UNIQUE CHECK (level >= 1),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    xp_required integer NOT NULL DEFAULT 0 CHECK (xp_required >= 0),
    icon        text    NOT NULL DEFAULT '⭐'
);
COMMENT ON TABLE lookups.level_types IS 'Lookup: XP level definitions. level=1 is beginner.';

-- lookups.badge_types
CREATE TABLE IF NOT EXISTS lookups.badge_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    icon        text    NOT NULL DEFAULT '🏅',
    description text    CHECK (char_length(description) <= 500)
);
COMMENT ON TABLE lookups.badge_types IS 'Lookup: gamification badge definitions';

-- lookups.role_types
CREATE TABLE IF NOT EXISTS lookups.role_types (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE,
    label       text        NOT NULL,
    description text
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_role_types_name ON lookups.role_types (name);
COMMENT ON TABLE  lookups.role_types      IS 'Definitions for system roles users can be granted.';
COMMENT ON COLUMN lookups.role_types.name IS 'Machine-readable identifier (e.g., ''admin'').';

-- lookups.search_types
CREATE TABLE IF NOT EXISTS lookups.search_types (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    description text    CHECK (char_length(description) <= 300),
    sort_order  integer NOT NULL DEFAULT 0
);
COMMENT ON TABLE lookups.search_types IS 'Lookup: searchable content types (bytes, interviews, devs, topics)';

-- lookups.feature_flag_types
CREATE TABLE IF NOT EXISTS lookups.feature_flag_types (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text        NOT NULL UNIQUE CHECK (char_length(key) BETWEEN 1 AND 100),
    name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    description text        CHECK (char_length(description) <= 500),
    global_open boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flag_types_key ON lookups.feature_flag_types (key);
COMMENT ON TABLE  lookups.feature_flag_types             IS 'Runtime feature definitions';
COMMENT ON COLUMN lookups.feature_flag_types.global_open IS 'When true, feature is active for all users.';

-- lookups.xp_action_types
CREATE TABLE IF NOT EXISTS lookups.xp_action_types (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text        NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
    description text        CHECK (char_length(description) <= 500),
    xp_amount   integer     NOT NULL CHECK (xp_amount >= 0),
    max_per_day integer     CHECK (max_per_day > 0),
    is_one_time boolean     NOT NULL DEFAULT false,
    icon        text        NOT NULL DEFAULT '⚡',
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE  lookups.xp_action_types           IS 'XP economy config — one row per action type.';
COMMENT ON COLUMN lookups.xp_action_types.name      IS 'Machine key used in event handlers, e.g. ''post_byte''.';
COMMENT ON COLUMN lookups.xp_action_types.is_active IS 'Toggle to disable an XP source without deleting the row.';

-- lookups.subdomains (depends on lookups.domains)
CREATE TABLE IF NOT EXISTS lookups.subdomains (
    id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id   uuid    NOT NULL REFERENCES lookups.domains(id) ON DELETE CASCADE,
    name        text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label       text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order  integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_subdomains_domain_id ON lookups.subdomains (domain_id);
COMMENT ON TABLE lookups.subdomains IS 'Lookup: sub-categories within each engineering domain.';

-- lookups.tech_stacks (depends on lookups.subdomains)
CREATE TABLE IF NOT EXISTS lookups.tech_stacks (
    id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    subdomain_id uuid    NOT NULL REFERENCES lookups.subdomains(id) ON DELETE CASCADE,
    name         text    NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 100),
    label        text    NOT NULL CHECK (char_length(label) BETWEEN 1 AND 100),
    sort_order   integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_tech_stacks_subdomain_id ON lookups.tech_stacks (subdomain_id);
COMMENT ON TABLE lookups.tech_stacks IS 'Lookup: tech stack items grouped by subdomain.';
