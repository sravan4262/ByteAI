-- ============================================================
-- ByteAI — Feature Flag Types Seed Data
-- Seeds AI feature flags set to disabled by default
-- ============================================================

INSERT INTO lookups.feature_flag_types (key, name, description, global_open, created_at, updated_at)
VALUES
  ('ai-suggest-tags', 'AI Tag Suggestions', 'Use Groq Llama 3.3 to auto-suggest byte tags', false, now(), now()),
  ('ai-ask', 'AI Q&A', 'Ask ByteAI tech questions answered by Groq Llama 3.3', false, now(), now()),
  ('ai-search-ask', 'AI Search & Answer', 'Semantic search + RAG powered answers using Groq', false, now(), now()),
  ('ai-format-code', 'AI Code Formatter', 'Format code using Groq for multiple programming languages', false, now(), now())
ON CONFLICT (key) DO NOTHING;
