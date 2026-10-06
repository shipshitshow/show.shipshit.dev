#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
topic_file="${1:-}"

cd "$repo_root"

echo "== Transcript inventory =="
find apps/app/data/transcripts -maxdepth 1 -type f -name '*.vtt' | wc -l | awk '{print "raw_vtt=" $1}'
find apps/app/data/transcripts/clean -type f -name '*.txt' | wc -l | awk '{print "clean_txt=" $1}'

echo
echo "== Latest clean transcripts =="
find apps/app/data/transcripts/clean -type f -name '*.txt' -print | sort | tail -8

echo
echo "== Recent livestream topics =="
find apps/app/data/livestream -maxdepth 2 -type f -name 'topic-*.md' -print | sort | tail -12

if [[ -n "$topic_file" ]]; then
  echo
  echo "== Topic preview =="
  sed -n '1,120p' "$topic_file"
fi

echo
echo "== Existing cold opens =="
rg -n "^(## Cold Open|## Cold Open - READ THIS|## Intro Talking Points)" apps/app/data/livestream || true
