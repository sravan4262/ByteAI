"""
ByteAI seed script — generates bytes, interviews + nomic-embed-text-v1.5 embeddings.

Requirements:
    pip install onnxruntime transformers numpy

Usage:
    python3 scripts/seed_data.py
    # paste output into Supabase SQL editor
"""

import uuid
import sys
import numpy as np
from datetime import datetime, timezone

# ── Config ───────────────────────────────────────────────────────────────────
MODEL_PATH = "Service/ByteAI.Api/models/nomic-embed-text-v1.5.onnx"
VOCAB_PATH  = "Service/ByteAI.Api/models/vocab.txt"
DOCUMENT_PREFIX = "search_document: "

# ── Load model ───────────────────────────────────────────────────────────────
try:
    import onnxruntime as ort
    from transformers import BertTokenizerFast

    tokenizer = BertTokenizerFast(vocab_file=VOCAB_PATH, do_lower_case=True)
    session   = ort.InferenceSession(MODEL_PATH)
    print("-- Model loaded", file=sys.stderr)
except Exception as e:
    print(f"-- ERROR loading model: {e}", file=sys.stderr)
    sys.exit(1)


def embed(text: str) -> list[float]:
    full = DOCUMENT_PREFIX + text
    enc  = tokenizer(full, max_length=512, truncation=True, return_tensors="np")

    outputs = session.run(None, {
        "input_ids":      enc["input_ids"].astype(np.int64),
        "attention_mask": enc["attention_mask"].astype(np.int64),
        "token_type_ids": enc["token_type_ids"].astype(np.int64),
    })

    hidden = outputs[0]                          # (1, seq_len, 768)
    mask   = enc["attention_mask"][..., np.newaxis].astype(float)
    pooled = (hidden * mask).sum(axis=1) / mask.sum(axis=1)
    norm   = np.linalg.norm(pooled, axis=1, keepdims=True)
    vec    = (pooled / norm)[0]
    return vec.tolist()


def pg_vector(floats: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in floats) + "]"


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


# ── Fixed IDs ────────────────────────────────────────────────────────────────
USER_ID = str(uuid.uuid4())

BYTE_IDS       = [str(uuid.uuid4()) for _ in range(4)]
INTERVIEW_IDS  = [str(uuid.uuid4()) for _ in range(4)]
IQ_IDS         = [str(uuid.uuid4()) for _ in range(8)]   # 2 questions per interview


# ── Sample content ───────────────────────────────────────────────────────────
BYTES = [
    {
        "id":    BYTE_IDS[0],
        "title": "Angular Signals: Reactive State Without RxJS",
        "body":  "Angular 17 introduced Signals as a first-class reactive primitive. Unlike Subjects, a Signal is synchronous and fine-grained — only the parts of the template that read a signal re-render. Use computed() for derived values and effect() for side effects. Signals interop with RxJS via toSignal() and toObservable().",
        "code":  "const count = signal(0);\nconst doubled = computed(() => count() * 2);\neffect(() => console.log('count is', count()));",
        "lang":  "typescript",
        "type":  "article",
    },
    {
        "id":    BYTE_IDS[1],
        "title": "Angular Standalone Components — No More NgModule",
        "body":  "Standalone components in Angular 14+ let you declare a component without belonging to any NgModule. Add standalone: true in the decorator and list imports directly. This removes the ceremony of shared modules and makes tree-shaking more predictable. Use bootstrapApplication() instead of platformBrowserDynamic() to bootstrap.",
        "code":  "@Component({\n  standalone: true,\n  imports: [CommonModule, RouterModule],\n  selector: 'app-root',\n  template: '<router-outlet />'\n})\nexport class AppComponent {}",
        "lang":  "typescript",
        "type":  "article",
    },
    {
        "id":    BYTE_IDS[2],
        "title": "React useTransition — Keep UI Responsive During Heavy Updates",
        "body":  "useTransition marks a state update as non-urgent, letting React interrupt it if a higher-priority update arrives (e.g. a keystroke). The hook returns [isPending, startTransition]. Wrap expensive state updates (filtering a large list, navigating between tabs) inside startTransition. The UI stays interactive while the transition runs in the background.",
        "code":  "const [isPending, startTransition] = useTransition();\n\nfunction handleTabChange(tab) {\n  startTransition(() => setActiveTab(tab));\n}",
        "lang":  "typescript",
        "type":  "article",
    },
    {
        "id":    BYTE_IDS[3],
        "title": "React Server Components — What Actually Runs on the Server",
        "body":  "React Server Components (RSC) run exclusively on the server and ship zero JS to the client. They can directly await database queries or fetch calls, read env vars, and access the filesystem. They cannot use state, effects, or browser APIs. Client Components opt in with 'use client' at the top — they hydrate on the browser and can still be imported inside Server Components.",
        "code":  "// page.tsx — Server Component by default\nexport default async function Page() {\n  const data = await db.query('SELECT * FROM posts');\n  return <PostList posts={data} />;\n}",
        "lang":  "typescript",
        "type":  "article",
    },
]

INTERVIEWS = [
    {
        "id":       INTERVIEW_IDS[0],
        "title":    "How does Angular Change Detection work with OnPush strategy?",
        "body":     "Angular's default change detection checks every component on every event. OnPush limits checks to: (1) an @Input reference changes, (2) an event originates from the component, (3) an async pipe resolves, or (4) ChangeDetectorRef.markForCheck() is called. Combined with immutable data and Signals, OnPush can eliminate most unnecessary renders.",
        "company":  "Google",
        "role":     "Frontend Engineer",
        "difficulty": "medium",
        "type":     "interview",
        "questions": [
            {
                "id":   IQ_IDS[0],
                "q":    "When does OnPush NOT prevent a check from running?",
                "a":    "When an event listener (click, input) fires inside the component, Angular still runs CD for that component and its ancestors. Also markForCheck() and async pipe always schedule a check.",
                "diff": "medium",
                "order": 1,
            },
            {
                "id":   IQ_IDS[1],
                "q":    "How do Signals interact with OnPush?",
                "a":    "Signals automatically call markForCheck() on any component that reads them during the last render cycle, so you get fine-grained reactivity without manually calling ChangeDetectorRef.",
                "diff": "hard",
                "order": 2,
            },
        ],
    },
    {
        "id":       INTERVIEW_IDS[1],
        "title":    "Explain the difference between Angular RouterModule.forRoot and forChild",
        "body":     "forRoot() registers the Router service and should be called exactly once in the root AppModule (or bootstrapApplication). It owns the router-outlet and handles navigation globally. forChild() adds routes to the existing router without re-creating the service — used in feature modules to lazy-load routes.",
        "company":  "Microsoft",
        "role":     "Angular Developer",
        "difficulty": "easy",
        "type":     "interview",
        "questions": [
            {
                "id":   IQ_IDS[2],
                "q":    "What happens if you call forRoot() twice?",
                "a":    "You get two Router instances, breaking navigation. Angular warns about this. Use RouterModule.forChild() in feature modules and always guard with a 'guard' provider if building a library.",
                "diff": "medium",
                "order": 1,
            },
            {
                "id":   IQ_IDS[3],
                "q":    "How do you lazy-load a feature module?",
                "a":    "Use loadChildren in the route config: { path: 'admin', loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) }. For standalone routes use loadComponent instead.",
                "diff": "easy",
                "order": 2,
            },
        ],
    },
    {
        "id":       INTERVIEW_IDS[2],
        "title":    "What is the React reconciliation algorithm and how does it decide what to re-render?",
        "body":     "React's reconciler (Fiber) diffs the new virtual DOM tree against the previous one. It uses two heuristics: (1) Elements of different types produce completely different trees — the old subtree is unmounted. (2) Elements with the same type are updated in place. The key prop is the escape hatch: changing a key forces React to unmount and remount the element even if the type is the same.",
        "company":  "Meta",
        "role":     "React Engineer",
        "difficulty": "hard",
        "type":     "interview",
        "questions": [
            {
                "id":   IQ_IDS[4],
                "q":    "Why should keys be stable and unique, not array indexes?",
                "a":    "Using indexes as keys causes React to reuse DOM nodes incorrectly when items are reordered or deleted, leading to state being attached to the wrong component. Use stable IDs from your data instead.",
                "diff": "medium",
                "order": 1,
            },
            {
                "id":   IQ_IDS[5],
                "q":    "What is the purpose of the Fiber architecture over the old stack reconciler?",
                "a":    "Fiber makes reconciliation interruptible. The old stack reconciler was synchronous and could block the main thread for large trees. Fiber assigns priority to work units and can pause, resume, or abort them — enabling features like useTransition and Suspense.",
                "diff": "hard",
                "order": 2,
            },
        ],
    },
    {
        "id":       INTERVIEW_IDS[3],
        "title":    "Explain useCallback and useMemo — when should you actually use them?",
        "body":     "useMemo caches a computed value between renders; useCallback caches a function reference. Both only matter when the memoized value is passed to a child wrapped in React.memo, or is a dependency of another hook. Premature memoization adds overhead (cache comparison + closure allocation) for no benefit. Profile first, then memoize.",
        "company":  "Airbnb",
        "role":     "Senior Frontend Engineer",
        "difficulty": "medium",
        "type":     "interview",
        "questions": [
            {
                "id":   IQ_IDS[6],
                "q":    "What is referential equality and why does it matter in React?",
                "a":    "In JS, {} === {} is false even if the contents are identical. React.memo and hook dependency arrays compare by reference, so a new object/function on every render will still cause re-renders even if values are the same.",
                "diff": "easy",
                "order": 1,
            },
            {
                "id":   IQ_IDS[7],
                "q":    "When would you NOT use useMemo?",
                "a":    "For cheap computations, for values that change on every render anyway, or when the component is never re-rendered from a parent. The comparison and cache overhead can outweigh the savings for trivial operations.",
                "diff": "medium",
                "order": 2,
            },
        ],
    },
]


# ── Build SQL ─────────────────────────────────────────────────────────────────
lines = []

lines.append("-- =============================================")
lines.append("-- ByteAI seed data — generated by seed_data.py")
lines.append("-- =============================================")
lines.append("")

# 1. Clean up (preserve lookups)
lines.append("-- Clean up")
lines.append("DELETE FROM interviews.interview_question_comments;")
lines.append("DELETE FROM interviews.interview_question_likes;")
lines.append("DELETE FROM interviews.interview_questions;")
lines.append("DELETE FROM interviews.interview_comments;")
lines.append("DELETE FROM interviews.interview_likes;")
lines.append("DELETE FROM interviews.interview_views;")
lines.append("DELETE FROM interviews.interview_tech_stacks;")
lines.append("DELETE FROM interviews.interview_bookmarks;")
lines.append("DELETE FROM interviews.interviews;")
lines.append("")
lines.append("DELETE FROM bytes.comments;")
lines.append("DELETE FROM bytes.user_likes;")
lines.append("DELETE FROM bytes.user_bookmarks;")
lines.append("DELETE FROM bytes.user_views;")
lines.append("DELETE FROM bytes.byte_tech_stacks;")
lines.append("DELETE FROM bytes.bytes;")
lines.append("")
lines.append("DELETE FROM users.follows;")
lines.append("DELETE FROM users.notifications;")
lines.append("DELETE FROM users.user_badges;")
lines.append("DELETE FROM users.user_feed_preferences;")
lines.append("DELETE FROM users.user_tech_stacks;")
lines.append("DELETE FROM users.users;")
lines.append("")

# 2. Insert user
lines.append("-- User")
lines.append(f"""INSERT INTO users.users (id, clerk_id, username, display_name, bio, role_title, company, avatar_url, level, xp, streak, is_verified, created_at, updated_at)
VALUES (
  '{USER_ID}',
  'user_dev_seed',
  'devbyte',
  'Dev Byte',
  'Full-stack engineer obsessed with React and Angular. Building ByteAI.',
  'Senior Frontend Engineer',
  'ByteAI',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=devbyte',
  3, 1250, 7, true,
  '{now()}', '{now()}'
);""")
lines.append("")

# 3. Insert bytes with embeddings
lines.append("-- Bytes")
for b in BYTES:
    print(f"-- Embedding byte: {b['title']}", file=sys.stderr)
    vec = embed(b["body"] + ("\n" + b["code"] if b.get("code") else ""))
    pg_vec = pg_vector(vec)
    code_val = f"$${b['code']}$$" if b.get("code") else "NULL"
    lang_val = f"'{b['lang']}'" if b.get("lang") else "NULL"
    lines.append(f"""INSERT INTO bytes.bytes (id, author_id, title, body, code_snippet, language, embedding, type, is_active, created_at, updated_at)
VALUES (
  '{b["id"]}',
  '{USER_ID}',
  $${b["title"]}$$,
  $${b["body"]}$$,
  {code_val},
  {lang_val},
  '{pg_vec}'::vector,
  '{b["type"]}',
  true,
  '{now()}', '{now()}'
);""")
lines.append("")

# 4. Insert interviews + questions with embeddings
lines.append("-- Interviews")
for iv in INTERVIEWS:
    print(f"-- Embedding interview: {iv['title']}", file=sys.stderr)
    vec = embed(iv["body"])
    pg_vec = pg_vector(vec)
    company_val = f"'{iv['company']}'" if iv.get("company") else "NULL"
    role_val    = f"'{iv['role']}'"    if iv.get("role")    else "NULL"
    lines.append(f"""INSERT INTO interviews.interviews (id, author_id, title, body, company, role, difficulty, embedding, type, is_active, created_at, updated_at)
VALUES (
  '{iv["id"]}',
  '{USER_ID}',
  $${iv["title"]}$$,
  $${iv["body"]}$$,
  {company_val},
  {role_val},
  '{iv["difficulty"]}',
  '{pg_vec}'::vector,
  '{iv["type"]}',
  true,
  '{now()}', '{now()}'
);""")
    lines.append("")
    lines.append(f"-- Questions for interview {iv['id'][:8]}")
    for q in iv["questions"]:
        lines.append(f"""INSERT INTO interviews.interview_questions (id, interview_id, question, answer, order_index, created_at)
VALUES (
  '{q["id"]}',
  '{iv["id"]}',
  $${q["q"]}$$,
  $${q["a"]}$$,
  {q["order"]},
  '{now()}'
);""")
    lines.append("")

print("\n".join(lines))
print("-- Done", file=sys.stderr)
