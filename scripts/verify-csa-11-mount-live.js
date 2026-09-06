'use strict';
// -----------------------------------------------------------------------------
//  DID STEP 2 FOR CSA 1.1 ACTUALLY LAND? ASK THE STOREFRONT AND THE API.
//
//  Run this AFTER the Matrixify import of matrixify/csa-11-quiz-mount-pages.csv.
//
//  EVERY ASSERTION HERE WAS FALSE BEFORE THE IMPORT, which is the requirement
//  for a live check and the reason none of them is "the page loads". Measured on
//  the fetched body before the import: 103,181 bytes, nine `data-answer`
//  attributes, no `data-apcs-quiz` anywhere, no mount script, and both correct
//  option texts sitting in the HTML for anyone who opens View Source.
//
//  It checks BOTH ENDS, because either half alone passes a broken deploy:
//
//    the page   the questions and their keys are gone, the mount is there once,
//               the script is there once, Part C and the scenario survive
//    the API    GET /api/quiz/ap-csa/unit-1/1.1/quiz answers with the two
//               questions and no key of any kind
//
//  A page that dropped its questions while the API answered "No server-scored
//  quiz for this location" is a lesson with no quiz on it at all, and it would
//  look like a clean import to anything reading only the body.
//
//  THE ONE THAT IS EXPENSIVE TO GET WRONG. The sheet deletes 3,602 bytes out of
//  the middle of a 103KB body, which is the shape of the /pages/join incident.
//  So this also asserts the page did not SHRINK past what the swap accounts for.
//  lib/live-body-guard.js's contentLoss returned zero findings on a deliberate
//  2KB deletion when this was written, so a coarse guard is not enough here and
//  the arithmetic is stated rather than eyeballed.
//
//  Fetches go through lib/storefront-fetch.js and send NO User-Agent: bot
//  management 403s a spoofed browser, and the challenge body contains none of
//  the strings below, so every "this is gone now" assertion would pass on it
//  vacuously. Most of this script is exactly that shape.
//
//    node scripts/verify-csa-11-mount-live.js
// -----------------------------------------------------------------------------
const fs = require('fs');
const sf = require('../lib/storefront-fetch');
const gen = require('./csa-11-quiz-mount-csv.js');
const seed = require('../seed/csa-unit-1-web-quizzes.js');

const API = process.env.API_BASE || 'https://progress.apcsexamprep.com';
const SPAN = fs.readFileSync(gen.REMOVED_FILE, 'utf8');
const BEFORE = JSON.parse(fs.readFileSync(gen.SNAP, 'utf8'))[gen.HANDLE];
const pack = seed.find((p) => p.location.course === 'ap-csa' && p.location.lesson === '1.1');

let failed = 0;
function ok(name, cond, detail) {
  if (cond) { console.log(`  ok    ${name}`); return; }
  console.error(`  FAIL  ${name}${detail ? `: ${detail}` : ''}`);
  failed++;
}

console.log(`\n/pages/${gen.HANDLE}`);
const body = sf.pageBody(gen.HANDLE).body_html;
console.log(`  ${body.length} bytes live, ${BEFORE.length} before the import\n`);

//  The point of the whole migration.
ok('the removed span is gone', !body.includes(SPAN));
for (const q of pack.questions) {
  const key = q.options[q.correct_index];
  ok(`the key for ${q.qid} is no longer in the page source`, !body.includes(key));
}
const answers = (body.match(/data-answer=/g) || []).length;
ok('data-answer count dropped by exactly 2', answers === 7, `${answers} attributes, expected 7`);

//  The mount, and the script that drives it. Once each: a MERGE run twice is a
//  real way to get two of either.
ok('the mount container is present exactly once',
  (body.match(/data-apcs-quiz/g) || []).length === 1);
ok('the mount script is present exactly once',
  (body.match(/apcs-quiz-mount\.js/g) || []).length === 1);

//  Read the attributes off the mount TAG, not off the page. `data-course="ap-csa"`
//  appears elsewhere in this body, so a whole-page includes() passed before the
//  import had happened at all, which is the definition of a decorative check.
//  Matching the tag also survives Shopify reordering attributes on save.
const tag = (body.match(/<[a-z]+[^>]*\bdata-apcs-quiz\b[^>]*>/i) || [null])[0];
ok('the mount is a tag we can read attributes off', !!tag);
for (const [attr, val] of [
  ['data-course', 'ap-csa'], ['data-unit', 'unit-1'],
  ['data-lesson', '1.1'], ['data-activity', 'quiz'],
]) ok(`the mount carries ${attr}="${val}"`, !!tag && tag.includes(`${attr}="${val}"`));

//  Nothing else went with it.
ok('Part C survives', body.includes('Part C: Structured response'));
ok('the scenario Part C depends on survives', body.includes('Mr. Ramirez asks'));
ok('data-item-id="1.1-quiz" is still on the section', body.includes('data-item-id="1.1-quiz"'));

//  Shopify reformats HTML on save, so the byte count will not match the
//  generator's output exactly. What must hold is that nothing beyond the swap
//  went missing, with room for the reformatting in one direction only.
const expected = BEFORE.length - SPAN.length + gen.MOUNT.length + gen.SCRIPT.length;
ok('the body did not shrink past what the swap accounts for',
  body.length >= expected - 200,
  `${body.length} bytes, the swap alone predicts ${expected}, short by ${expected - body.length}`);

//  The other end. A page with no questions and an API that has none either is a
//  lesson with no quiz, and the body alone cannot tell you which happened.
console.log(`\nGET /api/quiz/ap-csa/unit-1/1.1/quiz`);
const r = sf.raw(`${API}/api/quiz/ap-csa/unit-1/1.1/quiz`);
ok('answers 200', r.code === '200', `answered ${r.code}`);
let payload = null;
try { payload = JSON.parse(r.body); } catch (e) { ok('answers JSON', false, e.message); }
const qs = (payload && payload.questions) || [];
ok('serves both questions', qs.length === pack.questions.length,
  `${qs.length} questions, expected ${pack.questions.length}`);

//  The key checks below are NEGATIVE, so they pass on a 404 body, on an error
//  body, and on anything else that simply does not contain the word. Running
//  them against a payload that carries no questions is the same failure the
//  storefront challenge page caused three verifiers in this repo: a confident
//  green that measured nothing. They only mean something once questions arrived.
if (!qs.length) {
  console.log('  SKIPPED (no questions served, so the key checks would pass vacuously):');
  console.log('    correct_index absent, explanation absent, correct option unflagged');
} else {
  ok('serves no correct_index', !/correct_index/.test(r.body));
  ok('serves no explanation', !/explanation/.test(r.body));
  //  The form a leak would actually take: the right option present and flagged.
  for (const q of pack.questions) {
    const key = q.options[q.correct_index];
    const served = qs.find((x) => (x.options || []).includes(key));
    ok(`the correct option for ${q.qid} is served with no flag on it`,
      !!served && !JSON.stringify(served).replace(JSON.stringify(key), '').includes(key));
  }
}

console.log(`\n${failed ? `${failed} FAILED` : 'all clear: the page stopped owning the quiz and the API owns it'}`);
process.exit(failed ? 1 : 0);
