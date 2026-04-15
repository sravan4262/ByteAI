-- ============================================================
-- TABLE: interviews.roles
-- Role lookup for interview posts (e.g. SWE L5, Staff Engineer)
-- Schema: interviews
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.roles (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_roles_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS ix_interview_roles_name ON interviews.roles (lower(name));

COMMENT ON TABLE interviews.roles IS 'Role lookup for interview posts — populated automatically on interview creation';
