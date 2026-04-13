-- Seed: lookups.domains
-- Removed: architecture, platform, sre, product (roles/org functions, not tech domains)
INSERT INTO lookups.domains (name, label, icon, sort_order) VALUES
  ('frontend',   'Frontend',           '🎨',  1),
  ('backend',    'Backend',            '🔧',  2),
  ('fullstack',  'Full Stack',         '🌐',  3),
  ('devops',     'DevOps / Cloud',     '🚀',  4),
  ('mobile',     'Mobile',             '📱',  5),
  ('ai_ml',      'AI / ML',            '🧠',  6),
  ('data',       'Data Engineering',   '📈',  7),
  ('security',   'Security',           '🛡️',  8),
  ('systems',    'Systems / Embedded', '⚡',  9),
  ('blockchain', 'Blockchain / Web3',  '🔗', 10),
  ('gaming',     'Game Development',   '👾', 11)
ON CONFLICT (name) DO NOTHING;
