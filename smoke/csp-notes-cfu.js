'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CSP NOTES CFU SHEET BUILDER, AND EACH OF ITS REFUSALS BROKEN ON PURPOSE.
//
//  The generator rewrites 67 sentences inside 301 KB of live page body and ships
//  the result as a MERGE, which has no undo. Every refusal in it is a way that
//  could damage a live page, so each one is broken here INDEPENDENTLY and must
//  produce ITS OWN message. A suite that goes red for a different rule is
//  telling you the rule you meant to test is hollow.
//
//  THESE MUTATIONS ARE IN MEMORY. `build()` takes the live bodies as a
//  parameter precisely so this file never writes sabotage into the tree, which
//  is the failure smoke/mutation-leak.js exists to catch. Nothing here touches
//  a file, so this is deliberately not named *-mutation.js.
//
//  Run: npm run smoke:cspnotescfu
// ─────────────────────────────────────────────────────────────────────────────
const { build, DATA, forTopic, parseBack, sheet, inverseOf } = require('../scripts/csp-notes-cfu-fix');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) { pass++; console.log(`  [PASS] ${label}`); }
  else { fail++; console.log(`  [FAIL] ${label}${extra !== undefined ? '\n           ' + JSON.stringify(extra) : ''}`); }
}
//  A mutation must be refused FOR THE STATED REASON. Matching on the message is
//  the whole point: `problems.length > 0` would pass on the wrong rule firing.
function refusedBecause(label, live, needle) {
  const { problems } = build(live);
  const hit = problems.some((p) => p.includes(needle));
  ok(label, hit, hit ? undefined : { needle, problems: problems.slice(0, 4) });
}

//  A body shaped like the real ones: one header sentence, then one per-section
//  prompt per remaining CFU sentence, wrapped in the markup they actually sit
//  in. Built from the canonical rules so it cannot drift from what ships.
function synth(topic, cfuCount, extra) {
  const hdr = forTopic(DATA.rules[1].find, topic);
  const sec = forTopic(DATA.rules[0].find, topic);
  let b = '<h2>Guided Notes</h2>\n<p class="sub">Fill these in during class or catch up here if you were absent. '
    + hdr + '</p>\n';
  for (let i = 1; i < cfuCount; i++) {
    b += `<h3>0${i}. Section ${i}</h3>\n<p class="muted">Answer in complete sentences. ${sec}</p>\n`
      + '<div class="wl"></div>\n';
  }
  return b + (extra || '');
}

function allGood() {
  const live = {};
  for (const p of DATA.pages) live[p.handle] = synth(p.topic, p.cfu_sentences);
  return live;
}

//  ── 1. THE HAPPY PATH ──────────────────────────────────────────────────────
console.log('\n  A faithful set of bodies builds clean\n');
{
  const { problems, pages, sheets } = build(allGood());
  ok('no problems on a clean build', problems.length === 0, problems.slice(0, 5));
  ok(`all ${DATA.expected_pages} pages built`, pages.length === DATA.expected_pages);
  ok('split into one sheet per Big Idea (1, 2, 4, 5)',
    sheets.map((s) => s.bigIdea).join(',') === '1,2,4,5', sheets.map((s) => s.bigIdea));
  ok(`the split is lossless: ${DATA.expected_pages} pages across the sheets`,
    sheets.reduce((a, s) => a + s.rows.length, 0) === DATA.expected_pages);
  ok('no page appears in two sheets',
    new Set(sheets.flatMap((s) => s.rows.map((r) => r.handle))).size === DATA.expected_pages);
  const everyOut = pages.map((p) => p.out).join('');
  ok('no CFU survives anywhere in the output', !everyOut.includes('CFU'));
  ok('every page names MCQ Practice afterwards',
    pages.every((p) => p.out.includes('MCQ Practice')));
  ok('every page still names its own topic',
    pages.every((p) => p.out.includes('Topic ' + p.topic + ' page')));
  ok(`canonical total of ${DATA.expected_cfu_sentences_total} CFU sentences is what the pages declare`,
    DATA.pages.reduce((a, p) => a + p.cfu_sentences, 0) === DATA.expected_cfu_sentences_total);
}

//  ── 2. STALE SHEET: the page is already fixed ──────────────────────────────
//  The 2026-09-08 near miss. A sheet built from an old read, imported a day
//  later over a page somebody had already improved, reverts the better fix and
//  nothing announces it.
console.log('\n  A page that already carries the replacement is refused\n');
{
  const live = allGood();
  const p = DATA.pages[0];
  live[p.handle] = live[p.handle].split(forTopic(DATA.rules[0].find, p.topic))
    .join(forTopic(DATA.rules[0].replace, p.topic));
  refusedBecause('stale sheet is caught by name', live, 'already contains the per-section replacement');
}

//  ── 3. THE PAGE MOVED UNDER US: fewer sentences than the audit found ───────
console.log('\n  A page edited since the audit is refused\n');
{
  const live = allGood();
  const p = DATA.pages[0];
  live[p.handle] = live[p.handle].replace(forTopic(DATA.rules[0].find, p.topic), 'Something else entirely.');
  refusedBecause('a missing sentence is caught', live, 'expected ' + p.cfu_sentences + ' CFU sentences, matched');
}

//  ── 4. NO HEADER, OR TWO ───────────────────────────────────────────────────
console.log('\n  A page without exactly one header sentence is refused\n');
{
  const live = allGood();
  const p = DATA.pages[1];
  live[p.handle] += '\n<p>' + forTopic(DATA.rules[1].find, p.topic) + '</p>';
  refusedBecause('a second header is caught', live, 'expected exactly 1 header sentence, matched 2');
}

//  ── 5. CFU SURVIVES ────────────────────────────────────────────────────────
//  The rule the whole job exists for. A CFU mention in a shape the rules do not
//  cover must fail loudly rather than ship a page that still cannot be searched.
console.log('\n  A CFU mention the rules do not cover is refused\n');
{
  const live = allGood();
  const p = DATA.pages[2];
  live[p.handle] += '\n<p>See the CFUs at the end of the unit.</p>';
  refusedBecause('an uncovered CFU mention is caught', live, 'occurrence(s) of CFU survived');
}

//  ── 6. THE INVERSE ROUND TRIP ──────────────────────────────────
//  The rule that guards the other 299,000 bytes, tested on the rule itself.
//
//  An earlier version of this section tried to break it end to end by making a
//  replacement lossy, and came back GREEN. That was the test being hollow, not
//  the rule: sequential split/join over non-colliding tokens is exactly
//  invertible, so no amount of appending to the data makes it lose bytes. The
//  property worth asserting is the one build() actually relies on, so it is
//  asserted directly: a body that differs ANYWHERE outside the declared
//  sentences must fail to reconstruct.
console.log('\n  A rewrite that changes anything else is refused\n');
{
  const rules = [{ find: 'check yourself with the CFUs', replace: 'check yourself with MCQ Practice' }];
  const body = '<p>Intro. check yourself with the CFUs here.</p><p>Untouched tail.</p>';
  const clean = body.split(rules[0].find).join(rules[0].replace);

  ok('a clean rewrite reconstructs the live body byte for byte',
    inverseOf(clean, rules) === body);

  //  The same rewrite, plus one stray edit somewhere else in the page.
  const stray = clean.replace('Untouched tail.', 'Untouched taiI.');
  ok('one character changed outside the declared sentence is caught',
    inverseOf(stray, rules) !== body, { got: inverseOf(stray, rules) });

  //  And a deletion, which is the shape that would quietly cost a page content.
  const dropped = clean.replace('<p>Untouched tail.</p>', '');
  ok('a deleted paragraph is caught', inverseOf(dropped, rules) !== body);

  //  Byte-identical output must NOT be reported as a difference, or the rule
  //  would refuse every good sheet and get switched off within a day.
  ok('an untouched body is not falsely accused', inverseOf(body, []) === body);
}

//  ── 7. THE SPLIT DROPS A PAGE ──────────────────────────────────────────────
console.log('\n  A build missing a page is refused\n');
{
  const live = allGood();
  delete live[DATA.pages[4].handle];
  refusedBecause('a missing body is caught', live, 'no live body supplied');
  const { problems } = build(live);
  ok('and the page count refuses too', problems.some((p) => p.includes('expected 17 pages, built 16')),
    problems.slice(0, 3));
}

//  ── 8. THE CSV ENVELOPE ────────────────────────────────────────────────────
//  Generation is not evidence that generation worked. The reader is written
//  against the emitter rather than shared with it, so a quoting bug shows up as
//  a disagreement instead of cancelling out.
console.log('\n  The sheet survives being read back by an independent reader\n');
{
  const rows = [{ handle: 'h-1', out: 'a "quoted" body, with a comma\r\nand a newline' }];
  const parsed = parseBack(sheet(rows));
  ok('one data row round trips', parsed && parsed.length === 1, parsed && parsed.length);
  ok('quotes, commas and newlines survive the round trip',
    parsed && parsed[0]['Body HTML'] === rows[0].out, parsed && parsed[0]['Body HTML']);
  ok('the command is MERGE', parsed && parsed[0].Command === 'MERGE');
  ok('the file carries a BOM', sheet(rows).charCodeAt(0) === 0xFEFF);
  ok('no Published At column is emitted', !sheet(rows).includes('Published At'));
}

//  ── 9. THE CANONICAL FILE IS ASCII ─────────────────────────────────────────
console.log('\n  The canonical file stays pure ASCII\n');
{
  const raw = require('fs').readFileSync(require('path').join(__dirname, '..', 'seed', 'csp-notes-cfu-fix.json'), 'utf8');
  /* eslint-disable no-control-regex */
  ok('seed/csp-notes-cfu-fix.json is pure ASCII on disk', !/[^\x00-\x7F]/.test(raw));
  ok('and still parses to the em-dash the live bodies carry',
    DATA.rules[1].find.includes(String.fromCharCode(0x2014)));
  ok('the replacement drops that em-dash', !DATA.rules[1].replace.includes(String.fromCharCode(0x2014)));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
