-- ============================================================
-- TABLE: interviews.interview_tech_stacks
-- Many-to-many: interviews ↔ tech_stacks (replaces interviews.tags text[])
-- Schema: interviews
-- Depends on: interviews.interviews, lookups.tech_stacks
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.interview_tech_stacks (
    interview_id  uuid NOT NULL REFERENCES interviews.interviews(id) ON DELETE CASCADE,
    tech_stack_id uuid NOT NULL REFERENCES lookups.tech_stacks(id) ON DELETE CASCADE,

    CONSTRAINT pk_interview_tech_stacks PRIMARY KEY (interview_id, tech_stack_id)
);

CREATE INDEX IF NOT EXISTS ix_interview_tech_stacks_tech_stack_id ON interviews.interview_tech_stacks (tech_stack_id);

COMMENT ON TABLE interviews.interview_tech_stacks IS 'Interview-to-tech-stack tags — normalized junction table (replaces interviews.tags text[])';
