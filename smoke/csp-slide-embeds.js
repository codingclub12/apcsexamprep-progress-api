'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: Google Slides embeds for the AP CSP Teacher Bundle.
//
//  Two things are under test and only one of them is about rendering.
//
//  A. THE GENERATOR REFUSES BAD INPUT. scripts/csp-slide-embeds-from-csv.js
//     turns a spreadsheet into a config file that grants access. The converted
//     decks are shared "anyone with the link", so a file id IS access. The
//     failure that matters is not a missing row (that deck just stays
//     download-only) but a file id landing on the wrong deck slot: the variant
//     filter in routes/slides.js would still be running and still be bypassed,
//     because it would be filtering a student-labelled row that carries the
//     teacher deck's id. Every assertion in part 1 is that shape.
//
//  B. AN EMBED URL IS AS SENSITIVE AS THE .PPTX URL. So the locked-path
//     assertions scan the raw response text for docs.google.com exactly the
//     way smoke/csp-slide-gate.js scans it for cdn.shopify.com. A gate that
//     withholds the download link and ships the embed link is not a gate.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cspembeds
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

process.env.DB_PATH = path.join(__dirname, 'smoke-csp-slide-embeds.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId, signTeacherToken, signStudentToken } = require('../utils');
const manifest = require('../config/csp-slide-manifest');
const embeds = require('../config/csp-slide-embeds');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cspembeds-'));
const GEN = path.join(__dirname, '..', 'scripts', 'csp-slide-embeds-from-csv.js');
const HEADER = ['lesson', 'day', 'variant', 'track', 'sourceName', 'slidesId', 'embedUrl', 'status'];

// A synthetic but structurally faithful export of the `AP CSP Slides Map`
// sheet: every deck the manifest expects, one distinct file id each.
function fullExport() {
  const rows = [];
  let n = 0;
  for (const lessonId of manifest.LESSON_IDS) {
    for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
      for (const variant of ['TEACHER', 'Student']) {
        for (const track of ['CB', 'DeepDive']) {
          n++;
          rows.push([lessonId, String(day), variant, track,
            `Day${day}_Deck_${variant}_${track}.pptx`, fakeId(n), 'https://x', 'OK']);
        }
      }
    }
  }
  return rows;
}
const fakeId = (i) => ('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' + String(i).padStart(6, '0')).slice(0, 44);

function writeCsv(name, rows) {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, [HEADER, ...rows].map((r) => r.join(',')).join('\n'));
  return p;
}

// Runs the generator WITHOUT --write, so nothing in config/ is touched.
function check(csvPath) {
  try {
    return { code: 0, out: execFileSync('node', [GEN, csvPath], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

function makeTeacher() {
  const id = newId();
  db.prepare("INSERT INTO teachers (id, email, password_hash, name) VALUES (?, ?, 'x', 'T')")
    .run(id, `t-${id}@example.invalid`);
  return { id, email: `t-${id}@example.invalid` };
}
function makeClass(teacherId, course, code) {
  const classId = newId();
  db.prepare('INSERT INTO classes (id, teacher_id, class_code, class_name, course) VALUES (?, ?, ?, ?, ?)')
    .run(classId, teacherId, code, 'Smoke Class', course);
  return classId;
}
function makeStudent(classId, name) {
  const id = newId();
  db.prepare("INSERT INTO students (id, class_id, display_name, pin_hash) VALUES (?, ?, ?, 'x')")
    .run(id, classId, name);
  return id;
}
const grant = (teacherId, course) => db.prepare(
  "INSERT INTO entitlements (id, teacher_id, course, source, status, granted_at) VALUES (?, ?, ?, 'manual', 'active', datetime('now'))"
).run(newId(), teacherId, course);

const app = express();
app.use(express.json());
app.use('/api/slides', require('../routes/slides'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const GOOGLE_HOST = 'docs.google.com';

const slides = (course, lessonId, tok) => fetch(`${base()}/api/slides/${course}/${lessonId}`, {
  headers: tok ? { Authorization: 'Bearer ' + tok } : {},
}).then(async (r) => {
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) {}
  return { status: r.status, text, body };
});

(async () => {
  console.log('\nCSP SLIDE EMBEDS\n');

  console.log('1. The generator accepts a clean export');
  {
    const r = check(writeCsv('good.csv', fullExport()));
    ok('  exits 0', r.code === 0, r.out);
    ok('  expects exactly the manifest deck count', /decks expected\s+: 224/.test(r.out), r.out);
    ok('  accepts every row', /ids accepted\s+: 224/.test(r.out), r.out);
    ok('  reports nothing missing', /not yet converted: 0/.test(r.out), r.out);
    ok('  does not write without --write', /Re-run with --write/.test(r.out), r.out);
  }

  console.log('2. A file id on two deck slots is refused, because that crosses the variant line');
  {
    const rows = fullExport();
    const teacherId = rows[0][5];            // 1-1 day1 TEACHER CB
    rows[2][5] = teacherId;                  // 1-1 day1 Student CB now points at it
    const r = check(writeCsv('dupeid.csv', rows));
    ok('  exits non-zero', r.code !== 0, r.code);
    ok('  refuses to write', /REFUSING TO WRITE/.test(r.out), r.out);
    ok('  names the collision', /shares a file id with 1-1\|1\|teacher\|cb/.test(r.out), r.out);
    ok('  explains the consequence, not just the rule',
      /hand a student a teacher deck/.test(r.out), r.out);
  }

  console.log('3. Rows the manifest does not recognise are refused');
  {
    const rows = fullExport();
    rows[5][0] = '9-9';
    const a = check(writeCsv('badlesson.csv', rows));
    ok('  unknown lesson: exits non-zero', a.code !== 0, a.code);
    ok('  unknown lesson: named in the output', /9-9\|/.test(a.out), a.out);

    // 1-1 is a one-day lesson, so a Day 3 deck means Drive and the manifest
    // disagree about the bundle. Better to hear it here than to serve it.
    const rows2 = fullExport();
    rows2[1][1] = '3';
    const b = check(writeCsv('badday.csv', rows2));
    ok('  day beyond the lesson day count: exits non-zero', b.code !== 0, b.code);
    ok('  day beyond the lesson day count: named', /1-1\|3\|/.test(b.out), b.out);

    const rows3 = fullExport();
    rows3[4][5] = 'nope';
    const c = check(writeCsv('badid.csv', rows3));
    ok('  unusable file id: exits non-zero', c.code !== 0, c.code);
    ok('  unusable file id: named', /is not a Drive file id/.test(c.out), c.out);
  }

  console.log('4. An interrupted conversion is a working state, not a failure');
  {
    const all = fullExport();
    const rows = all.slice(0, 40);
    for (let i = 0; i < 4; i++) {
      const r = all[40 + i].slice();
      r[5] = ''; r[7] = 'FAILED: timeout';
      rows.push(r);
    }
    const r = check(writeCsv('partial.csv', rows));
    ok('  exits 0: gaps are survivable', r.code === 0, r.out);
    ok('  counts only the good rows', /ids accepted\s+: 40/.test(r.out), r.out);
    ok('  counts the rest as not yet converted', /not yet converted: 184/.test(r.out), r.out);
    ok('  reports the failed rows', /rows the script marked FAILED: 4/.test(r.out), r.out);
    ok('  says the rest stay download-only', /stay download-only/.test(r.out), r.out);
  }

  // ── Route behaviour ────────────────────────────────────────────────────────
  // The config is generated and currently empty, so the embed lookup is stubbed
  // here rather than writing a fixture into config/. This works because
  // decksForLesson calls `embeds.slideId(...)` through the module object at
  // call time; that indirection is deliberate and this is the seam it buys.
  const realSlideId = embeds.slideId;
  embeds.slideId = (lessonId, day, variant, track) =>
    `ID-${lessonId}-${day}-${variant}-${track}`;

  const paidTeacher = makeTeacher();
  grant(paidTeacher.id, 'ap-csp');
  const paidTeacherTok = signTeacherToken(paidTeacher);

  const freeTeacher = makeTeacher();
  const freeTeacherTok = signTeacherToken(freeTeacher);

  const paidClassId = makeClass(paidTeacher.id, 'ap-csp', 'CSP-EPAID');
  const paidStudentTok = signStudentToken(
    { id: makeStudent(paidClassId, 'Paid Kid'), class_id: paidClassId, display_name: 'Paid Kid' }, 'CSP-EPAID');

  const freeClassId = makeClass(freeTeacher.id, 'ap-csp', 'CSP-EFREE');
  const freeStudentTok = signStudentToken(
    { id: makeStudent(freeClassId, 'Free Kid'), class_id: freeClassId, display_name: 'Free Kid' }, 'CSP-EFREE');

  console.log('5. An entitled teacher gets embed urls alongside the downloads');
  {
    const r = await slides('ap-csp', '1-2', paidTeacherTok);
    const decks = (r.body && r.body.decks) || [];
    ok('  unlocked', r.body && r.body.locked === false, r.body);
    ok('  8 decks', decks.length === 8, decks.length);
    ok('  every deck carries an embedUrl', decks.every((d) => typeof d.embedUrl === 'string'), decks[0]);
    ok('  embed points at Google Slides', decks.every((d) => d.embedUrl.startsWith('https://docs.google.com/presentation/d/')), decks[0]);
    ok('  embed asks for the /embed view, not /edit',
      decks.every((d) => /\/embed\?/.test(d.embedUrl) && !/\/edit/.test(d.embedUrl)), decks[0]);
    ok('  autoplay is off', decks.every((d) => /start=false/.test(d.embedUrl)), decks[0]);
    ok('  the .pptx download survives alongside it',
      decks.every((d) => d.url.endsWith('.pptx')), decks[0]);
  }

  console.log('6. THE GATE: no embed url ever reaches an unentitled caller');
  {
    for (const [who, tok] of [
      ['anonymous', null],
      ['garbage token', 'not-a-real-token'],
      ['unpaid teacher', freeTeacherTok],
      ['unpaid student', freeStudentTok],
    ]) {
      const r = await slides('ap-csp', '1-2', tok);
      ok(`  ${who}: locked`, r.body && r.body.locked === true, r.body);
      ok(`  ${who}: no docs.google.com anywhere in the raw response`,
        !r.text.includes(GOOGLE_HOST), r.text);
    }
  }

  console.log('7. THE GATE: an entitled student gets no teacher-deck embed');
  {
    const r = await slides('ap-csp', '1-2', paidStudentTok);
    const decks = (r.body && r.body.decks) || [];
    ok('  unlocked', r.body && r.body.locked === false, r.body);
    ok('  4 decks, student variant only', decks.length === 4 && decks.every((d) => d.variant === 'student'), decks);
    ok('  every embed is a student embed', decks.every((d) => d.embedUrl.includes('-student-')), decks);
    // The raw-text check is the one that matters: it catches a teacher id
    // riding along under some other key, which a field-by-field check misses.
    ok('  no teacher-variant id appears anywhere in the raw response',
      !r.text.includes('-teacher-'), r.text);
  }

  console.log('8. A deck with no conversion yet is served download-only');
  {
    embeds.slideId = (lessonId, day, variant, track) =>
      (day === 1 ? `ID-${lessonId}-${day}-${variant}-${track}` : null);
    const r = await slides('ap-csp', '1-2', paidTeacherTok);
    const decks = (r.body && r.body.decks) || [];
    const d1 = decks.filter((d) => d.day === 1);
    const d2 = decks.filter((d) => d.day === 2);
    ok('  converted day has embedUrl', d1.length === 4 && d1.every((d) => d.embedUrl), d1);
    ok('  unconverted day omits the key entirely rather than sending null',
      d2.length === 4 && d2.every((d) => !('embedUrl' in d)), d2);
    ok('  unconverted day still has its download link', d2.every((d) => d.url.endsWith('.pptx')), d2);
  }

  embeds.slideId = realSlideId;

  console.log('9. The checked-in config is coherent on its own');
  {
    // Guards the generated file itself, so a hand-edit or a bad regeneration
    // is caught by CI rather than by a teacher opening a broken deck.
    const ids = [];
    for (const lessonId of manifest.LESSON_IDS) {
      for (let day = 1; day <= manifest.dayCount(lessonId); day++) {
        for (const v of manifest.VARIANT_KEYS) {
          for (const t of manifest.TRACK_KEYS) {
            const id = embeds.slideId(lessonId, day, v, t);
            if (id) ids.push(id);
          }
        }
      }
    }
    ok(`  every stored id is shaped like a Drive file id (${ids.length} stored)`,
      ids.every((id) => /^[A-Za-z0-9_-]{25,80}$/.test(id)), ids.filter((id) => !/^[A-Za-z0-9_-]{25,80}$/.test(id)));
    ok('  no id is reused across deck slots', new Set(ids).size === ids.length,
      ids.length - new Set(ids).size);
    ok('  count() agrees with what the manifest can reach', embeds.count() === ids.length,
      [embeds.count(), ids.length]);
    const sample = embeds.embedUrl('ABC123');
    ok('  embedUrl builds a docs.google.com embed', sample === 'https://docs.google.com/presentation/d/ABC123/embed?start=false&loop=false', sample);
    // rm=minimal hides the Slides toolbar, and with it the previous/next
    // controls, the slide counter and the fullscreen button. A teacher
    // projecting in class needs those, so it must not come back.
    ok('  and does not hide the Slides toolbar', sample.indexOf('rm=minimal') === -1, sample);
    ok('  and does not autoplay', /start=false/.test(sample) && /loop=false/.test(sample), sample);
    ok('  a lesson with no ids returns decks without embedUrl',
      embeds.count() > 0 || manifest.decksForLesson('1-1', ['teacher']).every((d) => !('embedUrl' in d)));
  }

  server.close();
  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
