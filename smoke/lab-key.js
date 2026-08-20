'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the lab answer key gates, and says what it is.
//
//  Two failures this suite exists to catch, and they pull in opposite
//  directions, which is why both halves are here.
//
//   1. AN UNDER-GATED KEY hands a class the answers. Sections 1 and 2 check
//      that every way of not being an entitled teacher is refused, with one
//      identical response so the route cannot be used to enumerate labs.
//   2. AN OVER-GATED KEY locks out the teacher it exists for. Section 3 checks
//      an entitled teacher actually gets it.
//
//  Section 4 checks the key AGREES WITH THE LAB. A key derived from the spec
//  cannot drift in principle; this asserts the derivation is really happening
//  rather than a copy having been pasted in at some point.
//
//  Section 5 checks the honesty. The key must carry its own disclosure, and the
//  browser payload must no longer carry the walkthrough.
//
//  Zero PII: one synthetic teacher, no student data anywhere near this.
//
//  Run: npm run smoke:labkey
// -----------------------------------------------------------------------------

const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-lab-key.db');
process.env.JWT_SECRET = 'smoke-lab-key-secret-long-enough-for-jwt';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const entitlements = require('../lib/entitlements');
const labs = require('../lib/lab-spec');
const answerKey = require('../lib/lab-answer-key');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const app = express();
app.use(express.json());
app.use(require('../routes/labs'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

async function get(url, token) {
  const r = await fetch(base() + url, {
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
  let j = null;
  try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
}

(async () => {
  const spec = labs.all()[0];
  const KEY_URL = `/api/labs/${spec.course}/${spec.item_id}/key`;

  section('1. Nobody without a teacher token gets a key');
  let r = await get(KEY_URL);
  ok('no token is refused', r.status === 403, r.status);
  ok('and the refusal says nothing about the lab', r.j && r.j.error === 'Not available.', r.j);

  r = await get(KEY_URL, 'not-a-token');
  ok('a garbage token is refused', r.status === 403, r.status);

  const studentToken = signStudentToken({ id: 'stu-key-1', name: 'S' }, 'CYBER-TEST');
  r = await get(KEY_URL, studentToken);
  ok('a STUDENT token is refused, which is the whole point', r.status === 403, r.status);

  section('2. Nor does a teacher without an entitlement for the course');
  const teacher = { id: 'tch-key-1', email: 't@example.test' };
  db.prepare('INSERT OR IGNORE INTO teachers (id, email, password_hash, name) VALUES (?,?,?,?)')
    .run(teacher.id, teacher.email, 'x', 'T');
  const teacherToken = signTeacherToken(teacher);
  r = await get(KEY_URL, teacherToken);
  ok('an unentitled teacher is refused', r.status === 403, r.status);
  r = await get(KEY_URL, teacherToken + 'tampered');
  ok('a tampered teacher token is refused', r.status === 403, r.status);

  // A lab that does not exist must look exactly like one you may not read, or
  // the refusal becomes a way to enumerate the catalogue.
  const unknown = await get(`/api/labs/${spec.course}/no-such-lab/key`, teacherToken);
  ok('an unknown lab is refused identically, not 404',
    unknown.status === 403 && unknown.j && unknown.j.error === 'Not available.', unknown);

  section('3. An entitled teacher gets the key');
  entitlements.grantOrRefresh(teacher.id, spec.course, 'smoke', 'smoke-order', null);
  ok('the grant landed', entitlements.evaluateTeacherGate(teacher.id, spec.course));
  r = await get(KEY_URL, teacherToken);
  ok('the entitled teacher is served', r.status === 200, r.status);
  ok('and it is a key', !!(r.j && r.j.key && r.j.key.item_id === spec.item_id), r.j && Object.keys(r.j));

  section('4. The key agrees with the lab, because it is derived from it');
  const key = r.j.key;
  ok('one rubric row per check', key.rubric.length === spec.checks.length,
    { rubric: key.rubric.length, checks: spec.checks.length });
  ok('one point per row, totalling the lab points',
    key.rubric.reduce((n, x) => n + x.points, 0) === spec.points);
  ok('every rubric row explains what satisfies it',
    key.rubric.every((x) => typeof x.satisfied_by === 'string' && x.satisfied_by.length > 8),
    key.rubric.map((x) => x.satisfied_by));
  ok('the walkthrough is the reference solution',
    key.walkthrough.length === spec.solution.length);
  ok('every question carries exactly one correct option',
    key.questions.every((q) => q.options.filter((o) => o.correct).length === 1));
  ok('and the correct option is the one the spec names',
    key.questions.every((q) => {
      const s = spec.questions.find((x) => x.id === q.id);
      return s && q.correct_index === s.answer && q.correct_text === s.options[s.answer];
    }));

  // The derivation, not the route: a second lab must key just as well, or the
  // first one was special-cased somewhere.
  for (const other of labs.all()) {
    const k = answerKey.build(other);
    ok(`${other.item_id}: keys from its spec alone`,
      !!k && k.rubric.length === other.checks.length && k.questions.length === (other.questions || []).length);
  }

  section('5. It is honest about what it is');
  ok('the key carries its own disclosure',
    typeof key.disclosure === 'string' && /not as a secret/.test(key.disclosure), key.disclosure);
  const browser = labs.forBrowser(spec);
  ok('the browser payload no longer ships the walkthrough', browser.solution === undefined);
  ok('but still ships what the player needs to grade in the page',
    Array.isArray(browser.questions) && browser.questions[0].answer !== undefined);
  ok('and the spec on disk keeps it, so smoke:labs can still play the lab',
    Array.isArray(spec.solution) && spec.solution.length > 0);

  section('6. The Command Center panel carries no answers');
  //  The panel is markup that gets PUBLISHED. If the key were built into it,
  //  importing the page would publish the answers to anyone who views source,
  //  and the gate on the route would be pointless. CI runs the patch against a
  //  fixture carrying the exact anchors the live body carries.
  const panel = require('../scripts/cyber-lab-key-panel.js');
  const FIXTURE = '<script>\n'
    + '  var CFG = { API: "https://progress.apcsexamprep.com" };\n'
    + '  var STU = {\n    "1.2":{page:"/pages/x"}\n  };\n'
    + '  function studentSection(l, unlocked){ return ""; }\n'
    + '  function lessonHTML(l, unlocked){\n'
    + '    return ""\n'
    + '      +     studentSection(l, unlocked)\n'
    + '      + "";\n  }\n</' + 'script>';

  const patched = panel.patch(FIXTURE);
  ok('the panel patch applies', patched.changed === true);
  ok('and is a no-op on a second run', panel.patch(patched.body).changed === false);
  ok('the lesson row calls labKeySection', patched.body.indexOf('labKeySection(l, unlocked)') !== -1);
  ok('the page carries the lab id', patched.body.indexOf(spec.item_id) !== -1 || patched.body.indexOf('1.2-lab') !== -1);
  ok('and fetches the key from the gated route', patched.body.indexOf('/key') !== -1);

  const leaked = [];
  for (const s of labs.all()) {
    for (const q of s.questions || []) {
      for (const t of [q.options[q.answer], q.explain]) {
        if (t && t.length >= 8 && patched.body.indexOf(t) !== -1) leaked.push(t.slice(0, 50));
      }
    }
    for (const st of s.solution || []) {
      if (typeof st === 'string' && st.length >= 8 && patched.body.indexOf(st) !== -1) leaked.push(st);
    }
  }
  ok('no answer, explanation or solution step is in the published markup', leaked.length === 0, leaked);

  let refused = null;
  try { panel.patch('<script>var STU = {};</' + 'script>'); } catch (e) { refused = e.message; }
  ok('a body without the anchors is refused, not half-patched', !!refused, refused);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
