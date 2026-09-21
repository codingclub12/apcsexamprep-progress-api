'use strict';
// -----------------------------------------------------------------------------
//  DID THE CSP NOTES SHEETS ACTUALLY LAND, AND IS WHAT THEY NOW SAY TRUE?
//
//  Run this BEFORE importing as well as after. Before, it tells you whether a
//  sheet is still needed: a generated sheet goes stale, and on 2026-09-08 one
//  nearly MERGED a five-day-old body over a page somebody had already fixed.
//  After, it is the live check the deploy gate wants.
//
//  IT ASKS THE THING THAT MATTERS, NOT THE THING THAT IS EASY TO SEE. "CFU is
//  gone" is only half. A page could lose the word and still point at a section
//  that does not exist, which is the original defect wearing different words. So
//  it also reads the LESSON page and confirms the section being named is really
//  there, with the number of questions the sentence claims.
//
//  Fetches through lib/storefront-fetch: no User-Agent, and a positive marker a
//  challenge page cannot fake. Three verifiers once reported a confident, false
//  regression because a 403 interstitial contains none of the strings a check
//  looks for, so every "this string is gone now" passed on it.
//
//    node scripts/verify-csp-notes-cfu-live.js
//    node scripts/verify-csp-notes-cfu-live.js --before   # expect NOT yet fixed
// -----------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch');
const { DATA, forTopic } = require('./csp-notes-cfu-fix');

const before = process.argv.includes('--before');

function bodyOf(handle) {
  const r = sf.raw('/pages/' + handle + '.json');
  const j = JSON.parse(r.body);
  const p = j.page || j;
  if (typeof p.body_html !== 'string') throw new Error(handle + ': no body_html in the page JSON');
  return p.body_html;
}

const rows = [];
let fixed = 0, stale = 0, broken = 0;

for (const p of DATA.pages) {
  const want = forTopic(DATA.rules[0].replace, p.topic);
  const wantHdr = forTopic(DATA.rules[1].replace, p.topic);
  const r = { handle: p.handle, topic: p.topic, notes: [], lesson: [] };

  let notes, lesson;
  try { notes = bodyOf(p.handle); } catch (e) { r.notes.push('FETCH: ' + e.message); }
  try { lesson = bodyOf(p.lesson_handle); } catch (e) { r.lesson.push('FETCH: ' + e.message); }

  if (notes) {
    const cfu = (notes.match(/CFU/g) || []).length;
    const hits = notes.split(want).length - 1;
    const hdr = notes.split(wantHdr).length - 1;
    if (cfu) r.notes.push(cfu + ' x CFU still on the page');
    if (!hits) r.notes.push('the per-section sentence is not there');
    if (!hdr) r.notes.push('the header sentence is not there');
    r.cfu = cfu; r.hits = hits; r.hdr = hdr;
  }

  //  The half that makes the sentence TRUE rather than merely CFU-free.
  if (lesson) {
    const heading = (lesson.match(/MCQ Practice/g) || []).length;
    const qs = new Set((lesson.match(/data-item="(q\d+)"/g) || [])).size;
    if (heading !== 1) r.lesson.push('"MCQ Practice" appears ' + heading + ' times, expected 1');
    if (qs !== DATA.lesson_page_invariant.questions) {
      r.lesson.push(qs + ' questions, but the notes now promise ' + DATA.lesson_page_invariant.questions);
    }
    r.q = qs; r.heading = heading;
  }

  const notesOk = notes && r.notes.length === 0;
  const lessonOk = lesson && r.lesson.length === 0;
  if (notesOk && lessonOk) fixed++;
  else if (notes && r.cfu > 0 && r.hits === 0) stale++;
  else broken++;
  rows.push(r);
}

console.log('\n  CSP guided notes, CFU reference, ' + DATA.pages.length + ' pages\n');
for (const r of rows) {
  const notesOk = r.notes.length === 0;
  const lessonOk = r.lesson.length === 0;
  const tag = notesOk && lessonOk ? 'FIXED  ' : (r.cfu > 0 && r.hits === 0 ? 'NOT YET' : 'PROBLEM');
  console.log('  [' + tag + '] ' + r.handle
    + '  (topic ' + r.topic + ', lesson: "MCQ Practice" x' + (r.heading === undefined ? '?' : r.heading)
    + ', ' + (r.q === undefined ? '?' : r.q) + ' questions)');
  [...r.notes, ...r.lesson].forEach((m) => console.log('              ' + m));
}

console.log('\n  fixed ' + fixed + '   not yet ' + stale + '   problem ' + broken + '\n');

if (before) {
  //  Before an import, "not yet" is the expected state and a page already fixed
  //  means the sheet for it is stale and must not be imported.
  if (fixed) {
    console.log('  ' + fixed + ' page(s) are ALREADY FIXED. Those sheets are stale, do not import them.');
    process.exit(1);
  }
  console.log('  All ' + stale + ' page(s) still carry the defect, so the sheets are current.');
  process.exit(broken ? 1 : 0);
}

if (fixed !== DATA.pages.length) {
  console.log('  Expected all ' + DATA.pages.length + ' fixed. Re-run the import for the ones above.');
  process.exit(1);
}
console.log('  All ' + DATA.pages.length + ' pages name a section that exists, with the right question count.');
