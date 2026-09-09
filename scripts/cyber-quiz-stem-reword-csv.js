'use strict';
// -----------------------------------------------------------------------------
//  MATRIXIFY SHEET: take the CED citations out of five quiz STEMS, so the last
//  two held-back cyber quizzes can migrate to the server.
//
//  WHY THIS EXISTS
//  scripts/extract-cyber-quizzes.js refuses a question that puts a CED citation
//  in front of a student, and the refusal is all-or-nothing per quiz: seeding
//  the rest would leave a student taking a four-question instrument where the
//  page shows five. Two whole quizzes, 2.3 and 4.1, are held back over five
//  stems. This sheet edits those five stems on the live pages. The extractor
//  re-derives from the live page, so there is no seed file to touch afterwards.
//
//  THE RULE BEING ENFORCED is the one in CLAUDE.md: the code is teacher
//  knowledge. A code earns its place in an EXPLANATION, which ships only after a
//  teacher releases the key, and in a teacher-facing answer key. These five are
//  all in stems, which every student reads.
//
//  WHAT IS DELIBERATELY NOT TOUCHED, and it is most of what the pages contain:
//    - every checkMCQ() explanation and every fb-exp / fb-distractors / fb-tip
//      block. Those are the released-key layer, and citing there is the rule
//      working rather than failing.
//    - the 2.3 page header, "(CED 2.3.A to 2.3.B)". A teacher-facing coverage
//      label, not a question.
//    - the 4.1 unit nav rail, which labels 4.5 "beyond the CED". Same reason,
//      and that label is load-bearing: 4.5 is enrichment and has no gradebook
//      column, so dropping the word would misdescribe the page.
//
//  FOUR OF THE FIVE ARE DELETIONS that change nothing the question asks. The
//  fifth is a real edit, and it is why this shipped as a document first:
//
//    q6 asked "which CIA principle does the CED most directly associate with
//    it?". Deleting the words silently converts "what does the framework say"
//    into "what should you reason", which is the substitution the refusal exists
//    to prevent. So it is REPLACED rather than trimmed, and the key was CHECKED
//    against the four options rather than assumed:
//
//      key       C, "Worm, most directly tied to Availability"
//      scenario  self-replicates with no user action, degrades performance
//      under the replacement, a worm degrading a network most directly
//      THREATENS availability, so C still stands. D also says Availability but
//      names a logic bomb, which does not self-replicate, so the malware-type
//      half still discriminates and the item keeps its distractor.
//
//    Assertion 4 pins that: every checkMCQ() call is byte-identical afterwards,
//    so this sheet cannot move an answer even if the reasoning above were wrong.
//
//  ANCHORS ARE READ OFF THE LIVE PAGE, NEVER RETYPED. Each edit names a literal
//  that must occur EXACTLY ONCE in the fetched body; zero or two is a refusal.
//  The pages carry curly quotes and en dashes, and retyping a stem is how site
//  3.3 and 3.4 became each other's CED topics.
//
//  ASSERTIONS, all of which must hold before a row is written:
//    1 each anchor occurs exactly once, and the replacement is not already there
//    2 the edited body is shorter by exactly the expected delta, and reversing
//      the five replacements reproduces the original byte for byte
//    3 no citation survives in any STEM, judged by the extractor's own parser
//      and lib/quiz-citation.js rather than by a second opinion about the rule
//    4 every checkMCQ() call, every fb-exp and every fb-distractors block is
//      byte-identical to the original: no answer and no explanation moved
//    5 div open/close balance matches the original exactly
//    6 the extractor, run against the edited bodies, ACCEPTS both quizzes with
//      no problems and returns the question count the live page shows
//
//  Six is the one that matters. One to five say the edit was surgical; six says
//  it achieved the thing the edit was for. A sheet that cleaned the stems and
//  still tripped some other refusal would pass every other check here.
//
//  STALENESS. Assertion 1 refuses when the replacement text is ALREADY live,
//  which is what a sheet generated before somebody else fixed the same page
//  looks like. Re-run this before importing, not only after: a sheet whose
//  defect is already gone is a sheet to delete.
//
//  That check has one FALSE REFUSAL worth knowing about, because it will look
//  like a bug to whoever hits it. An edit that only trims the END of its anchor
//  makes `put` a prefix of `find`, so `put` is trivially already in the body and
//  the sheet refuses a perfectly good deletion. Found while mutation testing
//  assertion 5, which could not be reached until its mutation stopped being a
//  tail trim. The fix is to widen the anchor so `put` is not a substring, never
//  to weaken the check: it fails CLOSED, and a stale sheet importing over a page
//  somebody already fixed is the failure it exists to prevent.
//
//  House Matrixify rules: MERGE, QUOTE_ALL, utf-8-sig, past-dated Published At,
//  Body HTML never empty. One import at a time, one file per unit.
//
//  THIS WRITES A FILE AND NOTHING ELSE. It calls no Shopify mutation. Importing
//  is a human action and MERGE overwrites a live body with no undo.
//
//  Run: node scripts/cyber-quiz-stem-reword-csv.js <out-dir>
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const os = require('os');
const sf = require('../lib/storefront-fetch');
const { citationsIn } = require('../lib/quiz-citation');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const BOM = '\uFEFF';

//  Each anchor is a literal that must appear exactly once in the live body.
//  `why` is what goes in the runbook next to the row.
const EDITS = [
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    q: 'q2',
    find: '</strong> according to the AP CED?',
    put: '</strong>?',
    why: 'Each numbered statement is true or false on the technical claim. A student who cannot evaluate III is not helped by being told where it came from.',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    q: 'q3',
    find: 'with a valid CED defense',
    put: 'with a valid defense',
    why: 'The pairings are right or wrong on the security, not on whether the CED lists them.',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    q: 'q5',
    find: 'Using the CED High/Moderate/Low',
    put: 'Using the High/Moderate/Low',
    why: 'The framework is taught in the lesson. Naming its source is a citation and nothing else.',
  },
  {
    handle: 'ap-cyber-unit-4-lesson-1-quiz',
    q: 'q6',
    find: 'which CIA principle does the CED most directly associate with it?',
    put: 'which CIA principle does it most directly threaten?',
    why: 'The only real edit. Trimming the words would turn a question about the framework into a question about reasoning, so it is replaced. Key C checked unchanged against all four options.',
  },
  {
    handle: 'ap-cyber-unit-2-lesson-3-quiz',
    q: 'w4',
    find: 'ranked wrongly under EK 2.3.B.8, which prioritizes mitigations by',
    put: 'ranked wrongly: mitigations are prioritized by',
    why: 'The stem already states the rule in the same sentence, which is why this one is safe. The code adds nothing a student can use and everything a student can search.',
  },
];

//  Regions that must survive byte for byte. Assertion 4.
const PRESERVE = [
  { name: 'checkMCQ calls', re: /checkMCQ\((?:[^()]|\([^()]*\))*\)/g },
  { name: 'fb-exp blocks', re: /<div class="fb-exp">[\s\S]*?<\/div>/g },
  { name: 'fb-distractors blocks', re: /<div class="fb-distractors">[\s\S]*?<\/div>/g },
];

const countDivs = (s) => ({
  open: (s.match(/<div\b/gi) || []).length,
  close: (s.match(/<\/div>/gi) || []).length,
});

const csvCell = (s) => '"' + String(s).replace(/"/g, '""') + '"';

function fail(msg) {
  console.error('\nREFUSED: ' + msg + '\n');
  process.exit(1);
}

//  Title is read off the page rather than composed, so a MERGE cannot rename it.
function titleOf(body, handle) {
  const m = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : handle;
}

function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function main() {
  const outDir = process.argv[2];
  if (!outDir) fail('usage: node scripts/cyber-quiz-stem-reword-csv.js <out-dir>');
  fs.mkdirSync(outDir, { recursive: true });

  const handles = [...new Set(EDITS.map((e) => e.handle))].sort();
  const rows = [];
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'stem-reword-'));

  for (const handle of handles) {
    const before = sf.pageBody(handle).body_html;
    const mine = EDITS.filter((e) => e.handle === handle);
    let after = before;
    let expectedDelta = 0;

    //  1. anchors
    for (const e of mine) {
      const hits = before.split(e.find).length - 1;
      if (hits !== 1) {
        fail(`${handle} ${e.q}: anchor occurs ${hits} times, expected exactly 1.\n  ${JSON.stringify(e.find)}`);
      }
      if (before.includes(e.put)) {
        fail(`${handle} ${e.q}: the replacement is ALREADY in the live body, so this sheet is stale. ` +
          'Somebody has fixed this stem since it was written. Check the live page and delete the sheet.');
      }
      after = after.split(e.find).join(e.put);
      expectedDelta += e.find.length - e.put.length;
    }

    //  2. the change is exactly the five spans and nothing else
    if (before.length - after.length !== expectedDelta) {
      fail(`${handle}: length delta ${before.length - after.length}, expected ${expectedDelta}`);
    }
    let probe = after;
    for (const e of mine) probe = probe.split(e.put).join(e.find);
    if (probe !== before) fail(`${handle}: the edit touched bytes outside the anchored spans`);

    //  4. nothing in the released-key layer moved
    for (const p of PRESERVE) {
      const a = before.match(p.re) || [];
      const b = after.match(p.re) || [];
      if (a.length !== b.length || a.join(' ') !== b.join(' ')) {
        fail(`${handle}: ${p.name} changed (${a.length} before, ${b.length} after). ` +
          'This sheet must not be able to move an answer or an explanation.');
      }
    }

    //  5. div balance
    const d0 = countDivs(before);
    const d1 = countDivs(after);
    if (d0.open !== d1.open || d0.close !== d1.close) {
      fail(`${handle}: div balance moved, ${d0.open}/${d0.close} to ${d1.open}/${d1.close}`);
    }

    fs.writeFileSync(path.join(stage, handle + '.html'), after);
    rows.push({ handle, before, after, edits: mine });
  }

  //  3 and 6. Ask the extractor itself, against the edited bodies. Its problems
  //  array is module-level and accumulates, so snapshot the length first.
  const ex = require('./extract-cyber-quizzes.js');
  const problemsBefore = ex.problems.length;
  const quizzes = ex.extract(stage);
  const newProblems = ex.problems.slice(problemsBefore);
  if (newProblems.length) {
    fail('the extractor still refuses after the edit:\n  ' + newProblems.join('\n  '));
  }
  if (quizzes.length !== handles.length) {
    fail(`extractor returned ${quizzes.length} quizzes, expected ${handles.length}`);
  }
  for (const qz of quizzes) {
    for (const q of qz.questions) {
      const hits = citationsIn(q);
      if (hits.length) {
        fail(`${qz.location.lesson} ${q.qid}: citation survives in ${hits[0].where}: ${hits[0].text}`);
      }
    }
  }

  //  One file per unit, because a MERGE has no undo and the blast radius of one
  //  click is however many rows are in the file.
  const head = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const written = [];
  for (const r of rows) {
    const unit = r.handle.match(/unit-(\d)/)[1];
    const file = path.join(outDir, `Pages cyber-unit${unit}-quiz-stem-rewords.csv`);
    const line = [r.handle, 'MERGE', titleOf(r.before, r.handle), r.after, 'TRUE', PUBLISHED_AT];
    fs.writeFileSync(file, BOM + head.map(csvCell).join(',') + '\n' + line.map(csvCell).join(',') + '\n', 'utf8');
    written.push({ file, handle: r.handle, unit });
  }

  //  Parse the sheets back and diff against what went in. Generation is not
  //  evidence that generation worked; the CSP sheet lost 90 bytes a page while
  //  every semantic check passed, and a parse-back diff is what caught it.
  for (const w of written) {
    const raw = fs.readFileSync(w.file, 'utf8');
    if (raw[0] !== BOM) fail(`parse-back: ${w.file} lost its BOM`);
    const body = raw.slice(1);
    const nl = body.indexOf('\n');
    const cells = parseCsvRow(body.slice(nl + 1).replace(/\n$/, ''));
    const src = rows.find((r) => r.handle === w.handle);
    if (cells[0] !== w.handle) fail(`parse-back: handle mismatch in ${w.file}`);
    if (!cells[3].length) fail(`parse-back: empty Body HTML in ${w.file}`);
    if (cells[3] !== src.after) {
      fail(`parse-back: Body HTML round-trips to ${cells[3].length} bytes, wrote ${src.after.length}`);
    }
  }

  //  The ORIGINAL bodies, so scripts/matrixify-preflight.js can tell an emoji
  //  this sheet introduced from one it is carrying through. Both pages already
  //  had emoji in their headers; with no original, the preflight's safe reading
  //  is "introduced" and it refuses, which is the correct default.
  const carrying = path.join(outDir, 'carrying.json');
  fs.writeFileSync(carrying, JSON.stringify(
    Object.fromEntries(rows.map((r) => [r.handle, r.before])), null, 1));

  console.log('\n  Five stems, two pages. Both quizzes accepted by the extractor afterwards.\n');
  for (const r of rows) {
    console.log(`  ${r.handle}  ${r.edits.length} edit(s)  ${r.before.length} -> ${r.after.length} bytes`);
    for (const e of r.edits) console.log(`      ${e.q}  ${JSON.stringify(e.find)}\n          -> ${JSON.stringify(e.put)}`);
  }
  console.log('');
  for (const qz of quizzes) {
    console.log(`  extractor accepts ${qz.location.lesson}: ${qz.questions.length} questions, 0 citations in any stem`);
  }
  console.log('');
  for (const w of written) console.log('  wrote ' + w.file);
  console.log('  wrote ' + carrying + '   originals, for matrixify-preflight --carrying');
  console.log('\n  Import one file at a time. MERGE overwrites a live body with no undo.\n');
}

if (require.main === module) main();
module.exports = { EDITS, parseCsvRow };
