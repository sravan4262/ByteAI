-- ============================================================
-- SEED: System seed user
-- Used as author_id for all seeded bytes and interviews.
-- supabase_user_id = NULL — internal system user, no auth.users entry.
-- ============================================================

INSERT INTO users.users (
    id,
    supabase_user_id,
    email,
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
    is_onboarded,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'system@byteai.internal',
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
    true,
    now(),
    now()
)
ON CONFLICT (username) DO NOTHING;
