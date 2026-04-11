-- ByteAI Seed Users — 2 profiles only
-- NOTE: tech_stack and feed_preferences use junction tables (user_tech_stacks, user_feed_preferences)
INSERT INTO users.users (id, clerk_id, username, display_name, bio, role_title, company, level, xp, streak, is_verified)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'seed_alex',  'alex_xu',      'Alex Xu',      'Building fast UIs. React obsessive, performance nerd.',        'SR. FRONTEND ENG',    'VERCEL',   9,  7240, 21, true),
  ('00000000-0000-0000-0000-000000000002', 'seed_sarah', 'sarah_conway', 'Sarah Conway', 'Principal cloud architect. AWS + K8s evangelist.',             'PRINCIPAL CLOUD ARCH','HYPERION', 12, 15000,45, true)
ON CONFLICT (clerk_id) DO NOTHING;
