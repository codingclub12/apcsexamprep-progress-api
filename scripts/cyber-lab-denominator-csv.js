#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  A LAB DENOMINATOR THAT COUNTS THE STEPS THE STUDENT HAS FINISHED.
//
//      node scripts/cyber-lab-denominator-csv.js <out-dir> [--live dir/]
//
//  ---- THE DEFECT -----------------------------------------------------------
//  Ten AP Cyber lab pages write their running score like this:
//
//      var te=0;for(var k in stepScores)te+=stepScores[k];
//      var comp=Object.keys(stepScores).length;
//      document.getElementById('score-display').textContent=te+' / '+(comp*5);
//
//  Every step is worth 5 and every lab has 6 of them, so the lab is out of 30.
//  The denominator written here is 5 times the steps CHECKED SO FAR. Two steps
//  in, a student who earned 10 sees "10 / 10", which reads as a perfect score
//  on a lab they have done a third of.
//
//  ---- WHY IT IS A GRADE AND NOT ONLY A DISPLAY -----------------------------
//  Measured against the asset the storefront actually serves, not against the
//  stale mirror in shopify/:
//
//      assets/apcs-score-reporter.js  RESULT_IDS = ["score-display","r-score",
//        "score-num","finalScore","score-val"], tried IN ORDER, first usable
//        pair wins. score-display is first, so r-score is never reached. A
//        result-tier hit is reported IMMEDIATELY, with no settle delay, and
//        every distinct earned:possible pair is reported once.
//
//      assets/apcs-tracker.js  APCS_saveLessonScore(pct, pair) posts the PAIR
//        to /api/student/score as item 'score', and posts
//        round(earned/possible*100) to /api/student/progress as the activity
//        percent.
//
//  So the pair the gradebook stores for an abandoned run is (te, 5*comp). A
//  student who does two steps of six perfectly is recorded 10 out of 10 on a
//  30 point lab, at 100 percent, and their column denominator is 10 while the
//  student beside them has 30.
//
//  A FINISHED run is correct and always has been, which is why this survived:
//  at comp === totalSteps the denominator arrives at 30 by itself, and the
//  rollup takes MAX(points) over MAX(max_points) per item, so the last pair
//  wins. Only the student who stops early is misreported. That is also the
//  student a teacher is most likely to be looking at.
//
//  ---- WHAT THIS DOES NOT SAY ----------------------------------------------
//  Board 313 records the mechanism as a percentage over 100 being refused by
//  POST /api/student/progress, which would make these pages record nothing.
//  That is not what the deployed code does today. parseScore in the reporter
//  refuses a pair with earned > possible, and te is never more than 5*comp, so
//  nothing over 100 can leave the page now. The 483 percent on the live 2.1
//  Lab column predates the guard. The defect is real and the fix is the same
//  one either way, but it records a WRONG GRADE rather than no grade, so
//  nothing is waiting to be recovered once this lands.
//
//  ---- THE CHANGE -----------------------------------------------------------
//  One substitution per page, to the variable the page already declares:
//
//      te+' / '+(comp*5)   ->   te+' / '+totalPts
//
//  `var totalPts=30` sits earlier in the same script block, and the page
//  already uses it for the results panel: r-score renders te+'/'+totalPts.
//  After this the running display and the results panel agree at every moment
//  instead of only at the end.
//
//  What must NOT move is the line just below, which uses `comp` for a
//  different and correct purpose:
//
//      if(comp===totalSteps){ ...show the results panel... }
//
//  Replace that one and the panel fires on the first answer. The count of that
//  expression is required to survive, every script block has to compile, and
//  the whole change is required to REVERSE byte for byte, which is the check
//  that proves the only difference is the substitution.
//
//  ---- WHAT SHIPS -----------------------------------------------------------
//  Two sheets, one per unit, because MERGE overwrites a live body with no undo
//  and the blast radius of one click is however many rows are in the file. The
//  split is proved lossless here rather than assumed: both sheets are parsed
//  back, the union has to be the same ten handles, no handle may appear twice,
//  and every row has to match the row the generator built.
//
//  Zero PII: public storefront page bodies and nothing else.
//  Pure ASCII source, no em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { pageBody } = require('../lib/storefront-fetch');
const { analyze, acceptRuns } = require('../lib/mojibake');

//  The exact text as the live bodies carry it. Anchored on the element id so a
//  stray (comp*5) somewhere else in the page could never be the thing replaced.
const BAD  = "document.getElementById('score-display').textContent=te+' / '+(comp*5)";
const GOOD = "document.getElementById('score-display').textContent=te+' / '+totalPts";
const KEEP = 'if(comp===totalSteps)';
const RESULTS_LINE = /getElementById\('r-score'\)\.textContent=te\+'\/'\+totalPts/;

const UNITS = {
  'unit-2': [1, 2, 3, 4, 5].map((l) => `ap-cyber-unit-2-lesson-${l}-lab`),
  'unit-3': [1, 2, 3, 4, 5].map((l) => `ap-cyber-unit-3-lesson-${l}-lab`),
};
const HANDLES = [].concat(...Object.values(UNITS));

/** The substitution itself, done by index so nothing outside the window can move. */
function defaultSubstitute(body, at) {
  return body.slice(0, at) + GOOD + body.slice(at + BAD.length);
}

/**
 * Rewrite one lab body, or say why it will not be touched.
 *
 * Every refusal message is matched by name in smoke/cyber-lab-denominator.js,
 * so changing the wording there is changing a test.
 *
 * TWO KINDS OF RULE LIVE HERE AND THEY ARE NOT THE SAME KIND OF CHECK.
 * The rules above the substitution are about the BODY: a real page can violate
 * them, and a mutated fixture proves each one fires. The rules below it are
 * postconditions on the SUBSTITUTION, and with the index splice above they
 * cannot fail, which would make them decoration if they were left at that.
 * They are reachable because the substitution is injectable: the suite passes a
 * saboteur through opts.substitute and requires each postcondition to catch it.
 * That is what keeps them honest when somebody later reaches for a regex.
 *
 * @param {string} handle page handle, for the message only
 * @param {string} body   the live Body HTML
 * @param {{substitute?: function}} [opts] test seam, see above
 * @returns {{out?: string, fail: string[]}}
 */
function transform(handle, body, opts) {
  const substitute = (opts && opts.substitute) || defaultSubstitute;
  const fail = [];

  const n = body.split(BAD).length - 1;
  if (n !== 1) {
    fail.push(`${handle}: the running denominator appears ${n} time(s), expected exactly 1`);
    return { fail };
  }
  if (body.includes(GOOD)) {
    fail.push(`${handle}: the fix is already in this body`);
    return { fail };
  }
  if (!body.includes(KEEP)) {
    fail.push(`${handle}: the completion test is not in the shape this was written for`);
    return { fail };
  }

  const declRe = /var\s+totalPts\s*=\s*(\d+)/;
  const stepsRe = /var\s+totalSteps\s*=\s*(\d+)/;
  const mPts = body.match(declRe);
  const mSteps = body.match(stepsRe);
  if (!mPts) { fail.push(`${handle}: totalPts is not declared in this body`); return { fail }; }
  if (!mSteps) { fail.push(`${handle}: totalSteps is not declared in this body`); return { fail }; }

  //  The substitution is only invisible to a student who FINISHES if the total
  //  the page prices itself at is the same number the old expression arrives
  //  at on the last step. If those disagree, the page is telling a student two
  //  different totals and this is not the change to make.
  if (Number(mPts[1]) !== Number(mSteps[1]) * 5) {
    fail.push(`${handle}: totalPts ${mPts[1]} is not 5 times totalSteps ${mSteps[1]}`);
    return { fail };
  }

  //  Declared before used, and in the SAME script block, or the fixed line
  //  throws a ReferenceError at runtime and the student sees nothing at all.
  const decl = body.search(declRe);
  const use = body.indexOf(BAD);
  if (decl > use) { fail.push(`${handle}: totalPts is declared after the line being fixed`); return { fail }; }
  const blocks = [...body.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => [m.index, m.index + m[0].length]);
  const blockOf = (p) => blocks.findIndex(([s, e]) => p >= s && p < e);
  if (blockOf(decl) === -1 || blockOf(decl) !== blockOf(use)) {
    fail.push(`${handle}: totalPts and the fixed line are in different script blocks`);
    return { fail };
  }

  const out = substitute(body, use);

  if (out.length !== body.length + (GOOD.length - BAD.length)) {
    fail.push(`${handle}: the body changed by more bytes than the substitution`);
  }
  if (out.slice(0, use) !== body.slice(0, use)) {
    fail.push(`${handle}: the text before the fixed line moved`);
  }
  if (out.slice(use + GOOD.length) !== body.slice(use + BAD.length)) {
    fail.push(`${handle}: the text after the fixed line moved`);
  }
  if ((out.split(GOOD).length - 1) !== 1) fail.push(`${handle}: the fixed line is not in the result exactly once`);
  if (out.includes(BAD)) fail.push(`${handle}: the running denominator is still in the result`);
  if ((out.split(KEEP).length - 1) !== (body.split(KEEP).length - 1)) {
    fail.push(`${handle}: the completion test count changed`);
  }
  if (!RESULTS_LINE.test(out)) fail.push(`${handle}: r-score no longer renders the real total`);

  for (const m of out.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/application\/ld\+json/.test(m[0])) {
      try { JSON.parse(m[1]); } catch (e) { fail.push(`${handle}: JSON-LD does not parse: ${e.message}`); }
      continue;
    }
    try { new Function(m[1]); } catch (e) { fail.push(`${handle}: a script block does not compile: ${e.message}`); }
  }

  const mo = acceptRuns(analyze(out, { cap: 10 }));
  if (mo && mo.length) fail.push(`${handle}: mojibake in the result`);

  return fail.length ? { fail } : { out, fail };
}

function csvCell(v) { return `"${String(v).replace(/"/g, '""')}"`; }
const HEADER = ['ID', 'Handle', 'Title', 'Body HTML', 'Command'];
//  Written as a code point so this source stays pure ASCII. Matrixify guesses
//  Latin-1 without it and a bullet arrives as three characters.
const BOM = String.fromCharCode(0xfeff);

function sheetText(rows) {
  const lines = [HEADER.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

/** A reader that did not write the file. Handles quoted cells with commas and newlines. */
function parseCsv(text) {
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function main() {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('usage: node scripts/cyber-lab-denominator-csv.js <out-dir> [--live dir/]');
    process.exit(2);
  }
  const liveIdx = process.argv.indexOf('--live');
  const liveDir = liveIdx > 0 ? process.argv[liveIdx + 1] : null;

  const built = new Map();
  const allFail = [];
  for (const h of HANDLES) {
    const page = liveDir
      ? JSON.parse(fs.readFileSync(path.join(liveDir, h + '.json'), 'utf8'))
      : pageBody(h);
    if (page.handle !== h) { allFail.push(`fetched ${page.handle}, expected ${h}`); continue; }
    const r = transform(h, page.body_html);
    if (r.fail.length) { allFail.push(...r.fail); continue; }
    built.set(h, [String(page.id), page.handle, page.title, r.out, 'MERGE']);
    console.log(`note  ${h.padEnd(30)} one substitution, nothing else moved, compiles`);
  }

  for (const f of allFail) console.log(`FAIL  ${f}`);
  if (allFail.length) { console.error(`\n${allFail.length} check(s) failed. Nothing written.`); process.exit(1); }
  if (built.size !== HANDLES.length) { console.error('\nrow count does not match the handle list'); process.exit(1); }

  fs.mkdirSync(path.resolve(outDir), { recursive: true });
  const written = [];
  for (const [unit, handles] of Object.entries(UNITS)) {
    const file = path.join(outDir, `cyber-lab-denominator-${unit}-pages.csv`);
    fs.writeFileSync(file, sheetText(handles.map((h) => built.get(h))), 'utf8');
    written.push([unit, file, handles]);
  }

  //  PARSE THE FILES BACK. Generation is not evidence that generation worked,
  //  and the split is not evidence that the split kept everything.
  const seen = new Map();
  const problems = [];
  for (const [unit, file, handles] of written) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.charCodeAt(0) !== 0xfeff) problems.push(`${unit}: no BOM`);
    const rows = parseCsv(text);
    const head = rows.shift();
    if (head.join('|') !== HEADER.join('|')) problems.push(`${unit}: header is ${head.join('|')}`);
    if (rows.length !== handles.length) problems.push(`${unit}: ${rows.length} rows, expected ${handles.length}`);
    for (const row of rows) {
      const h = row[1];
      if (seen.has(h)) problems.push(`${h} appears in ${seen.get(h)} and in ${unit}`);
      seen.set(h, unit);
      const src = built.get(h);
      if (!src) { problems.push(`${h} is in a sheet but was never built`); continue; }
      for (let i = 0; i < HEADER.length; i++) {
        if (row[i] !== src[i]) problems.push(`${h}: column ${HEADER[i]} does not survive the round trip`);
      }
    }
  }
  for (const h of HANDLES) if (!seen.has(h)) problems.push(`${h} was built and is in no sheet`);

  for (const p of problems) console.log(`FAIL  ${p}`);
  if (problems.length) { console.error(`\n${problems.length} parse-back problem(s).`); process.exit(1); }

  console.log('');
  for (const [unit, file, handles] of written) {
    console.log(`wrote ${file}  (${fs.statSync(file).size} bytes, ${handles.length} rows, Command MERGE)`);
  }
  console.log(`\nparse-back OK: ${seen.size} handles across ${written.length} sheets, none twice, every cell identical`);
}

module.exports = { transform, defaultSubstitute, parseCsv, sheetText, BOM,
  BAD, GOOD, KEEP, RESULTS_LINE, HANDLES, UNITS, HEADER };

if (require.main === module) main();
