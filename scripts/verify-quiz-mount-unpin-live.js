'use strict';
// -----------------------------------------------------------------------------
//  POST-IMPORT CHECK for the quiz mount unpin sheets, and a PRE-import one too.
//
//  Run it before importing as well as after. A generated sheet goes stale, and
//  this reads the live page rather than the file: a page that is already
//  unpinned needs no import, and a sheet for it is a sheet to delete.
//
//  It asks the question that MATTERS rather than the one that is easy to see.
//  "Did the src lose its ?v=" is easy and insufficient: the point is whether the
//  bytes a student downloads contain the fix. So the last check follows the
//  script URL the page actually names and looks for a string only the new build
//  emits. A page repointed at a URL that still serves the old file would pass
//  every earlier check and fail this one.
//
//    node scripts/verify-quiz-mount-unpin-live.js            all 23
//    node scripts/verify-quiz-mount-unpin-live.js <handle>   one page
//
//  Zero PII: public page markup only. Pure ASCII, no em-dashes.
// -----------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch');
const { GROUPS } = require('./csa-cyber-quiz-mount-unpin-csv');

//  Emitted only by the build that carries the inline colour fix. Before it, the
//  option text was a bare <span> with no class at all.
const FIX_MARKER = 'qz-opt-text';
const SRC = /<script[^>]*src="([^"]*apcs-quiz-mount[^"]*)"/g;

const only = process.argv[2];
const handles = GROUPS.flatMap((g) => g.handles).filter((h) => !only || h === only);

//  One fetch per distinct asset URL, however many pages name it.
const assetCache = new Map();
function assetHasFix(url) {
  if (!assetCache.has(url)) {
    const r = sf.raw(url);
    assetCache.set(url, {
      code: r.code,
      bytes: r.body.length,
      fixed: r.body.indexOf(FIX_MARKER) !== -1
    });
  }
  return assetCache.get(url);
}

let pass = 0, fail = 0;
const rows = [];

for (const handle of handles) {
  const problems = [];
  let body;
  try { body = sf.pageBody(handle).body_html; }
  catch (e) { problems.push('could not read the page: ' + e.message.split('\n')[0]); }

  let srcs = [];
  if (body) {
    SRC.lastIndex = 0;
    let m;
    while ((m = SRC.exec(body)) !== null) srcs.push(m[1]);

    if (srcs.length !== 1) problems.push('expected 1 mount script, found ' + srcs.length);
    if (!/data-apcs-quiz(?![-\w])/.test(body)) problems.push('the mount container is gone');
    for (const s of srcs) {
      if (/[?&]v=/.test(s)) problems.push('the src is still pinned to a version: ' + s.split('/').pop());
    }
  }

  let served = null;
  if (srcs.length === 1) {
    served = assetHasFix(srcs[0]);
    if (served.code !== '200') problems.push('the script URL answered ' + served.code);
    else if (!served.fixed) {
      problems.push('the file this page loads does NOT contain ' + FIX_MARKER +
        ' (' + served.bytes + ' bytes), so the answer choices are still the old build');
    }
  }

  if (problems.length) { fail++; } else { pass++; }
  rows.push({ handle, problems, served });
}

for (const r of rows) {
  const mark = r.problems.length ? 'FAIL' : 'ok  ';
  const tail = r.served ? '  ' + r.served.bytes + ' bytes, fix ' + (r.served.fixed ? 'present' : 'ABSENT') : '';
  console.log(mark + '  ' + r.handle.padEnd(44) + tail);
  for (const p of r.problems) console.log('        ' + p);
}

console.log('\n' + pass + ' of ' + rows.length + ' pages load a build that carries the fix.');
process.exit(fail ? 1 : 0);
