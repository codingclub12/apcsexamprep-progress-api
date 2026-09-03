'use strict';
// ---------------------------------------------------------------------------
//  CLAIM LOCKS: turn a file path into the lock string the ledger uses, and
//  answer "is somebody else already holding this file".
//
//  WHY THIS EXISTS. CLAUDE.md has four rules and rule 1, open with the digest,
//  is true by construction because a SessionStart hook fetches it. Rule 2,
//  claim before you touch a file, was advice, and advice loses. On 2026-09-03
//  three sessions rebuilt the same mojibake detector in the same afternoon,
//  two of the three rebuilds were discarded, and none of the three had claimed
//  anything. The claim protocol worked perfectly the whole time. Nobody used it.
//
//  So this module is the reading half of making rule 2 mechanical, and
//  .claude/hooks/claim-guard.js is the enforcing half.
//
//  ---- THE CREDENTIAL CONSTRAINT, WHICH SHAPES EVERYTHING BELOW -------------
//  Detection here uses the DIGEST, which the read token can fetch. That is
//  deliberate and not a convenience:
//
//    COMMAND_READ_TOKEN   reads the digest and nothing else. CLAUDE.md tells
//                         every Claude Code environment to hold THIS one.
//    TODO_KEY             full read and write. Required to CLAIM.
//
//  When this was written CLAUDE.md said the read token ALONE belonged on a
//  Claude Code environment, which made rule 2 unenforceable by the sessions it
//  governs: POST /api/command/task/:id/claim answers 401 to the read token,
//  both as a bearer and bare, measured 2026-09-03. Tanner has since settled it
//  the other way, deliberately and permanently, so both tokens are expected on
//  the environment and a session can now take a lock as well as see one.
//
//  Detection still goes through the digest rather than the claim API, and that
//  is worth keeping rather than an artefact of the old rule: it is what lets
//  this guard protect a surface that has been given less, and it costs nothing.
//
//  ---- WHY THE DIGEST IS CACHED --------------------------------------------
//  The read URL is rate limited to 60 requests per hour, which is generous for
//  one session-start read and nowhere near enough for a per-edit hook: fifty
//  edits in an afternoon would exhaust it and then the guard goes blind, which
//  is the failure mode this repo keeps paying for. Edits arrive in bursts, so a
//  short TTL collapses a burst into one fetch and keeps the data fresh enough:
//  a lock taken inside the TTL window is a genuine race, and the digest reports
//  age in whole minutes anyway.
// ---------------------------------------------------------------------------
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.APCS_BASE || 'https://progress.apcsexamprep.com';
const CACHE_TTL_MS = 60 * 1000;
const CACHE_FILE = path.join(os.tmpdir(), 'apcs-claim-digest.json');

//  Repo prefix by checkout directory name. The ledger's lock strings are
//  `repo:path` and the two repo tokens in use are read off real claims and run
//  notes rather than invented: `api:scripts/apcs.js` (run note 2026-08-17),
//  `theme:layout/theme.liquid` (live claim 61, 2026-09-03).
const REPO_BY_DIRNAME = {
  'apcsexamprep-progress-api': 'api',
  'APCSExamPrep-theme': 'theme',
};

// ---------------------------------------------------------------------------
//  PATH -> LOCK
//
//  Walk up from the file looking for a directory this project knows. Matching
//  on the directory NAME rather than an absolute path is what lets the same
//  hook work in a container at /home/user, on a laptop at ~/code, and inside a
//  git worktree, none of which agree about absolute paths.
//
//  Returns null for a path outside both checkouts, which means "not lockable",
//  not "unlocked". The caller must not treat those the same way.
// ---------------------------------------------------------------------------
function lockForPath(filePath, cwd) {
  if (!filePath) return null;
  const abs = path.resolve(cwd || process.cwd(), String(filePath));
  const parts = abs.split(path.sep);
  for (let i = parts.length - 1; i >= 0; i--) {
    const repo = REPO_BY_DIRNAME[parts[i]];
    if (!repo) continue;
    const rel = parts.slice(i + 1).join('/');
    if (!rel) return null;                       // the repo root itself
    return `${repo}:${rel}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
//  LIVE CLAIMS
//
//  in_flight is the digest's published task -> claim mapping and is the only
//  place it exists. Each row carries locks, surface, session_label, task_id,
//  age_minutes and state.
// ---------------------------------------------------------------------------
function digestUrlAndArgs() {
  if (process.env.COMMAND_READ_TOKEN) {
    return { url: `${BASE}/api/command/digest/r/${process.env.COMMAND_READ_TOKEN}`, headers: {} };
  }
  if (process.env.TODO_KEY) {
    return {
      url: `${BASE}/api/command/digest`,
      headers: { Authorization: `Bearer ${process.env.TODO_KEY}` },
    };
  }
  return null;
}

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    if (Date.now() - raw.at > CACHE_TTL_MS) return null;
    return raw.in_flight;
  } catch (_) {
    return null;
  }
}

function writeCache(inFlight) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ at: Date.now(), in_flight: inFlight }));
  } catch (_) {
    /* a cache that cannot be written is a slow guard, not a wrong one */
  }
}

//  Returns { ok: true, claims } or { ok: false, why }. NEVER throws: a hook
//  that throws blocks every edit in the session, which is a worse outage than
//  the collision it exists to prevent.
async function liveClaims({ fetchImpl } = {}) {
  const cached = readCache();
  if (cached) return { ok: true, claims: cached, cached: true };

  const target = digestUrlAndArgs();
  if (!target) return { ok: false, why: 'no COMMAND_READ_TOKEN and no TODO_KEY in this environment' };

  const doFetch = fetchImpl || global.fetch;
  if (!doFetch) return { ok: false, why: 'no fetch available in this runtime' };

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    let res;
    try {
      res = await doFetch(target.url, { headers: target.headers, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return { ok: false, why: `digest returned HTTP ${res.status}` };
    const body = await res.json();
    if (!Array.isArray(body.in_flight)) return { ok: false, why: 'digest body has no in_flight array' };
    writeCache(body.in_flight);
    return { ok: true, claims: body.in_flight, cached: false };
  } catch (e) {
    return { ok: false, why: `digest fetch failed: ${e && e.message ? e.message : e}` };
  }
}

// ---------------------------------------------------------------------------
//  OWNERSHIP
//
//  A claim is MINE when its session_label matches this session's label. A claim
//  with NO label cannot be shown to be mine, so it counts as somebody else's.
//
//  That asymmetry is deliberate and it is the whole reason apcs now sends a
//  label by default. The alternative, treating an unlabeled claim as possibly
//  mine, makes the guard silent exactly when the board is busiest, and a guard
//  that goes quiet under load is the failure this repo has already paid for
//  twice. An unlabeled claim blocking me is a visible annoyance with an obvious
//  fix; an unlabeled claim being ignored is an invisible collision.
// ---------------------------------------------------------------------------
function holdersOf(lock, claims, myLabel) {
  if (!lock) return [];
  return (claims || []).filter((c) => {
    if (!c || !Array.isArray(c.locks)) return false;
    if (!c.locks.includes(lock)) return false;
    if (myLabel && c.session_label && c.session_label === myLabel) return false;
    return true;
  });
}

function holdsLock(lock, claims, myLabel) {
  if (!lock || !myLabel) return false;
  return (claims || []).some((c) => c && Array.isArray(c.locks)
    && c.locks.includes(lock) && c.session_label === myLabel);
}

module.exports = {
  lockForPath, liveClaims, holdersOf, holdsLock,
  REPO_BY_DIRNAME, CACHE_FILE, CACHE_TTL_MS,
};
