'use strict';
/*
 *  The Drive bundle watcher, pinned.
 *
 *  Everything here guards a way this watcher could report a comfortable answer
 *  while reading nothing, which is the failure this repo keeps finding and the
 *  one a watcher is least able to notice about itself.
 *
 *    1. classify() decides folder / file / native off the entry's own href.
 *       Get it wrong and the walk either misses a subtree or tries to hash a
 *       Google Slides deck.
 *    2. A folder that parses to zero entries is an ERROR unless the page also
 *       carries Google's empty-folder marker. Empty and unparseable look
 *       identical if you only count entries, and the markup is undocumented.
 *    3. Google-native files are recorded WITHOUT a digest. Every export
 *       re-renders, so hashing them would report a change every single week and
 *       the watcher would be ignored inside a month.
 */
const assert = require('assert');
const w = require('../scripts/drive-watch.js');

let failed = 0;
function check(name, fn) {
  try { fn(); console.log(`  [PASS] ${name}`); } catch (e) {
    failed++; console.log(`  [FAIL] ${name}: ${e.message}`);
  }
}

check('classify: a folder href', () => {
  assert.strictEqual(w.classify('https://drive.google.com/drive/folders/1abc'), 'folder');
});
check('classify: an uploaded file href', () => {
  assert.strictEqual(w.classify('https://drive.google.com/file/d/1abc/view'), 'file');
});
check('classify: a native Slides href', () => {
  assert.strictEqual(w.classify('https://docs.google.com/presentation/d/1abc/edit'), 'native');
});
check('classify: a native Sheets href', () => {
  assert.strictEqual(w.classify('https://docs.google.com/spreadsheets/d/1abc/edit'), 'native');
});
check('classify: anything else is unknown, not silently a file', () => {
  assert.strictEqual(w.classify('https://example.com/whatever'), 'unknown');
});

check('the entry regex reads id, href and title off real markup', () => {
  const html = '<div class="flip-entry" id="entry-1XYZ" tabindex="0" role="link">'
    + '<div class="flip-entry-info"><a href="https://drive.google.com/file/d/1XYZ/view" target="_blank">'
    + '<div class="flip-entry-visual"></div>'
    + '<div class="flip-entry-title">Quiz_KEY.docx</div></a></div></div>';
  w.ENTRY.lastIndex = 0;
  const m = w.ENTRY.exec(html);
  assert.ok(m, 'no match');
  assert.strictEqual(m[1], '1XYZ');
  assert.strictEqual(w.classify(m[2]), 'file');
  assert.strictEqual(m[3], 'Quiz_KEY.docx');
});

check('decodeEntities unescapes a title', () => {
  assert.strictEqual(w.decodeEntities('Ready &amp; Set &#39;Go&#39;'), "Ready & Set 'Go'");
});

check('diff reports added, removed and changed', () => {
  const before = { files: { a: { sha256: '1' }, b: { sha256: '2' }, gone: { sha256: '3' } } };
  const after = { files: { a: { sha256: '1' }, b: { sha256: 'CHANGED' }, fresh: { sha256: '4' } } };
  const d = w.diff(before, after);
  assert.deepStrictEqual(d.changed, ['b']);
  assert.deepStrictEqual(d.added, ['fresh']);
  assert.deepStrictEqual(d.removed, ['gone']);
});

check('a native file cannot produce a diff, because it carries no digest', () => {
  const before = { files: { deck: { id: '1a', native: true } } };
  const after = { files: { deck: { id: '1a', native: true } } };
  assert.deepStrictEqual(w.diff(before, after).changed, []);
});

check('the empty-folder markers are non-empty, or every unreadable folder passes', () => {
  assert.ok(Array.isArray(w.EMPTY_MARKERS) && w.EMPTY_MARKERS.length > 0);
  assert.ok(w.EMPTY_MARKERS.every((m) => typeof m === 'string' && m.length > 4));
});

// The watch list itself: a folder nobody can open is not worth watching, and a
// private one produces diffs nobody can act on.
const cfg = require('../config/drive-bundles.json');
check('every bundle declares slug, name, folder_id and link sharing', () => {
  assert.ok(cfg.bundles.length > 0);
  for (const b of cfg.bundles) {
    assert.ok(b.slug && b.name && b.folder_id, `incomplete entry: ${JSON.stringify(b)}`);
    assert.strictEqual(b.share, 'link', `${b.slug} is not link-shared`);
    assert.match(b.folder_id, /^[A-Za-z0-9_-]{20,}$/, `${b.slug} folder_id looks wrong`);
  }
});
check('slugs are unique, or one snapshot overwrites another', () => {
  const s = cfg.bundles.map((b) => b.slug);
  assert.strictEqual(new Set(s).size, s.length);
});

console.log();
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('all passed, 0 failed');
