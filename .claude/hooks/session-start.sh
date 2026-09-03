#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  SessionStart: make the two things CLAUDE.md asks for TRUE, not merely asked.
#
#    1. The suites can run.        A fresh container has no node_modules.
#    2. The session opens with     "Open with the digest" was an instruction a
#       the digest.                session could skim past. Now the live state is
#                                  already in context before the first message.
#
#  NOT `set -e`. A board that cannot be reached must not stop a session from
#  starting - the rules in CLAUDE.md still apply and there is still work to do
#  offline. But it must not be SILENT either: this repo's recurring defect is a
#  thing that fails and reports success, and a hook that quietly injects nothing
#  is the purest form of it. Every failure path below prints a loud block into
#  context saying exactly what the session does NOT know.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# ---- session identity, written where apcs and the claim guard can read it ---
#  The Claude Code session id arrives on stdin in the hook payload and is NOT in
#  the environment, so this is the only chance to record it. apcs claim uses it
#  to label a claim and .claude/hooks/claim-guard.js uses it to tell your own
#  locks from somebody else's. Without it every claim is unlabeled, and the
#  guard treats an unlabeled claim as a stranger's, so a session would end up
#  blocked by its own lock.
#  BOUNDED READ. Claude Code sends the payload and closes stdin, so `cat`
#  returns instantly in the normal case. A caller that spawns this hook with an
#  open pipe and never writes to it, which is exactly what smoke/session-hook.js
#  does, would otherwise block here forever and hang the session start. A hook
#  that can hang is worse than a hook that learns nothing.
if command -v timeout >/dev/null 2>&1; then
  HOOK_INPUT=$(timeout 2 cat 2>/dev/null || true)
else
  HOOK_INPUT=""
fi
SESSION_LABEL=$(printf '%s' "$HOOK_INPUT" | node -e '
  let s = ""; process.stdin.on("data", (d) => { s += d; });
  process.stdin.on("end", () => {
    try { process.stdout.write(String(JSON.parse(s).session_id || "")); } catch (_) {}
  });
' 2>/dev/null || true)
[ -z "$SESSION_LABEL" ] && SESSION_LABEL="${CLAUDE_CODE_CONTAINER_ID:-}"
if [ -n "$SESSION_LABEL" ]; then
  printf '%s' "$SESSION_LABEL" > "${TMPDIR:-/tmp}/apcs-session-label" 2>/dev/null || true
fi
# A new session has taken nothing yet, and the guard warns once per file per
# session. Clearing the marker is what makes "once per session" true.
rm -f "${TMPDIR:-/tmp}/apcs-claim-warned.json" "${TMPDIR:-/tmp}/apcs-claim-digest.json" 2>/dev/null || true

# ── 1. dependencies ──────────────────────────────────────────────────────────
# Remote only. A local checkout already has node_modules, and the container
# state is cached after this completes, so a later session skips straight past.
# `npm install` rather than `npm ci` on purpose: it is what the cache rewards.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && [ ! -d node_modules ]; then
  echo "session-start: installing dependencies (better-sqlite3 is native)..."
  if npm install --no-audit --no-fund >/tmp/npm-install.log 2>&1; then
    echo "session-start: dependencies installed."
  else
    echo ""
    echo "### SESSION START: DEPENDENCIES FAILED TO INSTALL"
    echo ""
    echo "The offline smoke suites will not run in this session. Last 15 lines:"
    echo '```'
    tail -15 /tmp/npm-install.log
    echo '```'
    echo ""
  fi
fi

# ── 2. the digest ────────────────────────────────────────────────────────────
#  TWO credentials can reach the board, and the cheap one is preferred.
#
#    COMMAND_READ_TOKEN  read-only, PII-stripped, rotatable in one click. It can
#                        GET the digest and nothing else. Leaking it costs a
#                        rotation.
#    TODO_KEY            full read AND write on the ledger. Leaking it costs a
#                        rotation across three stores and anything written in
#                        between.
#
#  BOTH ARE EXPECTED TO BE SET HERE, and TODO_KEY being present is deliberate.
#  Tanner decided that on 2026-09-03, with the exposure stated to him: environment
#  configuration is not a secrets store, anyone who can use the environment can
#  read it, and a session can echo a variable into its own transcript at any time,
#  which had happened to both tokens that same day. He took the trade anyway,
#  because claiming a lock is a WRITE and a session holding only the read token
#  cannot claim, which made rule 2 of CLAUDE.md unenforceable by the sessions it
#  governs. Do not report the write token's presence as a defect and do not
#  remove it. See the top of CLAUDE.md for the full decision.
#
#  The preference below is unchanged and still right: this hook only READS, so it
#  uses the read-only credential when one is available and keeps the write token
#  out of the request entirely. Preferring the cheap credential for a read is not
#  the retired containment rule, it is just not spending authority it does not
#  need. apcs.js reaches for TODO_KEY when a claim actually has to be written.
#
#  THE READ TOKEN IS IN THE URL, not a header. Every path below that prints a
#  URL or a server response must redact it, or this change swaps one leak for
#  a fresher one.
BASE="${APCS_BASE:-https://progress.apcsexamprep.com}"
REDACT='s#/digest/r/[A-Za-z0-9_-]\{8,\}#/digest/r/<token redacted>#g'

if [ -n "${COMMAND_READ_TOKEN:-}" ]; then
  URL="$BASE/api/command/digest/r/$COMMAND_READ_TOKEN"
  SHOWN="$BASE/api/command/digest/r/<token redacted>"
  CRED="read token (read-only, PII-stripped)"
  AUTH_ARGS=()
elif [ -n "${TODO_KEY:-}" ]; then
  URL="$BASE/api/command/digest"
  SHOWN="$URL"
  CRED="TODO_KEY bearer (full read/write)"
  AUTH_ARGS=(-H "Authorization: Bearer $TODO_KEY")
fi

if [ -z "${COMMAND_READ_TOKEN:-}" ] && [ -z "${TODO_KEY:-}" ]; then
  cat <<'EOF'

### COMMAND CENTER: NO LIVE STATE IN THIS SESSION

Neither `COMMAND_READ_TOKEN` nor `TODO_KEY` is set, so the digest was NOT
fetched. You are working blind on board state.

**Do not assume the board is empty, or that nothing is claimed.** Another agent
may hold a lock on the exact file you are about to touch. Before editing, either
get the digest another way or say plainly that you could not.

To fix, PREFER the read token: get it from `GET /api/command/read-token` while
signed in to /admin/command, then set `COMMAND_READ_TOKEN` on this Claude Code
environment. It is read-only and PII-stripped, so it is the credential to leave
in readable config.

`TODO_KEY` also works and is used if the read token is absent, but it can WRITE
to the ledger, and environment configuration is not a secrets store.

EOF
  exit 0
fi

# -m so a hanging board cannot hang a session start. --fail-with-body so a 4xx
# is an error AND still prints what the server said.
BODY=$(curl -sS --fail-with-body -m 20 "${AUTH_ARGS[@]}" "$URL" 2>&1)
RC=$?

if [ $RC -ne 0 ]; then
  echo ""
  echo "### COMMAND CENTER: DIGEST UNREACHABLE"
  echo ""
  echo "Tried \`$SHOWN\` and it failed. You have NO live board"
  echo "state. Do not assume the board is empty or unclaimed. Say so in your first"
  echo "reply rather than working as though you had checked."
  echo ""
  echo '```'
  echo "$BODY" | sed "$REDACT" | head -c 600
  echo '```'
  echo ""
  exit 0
fi

# A 200 is not proof of a usable body. An HTML error page or a truncated read
# parsed as "nothing to do" is the failure worth spending a check on.
if ! printf '%s' "$BODY" | node -e '
  let s = "";
  process.stdin.on("data", (d) => { s += d; });
  process.stdin.on("end", () => {
    const d = JSON.parse(s);
    if (!Array.isArray(d.needs_verification)) throw new Error("no needs_verification array");
    process.exit(0);
  });
' 2>/dev/null; then
  echo ""
  echo "### COMMAND CENTER: DIGEST CAME BACK IN AN UNEXPECTED SHAPE"
  echo ""
  echo "The endpoint answered but the body is not a digest. Treat this session as"
  echo "having NO live board state."
  echo ""
  exit 0
fi

echo ""
echo "### COMMAND CENTER DIGEST (fetched at session start, via $CRED)"
echo ""
echo "This is live board state, read once, just now. It decays: re-run"
echo "\`apcs digest\` before trusting it later in a long session."
echo ""
echo '```json'
printf '%s' "$BODY"
echo ""
echo '```'
echo ""
# ---- what is LOCKED right now --------------------------------------------
#  in_flight is in the JSON above, and being in the JSON above is not the same
#  as being read. On 2026-09-03 three sessions collided on one file with the
#  digest sitting in all three contexts. So the locks get their own block.
LOCKS=$(printf '%s' "$BODY" | node -e '
  let s = ""; process.stdin.on("data", (d) => { s += d; });
  process.stdin.on("end", () => {
    const rows = (JSON.parse(s).in_flight || []).filter((r) => r && (r.locks || []).length);
    if (!rows.length) { process.stdout.write(""); return; }
    const out = rows.map((r) => "  " + (r.locks || []).join(", ")
      + "\n      held by " + (r.surface || "?")
      + (r.session_label ? " \"" + r.session_label + "\"" : " (unlabeled)")
      + " on task #" + r.task_id + ", " + r.age_minutes + "m, " + r.state);
    process.stdout.write(out.join("\n"));
  });
' 2>/dev/null || true)

if [ -n "$LOCKS" ]; then
  echo "### FILES ANOTHER SESSION IS HOLDING RIGHT NOW"
  echo ""
  echo "Do not edit these. A PreToolUse hook will refuse the edit anyway, but"
  echo "knowing now is cheaper than being refused later."
  echo ""
  echo "$LOCKS"
  echo ""
else
  echo "### NO FILES ARE CURRENTLY LOCKED BY ANY SESSION"
  echo ""
  echo "That is not permission to skip claiming. It means you are first."
  echo ""
fi

echo "Rule 2 is ENFORCED, not remembered: .claude/hooks/claim-guard.js refuses an"
echo "Edit or Write to a file another session holds. It cannot make you TAKE a lock,"
echo "so take one: \`apcs claim <id> --lock repo:path\`. No board task for this work?"
echo "Create one and claim that. Unclaimed work is how three sessions collided on"
echo "2026-09-03 and threw away two of the three results."
echo ""
echo "Per CLAUDE.md: claim before you touch a file (\`apcs claim <id> --lock repo:path\`),"
echo "close with an artifact (\`apcs done <id> --artifact <url>\`), and \`verified\` is"
echo "not yours to set."
echo ""
