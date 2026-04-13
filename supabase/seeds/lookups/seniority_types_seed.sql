-- Seed: lookups.seniority_types
-- Removed: fellow (academic title, rare in industry)
INSERT INTO lookups.seniority_types (name, label, icon, sort_order) VALUES
  ('intern',       'Intern',               '🌱',  1),
  ('junior',       'Junior',               '🔰',  2),
  ('mid',          'Mid-Level',            '⚡',  3),
  ('senior',       'Senior',               '🔥',  4),
  ('staff',        'Staff Engineer',       '🚀',  5),
  ('principal',    'Principal Engineer',   '🏆',  6),
  ('architect',    'Architect',            '🏗️',  7),
  ('distinguished','Distinguished Eng',    '⭐',  8),
  ('manager',      'Engineering Manager',  '👥',  9),
  ('director',     'Director of Eng',      '🎯', 10),
  ('vp',           'VP Engineering',       '💎', 11),
  ('cto',          'CTO',                  '🔑', 12)
ON CONFLICT (name) DO NOTHING;
