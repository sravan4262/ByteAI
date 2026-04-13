"""
ByteAI — Single Tech Stack Worker
Given exactly one tech stack, this script:
  1. Reads {tech_stack}-seed.json
  2. Computes ONNX embeddings for every done byte
  3. Writes {tech_stack}-seed.sql into the tech stack folder
  4. Applies the SQL to the DB via psql

Exit codes:
  0 — inserted successfully
  1 — failed (embedding error / psql error)
  2 — pending (no done bytes in JSON)
  3 — no JSON file found

Usage (called by seed-orchestrator.py, but can be run directly):
  python3 generate-seed-data.py --domain frontend --subdomain ui_frameworks --tech_stack react

Requirements:
  pip install onnxruntime transformers numpy
"""

import argparse
import json
import os
import subprocess
import sys
import uuid
import numpy as np
from datetime import datetime, timezone

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--domain",     required=True)
parser.add_argument("--subdomain",  required=True)
parser.add_argument("--tech_stack", required=True)
args = parser.parse_args()

# ── Config ────────────────────────────────────────────────────────────────────
SEEDS_BASE = os.path.dirname(__file__)
SEED_USER  = "00000000-0000-0000-0000-000000000001"
MODEL_PATH = "Service/ByteAI.Api/models/nomic-embed-text-v1.5.onnx"
VOCAB_PATH = "Service/ByteAI.Api/models/vocab.txt"
DOC_PREFIX = "search_document: "
DB_URL     = os.environ.get("BYTEAI_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")

# ── Resolve paths ─────────────────────────────────────────────────────────────
ts_path = os.path.join(SEEDS_BASE, args.domain, args.subdomain, args.tech_stack)
ts_json = os.path.join(ts_path, f"{args.tech_stack}-seed.json")
ts_sql  = os.path.join(ts_path, f"{args.tech_stack}-seed.sql")

# ── Guard: no JSON ─────────────────────────────────────────────────────────────
if not os.path.isfile(ts_json):
    print(f"NO_JSON: {ts_json}", file=sys.stderr)
    sys.exit(3)

with open(ts_json) as f:
    data = json.load(f)

all_bytes  = data.get("bytes", [])
done_bytes = [b for b in all_bytes if b.get("status") == "done"]
todo_count = len(all_bytes) - len(done_bytes)

# ── Guard: nothing done yet ────────────────────────────────────────────────────
if not done_bytes:
    print(f"PENDING: no done bytes in {ts_json} — run generate-seed-json.py first", file=sys.stderr)
    sys.exit(2)

tech_stack = data.get("tech_stack", args.tech_stack)
print(f"▶ {args.domain}/{args.subdomain}/{tech_stack}  ({len(done_bytes)} bytes, {todo_count} todo)", file=sys.stderr)

# ── Load ONNX model ───────────────────────────────────────────────────────────
try:
    import onnxruntime as ort
    from transformers import BertTokenizerFast

    tokenizer = BertTokenizerFast(vocab_file=VOCAB_PATH, do_lower_case=True)
    session   = ort.InferenceSession(MODEL_PATH)
    print("  Model loaded", file=sys.stderr)
except Exception as e:
    print(f"FAILED: could not load model: {e}", file=sys.stderr)
    sys.exit(1)


# ── Helpers ───────────────────────────────────────────────────────────────────
def embed(text: str) -> list[float]:
    full = DOC_PREFIX + text
    enc  = tokenizer(full, max_length=512, truncation=True, return_tensors="np")
    outputs = session.run(None, {
        "input_ids":      enc["input_ids"].astype(np.int64),
        "attention_mask": enc["attention_mask"].astype(np.int64),
        "token_type_ids": enc["token_type_ids"].astype(np.int64),
    })
    hidden = outputs[0]
    mask   = enc["attention_mask"][..., np.newaxis].astype(float)
    pooled = (hidden * mask).sum(axis=1) / mask.sum(axis=1)
    norm   = np.linalg.norm(pooled, axis=1, keepdims=True)
    return (pooled / norm)[0].tolist()


def pg_vector(floats: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in floats) + "]"


def now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S+00")


def sql_escape(val) -> str:
    if val is None:
        return "NULL"
    return f"$escape${val}$escape$"


# ── Build SQL ─────────────────────────────────────────────────────────────────
try:
    lines = []
    lines.append("-- ============================================================")
    lines.append(f"-- ByteAI — {args.domain} › {args.subdomain} › {tech_stack}")
    lines.append(f"-- Generated: {now()}")
    lines.append(f"-- Bytes: {len(done_bytes)} done, {todo_count} todo")
    lines.append("-- ============================================================")
    lines.append("")

    for b in done_bytes:
        byte_id    = str(uuid.uuid4())
        embed_text = b["title"] + " " + b["body"]

        print(f"  Embedding: {b['title'][:55]}...", file=sys.stderr)
        vec    = embed(embed_text)
        pg_vec = pg_vector(vec)

        lines.append(f"""INSERT INTO bytes.bytes (id, author_id, title, body, code_snippet, language, embedding, type, is_active, created_at, updated_at) VALUES (
  '{byte_id}',
  '{SEED_USER}',
  {sql_escape(b.get('title'))},
  {sql_escape(b.get('body'))},
  {sql_escape(b.get('code_snippet'))},
  {sql_escape(b.get('language'))},
  '{pg_vec}'::vector,
  'article',
  true,
  '{now()}', '{now()}'
) ON CONFLICT DO NOTHING;""")

        lines.append(f"""INSERT INTO bytes.byte_tech_stacks (byte_id, tech_stack_id) VALUES (
  '{byte_id}',
  (SELECT id FROM lookups.tech_stacks WHERE name = '{tech_stack}')
) ON CONFLICT DO NOTHING;""")

        clarity     = b.get("clarity")
        specificity = b.get("specificity")
        relevance   = b.get("relevance")
        overall     = b.get("overall")

        if all(v is not None for v in [clarity, specificity, relevance, overall]):
            lines.append(f"""INSERT INTO bytes.byte_quality_scores (byte_id, clarity, specificity, relevance, overall, computed_at) VALUES (
  '{byte_id}',
  {clarity},
  {specificity},
  {relevance},
  {overall},
  '{now()}'
) ON CONFLICT DO NOTHING;""")

        lines.append("")

    lines.append(f"-- Total bytes: {len(done_bytes)}")

    with open(ts_sql, "w") as f:
        f.write("\n".join(lines))

    print(f"  SQL written → {ts_sql}", file=sys.stderr)

except Exception as e:
    print(f"FAILED: {e}", file=sys.stderr)
    sys.exit(1)

# ── Apply to DB ───────────────────────────────────────────────────────────────
print(f"  Applying to DB...", file=sys.stderr)
result = subprocess.run(["psql", DB_URL, "-f", ts_sql], capture_output=True, text=True)

if result.returncode != 0:
    print(f"FAILED: psql error:\n{result.stderr.strip()}", file=sys.stderr)
    sys.exit(1)

print(f"  Inserted {len(done_bytes)} bytes into DB", file=sys.stderr)

# Print counts for orchestrator to parse
print(f"OK:{len(done_bytes)}:{todo_count}")
sys.exit(0)
