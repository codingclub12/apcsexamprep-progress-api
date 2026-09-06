'use strict';
// -----------------------------------------------------------------------------
//  MUTATION TEST FOR STEP 2 OF THE CSA 1.1 QUIZ MIGRATION.
//
//  scripts/csa-11-quiz-mount-csv.js takes 103KB of live page body and deletes
//  3,602 bytes out of the middle of it. That is the shape of the /pages/join
//  incident, where an import removed an entire tab and every guard in the
//  generator was green because none of them looked at the live page.
//
//  So a green run of THIS file is a failed check unless each case goes red for
//  its OWN rule. Requiring only "it refused" proves nothing where nine rules
//  overlap: eight of them would refuse a body that had lost everything.
//
//  WHAT MADE THIS NECESSARY RATHER THAN NICE
//  lib/live-body-guard.js has a contentLoss check, and running the real removal
//  past it returned zero findings. It is not broken, it is coarse: measured
//  2026-09-06, it reports nothing on a 2,036 byte deletion and 36 entries on a
//  two-thirds one. Nothing in the repo was going to notice a 3.5KB mistake, so
//  the generator's own round trip is the load-bearing guard here and it had to
//  be proven capable of going red.
//
//  OFFLINE. The baseline is imports/2026-09-06/csa-11-live-body.json, the body
//  as fetched before the import. It is a frozen fixture, not current live state:
//  Shopify reformats HTML on save, so after the import the live body will differ
//  from it and that is expected. Nothing here touches the network or the store.
//
//    node smoke/csa-quiz-mount.js       # npm run smoke:csaquizmount
// -----------------------------------------------------------------------------
const fs = require('fs');
const ins = require('../lib/page-section-insert');
const gen = require('../scripts/csa-11-quiz-mount-csv.js');
const seed = require('../seed/csa-unit-1-web-quizzes.js');

const LIVE = JSON.parse(fs.readFileSync(gen.SNAP, 'utf8'))[gen.HANDLE];
const SPAN = fs.readFileSync(gen.REMOVED_FILE, 'utf8');

let failed = 0, cases = 0;

function ok(name, cond, detail) {
  cases++;
  if (cond) { console.log(`  ok  ${name}`); return; }
  console.error(`  FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  failed++;
}

//  A mutation has to name the rule it broke. `want` is a fragment of that one
//  rule's message, so a case that trips a different guard reads as a failure
//  rather than as a pass.
function refuses(name, { live, removed }, want) {
  cases++;
  const { problems } = gen.build(live, removed);
  if (!problems.length) { console.error(`  REFUSAL EXPECTED, GOT SUCCESS: ${name}`); failed++; return; }
  if (!problems.some((p) => p.includes(want))) {
    console.error(`  REFUSED FOR THE WRONG REASON: ${name}`);
    console.error(`    wanted ${JSON.stringify(want)}, got: ${problems.join(' | ').slice(0, 200)}`);
    failed++; return;
  }
  console.log(`  refused, for its own reason: ${name}`);
}

//  Substituting a different span means substituting it on BOTH sides, or
//  replaceSpan refuses first and the rule under test never runs. That is the
//  trap in mutating a generator whose guards are ordered.
const withSpan = (span) => ({ live: LIVE.replace(SPAN, () => span), removed: span });

console.log('\nbaseline: the recorded live body');
const base = gen.build(LIVE);
ok('builds with no problems', base.problems.length === 0, base.problems.join(' | '));
ok('body shrinks by the span, minus the mount and the script tag',
  base.out.length === LIVE.length - SPAN.length + gen.MOUNT.length + gen.SCRIPT.length,
  `${base.out.length} bytes`);
ok('the removed span is gone in full', !base.out.includes(SPAN));
ok('data-answer count drops by exactly 2', base.answersAfter === base.answersBefore - 2,
  `${base.answersBefore} -> ${base.answersAfter}`);
ok('the mount container is present once', (base.out.match(/data-apcs-quiz/g) || []).length === 1);
ok('the mount script is present once', (base.out.match(/apcs-quiz-mount\.js/g) || []).length === 1);
ok('Part C survives', base.out.includes('Part C: Structured response'));
ok('the scenario Part C depends on survives', base.out.includes('Mr. Ramirez asks'));

//  The point of the whole migration, asserted against the SEED rather than
//  against the page. If the two ever disagree about which option is correct,
//  this is where it shows up, instead of in a student's browser.
console.log('\nthe leak actually closes');
const pack = seed.find((p) => p.location.lesson === '1.1' && p.location.course === 'ap-csa');
ok('the seed has a 1.1 pack to mount', !!pack);
for (const q of pack.questions) {
  const key = q.options[q.correct_index];
  ok(`the live page ships this key today: ${q.qid}`, LIVE.includes(key));
  ok(`it is gone after the swap: ${q.qid}`, !base.out.includes(key));
}

//  A mount whose attributes do not match the seeded location renders an empty
//  box and reads as "no server quiz here", which is indistinguishable from the
//  migration never having happened. Cross-checked so a typo in either file
//  fails offline.
console.log('\nthe mount addresses the bank the seed actually wrote');
for (const [attr, val] of [
  ['data-course', pack.location.course],
  ['data-unit', pack.location.unit],
  ['data-lesson', pack.location.lesson],
  ['data-activity', pack.location.activity_type],
]) {
  ok(`${attr}="${val}" matches the seed`, gen.MOUNT.includes(`${attr}="${val}"`));
}

console.log('\nmutations against the span, one rule each');
refuses('the span is not on the page at all',
  { live: LIVE.replace(SPAN, () => ''), removed: SPAN }, 'occurs 0 times');
refuses('the span occurs twice',
  { live: LIVE.replace(SPAN, () => SPAN + SPAN), removed: SPAN }, 'occurs 2 times');
refuses('the mount is already on the page',
  { live: LIVE.replace(SPAN, () => gen.MOUNT + SPAN), removed: SPAN }, 'ALREADY in the live body');
refuses('the span no longer carries both answer attributes',
  withSpan(SPAN.replace('data-answer="A"', () => 'data-answer="Z"')),
  'no longer contains both answer attributes');
refuses('the span carries a third answer, so the drop would be 3',
  withSpan(SPAN + '<i data-answer="B"></i>'), 'expected a drop of exactly 2');
refuses('the span was aimed past its end and swallows Part C',
  { live: LIVE, removed: LIVE.slice(LIVE.indexOf(SPAN), LIVE.indexOf('Part C: Structured response') + 27) },
  'Part C was lost');
refuses('the span was aimed before its start and swallows the scenario',
  { live: LIVE, removed: LIVE.slice(LIVE.indexOf('Mr. Ramirez asks'), LIVE.indexOf(SPAN) + SPAN.length) },
  'scenario Part C depends on was lost');
refuses('the mount script is already on the page, so it would ship twice',
  { live: LIVE + '\n<script src="/apcs-quiz-mount.js"></script>', removed: SPAN },
  'missing or duplicated');

//  replaceSpan builds its own output, so these two can only be shown to work by
//  handing verifyReplacement a body that is already wrong. The byte swap is the
//  case that matters: same length, one pair of characters transposed, which is
//  what a bad regex does and what a length check cannot see.
console.log('\nmutations against the replacement proof itself');
function verifyRed(name, out, want) {
  cases++;
  const problems = ins.verifyReplacement(LIVE, SPAN, gen.MOUNT, out);
  if (!problems.some((p) => p.includes(want))) {
    console.error(`  MISSED: ${name} (got: ${problems.join(' | ').slice(0, 160) || 'nothing'})`);
    failed++; return;
  }
  console.log(`  caught, for its own reason: ${name}`);
}
const good = LIVE.replace(SPAN, () => gen.MOUNT);
const i = Math.floor(good.length / 2);
verifyRed('two bytes transposed, length unchanged',
  good.slice(0, i) + good[i + 1] + good[i] + good.slice(i + 2), 'byte for byte');
verifyRed('one byte added', good + 'x', 'length is');

//  $&, $` and $' are interpreted by a STRING replacement, so a block carrying
//  one splices in the matched text or the whole body around it. Both replaces in
//  replaceSpan are function replacements. Turn either into a string one and this
//  case goes red.
console.log('\nthe $ hazard');
const hazard = '<div data-apcs-quiz>$& and $` and $\' end</div>';
const swap = ins.replaceSpan({ live: LIVE, removed: SPAN, added: hazard });
ok('a replacement containing $&, $` and $\' round-trips clean', swap.problems.length === 0,
  swap.problems.join(' | '));
ok('and lands verbatim, uninterpreted', swap.out && swap.out.includes(hazard));

console.log(`\n${cases} cases, ${failed} failed`);
process.exit(failed ? 1 : 0);
