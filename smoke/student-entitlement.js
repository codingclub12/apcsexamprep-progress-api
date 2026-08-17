'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: GET /api/student/entitlement, the site-wide ad gate resolver.
//
//  This endpoint is called on EVERY storefront page by the theme.liquid script
//  "APCS student entitlement + ad gate". The script decides ads from exactly two
//  fields (teacherTier and unitsUnlocked) and fails open to ads on anything that
//  is not a 200 with parseable JSON. So the two things worth proving are:
//
//    1. the shape the deployed script parses, key for key, and
//    2. the DEFAULT is neutral: with STUDENT_AD_GATE off, nothing this route
//       returns can suppress an ad on any page. That is the whole safety
//       property of shipping the plumbing before the business decision.
//
//  The flag is read once at module load (it is deployment config, not per
//  request), so the gate-on half runs in a child process of this same file with
//  STUDENT_AD_GATE=on. Phase is passed in SMOKE_AD_GATE_PHASE.
//
//  Zero PII: synthetic names, throwaway PINs, nothing printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:entitlement
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const PHASE = process.env.SMOKE_AD_GATE_PHASE === 'on' ? 'on' : 'off';
process.env.DB_PATH = path.join(__dirname, `smoke-entitlement-${PHASE}.db`);
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { newId } = require('../utils');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const post = (p, body) => fetch(base() + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const entitlement = (tok) => fetch(base() + '/api/student/entitlement', {
  headers: tok ? { Authorization: 'Bearer ' + tok } : {},
}).then(async (r) => ({
  status: r.status,
  cache: r.headers.get('cache-control'),
  body: await r.json().catch(() => null),
}));

// A teacher, a class in that course, and a student joined to it. Written
// directly because this suite is about the read, not the enrolment flow.
function makeClass(course, code) {
  const teacherId = newId();
  const classId = newId();
  db.prepare("INSERT INTO teachers (id, email, password_hash, name) VALUES (?, ?, 'x', 'T')")
    .run(teacherId, `t-${teacherId}@example.invalid`);
  db.prepare('INSERT INTO classes (id, teacher_id, class_code, class_name, course) VALUES (?, ?, ?, ?, ?)')
    .run(classId, teacherId, code, 'Smoke Class', course);
  return { teacherId, classId };
}
const grant = (teacherId, course) => db.prepare(
  "INSERT INTO entitlements (id, teacher_id, course, source, status, granted_at) VALUES (?, ?, ?, 'manual', 'active', datetime('now'))"
).run(newId(), teacherId, course);

// The deployed script's own decision, copied verbatim from theme.liquid so this
// suite tests the real consequence (does an ad get suppressed?) and not just the
// JSON. Aliases resolved the same way the script resolves them.
const COURSE_ALIASES = {
  cyber: ['cyber', 'ap-cybersecurity', 'ap-cyber'],
  csa: ['csa', 'ap-csa'],
  csp: ['csp', 'ap-csp'],
};
function studentSuppressesAds(ent, course, unit) {
  const keys = COURSE_ALIASES[course] || [course];
  let unlocked = [];
  for (const k of keys) if (ent && ent.unitsUnlocked && ent.unitsUnlocked[k]) { unlocked = ent.unitsUnlocked[k]; break; }
  if (unlocked.indexOf(unit) !== -1) return true;
  if (unit === 1 && ent && ent.teacherTier != null) return true;
  return false;
}

(async () => {
  console.log(`\nSTUDENT ENTITLEMENT (ad gate ${PHASE.toUpperCase()})\n`);

  const paid = makeClass('ap-csa', 'CSA-PAID');
  grant(paid.teacherId, 'ap-csa');
  const free = makeClass('ap-csp', 'CSP-FREE');

  const paidTok = (await post('/api/student/join', { class_code: 'CSA-PAID', display_name: 'Paid Kid', pin: '1234' })).body.token;
  const freeTok = (await post('/api/student/join', { class_code: 'CSP-FREE', display_name: 'Free Kid', pin: '1234' })).body.token;
  const soloTok = (await post('/api/student/solo-init', { name: 'Solo Kid', pin: '2468' })).body.token;

  // ── 1. The route exists and is student-scoped ──────────────────────────────
  //  The bug this fixes: it 404d for everyone, forever.
  console.log('1. The route exists and requires a student token');
  {
    const r = await entitlement(paidTok);
    ok('  200 for a valid student token', r.status === 200, r);
    ok('  no token is 401, not 404', (await entitlement(null)).status === 401);
    ok('  a junk token is 401', (await entitlement('not-a-token')).status === 401);
    ok('  never cached (shared school machines)', r.cache === 'no-store', r.cache);
  }

  // ── 2. The exact shape the deployed script parses ──────────────────────────
  console.log('2. The response carries the keys the theme script reads');
  {
    const b = (await entitlement(paidTok)).body;
    ok('  has teacherTier', 'teacherTier' in b, b);
    ok('  has unitsUnlocked object', b.unitsUnlocked && typeof b.unitsUnlocked === 'object', b);
    ok('  has courses array', Array.isArray(b.courses), b);
    ok('  courses names the enrolled course', b.courses.join() === 'ap-csa', b.courses);
    ok('  reports the gate state', b.adGate === PHASE, b.adGate);
  }

  // ── 3. Facts are honest whatever the ad policy is ──────────────────────────
  //  A future paid-content gate reads these, so they must not wait on the ad
  //  decision.
  console.log('3. Facts (course, enrolled, entitled) are honest in both phases');
  {
    const p = (await entitlement(paidTok)).body;
    ok('  paid class: entitled', p.entitled === true && p.enrolled === true && p.course === 'ap-csa', p);

    const f = (await entitlement(freeTok)).body;
    ok('  unpaid class: enrolled but not entitled', f.enrolled === true && f.entitled === false, f);
    ok('  unpaid class: course is honest', f.course === 'ap-csp', f);

    const s = (await entitlement(soloTok)).body;
    ok('  solo account: no teacher, no seat', s.enrolled === false && s.entitled === false, s);
    ok('  solo account: courses is empty', s.courses.length === 0, s);
  }

  if (PHASE === 'off') {
    // ── 4a. THE SAFETY PROPERTY ─────────────────────────────────────────────
    //  Default deployment must be indistinguishable from the 404 the script has
    //  been fielding all along: ads on, everywhere, for everyone.
    console.log('4. Gate OFF: no response can suppress an ad');
    for (const [label, tok, course] of [['paid', paidTok, 'csa'], ['unpaid', freeTok, 'csp'], ['solo', soloTok, 'csa']]) {
      const b = (await entitlement(tok)).body;
      ok(`  ${label}: teacherTier is null`, b.teacherTier === null, b.teacherTier);
      ok(`  ${label}: unitsUnlocked is empty`, Object.keys(b.unitsUnlocked).length === 0, b.unitsUnlocked);
      ok(`  ${label}: ads stay on at unit 1`, studentSuppressesAds(b, course, 1) === false);
      ok(`  ${label}: ads stay on at unit 3`, studentSuppressesAds(b, course, 3) === false);
    }
  } else {
    // ── 4b. The flag actually turns the policy on ───────────────────────────
    console.log('4. Gate ON: paid seats unlock, unpaid stay on ads past unit 1');
    {
      const p = (await entitlement(paidTok)).body;
      ok('  paid: tier is paid', p.teacherTier === 'paid', p.teacherTier);
      ok('  paid: whole CSA course unlocked (2025-2026 four units)',
        (p.unitsUnlocked['ap-csa'] || []).join() === '1,2,3,4', p.unitsUnlocked);
      ok('  paid: ads off in unit 3', studentSuppressesAds(p, 'csa', 3) === true);
      ok('  paid: no other course unlocked', Object.keys(p.unitsUnlocked).join() === 'ap-csa', p.unitsUnlocked);

      const f = (await entitlement(freeTok)).body;
      ok('  unpaid: tier is free', f.teacherTier === 'free', f.teacherTier);
      ok('  unpaid: nothing unlocked', Object.keys(f.unitsUnlocked).length === 0, f.unitsUnlocked);
      ok('  unpaid: unit-1 preview is ad free', studentSuppressesAds(f, 'csp', 1) === true);
      ok('  unpaid: unit 2 keeps ads', studentSuppressesAds(f, 'csp', 2) === false);

      const s = (await entitlement(soloTok)).body;
      ok('  solo: tier is null', s.teacherTier === null, s.teacherTier);
      ok('  solo: ads on even at unit 1', studentSuppressesAds(s, 'csa', 1) === false);
    }
    // CSP big ideas normalize to unit numbers, the way the script reads them.
    {
      const cspPaid = makeClass('ap-csp', 'CSP-PAID');
      grant(cspPaid.teacherId, 'ap-csp');
      const tok = (await post('/api/student/join', { class_code: 'CSP-PAID', display_name: 'Csp Kid', pin: '1234' })).body.token;
      const b = (await entitlement(tok)).body;
      ok('  CSP: bi-N unlocks as unit N (five big ideas)',
        (b.unitsUnlocked['ap-csp'] || []).join() === '1,2,3,4,5', b.unitsUnlocked);
      ok('  CSP: ads off on a big-idea-4 page', studentSuppressesAds(b, 'csp', 4) === true);
    }
  }

  server.close();
  db.close();

  // The gate-on half runs as a child of the gate-off half, so one npm script
  // covers both deployments.
  let childFailed = false;
  if (PHASE === 'off' && fail === 0) {
    try {
      execFileSync(process.execPath, [__filename], {
        stdio: 'inherit',
        env: { ...process.env, SMOKE_AD_GATE_PHASE: 'on', STUDENT_AD_GATE: 'on' },
      });
    } catch (e) { childFailed = true; }
  }

  console.log(`\n  ${pass} passed, ${fail} failed (ad gate ${PHASE})\n`);
  process.exit(fail === 0 && !childFailed ? 0 : 1);
})();
