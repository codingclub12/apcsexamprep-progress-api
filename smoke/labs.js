'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the interactive terminal labs.
//
//  WHY THIS EXISTS, AND WHY IT PLAYS THE LAB RATHER THAN READING IT
//  A lab is content and code at once. Reading the spec proves the shape is
//  legal; it does not prove a student can finish it. A check that matches an
//  event the shell never emits (a host name that is not the host the command
//  runs on, a cwd off by one directory) is a lab where the eighth checkbox can
//  never tick, and nobody finds out until a class period is half gone.
//
//  So this loads the REAL player (public/lab-player.js) under a small DOM stub
//  and plays each spec's own `solution` through it. Every check must tick. If
//  the shell, the matcher and the authored steps ever disagree, this fails.
//
//  It also pins the manifest side: a graded lab must have exactly one row, its
//  points must equal its check count, and a practice lab must have no row at
//  all (a manifest row is a denominator, and a denominator for ungraded work
//  marks every student down).
//
//  Zero PII: author content and synthetic rows only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:labs
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-labs.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const labs = require('../lib/lab-spec');
const { buildRows } = require('../scripts/seed-manifest');
const practice = require('../lib/practice-index');

let pass = 0, fail = 0;
function ok(cond, label, detail) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? '\n        ' + detail : ''}`); }
}

// ── a DOM small enough to read, large enough to run the player ───────────────
// Not jsdom: the player touches a dozen DOM calls and one fetch, and a stub
// keeps this suite dependency free like the rest of smoke/.
function makeNode(tag) {
  const node = {
    tagName: tag, className: '', textContent: '', innerHTML: '', value: '', id: '',
    children: [], style: {}, disabled: false, type: '',
    classList: {
      add() {}, remove() {}, contains() { return false; },
    },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, removeAttribute(){}, focus() {}, scrollTop: 0, scrollHeight: 0,
    addEventListener() {},
    querySelector() { return makeNode('span'); },
  };
  return node;
}
function installDom() {
  const doc = {
    head: makeNode('head'),
    body: makeNode('body'),
    createElement: (t) => makeNode(t),
    getElementById: () => null,
    querySelector: () => null,
  };
  global.document = doc;
  global.window = global;
  global.localStorage = { getItem: () => '', setItem() {} };
  global.fetch = () => Promise.reject(new Error('smoke: no network'));
  global.APCS_LAB = { base: '' };
}
installDom();
require('../public/lab-player.js');
const APCSLab = global.APCSLab;
ok(!!(APCSLab && APCSLab.mount), 'lab-player.js loads and exposes APCSLab.mount');

// ── specs load clean ─────────────────────────────────────────────────────────
console.log('\nSPECS');
ok(labs.errors().length === 0, 'every spec in config/labs passes validation',
  labs.errors().join('\n        '));
ok(labs.all().length > 0, 'at least one lab is authored');

for (const spec of labs.all()) {
  const problems = labs.validate(spec, spec.item_id);
  ok(problems.length === 0, `${spec.item_id}: validates`, problems.join('\n        '));
  ok(spec.points === spec.checks.length,
    `${spec.item_id}: ${spec.points} points for ${spec.checks.length} checks (one check, one point)`);
  ok(Array.isArray(spec.solution) && spec.solution.length > 0,
    `${spec.item_id}: ships a reference solution`);
}

// ── each lab is actually finishable ──────────────────────────────────────────
console.log('\nPLAYTHROUGH');
for (const spec of labs.all()) {
  const container = makeNode('div');
  container.classList = { add() {}, remove() {}, contains() { return false; } };
  let handle;
  try {
    handle = APCSLab.mount(container, JSON.parse(JSON.stringify(labs.forBrowser(spec))), { preview: true });
  } catch (e) {
    ok(false, `${spec.item_id}: mounts`, e.stack);
    continue;
  }
  ok(true, `${spec.item_id}: mounts`);

  for (const step of spec.solution) {
    try {
      if (typeof step === 'string') handle.run(step);
      else {
        const q = spec.questions.find((x) => x.id === step.answer);
        handle.answer(step.answer, q.answer);
      }
    } catch (e) {
      ok(false, `${spec.item_id}: step ${JSON.stringify(step)} runs`, e.stack);
    }
  }

  const missed = spec.checks.filter((c) => !handle.state.done[c.n]);
  ok(missed.length === 0,
    `${spec.item_id}: the reference solution ticks all ${spec.checks.length} checks`,
    missed.length ? 'never ticked: ' + missed.map((c) => `${c.n} (${c.label})`).join('; ') : '');

  // A lab that ticks its checks before the student does anything is not a lab.
  const fresh = APCSLab.mount(makeNode('div'), JSON.parse(JSON.stringify(labs.forBrowser(spec))), { preview: true });
  ok(fresh.passed() === 0, `${spec.item_id}: starts at zero checks`);

  // Nonsense must not crash the shell, and must not score.
  const junk = APCSLab.mount(makeNode('div'), JSON.parse(JSON.stringify(labs.forBrowser(spec))), { preview: true });
  let crashed = null;
  for (const line of ['', '   ', 'rm -rf /', 'cd ../../../../etc', 'cat /etc/passwd', 'sudo su', 'ls -zzz', 'put', 'get x']) {
    try { junk.run(line); } catch (e) { crashed = `${line}: ${e.message}`; }
  }
  ok(!crashed, `${spec.item_id}: junk input does not crash the shell`, crashed || '');
  ok(junk.passed() === 0 || spec.checks.every((c) => !junk.state.done[c.n] || c.match.cmd === 'ls'),
    `${spec.item_id}: junk input does not tick checks it should not`);
}

// ── escaping the pretend filesystem ──────────────────────────────────────────
console.log('\nSANDBOX');
{
  const spec = JSON.parse(JSON.stringify(labs.forBrowser(labs.all()[0])));
  const h = APCSLab.mount(makeNode('div'), spec, { preview: true });
  let threw = null;
  for (const line of ['cd ..', 'cd ..', 'cd ..', 'cd ..', 'cd ..', 'ls /', 'cat ../../../../../etc/shadow', 'cd /root']) {
    try { h.run(line); } catch (e) { threw = e.message; }
  }
  ok(!threw, 'walking up past the fs root is contained, not an error', threw || '');
}

// ── manifest agreement ───────────────────────────────────────────────────────
console.log('\nMANIFEST');
const rows = buildRows();
for (const spec of labs.all()) {
  const mine = rows.filter((r) => r.course === spec.course && r.item_id === spec.item_id);
  if (spec.graded) {
    ok(mine.length === 1, `${spec.item_id}: graded lab has exactly one manifest row (found ${mine.length})`);
    if (mine.length === 1) {
      const r = mine[0];
      ok(r.points === spec.points, `${spec.item_id}: manifest points ${r.points} equals spec points ${spec.points}`);
      ok(r.item_type === 'lab', `${spec.item_id}: manifest item_type is 'lab'`);
      ok(r.lesson_id === spec.lesson_id, `${spec.item_id}: manifest lesson_id '${r.lesson_id}' equals spec lesson_id '${spec.lesson_id}'`);
      ok(r.unit === spec.unit, `${spec.item_id}: manifest unit '${r.unit}' equals spec unit '${spec.unit}'`);
    }
  } else {
    ok(mine.length === 0,
      `${spec.item_id}: practice lab has NO manifest row, so it adds no denominator (found ${mine.length})`);
  }
}
{
  const ids = rows.map((r) => `${r.course}|${r.item_id}`);
  ok(ids.length === new Set(ids).size, 'no duplicate manifest rows after the lab rows are added');
}

// ── the attempt route accepts item_type 'lab' ────────────────────────────────
console.log('\nROUTE');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'progress.js'), 'utf8');
  const m = /const ITEM_TYPES = new Set\(\[([^\]]*)\]\)/.exec(src);
  ok(!!m && /'lab'/.test(m[1]), "POST /api/progress/attempt accepts item_type 'lab'");
}

// ── zero PII: the player must never send a typed string ──────────────────────
console.log('\nZERO PII');
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'lab-player.js'), 'utf8');
  const body = src.slice(src.indexOf('body: JSON.stringify({'), src.indexOf('duration_seconds'));
  const forbidden = ['input.value', 'history', 'raw', 'tokens', 'cwd'];
  const leaked = forbidden.filter((f) => body.indexOf(f) !== -1);
  ok(leaked.length === 0, 'the submit body carries no typed string, history or path', leaked.join(', '));
  ok(/sel: null/.test(src), 'detail is [{q, sel: null, ok}] as the contract specifies');
}

// ── the Matrixify sheet ──────────────────────────────────────────────────────
//  The sheet is how a lab reaches a student, and a bad row does not fail loudly:
//  it publishes a page that renders prose and grades nothing. Build every page
//  and run the hazard rules over it here, so a broken embed is a red CI run
//  rather than a live page a class opens on Monday.
console.log('\nMATRIXIFY SHEET');
{
  const sheet = require(path.join(__dirname, '..', 'scripts', 'lab-pages-csv.js'));
  const specs = labs.all();
  const handles = [];
  for (const spec of specs) {
    let page = null;
    let err = null;
    // The index carries the lab's siblings, which the page's "More hands-on
    // practice" strip is generated from. build() refuses without it rather than
    // quietly producing a page that links nowhere.
    const index = practice.forCourse(spec.course);
    try { page = sheet.build(spec, index); } catch (e) { err = e.message; }
    ok(!!page, `${spec.item_id}: a page builds`, err);
    if (!page) continue;
    handles.push(page.handle);
    const bad = sheet.checkPage(page, spec, index);
    ok(bad.length === 0, `${spec.item_id}: the page passes every hazard rule`, bad.join('; '));
    ok(page.handle === spec.page_handle,
      `${spec.item_id}: the page uses the handle the spec declares`);
    ok(page.bodyHtml.indexOf(sheet.API + '/lab-player.js') !== -1,
      `${spec.item_id}: the player is loaded from the API origin, not the storefront`);
  }
  ok(handles.length === new Set(handles).size, 'no two labs claim the same page handle');
}

// ── the hub and command center links ─────────────────────────────────────────
//  scripts/cyber-lab-links.js edits two live pages that this repo does not own a
//  copy of, so CI runs it against fixtures carrying the exact anchors the live
//  bodies carry. The fixtures are the contract: if the live page drifts away
//  from them the script refuses at run time, which is the intended behaviour.
console.log('\nHUB AND COMMAND CENTER LINKS');
{
  const links = require(path.join(__dirname, '..', 'scripts', 'cyber-lab-links.js'));
  const specs = links.cyberLabs();
  const spec = specs.find((x) => x.item_id === '1.2-lab');
  ok(!!spec, 'cyberLabs finds the 1.2 lab');
  ok(specs.length >= 2, 'cyberLabs returns every cyber lab, not just the first one authored');
  ok(links.existingLabHandle('2.4') === 'ap-cyber-unit-2-lesson-4-lab',
    'the existing non-terminal lab handle is derived from the lesson id');

  //  BOTH card shapes, because the live guide uses two. The Unit 1 card indents
  //  fourteen spaces and puts a NEWLINE between </div> and <span>; the Unit 4
  //  card indents twelve and puts a SPACE. Both are the same row, and an anchor
  //  matched on exact bytes only ever found the first. Moving the 1.2 lab to 4.3
  //  reported "found 0" against a row that was plainly in the guide, which is
  //  what this fixture now stops happening again.
  const GUIDE = '<div id="apcyber-course-hub">\n'
    + '              <a class="exercise-row" href="/pages/ap-cyber-unit-1-lesson-2-lab"><div class="ex-dot"></div>\n'
    + '<span class="ex-label">Lab</span><span class="ex-tag">Start \u2192</span></a>\n'
    + '              <a class="exercise-row quiz-row" href="/pages/ap-cyber-unit-1-lesson-2-quiz"></a>\n'
    + '            <a class="exercise-row" href="/pages/ap-cyber-unit-4-lesson-3-lab"><div class="ex-dot"></div>'
    + ' <span class="ex-label">Lab</span><span class="ex-tag">Start \u2192</span></a>\n'
    + '            <a class="exercise-row quiz-row" href="/pages/ap-cyber-unit-4-lesson-3-quiz"></a>\n</div>';
  //  Both lessons, because the labs now sit in different units and the live
  //  Command Center carries an STU row for every lesson in the course. A fixture
  //  with only 1.2 in it passes for a lab at 1.2 and fails for the same lab the
  //  day it moves, which is a fixture testing the fixture.
  const CC = 'var STU = {\n'
    + '    "1.2":{page:"/pages/ap-cybersecurity-unit-1-password-attacks",quiz:"/pages/ap-cyber-unit-1-lesson-2-quiz",'
    + 'ex1:"/pages/ap-cyber-unit-1-lesson-2-exercise-1",ex2:"/pages/ap-cyber-unit-1-lesson-2-exercise-2"},\n'
    + '    "4.3":{page:"/pages/ap-cyber-unit-4-lesson-3",quiz:"/pages/ap-cyber-unit-4-lesson-3-quiz",'
    + 'ex1:"/pages/ap-cyber-unit-4-lesson-3-exercise-1",ex2:"/pages/ap-cyber-unit-4-lesson-3-exercise-2"},\n};\n'
    + "    var dests = [ ['page','Lesson page'], ['quiz','Quiz'], ['ex1','Scenario 1'], ['ex2','Scenario 2'] ];";

  const g = links.patchGuide(GUIDE, spec);
  ok(g.changed && g.body.indexOf('/pages/' + spec.page_handle) !== -1, 'the course guide gains a link to the lab page');
  ok(g.body.indexOf('/pages/ap-cyber-unit-4-lesson-3-lab') !== -1,
    'and the EXISTING per-lesson lab link survives, because that is a different lab');
  //  The inserted row inherits the card's own formatting rather than importing
  //  the other card's, which is what keeps a guide readable after two moves.
  ok(g.body.indexOf('            <a class="exercise-row" href="/pages/' + spec.page_handle
    + '"><div class="ex-dot"></div> <span class="ex-label">Terminal Lab</span>') !== -1,
    'the new row copies the anchor row it sits under, indent and separator included');
  ok(g.body.indexOf('/pages/ap-cyber-unit-1-lesson-2-lab') !== -1,
    'and the Unit 1 card is untouched, because that lab did not move');
  ok(links.patchGuide(g.body, spec).changed === false, 'a second guide run is a no-op, so a re-import is safe');

  const c = links.patchCommandCenter(CC, spec);
  ok(c.changed && c.body.indexOf('termlab:"/pages/' + spec.page_handle + '"') !== -1,
    'the command center 1.2 row gains the destination');
  ok(c.body.indexOf("['termlab','" + links.LABEL + "']") !== -1,
    'and the label that renders it, because either half alone renders nothing');
  ok(links.patchCommandCenter(c.body, spec).changed === false, 'a second command center run is a no-op');

  let refused = null;
  try { links.patchGuide('<div id="apcyber-course-hub"></div>', spec); } catch (e) { refused = e.message; }
  ok(!!refused, 'a body without the 1.2 card is refused, not silently left alone', refused);

  ok(spec.page_handle !== 'ap-cyber-unit-1-lesson-2-lab',
    'the terminal lab never claims the handle the password-attack lab already holds');
}

// ── EVERY EK CODE A LAB CITES MUST EXIST, AND BELONG TO ITS OWN TOPIC ───────
//  A check's `ek` is how a teacher answers "which part of the framework is this
//  for", and it is quoted at them on the page. A code that does not exist reads
//  exactly like one that does, so it has to be checked rather than eyeballed.
//  Straying into another topic's codes is the subtler failure: it looks right,
//  and it silently claims coverage the lesson does not have.
//
//  ap-cybersecurity labs are skipped: this file is the AP Networking framework,
//  and cyber answers to a different one.
{
  const EK = require('../config/networking-framework-statements.json').essential_knowledge;
  for (const spec of labs.all()) {
    if (spec.course !== 'ap-networking') continue;
    const missing = [];
    const strayed = [];
    for (const c of spec.checks) {
      if (!c.ek) continue;
      if (!EK[c.ek]) missing.push(`check ${c.n} -> ${c.ek}`);
      else if (c.ek.indexOf(spec.lesson_id + '.') !== 0) strayed.push(`check ${c.n} -> ${c.ek}`);
    }
    ok(missing.length === 0, `${spec.item_id}: every EK code cited exists`, missing.join('; '));
    ok(strayed.length === 0, `${spec.item_id}: no check cites another topic's EK`, strayed.join('; '));

    // A question whose answer index is out of range scores nothing forever, and
    // an unexplained one teaches nothing when it is got wrong.
    const badAnswer = (spec.questions || [])
      .filter((q) => !(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length))
      .map((q) => q.id);
    const unexplained = (spec.questions || []).filter((q) => !q.explain).map((q) => q.id);
    ok(badAnswer.length === 0, `${spec.item_id}: every question's answer index is in range`, badAnswer.join(', '));
    ok(unexplained.length === 0, `${spec.item_id}: every question explains itself`, unexplained.join(', '));
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
try { fs.unlinkSync(process.env.DB_PATH); } catch (e) {}
process.exit(fail ? 1 : 0);
