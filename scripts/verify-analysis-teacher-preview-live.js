'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIVE: the analysis route's teacher branch is deployed and fails closed.
//
//  WHAT THIS PINS, AND WHY IT IS NOT DECORATION
//  The deploy gate refuses a live check that would have passed yesterday. The
//  assertion here is `locked_for`, a key the OLD build does not emit at all.
//  Measured against production at 02:35 on 2026-09-14, before the merge:
//
//    {"course":"ap-cybersecurity","item_id":"1.1-lab","locked":true,
//     "reason":"anonymous-closed-for-lesson","activity":null}
//
//  No locked_for anywhere in it. So this check was FALSE before the deploy and
//  cannot pass against the build it replaced.
//
//  WHAT IT DELIBERATELY DOES NOT CLAIM
//  It does not observe a real teacher getting the activity. That needs a teacher
//  credential, this environment holds none, and CLAUDE.md says a session must
//  never ask for one. The teacher branch itself is evidenced by
//  smoke:analysisgate section 9, which drives the real router with a signed
//  teacher token, and by the two mutations in smoke:analysismutation that prove
//  those assertions are not hollow. Saying so here is the point: a live check
//  that overstated its reach would be worse than one that states its limit.
//
//  What it CAN establish live, and does, is the direction that matters for
//  safety: the new branch must not hand the activity to a credential that is not
//  a teacher. A garbage bearer, and a well-formed token signed with the wrong
//  key, both still get the refusal.
//
//  The progress API is a different origin from the storefront and is not behind
//  its bot management, so it is fetched directly. Nothing here touches
//  www.apcsexamprep.com; anything that did would go through
//  lib/storefront-fetch.js, per the repo rule and smoke:storefront rule 5.6.
//
//  Zero PII: one unauthenticated read and two deliberately invalid ones.
//  No em-dashes, per repo convention.
//  Run: node scripts/verify-analysis-teacher-preview-live.js
// ─────────────────────────────────────────────────────────────────────────────
const cp = require('child_process');

const API = process.env.API_BASE || 'https://progress.apcsexamprep.com';
const ITEM = '/api/analysis/ap-cybersecurity/1.1-lab';

function get(pathname, bearer) {
  const args = ['-sS', '--max-time', '25', API + pathname];
  if (bearer) args.push('-H', 'Authorization: Bearer ' + bearer);
  const out = cp.execFileSync('curl', args, { encoding: 'utf8' });
  try { return JSON.parse(out); } catch (e) {
    throw new Error('not JSON from ' + pathname + ': ' + out.slice(0, 200));
  }
}

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); }
};

//  A JWT shaped correctly and signed with a key that is not ours. It must be
//  rejected by the signature check before any role claim is read, so a token
//  CLAIMING role teacher gets nothing.
const FORGED = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ id: 'nobody', role: 'teacher', exp: 4102444800 })).toString('base64url'),
  'not-a-real-signature',
].join('.');

const anon = get(ITEM);

console.log('\n  ' + API + ITEM + '\n');
console.log('1. The new build is the one answering');
ok('  the response carries locked_for, which the old build never emitted',
  Object.prototype.hasOwnProperty.call(anon, 'locked_for'), Object.keys(anon));
ok('  and it names the anonymous rule rather than the caller\'s own class',
  anon.locked_for === 'anonymous', anon.locked_for);

console.log('\n2. The anonymous rule is intact, which board 277 has not yet changed');
ok('  a signed-out visitor is still refused', anon.locked === true, anon);
ok('  and the activity is not on the wire', anon.activity === null, Object.keys(anon));

console.log('\n3. The teacher branch fails closed');
ok('  a garbage bearer gets no preview', get(ITEM, 'garbage').locked === true);
const forged = get(ITEM, FORGED);
ok('  a well-formed token signed with the wrong key gets no preview',
  forged.locked === true, forged);
ok('  and it is refused as anonymous, so the role claim was never reached',
  forged.locked_for === 'anonymous', forged.locked_for);

console.log(`\n  ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILED'); process.exit(1); }
console.log('\nOK - the analysis teacher branch is deployed and fails closed (' + pass + ' checks)');
