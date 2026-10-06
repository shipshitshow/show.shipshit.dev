#!/usr/bin/env bash
set -euo pipefail

topic_file="${1:-}"

echo "== Transcript coverage =="
find apps/app/data/transcripts -maxdepth 1 -type f -name '*.vtt' | wc -l | awk '{print "raw_vtt=" $1}'
find apps/app/data/transcripts/clean -maxdepth 1 -type f -name '*.txt' | wc -l | awk '{print "clean_txt=" $1}'

echo
echo "== Latest clean transcripts =="
find apps/app/data/transcripts/clean -maxdepth 1 -type f -name '*.txt' -print | sort | tail -12

echo
echo "== Latest topic prep =="
find apps/app/data/livestream -maxdepth 2 -type f -name 'topic-*.md' -print | sort | tail -12

if [[ -n "$topic_file" && -f "$topic_file" ]]; then
  echo
  echo "== Topic preview: $topic_file =="
  sed -n '1,180p' "$topic_file"
fi
