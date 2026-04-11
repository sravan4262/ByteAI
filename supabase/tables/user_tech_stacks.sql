-- ============================================================
-- TABLE: users.user_tech_stacks
-- Many-to-many: users ↔ tech_stacks
-- Schema: users
-- Depends on: users.users, lookups.tech_stacks
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_tech_stacks (
    user_id       uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    tech_stack_id uuid        NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_user_tech_stacks PRIMARY KEY (user_id, tech_stack_id)
);

CREATE INDEX IF NOT EXISTS ix_user_tech_stacks_tech_stack_id ON users.user_tech_stacks (tech_stack_id);

COMMENT ON TABLE users.user_tech_stacks IS 'User tech stack selections — normalized junction table';
