'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the fabricated-zero admin routes.
//
//  smoke/clear-cyber-zeros.js proves the OPERATION is right. This proves the
//  DOORS are, because the operation edits grades and the doors are the only
//  thing deciding who may open it.
//
//  The rules being pinned, all of them already the posture of routes/admin.js:
//    - GET is read only, so the dashboard cookie is enough and a human can look
//      before anything is written
//    - POST is a mutation, so it needs the x-admin-key HEADER; a cookie must
//      never authorize it (that is the CSRF closure on this router)
//    - POST without {confirm: true} returns the dry run and writes nothing, so
//      a stray call out of a shell history cannot regrade a class
//    - no key at all is a 403 on both
//
//  Modelled on smoke/admin-code-tests.js, which mounts the real router over
//  real HTTP rather than testing the handler in isolation. Auth middleware that
//  is bypassed in the test is auth middleware that is not tested.
//
//  Zero PII: synthetic students. No em-dashes, per convention.
//
//  Run: npm run smoke:cyberzeros
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

const DB = path.join(__dirname, 'smoke-admin-cyber-zeros.db');
for (const f of [DB, DB + '-wal', DB + '-shm']) { try { fs.unlinkSync(f); } catch (e) {} }
process.env.DB_PATH = DB;
process.env.ADMIN_KEY = 'smoke-admin-key-01234567890-abcdef';

const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const adminSession = require('../lib/admin-session');
const { LESSON_SCORE_ITEM } = require('../scoring');

// A REAL session cookie, minted the same way lib/admin-session signs one. A
// bogus cookie would be refused for being bogus, which proves nothing about
// whether a legitimately signed-in operator can write. This one is genuinely
// valid: adminSession.verify accepts it.
function validSessionCookie() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 3600e3 })).toString('base64url');
  const mac = crypto.createHmac('sha256', process.env.ADMIN_KEY).update(body).digest('base64url');
  return `${adminSession.COOKIE}=${body}.${mac}`;
}

const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const BEFORE = '2026-08-20T10:00:00Z';
db.prepare("INSERT INTO teachers (id,email,password_hash,name) VALUES ('t1','t@smoke.test','x','T')").run();
db.prepare("INSERT INTO classes (id,teacher_id,class_code,class_name,course) VALUES ('C1','t1','CYBER-SMOKE','S','ap-cybersecurity')").run();
db.prepare("INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','C1','s1','x')").run();
db.prepare(`INSERT INTO progress
  (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,attempts,locked,completed_at,updated_at)
  VALUES ('p1','s1','C1','ap-cybersecurity','unit-1','1.3','exercise-1',1,0,1,0,?,?)`).run(BEFORE, BEFORE);
db.prepare(`INSERT INTO score_events
  (student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,created_at)
  VALUES ('s1','C1','ap-cybersecurity','unit-1','1.3','exercise-1',?,0,100,?)`).run(LESSON_SCORE_ITEM, BEFORE);

const scoreOf = () => db.prepare("SELECT score, score_reset_at FROM progress WHERE id = 'p1'").get();

(async () => {
  const base = await new Promise((r) => {
    const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port));
  });
  const KEY = process.env.ADMIN_KEY;
  const call = async (method, url, opts) => {
    const o = opts || {};
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(o.headers || {}) },
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch (e) {}
    return { status: res.status, json };
  };

  console.log('the dry run');
  {
    const r = await call('GET', '/api/admin/cyber-zeros', { headers: { 'x-admin-key': KEY } });
    ok('GET reports the plan', r.status === 200 && r.json.found === 1 && r.json.would_reset === 1, r.json);
    ok('GET does not write', scoreOf().score === 0 && !scoreOf().score_reset_at);
    ok('GET names the affected column',
      r.json && r.json.by_column && r.json.by_column['1.3|exercise-1'] === 1, r.json && r.json.by_column);
  }

  console.log('the doors');
  {
    const r = await call('GET', '/api/admin/cyber-zeros');
    ok('GET with no credential is refused', r.status === 403, r.status);
  }
  {
    const r = await call('POST', '/api/admin/cyber-zeros/clear', { body: { confirm: true } });
    ok('POST with no credential is refused', r.status === 403, r.status);
    ok('the refused POST wrote nothing', scoreOf().score === 0);
  }
  {
    // A cookie authorizes reads on this router and must never authorize a
    // write. This is a genuinely valid, unexpired, correctly signed cookie.
    const cookie = validSessionCookie();
    ok('the forged cookie really is valid',
      !!adminSession.verify(cookie.split('=').slice(1).join('=')));
    const readOk = await call('GET', '/api/admin/cyber-zeros', { headers: { cookie } });
    ok('a valid cookie CAN read', readOk.status === 200, readOk.status);
    const r = await call('POST', '/api/admin/cyber-zeros/clear', {
      headers: { cookie }, body: { confirm: true },
    });
    ok('a valid cookie CANNOT write', r.status === 403, r.status);
    ok('the cookie POST wrote nothing', scoreOf().score === 0 && !scoreOf().score_reset_at);
  }

  console.log('confirm is required');
  {
    const r = await call('POST', '/api/admin/cyber-zeros/clear', { headers: { 'x-admin-key': KEY }, body: {} });
    ok('POST without confirm is a 400 carrying the dry run',
      r.status === 400 && r.json.plan && r.json.plan.would_reset === 1, r.json);
    ok('the unconfirmed POST wrote nothing', scoreOf().score === 0 && !scoreOf().score_reset_at);
  }

  console.log('the write');
  {
    const r = await call('POST', '/api/admin/cyber-zeros/clear', {
      headers: { 'x-admin-key': KEY }, body: { confirm: true },
    });
    ok('POST with the header key and confirm applies', r.status === 200 && r.json.applied === true, r.json);
    const p = scoreOf();
    ok('the fabricated zero is cleared', p.score === null && !!p.score_reset_at, p);
    ok('the ledger row survives',
      db.prepare('SELECT COUNT(*) c FROM score_events').get().c === 1);
  }
  {
    const r = await call('POST', '/api/admin/cyber-zeros/clear', {
      headers: { 'x-admin-key': KEY }, body: { confirm: true },
    });
    ok('a second apply resets nothing', r.status === 200 && r.json.would_reset === 0, r.json);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
