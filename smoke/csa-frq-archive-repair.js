'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the archive repair transforms and the rules that gate their sheets.
//
//  OFFLINE. It never touches the storefront: the transforms are exercised
//  against FIXTURES built here, so the suite is deterministic and a bad network
//  day cannot turn it red. Reading live bodies is the generator's job.
//
//  The sections that matter:
//    3  every transform REFUSES rather than no-ops. A repair that silently
//       matches nothing is the worst outcome, because the import reports
//       success and the page is unchanged.
//    6  mutation. Every rule in the shipped validator is broken on purpose and
//       must fire BY NAME.
//
//  Run: npm run smoke:csafrqrepair
// -----------------------------------------------------------------------------
const repair = require('../lib/csa-frq-archive-repair.js');
const gen = require('../scripts/csa-frq-archive-repair-csv.js');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail === undefined ? '' : '  -> ' + JSON.stringify(detail).slice(0, 260))); }
}
const section = (t) => console.log('\n' + t);
function threw(fn, re) {
  try { fn(); return false; } catch (e) { return re ? re.test(e.message) : true; }
}

const spec = repair.spec;

//  A page shaped like the 2004-2013 family: a Curriculum Alignment line, a
//  Study This Topic link, a stale date and a 9-point claim.
function fixture(opts) {
  opts = opts || {};
  return '<div class="frq-wrap">\n'
    + '<p><strong>Curriculum Alignment:</strong> Unit ' + (opts.alignUnit || 2) + ' (Selection/Iteration) (2025-2026 AP CSA)</p>\n'
    + '<p><strong>Study This Topic:</strong> <a href="/pages/' + (opts.studyHandle || 'ap-csa-unit-1-study-guide')
    + '" style="color:#2563eb">Unit 1: Primitive Types Complete Study Guide</a></p>\n'
    + '<p>Points: 9 | Time Estimate: ~22 minutes</p>\n'
    + (opts.date === false ? '' : '<p>The exam is May 15, 2026.</p>\n')
    + '<script type="application/ld+json">{"@type":"FAQPage","x":"' + (opts.badEscape ? 'a \\0 b' : 'fine') + '"}</script>\n'
    + '</div>\n';
}

console.log('CSA FRQ archive repair smoke');

// -- 1  THE SPEC -------------------------------------------------------------
section('1. the canonical spec');
ok('32 title repairs declared', Object.keys(spec.titles).length === 32, Object.keys(spec.titles).length);
ok('11 stub pages declared', Object.keys(spec.stubs).length === 11, Object.keys(spec.stubs).length);
ok('6 unit corrections declared', Object.keys(spec.unitFix).length === 6, Object.keys(spec.unitFix).length);
ok('no handle is both a title repair and a stub',
  !Object.keys(spec.stubs).some((h) => spec.titles[h]),
  Object.keys(spec.stubs).filter((h) => spec.titles[h]));
ok('every unit correction names a unit the spec knows',
  Object.values(spec.unitFix).every((u) => spec.units[String(u.unit)]));
ok('every unit handle is the 4-unit curriculum, not the retired 10-unit one',
  Object.values(spec.units).every((u) => !/Primitive Types|Boolean Expressions|Inheritance/.test(u.name)),
  Object.values(spec.units).map((u) => u.name));
ok('the spec repeats none of the exam numbers', !/\b7, 7, 5 and 6\b/.test(JSON.stringify(spec)));
ok('the exam numbers come from config/csa-frq-2026.json', repair.SECTION_POINTS === 25, repair.SECTION_POINTS);
ok('the spec file is pure ASCII', !/[^\x00-\x7F]/.test(JSON.stringify(spec)));

// -- 2  THE TITLES -----------------------------------------------------------
section('2. the replacement titles');
const allTitles = [...new Set(Object.keys(spec.titles).concat(Object.keys(spec.stubs)))];
ok('every handle resolves to a title', allTitles.every((h) => !!repair.newTitle(h)));
ok('no replacement title lowercases an acronym',
  allTitles.every((h) => !/^Ap Csa |\bFrq\b/.test(repair.newTitle(h))));
ok('every replacement title is 70 characters or fewer',
  allTitles.every((h) => repair.newTitle(h).length <= 70),
  allTitles.map((h) => h + ':' + repair.newTitle(h).length).filter((s) => Number(s.split(':')[1]) > 70));
ok('every replacement title is pure ASCII', allTitles.every((h) => !/[^\x00-\x7F]/.test(repair.newTitle(h))));
ok('every stub title says the question is not tested',
  Object.keys(spec.stubs).every((h) => /Not Tested/.test(repair.newTitle(h))));
ok('no stub title still promises a Complete Solution',
  Object.keys(spec.stubs).every((h) => !/Complete Solution/.test(repair.newTitle(h))));
ok('every replacement title is unique',
  new Set(allTitles.map((h) => repair.newTitle(h))).size === allTitles.length);
ok('a non-stub title keeps the archive\'s own Solution + Rubric shape',
  repair.newTitle('ap-csa-2022-frq-1-game') === '2022 AP CSA FRQ 1: Game Solution + Rubric',
  repair.newTitle('ap-csa-2022-frq-1-game'));

// -- 3  EVERY TRANSFORM REFUSES RATHER THAN NO-OPS ---------------------------
section('3. a transform that matches nothing refuses');
ok('the scoring note refuses a page that already has it',
  threw(() => repair.addScoringNote('h', repair.scoringNote('h')), /already carries/));
ok('the scoring note refuses a page carrying the template callout',
  threw(() => repair.addScoringNote('h', '<details class="frq-2026-callout">x</details>'), /template callout/));
ok('the date fix refuses a page that never names the stale date',
  threw(() => repair.fixDates('h', fixture({ date: false })), /does not name/));
ok('the unit fix refuses a handle with no correction declared',
  threw(() => repair.fixUnit('ap-csa-9999-frq-1', fixture()), /no unit correction/));
ok('the unit fix refuses a page with no Study This Topic link',
  threw(() => repair.fixUnit('ap-csa-2004-frq-3', '<p>nothing here</p>'), /no Study This Topic link/));
ok('the unit fix refuses a page that is already correct',
  threw(() => repair.fixUnit('ap-csa-2004-frq-4',
    fixture({ alignUnit: 4, studyHandle: spec.units['4'].handle })
      .replace('Unit 1: Primitive Types Complete Study Guide', 'Unit 4: Data Collections Complete Study Guide')),
  /matched nothing/));
ok('the JSON-LD fix refuses a page whose blocks already parse',
  threw(() => repair.fixJsonLd('h', fixture()), /no invalid JSON-LD escape/));

// -- 4  WHAT THE TRANSFORMS ACTUALLY DO --------------------------------------
section('4. the transforms');
const noted = repair.addScoringNote('ap-csa-2012-frq-1', fixture()).body;
ok('the note goes at the very top, where a reader lands', /^<style>/.test(noted));
ok('the note is scoped to its own unique id', noted.indexOf('#frq2026note-ap-csa-2012-frq-1{') > 0);
ok('the note carries the all:initial reset the theme requires', /all:initial!important/.test(noted));
ok('the note states the current per-question points', /7, 7, 5 and 6/.test(noted));
ok('the note states the retired 9 points too, so the page does not read as a typo', /worth <strong>9 points<\/strong>/.test(noted));
ok('the note names every question', repair.QUESTIONS.every((q) => noted.indexOf('Question ' + q.number) > 0));
ok('the note links the 2026 set', noted.indexOf('/pages/ap-csa-frq-2026') > 0);
ok('the note adds no non-ASCII', !/[^\x00-\x7F]/.test(noted));
ok('the note adds no em-dash', !/—/.test(noted));
ok('the note does not disturb what was already on the page', noted.indexOf('Points: 9 | Time Estimate') > 0);

const dated = repair.fixDates('h', fixture()).body;
ok('the stale exam date is gone', dated.indexOf('May 15, 2026') < 0);
ok('the next exam date is in', dated.indexOf('May 12, 2027') > 0);
ok('a weekday in front of the stale date is replaced whole, not left wrong',
  repair.fixDates('h', '<p>on Friday, May 15, 2026 you sit it</p>').body.indexOf('Wednesday, May 12, 2027') > 0,
  repair.fixDates('h', '<p>on Friday, May 15, 2026 you sit it</p>').body);

const unitFixed = repair.fixUnit('ap-csa-2004-frq-3', fixture({ alignUnit: 4 })).body;
ok('the retired 10-unit curriculum name is gone', !/Primitive Types/.test(unitFixed));
ok('the study link points at a unit guide that is live', unitFixed.indexOf('/pages/' + spec.units['4'].handle) > 0);
ok('the redirecting handle is gone', unitFixed.indexOf('ap-csa-unit-1-study-guide') < 0);
const alignFixed = repair.fixUnit('ap-csa-2004-frq-4', fixture({ alignUnit: 2 })).body;
ok('a wrong alignment is corrected to the unit the skills line implies',
  /Curriculum Alignment:<\/strong> Unit 4 \(Data Collections\)/.test(alignFixed), alignFixed.slice(0, 200));

const jsonFixed = repair.fixJsonLd('h', fixture({ badEscape: true })).body;
ok('a JSON-LD block that did not parse now parses', (() => {
  const b = jsonFixed.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  try { JSON.parse(b); return true; } catch (e) { return false; }
})());
ok('the JSON-LD fix leaves a block that already parsed alone',
  repair.fixJsonLd('h', fixture({ badEscape: true })).body.indexOf('"fine"') < 0
    || fixture().indexOf('"fine"') > 0);

// -- 5  THE SHEET RULES ------------------------------------------------------
section('5. the sheet rules on a good repair');

//  Mirrors the order the generator applies, so a control here is testing the
//  real pipeline rather than a convenient subset of it. The stale-date rule is
//  two-sided, so a "control" that skips fixDates is not a control, it is a page
//  the repair genuinely left broken.
function fullRepair(handle, body) {
  let out = repair.addScoringNote(handle, body).body;
  if (out.indexOf(spec.dates.staleExam) >= 0) out = repair.fixDates(handle, out).body;
  return out;
}

const before = fixture();
const after = fullRepair('h', before);
ok('a correct repair passes every body rule', gen.checkBody('h', before, after).length === 0, gen.checkBody('h', before, after));
ok('a correct title passes every title rule',
  gen.checkTitle('ap-csa-2022-frq-1-game', repair.newTitle('ap-csa-2022-frq-1-game')).length === 0);
ok('the sheets split by year block, not one file', gen.BLOCKS.length === 4, gen.BLOCKS.map((b) => b.id));
ok('Published At is past-dated', /^2026-03-01/.test(gen.PUBLISHED_AT));

// -- 6  MUTATION -------------------------------------------------------------
section('6. mutation: every body rule broken on purpose, and it must fire by name');
const MUT = [
  //  Shorter than BEFORE, not than AFTER. The rule compares the repaired body
  //  against the original, and the first draft halved the repaired one, which is
  //  still larger than the original once a 4KB note has been added.
  ['a repair that removes content', () => before.slice(0, Math.floor(before.length * 0.5)), /SHORTER/],
  //  Two rows, because the rule is two-sided: a page that had the date must end
  //  with none, and a page that never had one must not gain one.
  ['a repair that leaves the stale date in', (a) => a + '<p>May 15, 2026</p>', /still names it/],
  //  THE ONE THAT GOT THROUGH. The hub carried three countdown scripts, not
  //  two, and the third wrote the time as T08:00:00 where the others wrote
  //  T00:00:00. Every visible date on the page was correct and it went on
  //  counting down to a dead exam. A rule that only reads what a human sees
  //  cannot catch a date living in a script.
  ['a repair that leaves an ISO stale date in a countdown script',
    (a) => a + "<script>var d = new Date('2026-05-15T08:00:00');</script>", /still names it|added a reference to/],
  ['a repair that reintroduces the retired curriculum', (a) => a + '<p>Unit 1: Primitive Types</p>', /added the retired 10-unit curriculum/],
  ['a repair that unbalances the divs', (a) => a + '<div>', /div balance changed/],
  ['a repair that leaves a script element open', (a) => a + '<script>', /unbalanced script/],
  ['a repair that breaks a JSON-LD block', (a) => a + '<script type="application/ld+json">{oops}</script>', /JSON-LD no longer parses/],
  ['a repair that adds an em-dash', (a) => a + '<p>' + String.fromCodePoint(0x2014) + '</p>', /em-dash|non-ASCII/],
  ['a repair that adds non-ASCII', (a) => a + '<p>' + String.fromCodePoint(0xe9) + '</p>', /non-ASCII/],
  //  SINGLE pass, the depth seen on live pages. A double-pass fixture goes
  //  green against a detector blind to the real bug.
  ['a repair that carries single-pass mojibake', (a) => a + '<p>' + String.fromCodePoint(0xe2, 0x20ac, 0xa2) + '</p>', /mojibake/],
];
for (const [name, mutate, want] of MUT) {
  const found = gen.checkBody('h', before, mutate(after));
  ok('caught: ' + name, found.some((m) => want.test(m)), found.length ? found : 'NOTHING FIRED');
}
const TMUT = [
  ['a title that lowercases an acronym', 'Ap Csa 2022 Frq 1 Game', /lowercases an acronym/],
  ['a title over 70 characters', '2022 AP CSA FRQ 1: Game Solution and Rubric and Then Some More Padding Here', /over the 70/],
  ['a title with a non-ASCII character', '2022 AP CSA FRQ 1: Gam' + String.fromCodePoint(0xe9), /non-ASCII/],
];
for (const [name, title, want] of TMUT) {
  const found = gen.checkTitle('ap-csa-2022-frq-1-game', title);
  ok('caught: ' + name, found.some((m) => want.test(m)), found.length ? found : 'NOTHING FIRED');
}
const addedDate = gen.checkBody('h', fixture({ date: false }),
  repair.addScoringNote('h', fixture({ date: false })).body + '<p>May 15, 2026</p>');
ok('caught: a repair that ADDS a stale date to a page that had none',
  addedDate.some((m) => /added a reference to/.test(m)), addedDate.length ? addedDate : 'NOTHING FIRED');

const stubFound = gen.checkTitle('ap-csa-2004-frq-3', '2004 AP CSA FRQ 3: Fish - Complete Solution');
ok('caught: a stub page still promising a Complete Solution',
  stubFound.some((m) => /Complete Solution/.test(m)), stubFound);

//  Controls. A rule that fires at anything proves nothing.
const clean = fixture({ date: false });
ok('control: an unchanged body with nothing to fix stays green',
  gen.checkBody('h', clean, clean).length === 0, gen.checkBody('h', clean, clean));
ok('control: a body that only GREW stays green',
  gen.checkBody('h', clean, clean + '<p>ok</p>').length === 0, gen.checkBody('h', clean, clean + '<p>ok</p>'));
ok('control: pre-existing retired-curriculum text is not the repair\'s fault',
  gen.checkBody('h', before, after).length === 0, gen.checkBody('h', before, after));
ok('control: a title that is simply correct stays green',
  gen.checkTitle('ap-csa-2022-frq-1-game', '2022 AP CSA FRQ 1: Game Solution + Rubric').length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
