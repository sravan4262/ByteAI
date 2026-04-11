-- ============================================================
-- MIGRATION: 004_dev_seed_user
-- Inserts a local development user matched to DevAuthHandler's hardcoded
-- ClerkId "seed_alex". Safe to run multiple times (INSERT ... ON CONFLICT DO NOTHING).
-- ============================================================

INSERT INTO users.users (
    id,
    clerk_id,
    username,
    display_name,
    bio,
    role_title,
    is_verified,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'seed_alex',
    'seed_alex',
    'Alex (Dev)',
    'Local dev user — auto-authenticated by DevAuthHandler',
    'Software Engineer',
    false,
    now(),
    now()
)
ON CONFLICT (clerk_id) DO NOTHING;
-- ClerkId "seed_alex" matches DevAuthHandler in ClerkJwtExtensions.cs (dev-only bypass)
