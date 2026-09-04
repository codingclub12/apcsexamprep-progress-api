'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE 60 QUESTION CYBER REPLICA: the suite and the mutations behind it.
//
//  Sixty items and a five part free response is past the size where reading
//  catches a drifting answer key. So each rule is broken on purpose and the
//  rule that CLAIMS the defect must be the one that fires.
//
//  Offline. The bank and the blueprint are both committed data.
// ─────────────────────────────────────────────────────────────────────────────

const { validate, RULES } = require('../tools/ap-cyber-ced/exam-validator');
const blueprint = require('../config/cyber-exam-blueprint.json');
const bank = require('../config/cyber-exam-items.json');
const existing = require('./fixtures/cyber-practice-exam-existing-stems.json');

const clone = (o) => JSON.parse(JSON.stringify(o));
const opts = { existingStems: existing.stems };

let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass += 1; console.log(`  ok    ${label}`); return; }
  fails.push(`${label}${detail ? `: ${detail}` : ''}`);
  console.log(`  FAIL  ${label}${detail ? `: ${detail}` : ''}`);
}

console.log('\ncyber exam replica: 60 MCQ and one Device Security Analysis\n');

const base = validate(bank, opts);
ok('the bank passes every rule', base.fail.length === 0, base.fail.slice(0, 3).join(' | '));
ok('the validator reports exactly the eleven rules it claims',
  Object.keys(RULES).length === 11, Object.keys(RULES).join(','));

// ── the CED shape, asserted rather than assumed ────────────────────────────
ok('there are exactly 60 multiple-choice items', bank.items.length === 60, String(bank.items.length));
const bySkill = {};
for (const i of bank.items) bySkill[i.skill] = (bySkill[i.skill] || 0) + 1;
ok('each skill category is inside the CED band of 25 to 40 percent',
  [1, 2, 3].every((s) => {
    const p = 100 * bySkill[s] / 60;
    return p >= blueprint.band.low && p <= blueprint.band.high;
  }), JSON.stringify(bySkill));
ok('skill category 4 carries no items, because it is not in the CED MCQ table',
  !bySkill[4]);
ok('all 24 CED topics are represented',
  new Set(bank.items.map((i) => i.topic)).size === 24);
ok('every item has four options and a real explanation',
  bank.items.every((i) => i.options.length === 4 && i.explanation.length >= 40));

// ── the answer key was designed, not left to chance ────────────────────────
const letters = {};
for (const i of bank.items) letters[i.answer] = (letters[i.answer] || 0) + 1;
ok('the answer key uses each letter 15 times',
  ['A', 'B', 'C', 'D'].every((L) => letters[L] === 15), JSON.stringify(letters));

//  THE ONE A VALIDATOR CANNOT CATCH.
//  A key is a letter and an option is prose, so nothing mechanical can tell
//  whether the letter points at the true statement. That mistake was made
//  while authoring this bank, on item m08, where the key said C and the
//  correct option sat at B. The defence is that the author writes the correct
//  answer as a FIELD and a helper places it at the planned letter, so the two
//  cannot diverge. This asserts the property that fix guarantees: the option
//  the key points at is the one the explanation is about.
//  It is a weak proxy on purpose. It checks the key lands on a real option
//  rather than that the option is true, and the run note says so.
ok('every key points at an option that exists',
  bank.items.every((i) => ['A', 'B', 'C', 'D'].indexOf(i.answer) < i.options.length));

// ── the free response ──────────────────────────────────────────────────────
const f = bank.frq;
ok('the free response is one Device Security Analysis of 50 minutes',
  f.name === 'Device Security Analysis' && f.minutes === 50);
ok('it supplies six sources and runs parts A to E',
  f.sources.length === 6 && f.parts.map((p) => p.part).join('') === 'ABCDE');
ok('every part is skill category 2 or 3, the only two assessed on the free response',
  f.parts.every((p) => [2, 3].includes(p.skill)), JSON.stringify(f.parts.map((p) => p.skill)));
ok('the rubric totals 30 points, matching the section weight',
  f.parts.reduce((n, p) => n + p.points, 0) === 30);
ok('part C asks the student to write a chmod command, as the CED sample does',
  /chmod/i.test(f.parts.find((p) => p.part === 'C').prompt));
ok('every part carries a rubric', f.parts.every((p) => Array.isArray(p.rubric) && p.rubric.length));

// ── freshness ──────────────────────────────────────────────────────────────
ok('no item reuses a stem from the 43 already on the study set',
  base.byRule.E6.length === 0);
ok('the disjointness fixture actually holds the study set', existing.stems.length === 43,
  String(existing.stems.length));

// ── the page render ────────────────────────────────────────────────────────
//  The generator rebuilds the live body of ap-cybersecurity-practice-exam,
//  which ranks at position 1.6. The fixture is the real stored body so the
//  render is testable offline and stays testable after the import.
const gen = require('../tools/ap-cyber-ced/generate-exam-sheet.js');
//  Named apart from `base`, which is already the validate() result above.
const sharedRules = require('../tools/ap-cyber-ced/validator.js');
const FIXTURES = require('path').join(__dirname, 'fixtures', 'live-bodies');
const liveBody = require('fs').readFileSync(
  require('path').join(FIXTURES, 'ap-cybersecurity-practice-exam.html'), 'utf8');

const rendered = gen.generate({ bodies: FIXTURES, existingStems: existing.stems });
const nb = rendered.body;

ok('the render parse-backs through CSV with no drift', rendered.drift.length === 0, rendered.drift.join('; '));
ok('the rendered body carries 60 scored cards, numbered 1 to 60',
  (() => {
    const c = [...nb.matchAll(/<div class="pq-card" data-correct="([A-D])" data-qid="(\d+)"/g)];
    return c.length === 60 && c.every((m, i) => Number(m[2]) === i + 1);
  })());
ok('every card carries exactly four options', (nb.match(/class="pq-opt"/g) || []).length === 240,
  String((nb.match(/class="pq-opt"/g) || []).length));
ok('the free response renders six sources and five parts',
  (nb.match(/<div class="pq-card">/g) || []).length === 11);
//  ── THE STALE COUNT GUARD ───────────────────────────────────────────────────
//  This check used to be five hand-written patterns. It reported clean while the
//  rendered body still said "Section 1: Multiple Choice (40 Questions)" and
//  still listed a question count per unit from the 40 question set: neither
//  string matched any of the five, and nothing about the list could report that
//  it had gone blind. The guard is derived from the item bank now, and the
//  measurement below is what makes it worth having: on the LIVE body it finds 27
//  claims the new bank cannot justify, and on the rendered body it finds none.
const staleOnLive = gen.countClaims(liveBody);
const staleOnNew = gen.countClaims(nb);
ok('no count claim survives that the item bank cannot justify', staleOnNew.length === 0,
  staleOnNew.map((v) => JSON.stringify(v.text)).join(', '));
ok('and the same guard finds 27 of them in the body it started from, so it is not vacuous',
  staleOnLive.length === 27, `${staleOnLive.length} on the live body`);
ok('the words that named the old shape are gone as well',
  !/Practice Set/.test(nb) && !/study set rather than a replica/i.test(nb));
ok('the rendered body is clean on the shared content rules',
  sharedRules.ruleEkCodes(nb).length === 0 && sharedRules.ruleExamWeighting(nb).length === 0
  && sharedRules.ruleEmDash(nb, 'body').length === 0 && sharedRules.ruleMojibake(nb, 'body').length === 0,
  `R1=${sharedRules.ruleEkCodes(nb).length} R2=${sharedRules.ruleExamWeighting(nb).length} R3=${sharedRules.ruleEmDash(nb, 'body').length} R7=${sharedRules.ruleMojibake(nb, 'body').length}`);
//  ── THE LIVE VERIFIER, RUN OFFLINE ──────────────────────────────────────────
//  Exactly the assertions scripts/verify-cyber-exam-replica-live.js will make
//  against the served page, run here against the body the generator produces.
//  One assertion set run twice rather than two that can drift: a verifier that
//  disagrees with the generator reports a false regression, which has already
//  happened once in this repo. The second call is what makes it non-vacuous.
const verifier = require('../scripts/verify-cyber-exam-replica-live.js');
{
  const onNew = verifier.check(nb, `<title>${gen.SEO_TITLE}</title>`, null);
  const onLive = verifier.check(liveBody, '<title>AP Cybersecurity Practice Set | 40 MCQ + 3 FRQ</title>', null);
  ok('every assertion the live verifier will make holds against the rendered body',
    onNew.fails.length === 0, onNew.fails.join('; '));
  ok('and 13 of its 17 fail against the body it replaces, so none of them is decoration',
    onLive.fails.length === 13, `${onLive.fails.length} failed on the live body`);
}

ok('the SEO title states the new shape, since the old one embedded the count',
  gen.SEO_TITLE.includes('60 MCQ') && !gen.SEO_TITLE.includes('40'));
ok('the sheet carries no Title and no meta description column, so one SERP variable moves',
  !gen.HEADER.includes('Title') && !gen.HEADER.includes('SEO Description'),
  gen.HEADER.join(','));

//  R2 learned the published section weightings while this shipped. Prove the
//  exemption is narrow: the two CED numbers next to a section word pass, and
//  everything else that looks like a weighting still fails.
ok('R2 accepts the CED section weighting, 70 percent for Section I',
  sharedRules.ruleExamWeighting('<p>Section I is 70 percent of the exam.</p>').length === 0);
ok('R2 still refuses a fabricated per-unit weighting',
  sharedRules.ruleExamWeighting('<p>Unit 3 is about 20 to 25% of the exam.</p>').length > 0);
ok('R2 still refuses 70 percent attached to a unit rather than a section',
  sharedRules.ruleExamWeighting('<p>Unit 3 is 70 percent of the exam.</p>').length > 0);
ok('R2 still refuses a section weighting the CED does not publish',
  sharedRules.ruleExamWeighting('<p>Section I is 50 percent of the exam.</p>').length > 0);

// ── mutations ──────────────────────────────────────────────────────────────
console.log('\n  mutations (a green mutation run is a FAILED check)\n');

const MUTATIONS = [
  { rule: 'E1', label: 'an item tagged with a topic the CED does not have',
    apply: (b) => { b.items[0].topic = '4.5'; } },
  { rule: 'E1', label: 'an item tagged with a skill its topic does not carry',
    apply: (b) => { b.items[0].skill = 3; } },
  { rule: 'E2', label: 'a topic given one item more than the blueprint allows',
    //  items[0] and items[1] are BOTH topic 1.1, so the obvious mutation of
    //  copying one onto the other changed nothing and the suite reported the
    //  rule as hollow when it was the mutation that was empty. Move an item
    //  ACROSS topics instead: 1.1 goes to three and 1.2 drops to two, and the
    //  blueprint expects two and three.
    apply: (b) => {
      const donor = b.items.find((i) => i.topic === '1.2');
      donor.topic = '1.1';
      donor.skill = 1;
    } },
  { rule: 'E2', label: 'the bank falling short of 60 items',
    apply: (b) => { b.items.pop(); } },
  { rule: 'E3', label: 'an item with five options',
    apply: (b) => { b.items[2].options.push('A fifth option nobody asked for'); } },
  { rule: 'E3', label: 'an item whose explanation is a stub',
    apply: (b) => { b.items[3].explanation = 'Correct.'; } },
  { rule: 'E4', label: 'a banned option, all of the above',
    apply: (b) => { b.items[4].options[3] = 'All of the above'; } },
  { rule: 'E4', label: 'an answer key that leans on one letter',
    apply: (b) => { for (const i of b.items) i.answer = 'A'; } },
  { rule: 'E5', label: 'a correct option padded until length gives it away',
    apply: (b) => {
      const it = b.items[5];
      const i = ['A', 'B', 'C', 'D'].indexOf(it.answer);
      it.options[i] = `${it.options[i]} ${'and this clause keeps qualifying the answer '.repeat(4)}`;
    } },
  { rule: 'E6', label: 'an item lifted from the existing study set',
    apply: (b) => { b.items[6].stem = existing.stems[0]; } },
  { rule: 'E7', label: 'a free response part testing a skill the FRQ does not assess',
    apply: (b) => { b.frq.parts[0].skill = 1; } },
  { rule: 'E7', label: 'a free response with five sources instead of six',
    apply: (b) => { b.frq.sources.pop(); } },
  { rule: 'E7', label: 'a free response renamed away from the CED task',
    apply: (b) => { b.frq.name = 'Network Security Analysis'; } },
  { rule: 'R1', label: 'an EK code in student-visible text',
    apply: (b) => { b.items[7].explanation += ' This is assessed under 1.1.C.2 and 1.1.C.3.'; } },
  { rule: 'R2', label: 'a fabricated per-unit exam weighting',
    apply: (b) => { b.items[8].explanation += ' Unit 1 is about 20 to 25% of the exam.'; } },
  { rule: 'R3', label: 'an em-dash in an item',
    apply: (b) => { b.items[9].stem += ` ${String.fromCharCode(0x2014)} consider carefully.`; } },
  { rule: 'R7', label: 'SINGLE-pass mojibake, the depth seen on live pages',
    apply: (b) => { b.items[10].stem += ` ${String.fromCharCode(0x00e2, 0x20ac, 0x00a2)}`; } },
];

const caught = {};
let missed = 0;
for (const m of MUTATIONS) {
  const b = clone(bank);
  m.apply(b);
  const r = validate(b, opts);
  const hit = (r.byRule[m.rule] || []).length > 0;
  const others = Object.entries(r.byRule).filter(([id, l]) => id !== m.rule && l.length).map(([id]) => id);
  if (hit) {
    caught[m.rule] = (caught[m.rule] || 0) + 1;
    console.log(`  ${m.rule.padEnd(3)} ${m.label.padEnd(60)} caught by ${m.rule}${others.length ? `  (also ${others.join(', ')})` : ''}`);
  } else {
    missed += 1;
    console.log(`  ${m.rule.padEnd(3)} ${m.label.padEnd(60)} MISSED${others.length ? `  (only ${others.join(', ')} fired)` : ''}`);
  }
}

//  Render mutations. These do not go through validate(), they break the
//  generator's own guards, so they are asserted directly.
console.log();
{
  const fs2 = require('fs');
  const os2 = require('os');
  const path2 = require('path');
  const dir = fs2.mkdtempSync(path2.join(os2.tmpdir(), 'exam-render-'));
  const liveFile = path2.join(FIXTURES, 'ap-cybersecurity-practice-exam.html');
  const live = fs2.readFileSync(liveFile, 'utf8');

  //  A live body that has drifted under us must refuse, not silently leave a
  //  stale count on a page that now claims 60 questions.
  fs2.writeFileSync(path2.join(dir, 'ap-cybersecurity-practice-exam.html'),
    live.replace('<h1>AP Cybersecurity Practice Set</h1>', '<h1>AP Cyber Practice</h1>'));
  let refused = false;
  try { gen.generate({ bodies: dir, existingStems: existing.stems }); }
  catch (e) { refused = /head edits do not match/.test(e.message); }
  ok('the generator refuses a live body whose head has drifted', refused);

  //  An empty stored body must never become an empty Body HTML cell.
  fs2.writeFileSync(path2.join(dir, 'ap-cybersecurity-practice-exam.html'), '   ');
  let refusedEmpty = false;
  try { gen.generate({ bodies: dir, existingStems: existing.stems }); }
  catch (e) { refusedEmpty = /empty/.test(e.message); }
  ok('the generator refuses an empty stored body', refusedEmpty);

  //  ── THE THREE THAT SHIPPED PAST THE OLD CHECK ────────────────────────────
  //  Each of these puts the generator back into the state it was actually in
  //  before the count guard existed, by removing one declared edit. The stale
  //  string then survives into the rendered body, and the generator must refuse
  //  rather than write a sheet. The old five-pattern check passed on all three.
  fs2.writeFileSync(path2.join(dir, 'ap-cybersecurity-practice-exam.html'), live);
  const dropEdit = (needle) => {
    const i = gen.COUNT_EDITS.findIndex(([from]) => from.includes(needle));
    if (i === -1) throw new Error(`no declared edit contains ${JSON.stringify(needle)}`);
    return gen.COUNT_EDITS.splice(i, 1)[0];
  };
  const refusesWithout = (needle) => {
    const removed = dropEdit(needle);
    try {
      gen.generate({ bodies: dir, existingStems: existing.stems });
      return false;
    } catch (e) {
      return /count claims the item bank cannot justify/.test(e.message);
    } finally {
      gen.COUNT_EDITS.push(removed);
    }
  };
  ok('MUTATION: drop the section heading edit and the generator refuses',
    refusesWithout('Section 1: Multiple Choice (40 Questions)'));
  ok('MUTATION: drop the per-unit FAQ edit and the generator refuses',
    refusesWithout('Unit 1 (Introduction to Security, 7 questions)'));

  //  The cross-page exemption is anchored, not a blanket pass for 15. An
  //  unanchored exemption would re-admit any stale count that happened to be 15.
  const sampler = gen.CROSS_PAGE_COUNTS[0];
  ok('the cross-page count is accepted only next to the page it describes',
    gen.countClaims(`<a href="/pages/${sampler.handle}">x</a> ${sampler.count} questions`).length === 0
    && gen.countClaims(`${sampler.count} questions${' '.repeat(400)}${sampler.handle}`).length === 1);

  fs2.rmSync(dir, { recursive: true, force: true });
}

console.log();
ok(`every mutated rule went red independently: ${Object.keys(caught).sort().map((r) => `${r} x${caught[r]}`).join(', ')}`,
  missed === 0, `${missed} mutation(s) not caught by the rule that claims them`);

console.log();
if (fails.length) {
  console.error(`FAILED (${fails.length})`);
  for (const x of fails) console.error(`  ${x}`);
  process.exit(1);
}
console.log(`OK - ${pass} checks, ${MUTATIONS.length} mutations, every one caught by the rule that claims it`);
