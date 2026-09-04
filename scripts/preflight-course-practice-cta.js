'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Run the Matrixify preflight on the course practice band sheet, with the
//  round-trip evidence it needs.
//
//  The preflight refuses a sheet carrying raw emoji unless it is shown the
//  bodies those emoji came from, which is the right posture: it cannot
//  otherwise tell a character the live page already had from one this pass
//  introduced. Both course pages carry emoji of their own, and this pass adds
//  none. The bodies are the committed fixtures, so building the map here keeps
//  the check reproducible on a fresh checkout without committing them twice.
//
//    node scripts/preflight-course-practice-cta.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const gen = require('../tools/ap-cyber-ced/generate-course-practice-cta.js');

const ROOT = path.join(__dirname, '..');
const SHEET = path.join(ROOT, 'imports', '2026-09-04e', 'cyber-course-practice-cta-pages.csv');
const FIXTURES = path.join(ROOT, 'smoke', 'fixtures', 'live-bodies');

const carrying = {};
for (const page of gen.PAGES) {
  carrying[page.handle] = fs.readFileSync(path.join(FIXTURES, `${page.handle}.html`), 'utf8');
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cta-preflight-'));
const file = path.join(dir, 'carrying.json');
fs.writeFileSync(file, JSON.stringify(carrying));

try {
  const out = execFileSync(process.execPath,
    [path.join(ROOT, 'scripts', 'matrixify-preflight.js'), SHEET, '--carrying', file],
    { encoding: 'utf8' });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || '');
  process.exitCode = e.status || 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
