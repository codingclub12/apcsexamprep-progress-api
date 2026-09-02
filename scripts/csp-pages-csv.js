'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP COURSE PAGES: THE MATRIXIFY PAGES SHEET.
//
//  WHAT THIS SHIPS
//  The 53 pages built by lib/csp-course-pages.js:
//
//     35  exercise-2    ap-csp-course-bi{N}-{slug}-exercise-2
//     18  guided notes  ap-csp-course-bi3-{slug}-notes
//
//  These are the CSP pages the Teacher Course Bundle promises per topic and that
//  the site does not have. See the header of lib/csp-course-pages.js for how the
//  gap was measured.
//
//  SAFETY MODEL: EVERY HANDLE MUST BE NEW
//  Same inversion as scripts/intro-java-pages-csv.js. These pages do not exist
//  yet, so the dangerous direction is a handle that DOES match something live:
//  importing it would silently replace a page nobody meant to touch. With --live
//  this aborts on any handle that already exists. There are no takeovers in this
//  set, so there is no allowlist and a collision is always fatal.
//
//  THE HOUSE MATRIXIFY RULES, APPLIED
//    - MERGE mode, so a re-run after a partial import fixes the gaps rather than
//      duplicating the successes.
//    - QUOTE_ALL. Every cell is quoted, because a page body is kilobytes of HTML
//      full of commas and newlines.
//    - utf-8-sig. The BOM is written.
//    - Published At is past-dated to a fixed literal, never now(). A drifting
//      date reorders the whole /pages listing on every import.
//    - Body HTML is present on every row because every row IS a body, and it is
//      never empty: an empty Body HTML cell wipes the live page rather than
//      leaving it alone, and Matrixify reports that as success.
//    - One import at a time.
//
//  WHAT IT REFUSES TO WRITE
//  Nothing at all if any page fails. A partial sheet is worse than no sheet,
//  because the failure is invisible at import time.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  PUBLISHING A SUBSET: --status AND --only-dead
//  Added for board 163, where 17 of the 35 exercise-2 pages were never imported
//  and 18 have been live since 2026-08-26. A sheet for the 17 has to answer one
//  question per row that no offline check can answer: does this handle already
//  resolve on the storefront? --status reads the JSONL that
//  scripts/csp-exercise-2-live-status.js writes and makes the storefront, not a
//  fixture, the authority:
//
//    - a selected handle that is 200 is REFUSED, because writing a Body HTML
//      over a page that exists is a rewrite and not a publish. Those are
//      different acts with different risks and this program only does one.
//    - a selected handle with NO row in the status file is REFUSED. Unmeasured
//      is not the same as missing, and board item #79 records 46 pages of this
//      storefront answering 429 during a crawl. A throttle read as a 404 is how
//      a publish quietly becomes an overwrite.
//    - every internal /pages/ link in the body is checked against the same
//      status file. Publishing a page whose own links 404 is what the nightly
//      crawl exists to catch, so it is caught before the sheet goes out.
//
//  --only-dead selects exactly the handles the status file records as 404, so
//  the row set is measured rather than typed. --expect N refuses a sheet whose
//  row count is not the number that was reviewed.
//
//  CED CODES NEVER REACH A STUDENT
//  The rebuilt Topic 1.1 lesson shipped with 218 Essential Knowledge codes in
//  student-visible text. Both code shapes this site can emit are counted here:
//  the AP Cybersecurity shape (1.1.A.2) through lib/cyber-ek-density.js, which
//  is the module that resolves which citations are protected, and the AP CSP
//  shape (CRD-2.A.1, DAT-1.B, AAP-2.K.4, CSN-1.E.1, IOC-1.A.1) against the same
//  protected spans. An unprotected code in a body refuses the sheet.
//
//  Run:
//    node scripts/csp-pages-csv.js out.csv
//    node scripts/csp-pages-csv.js x2.csv --kind exercise-2
//    node scripts/csp-pages-csv.js notes.csv --kind notes
//    node scripts/csp-pages-csv.js out.csv --unit bi-3
//    node scripts/csp-pages-csv.js out.csv --live pages.json
//    node scripts/csp-pages-csv.js out.csv --kind exercise-2 \
//        --status smoke/fixtures/csp-exercise-2-live-status.jsonl --only-dead --expect 17
//
//  <pages.json> is the raw result of a Shopify Admin API pages query. Both the
//  `nodes` and the `edges` shapes are read.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { allPages } = require('../lib/csp-course-pages');
const { pageFromHandle } = require('../utils');
const ekDensity = require('../lib/cyber-ek-density');

const ROOT = path.join(__dirname, '..');

// Past-dated on purpose, per the house Matrixify rule. A fixed literal rather
// than a computed date, so two runs a month apart produce the same sheet.
const PUBLISHED_AT = '2026-03-01 12:00:00';

const MAX_BODY_BYTES = 200 * 1024;
const MIN_BODY_BYTES = 2 * 1024;

function readLive(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  const nodes = p ? (p.nodes || (p.edges || []).map((e) => e.node)) : [];
  const by = new Map();
  for (const n of nodes) if (n && n.handle) by.set(n.handle, n);
  return by;
}

// Every check that can stop the write. Each returns a list of complaints.
//  THE STOREFRONT, AS MEASURED TODAY, KEYED BY HANDLE.
//  One JSONL row per handle from scripts/csp-exercise-2-live-status.js. A row
//  flagged `unresolved` never got a 200 or a 404 out of the store, so it is kept
//  and treated as an answer to nothing: it refuses any page that depends on it.
function readStatus(file) {
  const by = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const r = JSON.parse(t);
    if (r && r.handle) by.set(r.handle, r);
  }
  return by;
}

//  Every internal page link in a body, with <script> blocks CUT OUT FIRST.
//  A dead-link scan in this repo once read href="/pages/'+prev.handle+'" out of
//  a script block and reported 141 dead links that were string concatenation.
//  An href only means a URL where the HTML parser is the one reading it.
function bodyLinkTargets(body) {
  const markup = String(body).replace(/<script[\s\S]*?<\/script>/g, '');
  const out = new Set();
  for (const m of markup.match(/href="\/pages\/[a-z0-9-]+"/g) || []) {
    out.add(m.slice('href="/pages/'.length, -1));
  }
  return [...out];
}

//  CED codes a student would read, both shapes this site can emit.
//
//  Protection is resolved by lib/cyber-ek-density.js rather than re-decided
//  here. That module is the one place that knows a code inside an EK coverage
//  table, an answer key, a card orientation tag, or a sentence citing the code
//  AS EVIDENCE has earned its place. Re-implementing that judgement would be a
//  second opinion about a convention, which is the exact shape of the three
//  measurements this repo has already had to throw away.
const CSP_CED_RX = /\b(?:CRD|DAT|AAP|CSN|IOC)-\d+\.[A-Z](?:\.\d+)?\b/g;

function cedCodesVisible(body) {
  const found = [];
  //  Shape one: the AP Cybersecurity code, straight from the resolver.
  for (const c of ekDensity.citations(body).citations) {
    if (!c.protectedBy) found.push(c.code);
  }
  //  Shape two: the AP CSP code, which EK_RX cannot match, scored against the
  //  SAME protected spans so the two shapes are judged by one rule.
  const { spans } = ekDensity.protectedSpans(body);
  const isProtected = (i) => spans.some((sp) => sp.a <= i && i < sp.z);
  CSP_CED_RX.lastIndex = 0;
  let m;
  while ((m = CSP_CED_RX.exec(body))) {
    if (!isProtected(m.index)) found.push(m[0]);
  }
  return found;
}

function checkPage(p) {
  const bad = [];
  const body = p.bodyHtml;
  const bytes = Buffer.byteLength(body);

  if (!p.handle || !/^[a-z0-9-]+$/.test(p.handle)) bad.push('handle is not a clean slug');
  if (!p.title || p.title.length < 4) bad.push('title is missing or too short');
  if (!body) bad.push('BODY IS EMPTY, which would wipe the page rather than skip it');
  if (bytes < MIN_BODY_BYTES) bad.push(`body is only ${bytes} bytes, which is not a finished page`);
  if (bytes > MAX_BODY_BYTES) bad.push(`body is ${(bytes / 1024).toFixed(0)} KB, past the sanity ceiling`);

  // Encoding defects that survive a CSV round trip and are invisible until a
  // student reads the page.
  if (body.includes('�')) bad.push('body contains a replacement character');
  if (/Ã[\x80-\xBF]|â€|Â[\x80-\xBF]/.test(body)) bad.push('body contains mojibake');
  if (body.includes('—')) bad.push('body contains an em-dash');
  // eslint-disable-next-line no-control-regex
  const nonAscii = body.match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) bad.push(`body has ${nonAscii.length} non-ASCII character(s), first ${JSON.stringify(nonAscii[0])}`);

  // Theme hazards rather than encoding ones. An entity inside a script block is
  // read as literal text by the JS parser and breaks the block. An attribute
  // carrying &quot; is decoded back to a literal quote on save and breaks the
  // attribute.
  for (const m of body.match(/<script[\s\S]*?<\/script>/g) || []) {
    if (/&(?:amp|quot|lt|gt|#\d+);/.test(m)) bad.push('an HTML entity appears inside a script block');
  }
  if (/="[^"]*&quot;/.test(body)) bad.push('an attribute value contains &quot;');

  // A grid that reflows by itself is the hazard; the house rule is an explicit
  // column count.
  if (/auto-fit|auto-fill/.test(body)) bad.push('a grid uses auto-fit or auto-fill instead of repeat(N,1fr)');

  // SEO, at the same thresholds scripts/verify-artifact.js grades live pages
  // against, so a page cannot be shipped and then flagged by our own auditor.
  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) bad.push(`${h1s} h1 tags, must be exactly 1`);
  const d = String(p.seoDescription || '');
  if (d.length < 70 || d.length > 160) bad.push(`SEO description is ${d.length} chars, must be 70 to 160`);
  if (!p.seoTitle || p.seoTitle.length > 70) bad.push(`SEO title is ${(p.seoTitle || '').length} chars, must be 1 to 70`);

  return bad;
}

// A handle that does not route back to the activity it renders is the whole
// reason this build exists, so it is checked rather than assumed.
//
//   exercise-2  must route to ap-csp, the right unit and lesson, and the
//               activity_type exercise-2, or the reporter files a graded answer
//               under the wrong column.
//   notes       must route to its PARENT lesson as a visit. Notes are ungraded
//               reference, and a notes handle that minted its own lesson id is
//               exactly the bug utils.js already had to fix once.
function checkHandleRouting(p) {
  const r = pageFromHandle(p.handle);
  if (!r) return 'handle does not route at all';
  if (r.course !== 'ap-csp') return `handle routes to ${r.course}, not ap-csp`;
  if (r.unit !== p.unit) return `handle routes to unit ${r.unit}, expected ${p.unit}`;
  if (r.lesson !== p.slug) return `handle routes to lesson ${r.lesson}, expected ${p.slug}`;
  if (p.kind === 'exercise-2' && r.activity_type !== 'exercise-2') {
    return `handle routes as ${r.activity_type}, so graded answers would land in the wrong column`;
  }
  if (p.kind === 'notes' && r.activity_type !== 'lesson') {
    return `notes handle routes as ${r.activity_type}, so reading the notes would be graded`;
  }
  return null;
}

// The bank itself, checked before it is ever rendered. A malformed question is
// far easier to read as a complaint here than as broken markup on a live page.
function checkBank(p, raw) {
  const bad = [];
  if (p.kind !== 'exercise-2') return bad;
  raw.questions.forEach((q, i) => {
    const at = `q${i + 1}`;
    if (!Array.isArray(q.options) || q.options.length !== 4) bad.push(`${at}: needs exactly 4 options`);
    if (!['A', 'B', 'C', 'D'].includes(q.correct)) bad.push(`${at}: correct must be A, B, C or D`);
    for (const L of ['A', 'B', 'C', 'D']) {
      if (!q.why || !q.why[L]) bad.push(`${at}: missing rationale for ${L}`);
    }
    if (!q.stem || q.stem.length < 10) bad.push(`${at}: stem is missing or too short`);
    if (!q.tag) bad.push(`${at}: missing difficulty tag`);
    // Every distractor rationale should say something specific. A rationale that
    // is a restatement of "this is wrong" teaches nothing, and length is the
    // cheapest proxy for that which does not need a human to read all 840.
    for (const L of ['A', 'B', 'C', 'D']) {
      if (q.why && q.why[L] && q.why[L].length < 25) bad.push(`${at}: rationale for ${L} is too thin`);
    }
  });
  return bad;
}

function main(argv) {
  const out = argv[0];
  if (!out || out.startsWith('--')) {
    console.error('usage: node scripts/csp-pages-csv.js <out.csv> [--kind exercise-2|notes]'
      + ' [--unit bi-N] [--only handle,handle] [--live <pages.json>]'
      + ' [--status <status.jsonl> [--only-dead]] [--expect N]');
    process.exit(2);
  }
  const arg = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
  const kind = arg('--kind');
  const unit = arg('--unit');
  const only = arg('--only') ? new Set(arg('--only').split(',')) : null;
  const live = arg('--live') ? readLive(arg('--live')) : null;
  const status = arg('--status') ? readStatus(arg('--status')) : null;
  const onlyDead = argv.includes('--only-dead');
  const expect = arg('--expect') ? Number(arg('--expect')) : null;
  if (onlyDead && !status) {
    console.error('--only-dead needs --status: the set of pages to publish is measured, not typed');
    process.exit(2);
  }

  const everything = allPages();
  const banks = require('../seed/csp-exercise-2');
  const bankBySlug = new Map(banks.map((b) => [b.slug, b]));

  let pages = everything;
  const total = pages.length;
  if (kind) pages = pages.filter((p) => p.kind === kind);
  if (unit) pages = pages.filter((p) => p.unit === unit);
  if (only) pages = pages.filter((p) => only.has(p.handle));
  //  Selection by measurement. A handle with no status row is NOT selected here
  //  and is not silently dropped either: the per-page loop below refuses it, so
  //  a page missing from the probe can never be quietly excluded from a sheet
  //  someone reviewed by row count.
  if (onlyDead) {
    pages = pages.filter((p) => { const r = status.get(p.handle); return r && r.status === 404 && !r.unresolved; });
  }
  if (!pages.length) { console.error('no pages selected'); process.exit(2); }

  const problems = [];

  // Handle uniqueness across the WHOLE set, not just the selection: two pages
  // sharing a handle means the second import silently overwrites the first, and
  // filtering to one of them would hide that.
  const byHandle = new Map();
  for (const p of everything) {
    if (byHandle.has(p.handle)) problems.push(`duplicate handle ${p.handle}`);
    byHandle.set(p.handle, p);
  }

  for (const p of pages) {
    for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);

    //  A CED code a student can read. 218 of them reached students on the
    //  rebuilt Topic 1.1 lesson before anyone noticed, and the code teaches
    //  nothing: it is the teacher's index into the framework. One stops the
    //  sheet.
    //
    //  Deliberately HERE and not in checkPage, which is shared. Running it there
    //  refuses 21 of the 70 CSP handout exercise pages that
    //  lib/csp-exercise-pages.js builds and that went live on 2026-08-22, over
    //  83 codes a student can read today, including question stems written
    //  around the code ("Explain how a pull request satisfies EK CRD-1.B.1's
    //  description"). That is a real defect and it is reported as one, but it is
    //  a different page family, it is already published, and removing those
    //  codes means rewriting the questions. Authoring belongs to a human, so
    //  this program refuses its own rows rather than quietly re-contracting a
    //  generator it was not asked to change.
    const ced = cedCodesVisible(p.bodyHtml);
    if (ced.length) {
      problems.push(`${p.handle}: ${ced.length} CED Essential Knowledge code(s) in `
        + `student-visible text, first ${JSON.stringify(ced[0])}`);
    }

    const routing = checkHandleRouting(p);
    if (routing) problems.push(`${p.handle}: ${routing}`);
    if (p.kind === 'exercise-2') {
      for (const c of checkBank(p, bankBySlug.get(p.slug))) problems.push(`${p.handle}: ${c}`);
    }
    if (live && live.has(p.handle)) {
      const n = live.get(p.handle);
      problems.push(`${p.handle}: a live page ALREADY uses this handle`
        + ` (title ${JSON.stringify(n.title)}). Importing would replace its body.`);
    }

    //  The storefront, measured. This is the check that separates a publish from
    //  a rewrite, and the one no offline fixture can make.
    if (status) {
      const r = status.get(p.handle);
      if (!r) {
        problems.push(`${p.handle}: no row in the status file, so nothing is known`
          + ' about whether this handle already resolves. Unmeasured is not missing.');
      } else if (r.unresolved) {
        problems.push(`${p.handle}: the storefront never answered (${r.error || 'unresolved'}).`
          + ' A throttled request is not a 404.');
      } else if (r.status !== 404) {
        problems.push(`${p.handle}: the storefront serves HTTP ${r.status} for this handle already.`
          + ' Importing a Body HTML over it is a REWRITE, not a publish, and this program only publishes.');
      }

      //  A page whose own links 404 is a page that ships broken. Checked from
      //  the markup only, script blocks removed, against the same measurement.
      for (const target of bodyLinkTargets(p.bodyHtml)) {
        const t = status.get(target);
        if (!t) {
          problems.push(`${p.handle}: links /pages/${target}, which was never probed,`
            + ' so this sheet cannot say the link works');
        } else if (t.unresolved) {
          problems.push(`${p.handle}: links /pages/${target}, which the storefront never answered for`);
        } else if (t.status !== 200) {
          problems.push(`${p.handle}: links /pages/${target}, which returns HTTP ${t.status}`);
        }
      }
    }
  }

  //  A row count nobody reviewed is a different sheet with the same name. When
  //  --expect is given, the sheet is the one that was reviewed or it is nothing.
  if (expect !== null && pages.length !== expect) {
    problems.push(`selected ${pages.length} page(s), --expect said ${expect}.`
      + ' The set moved since it was reviewed, so this is a different sheet.');
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    for (const m of problems.slice(0, 40)) console.error('    ' + m);
    if (problems.length > 40) console.error(`    ... and ${problems.length - 40} more`);
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At',
    'SEO Title', 'SEO Description'];

  const lines = [header.map(cell).join(',')];
  for (const p of pages) {
    lines.push([
      p.handle, 'MERGE', p.title, p.bodyHtml, 'TRUE', PUBLISHED_AT, p.seoTitle, p.seoDescription,
    ].map(cell).join(','));
  }
  const csv = '﻿' + lines.join('\r\n') + '\r\n';
  fs.writeFileSync(out, csv);

  const counts = {};
  for (const p of pages) counts[p.kind] = (counts[p.kind] || 0) + 1;
  const bytes = pages.reduce((n, p) => n + Buffer.byteLength(p.bodyHtml), 0);
  const questions = pages.reduce((n, p) => n + (p.questions || 0), 0);

  console.log('');
  for (const [k, n] of Object.entries(counts)) console.log(`    ${String(n).padStart(3)}  ${k}`);
  console.log(`    ${String(pages.length).padStart(3)}  total  (of ${total} in the build)`);
  if (questions) console.log(`    ${String(questions).padStart(3)}  graded MCQ items, all with four written rationales`);
  console.log(`\n  wrote ${path.relative(ROOT, out) || out}`);
  console.log(`    ${(Buffer.byteLength(csv) / 1024).toFixed(0)} KB sheet, ${(bytes / 1024).toFixed(0)} KB of body HTML`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.');
  console.log('  After the exercise-2 rows land, run scripts/seed-csp-denominators.js --update');
  console.log('  or the new columns are denominated by whatever a student happened to answer.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkPage, checkHandleRouting, checkBank, PUBLISHED_AT,
  readStatus, bodyLinkTargets, cedCodesVisible, CSP_CED_RX };
