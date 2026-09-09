'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PARSE THE SHEET BACK AND DIFF IT AGAINST THE SOURCE.
//
//  Generation is not evidence that generation worked. The CSP sheet lost 90
//  bytes a page while every semantic check passed, and a parse-back diff is
//  what caught it. So this re-reads the CSV as a CSV, pulls the Body HTML out
//  of the cell, and compares it to the page it was built from.
//
//  The property that matters is not "the new code is present". It is that
//  NOTHING ELSE MOVED. The Command Center is a 70 KB body holding a 25-lesson
//  data structure, five Drive links a teacher pays for, and a signed-in
//  gradebook; an import that quietly reflowed any of that would be a far worse
//  outcome than the missing feature this adds. So the check is a partition:
//  everything outside the injected region and the two extended lines must be
//  byte-identical, and it is asserted by RECONSTRUCTING the original from the
//  output rather than by eyeballing a diff.
//
//  Run: node scripts/verify-cc-quiz-key-sheet.js <before.html> <sheet.csv>
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const panel = require('./cyber-cc-quiz-key-panel');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

//  A real CSV read, not a split on commas. The body cell holds commas, quotes
//  and newlines, and a naive reader would pass while proving nothing.
function parseCSV(text) {
  const s = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function main(argv) {
  const [beforePath, csvPath] = argv;
  if (!beforePath || !csvPath) {
    console.error('usage: node scripts/verify-cc-quiz-key-sheet.js <before.html> <sheet.csv>');
    process.exit(2);
  }
  const before = fs.readFileSync(beforePath, 'utf8');
  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

  console.log('\nCOMMAND CENTER QUIZ KEY SHEET, PARSED BACK\n');

  console.log('1. The sheet is one MERGE row for the right page');
  const head = rows[0] || [];
  ok('  header is the six house columns',
    head.join(',') === 'Handle,Command,Title,Body HTML,Published,Published At', head);
  ok('  exactly one data row', rows.length === 2, rows.length);
  const r = rows[1] || [];
  const cell = Object.fromEntries(head.map((h, i) => [h, r[i]]));
  ok('  handle is cyber-command-center', cell.Handle === 'cyber-command-center', cell.Handle);
  ok('  command is MERGE', cell.Command === 'MERGE', cell.Command);
  ok('  Published At is past-dated', cell['Published At'] === '2026-03-01 12:00:00', cell['Published At']);
  ok('  Body HTML is not empty', (cell['Body HTML'] || '').length > 50000, (cell['Body HTML'] || '').length);

  const after = cell['Body HTML'];

  console.log('2. Nothing outside the edit moved, proved by rebuilding the original');
  const M = panel.MARK, E = panel.END;
  //  Both markers are COMMENTS. The closing one used to be `MARK + " end"`,
  //  which puts a bare `end` identifier into the page and throws ReferenceError
  //  the moment the IIFE reaches it. See smoke:cyberquizkeys section 8.
  ok('  both markers are comments, so neither is executable',
    /^\/\*.*\*\/$/.test(M) && /^\/\*.*\*\/$/.test(E), { M, E });
  ok('  the injected region is delimited exactly once at each end',
    after.split(M + '\n').length - 1 === 1 && after.split(E + '\n').length - 1 === 1);
  const start = after.indexOf('  ' + M + '\n');
  const endMark = '  ' + E + '\n\n';
  const end = after.indexOf(endMark) + endMark.length;
  ok('  the region is found', start > 0 && end > start, { start, end });
  //  Cut the region out and undo the four line edits. What is left must be the
  //  input, byte for byte. This is the whole assertion: a reflow anywhere in the
  //  other 69 KB shows up here as a mismatch. Each undo is listed rather than
  //  done by a loose regex, so an edit this script does not know about fails the
  //  comparison instead of being quietly normalized away.
  const UNDO = [
    // the two quizKeyButton call sites
    [`'</span>'+quizKeyButton(l,d[0]);`, `'</span>';`],
    [`</button></span>'+quizKeyButton(l,d[0]);`, `</button></span>';`],
    // the student-quiz gate
    [`\n      var open = d[0]==="quiz" ? quizOpen() : unlocked;`, ``],
    [`      if(!open) return '<span class="mat disabled">'`, `      if(!unlocked) return '<span class="mat disabled">'`],
    // the teacher-quiz gate
    [`    if(mat.key === "quiz") unlocked = quizOpen();\n`, ``],
  ];
  let rebuilt = after.slice(0, start) + after.slice(end);
  for (const [from, to] of UNDO) rebuilt = rebuilt.replace(from, to);
  ok('  the rest of the body is byte-identical to the input', rebuilt === before,
    rebuilt === before ? null : { beforeLen: before.length, rebuiltLen: rebuilt.length,
      firstDiff: (() => { for (let i = 0; i < Math.max(before.length, rebuilt.length); i++)
        if (before[i] !== rebuilt[i]) return { i, before: before.slice(i - 40, i + 40), after: rebuilt.slice(i - 40, i + 40) };
        return null; })() });

  console.log('3. The page still balances and still holds what a teacher pays for');
  //  Balance, not sameness. The injected modal builds its own overlay div in a
  //  JS string, so the COUNT legitimately rises; what must not change is that
  //  opens and closes match, and that they rose by the same amount.
  const divs = (s) => [(s.match(/<div\b/g) || []).length, (s.match(/<\/div>/g) || []).length];
  const [bo, bc] = divs(before), [ao, ac] = divs(after);
  ok('  divs balance in the output', ao === ac, { open: ao, close: ac });
  ok('  and the edit added opens and closes in equal number', ao - bo === ac - bc,
    { addedOpen: ao - bo, addedClose: ac - bc });
  ok('  all 25 STU lessons survive', Object.keys(require('../lib/cyber-cc-quiz-keys').parseSTU(after)).length === 25);
  const drive = (s) => (s.match(/drive\.google\.com|\/d\/1[A-Za-z0-9_-]{10,}/g) || []).length;
  ok('  every Drive link survives', drive(after) === drive(before), { before: drive(before), after: drive(after) });
  ok('  the lab key panel is untouched', after.includes('/* apcs-lab-key panel */'));

  console.log('4. The injected code is valid JavaScript and carries no answers');
  const injected = after.slice(start, end);
  //  Parsing is the weak half. smoke:cyberquizkeys section 8 EXECUTES this same
  //  code in the closure the page provides, which is the only thing that catches
  //  a valid-but-throwing statement like the bare `end` this used to emit.
  let syntaxErr = null;
  try { new Function(injected); } catch (e) { syntaxErr = e.message; }
  ok('  it parses', !syntaxErr, syntaxErr);
  const banks = [...require('../seed/cyber-unit-1-web-quizzes.js'), ...require('../seed/cyber-units-2-5-web-quizzes.js')];
  const leaks = [];
  for (const b of banks) for (const q of b.questions) {
    if (injected.includes(String(q.prompt).slice(0, 40))) leaks.push('prompt ' + q.qid);
    const right = (q.options || [])[q.correct_index];
    if (typeof right === 'string' && right.length >= 12 && injected.includes(right.slice(0, 40))) leaks.push('answer ' + q.qid);
  }
  ok('  no question text and no answer text is in the page', leaks.length === 0, leaks.slice(0, 5));
  ok('  it is ASCII', ![...injected].some((c) => c.charCodeAt(0) > 127),
    [...injected].filter((c) => c.charCodeAt(0) > 127).slice(0, 5));

  console.log('5. Every button names a location the crosswalk justified');
  const map = JSON.parse((injected.match(/var QUIZKEY = (\{.*\});/) || [])[1] || '{}');
  const n = Object.keys(map).length;
  ok('  the crosswalk is present and non-empty', n > 0, n);
  ok('  every entry is a full location', Object.values(map).every((v) =>
    v.course === 'ap-cybersecurity' && /^unit-\d$/.test(v.unit) && v.lesson && v.activity_type === 'quiz'), map);
  ok('  no row is keyed to its own id where the bank disagrees (unit 3 is the test)',
    map['3.4'] && map['3.4'].lesson === '3.3' && map['3.5'] && map['3.5'].lesson === '3.4',
    { '3.4': map['3.4'], '3.5': map['3.5'] });
  ok('  the three unit 1 banks that do not match their page get no button',
    !map['1.3'] && !map['1.4'] && !map['1.5'], Object.keys(map).filter((k) => k.startsWith('1.')));
  ok('  and the three locations with no bank get none either',
    !map['2.3'] && !map['3.6'] && !map['4.1'], { '2.3': map['2.3'], '3.6': map['3.6'], '4.1': map['4.1'] });

  console.log('6. The gate is entitlement, not the free-unit preview');
  ok('  one predicate decides every quiz surface', /function quizOpen\(\)\{ return !!STATE\.entitled; \}/.test(injected));
  ok('  and it never consults unlocked', !/quizOpen[\s\S]{0,120}unlocked/.test(injected));
  //  The other half of "student and teacher": both call sites in the page body,
  //  not just the key. smoke:cyberquizkeys section 9 runs them; this only checks
  //  the sheet carries them, which is the half a CSV can be asked about.
  ok('  the teacher quiz document is routed through it',
    after.includes('if(mat.key === "quiz") unlocked = quizOpen();'), null);
  ok('  the student quiz link is routed through it',
    after.includes('var open = d[0]==="quiz" ? quizOpen() : unlocked;'), null);
  ok('  and no OTHER destination is', !/d\[0\]==="(page|ex1|ex2|termlab)"/.test(after));
  ok('  the key is fetched with the teacher bearer',
    /Authorization:"Bearer "\+STATE\.token/.test(injected));
  ok('  from the gated key endpoint', /\/api\/quiz\/"/.test(injected) && /"\/key"/.test(injected));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

if (require.main === module) main(process.argv.slice(2));
