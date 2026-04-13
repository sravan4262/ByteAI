-- ============================================================
-- TABLE: interviews.companies
-- Company lookup for interview posts
-- Schema: interviews
-- ============================================================
CREATE TABLE IF NOT EXISTS interviews.companies (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_companies_name UNIQUE (name)
);

COMMENT ON TABLE interviews.companies IS 'Company lookup for interview posts';
