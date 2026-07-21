'use strict';
/*
 * Smoke-test cleanup: deactivate accumulated ZZ-SMOKE students.
 * =============================================================
 * The smoke test writes a real `ZZ-SMOKE <timestamp>` student to each target
 * class on every run, and there is no student hard-delete API (CLAUDE.md:
 * deactivate only, never hard-delete - attempt history is gradebook data and
 * always survives). This script sweeps each target class's roster for students
 * whose display name starts with the sentinel prefix and DEACTIVATES them
 * (active = 0) via the teacher endpoint, so they stop cluttering active
 * rosters. Their progress/attempt/score rows are preserved by design.
 *
 * It sweeps by NAME PREFIX, not just the last run's created-artifacts.json, so
 * it cleans up everything that has accumulated - including from days a run was
 * not followed by a cleanup.
 *
 * Run:
 *   SMOKE_TEACHER_EMAIL=you@example.com SMOKE_TEACHER_PASSWORD=... \
 *   SMOKE_TEST_CLASS_CODE=CYBER-Q9JG,CSA-CQ3G,CSP-CHSH,CSA-4UC8,CYBER-U89X \
 *   npm run smoke:cleanup
 *
 * Add --dry-run (or SMOKE_CLEANUP_DRY_RUN=1) to list what WOULD be deactivated
 * without changing anything - recommended for the first run against real
 * classes.
 *
 * Exits non-zero if any deactivation failed (a student already gone / already
 * inactive is not a failure).
 */

const CFG = {
  apiBase: (process.env.SMOKE_API_BASE || 'https://progress.apcsexamprep.com').replace(/\/$/, ''),
  classCodes: (process.env.SMOKE_TEST_CLASS_CODE || '')
    .split(',').map((s) => s.toUpperCase().trim()).filter(Boolean),
  email: process.env.SMOKE_TEACHER_EMAIL || '',
  password: process.env.SMOKE_TEACHER_PASSWORD || '',
  prefix: process.env.SMOKE_SENTINEL_PREFIX || 'ZZ-SMOKE',
  dryRun: process.env.SMOKE_CLEANUP_DRY_RUN === '1' || process.argv.includes('--dry-run'),
};

async function login() {
  const r = await fetch(`${CFG.apiBase}/api/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CFG.email, password: CFG.password }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(`teacher login failed (${r.status}): ${d.error || 'unknown'}`);
  }
  return (await r.json()).token;
}

async function roster(token, code) {
  const r = await fetch(`${CFG.apiBase}/api/teacher/classes/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return null; // class not found / not owned by this teacher
  if (!r.ok) throw new Error(`roster fetch failed for ${code} (${r.status})`);
  return (await r.json()).students || [];
}

async function deactivate(token, code, studentId) {
  const r = await fetch(`${CFG.apiBase}/api/teacher/classes/${encodeURIComponent(code)}/students/${encodeURIComponent(studentId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.status === 404) return 'gone';        // already removed/deactivated - fine
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(`${r.status} ${d.error || ''}`.trim());
  }
  return 'deactivated';
}

async function main() {
  console.log('Smoke cleanup - deactivate accumulated sentinel students');
  console.log(`  api:     ${CFG.apiBase}`);
  console.log(`  classes: ${CFG.classCodes.join(', ') || '(unset!)'}`);
  console.log(`  prefix:  ${CFG.prefix}*`);
  console.log(`  mode:    ${CFG.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  if (CFG.classCodes.length === 0) {
    console.error('FATAL: SMOKE_TEST_CLASS_CODE is required (comma-separated class codes).');
    process.exit(2);
  }
  if (!CFG.email || !CFG.password) {
    console.error('FATAL: SMOKE_TEACHER_EMAIL and SMOKE_TEACHER_PASSWORD are required to authenticate.');
    process.exit(2);
  }

  let token;
  try {
    token = await login();
  } catch (e) {
    console.error(`FATAL: ${e.message}`);
    process.exit(2);
  }

  let matched = 0, done = 0, failed = 0;
  const prefix = CFG.prefix.toLowerCase();

  for (const code of CFG.classCodes) {
    let students;
    try {
      students = await roster(token, code);
    } catch (e) {
      console.log(`  [SKIP] ${code}: ${e.message}`);
      failed++;
      continue;
    }
    if (students === null) {
      console.log(`  [SKIP] ${code}: class not found or not owned by this teacher`);
      continue;
    }

    const sentinels = students.filter(
      (s) => (s.display_name || '').toLowerCase().startsWith(prefix) && s.active !== 0
    );
    matched += sentinels.length;
    console.log(`  ${code}: ${sentinels.length} active sentinel student(s)`);

    for (const s of sentinels) {
      if (CFG.dryRun) {
        console.log(`      would deactivate ${s.display_name}  (id=${s.id})`);
        continue;
      }
      try {
        const outcome = await deactivate(token, code, s.id);
        done++;
        console.log(`      ${outcome} ${s.display_name}  (id=${s.id})`);
      } catch (e) {
        failed++;
        console.log(`      [FAIL] ${s.display_name} (id=${s.id}): ${e.message}`);
      }
    }
  }

  console.log('');
  if (CFG.dryRun) {
    console.log(`DRY RUN complete: ${matched} sentinel student(s) matched, 0 changed.`);
    process.exit(0);
  }
  console.log(`Cleanup complete: ${done} deactivated, ${failed} failed, ${matched} matched.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error running cleanup:', e);
  process.exit(1);
});
