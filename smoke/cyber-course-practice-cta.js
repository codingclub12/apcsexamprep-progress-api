'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE PRACTICE HUB AT THE TOP OF THE COURSE.
//
//  The measurement this suite exists to hold: on the served bodies the practice
//  hub was ABSENT from ap-cybersecurity and anchor 247 of 247 on the course
//  guide. After the band it is anchor 2 of 74 and anchor 1 of 249. Both numbers
//  are asserted, because "the link is present" alone is satisfied by the link
//  that was already at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const gen = require('../tools/ap-cyber-ced/generate-course-practice-cta.js');
const { parseCsv } = require('../tools/ap-cyber-ced/sheet-csv');
const rules = require('../tools/ap-cyber-ced/validator.js');

const FIXTURES = path.join(__dirname, 'fixtures', 'live-bodies');

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

const anchorsOf = (s) => [...s.matchAll(/href="[^"]*\/pages\/([^"'#?]+)/g)].map((m) => m[1]);
const hubAt = (s) => anchorsOf(s).indexOf(gen.HUB);

//  Build inside a try so a refusal from the generator is reported as a named
//  failure rather than an uncaught stack trace. A suite that dies is a suite
//  whose output a deploy gate cannot match against, and the gate mutation that
//  breaks buildBody into something other than a pure insertion lands exactly
//  here.
console.log('\nthe practice hub at the top of the course\n');
let built = null;
let buildError = '';
try { built = gen.generate({ bodies: FIXTURES }); } catch (e) { buildError = e.message; }
ok('the generator produces a sheet from the captured live bodies', built !== null, buildError);
if (!built) {
  console.log(`\nFAIL - the generator refused: ${buildError}`);
  process.exit(1);
}
const byHandle = new Map(built.built.map((b) => [b.handle, b]));

// ── the measurement ─────────────────────────────────────────────────────────
{
  const b = byHandle.get('ap-cybersecurity');
  ok('ap-cybersecurity did not link the practice hub at all', hubAt(b.live) === -1,
    `found at ${hubAt(b.live)}`);
  ok('and now links it second of 74 anchors',
    hubAt(b.body) === 1 && anchorsOf(b.body).length === 74,
    `${hubAt(b.body) + 1} of ${anchorsOf(b.body).length}`);
}
{
  const b = byHandle.get('ap-cybersecurity-complete-course-guide');
  ok('the course guide linked the practice hub dead last, 247 of 247',
    hubAt(b.live) === 246 && anchorsOf(b.live).length === 247,
    `${hubAt(b.live) + 1} of ${anchorsOf(b.live).length}`);
  ok('and now links it first of 249',
    hubAt(b.body) === 0 && anchorsOf(b.body).length === 249,
    `${hubAt(b.body) + 1} of ${anchorsOf(b.body).length}`);
}
ok('both course pages also link the full practice exam',
  built.built.filter((b) => !gen.PAGES.find((p) => p.handle === b.handle).edits)
    .every((b) => b.body.includes(`/pages/${gen.EXAM}`)));

// ── nothing is lost ─────────────────────────────────────────────────────────
//  Not a list of markers that must survive: that is what the first draft used,
//  and it could never fire, because a pure insertion cannot remove anything.
//  This is the property that actually holds the guarantee, and that a future
//  edit to buildBody could break: the live body must survive as an exact split
//  with the block between, character for character on both sides.
for (const b of built.built.filter((x) => !gen.PAGES.find((p) => p.handle === x.handle).edits)) {
  const at = b.live.indexOf(gen.PAGES.find((p) => p.handle === b.handle).before);
  const block = b.body.slice(at, b.body.length - (b.live.length - at));
  ok(`${b.handle}: the result is the live body split in two with one block between`,
    b.body === b.live.slice(0, at) + block + b.live.slice(at));
  ok(`${b.handle}: not one character of the live body was removed`,
    b.body.length - b.live.length === block.length
    && b.body.startsWith(b.live.slice(0, at)) && b.body.endsWith(b.live.slice(at)));
}

// ── markup only: no stylesheet and no script moves ──────────────────────────
for (const b of built.built.filter((x) => !gen.PAGES.find((p) => p.handle === x.handle).edits)) {
  const count = (s, t) => s.split(t).length - 1;
  ok(`${b.handle}: no style or script block was added, removed or edited`,
    count(b.body, '<style') === count(b.live, '<style')
    && count(b.body, '<script') === count(b.live, '<script')
    && b.body.match(/<style[\s\S]*?<\/style>/g).join('') === b.live.match(/<style[\s\S]*?<\/style>/g).join(''));
  ok(`${b.handle}: exactly two anchors were added`,
    (b.body.match(/<a\b/gi) || []).length - (b.live.match(/<a\b/gi) || []).length === 2);
  ok(`${b.handle}: div tags still balance`,
    (b.body.match(/<div\b/gi) || []).length - (b.body.match(/<\/div>/gi) || []).length
    === (b.live.match(/<div\b/gi) || []).length - (b.live.match(/<\/div>/gi) || []).length);
}

// ── the band reuses each page's own classes, so it needs no new CSS ─────────
ok('the landing page band is built from that page\'s own classes',
  ['ch-sec-title', 'ch-sec-note', 'ch-startgrid', 'ch-startcard'].every((c) => {
    const b = byHandle.get('ap-cybersecurity');
    return b.live.includes(c) && b.body.includes(c);
  }));
ok('the course guide band is built from that page\'s own announcement class',
  (() => {
    const b = byHandle.get('ap-cybersecurity-complete-course-guide');
    return b.live.includes('class="pilot-bar"')
      && (b.body.match(/class="pilot-bar"/g) || []).length === 2;
  })());

// ── the count is derived from the item bank, not typed ─────────────────────
const bank = require('../config/cyber-exam-items.json');
ok('the copy states the bank\'s own question count', gen.MCQ === bank.items.length, gen.MCQ);
ok('and both bands say it',
  built.built.filter((b) => !gen.PAGES.find((p) => p.handle === b.handle).edits)
    .every((b) => b.body.includes(`${bank.items.length} multiple choice`)));

// ── content rules on what this pass authored ───────────────────────────────
const authored = gen.PAGES.filter((p) => p.block).map((p) => p.block()).join('\n')
  + gen.PAGES.filter((p) => p.edits).flatMap((p) => p.edits.map(([, to]) => to)).join('\n');
ok('the authored bands carry no em-dash, no EK code, no fabricated weighting and no mojibake',
  rules.ruleEmDash(authored, 'body').length === 0
  && rules.ruleEkCodes(authored).length === 0
  && rules.ruleExamWeighting(authored).length === 0
  && rules.ruleMojibake(authored, 'body').length === 0,
  `R3=${rules.ruleEmDash(authored, 'body').length} R1=${rules.ruleEkCodes(authored).length}`
  + ` R2=${rules.ruleExamWeighting(authored).length} R7=${rules.ruleMojibake(authored, 'body').length}`);

// ── the sheet ──────────────────────────────────────────────────────────────
const sheet = parseCsv(built.csv);
ok('three rows: two course pages and the concept index', sheet.rows.length === 3, sheet.rows.length);
ok('both are MERGE', sheet.rows.every((r) => r.Command === 'MERGE'));
ok('the sheet carries Body HTML only, so no other column is blanked',
  gen.HEADER.join(',') === 'Handle,Command,Body HTML', gen.HEADER.join(','));
ok('neither Body HTML cell is empty, which under MERGE erases the page',
  sheet.rows.every((r) => r['Body HTML'].length > 15000));
ok('the sheet round-trips through CSV with no drift',
  sheet.rows.every((r) => r['Body HTML'] === byHandle.get(r.Handle).body));


// ── the concept index, which is edits rather than a band ────────────────────
//  It already had a quick-nav pill row under its hero, so the fix belongs IN
//  that row. Two things were wrong: the practice hub was anchor 52 of 52, and
//  the row's one practice pill read "Practice" and pointed at the sampler.
{
  const b = byHandle.get('ap-cybersecurity-topics');
  const P = gen.PAGES.find((p) => p.handle === 'ap-cybersecurity-topics');
  ok('the topics hub linked the practice hub dead last, 52 of 52',
    hubAt(b.live) === 51 && anchorsOf(b.live).length === 52,
    `${hubAt(b.live) + 1} of ${anchorsOf(b.live).length}`);
  ok('and now links it second of 53, in the quick nav under the hero',
    hubAt(b.body) === 1 && anchorsOf(b.body).length === 53,
    `${hubAt(b.body) + 1} of ${anchorsOf(b.body).length}`);
  ok('the new pill sits inside the quick-nav row, not in a second strip',
    /<div class="cyt-nav">[\s\S]{0,400}\/pages\/ap-cybersecurity-practice"/.test(b.body));
  ok('the sampler pill no longer reads just "Practice", which named the wrong page',
    b.live.includes('>Practice</a>') && !b.body.includes('>Practice</a>')
    && b.body.includes('>Quick Sampler</a>'));
  ok('neither new label states a question count, so neither can go stale',
    P.edits.every(([, to]) => !/\d+[- ]question|\d+\s*MCQ/i.test(to)));
  ok('undoing the declared edits reproduces the live body exactly',
    (() => {
      let back = b.body;
      for (const [from, to] of P.edits) back = back.replace(to, from);
      return back === b.live;
    })());
  ok('no stylesheet or script was touched',
    b.body.match(/<style[\s\S]*?<\/style>/g).join('') === b.live.match(/<style[\s\S]*?<\/style>/g).join('')
    && (b.body.match(/<script/g) || []).length === (b.live.match(/<script/g) || []).length);
  ok('exactly one anchor was added', anchorsOf(b.body).length - anchorsOf(b.live).length === 1);
}

// ── mutations ──────────────────────────────────────────────────────────────
console.log();
const LANDING = gen.PAGES.find((p) => p.handle === 'ap-cybersecurity');
const liveLanding = fs.readFileSync(path.join(FIXTURES, 'ap-cybersecurity.html'), 'utf8');
const refuse = (label, fn, re) => {
  let msg = '';
  try { fn(); } catch (e) { msg = e.message; }
  ok(label, re.test(msg), msg || 'the generator did NOT refuse');
};

refuse('MUTATION: an empty stored body is refused, never an empty cell',
  () => gen.buildBody(LANDING, '   '), /empty/);

refuse('MUTATION: a body that already carries the band is refused, not doubled',
  () => gen.buildBody(LANDING, byHandle.get('ap-cybersecurity').body), /already carries/);

refuse('MUTATION: an insertion point that matches twice is refused',
  () => gen.buildBody(LANDING, liveLanding + LANDING.before), /matched 2 times/);

refuse('MUTATION: an insertion point that matches nothing is refused',
  () => gen.buildBody(LANDING, liveLanding.replace(LANDING.before, '  <!-- moved -->')),
  /matched 0 times/);

//  A band that does not actually link both practice pages is refused. The first
//  draft of this mutation instead removed a declared "carried" marker, and it
//  could not fire: buildBody is a pure insertion, so nothing it produces can be
//  missing a section the live body had. That check was dead code and is gone
//  from the generator rather than kept for the look of it. The property it was
//  supposed to protect is proved by the exact-split assertion above, and that
//  assertion's own mutation is in the deploy gate, where breaking buildBody is
//  the only way to reach it.
refuse('MUTATION: a band that links only one of the two practice pages is refused',
  () => gen.buildBody(
    { ...LANDING, block: () => `  ${gen.MARK}\n  <a href="/pages/${gen.HUB}">only one</a>\n` },
    liveLanding),
  /does not link both practice pages|anchor count moved by 1/);

refuse('MUTATION: a missing stored body file is refused',
  () => gen.generate({ bodies: path.join(FIXTURES, 'nope') }), /no stored body/);


//  ── edits mode ────────────────────────────────────────────────────────────
const TOPICS = gen.PAGES.find((p) => p.handle === 'ap-cybersecurity-topics');
const liveTopics = fs.readFileSync(path.join(FIXTURES, 'ap-cybersecurity-topics.html'), 'utf8');

refuse('MUTATION: an edit whose anchor matches nothing is refused',
  () => gen.buildBody({ ...TOPICS, edits: [['a string this page does not contain', 'x']] }, liveTopics),
  /matched 0 times/);

refuse('MUTATION: an edit whose anchor matches twice is refused',
  () => gen.buildBody({ ...TOPICS, edits: [['</a>', 'x']] }, liveTopics),
  /matched \d+ times/);

refuse('MUTATION: edits that change nothing are refused as a no-op',
  () => gen.buildBody({ ...TOPICS, edits: [['>Practice</a>', '>Practice</a>']] }, liveTopics),
  /changed nothing|no-op/);

//  Relabelling the sampler pill WITHOUT adding the hub pill leaves the hub where
//  it was, at anchor 52 of 52. The guard is ordinal, so it fires. An existential
//  "does it link the hub" check would not: that was already true from the bottom,
//  which is the third time in this session that distinction has mattered.
refuse('MUTATION: edits that relabel but leave the hub at the bottom are refused',
  () => gen.buildBody({ ...TOPICS, edits: [TOPICS.edits[1]] }, liveTopics),
  /not inside the first \d+/);

//  The count must come from the bank. Stub the bank smaller, re-require the
//  generator, and the copy has to move with it. A typed 60 would not.
{
  const bankPath = require.resolve('../config/cyber-exam-items.json');
  const genPath = require.resolve('../tools/ap-cyber-ced/generate-course-practice-cta.js');
  const real = require.cache[bankPath].exports;
  let derived = false;
  try {
    require.cache[bankPath].exports = { ...real, items: real.items.slice(0, 41) };
    delete require.cache[genPath];
    const stubbed = require(genPath);
    derived = stubbed.MCQ === 41
      && stubbed.PAGES.filter((p) => p.block).every((p) => p.block().includes('41 multiple choice'));
  } finally {
    require.cache[bankPath].exports = real;
    delete require.cache[genPath];
    require(genPath);
  }
  ok('MUTATION: shrink the item bank and the copy states the new count, so it is derived',
    derived);
}

console.log();
if (fails.length) {
  console.log(`FAIL - ${fails.length} of ${pass + fails.length} checks`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK - ${pass} checks, 11 mutations, every one caught by the rule that claims it`);
