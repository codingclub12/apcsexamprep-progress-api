'use strict';
//  Offline checks for scripts/build-confirm-role-pages-sheet.js. Each refusal is
//  broken on purpose, one at a time, and must fire for its OWN reason. No
//  em-dashes, per repo convention.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const b = require('../scripts/build-confirm-role-pages-sheet');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

//  The committed bodies pass.
for (const p of b.PAGES) {
  const body = b.bodyOf(p.handle);
  ok(b.checkBody(p.handle, body).length === 0, p.handle + ' should pass: ' + b.checkBody(p.handle, body).join('; '));
  ok(body.indexOf('id="apcs-' + p.handle + '"') !== -1, p.handle + ' carries its wrapper id');
}

//  Each rule, broken alone, fires alone.
const base = b.bodyOf('confirm-teacher');
const cases = [
  ['non-ASCII', base.replace('</h1>', '\u00a0</h1>')],
  ['em-dash', base.replace('</h1>', ' &mdash;</h1>')],
  ['<script>', base + '<script>1</script>'],
  ['<style>', base + '<style>p{}</style>'],
  ['no internal link', base.replace(/href="\/[^"]*"/g, 'href="https://example.com/"')],
];
for (const [rule, broken] of cases) {
  const got = b.checkBody('x', broken);
  ok(got.length === 1, rule + ': expected exactly one refusal, got ' + JSON.stringify(got));
  ok(got[0].indexOf(rule) !== -1, rule + ': refused for the wrong reason: ' + got[0]);
}

//  Every injection above must actually have landed, or the case tests nothing.
for (const [rule, broken] of cases) ok(broken !== base, rule + ': the injection did not land');

//  Round trip, then tamper with the file and require readBack to notice.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'confirm-role-'));
const file = path.join(dir, 'confirm-role-pages.csv');
const rows = b.PAGES.map((p) => ({ handle: p.handle, title: p.title, body: b.bodyOf(p.handle) }));
b.writeSheet(file, rows);
ok(b.readBack(file, rows) === 2, 'two rows read back');
const raw = fs.readFileSync(file, 'utf8');
ok(raw.charCodeAt(0) === 0xfeff, 'BOM present');
fs.writeFileSync(file, raw.replace('Klaviyo flow', 'Klaviyo  flow'));
assert.throws(() => b.readBack(file, rows), /differs/); n++;
fs.writeFileSync(file, raw.replace('"TRUE"', '"FALSE"'));
assert.throws(() => b.readBack(file, rows), /Published differs/); n++;
//  Update mode: three columns, and the same tamper checks.
const ufile = path.join(dir, 'confirm-role-pages-copy.csv');
b.writeSheet(ufile, rows, true);
ok(b.readBack(ufile, rows, true) === 2, 'two update rows read back');
const uraw = fs.readFileSync(ufile, 'utf8');
ok(uraw.split('\r\n')[0] === '\ufeff"Handle","Command","Body HTML"', 'update header is body-only');
assert.throws(() => b.readBack(ufile, rows, false), /header/); n++;
fs.writeFileSync(ufile, uraw.replace('Klaviyo flow', 'Klaviyo  flow'));
assert.throws(() => b.readBack(ufile, rows, true), /differs/); n++;

//  visibleText ignores Shopify re-serialising an apostrophe, and nothing else.
ok(b.visibleText('<p>I&#39;m</p>') === b.visibleText("<p>I'm</p>"), 'apostrophe entity is invisible');
ok(b.visibleText('<p>I am</p>') !== b.visibleText('<p>I was</p>'), 'a word change is visible');
fs.rmSync(dir, { recursive: true, force: true });

//  The newest committed sheet, if present, is exactly what the builder writes now.
//  The 2026-09-23f creation sheet is history: it was imported, then the copy changed.
const committed = path.join(__dirname, '..', 'imports', '2026-09-23g', 'confirm-role-pages-copy.csv');
if (fs.existsSync(committed)) { ok(b.readBack(committed, rows, true) === 2, 'committed copy sheet matches source'); }

console.log('smoke:confirmrole ' + n + ' checks passed');
