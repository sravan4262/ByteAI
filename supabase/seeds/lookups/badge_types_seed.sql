-- Seed: lookups.badge_types
-- Only badges that have code support in BadgeService.cs
-- Removed for dev phase: byte_streak_30, reactions_1000, followers_1k,
--   top_contributor (no trigger), speed_coder (no trigger), verified (manual admin)
INSERT INTO lookups.badge_types (name, label, icon, description) VALUES
  ('first_byte',    'First Byte',     '🥇', 'Posted your first byte'),
  ('byte_streak_7', '7-Day Streak',   '🔥', 'Posted bytes 7 days in a row'),
  ('byte_streak_30','30-Day Streak',  '🌠', 'Posted bytes 30 days in a row'),
  ('reactions_100', '100 Reactions',  '💡', 'Received 100 total reactions'),
  ('followers_100', '100 Followers',  '🌟', 'Reached 100 followers'),
  ('mentor',        'Mentor',         '🧑‍🏫', 'Left 50+ comments helping others'),
  ('early_adopter', 'Early Adopter',  '🚀', 'Joined during beta — you were here first')
ON CONFLICT (name) DO NOTHING;
