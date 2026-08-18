'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: Canvas course package (.imscc), GET /classes/:code/canvas-course
//
//  What this guards, in order of how badly it hurts a teacher:
//
//   1. A NAME THAT DOES NOT MATCH THE CSV. This is the whole reason the route
//      exists. Canvas matches a gradebook CSV column to an assignment BY NAME.
//      One space of difference and the import creates a second, empty
//      assignment beside the real one, and the teacher gets a gradebook with
//      every column twice and half of them blank. So this suite downloads BOTH
//      files from the same server with the same params and asserts the
//      assignment names and the CSV headers are the same list, in the same
//      order, for both scopes. Nothing else in here matters as much.
//   2. POINTS POSSIBLE THAT DISAGREE. The CSV writes 100 in its Points Possible
//      row. An assignment authored at 10 would silently divide every imported
//      grade by ten.
//   3. A PACKAGE CANVAS CANNOT OPEN. A broken zip, XML that does not parse, an
//      identifierref pointing at no resource, a <file href> naming a file that
//      is not in the archive: each of those is an import that fails after the
//      teacher has already committed to it.
//   4. STUDENT DATA IN A COURSE PACKAGE. The package is built from the course
//      config and nothing else, so it must not contain a student name, a class
//      code or a teacher email. The class in this suite is populated precisely
//      so that assertion has something it could catch.
//
//  Also pins the auth posture (fail closed, another teacher gets a 404) and
//  that the package is reproducible: same request, same bytes.
//
//  Zero PII: synthetic teacher, synthetic students.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:canvascourse
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');
process.env.DB_PATH = path.join(__dirname, 'smoke-canvas-course.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-canvascourse-jwt-0123456789';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { UNIT_POINTS } = require('../lib/export-format');
const { crc32 } = require('../lib/zip');
const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

// ── a zip reader, so the suite opens the archive the way Canvas will ──────────
//  Reads the CENTRAL DIRECTORY rather than scanning local headers, because that
//  is what a real unzip does and it is the half a hand-written writer is most
//  likely to get wrong. Verifies every CRC on the way out.
function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('no end of central directory');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central header at ' + p);
    const method = buf.readUInt16LE(p + 10);
    const crc = buf.readUInt32LE(p + 16);
    const compSize = buf.readUInt32LE(p + 20);
    const rawSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');

    if (buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error('bad local header for ' + name);
    const dataStart = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
    const body = buf.slice(dataStart, dataStart + compSize);
    const data = method === 8 ? zlib.inflateRawSync(body) : body;
    if (data.length !== rawSize) throw new Error('size mismatch for ' + name);
    if (crc32(data) !== crc) throw new Error('CRC mismatch for ' + name);
    if (out.has(name)) throw new Error('duplicate entry ' + name);
    out.set(name, data.toString('utf8'));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ── a well-formedness check, with no dependency and no xmllint ────────────────
//  Not a validator. It answers the one question that breaks an import: do the
//  tags balance, and is every attribute quoted. Comments, declarations, CDATA
//  and self-closing tags are handled; entities are not decoded because nothing
//  here needs them decoded.
function xmlWellFormed(text) {
  const stack = [];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\s*(\/?)\s*([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*"[^"]*")*)\s*(\/?)\s*>/g;
  let m, consumed = 0;
  while ((m = re.exec(text)) !== null) {
    // Anything between tags must be text, never a stray '<'.
    if (text.slice(consumed, m.index).includes('<')) return `stray < before offset ${m.index}`;
    consumed = m.index + m[0].length;
    if (m[2] === undefined) continue;              // comment, declaration or CDATA
    if (m[1] === '/') {
      if (stack.pop() !== m[2]) return `close ${m[2]} does not match at offset ${m.index}`;
    } else if (m[4] !== '/') {
      stack.push(m[2]);
    }
  }
  if (text.slice(consumed).includes('<')) return 'stray < after the last tag';
  return stack.length ? `unclosed ${stack.join(',')}` : null;
}

const attrs = (xml, tag, attr) => {
  const out = [];
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
};
const tagValues = (xml, tag) => {
  const out = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
};

function splitCsv(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// Identity block plus the five derived summary columns. Everything after them
// is an assignment column. Same rule as smoke/canvas-export.js.
const SUMMARY = ['Letter Grade', '%', 'Total Earned', 'Total Graded', 'Total Possible'];
const FIRST_COL = 5 + SUMMARY.length;
const EM_DASH = String.fromCharCode(0x2014);

// Module titles only. tagValues(meta,'title') also picks up every ITEM title,
// which is how the first version of this suite compared four module names
// against "1.1 Coding Exercise: Step Tracker".
const moduleTitles = (metaXml) => (metaXml.match(/<module\b[\s\S]*?<items>/g) || [])
  .map((block) => (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);

// Assignment names in the order Canvas will create them.
const namesFrom = (files) => [...files]
  .filter(([n]) => n.endsWith('/assignment_settings.xml'))
  .map(([, t]) => ({ pos: Number(tagValues(t, 'position')[0]), name: tagValues(t, 'title')[0] }))
  .sort((a, b) => a.pos - b.pos)
  .map((a) => a.name);

(async () => {
  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });

  const mk = async (email) => {
    const reg = await fetch(base + '/api/teacher/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'coursepass1', name: 'Course Teacher' }),
    });
    return (await reg.json()).token;
  };
  const token = await mk('course@school.org');
  const auth = { Authorization: 'Bearer ' + token };
  const otherToken = await mk('other@school.org');
  const teacherId = db.prepare('SELECT id FROM teachers WHERE email = ?').get('course@school.org').id;

  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
       VALUES ('c1','CSA-PKG1','Period 4','ap-csa',?,1,80)`, teacherId);
  // Real students with real-looking refs, so the zero PII assertion below has
  // something it could actually catch.
  run(`INSERT INTO students (id,class_id,display_name,student_ref,pin_hash) VALUES
    ('s1','c1','Jane Doe','jane.doe@sfcakings.org','x'),
    ('s2','c1','Ana Ruiz','100482','x')`);
  run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score)
       VALUES ('p1','s1','c1','ap-csa','unit-1','1.1','quiz',1,90)`);

  const getPkg = async (qs) => {
    const r = await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course' + (qs || ''), { headers: auth });
    return { status: r.status, headers: r.headers, buf: Buffer.from(await r.arrayBuffer()) };
  };
  const csvRows = async (qs) => {
    const r = await fetch(base + '/api/teacher/classes/CSA-PKG1/export' + qs, { headers: auth });
    return (await r.text()).split('\r\n').map(splitCsv);
  };

  console.log('\nCANVAS COURSE PACKAGE\n');

  // ── 1. It is a real zip ─────────────────────────────────────────────────────
  console.log('1. The archive');
  const unitRes = await getPkg('?scope=unit');
  ok('  returns 200', unitRes.status === 200, unitRes.status);
  ok('  content type is application/zip',
    (unitRes.headers.get('content-type') || '').includes('application/zip'),
    unitRes.headers.get('content-type'));
  ok('  is served as a download named .imscc, which is what Canvas accepts',
    /attachment; filename="[^"]+\.imscc"/.test(unitRes.headers.get('content-disposition') || ''),
    unitRes.headers.get('content-disposition'));
  ok('  begins with the zip local header magic',
    unitRes.buf.slice(0, 4).toString('hex') === '504b0304', unitRes.buf.slice(0, 4).toString('hex'));

  let unitFiles = null;
  try { unitFiles = unzip(unitRes.buf); } catch (e) { ok('  central directory reads, every CRC checks out', false, e.message); }
  if (!unitFiles) { console.log('\n' + fail + ' FAILED, ' + pass + ' passed'); process.exit(1); }
  ok('  central directory reads, every CRC checks out', true);
  ok('  carries imsmanifest.xml at the archive root', unitFiles.has('imsmanifest.xml'));
  ok('  carries the canvas_export.txt marker, which is what makes Canvas read course_settings/',
    unitFiles.has('course_settings/canvas_export.txt'));
  for (const f of ['course_settings.xml', 'module_meta.xml', 'assignment_groups.xml']) {
    ok(`  carries course_settings/${f}`, unitFiles.has('course_settings/' + f));
  }

  // ── 2. Every XML file parses ────────────────────────────────────────────────
  console.log('\n2. The XML');
  const badXml = [];
  for (const [name, text] of unitFiles) {
    if (!name.endsWith('.xml')) continue;
    const err = xmlWellFormed(text);
    if (err) badXml.push([name, err]);
  }
  ok('  every .xml file is well formed', badXml.length === 0, badXml.slice(0, 3));
  ok('  every .xml file declares UTF-8',
    [...unitFiles].filter(([n]) => n.endsWith('.xml'))
      .every(([, t]) => t.startsWith('<?xml version="1.0" encoding="UTF-8"?>')));

  // ── 3. Nothing in the manifest points at nothing ────────────────────────────
  console.log('\n3. Internal references resolve');
  const manifest = unitFiles.get('imsmanifest.xml');
  const resourceIds = new Set(attrs(manifest, 'resource', 'identifier'));
  const refs = attrs(manifest, 'item', 'identifierref');
  ok('  the manifest declares resources', resourceIds.size > 0, resourceIds.size);
  ok('  every organization identifierref resolves to a resource',
    refs.length > 0 && refs.every((r) => resourceIds.has(r)),
    refs.filter((r) => !resourceIds.has(r)).slice(0, 3));
  const hrefs = attrs(manifest, 'file', 'href');
  ok('  every <file href> names a file that is actually in the archive',
    hrefs.every((h) => unitFiles.has(h)), hrefs.filter((h) => !unitFiles.has(h)).slice(0, 3));
  const meta = unitFiles.get('course_settings/module_meta.xml');
  const metaRefs = tagValues(meta, 'identifierref');
  ok('  every module_meta identifierref resolves to a resource',
    metaRefs.length > 0 && metaRefs.every((r) => resourceIds.has(r)),
    metaRefs.filter((r) => !resourceIds.has(r)).slice(0, 3));
  const groupIds = new Set(attrs(unitFiles.get('course_settings/assignment_groups.xml'), 'assignmentGroup', 'identifier'));
  const settingsFiles = [...unitFiles].filter(([n]) => n.endsWith('/assignment_settings.xml'));
  ok('  every assignment points at an assignment group that exists',
    settingsFiles.length > 0
      && settingsFiles.every(([, t]) => groupIds.has(tagValues(t, 'assignment_group_identifierref')[0])));

  // ── 4. THE INVARIANT: the package and the CSV agree, name for name ──────────
  console.log('\n4. Assignment names match the gradebook CSV, exactly');
  for (const scope of ['unit', 'activity']) {
    const files = unzip((await getPkg('?scope=' + scope)).buf);
    const names = namesFrom(files);
    const rows = await csvRows(`?format=canvas&scope=${scope}`);
    const cols = rows[0].slice(FIRST_COL);
    ok(`  scope=${scope}: the CSV emits columns`, cols.length > 0, cols.length);
    ok(`  scope=${scope}: one assignment per gradebook column, same count`,
      names.length === cols.length, { assignments: names.length, columns: cols.length });
    ok(`  scope=${scope}: the names are identical, in the same order`,
      names.join(' ') === cols.join(' '),
      { onlyInPackage: names.filter((n) => !cols.includes(n)).slice(0, 3),
        onlyInCsv: cols.filter((c) => !names.includes(c)).slice(0, 3) });
    ok(`  scope=${scope}: no assignment name repeats, so no column can overwrite another`,
      new Set(names).size === names.length);

    // The derived columns must NOT become assignments. The CSV marks them
    // "(read only)" and Canvas ignores them; an assignment named "%" would be
    // five junk columns in a real gradebook.
    ok(`  scope=${scope}: the summary columns are not assignments`,
      SUMMARY.every((h) => !names.includes(h)));

    const csvPoints = new Set(rows[1].slice(FIRST_COL));
    const xmlPoints = new Set([...files]
      .filter(([n]) => n.endsWith('/assignment_settings.xml'))
      .map(([, t]) => tagValues(t, 'points_possible')[0]));
    ok(`  scope=${scope}: points possible agree with the CSV Points Possible row`,
      csvPoints.size === 1 && xmlPoints.size === 1
        && Number([...xmlPoints][0]) === Number([...csvPoints][0])
        && Number([...csvPoints][0]) === UNIT_POINTS,
      { csv: [...csvPoints], xml: [...xmlPoints] });
  }

  // ── 5. It is the whole course, not a gradebook skeleton ────────────────────
  console.log('\n5. The course itself');
  const actFiles = unzip((await getPkg('?scope=activity')).buf);
  const modTitles = moduleTitles(meta);
  ok('  one module per unit, all four AP CSA units, Unit 1 first',
    modTitles.length === 4
      && modTitles[0].startsWith('Unit 1') && modTitles[3] === 'Unit 4: Data Collections',
    modTitles);
  const links = [...unitFiles].filter(([n, t]) => n.endsWith('.xml') && t.includes('<webLink'));
  ok('  every one of the 53 lessons has a link out to its live page',
    links.filter(([, t]) => /pages\/ap-csa-lesson-\d+-\d+-[^"]*"/.test(t) && !/-exercise-1"/.test(t)).length === 53,
    links.length);
  ok('  and every lesson has a link to its coding exercise page',
    links.filter(([, t]) => /-exercise-1"/.test(t)).length === 53);
  const urls = [];
  for (const [, t] of links) urls.push(...attrs(t, 'url', 'href'));
  ok('  every link is https and lands on the storefront',
    urls.length > 0 && urls.every((u) => u.startsWith('https://apcsexamprep.com/pages/')),
    urls.filter((u) => !u.startsWith('https://apcsexamprep.com/pages/')).slice(0, 3));
  ok('  a lesson link opens in a new tab, so Canvas is not replaced by the storefront',
    tagValues(meta, 'new_tab').includes('true'));
  ok('  every assignment description links to the page that produces its grade',
    [...actFiles].filter(([n]) => n.endsWith('.html')).every(([, t]) => t.includes('apcsexamprep.com/pages/')));
  ok('  assignments take no submission, because the work is graded on the site',
    settingsFiles.length > 0 && [...actFiles].filter(([n]) => n.endsWith('/assignment_settings.xml'))
      .every(([, t]) => tagValues(t, 'submission_types')[0] === 'none'));
  ok('  assignments import published, so a grade has somewhere to land immediately',
    [...actFiles].filter(([n]) => n.endsWith('/assignment_settings.xml'))
      .every(([, t]) => tagValues(t, 'workflow_state')[0] === 'published'));
  ok('  no assignment carries a due date, which is per class and per year',
    [...actFiles].filter(([n]) => n.endsWith('/assignment_settings.xml'))
      .every(([, t]) => /<due_at\/>/.test(t)));

  // ── 6. Zero PII, and reproducible ──────────────────────────────────────────
  console.log('\n6. Zero PII and reproducible');
  const all = [...unitFiles.values()].join('\n') + [...actFiles.values()].join('\n');
  for (const secret of ['Jane Doe', 'Ana Ruiz', 'jane.doe@sfcakings.org', '100482',
    'course@school.org', 'CSA-PKG1', 'Period 4']) {
    ok(`  the package does not contain ${JSON.stringify(secret)}`, !all.includes(secret));
  }
  const again = await getPkg('?scope=unit');
  ok('  the same request returns byte identical bytes',
    crypto.createHash('md5').update(again.buf).digest('hex')
      === crypto.createHash('md5').update(unitRes.buf).digest('hex'));
  ok('  no em-dash anywhere in the package, per repo convention', !all.includes(EM_DASH));

  // ── 7. Filters mean what they mean on /export ──────────────────────────────
  console.log('\n7. Filters');
  const u1 = unzip((await getPkg('?scope=activity&units=unit-1')).buf);
  ok('  units=unit-1 builds one module',
    attrs(u1.get('course_settings/module_meta.xml'), 'module', 'identifier').length === 1);
  const u1Names = namesFrom(u1);
  ok('  and only Unit 1 assignments',
    u1Names.length > 0 && u1Names.every((n) => /^AP CSA 1\./.test(n)),
    u1Names.filter((n) => !/^AP CSA 1\./.test(n)).slice(0, 3));
  ok('  and it agrees with the filtered CSV, name for name',
    u1Names.join(' ') === (await csvRows('?format=canvas&scope=activity&units=unit-1'))[0].slice(FIRST_COL).join(' '));
  // include=quiz drops the lesson and exercise columns. It does NOT drop cfu:
  // that activity is unmapped in ACTIVITY_BUCKETS and therefore always counts,
  // exactly as it does in the CSV. What matters is that the two files make the
  // SAME call, which is what this asserts rather than a shape guess.
  const quizOnly = namesFrom(unzip((await getPkg('?scope=activity&include=quiz')).buf));
  ok('  include=quiz drops every lesson and exercise assignment',
    quizOnly.length > 0 && !quizOnly.some((n) => / (Lesson|Exercise \d)$/.test(n)),
    quizOnly.filter((n) => / (Lesson|Exercise \d)$/.test(n)).slice(0, 3));
  ok('  and the filtered package still matches the filtered CSV, name for name',
    quizOnly.join(' ') === (await csvRows('?format=canvas&scope=activity&include=quiz'))[0].slice(FIRST_COL).join(' '));

  // ── 8. Fail closed ─────────────────────────────────────────────────────────
  console.log('\n8. It fails closed and it refuses typos');
  const noAuth = await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course');
  ok('  no token is refused', noAuth.status === 401, noAuth.status);
  const wrongTeacher = await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course',
    { headers: { Authorization: 'Bearer ' + otherToken } });
  ok('  another teacher cannot download this course package', wrongTeacher.status === 404, wrongTeacher.status);
  const badScope = await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course?scope=lesson', { headers: auth });
  ok('  an unknown scope is refused', badScope.status === 400, badScope.status);
  const badUnit = await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course?units=unit-9', { headers: auth });
  ok('  an unknown unit is refused rather than silently packaging less', badUnit.status === 400, badUnit.status);
  const badInclude = await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course?include=quizzes', { headers: auth });
  ok('  an unknown include value is refused', badInclude.status === 400, badInclude.status);

  // A solo grouping is not a curriculum, so there is no course to package.
  run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold)
       VALUES ('c2','ME-SOLO1','Solo','solo',?,1,80)`, teacherId);
  const solo = await fetch(base + '/api/teacher/classes/ME-SOLO1/canvas-course', { headers: auth });
  ok('  a class with no curriculum says so instead of shipping an empty cartridge', solo.status === 400, solo.status);

  // ── 9. Preflight ───────────────────────────────────────────────────────────
  console.log('\n9. Preflight');
  const pre = await (await fetch(base + '/api/teacher/classes/CSA-PKG1/canvas-course?scope=unit&preflight=1',
    { headers: auth })).json();
  ok('  preflight returns JSON, not a zip', pre && pre.scope === 'unit', pre && pre.scope);
  ok('  and reports the same assignment count the package holds',
    pre.assignment_count === namesFrom(unitFiles).length,
    { preflight: pre.assignment_count, package: namesFrom(unitFiles).length });
  ok('  and the same modules, in the same order',
    pre.modules.map((m) => m.title).join('|') === modTitles.join('|'),
    { preflight: pre.modules.map((m) => m.title), package: modTitles });
  ok('  and says the course links resolved, so a structure-only package is visible',
    pre.linked === true, pre.linked);

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
