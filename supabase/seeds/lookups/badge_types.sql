-- Seed: lookups.badge_types
INSERT INTO lookups.badge_types (name, label, icon, description) VALUES
  ('first_byte',      'First Byte',       '🥇',  'Posted your first byte'),
  ('byte_streak_7',   '7-Day Streak',     '🔥',  'Posted bytes 7 days in a row'),
  ('byte_streak_30',  '30-Day Streak',    '🔥🔥','Posted bytes 30 days in a row'),
  ('reactions_100',   '100 Reactions',    '💡',  'Received 100 total reactions'),
  ('reactions_1000',  '1K Reactions',     '⚡',  'Received 1,000 total reactions'),
  ('followers_100',   '100 Followers',    '🌟',  'Reached 100 followers'),
  ('followers_1k',    '1K Followers',     '🏆',  'Reached 1,000 followers'),
  ('top_contributor', 'Top Contributor',  '🎖️',  'Ranked in top 1% of contributors'),
  ('speed_coder',     'Speed Coder',      '⚡',  'Posted 5 bytes in one day'),
  ('mentor',          'Mentor',           '👨‍🏫', 'Received 50+ helpful comments'),
  ('verified',        'Verified',         '✅',  'Identity verified by ByteAI team'),
  ('early_adopter',   'Early Adopter',    '🚀',  'Joined during beta period')
ON CONFLICT (name) DO NOTHING;
