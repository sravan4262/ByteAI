"""
ByteAI — Seed Orchestrator
Walks the bytes/ folder tree, calls generate-seed-data.py for each
matching tech stack, and persists status to orchestrator-status.json.

Usage:
  # Single tech stack (searches all domains/subdomains for it)
  python3 seed-orchestrator.py --tech_stack react

  # Whole subdomain
  python3 seed-orchestrator.py --subdomain ui_frameworks

  # Whole domain
  python3 seed-orchestrator.py --domain frontend

  # Everything
  python3 seed-orchestrator.py

Status is saved to: bytes/orchestrator-status.json
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--domain",     default=None)
parser.add_argument("--subdomain",  default=None)
parser.add_argument("--tech_stack", default=None)
args = parser.parse_args()

# ── Config ────────────────────────────────────────────────────────────────────
SEEDS_BASE   = os.path.dirname(__file__)
GENERATOR    = os.path.join(SEEDS_BASE, "generate-seed-data.py")
STATUS_FILE  = os.path.join(SEEDS_BASE, "orchestrator-status.json")
DB_URL       = os.environ.get("BYTEAI_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")


# ── Load / save persistent status ─────────────────────────────────────────────
def load_status() -> dict:
    if os.path.isfile(STATUS_FILE):
        with open(STATUS_FILE) as f:
            return json.load(f)
    return {}


def save_status(status: dict):
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


# ── Collect tech stacks to process ────────────────────────────────────────────
def collect_stacks() -> list[dict]:
    """Walk bytes/ and return all tech stacks matching the CLI filters."""
    stacks = []
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

            for ts_dir in sorted(os.listdir(subdomain_path)):
                if args.tech_stack and ts_dir != args.tech_stack:
                    continue
                ts_path = os.path.join(subdomain_path, ts_dir)
                if not os.path.isdir(ts_path):
                    continue
                stacks.append({
                    "domain":     domain_dir,
                    "subdomain":  subdomain_dir,
                    "tech_stack": ts_dir,
                    "label":      f"{domain_dir}/{subdomain_dir}/{ts_dir}",
                })
    return stacks


# ── Run one tech stack ─────────────────────────────────────────────────────────
def run_stack(stack: dict, status: dict) -> dict:
    """Call generate-seed-data.py for one tech stack. Returns updated status entry."""
    label = stack["label"]
    print(f"\n  ▶ {label}", file=sys.stderr)

    result = subprocess.run(
        [sys.executable, GENERATOR,
         "--domain",     stack["domain"],
         "--subdomain",  stack["subdomain"],
         "--tech_stack", stack["tech_stack"]],
        capture_output=True, text=True,
        env={**os.environ, "BYTEAI_DB_URL": DB_URL},
    )

    # Stream worker output to terminal
    for line in result.stderr.splitlines():
        print(f"    {line}", file=sys.stderr)

    entry = status.get(label, {})
    entry["last_run"] = now()

    if result.returncode == 0:
        # Parse "OK:{bytes_inserted}:{todo_count}" from stdout
        ok_line = next((l for l in result.stdout.splitlines() if l.startswith("OK:")), None)
        if ok_line:
            _, inserted, todo = ok_line.split(":")
            entry["status"]         = "inserted"
            entry["bytes_inserted"] = int(inserted)
            entry["topics_todo"]    = int(todo)
        else:
            entry["status"] = "inserted"
        entry.pop("error", None)
        print(f"    ✓ inserted", file=sys.stderr)

    elif result.returncode == 2:
        entry["status"]         = "pending"
        entry["bytes_inserted"] = 0
        print(f"    ○ pending — run generate-seed-json.py first", file=sys.stderr)

    elif result.returncode == 3:
        entry["status"]         = "no_json"
        entry["bytes_inserted"] = 0
        print(f"    ○ no JSON file found", file=sys.stderr)

    else:
        # Extract FAILED: message from stderr
        err_line = next((l for l in result.stderr.splitlines() if l.startswith("FAILED:")), "unknown error")
        entry["status"] = "failed"
        entry["error"]  = err_line.replace("FAILED: ", "")
        print(f"    ✗ failed: {entry['error']}", file=sys.stderr)

    return entry


# ── Main ──────────────────────────────────────────────────────────────────────
stacks = collect_stacks()

if not stacks:
    print("No tech stacks found matching the given filters.", file=sys.stderr)
    sys.exit(0)

status = load_status()

print(f"\n{'═' * 60}", file=sys.stderr)
print(f"  Seed Orchestrator — {len(stacks)} tech stack(s) to process", file=sys.stderr)
print(f"{'═' * 60}", file=sys.stderr)

for stack in stacks:
    entry         = run_stack(stack, status)
    status[stack["label"]] = entry
    save_status(status)   # persist after every stack — safe to interrupt

# ── Final summary ─────────────────────────────────────────────────────────────
counts = {"inserted": 0, "pending": 0, "no_json": 0, "failed": 0}
total_bytes = 0
total_todo  = 0

for label, entry in status.items():
    s = entry.get("status", "unknown")
    counts[s] = counts.get(s, 0) + 1
    total_bytes += entry.get("bytes_inserted", 0)
    total_todo  += entry.get("topics_todo", 0)

print(f"\n{'═' * 60}", file=sys.stderr)
print(f"  ORCHESTRATOR SUMMARY", file=sys.stderr)
print(f"{'═' * 60}", file=sys.stderr)

# Per-status details
for s, label_str in [
    ("inserted", "✓ Inserted"),
    ("pending",  "○ Pending (needs generate-seed-json.py)"),
    ("no_json",  "○ No JSON"),
    ("failed",   "✗ Failed"),
]:
    items = [(lbl, e) for lbl, e in status.items() if e.get("status") == s]
    if not items:
        continue
    print(f"\n  {label_str} ({len(items)}):", file=sys.stderr)
    for lbl, e in items:
        detail = ""
        if s == "inserted":
            detail = f"  {e.get('bytes_inserted', 0)} bytes"
            if e.get("topics_todo"):
                detail += f"  [{e['topics_todo']} topics still todo]"
        elif s == "failed":
            detail = f"  → {e.get('error', '')}"
        print(f"    • {lbl}{detail}", file=sys.stderr)

print(f"""
  ┌──────────────────────────────────────────┐
  │  Inserted        : {counts.get('inserted', 0):>4} tech stacks          │
  │  Pending         : {counts.get('pending',  0):>4} tech stacks          │
  │  No JSON         : {counts.get('no_json',  0):>4} tech stacks          │
  │  Failed          : {counts.get('failed',   0):>4} tech stacks          │
  │──────────────────────────────────────────│
  │  Total bytes in DB : {total_bytes:>6}                │
  │  Topics still todo : {total_todo:>6}                │
  └──────────────────────────────────────────┘
  Status saved → {STATUS_FILE}""", file=sys.stderr)
