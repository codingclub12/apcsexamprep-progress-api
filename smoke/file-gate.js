'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the teacher file gate actually gates.
//
//  WHAT IS BEING PROTECTED
//
//  csp-command-center printed 780 bundle file URLs into its public HTML, 222 of
//  them answer keys, 196 of those for the paid Big Ideas. The only gate was
//  `FREE_BI: [1]`, a client-side array. An anonymous request for a paid Big Idea
//  exam key returned 200 with no auth and no referrer check.
//
//  Every property this route rests on fails SILENTLY, which is the only kind
//  worth a suite:
//
//   1. A GATE THAT STOPS GATING still returns a working download, so every
//      manual click keeps succeeding and nobody notices until the keys are on a
//      forum. Sections 2 and 3 make the requests an attacker would.
//
//   2. A GATE THAT OVER-GATES locks out the paying teacher it exists to serve,
//      and the report arrives as "the bundle is broken" days later. Section 4
//      checks an entitled teacher still gets the redirect, and section 5 checks
//      the free Big Idea is still free.
//
//   3. AN ENUMERABLE REFUSAL turns the endpoint into a way to confirm which
//      files the bundle holds. Section 6 checks a real-but-forbidden id and a
//      nonexistent id are indistinguishable.
//
//   4. AN OPEN REDIRECT would make the endpoint a way to bounce traffic off this
//      origin. Section 7 checks the Location always points at the storefront.
//
//  WHAT THIS CANNOT PROVE: that a URL somebody already copied stopped working.
//  Nothing in this repo can. Shopify CDN files are public by construction, so
//  old URLs die only when the files are re-uploaded under a new suffix.
//
//  Zero PII: one synthetic teacher, no student data anywhere near this.
//
//  Run: npm run smoke:filegate
// -----------------------------------------------------------------------------

const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-file-gate.db');
process.env.JWT_SECRET = 'smoke-file-gate-secret-long-enough-for-jwt';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const entitlements = require('../lib/entitlements');
const MANIFEST = require('../seed/csp-teacher-files.json');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const app = express();
app.use(express.json());
app.use('/api/files', require('../routes/files'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

// Never follow the redirect: the point is what the server says, not what the CDN
// then serves, and following it would fetch real answer keys during a test run.
async function get(url, token) {
  return fetch(base() + url, {
    redirect: 'manual',
    headers: token ? { Authorization: 'Bearer ' + token } : {},
  });
}

function pick(predicate) {
  const hit = Object.entries(MANIFEST).find(([, f]) => predicate(f));
  return hit ? { id: hit[0], file: hit[1] } : null;
}

(async () => {
  section('1. The manifest is the thing the leak was about');
  const ids = Object.keys(MANIFEST);
  // Exact counts, not thresholds. The first manifest built here walked
  // bigIdeas -> topics -> teacherFiles and quietly missed
  // bigIdeas -> exam -> teacherFiles, so it held 434 of 439 files and 217 of 222
  // keys. A "> 400" assertion passed happily on that. The five it missed were
  // the Big Idea exam keys, including the one used to demonstrate the leak.
  ok('the manifest holds every teacher file the page carries', ids.length === 439, ids.length);
  const keys = ids.filter((id) => /answer|key|solution|rubric/i.test(MANIFEST[id].path));
  ok('and all 222 answer keys', keys.length === 222, keys.length);
  const examKeys = ids.filter((id) => /BigIdea\d_Exam_KEY/i.test(MANIFEST[id].path));
  ok('including the five Big Idea exam keys', examKeys.length === 5, examKeys.length);
  ok('every id is a 16 hex digit token', ids.every((i) => /^[0-9a-f]{16}$/.test(i)));
  ok('every path is a Shopify file path',
    ids.every((i) => /^\/cdn\/shop\/files\//.test(MANIFEST[i].path)));
  ok('no student handout is in here',
    ids.every((i) => !/_Student_/.test(MANIFEST[i].path)));

  const paidKey = pick((f) => !f.free && /answer|key|solution|rubric/i.test(f.path));
  const freeFile = pick((f) => f.free);
  ok('there is a paid answer key to test with', !!paidKey, paidKey && paidKey.file.path);
  ok('there is a free Big Idea 1 file to test with', !!freeFile);

  section('2. Anonymous cannot have a paid answer key');
  let r = await get('/api/files/' + paidKey.id);
  ok('anonymous is refused', r.status === 403, r.status);
  ok('and is not redirected anywhere', !r.headers.get('location'));

  section('3. Neither can a student, nor a teacher with no entitlement');
  const studentToken = signStudentToken({ id: 'stu-smoke-1', name: 'S' }, 'CSP-TEST');
  r = await get('/api/files/' + paidKey.id, studentToken);
  ok('a student token is refused', r.status === 403, r.status);

  const teacher = { id: 'tch-smoke-1', email: 't@example.test' };
  db.prepare('INSERT OR IGNORE INTO teachers (id, email, password_hash, name) VALUES (?,?,?,?)')
    .run(teacher.id, teacher.email, 'x', 'T');
  const teacherToken = signTeacherToken(teacher);
  r = await get('/api/files/' + paidKey.id, teacherToken);
  ok('an unentitled teacher is refused', r.status === 403, r.status);

  r = await get('/api/files/' + paidKey.id, teacherToken + 'tampered');
  ok('a tampered token is refused', r.status === 403, r.status);

  section('4. An entitled teacher still gets the file');
  entitlements.grantOrRefresh(teacher.id, 'ap-csp', 'smoke', 'smoke-order', null);
  ok('the grant landed', entitlements.evaluateTeacherGate(teacher.id, 'ap-csp'));
  r = await get('/api/files/' + paidKey.id, teacherToken);
  ok('the entitled teacher is redirected', r.status === 302, r.status);
  const loc = r.headers.get('location') || '';
  ok('to the real file', loc.endsWith(paidKey.file.path), loc);
  ok('and the redirect is not cached', /no-store/.test(r.headers.get('cache-control') || ''));

  section('5. Big Idea 1 is still the free sample');
  r = await get('/api/files/' + freeFile.id);
  ok('a free file works with no token at all', r.status === 302, r.status);

  section('6. A refusal never says whether the id exists');
  const real = await get('/api/files/' + paidKey.id);
  const fake = await get('/api/files/' + '0'.repeat(16));
  ok('same status for a real id and a fake one', real.status === fake.status,
    { real: real.status, fake: fake.status });
  ok('same body too', JSON.stringify(await real.json()) === JSON.stringify(await fake.json()));
  const malformed = await get('/api/files/not-a-valid-id');
  ok('a malformed id is refused the same way', malformed.status === 403, malformed.status);

  section('6b. The JSON mode obeys exactly the same gate');
  // The Command Center uses ?as=json because a link click cannot carry a bearer
  // token. A second way in is a second way to get it wrong, so it is checked
  // against the same four callers as the redirect.
  r = await get('/api/files/' + paidKey.id + '?as=json');
  ok('anonymous is refused in JSON mode too', r.status === 403, r.status);
  ok('and gets no url', !JSON.stringify(await r.json()).includes('/cdn/shop/files/'));
  r = await get('/api/files/' + paidKey.id + '?as=json', studentToken);
  ok('a student is refused in JSON mode too', r.status === 403, r.status);
  r = await get('/api/files/' + paidKey.id + '?as=json', teacherToken);
  ok('the entitled teacher gets a url', r.status === 200, r.status);
  const jsonBody = await r.json();
  ok('and it is the real file', typeof jsonBody.url === 'string' && jsonBody.url.endsWith(paidKey.file.path),
    jsonBody.url);
  ok('served from our own storefront', /^https:\/\/www\.apcsexamprep\.com\//.test(jsonBody.url));

  section('7. The redirect cannot leave our own storefront');
  // The route builds its Location as STOREFRONT + path, so a manifest line
  // carrying '//evil.test/x' or a scheme would turn this into an open redirect.
  // Every entry is checked, not a sample, and the check is the same regex the
  // route enforces at request time.
  const escapers = ids.filter((id) => !/^\/cdn\/shop\/files\/[A-Za-z0-9._-]+$/.test(MANIFEST[id].path));
  ok('no manifest path can escape the origin', escapers.length === 0,
    escapers.slice(0, 3).map((i) => MANIFEST[i].path));

  // And a manifest that HAS been poisoned must still be refused at request time,
  // because the manifest is a file on disk and this is the last line of defence.
  const poisoned = '//evil.test/steal.docx';
  ok('a poisoned path would be rejected by the route regex',
    !/^\/cdn\/shop\/files\/[A-Za-z0-9._-]+$/.test(poisoned));

  section('8. The listing shows only what the caller may open');
  r = await get('/api/files?course=ap-csp');
  let body = await r.json();
  const anonCount = body.files.length;
  ok('anonymous sees only the free Big Idea', body.entitled === false && anonCount > 0, anonCount);
  ok('and no paid file is listed',
    body.files.every((f) => MANIFEST[f.id].free), body.files.filter((f) => !MANIFEST[f.id].free).length);
  ok('no URL is ever in the listing', !JSON.stringify(body).includes('/cdn/shop/files/'));

  r = await get('/api/files?course=ap-csp', teacherToken);
  body = await r.json();
  ok('an entitled teacher sees more', body.entitled === true && body.files.length > anonCount,
    { anon: anonCount, teacher: body.files.length });
  ok('and still gets no URLs', !JSON.stringify(body).includes('/cdn/shop/files/'));

  section('9. The Command Center rewrite removes the URLs and keeps the student ones');
  // Step 2 of the fix. The page is what published the URLs, so a rewrite that
  // half worked would leave keys in the HTML while looking correct on screen.
  const ccSnap = path.join(__dirname, '..', 'shopify', 'page-snapshots', 'csp-command-center.before-file-gate.html');
  if (!fs.existsSync(ccSnap)) {
    ok('the Command Center snapshot exists', false, ccSnap);
  } else {
    ok('the Command Center snapshot exists', true);
    const { rewrite } = require('../scripts/csp-command-center-gate-files');
    const before = fs.readFileSync(ccSnap, 'utf8');
    const rw = rewrite(before);
    ok('every teacher file href was swapped', rw.swapped === rw.teacherHrefs.length,
      { swapped: rw.swapped, expected: rw.teacherHrefs.length });
    ok('there are 439 of them', rw.teacherHrefs.length === 439, rw.teacherHrefs.length);
    ok('fileBtn was patched to render ids as buttons', rw.patchedBtn);

    const survivors = [...new Set(rw.teacherHrefs)].filter((h) => rw.body.includes(h));
    ok('not one teacher file URL survives in the page', survivors.length === 0, survivors.slice(0, 3));
    const keysLeft = (rw.body.match(/\/cdn\/shop\/files\/[^"]*/g) || [])
      .filter((u) => /answer|key|solution|rubric/i.test(u));
    ok('and no answer key URL is anywhere in the HTML', keysLeft.length === 0, keysLeft.slice(0, 3));

    const lostStudent = [...new Set(rw.studentHrefs)].filter((h) => !rw.body.includes(h));
    ok('every student handout URL is still there', lostStudent.length === 0, lostStudent.slice(0, 3));

    // Each id in the page has to be one the API will actually resolve, or the
    // rewrite produces links that 403 for everyone including a paying teacher.
    const pageIds = [...rw.body.matchAll(/"href":"api:([0-9a-f]{16})"/g)].map((m) => m[1]);
    ok('the page carries one id per teacher file', pageIds.length === rw.teacherHrefs.length, pageIds.length);
    const unknown = [...new Set(pageIds)].filter((i) => !Object.prototype.hasOwnProperty.call(MANIFEST, i));
    ok('and every id is one the manifest resolves', unknown.length === 0, unknown.slice(0, 3));

    const vm = require('vm');
    const blocks = [...rw.body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    let broke = null;
    blocks.forEach((b) => { try { new vm.Script(b); } catch (e) { broke = e.message; } });
    ok('the page script still parses', broke === null, broke);
  }

  server.close();
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
