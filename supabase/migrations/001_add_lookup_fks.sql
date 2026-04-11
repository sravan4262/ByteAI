-- ============================================================
-- MIGRATION: 001_add_lookup_fks
-- Adds FK columns to existing tables after lookup tables are created.
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$).
-- Run AFTER: seniority_types, domains, level_types, badge_types tables exist.
-- ============================================================

-- Add seniority_id FK to users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='seniority_id'
  ) THEN
    ALTER TABLE users ADD COLUMN seniority_id uuid REFERENCES seniority_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add domain_id FK to users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='domain_id'
  ) THEN
    ALTER TABLE users ADD COLUMN domain_id uuid REFERENCES domains(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add level_type_id FK to users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='level_type_id'
  ) THEN
    ALTER TABLE users ADD COLUMN level_type_id uuid REFERENCES level_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add badge_type_id FK to badges
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='badges' AND column_name='badge_type_id'
  ) THEN
    ALTER TABLE badges ADD COLUMN badge_type_id uuid REFERENCES badge_types(id) ON DELETE SET NULL;
  END IF;
END $$;
