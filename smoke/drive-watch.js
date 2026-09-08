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

//  The pool is the one thing here that can only be tested by running it.
const asyncChecks = [];
function checkAsync(name, fn) {
  asyncChecks.push(async () => {
    try { await fn(); console.log(`  [PASS] ${name}`); } catch (e) {
      failed++; console.log(`  [FAIL] ${name}: ${e.message}`);
    }
  });
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

//  Run 1 failed on both of these, so they are pinned rather than trusted.
const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'scripts', 'drive-watch.js'), 'utf8');

check('downloads go through usercontent with confirm, not uc?export=download', () => {
  assert.ok(/drive\.usercontent\.google\.com\/download\?id=\$\{id\}&export=download&confirm=t/.test(src),
    'FILE_DL is not the usercontent endpoint');
  assert.ok(!/drive\.google\.com\/uc\?export=download/.test(src),
    'the old uc endpoint is still in use; it serves a virus-scan page for .js and returns 2443 bytes of HTML');
});

check('a transient 503 is retried rather than failing the bundle', () => {
  assert.ok(/RETRY_STATUS/.test(src), 'no retry set');
  for (const code of [408, 429, 500, 502, 503, 504]) {
    assert.ok(new RegExp(`\\b${code}\\b`).test(src.split('const RETRY_STATUS')[1].split(']')[0]),
      `${code} is not retried`);
  }
  assert.ok(/attempt\s*<=\s*RETRIES/.test(src), 'no retry loop');
});

check('a 404 is NOT retried, or a deleted file costs five round trips', () => {
  assert.ok(/if \(!RETRY_STATUS\.has\(r\.status\)\) throw last;/.test(src));
});

//  ── THE DOWNLOAD POOL, AND THE ORDERING IT BREAKS ──────────────────────────
//   Measured on the real bundles: 19m07s serial against a 30 minute job cap,
//   3m46s at a concurrency of six. It costs the one property the snapshot had
//   been getting for free, that files were recorded in walk order, so these
//   pin both halves.

check('sortFiles: the same files in a different order serialize identically', () => {
  const a = { 'z/deck.pptx': { sha256: '3' }, 'a/quiz.docx': { sha256: '1' }, 'm/key.docx': { sha256: '2' } };
  const b = { 'a/quiz.docx': { sha256: '1' }, 'z/deck.pptx': { sha256: '3' }, 'm/key.docx': { sha256: '2' } };
  assert.strictEqual(
    JSON.stringify(w.sortFiles(a), null, 1),
    JSON.stringify(w.sortFiles(b), null, 1),
    'completion order reaches the snapshot file, so it churns every week and the PR cries wolf',
  );
  assert.deepStrictEqual(Object.keys(w.sortFiles(a)), ['a/quiz.docx', 'm/key.docx', 'z/deck.pptx']);
});

check('sortFiles keeps every entry, rather than sorting some away', () => {
  const f = {};
  for (let i = 0; i < 50; i++) f[`f${i}`] = { sha256: String(i) };
  const out = w.sortFiles(f);
  assert.strictEqual(Object.keys(out).length, 50);
  assert.deepStrictEqual(out.f7, { sha256: '7' });
});

checkAsync('pool visits every item exactly once, whatever the finishing order', async () => {
  const items = Array.from({ length: 47 }, (_, i) => i);
  const seen = [];
  await w.pool(items, 6, async (n) => {
    await new Promise((r) => setTimeout(r, (n * 7) % 11));
    seen.push(n);
  });
  assert.strictEqual(seen.length, 47, 'not every item ran');
  assert.deepStrictEqual([...seen].sort((x, y) => x - y), items, 'an item ran twice or not at all');
});

checkAsync('pool never runs more than its limit at once', async () => {
  let live = 0;
  let peak = 0;
  await w.pool(Array.from({ length: 40 }, (_, i) => i), 6, async () => {
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live -= 1;
  });
  assert.ok(peak <= 6, `ran ${peak} at once against a limit of 6`);
  assert.ok(peak > 1, 'the pool never actually overlapped, so the limit proves nothing');
});

//  Read this one before changing it. The obvious version of it is hollow, and
//  it was hollow here first: Promise.all rejects the instant one runner throws,
//  so a count taken at that moment is small whether or not the pool actually
//  stopped. The other runners are still going. So the count has to be taken
//  AFTER giving them long enough to have chewed through everything left, and
//  what it proves is that they did not.
checkAsync('pool stops handing out work once one job throws', async () => {
  const LIMIT = 6;
  let started = 0;
  const err = await w.pool(Array.from({ length: 400 }, (_, i) => i), LIMIT, async (n) => {
    started += 1;
    await new Promise((r) => setTimeout(r, 1));
    if (n === 3) throw new Error('boom');
  }).then(() => null, (e) => e);
  assert.ok(err, 'a throwing job did not reject the pool');
  assert.strictEqual(err.message, 'boom');

  const atThrow = started;
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(started <= atThrow + LIMIT,
    `kept handing out work after the failure: ${atThrow} started at the throw, ${started} once it drained`);
  assert.ok(started < 400, `ran the whole list anyway: ${started} of 400`);
});

check('the limit is a small number, or the watcher is the reason Drive rate limits it', () => {
  assert.ok(Number.isInteger(w.DOWNLOAD_LIMIT) && w.DOWNLOAD_LIMIT >= 2 && w.DOWNLOAD_LIMIT <= 10,
    `DOWNLOAD_LIMIT is ${w.DOWNLOAD_LIMIT}`);
});

check('the snapshot is written through sortFiles, not from the raw walk order', () => {
  assert.ok(/files: sortFiles\(files\)/.test(src),
    'main still serializes files in insertion order');
});

//  ── CRYING WOLF ────────────────────────────────────────────────────────────
//   A watcher that opens "a teacher bundle changed" every week over a report
//   saying byte-identical teaches everyone to close it unread, and then it is
//   worse than nothing because it looks like cover. This is not a risk someone
//   imagined: the sibling watcher does it, and ced-watch PR #591 sat open
//   saying "nothing changed (15 sources)" in its own body.

check('a run that finds nothing does not restamp captured', () => {
  assert.ok(/if \(before && !bundleMoved\(d\)\) after\.captured = before\.captured;/.test(src),
    'captured is restamped every run, so the file is dirty every week whatever the bundle did');
});

check('a run that finds nothing does not rewrite the snapshot at all', () => {
  assert.ok(/if \(!before \|\| bundleMoved\(d\)\) \{\s*\n\s*fs\.writeFileSync/.test(src),
    'the snapshot is written unconditionally, so serialization drift alone opens a PR');
});

check('bundleMoved is false for an identical bundle and true for each kind of change', () => {
  const none = { added: [], removed: [], changed: [], retyped: [] };
  assert.strictEqual(w.bundleMoved(none), false, 'an unchanged bundle would open a PR');
  for (const k of ['added', 'removed', 'changed', 'retyped']) {
    assert.strictEqual(w.bundleMoved({ ...none, [k]: ['x'] }), true, `${k} does not count as a change`);
  }
});

check('a handout converted to a Google doc is a change, not an invisible one', () => {
  const before = { files: { 'U1/Quiz.docx': { id: '1a', sha256: 'abc', bytes: 10 } } };
  const after = { files: { 'U1/Quiz.docx': { id: '1a', native: true } } };
  const d = w.diff(before, after);
  assert.deepStrictEqual(d.changed, [], 'changed needs a digest on both sides, so it cannot see this');
  assert.deepStrictEqual(d.retyped, ['U1/Quiz.docx'],
    'a file that stopped being downloadable is invisible to the diff and to the write gate');
  assert.strictEqual(w.bundleMoved(d), true);
});

check('the reverse conversion counts too', () => {
  const before = { files: { 'U1/Deck': { id: '1a', native: true } } };
  const after = { files: { 'U1/Deck': { id: '1a', sha256: 'abc', bytes: 10 } } };
  assert.deepStrictEqual(w.diff(before, after).retyped, ['U1/Deck']);
});

check('a native file that stays native is still not a change', () => {
  const before = { files: { 'U1/Deck': { id: '1a', native: true } } };
  const after = { files: { 'U1/Deck': { id: '1a', native: true } } };
  const d = w.diff(before, after);
  assert.deepStrictEqual(d.retyped, [], 'every native file would report as retyped every week');
  assert.strictEqual(w.bundleMoved(d), false);
});

//  A plain file records no `native` key at all, so the retype test compares
//  undefined against undefined and the coercion looks like decoration. It stops
//  looking like decoration the moment a snapshot spells the absence out, which a
//  hand-edit or a format change can do at any time: without the coercion,
//  `native: false` against a missing key reads as a conversion, and every plain
//  file in the bundle reports as retyped on the week the format moves.
check('an explicit native:false and an absent one are the same file', () => {
  const before = { files: { 'U1/Quiz.docx': { id: '1a', sha256: 'abc', native: false } } };
  const after = { files: { 'U1/Quiz.docx': { id: '1a', sha256: 'abc' } } };
  const d = w.diff(before, after);
  assert.deepStrictEqual(d.retyped, [],
    'absent and false must mean the same thing, or a format change reports the whole bundle as converted');
  assert.strictEqual(w.bundleMoved(d), false);
});

(async () => {
  for (const fn of asyncChecks) await fn();
  console.log();
  if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
  console.log('all passed, 0 failed');
})();
