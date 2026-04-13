-- ============================================================
-- TABLE: bytes.byte_tech_stacks
-- Many-to-many: bytes ↔ tech_stacks (replaces bytes.tags text[])
-- Schema: bytes
-- Depends on: bytes.bytes, lookups.tech_stacks
-- ============================================================
CREATE TABLE IF NOT EXISTS bytes.byte_tech_stacks (
    byte_id       uuid NOT NULL REFERENCES bytes.bytes(id) ON DELETE CASCADE,
    tech_stack_id uuid NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,

    CONSTRAINT pk_byte_tech_stacks PRIMARY KEY (byte_id, tech_stack_id)
);

CREATE INDEX IF NOT EXISTS ix_byte_tech_stacks_tech_stack_id ON bytes.byte_tech_stacks (tech_stack_id);

COMMENT ON TABLE bytes.byte_tech_stacks IS 'Byte-to-tech-stack tags — normalized junction table (replaces bytes.tags text[])';
