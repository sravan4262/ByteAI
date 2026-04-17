"""
ByteAI — Byte Content Generator
Reads each *-seed.md file, calls Claude Code CLI or Groq per (tech_stack × topic),
and fills bytes[] in each {tech_stack}-seed.json.

Usage:
    # All domains (auto-routes: Groq for GROQ_DOMAINS, Claude CLI for the rest)
    python3 seeds/generate-seed-json.py

    # Single domain
    python3 seeds/generate-seed-json.py --domain frontend

    # Single subdomain
    python3 seeds/generate-seed-json.py --domain frontend --subdomain ui_frameworks

    # Single tech stack
    python3 seeds/generate-seed-json.py --domain frontend --subdomain ui_frameworks --tech_stack react

    # Limit topics per stack (used for blockchain)
    python3 seeds/generate-seed-json.py --domain blockchain --max-topics 2

Resumable: already-generated topics (status=done) are skipped on rerun.
Requires: GROQ_API_KEY env var for Groq domains; claude CLI for the rest.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── Args ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--domain",     default=None)
parser.add_argument("--subdomain",  default=None)
parser.add_argument("--tech_stack", default=None)
parser.add_argument("--max-topics", type=int, default=None,
                    help="Max topics per stack (blockchain auto-sets to 2)")
parser.add_argument("--sequential", action="store_true",
                    help="Process topics one at a time (no threads). Recommended for Claude CLI domains.")
args = parser.parse_args()

# ── Config (Claude CLI) ───────────────────────────────────────────────────────
SEEDS_BASE  = os.path.dirname(__file__)
RETRY_LIMIT = 3
RETRY_DELAY = 3
CLAUDE_CMD  = "/Users/sravanravula/Library/Application Support/Claude/claude-code/2.1.101/claude.app/Contents/MacOS/claude"

# ── Config (Groq) ─────────────────────────────────────────────────────────────
GROQ_API_KEY          = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL            = "llama-3.1-8b-instant"
GROQ_RPM              = 30
GROQ_DOMAINS          = {"blockchain", "gaming", "mobile", "security", "systems"}
BLOCKCHAIN_MAX_TOPICS = 2

# ── Prompt ───────────────────────────────────────────────────────────────────
def build_prompt(tech_stack: str, domain: str, subdomain: str, topic: str) -> str:
    return f"""\
You are a technical content writer for ByteAI, a short-form tech content platform (think Inshorts for developers).

Write a single "byte" — a concise, high-signal technical article for a developer who uses {tech_stack} daily.

Tech stack: {tech_stack}
Domain: {domain} › {subdomain}
Topic: {topic}

Rules:
- Be specific to {tech_stack}. Never write generic content that applies to any stack.
- Body: 150–200 words. Dense, practical, no fluff.
- Use correct {tech_stack} terminology and APIs.
- Code snippet: 5–15 lines, runnable, idiomatic. Set to null if purely conceptual.
- Title: MUST include the tech stack name ({tech_stack}). Specific and punchy (e.g. "React memo() — When It Helps and When It Doesn't", not "memo() — When It Helps and When It Doesn't").
- Do not start body with "In this article" or "Today we'll learn". Jump straight in.
- Return ONLY valid JSON. No markdown fences, no text outside the JSON.

Also self-score the byte on these 4 dimensions (0–10 each):
- clarity: is the explanation easy to follow?
- specificity: is it specific to {tech_stack}, not generic?
- relevance: does it match the topic well?
- overall: overall quality of the byte

Output format:
{{
  "title": "...",
  "body": "...",
  "code_snippet": "..." or null,
  "language": "typescript" | "javascript" | "python" | "go" | "rust" | "cpp" | "csharp" | "swift" | "kotlin" | "solidity" | "bash" | "sql" | "gdscript" | "lua" | "hlsl" | "glsl" | null,
  "clarity": 0-10,
  "specificity": 0-10,
  "relevance": 0-10,
  "overall": 0-10
}}"""


# ── Helpers ───────────────────────────────────────────────────────────────────
def parse_seed_md(filepath: str) -> dict:
    """Parse Seed Config and Topics from a *-seed.md file."""
    with open(filepath) as f:
        content = f.read()

    subdomain = re.search(r"^subdomain:\s*(\S+)", content, re.MULTILINE)
    domain    = re.search(r"^domain:\s*(\S+)",    content, re.MULTILINE)
    stacks    = re.search(r"^tech_stacks:\s*\[([^\]]+)\]", content, re.MULTILINE)
    topics_block = re.search(r"## Topics to Seed\s*\n(.*)", content, re.DOTALL)

    if not all([subdomain, domain, stacks, topics_block]):
        return {}

    topics = re.findall(r"^\d+\.\s+(.+)$", topics_block.group(1), re.MULTILINE)

    return {
        "subdomain":   subdomain.group(1),
        "domain":      domain.group(1),
        "tech_stacks": [s.strip() for s in stacks.group(1).split(",")],
        "topics":      topics,
    }


def load_json(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def save_json(path: str, data: dict):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def call_claude(tech_stack: str, domain: str, subdomain: str, topic: str) -> dict:
    """Call Claude Code CLI and return parsed JSON. Retries on failure."""
    prompt = build_prompt(tech_stack, domain, subdomain, topic)

    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            result = subprocess.run(
                [CLAUDE_CMD, "-p", prompt, "--model", "sonnet", "--output-format", "text"],
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip())

            raw = result.stdout.strip()

            # Strip markdown fences if Claude adds them anyway
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            return json.loads(raw)

        except Exception as e:
            print(f"    ✗ Attempt {attempt}/{RETRY_LIMIT} failed: {e}", file=sys.stderr)
            if attempt < RETRY_LIMIT:
                time.sleep(RETRY_DELAY * attempt)

    return {}


# ── Groq: Rate Limiter ────────────────────────────────────────────────────────
class _RateLimiter:
    """Token-bucket rate limiter — thread-safe."""
    def __init__(self, calls_per_minute: int):
        self._interval = 60.0 / calls_per_minute
        self._lock     = threading.Lock()
        self._last     = 0.0

    def acquire(self):
        with self._lock:
            wait = self._interval - (time.time() - self._last)
            if wait > 0:
                time.sleep(wait)
            self._last = time.time()

_groq_limiter = _RateLimiter(GROQ_RPM)


# ── Groq: API Call ────────────────────────────────────────────────────────────
def call_groq(tech_stack: str, domain: str, subdomain: str, topic: str) -> dict:
    """Call Groq API (Llama 3.3 70B) and return parsed JSON. Rate-limited to GROQ_RPM."""
    import urllib.request, urllib.error

    _groq_limiter.acquire()
    prompt  = build_prompt(tech_stack, domain, subdomain, topic)
    payload = json.dumps({
        "model":           GROQ_MODEL,
        "messages":        [{"role": "user", "content": prompt}],
        "temperature":     0.7,
        "max_tokens":      1024,
        "response_format": {"type": "json_object"},
    }).encode()

    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=payload,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type":  "application/json",
                    "User-Agent":    "python-requests/2.31.0",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            raw = data["choices"][0]["message"]["content"].strip()
            # Strip markdown fences
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$",          "", raw)
            # Extract first JSON object if model adds surrounding text
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                raw = m.group(0)
            return json.loads(raw)
        except urllib.error.HTTPError as e:
            delay = 60 if e.code == 429 else RETRY_DELAY * attempt
            print(f"    ✗ Groq attempt {attempt}/{RETRY_LIMIT}: HTTP {e.code} — waiting {delay}s", file=sys.stderr)
            if attempt < RETRY_LIMIT:
                time.sleep(delay)
        except Exception as e:
            print(f"    ✗ Groq attempt {attempt}/{RETRY_LIMIT}: {e}", file=sys.stderr)
            if attempt < RETRY_LIMIT:
                time.sleep(RETRY_DELAY * attempt)

    return {}


# ── Groq: Stack Processor ─────────────────────────────────────────────────────
def process_tech_stack_groq(seed_meta: dict, ts: str, ts_json_path: str,
                             max_topics: int = None):
    """Generate bytes for one tech stack via Groq. Separate from Claude CLI flow."""
    data = load_json(ts_json_path)

    done_topics = {
        b["topic"]
        for b in data.get("bytes", [])
        if b.get("status") == "done"
    }

    pending = [t for t in seed_meta["topics"] if t not in done_topics]
    if max_topics:
        pending = pending[:max_topics]

    if not pending:
        print(f"  [{ts}] All topics done — skipping")
        return

    print(f"  [{ts}] {len(done_topics)} done, {len(pending)} to generate via Groq")

    lock      = threading.Lock()
    completed = 0

    def process_topic(topic: str):
        result = call_groq(ts, seed_meta["domain"], seed_meta["subdomain"], topic)
        if not result or not result.get("title") or not result.get("body"):
            entry = {
                "topic": topic, "status": "failed",
                "title": None, "body": None, "code_snippet": None, "language": None,
            }
            label = "✗ FAILED"
        else:
            entry = {
                "topic":        topic,
                "status":       "done",
                "title":        result.get("title"),
                "body":         result.get("body"),
                "code_snippet": result.get("code_snippet"),
                "language":     result.get("language"),
                "clarity":      result.get("clarity"),
                "specificity":  result.get("specificity"),
                "relevance":    result.get("relevance"),
                "overall":      result.get("overall"),
            }
            label = f"✓ {result.get('title', '')[:50]}"
        return topic, entry, label

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_topic, t): t for t in pending}
        for future in as_completed(futures):
            topic, entry, label = future.result()
            with lock:
                completed += 1
                data["bytes"].append(entry)
                save_json(ts_json_path, data)
                print(f"    ({completed}/{len(pending)}) {label}")


# ── Claude CLI: Stack Processor ───────────────────────────────────────────────
def process_tech_stack(seed_meta: dict, ts: str, ts_json_path: str):
    """Generate bytes for one tech stack via Claude CLI, skipping already-done topics.
    Uses a plain sequential loop when --sequential is set, ThreadPoolExecutor otherwise."""
    data = load_json(ts_json_path)

    done_topics = {
        b["topic"]
        for b in data.get("bytes", [])
        if b.get("status") == "done"
    }

    pending = [t for t in seed_meta["topics"] if t not in done_topics]

    if not pending:
        print(f"  [{ts}] All {len(seed_meta['topics'])} topics done — skipping")
        return

    print(f"  [{ts}] {len(done_topics)} done, {len(pending)} to generate")

    def build_entry(topic: str, result: dict) -> tuple:
        if not result or not result.get("title") or not result.get("body"):
            entry = {
                "topic": topic, "status": "failed",
                "title": None, "body": None, "code_snippet": None, "language": None,
            }
            label = "✗ FAILED"
        else:
            entry = {
                "topic":        topic,
                "status":       "done",
                "title":        result.get("title"),
                "body":         result.get("body"),
                "code_snippet": result.get("code_snippet"),
                "language":     result.get("language"),
                "clarity":      result.get("clarity"),
                "specificity":  result.get("specificity"),
                "relevance":    result.get("relevance"),
                "overall":      result.get("overall"),
            }
            label = f"✓ {result.get('title', '')[:50]}"
        return entry, label

    if args.sequential:
        # ── Sequential: one topic at a time, save after each ──────────────────
        for i, topic in enumerate(pending, 1):
            result = call_claude(ts, seed_meta["domain"], seed_meta["subdomain"], topic)
            entry, label = build_entry(topic, result)
            data["bytes"].append(entry)
            save_json(ts_json_path, data)
            print(f"    ({i}/{len(pending)}) {label}")
    else:
        # ── Parallel: ThreadPoolExecutor ──────────────────────────────────────
        lock      = threading.Lock()
        completed = 0

        def process_topic(topic: str):
            result = call_claude(ts, seed_meta["domain"], seed_meta["subdomain"], topic)
            return topic, *build_entry(topic, result)

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(process_topic, t): t for t in pending}
            for future in as_completed(futures):
                topic, entry, label = future.result()
                with lock:
                    completed += 1
                    data["bytes"].append(entry)
                    save_json(ts_json_path, data)
                    print(f"    ({completed}/{len(pending)}) {label}")


def run():
    total_stacks = 0
    total_topics = 0

    for domain_dir in sorted(os.listdir(SEEDS_BASE)):
        if args.domain and domain_dir != args.domain:
            continue

        domain_path = os.path.join(SEEDS_BASE, domain_dir)
        if not os.path.isdir(domain_path):
            continue

        for subdomain_dir in sorted(os.listdir(domain_path)):
            if args.subdomain and subdomain_dir != args.subdomain:
                continue

            subdomain_path = os.path.join(domain_path, subdomain_dir)
            if not os.path.isdir(subdomain_path):
                continue

            seed_md = os.path.join(subdomain_path, f"{subdomain_dir}-seed.md")
            if not os.path.exists(seed_md):
                continue

            seed_meta = parse_seed_md(seed_md)
            if not seed_meta:
                print(f"WARN: Could not parse {seed_md}", file=sys.stderr)
                continue

            print(f"\n▶ {domain_dir}/{subdomain_dir} ({len(seed_meta['tech_stacks'])} stacks, {len(seed_meta['topics'])} topics each)")

            for ts in seed_meta["tech_stacks"]:
                if args.tech_stack and ts != args.tech_stack:
                    continue

                ts_json = os.path.join(subdomain_path, ts, f"{ts}-seed.json")
                if not os.path.exists(ts_json):
                    print(f"  WARN: {ts_json} not found — run build step first")
                    continue

                use_groq = domain_dir in GROQ_DOMAINS and bool(GROQ_API_KEY)
                if use_groq:
                    max_t = BLOCKCHAIN_MAX_TOPICS if domain_dir == "blockchain" else args.max_topics
                    process_tech_stack_groq(seed_meta, ts, ts_json, max_topics=max_t)
                else:
                    process_tech_stack(seed_meta, ts, ts_json)

                total_stacks += 1
                total_topics += len(seed_meta["topics"])

    print(f"\n✓ Done — {total_stacks} tech stacks processed, {total_topics} topics attempted")


if __name__ == "__main__":
    run()
