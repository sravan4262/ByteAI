-- ============================================================
-- TABLE: users.user_feature_flags
-- Schema: users
-- Grants specific access to an otherwise closed feature flag for an individual.
-- ============================================================
CREATE TABLE IF NOT EXISTS users.user_feature_flags (
    user_id              uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    feature_flag_type_id uuid        NOT NULL REFERENCES lookups.feature_flag_types(id) ON DELETE CASCADE,
    granted_at           timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, feature_flag_type_id)
);

CREATE INDEX IF NOT EXISTS ix_user_feature_flags_feature_flag_type_id ON users.user_feature_flags(feature_flag_type_id);

COMMENT ON TABLE users.user_feature_flags IS 'Junction assigning feature flags to specific users individually';
