-- ============================================================
-- TABLE: lookups.role_types
-- Schema: lookups
-- Enum-like definitions for different User roles.
-- ============================================================
CREATE TABLE IF NOT EXISTS lookups.role_types (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL UNIQUE,
    label       text        NOT NULL,
    description text
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_types_name ON lookups.role_types (name);

COMMENT ON TABLE  lookups.role_types      IS 'Definitions for system roles users can be granted.';
COMMENT ON COLUMN lookups.role_types.name IS 'Machine-readable identifier (e.g., ''admin'').';
