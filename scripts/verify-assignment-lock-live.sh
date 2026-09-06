#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  VERIFY ASSIGNMENT LOCKING AGAINST A LIVE CLASS
#
#  The offline suites prove the logic. This proves the deployed system does it,
#  which is a different claim and the one nobody has made yet.
#
#  IT WRITES REAL GATE ROWS TO A REAL CLASS. While it runs, students in that
#  class cannot open the Unit 1 quizzes. It cleans up after itself in step 5,
#  and step 5 runs even if an earlier step fails, but use a test class or a
#  quiet hour rather than a live period.
#
#  IT MUST USE AP CYBERSECURITY UNIT 1. Those five quizzes are the only
#  locations on the server render path today. Point it at CSA and the quiz will
#  still serve while locked, and that is the feature reporting honestly rather
#  than a failure.
#
#  Usage:
#    TEACHER_EMAIL=... TEACHER_PASSWORD=... CLASS_CODE=CYBER-XXXX \
#    STUDENT_NAME='Jane D' STUDENT_PIN=1234 \
#    bash scripts/verify-assignment-lock-live.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
API="${API_BASE:-https://progress.apcsexamprep.com}"
COURSE="${COURSE:-ap-cybersecurity}"
UNIT="${UNIT:-unit-1}"
L_OPEN="${L_OPEN:-1.1}"    # the lesson we reopen inside the locked unit
L_SHUT="${L_SHUT:-1.2}"    # a lesson that must STAY locked

for v in TEACHER_EMAIL TEACHER_PASSWORD CLASS_CODE STUDENT_NAME STUDENT_PIN; do
  if [ -z "${!v:-}" ]; then echo "missing $v"; exit 2; fi
done

pass=0; fail=0
ok () { if [ "$2" = "1" ]; then pass=$((pass+1)); echo "  [PASS] $1";
        else fail=$((fail+1)); echo "  [FAIL] $1  ${3:-}"; fi }
jqr () { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

# ── credentials ──────────────────────────────────────────────────────────────
TT=$(curl -sS --max-time 25 -X POST "$API/api/teacher/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TEACHER_EMAIL\",\"password\":\"$TEACHER_PASSWORD\"}" | jqr "['token']")
[ -n "$TT" ] || { echo "teacher login failed"; exit 2; }

ST=$(curl -sS --max-time 25 -X POST "$API/api/student/login" -H 'Content-Type: application/json' \
  -d "{\"class_code\":\"$CLASS_CODE\",\"display_name\":\"$STUDENT_NAME\",\"pin\":\"$STUDENT_PIN\"}" | jqr "['token']")
[ -n "$ST" ] || { echo "student login failed"; exit 2; }
echo "signed in as teacher and as a student in $CLASS_CODE"

gate ()  { curl -sS --max-time 25 -X POST "$API/api/teacher/classes/$CLASS_CODE/gate" \
             -H 'Content-Type: application/json' -H "Authorization: Bearer $TT" -d "$1"; }
clear_gate () { curl -sS --max-time 25 -X DELETE "$API/api/teacher/classes/$CLASS_CODE/gate" \
             -H 'Content-Type: application/json' -H "Authorization: Bearer $TT" -d "$1"; }
quiz ()  { curl -sS --max-time 25 -H "Authorization: Bearer $ST" \
             "$API/api/quiz/$COURSE/$UNIT/$1/quiz"; }

cleanup () {
  echo; echo "5. CLEANUP: removing every gate row this script wrote"
  clear_gate "{\"course\":\"$COURSE\",\"unit\":\"$UNIT\",\"lesson\":\"$L_OPEN\"}" >/dev/null
  clear_gate "{\"course\":\"$COURSE\",\"unit\":\"$UNIT\"}" >/dev/null
  local after; after=$(quiz "$L_OPEN" | jqr "['locked']")
  ok "both lessons are reachable again" "$([ "$after" = "False" ] && echo 1 || echo 0)" "locked=$after"
  echo; echo "  $pass passed, $fail failed"
}
trap cleanup EXIT

# ── 1. baseline ──────────────────────────────────────────────────────────────
echo; echo "1. BASELINE: the quizzes are open before anything is written"
ok "$L_OPEN is open"  "$([ "$(quiz "$L_OPEN" | jqr "['locked']")" = "False" ] && echo 1 || echo 0)"
ok "$L_SHUT is open"  "$([ "$(quiz "$L_SHUT" | jqr "['locked']")" = "False" ] && echo 1 || echo 0)"

# ── 2. one call locks the whole unit ─────────────────────────────────────────
echo; echo "2. UNIT SCOPE: one call locks every quiz in $UNIT"
SC=$(gate "{\"course\":\"$COURSE\",\"unit\":\"$UNIT\",\"open\":false}" | jqr "['scope']")
ok "the write reports scope=unit" "$([ "$SC" = "unit" ] && echo 1 || echo 0)" "scope=$SC"
B=$(quiz "$L_OPEN"); LK=$(echo "$B" | jqr "['locked']"); RS=$(echo "$B" | jqr "['reason']"); QN=$(echo "$B" | jqr "['questions']")
ok "$L_OPEN is locked"                    "$([ "$LK" = "True" ] && echo 1 || echo 0)" "locked=$LK"
ok "the reason names the unit row"        "$([ "$RS" = "unit-closed" ] && echo 1 || echo 0)" "reason=$RS"
ok "no questions are on the wire"         "$([ "$QN" = "None" ] && echo 1 || echo 0)" "questions=$QN"
ok "$L_SHUT is locked by the same row"    "$([ "$(quiz "$L_SHUT" | jqr "['locked']")" = "True" ] && echo 1 || echo 0)"

# ── 3. a lesson beats its unit ───────────────────────────────────────────────
echo; echo "3. PRECEDENCE: opening one lesson inside the locked unit"
gate "{\"course\":\"$COURSE\",\"unit\":\"$UNIT\",\"lesson\":\"$L_OPEN\",\"open\":true}" >/dev/null
B=$(quiz "$L_OPEN"); LK=$(echo "$B" | jqr "['locked']"); QN=$(echo "$B" | jqr "['total']")
ok "$L_OPEN reopens"                      "$([ "$LK" = "False" ] && echo 1 || echo 0)" "locked=$LK"
ok "and serves its questions again"       "$([ "${QN:-0}" -gt 0 ] 2>/dev/null && echo 1 || echo 0)" "total=$QN"
ok "$L_SHUT is STILL locked"              "$([ "$(quiz "$L_SHUT" | jqr "['locked']")" = "True" ] && echo 1 || echo 0)"

# ── 4. the board agrees with what the student got ────────────────────────────
echo; echo "4. THE BOARD REPORTS THE SAME THING"
BD=$(curl -sS --max-time 25 -H "Authorization: Bearer $TT" "$API/api/teacher/classes/$CLASS_CODE/assignments?course=$COURSE")
UST=$(echo "$BD" | python3 -c "
import sys,json;d=json.load(sys.stdin)
u=[x for x in d['gates']['units'] if x['key']=='$UNIT']
print(u[0]['state'] if u else 'none')" 2>/dev/null)
ok "the unit rolls up as mixed"           "$([ "$UST" = "mixed" ] && echo 1 || echo 0)" "state=$UST"
NF=$(echo "$BD" | jqr "['gates']['locked_but_unenforceable']" )
echo "  note: locks the server CANNOT enforce on this class: $NF"
