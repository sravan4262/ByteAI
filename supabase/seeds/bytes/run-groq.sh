#!/bin/bash
cd "$(dirname "$0")"
for domain in blockchain gaming mobile security systems; do
  echo "▶ Starting $domain..."
  python3 -u generate-seed-json.py --domain $domain
done
echo "✓ All Groq domains complete"
