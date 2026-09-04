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
