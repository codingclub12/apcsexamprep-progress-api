'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: the redirects sheet for the empty course-head pages.
//
//  A redirects CSV is three columns and looks too small to get wrong, which is
//  exactly why it is worth a suite. Everything that can go wrong with one is
//  INVISIBLE at import time: Matrixify accepts a redirect to a 404, a redirect
//  onto a second empty page, a chain, and a redirect on a path that still
//  resolves, and reports all four as rows created.
//
//  So the assertions here are about the cases that would otherwise ship
//  silently, not about the happy path. Section 2 is the one that earns its
//  keep: it puts fabricated evidence through the same `check()` the generator
//  uses and requires a refusal, one hazard at a time.
//
//  Offline. Fixtures only, so this runs in CI with no network and no secrets.
//
//  Run: npm run smoke:emptyredirects
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const G = require('../scripts/empty-page-redirects-csv');
const { extract } = require('../scripts/extract-live-body');

let pass = 0; let fail = 0;
const ok = (n, c, x) => {
  if (c) { pass += 1; console.log('  [PASS] ' + n); }
  else { fail += 1; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const DIR = path.join(__dirname, 'fixtures', 'empty-page-redirects');
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');

const evidence = G.readEvidence(path.join(DIR, 'evidence.jsonl'));
const verified = JSON.parse(read('verification.json'));
const NOW = Date.parse(verified.at) + 60000;          // one minute after the pass

console.log('\n1. THE SHELL IS REAL, READ OFF THE LIVE PAGE');
{
  //  The <main> of /pages/ap-csa exactly as the storefront served it. The point
  //  of keeping the real bytes is that a synthetic fixture proves the test and
  //  not the store.
  const shell = read('ap-csa-main.html');
  const body = extract(shell);
  ok('the rte wrapper on /pages/ap-csa bounds an EMPTY body', body.length === 0, body.length);

  //  1448 is the number the board carried, and it is reproduced here by
  //  stripping tags and unescaping entities rather than by trusting it.
  const txt = shell.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (m, d) => String.fromCodePoint(parseInt(d, 16)))
    .replace(/\s+/g, ' ').trim();
  //  CODE POINTS, not UTF-16 units, and the two are not the same here. This
  //  assertion first read 1450 because the widget carries two astral emoji, a
  //  school and a book, each of which is one character to Python's html module
  //  and two to JavaScript's String#length. 1448 is what the board carried and
  //  what tools/empty-page/rederive.py measures, so the JS side counts the same
  //  thing rather than the number being adjusted to fit.
  ok('its rendered main text is the documented 1448 characters',
    [...txt].length === 1448, { codePoints: [...txt].length, utf16: txt.length });
  ok('and every one of them is the title plus the global contact widget',
    txt.startsWith('AP CSA Get in Touch Whether you'), txt.slice(0, 40));

  //  A page that renders 354 KB and stores nothing is the entire defect, and it
  //  is why rendered size can never be the measurement.
  const ev = evidence.get('ap-csa');
  ok('the same page renders over 300 KB of theme', ev.rendered > 300000, ev.rendered);

  //  ── THE TWO CONTROLS, AND THEY ARE THE POINT ──────────────────────────────
  //  Both of these would be called EMPTY by any measure of authored text or of
  //  rendered main text, and both are working pages. They are real rows from the
  //  same sweep, so the threshold is being tested against the store rather than
  //  against a story about the store.
  const tb = evidence.get('ap-csp-test-builder');
  ok('ap-csp-test-builder measures ZERO authored text', tb.text_chars === 0, tb.text_chars);
  ok('and renders within 120 characters of the empty shell',
    Math.abs(tb.main_text_chars - 1448) < 120, tb.main_text_chars);
  ok('and is a 496 KB application, so neither measure may be the threshold',
    tb.stored_chars > 400000, tb.stored_chars);

  const je = evidence.get('java-editor-test');
  ok('java-editor-test also measures zero authored text', je.text_chars === 0, je.text_chars);
  ok('and stores a 497 character Java editor mount, so it is not empty either',
    je.stored_chars === 497, je.stored_chars);

  //  A page on a template with no rte wrapper is UNRESOLVED, never empty.
  //  Calling it empty is the failure this repo keeps repeating.
  const emb = evidence.get('java-sandbox-embed');
  ok('java-sandbox-embed is reported unresolved rather than empty',
    emb.outcome === 'template' && emb.stored_chars === undefined, emb.outcome);

  //  The seven, by the only threshold that survives those controls.
  const seven = [...evidence.values()].filter((r) => r.outcome === 'stored' && r.stored_chars === 0);
  ok('exactly the seven measured empties are in the fixture', seven.length === 7, seven.map((r) => r.handle));
}

console.log('\n2. THE REFUSALS, ONE HAZARD AT A TIME');
{
  const base = G.check(G.PROPOSALS, evidence, verified, NOW);
  ok('the real proposal set verifies clean', base.problems.length === 0, base.problems);
  ok('and produces exactly the two rows in the delivered sheet',
    base.rows.length === 2 && base.rows[0].path === '/pages/ap-csa'
      && base.rows[1].path === '/pages/ap-csp', base.rows.map((r) => r.path));

  //  The contract is "any problem at all means no file is written", so a
  //  refusal is proved by the NAMED problem appearing. Asserting on the named
  //  string rather than on problems.length is what stops one guard's message
  //  from standing in for another's.
  const refuses = (name, proposals, ev, ver, now, needle) => {
    const r = G.check(proposals, ev || evidence, ver || verified, now || NOW);
    ok(name, r.problems.some((p) => p.includes(needle)), r.problems);
  };

  refuses('refuses a Target that answered anything but 200',
    [{ path: '/pages/ap-csa', target: '/pages/nonexistent-hub', why: 'a target that 404s' }],
    null,
    { at: verified.at, checks: verified.checks.concat([{ path: '/pages/nonexistent-hub', status: 404 }]) },
    null, 'answered HTTP 404');

  refuses('refuses a Target with no verified status code at all',
    [{ path: '/pages/ap-csa', target: '/pages/ap-csp-course', why: 'unverified target' }],
    null, { at: verified.at, checks: verified.checks.filter((c) => c.path !== '/pages/ap-csp-course') },
    null, 'was not in the verification pass');

  //  THE REFUSAL THAT SAVES A HALF MEGABYTE APPLICATION. Its authored text is
  //  zero and its rendered main text is inside the empty shell's range, so this
  //  is the one case where the sheet would have been confidently, silently
  //  wrong.
  refuses('refuses a Path that stores a client-side app with zero authored text',
    [{ path: '/pages/ap-csp-test-builder', target: '/pages/ap-csp-course',
      why: 'zero authored text, and a rendered shell, and half a megabyte of application' }],
    null,
    { at: verified.at, checks: verified.checks.concat([{ path: '/pages/ap-csp-test-builder', status: 200 }]) },
    null, 'stores 496715 characters. It is not empty');

  refuses('refuses a Path that still stores authored text',
    [{ path: '/pages/ap-csa-course', target: '/pages/ap-csp-course', why: 'a populated page' }],
    null, null, null, 'stores 92090 characters. It is not empty');

  refuses('refuses a Target that is empty too',
    [{ path: '/pages/ap-csa', target: '/pages/ap-csp', why: 'nothing to nothing' }],
    null, null, null, 'This would redirect nothing to nothing');

  refuses('refuses a chain, where a Target is itself redirected',
    [{ path: '/pages/ap-csa', target: '/pages/ap-csp', why: 'first hop' },
      { path: '/pages/ap-csp', target: '/pages/ap-csp-course', why: 'second hop' }],
    null, null, null, 'is itself a Path in this sheet, so this is a chain');

  refuses('refuses a redirect to itself',
    [{ path: '/pages/ap-csa', target: '/pages/ap-csa', why: 'a loop' }],
    null, null, null, 'redirects to itself');

  refuses('refuses a Path that was never measured',
    [{ path: '/pages/never-swept', target: '/pages/ap-csa-course', why: 'unmeasured path' }],
    null, null, null, 'not in the sweep, so its body was never measured');

  refuses('refuses a row with no reason written down',
    [{ path: '/pages/ap-csa', target: '/pages/ap-csa-course', why: '' }],
    null, null, null, 'no reason recorded for the row');

  refuses('refuses evidence older than the freshness limit',
    [{ path: '/pages/ap-csa', target: '/pages/ap-csa-course', why: 'stale status codes' }],
    null, null, Date.parse(verified.at) + G.MAX_EVIDENCE_AGE_MS + 60000, 'past the');

  //  ONE UNVERIFIABLE ROW REFUSES THE WHOLE SHEET. A generator that drops the
  //  bad row and writes the rest is the failure this rule was written against:
  //  the sheet then looks complete and quietly is not.
  const mixed = G.check(
    [{ path: '/pages/ap-csa', target: '/pages/ap-csa-course', why: 'a good row' },
      { path: '/pages/ap-csa-course', target: '/pages/ap-csp-course', why: 'a bad row' }],
    evidence, verified, NOW);
  ok('one bad row refuses the whole sheet rather than just itself',
    mixed.problems.some((p) => p.includes('One unverifiable row refuses the whole sheet')),
    mixed.problems);
}

console.log('\n3. THE PRECONDITION THAT MAKES THE SHEET A NO-OP ON ITS OWN');
{
  //  Shopify: "If the URL still loads a valid webpage, then the URL redirect
  //  won't work." Every Path here answers 200 today, so the sheet does nothing
  //  until a human deletes or unpublishes the pages. If that note ever stops
  //  being emitted, the sheet reads as ready to import and is not.
  const r = G.check([{ path: '/pages/ap-csa', target: '/pages/ap-csa-course', why: 'the head term' }],
    evidence, verified, NOW);
  ok('a Path that still answers 200 raises the cannot-fire note',
    r.notes.some((n) => n.includes('CANNOT FIRE until the page is deleted or unpublished')), r.notes);

  const gone = { at: verified.at,
    checks: verified.checks.map((c) => (c.path === '/pages/ap-csa' ? { path: c.path, status: 404 } : c)) };
  const r2 = G.check([{ path: '/pages/ap-csa', target: '/pages/ap-csa-course', why: 'the head term' }],
    evidence, gone, NOW);
  ok('and drops it once the Path 404s, which is when a redirect can fire',
    r2.notes.length === 0 && r2.rows.length === 1, { notes: r2.notes, rows: r2.rows.length });
}

console.log('\n4. THE ENVELOPE');
{
  const rows = [{ path: '/pages/ap-csa', target: '/pages/ap-csa-course' }];
  const csv = G.toCsv(rows);
  ok('starts with a UTF-8 BOM', csv.charCodeAt(0) === 0xFEFF);
  ok('records are separated by CRLF', /\r\n/.test(csv) && !/[^\r]\n/.test(csv));
  ok('every field is quoted', csv.replace(/^﻿/, '').split('\r\n').filter(Boolean)
    .every((l) => /^"(?:[^"]|"")*"(?:,"(?:[^"]|"")*")*$/.test(l)));
  ok('carries Command, Path and Target ONLY', csv.replace(/^﻿/, '').split('\r\n')[0]
    === '"Command","Path","Target"');
  //  A redirects sheet must never grow a fourth column. A blank cell is an ERASE
  //  in every column, and there is no column here worth that risk.
  ok('no Handle, no Body HTML, no Published At', !/Handle|Body HTML|Published At/.test(csv));
  ok('every command is MERGE', csv.split('\r\n').slice(1).filter(Boolean)
    .every((l) => l.startsWith('"MERGE"')));

  //  The delivered file itself, not just what the generator would produce.
  const delivered = fs.readFileSync(path.join(DIR, 'sheet.csv'), 'utf8');
  ok('the delivered sheet is byte-identical to what the generator emits now',
    delivered === G.toCsv(JSON.parse(read('rows.json'))),
    { delivered: delivered.length });
  //  A CSV has no tab name, so the FILE NAME is the sheet name and a file named
  //  anything else is rejected in one second before a row is read.
  ok('the delivered filename names a sheet Matrixify recognises',
    /redirect/i.test(read('sheet-filename.txt').trim()), read('sheet-filename.txt').trim());
}

console.log('\n5. THE GENERATOR REFUSES TO WRITE, END TO END');
{
  //  Everything above tests check() in isolation. This runs the actual binary,
  //  because "returns a problem" and "declines to put a file on disk" are two
  //  different claims and only the second one protects an import.
  const { execFileSync } = require('child_process');
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'epr-'));
  const target = path.join(tmp, 'refused-redirects.csv');
  const holes = path.join(tmp, 'verification.json');
  fs.writeFileSync(holes, JSON.stringify({ at: new Date().toISOString(), checks: [] }));
  let code = 0; let out = '';
  try {
    execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'empty-page-redirects-csv.js'),
      target, '--evidence', path.join(DIR, 'evidence.jsonl'), '--verified', holes],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  ok('exits non-zero when a Target has no status code', code === 1, code);
  ok('and writes no file at all', !fs.existsSync(target));
  ok('and says which Target it could not verify', /was not in the verification pass/.test(out),
    out.slice(0, 200));

  const badname = path.join(tmp, 'empty-pages.csv');
  let code2 = 0; let out2 = '';
  try {
    execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'empty-page-redirects-csv.js'),
      badname, '--evidence', path.join(DIR, 'evidence.jsonl'), '--verified', path.join(DIR, 'verification.json')],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) { code2 = e.status; out2 = (e.stdout || '') + (e.stderr || ''); }
  ok('refuses a filename Matrixify would reject before reading a row',
    code2 === 1 && /FILE NAME is the sheet name/.test(out2), out2.slice(0, 160));
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
