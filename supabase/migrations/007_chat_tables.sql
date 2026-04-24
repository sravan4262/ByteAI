-- ============================================================
-- Migration 007: Chat Tables
-- Adds conversations, messages, conversation_participants.
-- Mutual-follow is enforced at the application layer.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS chat;

-- chat.conversations — one row per unique user pair
CREATE TABLE IF NOT EXISTS chat.conversations (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_a_id    uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    participant_b_id    uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    created_at          timestamptz NOT NULL DEFAULT now(),
    last_message_at     timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_chat CHECK (participant_a_id <> participant_b_id)
);
-- canonical order: a < b prevents duplicate rows for the same pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_pair
    ON chat.conversations (LEAST(participant_a_id, participant_b_id), GREATEST(participant_a_id, participant_b_id));
CREATE INDEX IF NOT EXISTS ix_conversations_participant_a ON chat.conversations (participant_a_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS ix_conversations_participant_b ON chat.conversations (participant_b_id, last_message_at DESC);
COMMENT ON TABLE chat.conversations IS 'One row per unique user pair — the channel between two participants.';

-- chat.messages — individual messages within a conversation
CREATE TABLE IF NOT EXISTS chat.messages (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     uuid        NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
    sender_id           uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    content             text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
    sent_at             timestamptz NOT NULL DEFAULT now(),
    read_at             timestamptz
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_sent ON chat.messages (conversation_id, sent_at DESC);
COMMENT ON TABLE chat.messages IS 'Individual messages; soft read receipt via read_at.';

-- chat.conversation_participants — per-user inbox metadata (unread tracking)
CREATE TABLE IF NOT EXISTS chat.conversation_participants (
    conversation_id     uuid        NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
    user_id             uuid        NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    last_read_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);
COMMENT ON TABLE chat.conversation_participants IS 'Per-user read cursor — compare last_read_at vs conversations.last_message_at for unread count.';
