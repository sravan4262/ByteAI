-- ============================================================
-- DROP ALL — dev reset script
-- Drops all 4 schemas (CASCADE removes all tables + indexes inside)
-- Run: psql $BYTEAI_DB_URL -f supabase/drop_all.sql
-- ============================================================
DROP SCHEMA IF EXISTS interviews CASCADE;
DROP SCHEMA IF EXISTS bytes CASCADE;
DROP SCHEMA IF EXISTS users CASCADE;
DROP SCHEMA IF EXISTS lookups CASCADE;

-- Then re-apply: ./supabase/apply_schema.sh
