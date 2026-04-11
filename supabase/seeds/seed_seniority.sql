-- Seed: seniority_types
INSERT INTO lookups.seniority_types (name, label, icon, sort_order) VALUES
  ('intern',      'Intern',               '🌱', 1),
  ('junior',      'Junior',               '🔰', 2),
  ('mid',         'Mid-Level',            '⚡', 3),
  ('senior',      'Senior',               '🔥', 4),
  ('staff',       'Staff Engineer',       '🚀', 5),
  ('principal',   'Principal Engineer',   '🏆', 6),
  ('architect',   'Architect',            '🏛️', 7),
  ('distinguished','Distinguished Eng',   '⭐', 8),
  ('fellow',      'Fellow',               '🎓', 9),
  ('manager',     'Engineering Manager',  '👥', 10),
  ('director',    'Director of Eng',      '🎯', 11),
  ('vp',          'VP Engineering',       '💎', 12),
  ('cto',         'CTO',                  '🔑', 13)
ON CONFLICT (name) DO NOTHING;
