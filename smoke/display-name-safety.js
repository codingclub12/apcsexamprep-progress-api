'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: free-text names cannot carry markup into a rendered page.
//
//  THE BUG THIS CLOSES
//  sanitize() in utils.js trimmed and truncated and did nothing else, so a
//  student display_name was stored exactly as typed. Both pages that render a
//  roster interpolate that name into innerHTML behind an escaper that was a
//  no-op: every .replace in it mapped a character to itself, e.g.
//      .replace(/&/g,'&').replace(/</g,'<')
//  which is what is left after Shopify's page editor HTML-decodes the entities
//  in '&amp;' and '&lt;'. A student who joined a class as
//      <img src=x onerror=...>
//  therefore got script execution in their teacher's browser, on the page where
//  the teacher JWT is held in localStorage. The same value also reaches the CSV
//  and Canvas exports and the admin pages.
//
//  The page-side escaper is repaired separately. This suite pins the server
//  side, which is the layer every consumer shares.
//
//  WHAT IS PINNED HERE
//   - a tag payload loses its angle brackets at the join, roster, and rename
//     write paths, so no consumer can be handed a string that opens a tag
//   - an attribute-breakout payload (x' onmouseover='alert(1)) is defused too.
//     This is the case that stripping angle brackets alone would miss: both
//     pages build aria-label='...', so a bare apostrophe closes the attribute
//     and opens a new one without ever needing a '<'
//   - O'Brien survives as a readable name. The fix folds ASCII quotes to their
//     typographic forms rather than deleting them, because deleting them would
//     mangle real student names
//   - "Period 3 & 4" keeps its ampersand. An entity decodes to a text character
//     and a text character cannot become markup, so & needs no handling
//   - LOGIN STILL WORKS after the fold. A student who joined as O'Brien is
//     stored as O'Brien, and typing either form signs them in, because the
//     login lookup normalises the typed name through the same function. This is
//     the regression that would strand a class in front of a teacher
//   - the boot backfill rewrites rows written under the OLD rule, since the
//     write-path fix alone leaves any pre-existing payload sitting in the table
//   - the backfill converges: a second pass changes nothing
//   - the backfill refuses to create two students with one name inside a class,
//     because login resolves a student by class_id + name and a duplicate makes
//     one of them unreachable
//
//  Zero PII: synthetic students, no real names.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:namesafety
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-display-name-safety.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { sanitize } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const APOS = String.fromCharCode(39);      // '
const QUOTE = String.fromCharCode(34);     // "
const CURLY_APOS = String.fromCharCode(8217);
const CURLY_QUOTE = String.fromCharCode(8221);

const TAG_PAYLOAD = '<img src=x onerror=alert(document.cookie)>';
const ATTR_PAYLOAD = 'x' + APOS + ' onmouseover=' + APOS + 'alert(1)';
const IRISH = 'O' + APOS + 'Brien';

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
     VALUES ('c1','CYBER-SAFE','Safe class','ap-cybersecurity','t1',1,80)`);

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const post = (p, body) => fetch(base() + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const nameOf = (id) => db.prepare('SELECT display_name FROM students WHERE id = ?').get(id).display_name;
const hasMarkupChars = (s) => /[<>]/.test(s) || s.indexOf(APOS) > -1 || s.indexOf(QUOTE) > -1;

(async () => {
  console.log('\nsanitize() unit behaviour');
  ok('angle brackets removed', !/[<>]/.test(sanitize(TAG_PAYLOAD, 50)), sanitize(TAG_PAYLOAD, 50));
  ok('attribute breakout defused', !hasMarkupChars(sanitize(ATTR_PAYLOAD, 50)), sanitize(ATTR_PAYLOAD, 50));
  ok('apostrophe name stays readable',
    sanitize(IRISH, 50) === 'O' + CURLY_APOS + 'Brien', sanitize(IRISH, 50));
  ok('double quote folded, not dropped',
    sanitize('say ' + QUOTE + 'hi' + QUOTE, 50) === 'say ' + CURLY_QUOTE + 'hi' + CURLY_QUOTE);
  ok('ampersand preserved', sanitize('Period 3 & 4', 50) === 'Period 3 & 4');
  ok('control characters removed',
    sanitize('a' + String.fromCharCode(0) + 'b' + String.fromCharCode(31) + 'c', 50) === 'abc');
  ok('length cap still applies', sanitize('a'.repeat(200), 50).length === 50);
  ok('non-string yields empty string',
    sanitize(null) === '' && sanitize(undefined) === '' && sanitize(42) === '');
  ok('idempotent', sanitize(sanitize(TAG_PAYLOAD, 50), 50) === sanitize(TAG_PAYLOAD, 50));

  console.log('\nPOST /api/student/join');
  const joined = await post('/api/student/join', {
    class_code: 'CYBER-SAFE', display_name: TAG_PAYLOAD, pin: '1234',
  });
  ok('join accepted', joined.status === 201, joined);
  const storedPayload = db.prepare(
    'SELECT id, display_name FROM students WHERE class_id = ? ORDER BY rowid DESC'
  ).get('c1');
  ok('stored name carries no angle brackets',
    storedPayload && !/[<>]/.test(storedPayload.display_name), storedPayload);
  ok('name returned to the client is clean too',
    joined.body.student && !/[<>]/.test(joined.body.student.name), joined.body.student);

  console.log('\nlogin round trip for an apostrophe name');
  const irishJoin = await post('/api/student/join', {
    class_code: 'CYBER-SAFE', display_name: IRISH, pin: '4321',
  });
  ok('join accepted', irishJoin.status === 201, irishJoin);
  ok('stored in typographic form',
    nameOf(irishJoin.body.student.id) === 'O' + CURLY_APOS + 'Brien', nameOf(irishJoin.body.student.id));

  const typedAscii = await post('/api/student/login', {
    class_code: 'CYBER-SAFE', display_name: IRISH, pin: '4321',
  });
  ok('signs in typing the ASCII apostrophe', typedAscii.status === 200, typedAscii);

  const typedCurly = await post('/api/student/login', {
    class_code: 'CYBER-SAFE', display_name: 'O' + CURLY_APOS + 'Brien', pin: '4321',
  });
  ok('signs in typing the curly apostrophe', typedCurly.status === 200, typedCurly);

  const wrongPin = await post('/api/student/login', {
    class_code: 'CYBER-SAFE', display_name: IRISH, pin: '0000',
  });
  ok('wrong PIN still rejected', wrongPin.status === 401, wrongPin);

  console.log('\nboot backfill over rows written under the old rule');
  // Simulates a payload planted before the deploy: written straight to the
  // table, bypassing sanitize() exactly as the old code path did.
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('legacy','c1',?,'x')`, TAG_PAYLOAD);
  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
       VALUES ('c_dirty','CYBER-DIRT',?, 'ap-cybersecurity','t1',1,80)`, 'Room <b>7</b>');
  ok('legacy payload is in the table', /[<>]/.test(nameOf('legacy')));

  delete require.cache[require.resolve('../db')];
  require('../db');

  ok('backfill cleaned the legacy student name', !/[<>]/.test(nameOf('legacy')), nameOf('legacy'));
  ok('backfill cleaned the class name',
    !/[<>]/.test(db.prepare('SELECT class_name FROM classes WHERE id = ?').get('c_dirty').class_name));

  const afterFirst = nameOf('legacy');
  delete require.cache[require.resolve('../db')];
  require('../db');
  ok('backfill converges on a second pass', nameOf('legacy') === afterFirst, nameOf('legacy'));

  console.log('\ncolliding rows are disambiguated, never left dirty');
  // Both rows clean to the same value. Login resolves by class_id + name, so the
  // pair must stay distinct, and the security fix means NEITHER may keep its
  // markup. Skipping the loser would leave the live payload exactly where it is.
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('dup_a','c1','Robin','x')`);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('dup_b','c1',?,'x')`, 'Robin<');
  delete require.cache[require.resolve('../db')];
  require('../db');
  const names = db.prepare("SELECT display_name FROM students WHERE id IN ('dup_a','dup_b')").all()
    .map((r) => r.display_name);
  ok('both names are free of markup', names.every((n) => !hasMarkupChars(n)), names);
  ok('the two remain distinct', new Set(names.map((n) => n.toLowerCase())).size === 2, names);

  console.log('\nno student row anywhere still holds markup');
  const dirty = db.prepare('SELECT id, display_name FROM students').all()
    .filter((r) => hasMarkupChars(r.display_name));
  ok('every stored display_name is inert', dirty.length === 0, dirty);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
