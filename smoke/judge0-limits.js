'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Judge0 run limits.
//
//  WHY THESE TWO NUMBERS DESERVE A TEST
//  They are the difference between a classroom that works and one that stops
//  mid lesson, and between a bill that can run away and one that cannot. Neither
//  failure announces itself: too low and students see "take a short break" in
//  the middle of a period, too high and the only signal is the invoice, which is
//  how a $169 spike happened here once already.
//
//  WHAT IS PINNED, AND WHAT IS NOT
//  The exact ceilings are pinned, because they were sized against specific
//  arithmetic (three classes of twenty behind one school NAT, at eight Runs each
//  while debugging, is 480) and a later edit that quietly halves one should have
//  to say so. What is NOT pinned is the shape of the messages beyond the one
//  property that matters: the per-identity 429 and the global 429 must not be the
//  same, because telling a student to take a break when the whole site is at
//  capacity sends them to wait for something that will not clear.
//
//  Also pinned: that an identity over its own ceiling cannot go on eating the
//  global budget, and that the limiter map cannot grow without bound. The map is
//  the same class of per-request growth as the leak that caused the spike.
//
//  Zero PII: synthetic identities only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:judge0limits
// ─────────────────────────────────────────────────────────────────────────────

const j0 = require('../routes/judge0');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

const { rateLimited, RATE_LIMIT, GLOBAL_LIMIT, MAX_KEYS, _resetLimiter, _limiterSize } = j0;

// ── 1. THE CEILINGS THEMSELVES ───────────────────────────────────────────────
section('1. The ceilings are what the classroom arithmetic sized them to be');
ok('1.1 the per-identity ceiling is 500 runs an hour', RATE_LIMIT === 500, RATE_LIMIT);
ok('1.2 the global ceiling is 3000 runs an hour', GLOBAL_LIMIT === 3000, GLOBAL_LIMIT);
// The whole reason 40 was raised. Three classes of twenty behind one school NAT,
// each student running their code eight times while debugging one exercise.
ok('1.3 the worst realistic classroom hour fits under the per-identity ceiling',
  3 * 20 * 8 <= RATE_LIMIT, { needed: 3 * 20 * 8, ceiling: RATE_LIMIT });
// A submission of a five case exercise costs five runs. At 40 a student got eight
// submissions an hour, which was its own quiet bite on the grading path.
ok('1.4 a student gets at least fifty submissions an hour of a five case exercise',
  Math.floor(RATE_LIMIT / 5) >= 50, Math.floor(RATE_LIMIT / 5));
// The backstop has to sit above a genuinely busy day and below a runaway.
ok('1.5 the global ceiling leaves real headroom over one saturated classroom',
  GLOBAL_LIMIT >= RATE_LIMIT * 3, { global: GLOBAL_LIMIT, identity: RATE_LIMIT });

// ── 2. PER-IDENTITY ──────────────────────────────────────────────────────────
section('2. Per identity');
_resetLimiter();
let allowed = 0;
for (let i = 0; i < RATE_LIMIT; i++) if (rateLimited('10.0.0.1') === null) allowed++;
ok('2.1 exactly the ceiling is allowed through', allowed === RATE_LIMIT, allowed);
ok('2.2 the next one is refused as an identity limit', rateLimited('10.0.0.1') === 'identity');
// A second school must not be punished for the first one's hour.
ok('2.3 a different identity is unaffected', rateLimited('10.0.0.2') === null);

// The grading path arrives with a synthetic identity rather than a real IP, so a
// whole class behind one NAT does not share one grading budget.
_resetLimiter();
let studentA = 0, studentB = 0;
for (let i = 0; i < RATE_LIMIT; i++) if (rateLimited('codegrade:stu-A') === null) studentA++;
for (let i = 0; i < 10; i++) if (rateLimited('codegrade:stu-B') === null) studentB++;
ok('2.4 grading is partitioned per student, not per school IP',
  studentA === RATE_LIMIT && studentB === 10 && rateLimited('codegrade:stu-A') === 'identity',
  { studentA, studentB });

// ── 3. THE GLOBAL BACKSTOP ───────────────────────────────────────────────────
section('3. The global backstop');
_resetLimiter();
let through = 0;
let firstRefusal = null;
// Spread across enough identities that no single one hits its own ceiling first,
// so what stops this is the global limit and nothing else.
for (let i = 0; i < GLOBAL_LIMIT + 50; i++) {
  const r = rateLimited(`10.1.${Math.floor(i / 200)}.${i % 200}`);
  if (r === null) through++;
  else if (!firstRefusal) firstRefusal = r;
}
ok('3.1 the global ceiling stops the run', through === GLOBAL_LIMIT, through);
ok('3.2 and it is reported as a capacity problem, not a personal one',
  firstRefusal === 'global', firstRefusal);

// An identity already over its own ceiling must not keep charging the shared
// budget on its way to a 429, or one runaway drains everyone else's headroom.
_resetLimiter();
for (let i = 0; i < RATE_LIMIT + 1000; i++) rateLimited('10.2.2.2');
let survivor = 0;
for (let i = 0; i < 100; i++) if (rateLimited(`10.3.0.${i}`) === null) survivor++;
ok('3.3 an identity over its own ceiling stops charging the global budget',
  survivor === 100, survivor);

// ── 4. THE MESSAGES ARE NOT THE SAME ─────────────────────────────────────────
section('4. The two refusals say different things');
const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'routes', 'judge0.js'), 'utf8');
const identityMsg = /rate_limited[\s\S]{0,200}?message: '([^']+)'/.exec(src);
const capacityMsg = /error: 'capacity'[\s\S]{0,200}?message: '([^']+)'/.exec(src);
ok('4.1 both refusals carry a message', !!identityMsg && !!capacityMsg);
ok('4.2 the two messages are different text',
  !!identityMsg && !!capacityMsg && identityMsg[1] !== capacityMsg[1]);
// A student who did nothing wrong should be told so, or they will sit and wait
// out a limit that is not theirs.
ok('4.3 the capacity message tells the student it is not something they did',
  !!capacityMsg && /not something you did/i.test(capacityMsg[1]), capacityMsg && capacityMsg[1]);

// ── 5. THE MAP CANNOT GROW WITHOUT BOUND ─────────────────────────────────────
section('5. Memory, which is the thing that caused the spike last time');
ok('5.1 there is a hard key cap', typeof MAX_KEYS === 'number' && MAX_KEYS > 0, MAX_KEYS);
_resetLimiter();
// Every one of these is a distinct identity inside a single window, which is what
// a scanner looks like. The sweep runs every ten minutes and would not have fired.
for (let i = 0; i < MAX_KEYS + 5000; i++) rateLimited(`scan-${i}`);
ok('5.2 a burst of distinct identities inside one window stays bounded',
  _limiterSize() <= MAX_KEYS, _limiterSize());

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
