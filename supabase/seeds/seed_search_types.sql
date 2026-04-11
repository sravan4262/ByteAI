-- Seed: search_types
INSERT INTO lookups.search_types (name, label, description, sort_order) VALUES
  ('all',        'All',        'Search across all content types',  1),
  ('bytes',      'Bytes',      'Short tech posts and snippets',    2),
  ('interviews', 'Interviews', 'Interview experience posts',       3),
  ('devs',       'Devs',       'Search for developers',            4),
  ('topics',     'Topics',     'Search by tech stack or topic',    5)
ON CONFLICT (name) DO NOTHING;
