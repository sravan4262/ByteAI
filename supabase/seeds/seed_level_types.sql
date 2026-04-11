-- Seed: level_types
INSERT INTO lookups.level_types (level, name, label, xp_required, icon) VALUES
  (1,  'newcomer',      'Newcomer',         0,      '🌱'),
  (2,  'explorer',      'Explorer',         500,    '🔭'),
  (3,  'contributor',   'Contributor',      1500,   '⚙️'),
  (4,  'builder',       'Builder',          3000,   '🔨'),
  (5,  'craftsman',     'Craftsman',        5000,   '🛠️'),
  (6,  'specialist',    'Specialist',       8000,   '🎯'),
  (7,  'expert',        'Expert',           12000,  '🧠'),
  (8,  'mentor',        'Mentor',           18000,  '📚'),
  (9,  'authority',     'Authority',        25000,  '🏆'),
  (10, 'legend',        'Legend',           35000,  '⭐'),
  (11, 'grandmaster',   'Grandmaster',      50000,  '👑'),
  (12, 'pioneer',       'Pioneer',          75000,  '🚀')
ON CONFLICT (level) DO NOTHING;
