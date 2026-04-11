-- ByteAI Seed Interviews — 2 interviews per user with Q&A questions
-- Explicit IDs so interview_questions and comments can reference them

-- ── Alex's Interviews ─────────────────────────────────────────────────────
INSERT INTO interviews.interviews (id, author_id, title, body, company, role, difficulty, type)
VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Frontend Engineer Interview at Meta',
  E'Q1: How does React reconciliation work?\nA: React builds a virtual DOM tree and diffs it against the previous tree using the fiber algorithm. Only changed nodes are flushed to the real DOM.\n\nQ2: How do you avoid layout thrash in CSS animations?\nA: Use transform and opacity — they only trigger the composite step. Avoid animating width, height, or top/left which force layout recalculation.\n\nQ3: Walk me through your code splitting strategy.\nA: I use dynamic import() with React.lazy and Suspense at route boundaries. For large component libraries I also tree-shake by importing from individual files.',
  'Meta', 'Frontend Engineer', 'hard', 'interview'
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'TypeScript Deep Dive at Vercel',
  E'Q1: What are generic constraints and when do you use them?\nA: Generic constraints (extends) restrict the types a type parameter can accept. Use them when you need to access a specific property on the generic type without losing type safety.\n\nQ2: How does TypeScript narrow types inside conditional blocks?\nA: TypeScript uses control-flow analysis. typeof, instanceof, in checks, and discriminant properties all narrow the type. A custom type guard (x is T) lets you encode the narrowing logic in a reusable function.',
  'Vercel', 'Frontend Engineer', 'medium', 'interview'
)
ON CONFLICT DO NOTHING;

-- ── Sarah's Interviews ─────────────────────────────────────────────────────
INSERT INTO interviews.interviews (id, author_id, title, body, company, role, difficulty, type)
VALUES
(
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Cloud Engineer Interview at AWS',
  E'Q1: Explain the difference between a public and private subnet in a VPC.\nA: A public subnet has a route to an internet gateway. A private subnet routes outbound traffic through a NAT gateway. Resources in private subnets are not directly reachable from the internet.\n\nQ2: When would you use a resource-based policy vs IAM policy?\nA: IAM policies are identity-based and attached to a principal. Resource-based policies (e.g., S3 bucket policy) are attached to the resource and can grant cross-account access without assuming a role.\n\nQ3: How do you design for multi-region availability on AWS?\nA: Replicate data with DynamoDB Global Tables or RDS read replicas. Use Route 53 latency/failover routing. Front everything with CloudFront. Keep RPO/RTO targets explicit.',
  'AWS', 'Cloud Engineer', 'hard', 'interview'
),
(
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  'DevOps Engineer Interview at Netflix',
  E'Q1: HPA vs VPA in Kubernetes — when do you use each?\nA: HPA (Horizontal Pod Autoscaler) scales the number of replicas based on CPU/memory or custom metrics — best for stateless workloads. VPA (Vertical Pod Autoscaler) adjusts resource requests/limits on existing pods — useful when you cannot scale horizontally.\n\nQ2: How do you achieve zero-downtime deployments?\nA: Use rolling updates with maxUnavailable: 0 and a proper readiness probe so the load balancer only routes to healthy pods. Pair with PodDisruptionBudgets to prevent too many pods going down at once during node drain.',
  'Netflix', 'DevOps Engineer', 'medium', 'interview'
)
ON CONFLICT DO NOTHING;

-- ── Interview Questions ────────────────────────────────────────────────────

-- Alex's Meta interview questions
INSERT INTO interviews.interview_questions (id, interview_id, question, answer, order_index)
VALUES
(
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'How does React reconciliation work under the hood?',
  'React builds a virtual DOM tree and diffs it against the previous tree using the fiber algorithm. Work is split into units so the browser stays responsive. Only changed nodes are flushed to the real DOM in the commit phase.',
  0
),
(
  '30000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'How do you avoid layout thrash in CSS animations?',
  'Use transform and opacity — they only trigger the composite step and are GPU-accelerated. Avoid animating width, height, top, or left which force layout recalculation on every frame.',
  1
),
(
  '30000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  'Walk me through your code splitting strategy.',
  'I use dynamic import() with React.lazy and Suspense at route boundaries. For large component libraries I tree-shake by importing from individual files. I also use webpack magic comments to name async chunks for better debugging.',
  2
)
ON CONFLICT DO NOTHING;

-- Alex's Vercel interview questions
INSERT INTO interviews.interview_questions (id, interview_id, question, answer, order_index)
VALUES
(
  '30000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000002',
  'What are generic constraints and when do you use them?',
  'Generic constraints (extends keyword) restrict the types a type parameter can accept. Use them when you need to access a specific property on the generic type — e.g., <T extends { id: string }> lets you safely read T.id without casting.',
  0
),
(
  '30000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000002',
  'How does TypeScript narrow types inside conditional blocks?',
  'TypeScript uses control-flow analysis. typeof, instanceof, in checks, and discriminant property comparisons all narrow the type. A custom type guard function (x is T) encodes the narrowing logic reusably.',
  1
)
ON CONFLICT DO NOTHING;

-- Sarah's AWS interview questions
INSERT INTO interviews.interview_questions (id, interview_id, question, answer, order_index)
VALUES
(
  '30000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000003',
  'Explain the difference between a public and private subnet in a VPC.',
  'A public subnet has a route to an internet gateway so resources can have public IPs. A private subnet routes outbound traffic through a NAT gateway — resources are not reachable from the internet directly.',
  0
),
(
  '30000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000003',
  'When would you use a resource-based policy vs an IAM policy?',
  'IAM policies are identity-based and attached to a principal (user, role). Resource-based policies (e.g., S3 bucket policy, Lambda resource policy) are attached to the resource and can grant cross-account access without assuming a role.',
  1
),
(
  '30000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000003',
  'How do you design for multi-region availability on AWS?',
  'Replicate data with DynamoDB Global Tables or RDS read replicas with automatic failover. Use Route 53 latency or failover routing. Front everything with CloudFront. Define explicit RPO and RTO targets — they drive every architecture decision.',
  2
)
ON CONFLICT DO NOTHING;

-- Sarah's Netflix interview questions
INSERT INTO interviews.interview_questions (id, interview_id, question, answer, order_index)
VALUES
(
  '30000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000004',
  'HPA vs VPA in Kubernetes — when do you use each?',
  'HPA (Horizontal Pod Autoscaler) scales the number of replicas based on CPU/memory or custom metrics — best for stateless workloads. VPA (Vertical Pod Autoscaler) adjusts resource requests/limits on existing pods — useful when horizontal scaling is not possible, e.g., a singleton service.',
  0
),
(
  '30000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000004',
  'How do you achieve zero-downtime deployments in Kubernetes?',
  'Use rolling updates with maxUnavailable: 0 and maxSurge: 1 so there is always at least one healthy pod. Write a proper readiness probe so the load balancer only routes to pods that are actually ready. Add a PodDisruptionBudget to protect availability during node drains.',
  1
)
ON CONFLICT DO NOTHING;
