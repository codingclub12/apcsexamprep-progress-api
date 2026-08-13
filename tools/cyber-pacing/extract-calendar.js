'use strict';
// Converts the AP Cybersecurity course calendar workbook into pacing.json, the
// data file the Command Center pacing view renders from.
//
//   node tools/cyber-pacing/extract-calendar.js <workbook.xlsx> [out.json]
//
// The workbook is the source of truth for the year plan. Totals are validated
// against the Notes sheet, so a workbook edit that changes a unit's day count
// fails here rather than silently shipping a wrong calendar.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2];
const out = process.argv[3] || path.join(__dirname, 'pacing.json');
if (!src) {
  console.error('usage: extract-calendar.js <workbook.xlsx> [out.json]');
  process.exit(2);
}

// Reuse the python sheet dumper; it needs no third-party packages.
const dump = execFileSync('python3', [path.join(__dirname, 'dump-xlsx.py'), src], { encoding: 'utf8', maxBuffer: 1 << 26 });

// Split the dump into sheets.
const sheets = {};
let current = null;
for (const line of dump.split('\n')) {
  const m = /^===== SHEET \d+: (.+) =====$/.exec(line);
  if (m) { current = m[1]; sheets[current] = []; continue; }
  if (current) sheets[current].push(line);
}

const cells = (line) => line.split(' | ').map((s) => s.trim());
const blank = (r) => r.every((c) => c === '');

// ---- Traditional 5-Day: Your date | Week | Day | Lesson-day # | Unit | Content | Type
function parseTraditional(lines) {
  const rows = [];
  for (const line of lines) {
    const c = cells(line);
    if (c.length < 7 || blank(c)) continue;
    if (c[3] === 'Lesson-day #') continue;
    const day = Number(c[3]);
    if (!Number.isInteger(day)) continue; // review block rows use ranges, handled separately
    rows.push({ day, week: c[1], weekday: c[2], unit: c[4], content: c[5], type: c[6] });
  }
  return rows;
}

// ---- Block Schedule: Your date | Week | Meeting | Unit | First half | Second half | Type
function parseBlock(lines) {
  const rows = [];
  for (const line of lines) {
    const c = cells(line);
    if (c.length < 7 || blank(c)) continue;
    if (c[2] === 'Meeting' || !c[2]) continue;
    if (!/^(Block \d|Friday)/.test(c[2])) continue;
    rows.push({ week: c[1], meeting: c[2], unit: c[3], first: c[4], second: c[5], type: c[6] });
  }
  return rows;
}

// ---- AP Review: Your date | Lesson-day # | Block | What to do | Type
function parseReview(lines) {
  const rows = [];
  for (const line of lines) {
    const c = cells(line);
    if (c.length < 5 || blank(c)) continue;
    if (c[1] === 'Lesson-day #' || !c[2]) continue;
    rows.push({ days: c[1], block: c[2], what: c[3], type: c[4] });
  }
  return rows;
}

// ---- Notes and Unit 3 Mapping: two-column key/value tables
function parsePairs(lines, minCols) {
  const rows = [];
  for (const line of lines) {
    const c = cells(line);
    if (c.length < minCols || blank(c)) continue;
    rows.push(c);
  }
  return rows;
}

const traditional = parseTraditional(sheets['Traditional 5-Day'] || []);
const block = parseBlock(sheets['Block Schedule'] || []);
const review = parseReview(sheets['AP Review'] || []);
const notesRows = parsePairs(sheets['Notes'] || [], 2);
const u3Rows = parsePairs(sheets['Unit 3 Mapping'] || [], 3);

// ---- derive per-unit spans from the traditional schedule
const units = {};
for (const r of traditional) {
  if (!/^Unit \d$/.test(r.unit)) continue;
  const n = Number(r.unit.split(' ')[1]);
  const u = units[n] || (units[n] = { unit: n, firstDay: r.day, lastDay: r.day, days: 0, byType: {} });
  u.firstDay = Math.min(u.firstDay, r.day);
  u.lastDay = Math.max(u.lastDay, r.day);
  u.days++;
  u.byType[r.type] = (u.byType[r.type] || 0) + 1;
}

// ---- validate against the Notes sheet totals
const notesMap = {};
for (const r of notesRows) notesMap[r[0]] = r[1];
const stated = {};
for (let n = 1; n <= 5; n++) {
  const txt = notesMap[`Unit ${n}`] || '';
  const m = /=\s*(\d+)/.exec(txt);
  if (m) stated[n] = Number(m[1]);
}

const problems = [];
for (let n = 1; n <= 5; n++) {
  if (!units[n]) { problems.push(`unit ${n} missing from the traditional schedule`); continue; }
  if (stated[n] != null && stated[n] !== units[n].days) {
    problems.push(`unit ${n}: schedule has ${units[n].days} lesson-days, Notes sheet states ${stated[n]}`);
  }
}
const totalStated = /(\d+)\s*lesson-days/.exec(notesMap.Total || '');
const totalCounted = Object.values(units).reduce((a, u) => a + u.days, 0);
if (totalStated && Number(totalStated[1]) !== totalCounted) {
  problems.push(`total: schedule has ${totalCounted} unit lesson-days, Notes sheet states ${totalStated[1]}`);
}
// lesson-day numbers must be a contiguous run with no gaps or repeats
const dayNums = traditional.map((r) => r.day).sort((a, b) => a - b);
for (let i = 1; i < dayNums.length; i++) {
  if (dayNums[i] !== dayNums[i - 1] + 1) problems.push(`lesson-day sequence breaks at ${dayNums[i - 1]} -> ${dayNums[i]}`);
}

const payload = {
  source: path.basename(src),
  generatedBy: 'tools/cyber-pacing/extract-calendar.js',
  totals: { unitLessonDays: totalCounted, scheduleRows: traditional.length },
  units: Object.values(units).sort((a, b) => a.unit - b.unit),
  traditional,
  block,
  review,
  notes: notesRows.map((r) => ({ key: r[0], value: r[1] })),
  unit3Mapping: u3Rows.map((r) => ({ guide: r[0], days: r[1], siteLesson: r[2] })),
};

fs.writeFileSync(out, JSON.stringify(payload, null, 2));

console.log(`traditional rows : ${traditional.length}`);
console.log(`block rows       : ${block.length}`);
console.log(`review rows      : ${review.length}`);
console.log(`notes rows       : ${notesRows.length}`);
console.log(`unit3 mapping    : ${u3Rows.length}`);
console.log('\nper unit (from the schedule, validated against Notes):');
for (const u of payload.units) {
  console.log(`  Unit ${u.unit}: days ${u.firstDay}-${u.lastDay} = ${String(u.days).padStart(2)} lesson-days` +
    `  ${Object.entries(u.byType).map(([k, v]) => k + ':' + v).join(' ')}` +
    `  [Notes says ${stated[u.unit] != null ? stated[u.unit] : '?'}]`);
}
console.log(`\ntotal unit lesson-days: ${totalCounted}`);
console.log(problems.length ? '\nVALIDATION FAILED:\n  ' + problems.join('\n  ') : '\nVALIDATION PASSED');
console.log(`\nwrote ${out}`);
process.exit(problems.length ? 1 : 0);
