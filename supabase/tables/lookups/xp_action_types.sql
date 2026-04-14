-- ============================================================
-- TABLE: lookups.xp_action_types
-- Centralised XP economy — defines how much XP each action awards.
-- Schema: lookups
-- ============================================================
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

COMMENT ON TABLE  lookups.xp_action_types             IS 'XP economy config — one row per action type. Handlers look up xp_amount by name.';
COMMENT ON COLUMN lookups.xp_action_types.name        IS 'Machine key used in event handlers, e.g. ''post_byte''.';
COMMENT ON COLUMN lookups.xp_action_types.xp_amount   IS 'Base XP awarded per occurrence.';
COMMENT ON COLUMN lookups.xp_action_types.max_per_day IS 'Daily cap on XP awards for this action (NULL = unlimited).';
COMMENT ON COLUMN lookups.xp_action_types.is_one_time IS 'If true the user can only earn this XP once ever.';
COMMENT ON COLUMN lookups.xp_action_types.is_active   IS 'Toggle to disable an XP source without deleting the row.';
