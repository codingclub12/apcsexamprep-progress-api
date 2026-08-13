'use strict';
// Dry run for the Command Center day-count reconciliation. Writes a diff, writes
// nothing to Shopify.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { transformCommandCenter, deriveTargets, evalUnits, evalPlanText, findUnitsArray, CHIPS, PLAN } = require('./transform-command-center.js');

const HANDLE = 'cyber-command-center';
const pacing = JSON.parse(fs.readFileSync(path.join(__dirname, 'pacing.json'), 'utf8'));
for (const d of ['backup', 'diffs', '.work/new', '.work/tmp']) fs.mkdirSync(d, { recursive: true });

const src = fs.existsSync(`backup/${HANDLE}.html`) ? `backup/${HANDLE}.html` : `.work/raw/${HANDLE}.html`;
const orig = fs.readFileSync(src, 'utf8');
fs.writeFileSync(`backup/${HANDLE}.html`, orig);

const notes = [];
const next = transformCommandCenter(orig, notes);
fs.writeFileSync(`.work/new/${HANDLE}.html`, next);

// ---- assertions ----
const results = [];
const ok = (name, pass, detail) => results.push({ name, pass, detail: detail || '' });

const before = evalUnits(orig);
const after = evalUnits(next);
const { teach, units } = deriveTargets();

ok('1. UNITS still evaluates as valid JS', Array.isArray(after) && after.length === 5, `${after.length} units`);

// lesson days match the workbook
const badDays = [];
for (const u of after) for (const l of u.lessons) {
  if (teach[l.id] == null) badDays.push(`${l.id} not in workbook`);
  else if (l.days !== teach[l.id]) badDays.push(`${l.id}=${l.days} want ${teach[l.id]}`);
}
ok('2. every lesson days matches the workbook', badDays.length === 0, badDays.join(', '));

// unitDays(u) reproduces the workbook total
const lessonDays = (l) => l.days + (l.act || 0);
const unitDays = (u) => (u.frqDays || 0) + (u.labDays || 0) + (u.testDays || 0) + u.lessons.reduce((a, l) => a + lessonDays(l), 0);
const badTotals = [];
for (const u of after) {
  const want = units[u.n].total;
  const got = unitDays(u);
  if (got !== want) badTotals.push(`unit ${u.n}: ${got} want ${want}`);
}
ok('3. unitDays equals the workbook total per unit', badTotals.length === 0, badTotals.join(', '));

const grand = after.reduce((a, u) => a + unitDays(u), 0);
ok('4. course total is 143 lesson-days', grand === 143, `got ${grand}`);

// quiz days implied by act must equal the workbook's QuizLab count
const badQuiz = [];
for (const u of after) {
  const acts = u.lessons.reduce((a, l) => a + (l.act || 0), 0);
  if (acts !== units[u.n].quizLab) badQuiz.push(`unit ${u.n}: ${acts} act days vs ${units[u.n].quizLab} QuizLab`);
}
ok('5. act days line up with the workbook quiz+lab days', badQuiz.length === 0, badQuiz.join(', '));

// nothing but the numbers changed inside UNITS
const strip = (arr) => JSON.stringify(arr.map((u) => ({
  n: u.n, name: u.name, note: u.note || null,
  lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, ced: l.ced || null, act: l.act, folder: l.folder, mats: l.mats, site: l.site || null, qotd: l.qotd || null })),
})));
ok('6. lesson identity, materials and links untouched', strip(before) === strip(after));

// everything outside the UNITS array and the chip block is byte-identical
const a = findUnitsArray(orig);
const b = findUnitsArray(next);
const outsideOld = orig.slice(0, a.start) + orig.slice(a.end);
const outsideNew = next.slice(0, b.start) + next.slice(b.end);
// Reversing both renderer substitutions must restore the original byte for byte,
// which proves those two blocks are the only changes outside the UNITS array.
const reversed = outsideNew.replace(CHIPS.new, CHIPS.old).replace(PLAN.new, PLAN.old);
ok('7. the two renderer blocks are the only change outside UNITS', reversed === outsideOld);

// planText must name every day from 1 to days+1, with no gap
const planText = evalPlanText(next);
const gaps = [];
for (const u of after) for (const l of u.lessons) {
  const txt = planText(l);
  const covered = new Set();
  for (const m of txt.matchAll(/<b>Days? (\d+)(?:-(\d+))?:<\/b>/g)) {
    const lo = Number(m[1]); const hi = m[2] ? Number(m[2]) : lo;
    for (let d = lo; d <= hi; d++) covered.add(d);
  }
  const want = l.days + (l.act || 0);
  const missing = [];
  for (let d = 1; d <= want; d++) if (!covered.has(d)) missing.push(d);
  if (missing.length) gaps.push(`${l.id} (${l.days}d) missing day ${missing.join(',')}`);
}
ok('8. plan text accounts for every day of every lesson', gaps.length === 0, gaps.slice(0, 4).join(' | '));

// ---- diff ----
function ud(x, y, label) {
  fs.writeFileSync('.work/tmp/a', x); fs.writeFileSync('.work/tmp/b', y);
  try {
    execFileSync('diff', ['-u', '--label', `a/${label}`, '--label', `b/${label}`, '.work/tmp/a', '.work/tmp/b'], { encoding: 'utf8' });
    return '';
  } catch (e) { return e.stdout || ''; }
}
const diff = ud(orig, next, `${HANDLE}`);
fs.writeFileSync(`diffs/${HANDLE}.diff`, diff);

console.log('=== cyber-command-center: day-count reconciliation dry run ===\n');
for (const c of results) console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.name + (c.detail ? '  :: ' + c.detail : ''));
console.log('\nALL PASS: ' + results.every((r) => r.pass));

console.log('\n--- per unit ---');
console.log('  unit  lessons  teach  quiz  lab  test  total   (was)');
for (const u of after) {
  const old = before.find((x) => x.n === u.n);
  console.log(`   ${u.n}      ${String(u.lessons.length).padEnd(7)}${String(u.lessons.reduce((a, l) => a + l.days, 0)).padEnd(7)}` +
    `${String(u.lessons.reduce((a, l) => a + (l.act || 0), 0)).padEnd(6)}${String(u.labDays).padEnd(5)}${String(u.testDays).padEnd(6)}` +
    `${String(unitDays(u)).padEnd(8)}(${unitDays(old)})`);
}
console.log(`  total: ${grand} lesson-days (was ${before.reduce((a, u) => a + unitDays(u), 0)})`);
console.log(`\ndiff written: diffs/${HANDLE}.diff (${diff.length} bytes), ${notes.length} edits`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
