/**
 * ByteAI Seed Script
 * Seeds initial bytes into the database via the API.
 *
 * Usage:
 *   1. Start the backend: cd Service && dotnet run --project ByteAI.Api
 *   2. Get a dev JWT from https://jwt.io (payload: { "sub": "seed-user" })
 *   3. Run: TOKEN=<your-jwt> npx tsx scripts/seed.ts
 *
 * Or set TOKEN in your shell: export TOKEN=eyJ...
 */

const API_URL = process.env.API_URL ?? 'http://localhost:5239'
const TOKEN = process.env.TOKEN ?? ''

if (!TOKEN) {
  console.error('Error: TOKEN env var is required. Get a dev JWT from https://jwt.io')
  process.exit(1)
}

interface BytePayload {
  title: string
  body: string
  codeSnippet?: string
  language?: string
  tags: string[]
  type: string
}

const bytes: BytePayload[] = [
  // ── REACT ───────────────────────────────────────────────────────────────
  {
    title: 'useCallback vs useMemo: Stop Overusing Both',
    body: 'Neither hook prevents renders by default. The real win only comes when paired with React.memo — profile first, optimize second.',
    codeSnippet: `const memoized = useMemo(() => expensive(a, b), [a, b]);
const callback = useCallback((x) => doSomething(x, dep), [dep]);
// Neither prevents child renders without React.memo!`,
    language: 'typescript',
    tags: ['#REACT', '#HOOKS', '#PERFORMANCE'],
    type: 'byte',
  },
  {
    title: 'React Server Components: What Nobody Tells You',
    body: 'RSCs run only on the server — no hydration, no JS bundle. But mixing them with client components requires careful boundary design.',
    codeSnippet: `// Server Component - no "use client"
export default async function Page() {
  const data = await db.query(); // Direct DB access!
  return <ClientWrapper data={data} />;
}`,
    language: 'typescript',
    tags: ['#REACT', '#RSC', '#NEXT.JS'],
    type: 'byte',
  },
  {
    title: 'Key Prop Is Not Just For Lists',
    body: 'Using key to force a component to remount is a legitimate React pattern — great for resetting form state without complex useEffect chains.',
    codeSnippet: `// Force reset when userId changes
<UserForm key={userId} userId={userId} />`,
    language: 'typescript',
    tags: ['#REACT', '#PATTERNS'],
    type: 'byte',
  },
  // ── TYPESCRIPT ──────────────────────────────────────────────────────────
  {
    title: 'Discriminated Unions Beat Optional Fields',
    body: 'Instead of a type with many optional fields, model your states explicitly. TypeScript narrows the type for you — no runtime checks needed.',
    codeSnippet: `type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string }`,
    language: 'typescript',
    tags: ['#TYPESCRIPT', '#PATTERNS', '#TYPE-SAFETY'],
    type: 'byte',
  },
  {
    title: 'satisfies Operator Is Underrated',
    body: 'Use satisfies when you want type checking without widening. You get the literal type AND the validation. Best of both worlds.',
    codeSnippet: `const config = {
  port: 3000,
  host: 'localhost',
} satisfies Record<string, string | number>
// config.port is still type 3000, not number`,
    language: 'typescript',
    tags: ['#TYPESCRIPT', '#TYPE-SAFETY'],
    type: 'byte',
  },
  // ── RUST ────────────────────────────────────────────────────────────────
  {
    title: 'Rust Error Handling Patterns That Scale',
    body: 'The ? operator is just the beginning. Build composable error types with thiserror for clean, readable error chains.',
    codeSnippet: `#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Not found: {0}")]
    NotFound(String),
}`,
    language: 'rust',
    tags: ['#RUST', '#ERROR-HANDLING', '#PATTERNS'],
    type: 'byte',
  },
  {
    title: 'Rust Lifetimes in 30 Seconds',
    body: 'Lifetimes are just the compiler asking: "how long does this reference live?" Annotate when the compiler can\'t figure it out itself.',
    codeSnippet: `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}`,
    language: 'rust',
    tags: ['#RUST', '#LIFETIMES', '#MEMORY'],
    type: 'byte',
  },
  // ── GO ──────────────────────────────────────────────────────────────────
  {
    title: 'Go Interfaces Are Implicit — Use That',
    body: 'You don\'t declare that a type implements an interface. If the methods match, it qualifies. This makes Go incredibly composable.',
    codeSnippet: `type Writer interface { Write(p []byte) (n int, err error) }
// os.File, bytes.Buffer, net.Conn all satisfy Writer
// without ever saying so explicitly`,
    language: 'go',
    tags: ['#GO', '#INTERFACES', '#DESIGN'],
    type: 'byte',
  },
  {
    title: 'Go Goroutines Are Not Threads',
    body: 'Goroutines are multiplexed onto OS threads by the Go runtime. You can spawn millions cheaply — but always pair with sync primitives or channels.',
    codeSnippet: `var wg sync.WaitGroup
for _, url := range urls {
    wg.Add(1)
    go func(u string) {
        defer wg.Done()
        fetch(u)
    }(url)
}
wg.Wait()`,
    language: 'go',
    tags: ['#GO', '#CONCURRENCY', '#GOROUTINES'],
    type: 'byte',
  },
  // ── PYTHON ──────────────────────────────────────────────────────────────
  {
    title: 'Python Dataclasses Over Dicts',
    body: 'Stop passing raw dicts around. Dataclasses give you type hints, __repr__, and __eq__ for free — with zero boilerplate.',
    codeSnippet: `from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str
    active: bool = True`,
    language: 'python',
    tags: ['#PYTHON', '#DATACLASSES', '#CLEAN-CODE'],
    type: 'byte',
  },
  {
    title: 'Python Generators Save Memory',
    body: 'Processing 10M rows? Use a generator — it yields one item at a time instead of loading everything into memory.',
    codeSnippet: `def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()

for row in read_large_file("big.csv"):
    process(row)  # O(1) memory`,
    language: 'python',
    tags: ['#PYTHON', '#GENERATORS', '#PERFORMANCE'],
    type: 'byte',
  },
  // ── KUBERNETES ──────────────────────────────────────────────────────────
  {
    title: 'K8s Pod Security: Lock It Down',
    body: 'Most K8s deployments ship with default security contexts. Here\'s the minimum config to lock down your pods without breaking everything.',
    codeSnippet: `securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]`,
    language: 'yaml',
    tags: ['#KUBERNETES', '#SECURITY', '#DEVOPS'],
    type: 'byte',
  },
  {
    title: 'K8s Resource Limits Are Non-Negotiable',
    body: 'Without resource limits, a single rogue pod can starve the entire node. Set both requests (scheduling) and limits (enforcement).',
    codeSnippet: `resources:
  requests:
    memory: "128Mi"
    cpu: "250m"
  limits:
    memory: "256Mi"
    cpu: "500m"`,
    language: 'yaml',
    tags: ['#KUBERNETES', '#RELIABILITY', '#DEVOPS'],
    type: 'byte',
  },
  // ── AWS ─────────────────────────────────────────────────────────────────
  {
    title: 'IAM Least Privilege Is Not Optional',
    body: 'Every AWS service should have only the permissions it needs — nothing more. Start with deny-all and add specific allows.',
    codeSnippet: `{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
// NOT "s3:*" — ever`,
    language: 'json',
    tags: ['#AWS', '#IAM', '#SECURITY'],
    type: 'byte',
  },
  {
    title: 'AWS Lambda Cold Starts: Reduce Them',
    body: 'Cold starts spike latency. Keep functions warm with provisioned concurrency, minimize bundle size, and avoid VPC unless you need it.',
    tags: ['#AWS', '#LAMBDA', '#PERFORMANCE'],
    type: 'byte',
  },
  // ── DOCKER ──────────────────────────────────────────────────────────────
  {
    title: 'Multi-Stage Docker Builds Cut Image Size 10x',
    body: 'Build in one stage, copy only the artifact to a minimal runtime image. Your production image shouldn\'t have compilers or test deps.',
    codeSnippet: `FROM node:20 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runtime
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]`,
    language: 'dockerfile',
    tags: ['#DOCKER', '#DEVOPS', '#OPTIMIZATION'],
    type: 'byte',
  },
  // ── POSTGRES ────────────────────────────────────────────────────────────
  {
    title: 'EXPLAIN ANALYZE Before You Index',
    body: 'Don\'t add indexes blindly. Run EXPLAIN ANALYZE to see the actual query plan and cost. Index what the planner says it needs.',
    codeSnippet: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM bytes
WHERE author_id = $1
ORDER BY created_at DESC
LIMIT 20;`,
    language: 'sql',
    tags: ['#POSTGRES', '#DATABASE', '#PERFORMANCE'],
    type: 'byte',
  },
  {
    title: 'Partial Indexes Are Underused',
    body: 'If you only query a subset of rows (e.g., active users, unread notifications), a partial index is smaller and faster than a full one.',
    codeSnippet: `-- Only indexes unread notifications
CREATE INDEX idx_notifications_unread
ON notifications (user_id, created_at DESC)
WHERE read = false;`,
    language: 'sql',
    tags: ['#POSTGRES', '#INDEXING', '#DATABASE'],
    type: 'byte',
  },
  // ── AI / ML ─────────────────────────────────────────────────────────────
  {
    title: 'RAG Is Just Retrieval + Generation',
    body: 'Retrieval-Augmented Generation: embed your docs, store in a vector DB, retrieve top-k at query time, inject into the prompt. That\'s it.',
    tags: ['#AI', '#RAG', '#LLM'],
    type: 'byte',
  },
  {
    title: 'Vector Similarity: Cosine vs Dot Product',
    body: 'Use cosine similarity when vector magnitude doesn\'t matter (text embeddings). Use dot product when magnitude carries meaning (recommendation scores).',
    codeSnippet: `-- pgvector cosine similarity
SELECT id, title, embedding <=> $1 AS distance
FROM bytes
ORDER BY distance
LIMIT 10;`,
    language: 'sql',
    tags: ['#AI', '#VECTORS', '#PGVECTOR'],
    type: 'byte',
  },
  // ── REDIS ───────────────────────────────────────────────────────────────
  {
    title: 'Redis SETNX for Distributed Locks',
    body: 'Use SET ... NX EX for atomic distributed locking. Don\'t use SETNX + EXPIRE separately — that\'s two commands and not atomic.',
    codeSnippet: `# Atomic: set only if not exists, with expiry
SET lock:resource "owner-id" NX EX 30
# Returns OK if acquired, nil if already locked`,
    language: 'bash',
    tags: ['#REDIS', '#DISTRIBUTED-SYSTEMS', '#LOCKING'],
    type: 'byte',
  },
  // ── TERRAFORM ───────────────────────────────────────────────────────────
  {
    title: 'Terraform State Is Sacred',
    body: 'Never manually edit state. Use remote backends (S3 + DynamoDB lock) so your team shares a single source of truth and concurrent applies are blocked.',
    codeSnippet: `terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}`,
    language: 'hcl',
    tags: ['#TERRAFORM', '#DEVOPS', '#IaC'],
    type: 'byte',
  },
  // ── GRAPHQL ─────────────────────────────────────────────────────────────
  {
    title: 'N+1 Problem Kills GraphQL APIs',
    body: 'When resolving a list of users and their posts, naive resolvers fire one DB query per user. Use DataLoader to batch and cache queries.',
    tags: ['#GRAPHQL', '#PERFORMANCE', '#BACKEND'],
    type: 'byte',
  },
  // ── NODE.JS ─────────────────────────────────────────────────────────────
  {
    title: 'Node.js Event Loop in One Paragraph',
    body: 'Node is single-threaded but non-blocking. I/O callbacks, timers, and promises are queued and processed between iterations of the event loop. CPU-heavy work blocks it.',
    codeSnippet: `// This blocks the event loop for all requests:
app.get('/slow', (req, res) => {
  const result = heavyCpuWork(); // BAD
  res.json(result);
});
// Fix: offload to worker_threads or a job queue`,
    language: 'typescript',
    tags: ['#NODE.JS', '#EVENT-LOOP', '#PERFORMANCE'],
    type: 'byte',
  },
]

async function seed() {
  console.log(`Seeding ${bytes.length} bytes to ${API_URL}...`)
  let created = 0
  let failed = 0

  for (const byte of bytes) {
    try {
      const res = await fetch(`${API_URL}/api/bytes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(byte),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`  ✗ "${byte.title}" — ${res.status}: ${text}`)
        failed++
      } else {
        console.log(`  ✓ "${byte.title}"`)
        created++
      }
    } catch (err) {
      console.error(`  ✗ "${byte.title}" — ${err}`)
      failed++
    }
  }

  console.log(`\nDone: ${created} created, ${failed} failed`)
}

seed()
