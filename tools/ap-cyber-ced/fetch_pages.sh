#!/usr/bin/env bash
# fetch_pages.sh - pull all 23 AP Cyber Unit 1 page bodies as JSON.
# www subdomain is required; non-www is blocked by Cloudflare.
set -euo pipefail
OUT="${1:-./pages}"
mkdir -p "$OUT"
HANDLES=(
  ap-cybersecurity-unit-1-introduction-to-security
  ap-cybersecurity-unit-1-social-engineering
  ap-cybersecurity-unit-1-password-attacks
  ap-cybersecurity-unit-1-wireless-security
  ap-cybersecurity-unit-1-ai-driven-threats
  ap-cybersecurity-unit-1-ai-cyber-defense
  ap-cyber-unit-1-exam
  ap-cyber-unit-1-case-file-1
)
for n in 1 2 3 4 5; do
  for s in exercise-1 exercise-2 lab quiz; do
    HANDLES+=("ap-cyber-unit-1-lesson-$n-$s")
  done
done
for h in "${HANDLES[@]}"; do
  code=$(curl -s -o "$OUT/$h.json" -w "%{http_code}" \
    "https://www.apcsexamprep.com/pages/$h.json?cb=$RANDOM")
  echo "$code  $h"
done
