-- Seed: lookups.domains
-- Removed: architecture, platform, sre, product (roles/org functions, not tech domains)
INSERT INTO lookups.domains (name, label, icon, sort_order) VALUES
  ('frontend',   'Frontend',           '🎨',  1),
  ('backend',    'Backend',            '🔧',  2),
  ('devops',     'DevOps / Cloud',     '🚀',  3),
  ('mobile',     'Mobile',             '📱',  4),
  ('ai_ml',      'AI / ML',            '🧠',  5),
  ('data',       'Data Engineering',   '📈',  6),
  ('security',   'Security',           '🛡️',  7),
  ('systems',    'Systems / Embedded', '⚡',  8),
  ('blockchain', 'Blockchain / Web3',  '🔗',  9),
  ('gaming',     'Game Development',   '👾', 10)
ON CONFLICT (name) DO NOTHING;
