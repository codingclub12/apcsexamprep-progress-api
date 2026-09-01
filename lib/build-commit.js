'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHICH BUILD IS SERVING.
//
//  /api/health reports a commit so that "did my merge ship" has an answer that
//  is not a guess. On 2026-09-01 the first deploy that ever actually ran through
//  railway-deploy.yml reported `unknown`, and the workflow's own confirm step
//  then polled for ten minutes for a sha that could never appear and failed a
//  deploy that HAD landed. deploy-drift.yml would have gone permanently red for
//  the same reason: `unknown` never equals main.
//
//  The cause is that this service gets built two ways and only one of them tells
//  the container its own sha:
//
//    Railway's GitHub integration   builds a git ref, so Railway injects
//                                   RAILWAY_GIT_COMMIT_SHA.
//    `railway up` from CI           uploads a DIRECTORY. There is no git ref, so
//                                   Railway injects nothing at all.
//
//  server.js previously said "Railway injects RAILWAY_GIT_COMMIT_SHA into every
//  container". That was true of the only build path that existed when it was
//  written and is not true now. The sha is a property of the artifact, so on the
//  second path it ships INSIDE the artifact: railway-deploy.yml writes
//  build-commit.txt into the upload immediately before `railway up`.
//
//  ── ORDER, AND WHY ──────────────────────────────────────────────────────────
//    1. BUILD_COMMIT           a Railway service variable. First so a human can
//                              override without a code change and a deploy when
//                              something is wrong at 7am.
//    2. build-commit.txt       written per deploy by the workflow.
//    3. RAILWAY_GIT_COMMIT_SHA last, so the integration path keeps working if it
//                              is ever re-enabled alongside this one.
//
//  'unknown' rather than an empty string when all three miss, so a local or test
//  run is visibly not a deploy instead of looking like an unlabelled one.
//
//  ── build-commit.txt IS DELIBERATELY NOT GITIGNORED ─────────────────────────
//  `railway up` honours .gitignore when it builds the upload tarball, so adding
//  the file to .gitignore would exclude it from the very upload it exists to
//  label, silently reintroducing the exact bug this module fixes. It is written
//  in CI and never committed; smoke/build-commit.js asserts it stays untracked.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const SHA_FILE = path.join(__dirname, '..', 'build-commit.txt');
const SHORT = 7;

function short(v) {
  return String(v == null ? '' : v).trim().slice(0, SHORT);
}

// `opts` is injectable so the smoke suite can prove each source wins in the
// right order without mutating the real environment or writing to the repo root.
function resolveBuildCommit(opts) {
  const o = opts || {};
  const env = o.env || process.env;
  const file = o.file === undefined ? SHA_FILE : o.file;

  const fromVar = short(env.BUILD_COMMIT);
  if (fromVar) return fromVar;

  if (file) {
    try {
      const fromFile = short(fs.readFileSync(file, 'utf8'));
      if (fromFile) return fromFile;
    } catch (e) {
      // Absent is the normal case off-platform and on the integration path.
      // Never throw: a missing label must degrade to 'unknown', never to a
      // container that will not boot.
    }
  }

  return short(env.RAILWAY_GIT_COMMIT_SHA) || 'unknown';
}

module.exports = { resolveBuildCommit, SHA_FILE, SHORT };
