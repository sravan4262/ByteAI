-- ============================================================
-- TABLE: lookups.feature_flag_types
-- Schema: lookups
-- Toggles for runtime features either globally open, or requiring individual flags
-- ============================================================
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
COMMENT ON COLUMN lookups.feature_flag_types.key         IS 'Unique machine-readable key used in code: useFeatureFlag(''key'')';
COMMENT ON COLUMN lookups.feature_flag_types.global_open IS 'When true, the feature is active for all users. When false it requires user_feature_flags.';
