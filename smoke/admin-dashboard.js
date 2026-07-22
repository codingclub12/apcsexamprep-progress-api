'use strict';
/*
 * Admin dashboard smoke test  (progress-api)
 * ==========================================
 * The core value of the admin dashboard is the class-bucketing rule. It used to
 * live in analysis chat and get re-derived by hand, which once produced a bad
 * number (39 external students reported when the truth was ~13, because test
 * classes got bucketed as external). classifyClass() in lib/admin-metrics.js is
 * now the ONE definition, and this test pins it so a future edit cannot quietly
 * re-open that error.
 *
 * This is a pure-node unit test (no browser, no live API, no DB writes): it
 * imports classifyClass directly, the same function the dashboard uses, and
 * asserts each bucket plus the reconciliation invariant (total == sum of
 * buckets) that is the guard against the 39-vs-13 class of mistake.
 *
 * Run:  npm run smoke:admin      (or: node smoke/admin-dashboard.js)
 */

const path = require('path');
const { classifyClass } = require(path.join(__dirname, '..', 'lib', 'admin-metrics'));

let failures = 0;
function check(name, got, want) {
  const pass = got === want;
  if (!pass) failures++;
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${name}${pass ? '' : ` :: got ${got}, want ${want}`}`);
}

console.log('classifyClass bucketing');

// SOLO
check('ME- code is solo', classifyClass({ class_code: 'ME-3A2J', teacher_email: 'solo@system.invalid', teacher_name: 'Solo Accounts' }), 'SOLO');
check('solo system email is solo', classifyClass({ class_code: 'CSA-XXXX', teacher_email: 'solo@system.invalid' }), 'SOLO');
check('ME- code wins over external-looking email', classifyClass({ class_code: 'me-abcd', teacher_email: 'teacher@school.edu' }), 'SOLO');

// TANNER (owner)
check('owner email is tanner', classifyClass({ class_code: 'CSA-CQ3G', teacher_email: 'tannercrow12@gmail.com', teacher_name: 'Tanner' }), 'TANNER');
check('owner email case-insensitive', classifyClass({ class_code: 'CSP-CHSH', teacher_email: 'TannerCrow12@Gmail.com' }), 'TANNER');

// PROBER (test / spam)
check('kinws.com is prober', classifyClass({ class_code: 'CYBER-Q9JG', teacher_email: 'someone@kinws.com' }), 'PROBER');
check('a@a.comsss is prober', classifyClass({ class_code: 'CYBER-ABCD', teacher_email: 'a@a.comsss' }), 'PROBER');

// AUDIT
check('AUDIT in name is audit', classifyClass({ class_code: 'CYBER-KK4L', teacher_email: 'x@example.com', teacher_name: 'AUDIT DELETE ME' }), 'AUDIT');
check('apcse-audit-delete in email is audit', classifyClass({ class_code: 'CYBER-KK4L', teacher_email: 'apcse-audit-delete@example.com' }), 'AUDIT');

// EXTERNAL (the real adoption)
check('real teacher is external', classifyClass({ class_code: 'CSA-BRKM', teacher_email: 'jbrockman@hcps.net', teacher_name: 'Jim Brockman' }), 'EXTERNAL');
check('empty row defaults to external', classifyClass({}), 'EXTERNAL');

// The 39-vs-13 regression guard: a mixed fleet must reconcile exactly, and the
// test/system rows must NOT land in EXTERNAL.
console.log('reconciliation invariant (total == sum of buckets)');
const fleet = [
  { class_code: 'CSA-BRKM', teacher_email: 'jbrockman@hcps.net',       teacher_name: 'Jim Brockman' }, // external
  { class_code: 'CSP-GOEB', teacher_email: 'mgoebel@sarasotacountyschools.net', teacher_name: 'mark goebel' }, // external
  { class_code: 'ME-3A2J',  teacher_email: 'solo@system.invalid',      teacher_name: 'Solo Accounts' }, // solo
  { class_code: 'CSA-CQ3G', teacher_email: 'tannercrow12@gmail.com',   teacher_name: 'Tanner' }, // tanner
  { class_code: 'CYBER-KK4L', teacher_email: 'x@example.com',          teacher_name: 'AUDIT DELETE' }, // audit
  { class_code: 'CYBER-Q9JG', teacher_email: 'probe@kinws.com',        teacher_name: 'Probe' }, // prober
];
const counts = { SOLO: 0, TANNER: 0, PROBER: 0, AUDIT: 0, EXTERNAL: 0 };
for (const c of fleet) counts[classifyClass(c)]++;
const sum = counts.SOLO + counts.TANNER + counts.PROBER + counts.AUDIT + counts.EXTERNAL;
check('bucket sum equals total', sum, fleet.length);
check('external count is exactly the two real teachers', counts.EXTERNAL, 2);
check('no test/system rows leaked into external', counts.EXTERNAL, 2);

console.log(failures ? `\nFAILED (${failures})` : '\nOK');
process.exit(failures ? 1 : 0);
