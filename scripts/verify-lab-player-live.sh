#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Is the DEPLOYED lab player the one that sends its token?
#
#  Worth having as a script rather than a one-off curl, because this is the file
#  whose silence caused a teacher to watch a closed lab open twice. The route
#  was fixed, the gradebook was fixed, and the client never told the server who
#  was asking.
#
#  NO CREDENTIAL NEEDED. lab-player.js is served from this repo at
#  /lab-player.js, so a plain fetch settles it.
#
#  THE PATTERNS ARE ANCHORED ON THE SPEC FETCH, NOT ON "Authorization".
#  The player has always sent an Authorization header when SUBMITTING a grade,
#  so grepping for that string alone passes against the broken build. The first
#  draft of this check did exactly that and reported a pass against a deploy
#  that still had the bug. Each pattern below is unique to the call it is about.
#
#  Run: bash scripts/verify-lab-player-live.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
API="${API_BASE:-https://progress.apcsexamprep.com}"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

curl -sS --max-time 25 -o "$TMP" "$API/lab-player.js" || { echo "could not fetch the player"; exit 2; }
p=0; f=0
ok(){ if [ "$2" = 1 ]; then p=$((p+1)); echo "  [PASS] $1"; else f=$((f+1)); echo "  [FAIL] $1"; fi; }
has(){ grep -qF "$1" "$TMP" && echo 1 || echo 0; }

echo
echo "  deployed lab-player.js: $(wc -c < "$TMP") bytes"
echo

#  The conditional-header form appears only in mountById, the spec fetch.
ok "the SPEC fetch carries the token (not just the grade submit)" \
   "$(has 'token ? { headers: { Authorization: "Bearer " + token } } : undefined)')"
#  Two Authorization sites total: the grade submit, and the spec fetch.
n=$(grep -c 'Authorization' "$TMP")
ok "there are two Authorization sites, the submit and the spec fetch" "$([ "$n" = 2 ] && echo 1 || echo 0)"
[ "$n" = 2 ] || echo "         found $n"
ok "a closed lab reads as closed to the student" \
   "$(has 'Your teacher has not opened this lab yet.')"
ok "and the real load-error path still exists for real errors" \
   "$(has 'This lab could not be loaded. ')"

echo
echo "  $p passed, $f failed"
[ "$f" = 0 ] || exit 1
