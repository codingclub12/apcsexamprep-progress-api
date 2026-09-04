'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: GET /api/files/:id for the AP NETWORKING teacher bundle.
//
//  ── WHAT THIS IS GUARDING ───────────────────────────────────────────────────
//  /pages/ap-networking-command-center published 26 Google Drive folder links
//  to anonymous visitors: a teacher folder per topic (Teacher Deck + Teacher
//  Guide) and an assessments folder per unit (Unit Test + Answer Key +
//  Performance Task). Board task 232. This suite pins the server half of the
//  fix: those folders are now manifest ids, and a URL is only ever handed to a
//  caller holding a teacher token with a live ap-networking entitlement.
//
//  ── THE THREE THINGS IT WOULD BE EASY TO GET WRONG ──────────────────────────
//  1. Cross-course leakage. A CSP-entitled teacher must not open a networking
//     folder, and a networking-entitled teacher must not open a CSP file. Both
//     manifests are now one table, so this is the assertion that keeps merging
//     them honest.
//  2. Student files. 44 student links (sd, sg) stay public on purpose. They must
//     NOT be in the manifest at all, or gating breaks a student for no gain.
//  3. Refusal uniformity. An unknown id and an unentitled id must be
//     indistinguishable, or the endpoint becomes a way to enumerate the bundle.
//
//  ── WHAT THIS CANNOT PROVE, AND SAYING SO IS THE POINT ──────────────────────
//  The Drive folders are still shared anyone-with-link. This route stops the
//  URLs being PUBLISHED; it does not revoke one already copied, and the 302 it
//  serves an entitled teacher is still a publicly readable URL. Closing that
//  needs the folders restricted in Drive, which is a human step on Tanner's
//  Drive and must come AFTER this is live and a real teacher has been seen to
//  still reach their files. No test here can assert it.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: node smoke/networking-file-gate.js
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-networking-file-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId, signTeacherToken, signStudentToken } = require('../utils');
const NET = require('../seed/networking-teacher-files.json');
const CSP = require('../seed/csp-teacher-files.json');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const app = express();
app.use('/api/files', require('../routes/files'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const get = (p, tok) => fetch(`${base()}${p}`, {
  headers: tok ? { Authorization: 'Bearer ' + tok } : {},
  redirect: 'manual',
}).then(async (r) => {
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) {}
  return { status: r.status, loc: r.headers.get('location'), cache: r.headers.get('cache-control'), text, body };
});

function makeTeacher() {
  const id = newId();
  db.prepare("INSERT INTO teachers (id, email, password_hash, name) VALUES (?, ?, 'x', 'T')")
    .run(id, `t-${id}@example.invalid`);
  return { id, email: `t-${id}@example.invalid` };
}
const grant = (teacherId, course) => db.prepare(
  "INSERT INTO entitlements (id, teacher_id, course, source, status, granted_at) VALUES (?, ?, ?, 'manual', 'active', datetime('now'))"
).run(newId(), teacherId, course);

const NET_IDS = Object.keys(NET);
const A_TOPIC = NET_IDS.find((k) => NET[k].topic);
const A_TEST = NET_IDS.find((k) => NET[k].unit);
const A_CSP_PAID = Object.keys(CSP).find((k) => !CSP[k].free);
const A_CSP_FREE = Object.keys(CSP).find((k) => CSP[k].free);

(async () => {
  console.log('\nAP NETWORKING TEACHER FILE GATE\n');

  const netTeacher = makeTeacher(); grant(netTeacher.id, 'ap-networking');
  const netTok = signTeacherToken(netTeacher);

  const cspTeacher = makeTeacher(); grant(cspTeacher.id, 'ap-csp');
  const cspTok = signTeacherToken(cspTeacher);

  const freeTeacher = makeTeacher();
  const freeTok = signTeacherToken(freeTeacher);

  const classId = newId();
  db.prepare('INSERT INTO classes (id, teacher_id, class_code, class_name, course) VALUES (?, ?, ?, ?, ?)')
    .run(classId, netTeacher.id, 'NET-1', 'C', 'ap-networking');
  const sid = newId();
  db.prepare("INSERT INTO students (id, class_id, display_name, pin_hash) VALUES (?, ?, 'Kid', 'x')").run(sid, classId);
  const studentTok = signStudentToken({ id: sid, class_id: classId, display_name: 'Kid' }, 'NET-1');

  console.log('1. The manifest covers the whole exposure and nothing else');
  {
    ok('  26 networking entries (22 topics + 4 units)', NET_IDS.length === 26, NET_IDS.length);
    ok('  22 carry a topic', NET_IDS.filter((k) => NET[k].topic).length === 22);
    ok('  4 carry a unit', NET_IDS.filter((k) => NET[k].unit).length === 4);
    ok('  every entry is course ap-networking',
       NET_IDS.every((k) => NET[k].course === 'ap-networking'));
    ok('  NOT ONE is free (these are the paid bundle)',
       NET_IDS.every((k) => NET[k].free === false));
    ok('  every entry is a drive folder, none carries a storefront path',
       NET_IDS.every((k) => NET[k].drive && NET[k].drive.kind === 'folder' && !NET[k].path));
    ok('  no id collides with the CSP manifest',
       NET_IDS.every((k) => !Object.prototype.hasOwnProperty.call(CSP, k)));
  }

  console.log('2. Anonymous and unentitled callers get nothing, and cannot tell why');
  {
    const anon = await get(`/api/files/${A_TOPIC}`, null);
    ok('  anonymous -> 403', anon.status === 403, anon);
    ok('  anonymous: no drive.google.com in the body', !anon.text.includes('drive.google.com'), anon.text);
    ok('  anonymous: no Location header', !anon.loc, anon.loc);

    const ft = await get(`/api/files/${A_TOPIC}`, freeTok);
    ok('  unentitled teacher -> 403', ft.status === 403, ft);

    const st = await get(`/api/files/${A_TOPIC}`, studentTok);
    ok('  student of an entitled teacher -> 403 (teacher-only material)', st.status === 403, st);

    const junk = await get(`/api/files/${A_TOPIC}`, 'not-a-token');
    ok('  garbage token -> 403, not a 500', junk.status === 403, junk);

    // The refusal must be byte-identical for "does not exist" and "not yours",
    // or the endpoint enumerates the bundle.
    const unknown = await get('/api/files/00000000000000ff', netTok);
    const forbidden = await get(`/api/files/${A_TOPIC}`, freeTok);
    ok('  unknown id and unentitled id give an identical refusal',
       unknown.status === forbidden.status && unknown.text === forbidden.text,
       { unknown: unknown.text, forbidden: forbidden.text });

    const badShape = await get('/api/files/../../etc/passwd', netTok);
    ok('  a path-shaped id is refused', badShape.status === 403 || badShape.status === 404, badShape.status);
  }

  console.log('3. An entitled networking teacher reaches their folders');
  {
    const r = await get(`/api/files/${A_TOPIC}`, netTok);
    ok('  entitled teacher -> 302', r.status === 302, r);
    ok('  redirects to the right Drive folder',
       r.loc === `https://drive.google.com/drive/folders/${NET[A_TOPIC].drive.id}`, r.loc);
    ok('  never cached', r.cache === 'private, no-store', r.cache);

    const t = await get(`/api/files/${A_TEST}`, netTok);
    ok('  unit assessments folder resolves too', t.status === 302, t);

    const j = await get(`/api/files/${A_TOPIC}?as=json`, netTok);
    ok('  ?as=json returns the url for the click path', j.body && typeof j.body.url === 'string', j.body);

    // Every one of the 26 must resolve, or the page would gain a dead link.
    //
    // THE SHAPE IS ASSERTED AGAINST A FIXED PATTERN, NOT AGAINST THE MANIFEST,
    // and that distinction is the whole value of this block. The obvious
    // version of the check above compares the Location to
    // `.../folders/${NET[id].drive.id}`, which reads the expectation out of the
    // same manifest the route read. Poison the manifest and the expectation
    // moves with it, so the assertion passes while serving an open redirect.
    // Mutation testing caught exactly that: dropping the id validation in
    // resolveUrl and planting '../../evil.example.com/x' left this suite GREEN.
    // A literal pattern cannot be moved by the data it is judging.
    const SAFE_FOLDER = /^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]{20,64}$/;
    let all302 = true;
    let allSafe = true;
    for (const id of NET_IDS) {
      const x = await get(`/api/files/${id}`, netTok);
      if (x.status !== 302 || !x.loc) { all302 = false; continue; }
      if (!SAFE_FOLDER.test(x.loc)) { allSafe = false; }
    }
    ok('  all 26 folders resolve for the entitled teacher', all302);
    ok('  every Location is a well formed Drive folder url (no traversal, no other host)',
       allSafe);

    // And the same rule at the unit of the route, so a single bad manifest line
    // is refused rather than emitted. Belt and braces on purpose: this is the
    // one place a corrupt manifest becomes an open redirect off our origin.
    const { MANIFEST } = require('../routes/files');
    ok('  every manifest entry is either a storefront path or a valid drive id',
       Object.values(MANIFEST).every((f) => (
         typeof f.path === 'string'
           ? /^\/cdn\/shop\/files\/[A-Za-z0-9._-]+$/.test(f.path)
           : !!(f.drive && /^[A-Za-z0-9_-]{20,64}$/.test(f.drive.id)
                && ['file', 'folder'].includes(f.drive.kind))
       )));
  }

  console.log('4. Cross-course isolation, both directions');
  {
    const c = await get(`/api/files/${A_TOPIC}`, cspTok);
    ok('  CSP-entitled teacher canNOT open a networking folder', c.status === 403, c);

    const n = await get(`/api/files/${A_CSP_PAID}`, netTok);
    ok('  networking-entitled teacher canNOT open a paid CSP file', n.status === 403, n);

    // The free CSP sample must stay free, and merging manifests must not have
    // made it require entitlement.
    const f = await get(`/api/files/${A_CSP_FREE}`, null);
    ok('  a free CSP file is still open to anonymous', f.status === 302, f);
    ok('  and it still points at the storefront, not Drive',
       !!f.loc && f.loc.includes('/cdn/shop/files/'), f.loc);
  }

  console.log('5. The listing endpoint reports networking without leaking urls');
  {
    const anon = await get('/api/files?course=ap-networking', null);
    ok('  anonymous listing: entitled false', anon.body && anon.body.entitled === false, anon.body);
    ok('  anonymous listing: zero files (none are free)',
       anon.body && Array.isArray(anon.body.files) && anon.body.files.length === 0, anon.body);
    ok('  anonymous listing: no drive url anywhere', !anon.text.includes('drive.google.com'), anon.text);

    const ent = await get('/api/files?course=ap-networking', netTok);
    ok('  entitled listing: 26 files', ent.body && ent.body.files.length === 26, ent.body && ent.body.files.length);
    ok('  entitled listing carries ids and labels but NO urls',
       !ent.text.includes('drive.google.com') && ent.body.files.every((f) => f.id && f.label), ent.text.slice(0, 200));
    ok('  entitled listing carries the unit dimension for the 4 assessments',
       ent.body.files.filter((f) => f.unit).length === 4);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
