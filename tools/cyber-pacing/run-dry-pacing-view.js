'use strict';
// Dry run for the pacing view and the Unit 1 unit-level asset links. Runs on top
// of the day-count reconciliation, since the view derives its schedule from the
// corrected UNITS array. Writes a diff, writes nothing to Shopify.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { transformCommandCenter, evalUnits } = require('./transform-command-center.js');
const { transformPacingView } = require('./transform-pacing-view.js');

const HANDLE = 'cyber-command-center';
const pacing = JSON.parse(fs.readFileSync(path.join(__dirname, 'pacing.json'), 'utf8'));
for (const d of ['backup', 'diffs', '.work/new', '.work/tmp']) fs.mkdirSync(d, { recursive: true });

const orig = fs.readFileSync(`backup/${HANDLE}.html`, 'utf8');
const notes = [];
const afterDays = transformCommandCenter(orig, notes);
const next = transformPacingView(afterDays, notes);
fs.writeFileSync(`.work/new/${HANDLE}.html`, next);

const results = [];
const ok = (name, pass, detail) => results.push({ name, pass, detail: detail || '' });

// Pull PACING and paceDays out of the page and run them for real.
function extract(body, name, kind) {
  const re = kind === 'fn' ? new RegExp(`function\\s+${name}\\s*\\(`) : new RegExp(`var\\s+${name}\\s*=`);
  const i = body.search(re);
  if (i < 0) throw new Error(`${name} not found`);
  const openChar = kind === 'fn' ? '{' : '{';
  const from = body.indexOf(openChar, i);
  let d = 0;
  for (let k = from; k < body.length; k++) {
    if (body[k] === '{') d++;
    else if (body[k] === '}') { d--; if (d === 0) return body.slice(i, k + 1); }
  }
  throw new Error(`${name} not closed`);
}

const units = evalUnits(next);
let paceDays;
try {
  const src = `${extract(next, 'PACING', 'var')};\n${extract(next, 'paceDays', 'fn')};\nreturn paceDays;`;
  // eslint-disable-next-line no-new-func
  paceDays = new Function('UNITS', src)(units);
  ok('1. injected pacing code parses and runs', typeof paceDays === 'function');
} catch (e) {
  ok('1. injected pacing code parses and runs', false, e.message);
}

let rows = [];
if (typeof paceDays === 'function') {
  rows = paceDays();

  // The derived schedule must reproduce the workbook exactly for the 144 unit days.
  const wb = pacing.traditional;
  const mism = [];
  for (let i = 0; i < wb.length; i++) {
    const a = rows[i];
    const b = wb[i];
    const aUnit = a.u === 0 ? (b.unit === 'Intro' ? 'Intro' : b.unit) : `Unit ${a.u}`;
    if (a.n !== b.day) mism.push(`row ${i}: day ${a.n} vs ${b.day}`);
    else if (a.text !== b.content) mism.push(`day ${b.day}: "${a.text}" vs "${b.content}"`);
    else if (a.type !== b.type && !(a.type === 'Intro' && b.type === 'Intro')) mism.push(`day ${b.day}: type ${a.type} vs ${b.type}`);
    else if (aUnit !== b.unit) mism.push(`day ${b.day}: unit ${aUnit} vs ${b.unit}`);
  }
  ok('2. derived schedule matches the workbook day for day', mism.length === 0, mism.slice(0, 3).join(' | '));
  ok('3. 144 unit lesson-days before the review block',
    rows.filter((r) => r.type !== 'Review').length === 144,
    `${rows.filter((r) => r.type !== 'Review').length}`);
  ok('4. review block is 26 days', rows.filter((r) => r.type === 'Review').length === 26,
    `${rows.filter((r) => r.type === 'Review').length}`);

  // Reserved days are exactly the undelivered projects plus the semester final.
  const reserved = rows.filter((r) => r.res).map((r) => r.text);
  const wantReserved = reserved.every((t) => /Unit [245] Project|Semester 1 Final/.test(t));
  ok('5. reserved days are only the undelivered projects and the final',
    wantReserved && reserved.length === 7, `${reserved.length} reserved`);

  // No link is ever produced for a page that does not exist.
  const projLinks = rows.filter((r) => r.type === 'Project' && !r.res).map((r) => r.u);
  ok('6. project links only for units whose page exists',
    [...new Set(projLinks)].sort().join(',') === '1,3', [...new Set(projLinks)].join(','));
}

// Unit 1 asset links
const u1 = units.find((u) => u.n === 1);
ok('7. unit 1 carries exam, project and scenario links',
  !!(u1 && u1.unitSite && u1.unitSite.exam && u1.unitSite.project && u1.unitSite.scenario),
  u1 && u1.unitSite ? Object.keys(u1.unitSite).join(',') : 'none');
ok('8. no other unit gained asset links',
  units.filter((u) => u.n !== 1).every((u) => !u.unitSite));

// Every <script> block on the page must still parse as JavaScript. This is the
// real guard on a large injection: a stray brace would break the whole hub.
const scripts = [...next.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const syntaxErrors = [];
scripts.forEach((src, i) => {
  try { new Function(src); } catch (e) { syntaxErrors.push(`script ${i}: ${e.message}`); }
});
ok('9. every script block still parses as JavaScript',
  syntaxErrors.length === 0 && scripts.length > 0, syntaxErrors.join(' | ') || `${scripts.length} blocks`);

// Every original lesson and material link survives verbatim.
const origLinks = (orig.match(/D\+"[A-Za-z0-9_-]+"/g) || []).sort().join('|');
const newLinks = (next.match(/D\+"[A-Za-z0-9_-]+"/g) || []).sort().join('|');
ok('10. every Drive material link survives', origLinks === newLinks);

function ud(x, y, label) {
  fs.writeFileSync('.work/tmp/a', x); fs.writeFileSync('.work/tmp/b', y);
  try {
    execFileSync('diff', ['-u', '--label', `a/${label}`, '--label', `b/${label}`, '.work/tmp/a', '.work/tmp/b'], { encoding: 'utf8' });
    return '';
  } catch (e) { return e.stdout || ''; }
}
const diff = ud(orig, next, HANDLE);
fs.writeFileSync(`diffs/${HANDLE}.diff`, diff);

console.log('=== cyber-command-center: pacing view + Unit 1 assets dry run ===\n');
for (const c of results) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.name + (c.detail ? '  :: ' + c.detail : ''));
console.log('\nALL PASS: ' + results.every((r) => r.pass));
if (rows.length) {
  console.log(`\nschedule: ${rows.length} rows total`);
  const byType = {};
  rows.forEach((r) => { byType[r.type] = (byType[r.type] || 0) + 1; });
  console.log('  ' + Object.entries(byType).map(([k, v]) => `${k}:${v}`).join('  '));
  console.log('\nfirst 6 and last 3 rows:');
  rows.slice(0, 6).concat(rows.slice(-3)).forEach((r) => console.log(`  ${String(r.n).padStart(3)}  ${r.type.padEnd(8)} ${r.text}${r.res ? '  [RESERVED]' : ''}`));
}
console.log(`\ndiff written: diffs/${HANDLE}.diff (${diff.length} bytes)`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
