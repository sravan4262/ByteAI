-- Seed: users.notification_types
INSERT INTO users.notification_types (key, label, icon_name) VALUES
  ('like',     'Reaction',       'heart'),
  ('comment',  'Comment',        'message-circle'),
  ('follow',   'New Follower',   'user-plus'),
  ('unfollow', 'Unfollowed',     'user-minus'),
  ('badge',    'Badge Earned',   'award'),
  ('system',   'System Notice',  'bell')
ON CONFLICT (key) DO NOTHING;
