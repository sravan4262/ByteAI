-- ============================================================
-- DROP ALL TABLES — ByteAI
-- Drops all schemas and everything inside them (CASCADE).
-- Schemas are NOT recreated — run apply_schema.sh after this
-- to bring the DB back to a clean working state.
--
-- WARNING: This is destructive and irreversible.
-- Run apply_schema.sh after to restore schema + lookup seeds.
-- ============================================================

-- Drop in reverse dependency order (CASCADE handles tables/indexes/constraints)
DROP SCHEMA IF EXISTS interviews CASCADE;
DROP SCHEMA IF EXISTS bytes      CASCADE;
DROP SCHEMA IF EXISTS users      CASCADE;
DROP SCHEMA IF EXISTS lookups    CASCADE;
