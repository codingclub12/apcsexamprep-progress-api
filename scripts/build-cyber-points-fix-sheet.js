'use strict';
// -----------------------------------------------------------------------------
//  AP CYBER GRADERS THAT AWARD +1 FOR A QUESTION LABELED (2 pts).
//
//  Reported 2026-09-23 by a teacher whose students picked the correct option on
//  Lesson 1.4 Exercise 1, Part 2, question 2 and saw "Technique: +1 - Correct"
//  under a question that says "(2 pts)". The grader increments by one, so the
//  part can never reach its stated 6 and the page can never reach its stated
//  24. Production agrees: of 340 students with a /24 score on that page, not
//  one has ever recorded more than 22.
//
//  -- WHAT IS REPLACED --------------------------------------------------------
//  Each fix below is an exact before/after pair on the live body. Only the
//  increment and the "+1" in the feedback line that sits beside it change. The
//  wording of the feedback is left alone on purpose: rewriting a distractor or
//  a feedback sentence is a content decision, and this sheet is a scoring fix.
//
//  -- WHAT IT REFUSES, PER ROW ------------------------------------------------
//    1  a handle whose live page does not serve
//    2  a "before" string that appears any number of times other than once
//    3  a patched body that still contains any "before" string
//    4  a patched body differing from the live one anywhere except the pairs,
//       proved by length arithmetic and by an inverse round trip
//    5  a patch that introduces a non-ASCII character
//    6  a patched grader whose scripts no longer compile
//
//  One refusal stops the whole run and writes no file.
//
//  Run: node scripts/build-cyber-points-fix-sheet.js [--out <dir>]
//  After importing: node scripts/verify-cyber-points-fix-live.js
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { parseCsv } = require('./build-leaderboard-xss-sheets');
const { preflight, scriptsCompile } = require('./matrixify-preflight');
const { nonAsciiAdded } = require('./build-csp-applied-undefined-sheets');

const HEADER = ['Handle', 'Command', 'Body HTML'];

//  handle -> list of [before, after]. Each before must occur exactly once.
const FIXES = {
  'ap-cyber-unit-1-lesson-4-exercise-1': [
    [
      "if(tech==='adversarial'){susPts++;details.push('<strong>Technique:</strong> +1 ",
      "if(tech==='adversarial'){susPts+=2;details.push('<strong>Technique:</strong> +2 ",
    ],
    [
      "if(c2==='secret'){c1Pts++;details.push('<strong>Voice cloning defense:</strong> +1 ",
      "if(c2==='secret'){c1Pts+=2;details.push('<strong>Voice cloning defense:</strong> +2 ",
    ],
  ],
};

function livePage(h, attempts = 3) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const r = sf.raw('/pages/' + h + '.json');
    if (String(r.code) === '404') throw new Error(h + ': has no live page');
    if (String(r.code) === '200') {
      try {
        const p = JSON.parse(r.body).page;
        if (p && typeof p.body_html === 'string') return p;
        last = 'a 200 with no body_html';
      } catch (e) { last = 'a 200 that is not JSON'; }
    } else last = 'HTTP ' + r.code;
  }
  throw new Error(h + ': ' + attempts + ' attempts, last was ' + last);
}

function count(s, sub) { return s.split(sub).length - 1; }

//  THE PURE HALF. Everything that can damage a live page is decided here, so
//  smoke/cyber-points-fix.js can break each refusal on purpose without a network.
function patchBody(handle, src, pairs) {
  const problems = [];
  for (const [before] of pairs) {
    const n = count(src, before);
    if (n !== 1) problems.push(handle + ': a before string appears ' + n + ' time(s), expected exactly 1: ' + before.slice(0, 60));
  }
  if (problems.length) return { problems };

  let after = src;
  for (const [before, repl] of pairs) after = after.split(before).join(repl);

  let inverse = after;
  for (const [before, repl] of pairs.slice().reverse()) inverse = inverse.split(repl).join(before);

  const delta = pairs.reduce((d, [b, a]) => d + a.length - b.length, 0);
  const checks = [
    [pairs.every(([b]) => !after.includes(b)), 'a before string survived the patch'],
    [after !== src, 'the body did not change'],
    [src.length + delta === after.length, 'more than the declared pairs changed (length)'],
    [inverse === src, 'the change does not reverse to the live body, so something else moved'],
    [nonAsciiAdded(src, after).length === 0, 'the patch introduces non-ASCII'],
    [scriptsCompile(after).bad.length === 0, 'a script in the patched body no longer compiles'],
  ];
  for (const [pass, msg] of checks) if (!pass) problems.push(handle + ': ' + msg);
  if (problems.length) return { problems };
  return { problems, row: { handle, before: src, after } };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function writeSheet(file, rows) {
  const lines = [HEADER.map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.after].map(cell).join(','));
  //  UTF-8 with BOM, QUOTE_ALL, CRLF. MERGE, and no Published At column: a
  //  blank cell is an ERASE and a live time would republish the page as new.
  fs.writeFileSync(file, '\ufeff' + lines.join('\r\n') + '\r\n');
}

function readBack(file, rows) {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\ufeff/, ''));
  const head = parsed.shift();
  if (head.join(',') !== HEADER.join(',')) throw new Error(file + ': header did not survive the round trip');
  if (parsed.length !== rows.length) throw new Error(file + ': ' + parsed.length + ' rows read back, ' + rows.length + ' written');
  for (const rec of parsed) {
    const spec = rows.find((r) => r.handle === rec[0]);
    if (!spec) throw new Error(file + ': unknown handle read back: ' + rec[0]);
    if (rec[1] !== 'MERGE') throw new Error(file + ': ' + rec[0] + ' is not MERGE');
    if (rec[2] !== spec.after) throw new Error(file + ': ' + rec[0] + ': body differs after the round trip');
  }
  return parsed.length;
}

function main(argv) {
  const outAt = argv.indexOf('--out');
  const outDir = outAt > -1 ? argv[outAt + 1] : path.join(__dirname, '..', 'imports', '2026-09-23b');
  fs.mkdirSync(outDir, { recursive: true });

  const problems = [];
  const rows = [];
  for (const handle of Object.keys(FIXES)) {
    let page;
    try { page = livePage(handle); } catch (e) { problems.push(e.message); continue; }
    const out = patchBody(handle, page.body_html, FIXES[handle]);
    if (out.row) rows.push(out.row); else out.problems.forEach((p) => problems.push(p));
  }
  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    problems.forEach((m) => console.error('    ' + m));
    process.exit(1);
  }

  //  The name has to contain "page" or Matrixify rejects the file outright.
  const file = path.join(outDir, 'cyber-grader-points-fix-pages.csv');
  writeSheet(file, rows);
  const back = readBack(file, rows);
  const carrying = {};
  for (const r of rows) carrying[r.handle] = r.before;
  const pf = preflight(file, { expectCommand: 'MERGE', carrying });
  if (pf.problems.length) {
    console.error('\n  Preflight refused:\n');
    pf.problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  console.log('\n  ' + back + ' row(s), preflight clear: ' + path.relative(process.cwd(), file));
  for (const r of rows) console.log('    ' + r.handle + '  ' + FIXES[r.handle].length + ' pair(s)');
  console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig. One sheet at a time.');
  console.log('  Before importing: node scripts/verify-cyber-points-fix-live.js --before');
  console.log('  After importing:  node scripts/verify-cyber-points-fix-live.js\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { FIXES, patchBody, writeSheet, readBack, HEADER };
