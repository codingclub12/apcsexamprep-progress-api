'use strict';
// -----------------------------------------------------------------------------
//  MATRIXIFY REDIRECTS SHEET FOR THE EMPTY COURSE-HEAD PAGES.
//
//  ── THE PRECONDITION THAT MAKES THIS SHEET A NO-OP ON ITS OWN ───────────────
//  Shopify's own documentation: "You can redirect only from broken URLs" and
//  "If the URL still loads a valid webpage, then the URL redirect won't work."
//  Every Path in this sheet currently returns HTTP 200. It serves a page title
//  and the global contact widget and nothing else, but it RESOLVES, so a
//  redirect sitting on it never fires.
//
//  So importing this file by itself changes nothing at all, and looks like it
//  worked: Matrixify logs the rows, the redirects appear in Admin, and every URL
//  still serves the empty shell. The import order is not optional:
//
//    1. a human DELETES or UNPUBLISHES the empty pages   (NEVER_AUTO: deleting
//       or unpublishing a handle is on the list. It is not this script's to do.)
//    2. confirm each Path now 404s
//    3. import this sheet
//    4. confirm each Path now 301s to its Target
//
//  Run step 3 before step 1 and you get seven redirects that silently never
//  fire. scripts/intro-java-redirects-csv.js learned the same thing in August.
//
//  ── WHAT IS VERIFIED BEFORE A ROW IS WRITTEN ────────────────────────────────
//  The house rule is that every Target is verified before its row exists. A
//  redirect to a 404 is worse than no redirect: it turns a soft landing into a
//  loop through a dead page. This script cannot reach the storefront, on
//  purpose, so that the sheet is a function of recorded evidence rather than of
//  whatever the network said while it ran. It requires two files:
//
//    --evidence   the full-store sweep from scripts/empty-page-sweep.js, which
//                 says which handles store no body and which store one
//    --verified   a dedicated, timestamped status-code pass over exactly the
//                 Paths and Targets in this sheet
//
//  ONE UNVERIFIABLE ROW REFUSES THE WHOLE SHEET, not just its own row.
//
//  Zero PII. No em-dashes, per repo convention.
//
//    node scripts/empty-page-redirects-csv.js <out.csv> \
//         --evidence sweep.jsonl --verified verification.json
// -----------------------------------------------------------------------------
const fs = require('fs');

//  A redirect is a permanent, public promise about a URL. This is deliberately a
//  literal list somebody wrote down, not a diff computed against the store: the
//  sweep decides which pages are EMPTY, and a person decides where an empty URL
//  is allowed to send a reader. `why` is the second half of the row and the part
//  a reviewer actually reads.
const PROPOSALS = [
  {
    path: '/pages/ap-csa',
    target: '/pages/ap-csa-course',
    why: "the empty page's OWN title and meta description are "
      + '"AP Computer Science A 2026-27: Free Full-Year Course" and "all 4 units, 400+ '
      + 'exercises, a built-in Java editor". /pages/ap-csa-course delivers exactly that: '
      + '"400+ practice exercises, built-in Java code editor on 39 skill lessons", 29,584 '
      + 'characters of it. NOT settled: 13 pages link INTO /pages/ap-csa with the anchor '
      + '"Return to the AP CSA hub", and /pages/ap-csa-exam-prep-hub is the page called that. '
      + 'The page describes itself as the course; the pages linking to it call it the prep hub.',
  },
  {
    path: '/pages/ap-csp',
    target: '/pages/ap-csp-course',
    why: "the empty page's own description is \"all 5 Big Ideas, Python labs, Create Task "
      + 'guidance and exam practice" and /pages/ap-csp-course\'s is "all 5 Big Ideas with Python '
      + 'labs, Create Task prep and exam practice", near word for word. 162 authored links '
      + 'already point at the course, more than at any other CSP hub, and nothing links at all '
      + 'to the empty page.',
  },
];

//  How stale a status code may be before it stops being evidence. A redirect
//  written against a 200 observed last week is written against a guess.
const MAX_EVIDENCE_AGE_MS = 6 * 60 * 60 * 1000;

//  ── THE THRESHOLD, AND THE PAGE THAT CORRECTED IT ──────────────────────────
//  The first version of this asked whether the stored body contained under 40
//  characters of authored TEXT. That is the wrong question, and /pages/ap-csp-
//  test-builder is why: it stores 496,715 characters and its authored text
//  measures ZERO, because the entire body is a client-side application inside a
//  <script> and every text extractor in this repo strips scripts before
//  counting. Its rendered <main> text is 1,561 characters, which is within a
//  hundred of the 1,448 character empty shell, because the app builds its DOM in
//  the browser. So BOTH a text measure and a rendered measure call a working
//  half-megabyte application an empty page.
//
//  The only measure that does not is the size of the stored body itself. A page
//  this sheet may redirect must store LITERALLY NOTHING. Zero, not "nearly
//  zero": there is no defensible number between 0 and 496,715, and picking one
//  is how an instrument confidently reports a convention as a defect.
const EMPTY_STORED_MAX = 0;
//  Kept as a SECOND and independent condition on the same row rather than as
//  the condition. Both must hold.
const EMPTY_TEXT_MAX = 40;
//  A Target has to be a page a reader lands on and finds something. The two
//  real hubs measure 29,584 and 5,946 characters of authored text, so this is a
//  floor well beneath both and well above anything that could be chrome.
const TARGET_MIN_TEXT = 500;

function readEvidence(file) {
  const by = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch (e) { continue; }
    by.set(r.handle, r);
  }
  return by;
}

function handleOf(path) {
  const m = /^\/pages\/([a-z0-9-]+)$/.exec(path);
  return m ? m[1] : null;
}

//  The whole decision, as one pure function, so the smoke suite can put cases
//  through it that the store has never served.
function check(proposals, evidence, verified, now) {
  const problems = [];
  const notes = [];

  const at = verified && verified.at ? Date.parse(verified.at) : NaN;
  if (!verified || !Array.isArray(verified.checks)) {
    problems.push('no verification pass supplied, so no Target has a status code. '
      + 'A redirect written against an unverified Target is a guess.');
    return { rows: [], problems, notes };
  }
  if (!Number.isFinite(at)) problems.push('the verification pass carries no readable timestamp');
  else if (now - at > MAX_EVIDENCE_AGE_MS) {
    problems.push(`the verification pass is ${Math.round((now - at) / 3600000)}h old, past the `
      + `${MAX_EVIDENCE_AGE_MS / 3600000}h limit. Re-run it: a status code decays.`);
  }
  const status = new Map(verified.checks.map((c) => [c.path, c]));

  const paths = new Set(proposals.map((p) => p.path));
  const rows = [];

  for (const p of proposals) {
    const pre = `${p.path}: `;
    if (!handleOf(p.path)) { problems.push(pre + 'not a /pages/<handle> path'); continue; }
    if (!handleOf(p.target)) { problems.push(pre + `target ${p.target} is not a /pages/<handle> path`); continue; }
    if (p.path === p.target) { problems.push(pre + 'redirects to itself'); continue; }
    if (paths.has(p.target)) {
      problems.push(pre + `target ${p.target} is itself a Path in this sheet, so this is a chain`);
      continue;
    }
    if (!p.why || p.why.length < 12) { problems.push(pre + 'no reason recorded for the row'); continue; }

    //  THE PATH. It has to be the empty page this sheet claims it is. If it has
    //  a body, a redirect throws that body away, and nobody would see it go.
    const src = evidence.get(handleOf(p.path));
    if (!src) { problems.push(pre + 'not in the sweep, so its body was never measured'); continue; }
    if (src.outcome !== 'stored') {
      problems.push(pre + `the sweep could not bound its body (${src.outcome}: ${src.why || src.status}). `
        + 'A page on another template is not a page proved empty.');
      continue;
    }
    if (src.stored_chars > EMPTY_STORED_MAX) {
      problems.push(pre + `stores ${src.stored_chars} characters. It is not empty, and a redirect `
        + 'would discard a body nobody reviewed. If its authored TEXT reads as zero, the body is '
        + 'a client-side app inside a <script>, which is what /pages/ap-csp-test-builder is.');
      continue;
    }
    if (src.text_chars > EMPTY_TEXT_MAX) {
      problems.push(pre + `stores ${src.text_chars} characters of authored text. It is not empty, `
        + 'and a redirect would discard content nobody reviewed.');
      continue;
    }

    //  THE TARGET. Verified 200 in this pass, and populated. A redirect onto a
    //  second empty page is a hop to the same nothing.
    const dst = evidence.get(handleOf(p.target));
    const st = status.get(p.target);
    if (!st) { problems.push(pre + `target ${p.target} was not in the verification pass`); continue; }
    if (st.status !== 200) {
      problems.push(pre + `target ${p.target} answered HTTP ${st.status}. A redirect to a non-200 `
        + 'turns a soft landing into a dead one.');
      continue;
    }
    if (!dst || dst.outcome !== 'stored') {
      problems.push(pre + `target ${p.target} has no measured body in the sweep`); continue;
    }
    if (dst.text_chars < TARGET_MIN_TEXT) {
      problems.push(pre + `target ${p.target} stores ${dst.text_chars} characters of authored text, `
        + `under the ${TARGET_MIN_TEXT} floor, so it is empty or near enough. This would redirect `
        + 'nothing to nothing.');
      continue;
    }

    //  THE PATH'S OWN STATUS, which is what makes the import order load-bearing.
    const ps = status.get(p.path);
    if (!ps) { problems.push(pre + 'was not in the verification pass'); continue; }
    if (ps.status === 200) {
      notes.push(`${p.path} still answers 200, so this redirect CANNOT FIRE until the page is `
        + 'deleted or unpublished. That is step 1 and it belongs to a human.');
    }

    rows.push({ path: p.path, target: p.target, why: p.why,
      path_status: ps.status, target_status: st.status,
      path_text: src.text_chars, target_text: dst.text_chars });
  }

  if (rows.length !== proposals.length) {
    problems.push(`${proposals.length - rows.length} of ${proposals.length} proposed rows could not `
      + 'be verified. One unverifiable row refuses the whole sheet, not just its own row.');
  }
  return { rows, problems, notes };
}

//  Command, Path and Target ONLY. A redirects sheet has no Handle and no Body
//  HTML, and adding a fourth column to carry a note would write that note into
//  the store.
function toCsv(rows) {
  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const lines = [['Command', 'Path', 'Target'].map(cell).join(',')];
  for (const r of rows) lines.push([cell('MERGE'), cell(r.path), cell(r.target)].join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

function main(argv) {
  const out = argv[0];
  const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  if (!out || out.startsWith('--') || !opt('evidence') || !opt('verified')) {
    console.error('usage: node scripts/empty-page-redirects-csv.js <out.csv> '
      + '--evidence <sweep.jsonl> --verified <verification.json>');
    process.exit(2);
  }
  if (!/redirect/i.test(out.split(/[\\/]/).pop())) {
    console.error('\n  Refused: a CSV has no tab name, so the FILE NAME is the sheet name. '
      + 'It must contain "redirect" or Matrixify rejects the file before reading a row.\n');
    process.exit(1);
  }

  const evidence = readEvidence(opt('evidence'));
  const verified = JSON.parse(fs.readFileSync(opt('verified'), 'utf8'));
  const res = check(PROPOSALS, evidence, verified, Date.now());

  if (!PROPOSALS.length) {
    console.error('\n  Refused: no rows proposed. Nothing to write.\n');
    process.exit(1);
  }
  if (res.problems.length) {
    console.error(`\n  ${res.problems.length} problem(s). No file written:\n`);
    for (const m of res.problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }

  fs.writeFileSync(out, toCsv(res.rows));
  console.log(`\n  ${res.rows.length} redirect row(s) -> ${out}\n`);
  for (const r of res.rows) {
    console.log(`    ${r.path}  [${r.path_status}, ${r.path_text} chars authored]`);
    console.log(`      -> ${r.target}  [${r.target_status}, ${r.target_text} chars authored]`);
    console.log(`         ${r.why}`);
  }
  console.log('\n  IMPORT ORDER, AND IT IS NOT OPTIONAL:');
  console.log('    Shopify: "If the URL still loads a valid webpage, then the URL redirect');
  console.log('    won\'t work." Every Path above answers 200 today.');
  console.log('      1. a human deletes or unpublishes the empty pages   (NEVER_AUTO)');
  console.log('      2. confirm each Path now 404s');
  console.log('      3. import this sheet');
  console.log('      4. confirm each Path now 301s to its Target');
  for (const n of res.notes) console.log('    note: ' + n);
  console.log('');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PROPOSALS, check, toCsv, readEvidence, handleOf,
  EMPTY_STORED_MAX, EMPTY_TEXT_MAX, TARGET_MIN_TEXT, MAX_EVIDENCE_AGE_MS };
