-- ============================================================
-- TABLE: reactions
-- User reactions on bytes (like, etc.) — composite PK prevents duplicates
-- Depends on: users, bytes
-- ============================================================
CREATE TABLE IF NOT EXISTS reactions (
    byte_id     uuid        NOT NULL REFERENCES bytes(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        text        NOT NULL DEFAULT 'like' CHECK (type IN ('like')),
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pk_reactions PRIMARY KEY (byte_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_reactions_user_id ON reactions (user_id);

COMMENT ON TABLE reactions IS 'One reaction per user per byte — composite PK enforces uniqueness';
