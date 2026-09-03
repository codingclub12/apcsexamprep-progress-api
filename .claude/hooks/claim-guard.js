#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  PreToolUse: make rule 2 mechanical.
//
//  CLAUDE.md's rule 1, open with the digest, is true by construction because
//  session-start.sh fetches it. Rule 2, claim before you touch a file, was
//  advice, and on 2026-09-03 advice cost most of an afternoon: three sessions
//  rebuilt the same mojibake detector, two rebuilds were thrown away, and none
//  of the three had claimed anything. The protocol worked. Nobody used it.
//
//  This hook is the enforcement. It runs before Edit and Write, resolves the
//  target to a `repo:path` lock, and refuses the edit when another session
//  holds it. That is the 409 the claim endpoint would have returned, surfaced
//  at the moment it can still save the work rather than after the collision.
//
//  ---- THREE OUTCOMES, AND WHY ONLY ONE OF THEM BLOCKS ----------------------
//
//    someone else holds the lock   DENY. Unambiguous, data-driven, and exactly
//                                  the collision this exists to prevent.
//    board unreachable             ALLOW, loudly. A board outage must not brick
//                                  every session; session-start.sh made the
//                                  same call for the same reason, and there is
//                                  still work to do offline.
//    nobody holds the lock         ALLOW, and say once per file that it is
//                                  unclaimed. Blocking here would refuse every
//                                  scratch edit and get the hook switched off
//                                  within a day, which is worse than the noise.
//
//  The middle case is the one worth being careful about. Failing OPEN on an
//  unreachable board is a real hole, and it is the right hole: this repo's
//  recurring defect is a check that reports clean, so the failure is printed
//  rather than swallowed. A session that sees that message and edits anyway has
//  made a choice; a session that never sees it has not.
//
//  Run standalone to test:
//    echo '{"tool_name":"Edit","tool_input":{"file_path":"CLAUDE.md"}}' \
//      | node .claude/hooks/claim-guard.js
// ---------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.join(__dirname, '..', '..');
let locksLib;
try {
  locksLib = require(path.join(ROOT, 'lib', 'claim-locks.js'));
} catch (_) {
  // The library is part of this repo. If it cannot be loaded the guard is not
  // working, and saying so is the only honest move: exit 0 so nothing is
  // blocked, but print it.
  process.stdout.write(JSON.stringify({
    systemMessage: 'claim-guard: lib/claim-locks.js could not be loaded, so file locks are NOT being checked.',
  }));
  process.exit(0);
}

const WARNED_FILE = path.join(os.tmpdir(), 'apcs-claim-warned.json');

function readWarned() {
  try { return JSON.parse(fs.readFileSync(WARNED_FILE, 'utf8')); } catch (_) { return {}; }
}
function markWarned(key) {
  const w = readWarned();
  w[key] = Date.now();
  try { fs.writeFileSync(WARNED_FILE, JSON.stringify(w)); } catch (_) { /* noise, not correctness */ }
}

function allow() { process.exit(0); }

function allowWith(message) {
  process.stdout.write(JSON.stringify({ systemMessage: message }));
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let payload;
  try { payload = JSON.parse(input || '{}'); } catch (_) { return allow(); }

  const filePath = payload && payload.tool_input && payload.tool_input.file_path;
  if (!filePath) return allow();

  const lock = locksLib.lockForPath(filePath, ROOT);
  // Outside both checkouts: scratch files, /tmp, anything the ledger has no
  // opinion about. Not lockable is not the same as unlocked, and neither is a
  // reason to say anything.
  if (!lock) return allow();

  const myLabel = process.env.APCS_SESSION_LABEL
    || payload.session_id
    || process.env.CLAUDE_CODE_CONTAINER_ID
    || null;

  const res = await locksLib.liveClaims();
  if (!res.ok) {
    const key = 'unreachable';
    if (readWarned()[key]) return allow();
    markWarned(key);
    return allowWith(
      `claim-guard: could NOT check file locks (${res.why}). You are editing ${lock} `
      + 'without knowing whether another session holds it. Say so rather than assuming it is free.',
    );
  }

  const holders = locksLib.holdersOf(lock, res.claims, myLabel);
  if (holders.length) {
    const h = holders[0];
    const who = `${h.surface || 'unknown surface'}${h.session_label ? ` "${h.session_label}"` : ' (unlabeled)'}`;
    return deny(
      `LOCK CONFLICT on ${lock}.\n`
      + `Held by ${who} on task #${h.task_id}, claim #${h.claim_id}, for ${h.age_minutes}m (${h.state}).\n`
      + (h.task_title ? `Their task: ${h.task_title}\n` : '')
      + '\nThis is CLAUDE.md rule 2 enforced rather than remembered. Another session is\n'
      + 'working in this exact file right now. Do not edit around it.\n\n'
      + 'Your options, in order of preference:\n'
      + '  1. Work on something else and come back. The claim expires on its own.\n'
      + '  2. Read what they have already done first: their work may make yours\n'
      + '     unnecessary, which is what happened three times on 2026-09-03.\n'
      + `  3. If the claim is stale, take it deliberately and on the record:\n`
      + `     apcs claim ${h.task_id} --lock ${lock} --force\n`
      + '     That writes an audit row naming you. It is not a way to skip step 2.',
    );
  }

  // Nobody holds it. Allowed, but an unclaimed edit is still a rule-2 miss, and
  // saying so once per file is the nudge that costs nothing.
  if (!locksLib.holdsLock(lock, res.claims, myLabel)) {
    const key = `unclaimed:${lock}`;
    if (readWarned()[key]) return allow();
    markWarned(key);
    return allowWith(
      `claim-guard: ${lock} is not claimed by anyone, including you. Nothing is blocking\n`
      + 'this edit. Per CLAUDE.md rule 2, take the lock so the next session is blocked\n'
      + 'instead of colliding:  apcs claim <task-id> --lock ' + lock + '\n'
      + 'No board task yet? Create one and claim that. Work with no task is exactly\n'
      + 'how three sessions collided on 2026-09-03.',
    );
  }

  return allow();
}

main().catch((e) => {
  // Same reasoning as the require() failure above: never block on our own bug.
  process.stdout.write(JSON.stringify({
    systemMessage: `claim-guard: crashed (${e && e.message}), file locks NOT checked.`,
  }));
  process.exit(0);
});
