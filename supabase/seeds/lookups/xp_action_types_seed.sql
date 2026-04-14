-- Seed: lookups.xp_action_types
-- Centralised XP economy. Handlers read xp_amount from here instead of hardcoding values.
-- max_per_day = NULL means no cap (all actions are uncapped).
-- is_one_time  = TRUE means the user can only earn it once ever.

INSERT INTO lookups.xp_action_types
  (name, label, description, xp_amount, max_per_day, is_one_time, icon, is_active, created_at, updated_at)
VALUES

  -- ── Content creation ─────────────────────────────────────────────────────
  ('post_byte',
   'Post a Byte',
   'Awarded each time you publish a byte to the feed.',
   20, NULL, FALSE, '✦', TRUE, now(), now()),

  ('post_interview',
   'Share an Interview',
   'Awarded when you publish a tech interview experience.',
   30, NULL, FALSE, '🎯', TRUE, now(), now()),

  ('post_comment',
   'Leave a Comment',
   'Awarded when you comment on a byte or interview.',
   2, NULL, FALSE, '💬', TRUE, now(), now()),

  -- ── Receiving engagement ─────────────────────────────────────────────────
  ('receive_reaction',
   'Reaction Received',
   'Awarded to the byte author each time someone reacts.',
   5, NULL, FALSE, '💡', TRUE, now(), now()),

  ('receive_comment',
   'Comment Received',
   'Awarded to the author when someone comments on their content.',
   3, NULL, FALSE, '📨', TRUE, now(), now()),

  ('byte_saved_by_user',
   'Byte Bookmarked',
   'Awarded when another user saves your byte.',
   3, NULL, FALSE, '🔖', TRUE, now(), now()),

  ('interview_saved_by_user',
   'Interview Bookmarked',
   'Awarded when another user saves your interview.',
   4, NULL, FALSE, '🔖', TRUE, now(), now()),

  -- ── Social graph ─────────────────────────────────────────────────────────
  ('get_followed',
   'New Follower',
   'Awarded when someone follows you.',
   10, NULL, FALSE, '👤', TRUE, now(), now()),

  -- ── Streaks & engagement ─────────────────────────────────────────────────
  ('daily_login',
   'Daily Check-in',
   'Awarded once per day when you open the app.',
   5, 1, FALSE, '📅', TRUE, now(), now()),

  ('streak_milestone_7',
   '7-Day Streak',
   'Bonus XP for maintaining a 7-day posting streak.',
   50, NULL, FALSE, '🔥', TRUE, now(), now()),

  ('streak_milestone_30',
   '30-Day Streak',
   'Bonus XP for maintaining a 30-day posting streak.',
   200, NULL, FALSE, '🌠', TRUE, now(), now()),

  -- ── One-time profile milestones ───────────────────────────────────────────
  ('first_byte',
   'First Byte Posted',
   'One-time bonus for publishing your very first byte.',
   25, NULL, TRUE, '🥇', TRUE, now(), now()),

  ('profile_complete',
   'Profile Completed',
   'One-time bonus for filling in bio, tech stack, and at least one social link.',
   50, NULL, TRUE, '✅', TRUE, now(), now()),

  ('github_linked',
   'GitHub Linked',
   'One-time bonus for connecting your GitHub profile.',
   15, NULL, TRUE, '🐙', TRUE, now(), now())

ON CONFLICT (name) DO NOTHING;
