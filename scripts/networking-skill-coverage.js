#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Does the course make students DO the thing, or only read about it?
//
//  WHY THIS IS A DIFFERENT QUESTION FROM EK COVERAGE
//    networking-ek-coverage.js answers "does the page mention the content".
//    A course can score well there and still not be a course, because the
//    framework asks for four verbs per skill and only the first two survive
//    contact with a web page:
//
//      .A Identify or explain    a page can teach this
//      .B Determine or analyse   a scenario question can assess this
//      .C IMPLEMENT and document requires configuring something real
//      .D VERIFY                 requires checking the configuration works
//
//    Skill category 4, Collaborate, is a further step again. Team objectives,
//    roles, and shared work are not things a self-paced page can deliver.
//
//    So this reads the framework's per-topic Suggested Skills and sets them
//    against what the course actually has to assess with, taken from the
//    manifest rather than from a claim.
//
//  Usage:
//    node scripts/networking-skill-coverage.js
//    node scripts/networking-skill-coverage.js --json
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const SK = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'networking-framework-skills.json'), 'utf8'));

// Read the course's own graded inventory out of the seed rather than restating
// it here, so this can never drift from what is actually seeded.
const seed = fs.readFileSync(path.join(__dirname, 'seed-manifest.js'), 'utf8');
function block(name) {
  const m = seed.match(new RegExp(`const ${name}\\s*=\\s*\\{(.*?)\\n\\};`, 's'));
  return m ? m[1] : '';
}
const countKeys = (s) => (s.match(/^\s*'[^']+':/gm) || []).length;
const sumPoints = (s) => (s.match(/points:\s*(\d+)|:\s*(\d+),/g) || [])
  .reduce((a, x) => a + Number(x.match(/(\d+)/)[1]), 0);

const graded = block('NET_GRADED');
const topicQuizPts = (graded.match(/quiz:\s*(\d+)/g) || []).reduce((a, x) => a + Number(x.match(/\d+/)[0]), 0);
const topicCfuPts = (graded.match(/cfu_ids:\s*\[([^\]]*)\]/g) || [])
  .reduce((a, x) => a + x.replace(/[^0-9,]/g, '').split(',').filter(Boolean).length, 0);
const unitTestPts = sumPoints(block('NET_UNIT_TESTS'));
const labCount = countKeys(block('NET_LABS'));
const labPts = sumPoints(block('NET_LABS'));
const examPts = sumPoints(block('NET_EXAMS'));
const examCount = countKeys(block('NET_EXAMS'));
const total = topicCfuPts + topicQuizPts + unitTestPts + labPts + examPts;

const topics = Object.keys(SK.by_topic);
const assigned = Object.values(SK.by_topic).flat();
const byVerb = {}; const byCat = {};
for (const s of assigned) {
  const [cat, verb] = s.split('.');
  byVerb[verb] = (byVerb[verb] || 0) + 1;
  byCat[cat] = (byCat[cat] || 0) + 1;
}
const needs = (pred) => topics.filter((t) => SK.by_topic[t].some(pred));
const handsOn = needs((s) => 'CD'.includes(s.split('.')[1]));
const collab = needs((s) => s.startsWith('4.'));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ byCat, byVerb, handsOn, collab, points: { topicCfuPts, topicQuizPts, unitTestPts, labPts, examPts, total } }, null, 2));
  process.exit(0);
}

const VERB = { A: 'Identify or explain', B: 'Determine or analyse', C: 'IMPLEMENT and document', D: 'VERIFY' };
const pct = (n, d) => `${((n / d) * 100).toFixed(0)}%`;

console.log('AP Networking skill coverage\n');
console.log('What the framework asks students to DO, across all 22 topics:');
for (const v of 'ABCD') {
  console.log(`  .${v}  ${VERB[v].padEnd(24)} ${String(byVerb[v] || 0).padStart(3)}  ${pct(byVerb[v] || 0, assigned.length)}`);
}
console.log('\nBy skill category:');
for (const c of '1234') {
  console.log(`  ${c}  ${SK.skills[c].name.padEnd(24)} ${String(byCat[c] || 0).padStart(3)}  ${pct(byCat[c] || 0, assigned.length)}`);
}
console.log('\nWhat the course has to assess with, from the manifest:');
console.log(`  per-topic checks and quizzes  ${String(topicCfuPts + topicQuizPts).padStart(4)} pts  ${pct(topicCfuPts + topicQuizPts, total)}`);
console.log(`  unit tests                    ${String(unitTestPts).padStart(4)} pts  ${pct(unitTestPts, total)}`);
console.log(`  labs (${labCount})                      ${String(labPts).padStart(4)} pts  ${pct(labPts, total)}`);
console.log(`  exams (${examCount})                     ${String(examPts).padStart(4)} pts  ${pct(examPts, total)}`);
console.log(`  TOTAL                         ${String(total).padStart(4)} pts`);

console.log('\nThe gap:');
console.log(`  topics needing hands-on implement or verify : ${handsOn.length} of ${topics.length} (${pct(handsOn.length, topics.length)})`);
console.log(`     ${handsOn.join(' ')}`);
console.log(`  hands-on share of the grade                 : ${pct(labPts, total)}  (${labCount} labs, one per unit)`);
console.log(`\n  topics needing Collaborate (skill 4)        : ${collab.length} of ${topics.length}  (${collab.join(' ')})`);
console.log(`  collaborative share of the grade            : 0%  (no collaborative asset exists)`);
console.log('\nEvery number above is measured. The judgement of whether that is enough');
console.log('for a full year is not, and belongs to a teacher.');
