'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the intro-java Matrixify sheet.
//
//  WHY THIS EXISTS
//  This is the one artifact in the course that nothing downstream can check. A
//  rendered page is checked by smoke/intro-java-content.js; a graded submission
//  is checked by smoke/intro-java-reporter.js. The CSV between them is read only
//  by Matrixify, which reports success on a sheet that silently truncated a body
//  at the first stray quote. By the time anyone notices, ninety pages are live
//  and wrong.
//
//  So the sheet is generated and then PARSED BACK with a real RFC 4180 reader,
//  and every body is compared byte for byte against what the renderer produced.
//  A quoting bug that eats half a lesson fails here rather than on the store.
//
//  It also pins the import settings themselves, because those are the ones that
//  destroy content rather than erroring: MERGE, a past-dated Published At, and a
//  Body HTML cell that is never empty. An empty Body HTML wipes the live page
//  and Matrixify calls it a success.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:ijcsv
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { allPages } = require('../lib/intro-java-build');
const { PUBLISHED_AT, INHERITED, snapshotFor } = require('../scripts/intro-java-pages-csv');

// ── SETUP: the takeover row's rollback snapshot ──────────────────────────────
// The course hub replaces a live page, and the generator refuses to write ANY
// sheet until that page's rollback snapshot is on disk.
//
// The snapshot is now committed, so most of this suite runs against the real
// one. Testing the REFUSAL still needs it gone, so section 6 hides it and puts
// it back. That is the only file operation here that could lose real work, so
// the original bytes are held in memory and restored from an exit handler as
// well as inline: a crashed run must not leave the repo without its only
// rollback path.
const TAKEOVER = [...INHERITED.keys()][0];
const SNAP = snapshotFor(TAKEOVER);
const SNAP_EXISTS = fs.existsSync(SNAP);
const SNAP_BYTES = SNAP_EXISTS ? fs.readFileSync(SNAP) : null;
// Used only when no real snapshot is committed, so the suite still runs on a
// checkout that predates it.
const FAKE_SNAP = '<h1>pretend live body</h1><p>' + 'x'.repeat(900) + '</p>';

function putSnapshot() {
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  fs.writeFileSync(SNAP, SNAP_BYTES === null ? FAKE_SNAP : SNAP_BYTES);
}
function hideSnapshot() {
  try { if (fs.existsSync(SNAP)) fs.rmSync(SNAP); } catch (e) { /* nothing to do */ }
}
function restoreSnapshot() {
  try {
    if (SNAP_BYTES !== null) {
      // Put the committed bytes back exactly, always.
      fs.mkdirSync(path.dirname(SNAP), { recursive: true });
      fs.writeFileSync(SNAP, SNAP_BYTES);
    } else if (fs.existsSync(SNAP) && fs.readFileSync(SNAP, 'utf8') === FAKE_SNAP) {
      // Never leave our fake behind: it would satisfy the guard on a real run
      // with a body nobody could actually roll back to.
      fs.rmSync(SNAP);
    }
  } catch (e) { /* nothing left to do at exit */ }
}
process.on('exit', restoreSnapshot);
process.on('uncaughtException', (e) => { restoreSnapshot(); console.error(e); process.exit(1); });

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

// A real RFC 4180 reader. Deliberately NOT a split on commas: splitting is the
// bug this test exists to catch, so the test cannot be allowed to make it too.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n' || c === '\r') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ij-csv-'));
const out = path.join(tmp, 'pages.csv');
const script = path.join(__dirname, '..', 'scripts', 'intro-java-pages-csv.js');

section('1. The sheet generates at all');
// The rollback path for the one destructive row. Its absence used to be the
// thing asserted here; now that it is committed, what matters is that it is a
// real page body and not a placeholder somebody dropped in to get past the guard.
ok('1.0 the takeover rollback snapshot is committed', SNAP_EXISTS, SNAP);
if (SNAP_EXISTS) {
  const snap = SNAP_BYTES.toString('utf8');
  ok('1.0a it is a substantial page body, not a stub', snap.length > 5000, snap.length);
  ok('1.0b it still holds the project tutorial links that exist nowhere else',
    (snap.match(/youtu/g) || []).length >= 11
    && (snap.match(/drive\.google/g) || []).length >= 7,
    { youtube: (snap.match(/youtu/g) || []).length,
      drive: (snap.match(/drive\.google/g) || []).length });
  ok('1.0c it is one page, with a single h1', (snap.match(/<h1[\s>]/g) || []).length === 1);
}
putSnapshot();
let stdout = '';
try {
  stdout = execFileSync(process.execPath, [script, out], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  ok('1.1 the generator exits clean', true);
} catch (e) {
  ok('1.1 the generator exits clean', false, String(e.stdout || '') + String(e.stderr || ''));
}
ok('1.2 it names the manifest gate that has to flip after the import',
  stdout.includes('INTRO_JAVA_PAGES_LIVE'));
ok('1.3 it prints the import settings rather than assuming they are remembered',
  /MERGE/.test(stdout) && /QUOTE_ALL/.test(stdout) && /utf-8-sig/.test(stdout));

section('2. The file is what Matrixify expects');
const raw = fs.readFileSync(out, 'utf8');
ok('2.1 a BOM is present, which is what utf-8-sig means', raw.charCodeAt(0) === 0xFEFF);
ok('2.2 rows are CRLF terminated', raw.trimStart().includes('\r\n'));

const rows = parseCsv(raw.slice(1));
const header = rows[0];
const body = rows.slice(1).filter((r) => r.length > 1);
ok('2.3 the header names the columns the importer writes',
  header.join('|') === 'Handle|Command|Title|Body HTML|Published|Published At|SEO Title|SEO Description',
  header);
ok('2.4 every row has exactly as many cells as the header',
  body.every((r) => r.length === header.length),
  body.filter((r) => r.length !== header.length).length);

// QUOTE_ALL: no bare cell anywhere, checked on the raw text rather than the
// parse, since the parser is happy either way.
const firstDataLine = raw.slice(1).split('\r\n')[1] || '';
ok('2.5 quoting is QUOTE_ALL, not minimal', firstDataLine.startsWith('"'));

section('3. Every page survived the round trip');
const pages = allPages();
const col = (r, name) => r[header.indexOf(name)];

ok('3.1 one row per page, all ninety', body.length === pages.length, { rows: body.length, pages: pages.length });

const byHandle = new Map(body.map((r) => [col(r, 'Handle'), r]));
ok('3.2 no handle appears twice', byHandle.size === body.length);

const mismatched = [];
for (const p of pages) {
  const r = byHandle.get(p.handle);
  if (!r) { mismatched.push(`${p.handle}: missing from the sheet`); continue; }
  // The check this whole file exists for.
  if (col(r, 'Body HTML') !== p.bodyHtml) mismatched.push(`${p.handle}: body does not survive the round trip`);
  if (col(r, 'Title') !== p.title) mismatched.push(`${p.handle}: title differs`);
  if (col(r, 'SEO Title') !== p.seoTitle) mismatched.push(`${p.handle}: SEO title differs`);
  if (col(r, 'SEO Description') !== p.seoDescription) mismatched.push(`${p.handle}: SEO description differs`);
}
ok('3.3 every body round trips byte for byte', mismatched.length === 0, mismatched.slice(0, 5));

// A body with quotes and newlines in it is the case a naive writer breaks on, so
// prove the sheet actually contains one rather than passing on easy input.
const withQuotes = pages.filter((p) => p.bodyHtml.includes('"') && p.bodyHtml.includes('\n'));
ok('3.4 the round trip was tested on bodies containing quotes and newlines',
  withQuotes.length === pages.length, withQuotes.length);

section('4. The settings that destroy content rather than erroring');
ok('4.1 every row is MERGE, so a re-run repairs a partial import',
  body.every((r) => col(r, 'Command') === 'MERGE'));
ok('4.2 NO row has an empty Body HTML, which would wipe the live page',
  body.every((r) => col(r, 'Body HTML').length > 1000));
ok('4.3 Published At is a fixed past date, never now()',
  body.every((r) => col(r, 'Published At') === PUBLISHED_AT)
  && new Date(PUBLISHED_AT.replace(' ', 'T') + 'Z') < new Date(), PUBLISHED_AT);
ok('4.4 every page is published', body.every((r) => col(r, 'Published') === 'TRUE'));

section('5. The generator refuses rather than shipping a bad sheet');

// Exactly one page is a deliberate takeover of an existing slug. Every OTHER
// collision has to stay fatal, so the victim for this test is picked from the
// pages that are not on that list.
const victim = pages.find((p) => !INHERITED.has(p.handle));
ok('5.0 there is a page that is not an intentional takeover', !!victim);

const livePath = path.join(tmp, 'live.json');
fs.writeFileSync(livePath, JSON.stringify({
  data: { pages: { nodes: [{ handle: victim.handle, title: 'Something Else', body: '<p>live</p>' }] } },
}));
const guarded = path.join(tmp, 'guarded.csv');
let refused = false, reason = '';
try {
  execFileSync(process.execPath, [script, guarded, '--live', livePath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  refused = true;
  reason = String(e.stderr || '');
}
ok('5.1 a handle that already exists live aborts the run', refused, reason.slice(0, 200));
ok('5.2 the abort names the page it would have replaced', reason.includes(victim.handle));
ok('5.3 nothing is written when a check fails', !fs.existsSync(guarded));

section('6. The one intentional takeover');
// The course hub adopts a live slug to inherit its authority. That single row
// replaces a body Shopify keeps no history of, so it carries two extra rules:
// the rollback snapshot must exist first, and it must never be silent.
ok('6.1 exactly one handle is allowed to already exist', INHERITED.size === 1, [...INHERITED.keys()]);
const takeover = TAKEOVER;
ok('6.2 that handle is a page this build actually produces',
  pages.some((p) => p.handle === takeover), takeover);
ok('6.3 it is the course hub, not a lesson or a help page',
  pages.find((p) => p.handle === takeover).kind === 'course-hub');

// Pull the snapshot back out to prove the refusal, then restore it. This is the
// repo's real state: the import cannot run until somebody saves that page.
const snapPath = SNAP;
hideSnapshot();
ok('6.4 with no snapshot on disk the guard is armed', !fs.existsSync(snapPath), snapPath);
const noSnap = path.join(tmp, 'nosnap.csv');
let snapRefused = false, snapReason = '';
try {
  execFileSync(process.execPath, [script, noSnap], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  snapRefused = true;
  snapReason = String(e.stderr || '');
}
ok('6.5 replacing a live page with no rollback path aborts', snapRefused);
ok('6.6 the abort says where to put the snapshot', snapReason.includes('page-snapshots'));
ok('6.7 and says why it matters', /no version history/i.test(snapReason));
ok('6.8 nothing is written', !fs.existsSync(noSnap));

// With the snapshot back the run proceeds, and announces the takeover loudly.
putSnapshot();

const LIVE_TITLE = 'Greenfoot Basics: Java Game Programming - Projects and Tutorials';
const takeoverLive = path.join(tmp, 'live-takeover.json');
fs.writeFileSync(takeoverLive, JSON.stringify({
  data: { pages: { nodes: [{ handle: takeover, title: LIVE_TITLE, body: '<p>live</p>' }] } },
}));

const withSnap = path.join(tmp, 'withsnap.csv');
let takeoverOut = '';
try {
  takeoverOut = execFileSync(process.execPath, [script, withSnap, '--live', takeoverLive],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  ok('6.9 with a snapshot present, the sheet writes', fs.existsSync(withSnap));
} catch (e) {
  ok('6.9 with a snapshot present, the sheet writes', false, String(e.stderr || '').slice(0, 300));
}
ok('6.10 the takeover is announced, never silent', /TAKEOVER/.test(takeoverOut));
ok('6.11 the rename is printed so it cannot happen by accident',
  takeoverOut.includes(LIVE_TITLE) && takeoverOut.includes('Intro to Java with Greenfoot'),
  takeoverOut.slice(0, 300));
ok('6.12 the rollback file is named in the output', takeoverOut.includes('page-snapshots'));

// The committed snapshot must come back byte for byte. This suite briefly
// deletes the repo's only rollback path, so proving it restored it is not
// optional.
restoreSnapshot();
ok('6.13 the committed snapshot is restored byte for byte',
  SNAP_EXISTS ? fs.readFileSync(snapPath).equals(SNAP_BYTES) : !fs.existsSync(snapPath),
  snapPath);

section('7. Selecting part of the course');
putSnapshot();
for (const [kind, expected] of [['hub', 7], ['lesson', 42], ['help', 41]]) {
  const f = path.join(tmp, `${kind}.csv`);
  execFileSync(process.execPath, [script, f, '--kind', kind], { stdio: ['ignore', 'pipe', 'pipe'] });
  const n = parseCsv(fs.readFileSync(f, 'utf8').slice(1)).slice(1).filter((r) => r.length > 1).length;
  ok(`7.x --kind ${kind} writes ${expected} rows`, n === expected, n);
}

restoreSnapshot();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
