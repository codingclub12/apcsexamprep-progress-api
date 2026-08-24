'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the two edits that make the 70 CSP exercise pages reachable.
//
//  The pages went live on 2026-08-22 with zero inbound links anywhere on the
//  site. Two scripts fix that:
//
//    scripts/csp-lesson-exercise-links.js      the student route: a managed
//                                              block on all 35 lesson pages
//    scripts/csp-command-center-exercises.js   the teacher route: 70 exercise
//                                              links plus the 6 unit tests
//
//  WHAT IS BEING PROTECTED
//
//  1. A CARD THAT PROMISES A GRADE THE PAGE DOES NOT GIVE. Only topic 1.1's two
//     exercises are auto-graded; 68 are handout mirrors that record nothing. The
//     student handout already says "auto-graded" about all 70, so a link that
//     repeats that claim makes the site complicit in it. Both surfaces read
//     graded-ness from the renderer, and this asserts a graded label can only
//     land on a page that actually carries check questions.
//
//  2. AN EDIT THAT IS NOT ACTUALLY ADDITIVE. Both scripts claim to leave every
//     existing byte in place: the lesson block by appending, the Command Center
//     by splicing inside an array. A claim like that is worth nothing unasserted,
//     so both are checked byte for byte, and the Command Center's DATA blob is
//     re-parsed as JSON because a broken blob renders an empty page.
//
//  3. A RERUN THAT DOUBLES THE BLOCK. Both are idempotent by different means:
//     a marker comment, and a per-link presence check. Both are proved here by
//     running them twice.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: node smoke/csp-exercise-discoverability.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');

const { allPages, BY_TOPIC } = require('../lib/csp-exercise-pages');
const { OPEN } = require('../scripts/extract-live-body');
const lessonLinks = require('../scripts/csp-lesson-exercise-links');
const commandCenter = require('../scripts/csp-command-center-exercises');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const pages = allPages();
const byTopic = new Map();
for (const p of pages) {
  if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
  byTopic.get(p.topic).push(p);
}
for (const l of byTopic.values()) l.sort((a, b) => a.kind.localeCompare(b.kind));

console.log('\nCSP EXERCISE DISCOVERABILITY\n');

// ── 1. The student block ─────────────────────────────────────────────────────
section('1. The lesson-page block says what each exercise actually is');
const gradedTopics = new Set(pages.filter((p) => p.graded).map((p) => p.topic));
let promisesGrade = [], omitsGrade = [];
for (const [topic, ex] of byTopic) {
  const block = lessonLinks.blockFor(topic, ex);
  for (const p of ex) {
    const card = block.split('<a class="ex"').find((s) => s.includes(p.handle));
    if (!card) continue;
    if (/auto-graded/.test(card) && !p.graded) promisesGrade.push(p.handle);
    if (!/auto-graded/.test(card) && p.graded) omitsGrade.push(p.handle);
  }
}
ok('  no card promises an auto-graded check on a page that has none',
  promisesGrade.length === 0, promisesGrade.slice(0, 5));
ok('  and the graded pages do say so', omitsGrade.length === 0, omitsGrade.slice(0, 5));
ok('  every mirror-only card says the work is not graded',
  [...byTopic].filter(([t]) => !gradedTopics.has(t))
    .every(([t, ex]) => (lessonLinks.blockFor(t, ex).match(/not graded/g) || []).length === ex.length));
ok('  every block links both of its topic exercises',
  [...byTopic].every(([t, ex]) => ex.every((p) => lessonLinks.blockFor(t, ex).includes('/pages/' + p.handle))));
ok('  every block is pure ASCII',
  // eslint-disable-next-line no-control-regex
  [...byTopic].every(([t, ex]) => !/[^\x09\x0A\x0D\x20-\x7E]/.test(lessonLinks.blockFor(t, ex))));
ok('  every block carries the managed marker, which is what makes a rerun safe',
  [...byTopic].every(([t, ex]) => lessonLinks.blockFor(t, ex).includes(lessonLinks.MARKER)));

// ── 2. The student block is appended, never woven in ─────────────────────────
section('2. The lesson edit is append-only, proved on a synthetic page');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-disc-'));
const dir = path.join(tmp, 'lessons');
fs.mkdirSync(dir);
// The extractor recovers page.content from the theme's rte wrapper, so a fake
// rendered page is that wrapper around a known body.
const bodyFor = (topic) => `<div class="lesson-page" data-lesson="t${topic}">Topic ${topic} lesson body.</div>`;
// The wrapper string has to be the exact one extract-live-body looks for, or
// this suite would only ever prove that a wrong fixture is rejected.
const rendered = (topic) =>
  `<html><body>${OPEN}${bodyFor(topic)}\n  </div></body></html>`;
for (const [topic] of byTopic) {
  const t = BY_TOPIC.get(topic);
  const handle = `ap-csp-course-bi${topic.split('.')[0]}-${t.slug}`;
  fs.writeFileSync(path.join(dir, handle + '.html'), rendered(topic));
}
const verified = new Set(pages.map((p) => p.handle));
const built = lessonLinks.build(dir, verified);
ok('  all 35 lesson pages build with no problems',
  built.pages.length === 35 && built.problems.length === 0, built.problems.slice(0, 3));
// Guarded with a length check: `every` on an empty list passes, and a suite that
// passes because it built nothing is worse than one that fails.
ok('  every original body survives as an exact prefix of the new one',
  built.pages.length === 35 && built.pages.every((p) => p.body.startsWith(bodyFor(p.topic))), 'a body was modified');
ok('  the only thing added is the managed block',
  built.pages.length === 35
    && built.pages.every((p) => p.body.slice(bodyFor(p.topic).length).trimStart().startsWith(lessonLinks.MARKER)));

// A rerun must refuse rather than append a second block.
for (const p of built.pages) {
  fs.writeFileSync(path.join(dir, p.handle + '.html'), `<html><body>${OPEN}${p.body}\n  </div></body></html>`);
}
const again = lessonLinks.build(dir, verified);
ok('  a rerun over already-edited pages refuses every one of them',
  again.pages.length === 0 && again.problems.length === 35, {
    built: again.pages.length, problems: again.problems.length,
  });
ok('  and says why, naming the block it found',
  again.problems.every((s) => /already on this page/.test(s)), again.problems.slice(0, 2));

// ── 3. The Command Center edit ───────────────────────────────────────────────
section('3. The Command Center edit is an insertion, and the labels are honest');
// A miniature of the real blob: same shape, same minified serialisation.
function fakeCC() {
  const bigIdeas = [];
  for (let n = 1; n <= 5; n++) {
    const topics = [...byTopic.keys()].filter((t) => t.startsWith(n + '.')).map((t) => ({
      id: t,
      title: 'Topic ' + t,
      days: 1,
      pageLinks: [{ href: '/pages/ap-csp-course-bi' + n + '-' + BY_TOPIC.get(t).slug, label: 'Lesson page' }],
      studentFiles: [],
    }));
    bigIdeas.push({ n, name: 'Big Idea ' + n, topics, exam: { id: n + '.99', title: 'Big Idea ' + n + ' Exam', days: 1, pageLinks: [], studentFiles: [] } });
  }
  return '<div id="csp-command-center">x</div>\n<script>\nvar DATA = '
    + JSON.stringify({ bigIdeas, courseResources: [], projects: [] }) + ';\n</script>';
}
const ccIn = fakeCC();
const ccVerified = new Set([...verified, ...Object.values(commandCenter.UNIT_TESTS).flat().map(([h]) => h)]);
const cc = commandCenter.build(ccIn, ccVerified);
ok('  the build reports no problems', cc.problems.length === 0, cc.problems.slice(0, 3));

let ccData = null;
try { ccData = JSON.parse(cc.body.match(/var DATA = (\{[\s\S]*?\});/)[1]); } catch (e) { /* asserted below */ }
ok('  DATA still parses as JSON, so the page still renders', !!ccData);
if (ccData) {
  const topicLinks = ccData.bigIdeas.flatMap((b) => b.topics).flatMap((t) => t.pageLinks);
  ok('  70 exercise links land, two per topic',
    topicLinks.filter((l) => /-exercise-[12]$/.test(l.href)).length === 70);
  ok('  every exam row gains its unit test link(s)',
    ccData.bigIdeas.every((b) => b.exam.pageLinks.length === commandCenter.UNIT_TESTS[b.n].length));
  ok('  Big Idea 3 gets both halves of its split test',
    ccData.bigIdeas[2].exam.pageLinks.map((l) => l.label).sort().join('|') === 'Unit test part A|Unit test part B');
  const gradedHrefs = new Set(pages.filter((p) => p.graded).map((p) => '/pages/' + p.handle));
  const mislabelled = topicLinks.filter((l) => /auto-graded/.test(l.label) && !gradedHrefs.has(l.href));
  ok('  no link is labelled auto-graded unless its page carries check questions',
    mislabelled.length === 0, mislabelled.slice(0, 3));
  // Derived: checks are being authored topic by topic, so the split between
  // graded and not moves. What must hold is that every exercise link is labelled
  // one way or the other, and the two counts add up to all 70.
  const notYet = topicLinks.filter((l) => /not graded yet/.test(l.label)).length;
  const gradedLabelled = topicLinks.filter((l) => /auto-graded/.test(l.label)).length;
  ok('  every exercise link is labelled graded or not, and the two add to 70',
    notYet + gradedLabelled === 70 && gradedLabelled === pages.filter((p) => p.graded).length,
    { notYet, gradedLabelled });
  ok('  every lesson link that was there before is still there',
    ccData.bigIdeas.flatMap((b) => b.topics).every((t) => t.pageLinks.some((l) => l.label === 'Lesson page')));
}
// The insert-only claim, byte for byte.
let i = 0, additive = true;
for (const ch of ccIn) {
  i = cc.body.indexOf(ch, i);
  if (i === -1) { additive = false; break; }
  i++;
}
ok('  every byte of the original blob is still present, in order', additive);
ok('  the body grew', Buffer.byteLength(cc.body) > Buffer.byteLength(ccIn));

const ccAgain = commandCenter.build(cc.body, ccVerified);
ok('  a rerun adds nothing, so the edit is idempotent',
  ccAgain.added.length === 0, ccAgain.added.map((a) => a.what).slice(0, 3));

// ── 4. The tripwires actually fire ───────────────────────────────────────────
section('4. The refusals are proved, not asserted');
let refusedWrongLesson = false;
try {
  // A Command Center whose topic 1.1 links some other lesson: the curriculum and
  // the config disagree, and writing a link would land it on the wrong topic.
  commandCenter.build(ccIn.replace('/pages/ap-csp-course-bi1-collaboration', '/pages/ap-csp-course-bi1-something-else'), ccVerified);
} catch (e) { refusedWrongLesson = /does not link its own lesson page/.test(e.message); }
ok('  a topic that does not link its own lesson page aborts the edit', refusedWrongLesson);

let refusedUnverified = false;
try { commandCenter.build(ccIn, new Set(['nothing-real'])); }
catch (e) { refusedUnverified = /not in the verified live page set/.test(e.message); }
ok('  a target handle outside the verified live set aborts the edit', refusedUnverified);

let refusedNotCC = false;
try { commandCenter.build('<div>some other page entirely</div>', ccVerified); }
catch (e) { refusedNotCC = /not the stored Command Center body/.test(e.message); }
ok('  a body that is not the Command Center aborts the edit', refusedNotCC);

const badDir = path.join(tmp, 'bad');
fs.mkdirSync(badDir);
fs.writeFileSync(path.join(badDir, 'ap-csp-course-bi1-collaboration.html'),
  '<html><body><div class="rte">unrelated content</div></body></html>');
const badBuild = lessonLinks.build(badDir, verified);
ok('  a lesson page that is not that lesson is refused, and the rest reported missing',
  badBuild.pages.length === 0 && badBuild.problems.length === 35);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
