'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  How much of the recorded work is a real pair, and which pages report one.
//
//  Read-only. Every statement is a SELECT, so this is safe to run against the
//  production database. Zero PII: counts only, no names.
//
//  Same data as GET /api/admin/score-sources, printed for a terminal. The
//  endpoint is usually easier on Railway, where there is no shell.
//
//  Run: node scripts/audit-score-sources.js [--course ap-csa] [--detail]
// ─────────────────────────────────────────────────────────────────────────────
const { audit } = require('../lib/score-sources');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const out = audit({ course: arg('--course') });
const pctStr = (n) => (n == null ? '  n/a' : String(n).padStart(5) + '%');

console.log('\nSCORE SOURCES  ' + out.generated_at);
console.log('\n  pair          points earned AND out of how many, both recorded');
console.log('  percent_only  only a percentage; the counts are gone for good');
console.log('  unscored      present but never scored (a visit, or no mark)\n');

if (!out.courses.length) {
  console.log('  No recorded work found.\n');
  process.exit(0);
}

console.log('CELLS  (one student, one activity). This is the ceiling on what a');
console.log('       read-time fix can repair.\n');
console.log('  course              pair  percent  unscored   pair% of scored');
console.log('  ' + '-'.repeat(62));
for (const c of out.courses) {
  console.log('  ' + c.course.padEnd(18)
    + String(c.cells.pair).padStart(5)
    + String(c.cells.percent_only).padStart(9)
    + String(c.cells.unscored).padStart(10)
    + '   ' + pctStr(c.cells.pair_pct));
}
console.log('  ' + '-'.repeat(62));
console.log('  ' + 'ALL'.padEnd(18)
  + String(out.totals.pair).padStart(5)
  + String(out.totals.percent_only).padStart(9)
  + String(out.totals.unscored).padStart(10)
  + '   ' + pctStr(out.totals.pair_pct));

console.log('\n\nCOLUMNS  (one activity, any student). This is the work list: a');
console.log('         column with no pair is a page that needs the reporter.\n');
console.log('  course              total  reporting  percent-only  never scored');
console.log('  ' + '-'.repeat(66));
for (const c of out.courses) {
  console.log('  ' + c.course.padEnd(18)
    + String(c.columns.total).padStart(5)
    + String(c.columns.reports_pairs).padStart(11)
    + String(c.columns.percent_only).padStart(14)
    + String(c.columns.unscored_only).padStart(14));
}
console.log('  ' + '-'.repeat(66));
console.log(`\n  ${out.totals.columns_reporting} of ${out.totals.columns} columns have ever reported a pair` +
  ` (${out.totals.columns_reporting_pct == null ? 'n/a' : out.totals.columns_reporting_pct + '%'}).`);

if (argv.includes('--detail')) {
  for (const c of out.courses) {
    const needs = (c.column_detail || []).filter((x) => x.status !== 'reports_pairs');
    if (!needs.length) continue;
    console.log(`\n  ${c.course}: ${needs.length} columns have never reported a pair`);
    for (const x of needs) {
      console.log(`    ${String(x.unit || '').padEnd(10)} ${String(x.lesson).padEnd(18)} ` +
        `${String(x.activity).padEnd(12)} ${x.status}` +
        (x.students_percent_only ? `  (${x.students_percent_only} students, percent only)` : ''));
    }
  }
} else {
  console.log('  Add --detail to list the columns that have never reported a pair.');
}
console.log('');
