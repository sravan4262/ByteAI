"""
ByteAI — Byte Content Generator
Reads each *-seed.md file, calls Claude Code CLI per (tech_stack × topic),
and fills bytes[] in each {tech_stack}-seed.json.

Usage:
    # All domains
    python3 seeds/generate-seed-json.py

    # Single domain
    python3 seeds/generate-seed-json.py --domain frontend

    # Single subdomain
    python3 seeds/generate-seed-json.py --domain frontend --subdomain ui_frameworks

    # Single tech stack
    python3 seeds/generate-seed-json.py --domain frontend --subdomain ui_frameworks --tech_stack react

Resumable: already-generated topics (status=done) are skipped on rerun.
Requires: claude CLI installed and authenticated (claude.ai/code).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time

# ── Args ─────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--domain",     default=None)
parser.add_argument("--subdomain",  default=None)
parser.add_argument("--tech_stack", default=None)
args = parser.parse_args()

# ── Config ────────────────────────────────────────────────────────────────────
SEEDS_BASE  = os.path.dirname(__file__)
RETRY_LIMIT = 3
RETRY_DELAY = 3   # seconds between retries

# Claude CLI — find the binary
CLAUDE_CMD = "/Users/sravanravula/Library/Application Support/Claude/claude-code/2.1.92/claude.app/Contents/MacOS/claude"

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
                [CLAUDE_CMD, "-p", prompt, "--output-format", "text"],
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

        result = call_claude(ts, seed_meta["domain"], seed_meta["subdomain"], topic)

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
                "clarity":      result.get("clarity"),
                "specificity":  result.get("specificity"),
                "relevance":    result.get("relevance"),
                "overall":      result.get("overall"),
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
