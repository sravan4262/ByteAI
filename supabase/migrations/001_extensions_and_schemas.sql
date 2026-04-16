-- ============================================================
-- Migration 001: Extensions & Schemas
-- Creates required extensions and all four schemas.
-- Safe to run multiple times — all statements are idempotent.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE SCHEMA IF NOT EXISTS lookups;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS bytes;
CREATE SCHEMA IF NOT EXISTS interviews;
