#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TRANSCRIPTS_DIR="$ROOT/apps/app/data/transcripts/clean"

if [[ ! -d "$TRANSCRIPTS_DIR" ]]; then
  echo "No clean transcript directory found: $TRANSCRIPTS_DIR" >&2
  exit 1
fi

pattern="${1:-okay|what are you doing|the thing is|it works|it does not|from one week to another|I tried|I'm using|you need|that's why|the problem|the bill|trust|production|agent|model|tokens|bro}"

find "$TRANSCRIPTS_DIR" -type f -name '*livestream*.txt' \
  | sort \
  | tail -n 8 \
  | while read -r file; do
      echo
      echo "## ${file#$ROOT/}"
      rg -n -i -C 1 "$pattern" "$file" | head -n 80 || true
    done
