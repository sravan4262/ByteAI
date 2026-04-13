"""
ByteAI — Byte Content Generator
Reads each *-seed.md file, calls Groq per (tech_stack × topic),
and fills bytes[] in each {tech_stack}-seed.json.

Usage:
    pip install groq

    export GROQ_API_KEY=your_key_here

    # All domains
    python3 seeds/generate.py

    # Single domain
    python3 seeds/generate.py --domain frontend

    # Single subdomain
    python3 seeds/generate.py --domain frontend --subdomain ui_frameworks

    # Single tech stack
    python3 seeds/generate.py --domain frontend --subdomain ui_frameworks --tech_stack react

Resumable: already-generated topics (status=done) are skipped on rerun.
"""

import argparse
import json
import os
import re
import sys
import time

# ── Args ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--domain",     default=None)
parser.add_argument("--subdomain",  default=None)
parser.add_argument("--tech_stack", default=None)
args = parser.parse_args()

# ── Config ────────────────────────────────────────────────────────────────────
SEEDS_BASE   = os.path.join(os.path.dirname(__file__), "bytes")
GROQ_MODEL   = "llama-3.3-70b-versatile"
RETRY_LIMIT  = 3
RETRY_DELAY  = 5   # seconds between retries

# ── Groq client ───────────────────────────────────────────────────────────────
try:
    from groq import Groq
except ImportError:
    print("ERROR: groq not installed. Run: pip install groq", file=sys.stderr)
    sys.exit(1)

api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    print("ERROR: GROQ_API_KEY env var not set.", file=sys.stderr)
    sys.exit(1)

client = Groq(api_key=api_key)

# ── Prompts ───────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """\
You are a technical content writer for ByteAI, a short-form tech content platform (think Inshorts for developers).

Your job is to write a single "byte" — a concise, high-signal technical article targeted at developers who use a specific technology.

Rules:
- Be specific to the tech stack given. Never write generic content that could apply to any language or framework.
- Body must be 150–200 words. Dense, practical, no fluff.
- Use correct terminology for that specific tech stack.
- Code snippet: short (5–15 lines), runnable, idiomatic for the tech stack. Set to null if the topic is purely conceptual.
- Title: specific and punchy. Bad: "React Performance". Good: "React memo() — When It Helps and When It Doesn't".
- Do not start the body with "In this article" or "Today we'll learn". Jump straight into the content.
- Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.

Output format:
{
  "title": "...",
  "body": "...",
  "code_snippet": "..." or null,
  "language": "typescript" | "javascript" | "python" | "go" | "rust" | "cpp" | "csharp" | "swift" | "kotlin" | "solidity" | "bash" | "sql" | "gdscript" | "lua" | "hlsl" | "glsl" | null
}"""

def user_prompt(tech_stack: str, domain: str, subdomain: str, topic: str) -> str:
    return f"""\
Tech stack: {tech_stack}
Domain: {domain} › {subdomain}
Topic: {topic}

Write a byte for a developer who works with {tech_stack} daily."""


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


def call_groq(tech_stack: str, domain: str, subdomain: str, topic: str) -> dict:
    """Call Groq and return parsed JSON. Retries on failure."""
    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt(tech_stack, domain, subdomain, topic)},
                ],
                temperature=0.7,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            return json.loads(raw)

        except Exception as e:
            print(f"    ✗ Attempt {attempt}/{RETRY_LIMIT} failed: {e}", file=sys.stderr)
            if attempt < RETRY_LIMIT:
                time.sleep(RETRY_DELAY * attempt)

    return {}


# ── Main ──────────────────────────────────────────────────────────────────────
def process_tech_stack(seed_meta: dict, ts: str, ts_json_path: str):
    """Generate bytes for one tech stack, skipping already-done topics."""
    data = load_json(ts_json_path)

    # Build a set of already-done topic strings
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

    for i, topic in enumerate(pending, 1):
        print(f"    ({i}/{len(pending)}) {topic[:60]}...")

        result = call_groq(ts, seed_meta["domain"], seed_meta["subdomain"], topic)

        if not result or not result.get("title") or not result.get("body"):
            print(f"    ✗ FAILED — skipping topic, will retry on next run")
            data["bytes"].append({
                "topic":        topic,
                "status":       "failed",
                "title":        None,
                "body":         None,
                "code_snippet": None,
                "language":     None,
            })
        else:
            data["bytes"].append({
                "topic":        topic,
                "status":       "done",
                "title":        result.get("title"),
                "body":         result.get("body"),
                "code_snippet": result.get("code_snippet"),
                "language":     result.get("language"),
            })
            print(f"    ✓ {result.get('title', '')[:60]}")

        # Save after every topic — safe to interrupt anytime
        save_json(ts_json_path, data)


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

                process_tech_stack(seed_meta, ts, ts_json)
                total_stacks += 1
                total_topics += len(seed_meta["topics"])

    print(f"\n✓ Done — {total_stacks} tech stacks processed, {total_topics} topics attempted")


if __name__ == "__main__":
    run()
