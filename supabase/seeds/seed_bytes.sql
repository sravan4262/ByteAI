-- ByteAI Seed Bytes — Alex + Sarah only, max 3 tech stacks per domain
-- Explicit IDs so byte_tech_stacks can reference them
INSERT INTO bytes.bytes (id, author_id, title, body, code_snippet, language, type)
VALUES

-- ── FRONTEND: React (alex) ─────────────────────────────────────────────────
('10000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'useCallback vs useMemo: Stop Overusing Both',
 'Neither hook prevents renders by default. The real win only comes when paired with React.memo — profile first, optimize second.',
 E'const memoized = useMemo(() => expensive(a, b), [a, b]);\nconst callback = useCallback((x) => doSomething(x, dep), [dep]);\n// Neither prevents child renders without React.memo!',
 'typescript', 'article'),

('10000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'Key Prop Is Not Just For Lists',
 'Using key to force a component to remount is a legitimate React pattern — great for resetting form state without complex useEffect chains.',
 E'// Force reset when userId changes\n<UserForm key={userId} userId={userId} />',
 'typescript', 'article'),

-- ── FRONTEND: TypeScript (alex) ────────────────────────────────────────────
('10000000-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000001',
 'Discriminated Unions Beat Optional Fields',
 'Instead of a type with many optional fields, model your states explicitly. TypeScript narrows the type for you — no runtime checks needed.',
 E'type State =\n  | { status: ''idle'' }\n  | { status: ''loading'' }\n  | { status: ''success''; data: User }\n  | { status: ''error''; error: string }',
 'typescript', 'article'),

('10000000-0000-0000-0000-000000000004',
 '00000000-0000-0000-0000-000000000001',
 'satisfies Operator Is Underrated',
 'Use satisfies when you want type checking without widening. You get the literal type AND the validation. Best of both worlds.',
 E'const config = {\n  port: 3000,\n  host: ''localhost'',\n} satisfies Record<string, string | number>\n// config.port is still type 3000, not number',
 'typescript', 'article'),

-- ── FRONTEND: Next.js (alex) ───────────────────────────────────────────────
('10000000-0000-0000-0000-000000000005',
 '00000000-0000-0000-0000-000000000001',
 'React Server Components: What Nobody Tells You',
 'RSCs run only on the server — no hydration, no JS bundle. But mixing them with client components requires careful boundary design.',
 E'// Server Component — no "use client"\nexport default async function Page() {\n  const data = await db.query();\n  return <ClientWrapper data={data} />;\n}',
 'typescript', 'article'),

('10000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000001',
 'Next.js App Router Cache Is Aggressive',
 'By default the App Router caches fetch responses, full routes, and router segments. Opt out explicitly with cache: no-store or revalidate: 0.',
 E'// Opt out of caching for dynamic data\nconst res = await fetch(url, { cache: ''no-store'' });\n\n// Or revalidate every 60 s\nconst res = await fetch(url, { next: { revalidate: 60 } });',
 'typescript', 'article'),

-- ── DEVOPS: Kubernetes (sarah) ────────────────────────────────────────────
('10000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000002',
 'K8s Pod Security: Lock It Down',
 'Most K8s deployments ship with default security contexts. Here''s the minimum config to lock down your pods without breaking everything.',
 E'securityContext:\n  runAsNonRoot: true\n  runAsUser: 1000\n  readOnlyRootFilesystem: true\n  capabilities:\n    drop: ["ALL"]',
 'yaml', 'article'),

('10000000-0000-0000-0000-000000000008',
 '00000000-0000-0000-0000-000000000002',
 'K8s Resource Limits Are Non-Negotiable',
 'Without resource limits, a single rogue pod can starve the entire node. Set both requests (scheduling) and limits (enforcement).',
 E'resources:\n  requests:\n    memory: "128Mi"\n    cpu: "250m"\n  limits:\n    memory: "256Mi"\n    cpu: "500m"',
 'yaml', 'article'),

-- ── DEVOPS: AWS (sarah) ───────────────────────────────────────────────────
('10000000-0000-0000-0000-000000000009',
 '00000000-0000-0000-0000-000000000002',
 'IAM Least Privilege Is Not Optional',
 'Every AWS service should have only the permissions it needs — nothing more. Start with deny-all and add specific allows.',
 E'{\n  "Effect": "Allow",\n  "Action": ["s3:GetObject"],\n  "Resource": "arn:aws:s3:::my-bucket/*"\n}\n-- NOT "s3:*" — ever',
 'json', 'article'),

('10000000-0000-0000-0000-000000000010',
 '00000000-0000-0000-0000-000000000002',
 'AWS Lambda Cold Starts: Reduce Them',
 'Cold starts spike latency. Keep functions warm with provisioned concurrency, minimize bundle size, and avoid VPC unless you need it.',
 NULL, NULL, 'article'),

-- ── DEVOPS: Docker (sarah) ────────────────────────────────────────────────
('10000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000002',
 'Multi-Stage Docker Builds Cut Image Size 10x',
 'Build in one stage, copy only the artifact to a minimal runtime image. Your production image shouldn''t have compilers or test deps.',
 E'FROM node:20 AS build\nWORKDIR /app\nCOPY . .\nRUN npm ci && npm run build\n\nFROM node:20-alpine AS runtime\nCOPY --from=build /app/dist ./dist\nCMD ["node", "dist/index.js"]',
 'dockerfile', 'article'),

('10000000-0000-0000-0000-000000000012',
 '00000000-0000-0000-0000-000000000002',
 '.dockerignore Is Not Optional',
 'Without .dockerignore your build context ships node_modules, .git, and .env to the daemon. A 500 MB build context becomes a 5 MB one.',
 E'# .dockerignore\nnode_modules\n.git\n.env*\ndist\ncoverage\n*.log',
 'dockerfile', 'article')

ON CONFLICT DO NOTHING;
