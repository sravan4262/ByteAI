-- Seed: users.notification_types
INSERT INTO users.notification_types (key, label, icon_name) VALUES
  ('like',     'Reaction',       'heart'),
  ('comment',  'Comment',        'message-circle'),
  ('follow',   'New Follower',   'user-plus'),
  ('unfollow', 'Unfollowed',     'user-minus'),
  ('badge',    'Badge Earned',   'award'),
  ('mention', 'Mention',         'at-sign'),
  ('system',          'System Notice',  'bell'),
  ('feedback_update', 'Feedback Update', 'message-square')
ON CONFLICT (key) DO NOTHING;
