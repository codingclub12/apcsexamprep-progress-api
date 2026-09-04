'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Run the Matrixify preflight on the practice exam replica sheet, with the
//  round-trip evidence it needs.
//
//  The preflight refuses a sheet carrying raw emoji unless it is shown the body
//  those emoji came from, which is the right posture: it cannot otherwise tell
//  a character the live page already had from one this pass introduced. That
//  body is the committed fixture, so building the map here keeps the check
//  reproducible on a fresh checkout without committing 120 KB of it twice.
//
//    node scripts/preflight-exam-replica.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const gen = require('../tools/ap-cyber-ced/generate-exam-sheet.js');

const ROOT = path.join(__dirname, '..');
const SHEET = path.join(ROOT, 'imports', '2026-09-04c', 'cyber-practice-exam-replica-pages.csv');
const FIXTURE = path.join(ROOT, 'smoke', 'fixtures', 'live-bodies', `${gen.HANDLE}.html`);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-preflight-'));
const carrying = path.join(dir, 'carrying.json');
fs.writeFileSync(carrying, JSON.stringify({ [gen.HANDLE]: fs.readFileSync(FIXTURE, 'utf8') }));

try {
  const out = execFileSync(process.execPath,
    [path.join(ROOT, 'scripts', 'matrixify-preflight.js'), SHEET, '--carrying', carrying],
    { encoding: 'utf8' });
  process.stdout.write(out);
} catch (e) {
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || '');
  process.exitCode = e.status || 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
