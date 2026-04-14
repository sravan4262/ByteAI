-- ============================================================
-- TABLE: users.user_roles
-- Schema: users
-- Junction table allowing numerous roles per single User.
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_roles (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    role_type_id  uuid        NOT NULL REFERENCES lookups.role_types(id) ON DELETE CASCADE,
    assigned_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_type_id)
);

CREATE INDEX IF NOT EXISTS ix_user_roles_role_type_id ON users.user_roles(role_type_id);

COMMENT ON TABLE users.user_roles IS 'Junction table assigning permissions/roles directly to users.';
