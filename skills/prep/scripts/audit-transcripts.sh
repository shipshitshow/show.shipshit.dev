#!/usr/bin/env bash
set -euo pipefail

dir="${1:-apps/app/data/transcripts/clean}"

if [[ ! -d "$dir" ]]; then
  echo "Missing transcript directory: $dir" >&2
  exit 1
fi

for file in "$dir"/*.txt; do
  [[ -f "$file" ]] || continue

  words="$(wc -w < "$file" | awk '{print $1}')"
  opening="$(sed -n '1,80p' "$file" | tr '\n' ' ')"
  lower="$(printf '%s' "$opening" | tr '[:upper:]' '[:lower:]')"

  flags=()
  [[ "$lower" == *"are we live"* ]] && flags+=("are-we-live")
  [[ "$lower" == *"we are live"* || "$lower" == *"we live"* ]] && flags+=("live-check")
  [[ "$lower" == *"welcome back"* ]] && flags+=("welcome-before-thesis")
  [[ "$lower" == *"how are you"* || "$lower" == *"how's your week"* || "$lower" == *"how was your"* ]] && flags+=("warmup-before-thesis")
  [[ "$lower" == *"sound"* || "$lower" == *"mic"* || "$lower" == *"audio"* ]] && flags+=("production-check")
  [[ "$lower" == *"retweet"* || "$lower" == *"chat"* ]] && flags+=("platform-logistics")

  verdict="review"
  if (( ${#flags[@]} >= 2 )); then
    verdict="trim-opening"
  elif (( ${#flags[@]} == 0 )); then
    verdict="opening-ok"
  fi

  printf '%s\twords=%s\t%s' "$(basename "$file")" "$words" "$verdict"
  if (( ${#flags[@]} > 0 )); then
    printf '\tflags=%s' "$(IFS=,; echo "${flags[*]}")"
  fi
  printf '\n'
done
