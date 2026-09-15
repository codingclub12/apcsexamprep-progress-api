'use strict';
// -----------------------------------------------------------------------------
//  UNPIN THE QUIZ MOUNT SCRIPT FROM A VERSION THAT CANNOT BE UPDATED.
//
//  -- WHAT HAPPENED, 2026-09-15 ----------------------------------------------
//  A student reported white-on-white answer choices on CSA 1.1. The fix shipped
//  in the theme repo and the Shopify Files object was replaced with the fixed
//  build (gid://shopify/GenericFile/38250791960791, now 18,970 bytes, READY).
//
//  It did not reach a single student, and the reason is one query parameter.
//  Every page that mounts a quiz loads the script as
//
//      https://cdn.shopify.com/s/files/.../apcs-quiz-mount.js?v=1787764736
//
//  and Shopify's file CDN treats `v` as part of the cache key. Measured right
//  after the replacement:
//
//      ?v=1787764736   8,434 bytes, no qz-opt-text   the OLD build
//      no query        9,614 bytes, has qz-opt-text  the NEW build
//
//  with `cache-control: public, max-age=31557600` and `age: 1730209` on the
//  pinned one. That is a one year immutable entry roughly twenty days old, so
//  the pinned URL keeps serving the pre-fix file for about another 345 days.
//  Replacing the file again would change nothing, because the pages would still
//  ask for that version.
//
//  -- WHAT THIS DOES ---------------------------------------------------------
//  Drops `?v=1787764736` from the one script tag on each page, so the pages ask
//  for the file rather than for a snapshot of it. Thirteen bytes per page.
//  After this, replacing the Files object reaches students with no page edit at
//  all, which is the trap this closes rather than merely steps around.
//
//  -- ORDER, AND WHY IT IS SPLIT ---------------------------------------------
//  Sheet 1 is CSA 1.1 alone, because it is the only page that is BROKEN and the
//  only one a student has complained about. Import it first and the report is
//  answered. The five cyber sheets are the same one-line change on pages that
//  are not broken: they render at 10.31:1 today and will render identically
//  after. They exist so the next replacement is not silently ignored on 22
//  pages, and there is no hurry about any of them.
//
//    node scripts/csa-cyber-quiz-mount-unpin-csv.js           write the sheets
//    node scripts/csa-cyber-quiz-mount-unpin-csv.js --check   re-verify on disk
//
//  Zero PII: public page markup only. Pure ASCII, no em-dashes.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');

const PINNED = 'apcs-quiz-mount.js?v=1787764736';
const BARE = 'apcs-quiz-mount.js';
const OUT_DIR = path.join(__dirname, '..', 'matrixify');
const SNAP = path.join(__dirname, '..', 'imports', '2026-09-15', 'quiz-mount-unpin-live.json');

//  Grouped the way they get imported: one sheet per click, smallest blast
//  radius first. Handles are not guessed, they are the 23 the live sitemap
//  sweep found carrying data-apcs-quiz on 2026-09-15.
const GROUPS = [
  { file: 'quiz-mount-unpin-1-csa-1-1.csv', label: 'CSA 1.1 (the reported page)',
    handles: ['ap-csa-lesson-1-1-intro-algorithms'] },
  { file: 'quiz-mount-unpin-2-cyber-unit-1.csv', label: 'AP Cyber unit 1',
    handles: ['ap-cyber-unit-1-lesson-1-quiz', 'ap-cyber-unit-1-lesson-2-quiz',
      'ap-cyber-unit-1-lesson-3-quiz', 'ap-cyber-unit-1-lesson-4-quiz',
      'ap-cyber-unit-1-lesson-5-quiz'] },
  { file: 'quiz-mount-unpin-3-cyber-unit-2.csv', label: 'AP Cyber unit 2',
    handles: ['ap-cyber-unit-2-lesson-1-quiz', 'ap-cyber-unit-2-lesson-2-quiz',
      'ap-cyber-unit-2-lesson-4-quiz'] },
  { file: 'quiz-mount-unpin-4-cyber-unit-3.csv', label: 'AP Cyber unit 3',
    handles: ['ap-cyber-unit-3-lesson-1-quiz', 'ap-cyber-unit-3-lesson-2-quiz',
      'ap-cyber-unit-3-lesson-3-quiz', 'ap-cyber-unit-3-lesson-4-quiz',
      'ap-cyber-unit-3-lesson-5-quiz'] },
  { file: 'quiz-mount-unpin-5-cyber-unit-4.csv', label: 'AP Cyber unit 4',
    handles: ['ap-cyber-unit-4-lesson-2-quiz', 'ap-cyber-unit-4-lesson-3-quiz',
      'ap-cyber-unit-4-lesson-4-quiz'] },
  { file: 'quiz-mount-unpin-6-cyber-unit-5.csv', label: 'AP Cyber unit 5',
    handles: ['ap-cyber-unit-5-lesson-1-quiz', 'ap-cyber-unit-5-lesson-2-quiz',
      'ap-cyber-unit-5-lesson-3-quiz', 'ap-cyber-unit-5-lesson-4-quiz',
      'ap-cyber-unit-5-lesson-5-quiz', 'ap-cyber-unit-5-lesson-6-quiz'] }
];

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function sheet(rows) {
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.body].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  Minimal CSV reader, for the parse-back diff only. Generation is not evidence
//  that generation worked: the CSP sheet lost 90 bytes a page while every
//  semantic check passed, and only a parse-back caught it.
function parse(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

//  One page. Every rule has to be provable on its own, so each states what it
//  found rather than only that something is wrong.
//  `transform` is injectable for one reason: against a single string replace,
//  rules 2 to 6 cannot fail, and a rule that cannot fail is decoration. The
//  mutation harness hands in a saboteur per rule and requires that rule's own
//  message, so a case that only trips its neighbour reads as red.
function build(handle, live, transform) {
  const problems = [];
  const pinned = (live.match(new RegExp(PINNED.replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&'), 'g')) || []).length;
  if (pinned !== 1) {
    problems.push(handle + ': expected exactly 1 pinned src, found ' + pinned);
    return { problems };
  }
  const out = transform ? transform(live) : live.replace(PINNED, BARE);

  if (out.length !== live.length - '?v=1787764736'.length) {
    problems.push(handle + ': length went ' + live.length + ' to ' + out.length +
      ', not a drop of exactly 13');
  }
  if (out.replace(BARE, () => PINNED) !== live) {
    problems.push(handle + ': undoing the change does not return the live body byte for byte');
  }
  if (out.includes(PINNED)) {
    problems.push(handle + ': a pinned src is STILL in the result');
  }
  if ((out.match(/apcs-quiz-mount\.js/g) || []).length !== 1) {
    problems.push(handle + ': the mount script is missing or duplicated');
  }
  //  The point of the page, not just the point of the edit. A sheet that
  //  repointed the script and dropped the mount would import cleanly and serve
  //  a lesson with no quiz on it.
  //  The attribute, not the substring. `includes('data-apcs-quiz')` is TRUE of
  //  `data-apcs-quiz-OFF` and of `data-apcs-quizzical`, so a mangled mount read
  //  as a present one. Mutation testing caught that here rather than on a page.
  if (!/data-apcs-quiz(?![-\w])/.test(out)) {
    problems.push(handle + ': the mount container is not in the result');
  }
  return { problems, out };
}

function main() {
  const check = process.argv.includes('--check');
  let snap = {};
  if (check && fs.existsSync(SNAP)) snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));

  const problems = [];
  const built = {};
  let pages = 0;

  for (const g of GROUPS) {
    const rows = [];
    for (const handle of g.handles) {
      const live = check && snap[handle] ? snap[handle] : sf.pageBody(handle).body_html;
      snap[handle] = live;
      const r = build(handle, live);
      problems.push(...r.problems);
      if (r.out) { rows.push({ handle, body: r.out }); built[handle] = r.out; pages++; }
    }
    if (!rows.length) continue;
    const csv = sheet(rows);
    const dest = path.join(OUT_DIR, g.file);
    if (!check) fs.writeFileSync(dest, csv, 'utf8');

    //  PARSE BACK, from the bytes on disk when there are bytes on disk.
    const back = parse(check && fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : csv);
    const head = back.shift();
    if (head.join(',') !== 'Handle,Command,Body HTML') {
      problems.push(g.file + ': header is ' + JSON.stringify(head));
    }
    if (back.length !== rows.length) {
      problems.push(g.file + ': parsed ' + back.length + ' rows, wrote ' + rows.length);
    }
    for (let i = 0; i < back.length; i++) {
      if (back[i][0] !== rows[i].handle) problems.push(g.file + ' row ' + i + ': handle drifted');
      if (back[i][1] !== 'MERGE') problems.push(g.file + ' row ' + i + ': command is not MERGE');
      if (back[i][2] !== rows[i].body) {
        problems.push(g.file + ' row ' + i + ' (' + rows[i].handle + '): body does not survive the round trip, ' +
          back[i][2].length + ' bytes back for ' + rows[i].body.length + ' written');
      }
    }
    console.log((check ? 'checked ' : 'wrote   ') + g.file.padEnd(38) +
      rows.length + ' page' + (rows.length === 1 ? ' ' : 's') + '  ' + g.label);
  }

  //  No page may appear in two sheets, and every handle must land somewhere.
  const all = GROUPS.flatMap((g) => g.handles);
  if (new Set(all).size !== all.length) problems.push('a handle appears in more than one sheet');
  if (pages !== all.length) problems.push('built ' + pages + ' pages for ' + all.length + ' handles');

  if (!check) {
    fs.mkdirSync(path.dirname(SNAP), { recursive: true });
    fs.writeFileSync(SNAP, JSON.stringify(snap));
  }

  console.log('');
  if (problems.length) {
    console.log('REFUSED, ' + problems.length + ' problem' + (problems.length === 1 ? '' : 's') + ':');
    problems.forEach((p) => console.log('  ' + p));
    process.exit(1);
  }
  console.log(pages + ' pages across ' + GROUPS.length + ' sheets, every one parsed back byte for byte.');
}

//  main() only when run directly, so the mutation harness can drive build()
//  and parse() against deliberately broken inputs without writing a sheet.
if (require.main === module) main();

module.exports = { build, parse, sheet, GROUPS, PINNED, BARE };
