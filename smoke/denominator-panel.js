'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the denominators panel and the credential boundary it sits on
//
//  WHY THIS SUITE EXISTS
//  /admin/denominators puts a mutation behind a page for the first time. Every
//  other admin page is a read. The risk that introduces is specific and worth
//  pinning: a page that can WRITE is one convenience away from accepting the
//  session cookie for that write, and the cookie travels on every request from a
//  logged-in operator's browser. That is CSRF, and routes/admin.js closes it by
//  honouring the cookie for GET and HEAD only.
//
//  So the load-bearing assertion here is not that the panel works. It is that
//  the cookie CANNOT adopt a denominator. If someone later "fixes" the panel by
//  relaxing requireAdmin, this suite is what goes red.
//
//  What a wrong denominator costs, which is why the write is guarded at all: the
//  percent is the only thing that reaches the gradebook for these courses, so an
//  authored 4 against a page serving 24 records a perfect paper as 600 percent.
//  Adopting silently regrades a live class.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real admin router mounted in process on an ephemeral port, no
//  network and no live server. tests.yml derives its suite list from
//  package.json, so adding the script there is all the wiring needed.
//
//  ONE ASSERTION IS A SOURCE CHECK AND IS LABELLED AS SUCH. The page gate lives
//  in server.js, which opens a database and binds a port on require, so it is
//  read rather than executed here. That check is weaker than the live ones and
//  the output says so rather than letting it read as equivalent.
//
//  Zero PII: synthetic teacher, class and student; counts only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:denompanel
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

process.env.DB_PATH = path.join(__dirname, 'smoke-denominator-panel.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const ADMIN_KEY = 'smoke-denom-panel-key-0123456789';
process.env.ADMIN_KEY = ADMIN_KEY;

const express = require('express');
const db = require('../db');
const session = require('../lib/admin-session');

const COURSE = 'ap-cybersecurity';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

// A genuinely valid session cookie, signed the way lib/admin-session signs one.
// The point is that it is NOT forged: it verifies, and it must still be refused
// for the write.
function validCookie() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 3600000 })).toString('base64url');
  const mac = crypto.createHmac('sha256', ADMIN_KEY).update(body).digest('base64url');
  return `${session.COOKIE}=${body}.${mac}`;
}

const call = (method, url, opts) => {
  const o = opts || {};
  return fetch(base() + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(o.key ? { 'x-admin-key': o.key } : {}),
      ...(o.cookie ? { Cookie: o.cookie } : {}),
    },
    ...(o.body ? { body: JSON.stringify(o.body) } : {}),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
};

const authored = (lesson, type) => {
  const row = db.prepare(
    'SELECT possible FROM course_denominators WHERE course = ? AND lesson = ? AND activity_type = ?'
  ).get(COURSE, lesson, type);
  return row ? row.possible : null;
};

// -- fixtures ----------------------------------------------------------------
run("INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')");
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode)
     VALUES ('c1','t1','CYBER-DEN','Denom Test',?,1,80,1,'all')`, COURSE);
run("INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')");
run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
     VALUES (?,'unit-1','1.4','exercise-1',25)`, COURSE);

(async () => {
  console.log('\n== the cookie must never authorize the write ==');

  const cookie = validCookie();

  // The cookie is genuinely good: it opens a read. If this fails the rest of the
  // suite proves nothing, because a refused write would just mean a bad cookie.
  let r = await call('GET', `/api/admin/denominators?course=${COURSE}`, { cookie });
  ok('the session cookie DOES authorize the coverage read', r.status === 200, r.status);

  // The assertion this suite exists for.
  r = await call('POST', '/api/admin/denominators/adopt', {
    cookie,
    body: { course: COURSE, values: { '1.4|exercise-1': 24 }, overwrite: true, dry_run: false },
  });
  ok('the same cookie does NOT authorize adopt', r.status === 403, r.status);
  ok('and the refused adopt wrote nothing', authored('1.4', 'exercise-1') === 25, authored('1.4', 'exercise-1'));

  r = await call('POST', '/api/admin/denominators/remove', {
    cookie, body: { course: COURSE, lessons: ['1.4'] },
  });
  ok('the cookie does NOT authorize remove either', r.status === 403, r.status);

  r = await call('POST', '/api/admin/denominators/adopt', {
    body: { course: COURSE, values: { '1.4|exercise-1': 24 }, overwrite: true },
  });
  ok('no credential at all is refused', r.status === 403, r.status);

  console.log('\n== dry_run writes nothing, which is what the Preview button relies on ==');

  r = await call('POST', '/api/admin/denominators/adopt', {
    key: ADMIN_KEY,
    body: { course: COURSE, values: { '1.4|exercise-1': 24 }, overwrite: true, dry_run: true },
  });
  ok('dry run is accepted with the key', r.status === 200, r.status);
  ok('dry run reports it did not apply', r.body && r.body.applied === false, r.body && r.body.applied);
  ok('dry run plans exactly the one column', r.body && r.body.would_write === 1, r.body && r.body.would_write);
  ok('dry run names what it replaces',
     r.body && r.body.planned && r.body.planned[0] && r.body.planned[0].replaces === 25,
     r.body && r.body.planned && r.body.planned[0]);
  ok('dry run left the stored value untouched', authored('1.4', 'exercise-1') === 25, authored('1.4', 'exercise-1'));

  console.log('\n== overwrite is required, or a correction silently does nothing ==');

  r = await call('POST', '/api/admin/denominators/adopt', {
    key: ADMIN_KEY,
    body: { course: COURSE, values: { '1.4|exercise-1': 24 }, dry_run: true },
  });
  ok('without overwrite an authored column is skipped', r.body && r.body.would_write === 0, r.body && r.body.would_write);
  ok('and the skip says why',
     r.body && r.body.skipped && r.body.skipped[0] && r.body.skipped[0].reason === 'already authored',
     r.body && r.body.skipped);

  console.log('\n== the real write ==');

  r = await call('POST', '/api/admin/denominators/adopt', {
    key: ADMIN_KEY,
    body: { course: COURSE, values: { '1.4|exercise-1': 24 }, overwrite: true, dry_run: false },
  });
  ok('adopt with the key succeeds', r.status === 200, r.status);
  ok('and the stored denominator actually moved to 24', authored('1.4', 'exercise-1') === 24, authored('1.4', 'exercise-1'));

  console.log('\n== the page itself ==');

  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'denominators.html'), 'utf8');
  ok('the panel never embeds an admin key',
     html.indexOf(ADMIN_KEY) === -1 && !/ADMIN_KEY\s*=\s*["'][^"']/.test(html));
  ok('the panel sends the key as a header, not a query param',
     html.includes('x-admin-key') && !html.includes('?key='));
  // Scan the SCRIPT, not the file. The first version of this check read the
  // whole document and went red on the header comment promising the key is
  // never written to localStorage: the words appear in prose that exists to say
  // the opposite. A guard that cannot tell code from commentary would have been
  // silenced rather than fixed the day someone did persist it.
  const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [, ''])[1];
  ok('the page has a script to check', script.length > 500, script.length);
  ok('the panel never persists the key',
     !/localStorage|sessionStorage|document\.cookie\s*=/.test(script));
  ok('the panel previews before it can apply',
     html.includes('dry_run') && html.includes('previewedFor'));
  ok('the panel is pure ASCII', !/[^\x00-\x7F]/.test(html));

  console.log('\n== page gate (SOURCE CHECK, not executed: server.js binds a port on require) ==');

  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const route = srv.match(/app\.get\('\/admin\/denominators'[\s\S]{0,320}?\n\}\);/);
  ok('/admin/denominators is registered', !!route);
  ok('it serves login.html without a session',
     !!route && route[0].includes('isAuthed(req)') && route[0].includes('login.html'));
  ok('it serves the panel only with one', !!route && route[0].includes('denominators.html'));

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
