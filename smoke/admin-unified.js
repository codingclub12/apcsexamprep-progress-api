'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: unified analytics.
//  The unified deck composes computeExec / computeSummary / computeAnalytics
//  rather than reimplementing them, so the invariant worth proving is FIDELITY:
//  what /unified returns for a deck must be exactly what that deck's own
//  endpoint returns. Anything else means the composed page and the standalone
//  page can show different numbers, which is the whole failure this replaces.
//
//  The cross-check is proven the same way the health module is: a check that
//  cannot fire on a deliberately broken fixture is worthless, so one deck is
//  corrupted on purpose and the check must catch it.
//
//  Run: npm run smoke:unified
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-unified.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const metrics = require('../lib/admin-metrics');
const analytics = require('../lib/admin-analytics');
const exec = require('../lib/admin-exec');
const unified = require('../lib/admin-unified');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};
const run = (sql, ...a) => db.prepare(sql).run(...a);
// generated_at is a wall-clock stamp and differs between two calls by design.
const strip = (o) => {
  const c = JSON.parse(JSON.stringify(o));
  delete c.generated_at;
  return JSON.stringify(c);
};

// ── Fixture: one external classroom, one solo class, real graded work ────────
run(`INSERT INTO teachers (id,name,email,password_hash,school) VALUES
  ('t_ext','Ext Teacher','teacher@browardschools.com','x','Broward High'),
  ('t_solo','Solo System','solo@system.invalid','x',NULL)`);

run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed,created_at) VALUES
  ('c_ext','CSA-UNIF','Period 1','ap-csa','t_ext',1,80,1,datetime('now','-20 days')),
  ('c_solo','ME-UNIF','Solo','solo','t_solo',1,80,1,datetime('now','-20 days'))`);

const mkStudent = (id, cid, ago) =>
  run(`INSERT INTO students (id,class_id,display_name,pin_hash,active,last_active,created_at)
       VALUES (?,?,?,'x',1,datetime('now',?),datetime('now','-15 days'))`, id, cid, 'Name' + id, ago);
mkStudent('s1', 'c_ext', '-0 days');
mkStudent('s2', 'c_ext', '-0 days');
mkStudent('s3', 'c_ext', '-3 days');
mkStudent('s4', 'c_ext', '-40 days');   // stale: outside every recency window
mkStudent('s5', 'c_solo', '-1 days');
mkStudent('s6', 'c_solo', '-2 days');

let pid = 0;
const prog = (s, c, course, lesson) =>
  run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,completed_at,updated_at)
       VALUES (?,?,?,?,'1',?,'visit',1,datetime('now','-2 days'),datetime('now','-2 days'))`,
    'p' + (++pid), s, c, course, lesson);
for (const [s, c, course] of [['s1', 'c_ext', 'ap-csa'], ['s2', 'c_ext', 'ap-csa'], ['s3', 'c_ext', 'ap-csa'],
  ['s5', 'c_solo', 'ap-csa'], ['s6', 'c_solo', 'ap-csp']]) {
  for (const lesson of ['1.1', '1.2', '1.3']) prog(s, c, course, lesson);
}

let aid = 0;
const att = (s, c, lesson, item, type, score, max, passed) =>
  run(`INSERT INTO attempts (id,student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no,duration_seconds,created_at)
       VALUES (?,?,?,'ap-csa',?,?,?,?,?,?,1,300,datetime('now','-1 days'))`,
    ++aid, s, c, lesson, item, type, score, max, passed);
for (const [s, c] of [['s1', 'c_ext'], ['s2', 'c_ext'], ['s3', 'c_ext'], ['s5', 'c_solo']]) {
  att(s, c, '1.1', '1.1-quiz', 'quiz', 8, 10, 1);
  att(s, c, '1.2', '1.2-cfu-1', 'cfu', 1, 2, 0);
}

let sesid = 0;
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1 Safari/604.1';
const sess = (s, c, ua, ch, ago) =>
  run(`INSERT INTO sessions (id,student_id,class_id,course,active_seconds,total_seconds,page_views,ua,started_at,last_beat_at,channel)
       VALUES (?,?,?,'ap-csa',900,1200,12,?,datetime('now',?),datetime('now',?),?)`,
    ++sesid, s, c, ua, ago, ago, ch);
sess('s1', 'c_ext', UA_MAC, 'Organic Search', '-5 days');
sess('s1', 'c_ext', UA_MAC, 'Direct', '-1 days');
sess('s2', 'c_ext', UA_IOS, 'Direct', '-2 days');
sess('s3', 'c_ext', UA_MAC, 'Referral', '-3 days');
sess('s5', 'c_solo', UA_IOS, 'Organic Search', '-1 days');

// ── 1. Composition fidelity: each deck must survive unification unchanged ────
console.log('\nComposition fidelity');
unified.invalidate();
const u = unified.computeUnified(0);
ok('unified.exec matches computeExec()', strip(u.exec) === strip(exec.computeExec()));
ok('unified.summary matches computeSummary()', strip(u.summary) === strip(metrics.computeSummary()));
ok('unified.analytics matches computeAnalytics()', strip(u.analytics) === strip(analytics.computeAnalytics(0)));
ok('payload is not flagged empty on a populated fixture', u.empty === false, u.empty);

// ── 2. The fixture's real numbers ────────────────────────────────────────────
console.log('\nFixture numbers');
ok('6 real students (4 external + 2 solo)', u.exec.kpis.students_total === 6, u.exec.kpis.students_total);
ok('5 active in 7d (the 40-day-stale student excluded)', u.exec.kpis.active_students_7d === 5, u.exec.kpis.active_students_7d);
ok('15 lesson completions', u.analytics.by_course.reduce((n, r) => n + r.completions, 0) === 15);
ok('quiz pass rate 100% at an 80 threshold (8/10)', u.exec.kpis.quiz_pass_rate.pct === 100, u.exec.kpis.quiz_pass_rate);
ok('cfu pass rate 0% at an 80 threshold (1/2)', u.exec.kpis.cfu_pass_rate.pct === 0, u.exec.kpis.cfu_pass_rate);

// ── 3. Cross-check agrees on a consistent fixture ────────────────────────────
console.log('\nCross-check (consistent fixture)');
ok('cross-check reports agreement', u.crosscheck.ok === true, u.crosscheck.disagreements);
ok('all four overlaps are checked at days=0', u.crosscheck.checked === 4, u.crosscheck.checked);
ok('every check carries its sources', u.crosscheck.checks.every((c) => c.sources.length >= 2));
ok('students total agrees across all three decks',
  u.crosscheck.checks[0].sources.length === 3 && u.crosscheck.checks[0].value === 6, u.crosscheck.checks[0]);

// ── 4. Cross-check MUST fire on a deliberately broken deck ───────────────────
//  Without this the agreement banner is decoration: it would read "all checks
//  agree" whether or not the decks can actually disagree.
console.log('\nCross-check (deliberately broken deck)');
const realExec = exec.computeExec;
exec.computeExec = function () {
  const p = realExec();
  p.kpis.students_total = 99;        // drift the population count
  p.kpis.active_students_7d = 42;    // drift the 7-day window
  return p;
};
unified.invalidate();
const broken = unified.computeUnified(0);
ok('cross-check reports failure', broken.crosscheck.ok === false, broken.crosscheck);
ok('both drifted metrics are caught', broken.crosscheck.disagreements === 2, broken.crosscheck.disagreements);
const drifted = broken.crosscheck.checks.find((c) => !c.agrees);
ok('the failing check names the disagreeing decks',
  drifted.sources.some((s) => s.deck === 'exec' && s.value === 99) &&
  drifted.sources.some((s) => s.deck === 'summary' && s.value === 6), drifted.sources);
ok('a disagreeing check reports no single value', drifted.value === null, drifted.value);
exec.computeExec = realExec;
unified.invalidate();
ok('cross-check recovers once the deck is restored', unified.computeUnified(0).crosscheck.ok === true);

// ── 5. Range handling ────────────────────────────────────────────────────────
console.log('\nRange handling');
unified.invalidate();
ok('?days=7 is honoured', unified.computeUnified(7).range.days === 7);
unified.invalidate();
ok('an out-of-range value falls back to all-time', unified.computeUnified(999).range.days === 0);
unified.invalidate();
ok('a non-numeric value falls back to all-time', unified.computeUnified('abc').range.days === 0);
unified.invalidate();
ok('the windowed completions check is skipped on a windowed range',
  unified.computeUnified(7).crosscheck.checked === 3, unified.computeUnified(7).crosscheck.checked);

// ── 6. Cache: correct, disclosed, and bounded ────────────────────────────────
console.log('\nCache');
unified.invalidate();
const cold = unified.computeUnified(0);
const warm = unified.computeUnified(0);
ok('first read is computed fresh', cold.cached === false);
ok('second read inside the TTL is served from cache', warm.cached === true);
ok('a cached read discloses its age', typeof warm.cache_age_seconds === 'number');
ok('a cached read carries the same numbers', strip(cold.exec) === strip(warm.exec));
ok('invalidate() forces the next read cold', (unified.invalidate(), unified.computeUnified(0).cached === false));
// The cache key space is the range allow-list, so it cannot grow with traffic.
for (let i = 0; i < 200; i++) unified.computeUnified(i);
ok('cache stays bounded by the range allow-list under many distinct inputs',
  unified.RANGE_DAYS.size === 5, unified.RANGE_DAYS.size);

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.exit(fail ? 1 : 0);
