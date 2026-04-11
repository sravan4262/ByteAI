-- ByteAI Seed Interview Question Comments
-- Alex (001) comments on Sarah's questions; Sarah (002) comments on Alex's questions

-- ── Alex comments on Sarah's AWS interview questions ──────────────────────
INSERT INTO interviews.interview_question_comments (id, question_id, author_id, body)
VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000006',  -- Sarah's VPC subnet question
  '00000000-0000-0000-0000-000000000001',  -- Alex
  'Great breakdown. One thing to add: you can associate a custom network ACL with a private subnet to add a stateless layer of defence on top of security groups.'
),
(
  '40000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000008',  -- Sarah's multi-region question
  '00000000-0000-0000-0000-000000000001',  -- Alex
  'The RPO/RTO framing is key — most candidates skip straight to DynamoDB Global Tables without defining their tolerance. This answer nails the order of priorities.'
)
ON CONFLICT DO NOTHING;

-- ── Alex comments on Sarah's Netflix interview questions ──────────────────
INSERT INTO interviews.interview_question_comments (id, question_id, author_id, body)
VALUES
(
  '40000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000009',  -- Sarah's HPA vs VPA question
  '00000000-0000-0000-0000-000000000001',  -- Alex
  'Worth mentioning KEDA here — it extends HPA with event-driven scaling (Kafka lag, queue depth, etc.) and has become the de-facto standard at Netflix-scale.'
)
ON CONFLICT DO NOTHING;

-- ── Sarah comments on Alex's Meta interview questions ─────────────────────
INSERT INTO interviews.interview_question_comments (id, question_id, author_id, body)
VALUES
(
  '40000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000001',  -- Alex's React reconciliation question
  '00000000-0000-0000-0000-000000000002',  -- Sarah
  'The fiber scheduler detail is what separates a good answer from a great one. Interviewers at Meta love asking about concurrent mode and time-slicing next.'
),
(
  '40000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000003',  -- Alex's code splitting question
  '00000000-0000-0000-0000-000000000002',  -- Sarah
  'The webpack magic comment tip is a nice detail. I''d also mention module federation if the interviewer asks about micro-frontend architectures — it comes up a lot.'
)
ON CONFLICT DO NOTHING;

-- ── Sarah comments on Alex's Vercel interview questions ───────────────────
INSERT INTO interviews.interview_question_comments (id, question_id, author_id, body)
VALUES
(
  '40000000-0000-0000-0000-000000000006',
  '30000000-0000-0000-0000-000000000004',  -- Alex's generic constraints question
  '00000000-0000-0000-0000-000000000002',  -- Sarah
  'Generic constraints trip up a lot of candidates. A good follow-up interviewers ask: can you write a function that merges two objects and preserves both types? Forces you to use conditional types too.'
)
ON CONFLICT DO NOTHING;
