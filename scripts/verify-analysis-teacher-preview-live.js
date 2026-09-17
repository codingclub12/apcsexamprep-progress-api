'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LIVE: the 1.1 analysis activity is open to a signed-out visitor, and opening
//  it did not put the answer key on the wire.
//
//  BOARD 277, decided by Tanner on 2026-09-14: "Labs should be open as long as
//  the specific teacher doesn't lock it." A caller with no token has no class, so
//  no teacher's lock reaches them.
//
//  WHAT THIS PINS. The deploy gate refuses a live check that would have passed
//  yesterday. Production answered this path at 02:35 on 2026-09-14, on commit
//  42b5a7d, with the activity withheld:
//
//    {"course":"ap-cybersecurity","item_id":"1.1-lab","locked":true,
//     "reason":"anonymous-closed-for-lesson","locked_for":"anonymous",
//     "activity":null}
//
//  A class has lesson 1.1 closed, so that refusal is live state rather than a
//  contrivance, and this check cannot pass against the build it replaces.
//
//  THE HALF THAT MATTERS MORE THAN THE OPENING. Serving the activity to everyone
//  is only safe because the answer key was moved off the wire when this route was
//  built. That was true while the activity was withheld from most callers and it
//  has to be true now that it is handed to anyone, so the key check is asserted
//  here against the LIVE payload rather than trusted from the suite. If board 277
//  had been implemented by relaxing the wrong thing, this is what would catch it.
//
//  WHAT IT DELIBERATELY DOES NOT CLAIM. It does not observe a signed-in student
//  of a locking class still being refused, which is the half of the rule that
//  still bites. That needs a class code and a PIN, this environment holds none,
//  and CLAUDE.md says a session must never ask for one. That half is
//  smoke:analysisgate and smoke:labteacherpreview, which drive the real router.
//
//  The progress API is a different origin from the storefront and is not behind
//  its bot management, so it is fetched directly. Nothing here touches
//  www.apcsexamprep.com; anything that did would go through
//  lib/storefront-fetch.js, per the repo rule and smoke:storefront rule 5.6.
//
//  Zero PII: unauthenticated reads only.
//  No em-dashes, per repo convention.
//  Run: node scripts/verify-analysis-teacher-preview-live.js
// ─────────────────────────────────────────────────────────────────────────────
const cp = require('child_process');
const specs = require('../lib/analysis-spec');

const API = process.env.API_BASE || 'https://progress.apcsexamprep.com';
const SPEC = specs.get('ap-cybersecurity', '1.1-lab');
const ITEM = `/api/analysis/${SPEC.course}/${SPEC.item_id}`;

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
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); }
};

const anon = get(ITEM);
const wire = JSON.stringify(anon);

console.log('\n  ' + API + ITEM + '\n');
console.log('1. Board 277: a caller with no class is not refused');
ok('  the activity is served to a signed-out visitor',
  anon.locked === false && !!anon.activity, { locked: anon.locked, reason: anon.reason });
ok('  and it is the whole thing, not an empty shell',
  !!(anon.activity && anon.activity.specimens && anon.activity.specimens.length === SPEC.specimens.length),
  anon.activity && anon.activity.specimens && anon.activity.specimens.length);

console.log('\n2. Opening it did NOT put the answer key on the wire');
for (const k of ['senderKey', 'elementsKey', 'impactKey', 'actionKey', 'tacticWhy', 'typeWhy']) {
  ok(`  ${k} is still withheld`, !wire.includes(k));
}
//  The sharpest version, and the one a key-name grep would miss: for every
//  specimen, its own correct select value must not be derivable from the payload.
//  The value appears as an OPTION, which every student sees, so the assertion is
//  that no specimen object carries it.
//  Guarded, because a refused response carries activity: null and a verifier that
//  THROWS says less than one that reports. The 2026-09-03 storefront episode is
//  the same lesson from the other side: a check that cannot complete must fail
//  legibly rather than look like an outage.
const derivable = ((anon.activity && anon.activity.specimens) || []).some((sp, i) => {
  const ans = SPEC.specimens[i] && SPEC.specimens[i].answer;
  if (!ans) return false;
  const j = JSON.stringify(sp);
  return j.includes(`"${ans.tactic}"`) || j.includes(`"${ans.type}"`);
});
ok('  and no specimen carries its own correct answer', !derivable);

console.log('\n3. A junk credential is treated as a passer-by, not an error');
const junk = get(ITEM, 'garbage');
ok('  a garbage bearer degrades to anonymous rather than 401ing',
  junk.locked === false && !!junk.activity, { locked: junk.locked, reason: junk.reason });

//  The key assertions above pass vacuously on a refused body, which carries no
//  activity at all. Say so rather than letting six green lines imply the payload
//  was inspected. This is the same failure the storefront verifiers had on
//  2026-09-03: every "this string is gone" assertion passed on a challenge page.
if (!anon.activity) {
  console.log('\n  NOTE  the activity was WITHHELD, so section 2 inspected nothing.');
  console.log('        Its passes are vacuous and this run proves only section 1 failing.');
}

console.log(`\n  ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILED'); process.exit(1); }
console.log('\nOK - the 1.1 analysis activity is open to anyone and still ships no key (' + pass + ' checks)');
