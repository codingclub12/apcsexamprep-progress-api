'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-VERIFY BY EVIDENCE. Re-derivation, never assertion.
//
//  Rule 4 used to be enforced by making `verified` cookie-only, which made
//  Tanner's mouse the single path and left 68 tasks queued behind it. This is
//  the other way to keep the same guarantee: the ledger does not accept a claim
//  that work succeeded, it goes and looks.
//
//  WHAT THIS IS NOT, STATED PLAINLY
//  It is not an independent PARTY. lib/command-auth.js gives every bearer caller
//  the actor `agent`, so the session that closed a task and the session
//  verifying it are the same identity by construction, and a caller can hint a
//  different actor with a header. An actor-separation check here would read like
//  a safeguard and enforce nothing, which is the same failure as a deploy check
//  asserting "status":"ok" was true before the deploy.
//
//  So the weight is carried by two rules that DO hold:
//
//    1. RE-DERIVATION. There is no parameter for "it worked". The only input is
//       a URL already on the task and a phrase that must appear in what that URL
//       serves right now. The answer comes from the network, not the caller.
//
//    2. THE EXPECTATION MUST BE NON-TRIVIAL. This is the rule that matters, and
//       it was learned the hard way hours before this file existed: the deploy
//       gate's first live check expected "status":"ok", which was true before
//       the deploy, true during, and true if the deploy never happened. Evidence
//       that would have passed yesterday proves nothing, and evidence a caller
//       can satisfy by choosing a convenient URL is worse than none, because it
//       launders a guess as a check.
//
//  Everything is written to the event log so anybody can re-run the exact check
//  and get the same answer. A verification nobody can reproduce is a claim.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const { inspect } = require('../scripts/verify-artifact');

//  Phrases that assert nothing. Every one of these is true of a healthy page, an
//  unrelated page, and in most cases a page that never changed. A caller
//  reaching for one of these is reaching for a green tick, not a check.
const TRIVIAL = new Set([
  'ok', 'okay', 'true', 'yes', 'done', 'success', 'successful', 'complete',
  'completed', 'fixed', 'live', 'up', 'good', 'pass', 'passed', 'working',
  'health', 'healthy', 'status', '200', 'null', 'undefined', 'error', 'none',
  'html', 'div', 'span', 'body', 'page', 'the', 'and', 'apcsexamprep',
  'healthy!', 'all good', 'no errors', 'looks right', 'as expected',
]);

const MIN_PHRASE = 8;          // shorter than this matches by accident
const MIN_DISTINCT = 4;        // "aaaaaaaa" is long and still meaningless

//  A phrase is usable evidence only if it is specific enough that finding it
//  says something. This cannot be perfect: no rule can know whether a string was
//  true yesterday. It can refuse the ones that are obviously not evidence, which
//  is the difference between a check and a formality.
function judgePhrase(phrase) {
  const p = String(phrase == null ? '' : phrase).trim();
  if (!p) return 'no expectation given, so there is nothing to check';
  if (p.length < MIN_PHRASE) {
    return `the expectation ${JSON.stringify(p)} is ${p.length} characters, under ${MIN_PHRASE}. `
      + 'Short strings match by accident';
  }
  if (TRIVIAL.has(p.toLowerCase())) {
    return `the expectation ${JSON.stringify(p)} is true of almost any page, so finding it `
      + 'proves nothing about this task';
  }
  const words = p.toLowerCase().split(/[^a-z0-9.:_/-]+/).filter(Boolean);
  if (words.length && words.every((w) => TRIVIAL.has(w))) {
    return `every word in ${JSON.stringify(p)} is a generic one, so the whole phrase is`
      + ' generic too';
  }
  if (new Set(p.replace(/\s+/g, '')).size < MIN_DISTINCT) {
    return `the expectation ${JSON.stringify(p)} has fewer than ${MIN_DISTINCT} distinct characters`;
  }
  return null;
}

//  The first http(s) URL on the task's artifact. An artifact that is a note
//  rather than a URL is not machine-checkable and must stay with a human.
function artifactUrl(task) {
  const raw = task && task.artifact_url;
  if (!raw) return null;
  return String(raw).split(/\s+/).find((w) => /^https?:\/\//.test(w)) || null;
}

//  Preconditions, separated from the network call so they are testable offline
//  and so a refusal costs no request.
function assess(task, phrase) {
  if (!task) return { ok: false, reason: 'no such task' };
  if (task.verified) return { ok: false, reason: 'already verified' };
  if (task.status !== 'done') {
    return { ok: false, reason: `task is ${task.status}, and only a closed task can be verified` };
  }
  const url = artifactUrl(task);
  if (!url) {
    return { ok: false, reason: 'the artifact is not a URL, so there is nothing to re-derive. '
      + 'This one needs a human' };
  }
  const bad = judgePhrase(phrase);
  if (bad) return { ok: false, reason: bad };
  return { ok: true, url };
}

//  Go and look. Returns evidence and a verdict, with everything needed to run
//  the same check again by hand.
async function verifyByEvidence(task, phrase, opts) {
  opts = opts || {};
  const pre = assess(task, phrase);
  if (!pre.ok) return { verified: false, reason: pre.reason };

  const run = opts.inspect || inspect;
  let seen;
  try {
    seen = await run(pre.url, [phrase], opts.now || new Date());
  } catch (e) {
    return { verified: false, reason: `could not fetch ${pre.url}: ${String(e.message || e)}` };
  }
  if (seen.error) return { verified: false, reason: `could not fetch ${pre.url}: ${seen.error}` };
  if (seen.auth_gated) {
    return { verified: false, reason: `${pre.url} answered ${seen.status}. A credentialled endpoint `
      + 'cannot be checked from here, and a 401 is not a failure, so this needs a human' };
  }
  if (!seen.usable) {
    return { verified: false, reason: `${pre.url} answered ${seen.status}` };
  }

  //  locate() reports WHICH LAYER a hit lives in and does not return a `found`
  //  flag. The first version of this file read hit.found, which is undefined, so
  //  it could never verify anything. Every unit test passed, because the stub
  //  inspector encoded the same wrong shape the code did: a test that shares an
  //  assumption with the code proves the assumption is self-consistent, not that
  //  it is right. The route test, which fetches a real page over real http, is
  //  what caught it.
  //
  //  Presence in the SERVED BYTES is the test. A phrase inside a script or a
  //  comment is still shipped, and which layer it was in is recorded rather than
  //  judged here, because that judgement belongs to whoever reads the ledger.
  const hit = (seen.phrases || [])[0];
  const layers = ['visible', 'script', 'comment', 'style'].filter((k) => hit && hit[k]);
  const found = !!(hit && (hit.total_in_source > 0 || layers.length));
  if (!found) {
    return { verified: false,
      reason: `${JSON.stringify(phrase)} is NOT in what ${pre.url} serves right now `
        + `(${seen.bytes} bytes read). The work is not live, or the expectation is wrong` };
  }

  return {
    verified: true,
    evidence: {
      url: pre.url,
      final_url: seen.final_url,
      phrase,
      layer: layers.join('+') || 'unknown',
      occurrences: hit.total_in_source,
      status: seen.status,
      bytes: seen.bytes,
      checked_at: new Date().toISOString(),
      rerun: `node scripts/verify-artifact.js ${pre.url} --phrase ${JSON.stringify(phrase)}`,
    },
  };
}

//  One line for the event log. It has to carry enough that a person reading the
//  ledger a month later can re-run the check without reconstructing anything.
function evidenceLine(ev) {
  return `machine-verified: ${JSON.stringify(ev.phrase)} found in the ${ev.layer} layer of `
    + `${ev.url} (${ev.status}, ${ev.bytes} bytes) at ${ev.checked_at}. Re-run: ${ev.rerun}`;
}

module.exports = { assess, judgePhrase, artifactUrl, verifyByEvidence, evidenceLine, TRIVIAL, MIN_PHRASE };
