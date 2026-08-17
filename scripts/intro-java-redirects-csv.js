'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDIRECTS FOR HANDLES THAT CHANGED.
//
//  ── WHY THESE EXIST ─────────────────────────────────────────────────────────
//  Two pages shipped with British spelling in their slug. The audience is US, so
//  the words changed, and in this build a slug is derived from the content:
//
//    intro-java-lesson-6-6-bounds-and-neighbours -> ...-neighbors
//    intro-java-help-my-maths-is-wrong           -> ...-my-math-is-wrong
//
//  A Matrixify import cannot rename a page. It creates a new one at the new
//  handle and leaves the old one published, which is duplicate content pointing
//  at itself. So the old pages get deleted and these redirects carry anything
//  that already linked to them.
//
//  ── THE ORDER IS NOT OPTIONAL ───────────────────────────────────────────────
//  Shopify serves a PAGE in preference to a redirect with the same path. A
//  redirect created while the old page still exists does nothing at all, and
//  looks like it worked. So:
//
//    1. import the pages CSV        (creates the two new handles)
//    2. verify both new handles resolve
//    3. DELETE the two old pages
//    4. import this redirects CSV
//
//  Run step 4 before step 3 and you get a redirect that silently never fires.
//
//  ── THE TARGET CHECK ────────────────────────────────────────────────────────
//  The house rule is that every Target is verified before the row is written. A
//  redirect to a 404 is worse than no redirect: it turns a soft landing into a
//  loop through a dead page. This script cannot reach the storefront, so it
//  verifies the next best thing, that the target handle is a page the build
//  actually produces AND, when a --live dump is supplied, that the target
//  already exists on the store. Without --live it refuses to write.
//
//  Zero PII. No em-dashes, per repo convention.
//
//  Run:
//    node scripts/intro-java-redirects-csv.js out.csv --live pages.json
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const { allPages } = require('../lib/intro-java-build');

// old handle -> new handle. Deliberately a literal list rather than a diff
// against the store: a redirect is a permanent, public promise about a URL, and
// it should be something a person wrote down on purpose.
const RENAMES = [
  {
    from: 'intro-java-lesson-6-6-bounds-and-neighbours',
    to: 'intro-java-lesson-6-6-bounds-and-neighbors',
    why: 'British spelling in a slug, US audience',
  },
  {
    from: 'intro-java-help-my-maths-is-wrong',
    to: 'intro-java-help-my-math-is-wrong',
    why: 'British spelling in a slug, US audience',
  },
];

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  return new Set(nodes.filter((n) => n && n.handle).map((n) => n.handle));
}

function main(argv) {
  const out = argv[0];
  const liveAt = argv.indexOf('--live');
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/intro-java-redirects-csv.js <out.csv> --live <pages.json>');
    process.exit(2);
  }

  const built = new Set(allPages().map((p) => p.handle));
  const problems = [];

  if (liveAt === -1) {
    problems.push('no --live dump supplied, so no Target could be verified. '
      + 'Pull the pages after importing them and pass the dump here.');
  }
  const live = liveAt === -1 ? null : readLive(argv[liveAt + 1]);

  for (const r of RENAMES) {
    if (!built.has(r.to)) {
      problems.push(`${r.to}: the build does not produce this handle, so the Target is wrong`);
    }
    if (built.has(r.from)) {
      problems.push(`${r.from}: the build STILL produces this handle. `
        + 'Redirecting a page that is about to be re-created would loop.');
    }
    if (live) {
      if (!live.has(r.to)) {
        problems.push(`${r.to}: not on the store yet. Import the pages CSV first, `
          + 'then re-pull the dump. A redirect to a page that does not exist is a 404.');
      }
      if (live.has(r.from)) {
        problems.push(`${r.from}: still live. DELETE it first, or Shopify serves the page `
          + 'and this redirect never fires.');
      }
    }
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    for (const m of problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const lines = [['Command', 'Path', 'Target'].map(cell).join(',')];
  for (const r of RENAMES) {
    lines.push([cell('MERGE'), cell('/pages/' + r.from), cell('/pages/' + r.to)].join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  console.log('');
  for (const r of RENAMES) console.log(`    /pages/${r.from}\n      -> /pages/${r.to}   (${r.why})`);
  console.log(`\n  wrote ${out}  (${RENAMES.length} redirects)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { RENAMES };
