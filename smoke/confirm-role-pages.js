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
  ['non-ASCII', base.replace('Thanks', 'Thanks ')],
  ['em-dash', base.replace('Thanks,', 'Thanks &mdash;')],
  ['<script>', base + '<script>1</script>'],
  ['<style>', base + '<style>p{}</style>'],
  ['no internal link', base.replace(/href="\/[^"]*"/g, 'href="https://example.com/"')],
];
for (const [rule, broken] of cases) {
  const got = b.checkBody('x', broken);
  ok(got.length === 1, rule + ': expected exactly one refusal, got ' + JSON.stringify(got));
  ok(got[0].indexOf(rule) !== -1, rule + ': refused for the wrong reason: ' + got[0]);
}

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
fs.rmSync(dir, { recursive: true, force: true });

//  The committed sheet, if present, is exactly what the builder writes now.
const committed = path.join(__dirname, '..', 'imports', '2026-09-23f', 'confirm-role-pages.csv');
if (fs.existsSync(committed)) { ok(b.readBack(committed, rows) === 2, 'committed sheet matches source'); }

console.log('smoke:confirmrole ' + n + ' checks passed');
