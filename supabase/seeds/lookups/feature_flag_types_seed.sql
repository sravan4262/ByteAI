-- ============================================================
-- ByteAI — Feature Flag Types Seed Data
-- Seeds AI feature flags set to disabled by default
-- ============================================================

-- ai-suggest-tags removed — endpoint removed, auto-tagging happens in ByteCreatedEventHandler backend only.
INSERT INTO lookups.feature_flag_types (key, name, description, global_open, created_at, updated_at)
VALUES
  ('ai-search-ask',  'AI Search & Answer',  'Semantic search + RAG powered answers using Groq',                   false, now(), now()),
  ('ai-format-code', 'AI Code Formatter',   'Format code using Groq for multiple programming languages',          false, now(), now()),
  ('reach-estimate', 'Reach Estimate',      'Show estimated reach (dev audience size) on the compose byte screen',false, now(), now()),
  ('chat',           'Chat',               'Real-time direct messaging between mutually following users.',        false, now(), now())
ON CONFLICT (key) DO NOTHING;
