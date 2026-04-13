-- ============================================================
-- SEED: System seed user
-- Used as author_id for all seeded bytes and interviews.
-- clerk_id = 'seed_system' — never created in Clerk, internal only.
-- ============================================================

INSERT INTO users.users (
    id,
    clerk_id,
    username,
    display_name,
    bio,
    role_title,
    company,
    avatar_url,
    level,
    xp,
    streak,
    is_verified,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'seed_system',
    'byteai',
    'ByteAI',
    'Official ByteAI content — curated technical bytes across every domain.',
    'Content System',
    'ByteAI',
    'https://api.dicebear.com/7.x/bottts/svg?seed=byteai',
    99,
    999999,
    0,
    true,
    now(),
    now()
)
ON CONFLICT (clerk_id) DO NOTHING;
