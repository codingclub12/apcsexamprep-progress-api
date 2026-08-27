#!/usr/bin/env bash
# fetch_pages.sh - pull all 23 AP Cyber Unit 1 page bodies as JSON.
#
# The www subdomain is required; non-www is blocked by Cloudflare.
#
# ── WHY THIS IS NOT JUST A CURL LOOP ─────────────────────────────────────────
# On 2026-08-27 this script reported "200 ap-cybersecurity-unit-1-social-
# engineering" and wrote a Cloudflare interstitial titled "Verifying your
# connection..." into the file. Fetching 23 pages back to back tripped bot
# protection, the challenge came back with a 200, and the script had no reason
# to think anything was wrong.
#
# That is worse than a failed fetch. ced_audit.py read the directory, found no
# lesson content in that file, and reported the page CLEAN. A silent pass on an
# audit is the one outcome these tools exist to prevent.
#
# So: a browser User-Agent, a pause between requests, and a check that what came
# back is actually JSON carrying a page body. Anything else is a hard failure
# that names the file, and the script exits non-zero so a caller cannot audit a
# directory that was never fully populated.
set -euo pipefail

OUT="${1:-./pages}"
DELAY="${FETCH_DELAY:-1}"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

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

fail=0
for h in "${HANDLES[@]}"; do
  f="$OUT/$h.json"
  code=$(curl -sS -A "$UA" -H 'Accept: application/json' -o "$f" -w "%{http_code}" \
    "https://www.apcsexamprep.com/pages/$h.json?cb=$RANDOM" || echo 000)

  if [ "$code" != "200" ]; then
    echo "$code  $h   <-- FAILED"
    fail=1
  elif ! python3 - "$f" <<'PY'
import json, sys
try:
    body = json.load(open(sys.argv[1], encoding='utf-8'))['page']['body_html']
except Exception:
    sys.exit(1)
# A challenge page is valid HTTP and useless here. A real body is never tiny.
sys.exit(0 if len(body) > 500 else 1)
PY
  then
    head=$(head -c 60 "$f" | tr -d '\n')
    echo "$code  $h   <-- NOT A PAGE BODY: ${head}..."
    echo "        Most likely a Cloudflare challenge. Raise FETCH_DELAY and retry."
    fail=1
  else
    echo "$code  $h"
  fi
  sleep "$DELAY"
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "One or more pages did not return a usable body. Do NOT audit this directory:"
  echo "a missing body reads as a clean page."
  exit 1
fi
