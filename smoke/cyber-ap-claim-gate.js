#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  apClaimsNear and unwiredSplices, proven in the failing direction.
//
//  Both checks exist because of the same review. Topic 1.2 went out with a
//  banner on its hashing section reading "not assessed in this topic", passed
//  every gate that ran, and a human reading the built sheet found nine places
//  where the rest of the page told a student the opposite: "each illustrates a
//  specific, testable AP exam concept" over a rainbow-table case study, an FAQ
//  answer listing salting and spraying as exam patterns, three chips reading
//  "Exam Trap". Labelling a section as enrichment is worth nothing while
//  another part of the page calls the same material required.
//
//  The tenth defect was a different kind of invisible: cfu-5's feedback splice
//  was written, reviewed, and never added to SPLICES, so the question shipped
//  rebuilt with the feedback for the question it used to be. No check that
//  reads output can see a splice that never ran, so unwiredSplices reads the
//  module's source instead.
//
//  Offline: no network, no secrets, no browser.
//
//  Run: npm run smoke:apclaimgate
// -----------------------------------------------------------------------------

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const gate = require('../lib/cyber-page-gate');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

const TERMS = ['rainbow', 'salt', 'bcrypt', 'argon', 'nist', 'spraying',
  'credential stuffing', 'brute force', 'lockout', 'rate limiting'];
const far = 'x'.repeat(900);

console.log('AP-claim proximity gate\n');

check('clean prose passes', () => {
  const t = 'An adversary submits a common password to the login page. '
    + 'Many failed attempts in a short time is the first sign.';
  assert.deepStrictEqual(gate.apClaimsNear(t, TERMS), []);
});

check('an off-CED term far from any claim passes', () => {
  const t = `A rainbow table maps hashes to plaintext.${far}This is on the AP exam.`;
  assert.deepStrictEqual(gate.apClaimsNear(t, TERMS), [],
    'a term 900 characters from the claim is not being re-promoted by it');
});

check('the real 1.2.6 sentence FAILS', () => {
  const t = 'Each illustrates a specific, testable AP exam concept. '
    + '2012 LinkedIn Breach: unsalted SHA-1 hashes, rainbow table attack at scale.';
  assert.ok(gate.apClaimsNear(t, TERMS).length, 'this is the sentence that shipped');
});

check('the real FAQ answer FAILS', () => {
  const t = 'How do password attacks appear on the AP Cybersecurity exam? Salting '
    + 'defeats rainbow tables, rate limiting defeats online brute force.';
  assert.ok(gate.apClaimsNear(t, TERMS).length);
});

check('an "Exam Trap" chip beside a defence FAILS', () => {
  assert.ok(gate.apClaimsNear('Salt (random, unique per account) Exam Trap', TERMS).length);
});

check('a claim BEFORE the term is caught, not just after', () => {
  //  Distance is what matters, not order. A heading claiming exam relevance
  //  sits above the content it re-promotes.
  const t = 'What is testable in this topic. Password spraying evades lockout.';
  assert.ok(gate.apClaimsNear(t, TERMS).length);
});

check('a course name is not a claim', () => {
  for (const n of ['AP Cybersecurity', 'AP Computer Science', 'AP CS Exam Prep']) {
    assert.deepStrictEqual(gate.apClaimsNear(`${n} unit on rainbow tables and salting.`, TERMS), [],
      `${n} is branding, not a statement about what is examined`);
  }
});

check('a URL is not a claim', () => {
  //  Every path on apcsexamprep.com contains "ap" and "exam". Before this the
  //  structured-data block reported fourteen times, all of them hyperlinks.
  const t = 'See https://www.apcsexamprep.com/pages/ap-cyber-unit-1-lesson-2 for salting.';
  assert.deepStrictEqual(gate.apClaimsNear(t, TERMS), []);
});

check('"tested" as an ordinary verb is not a claim', () => {
  const t = 'An attacker tested the password "Welcome1" against all 12,000 accounts '
    + 'without triggering lockout.';
  assert.deepStrictEqual(gate.apClaimsNear(t, TERMS), [],
    'attackers test things; that is not a statement about an exam');
});

check('an exemption applies, and only where it is written', () => {
  const dis = 'Hashing, salting and rainbow tables are real and they are not assessed in this topic.';
  assert.deepStrictEqual(gate.apClaimsNear(dis, TERMS, { exempt: ['not assessed in this topic'] }), [],
    'a sentence whose job is to say a term is NOT examined must pass');
  assert.ok(gate.apClaimsNear(dis, TERMS).length,
    'and it must only pass because the caller listed it, never by accident');
});

check('an exemption 600 characters away does NOT launder a claim', () => {
  const t = `Hashing is not assessed in this topic.${far}Rainbow tables are on the AP exam.`;
  assert.ok(gate.apClaimsNear(t, TERMS, { exempt: ['not assessed in this topic'] }).length,
    'a disclaimer in another section cannot cover a claim here');
});

check('the window is configurable and actually moves', () => {
  const t = `Salting.${'x'.repeat(300)}This is on the AP exam.`;
  assert.deepStrictEqual(gate.apClaimsNear(t, TERMS, { pad: 100 }), []);
  assert.ok(gate.apClaimsNear(t, TERMS, { pad: 500 }).length);
});

console.log('\nunwired splice constants\n');

const wired = `
const A_HTML = 'one';
const B_HTML = 'two';
const SPLICES = [
  { name: 'a', from: A_FROM, html: A_HTML },
  { name: 'b', from: B_FROM, html: B_HTML },
];
`;

check('a module with every splice wired passes', () => {
  assert.deepStrictEqual(gate.unwiredSplices(wired), []);
});

check('a splice defined but never added FAILS', () => {
  const orphan = wired.replace("  { name: 'b', from: B_FROM, html: B_HTML },\n", '');
  const out = gate.unwiredSplices(orphan);
  assert.ok(out.some((m) => m.includes('B_HTML')), out.join('; '));
});

check('the real cfu-5 case FAILS', () => {
  //  Exactly what shipped: the constant defined, the entry absent.
  const real = `
const C5_Q_HTML = 'the rebuilt question';
const C5_FB_HTML = 'the rebuilt feedback';
const SPLICES = [
  { name: 'cfu-5 question', from: C5_Q_FROM, html: C5_Q_HTML },
];
`;
  const out = gate.unwiredSplices(real);
  assert.strictEqual(out.length, 1);
  assert.ok(out[0].includes('C5_FB_HTML'), out[0]);
});

check('the live Topic 1.2 module has no unwired splices', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'cyber-u1-topic12-ced.js'), 'utf8');
  assert.deepStrictEqual(gate.unwiredSplices(src), []);
});

check('every other cyber splice module is wired too', () => {
  const dir = path.join(__dirname, '..', 'lib');
  const mods = fs.readdirSync(dir).filter((f) => /^cyber-u1-.*-ced\.js$/.test(f));
  assert.ok(mods.length >= 5, `expected the Unit 1 modules, found ${mods.length}`);
  for (const m of mods) {
    const out = gate.unwiredSplices(fs.readFileSync(path.join(dir, m), 'utf8'));
    assert.deepStrictEqual(out, [], `${m}: ${out.join('; ')}`);
  }
});

console.log('');
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
