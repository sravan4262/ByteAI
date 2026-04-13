-- Seed: lookups.search_types
-- Removed: all (implicit default), topics (handled by tag filter on bytes/interviews)
INSERT INTO lookups.search_types (name, label, description, sort_order) VALUES
  ('bytes',      'Bytes',      'Short tech posts and snippets', 1),
  ('interviews', 'Interviews', 'Interview experience posts',    2),
  ('devs',       'Devs',       'Search for developers',         3)
ON CONFLICT (name) DO NOTHING;
