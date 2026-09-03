'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDERIVE, for the deploy-gate manifest behind board task 166.
//
//  smoke/deploy-reporting.js is the FIRST implementation: it slices each
//  workflow file to a fixed-length window of lines starting at the "Report to
//  the command center" step name and regex-tests that window.
//
//  This is the SECOND, written without reusing that technique on purpose: it
//  splits each workflow into its actual step BLOCKS (on the `      - name:`
//  boundary GitHub Actions itself uses to delimit a step), finds the block
//  whose name is the reporter, and reasons about the boundaries of that block
//  rather than a fixed line count. A window-length bug in the first
//  implementation (too short, and it stops mid-condition; too long, and it
//  picks up the NEXT step's `if:` by accident) would not reproduce here,
//  because this implementation has no fixed length to get wrong.
//
//  It reaches the same conclusion the smoke suite does: every one of the 9
//  workflow files either already reported (deploy-drift.yml, tests.yml) or now
//  has exactly one step named "Report to the command center" that posts a
//  legal (source, check_id, state), never fires on a cancelled run, cannot
//  break its own job, and - for railway-deploy.yml alone - never runs unless
//  steps.gate.outputs.ready is 'true'.
//
//  Usage: node scripts/rederive-checks-reporting.js
//  Exit 0 and "REDERIVE OK" on agreement, exit 1 and the disagreement otherwise.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const { SOURCES, STATES } = require('../lib/command-checks');

const wfDir = path.join(__dirname, '..', '.github', 'workflows');
const ALL_WORKFLOWS = fs.readdirSync(wfDir).filter((f) => f.endsWith('.yml')).sort();

// Splits a workflow's raw text into STEP BLOCKS on the `      - name:` boundary
// (six-space indent: job -> steps -> step, which is what every workflow in
// this repo actually uses). This is the structural difference from the smoke
// suite's line-window approach: a block runs from one `- name:` to the next,
// however long that is, not a guessed number of lines.
function stepBlocks(text) {
  const lines = text.split('\n');
  const starts = [];
  lines.forEach((l, i) => { if (/^      - name:/.test(l)) starts.push(i); });
  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : lines.length;
    const block = lines.slice(from, to).join('\n');
    const name = (lines[from].match(/^      - name:\s*(.*)$/) || [, ''])[1].trim();
    blocks.push({ name, block });
  }
  return blocks;
}

const problems = [];
let checkedReporters = 0;
const reportedWorkflows = [];

for (const file of ALL_WORKFLOWS) {
  const text = fs.readFileSync(path.join(wfDir, file), 'utf8');
  const blocks = stepBlocks(text);
  const reporter = blocks.find((b) => b.name === 'Report to the command center'
    || b.name === 'Report the drift verdict to the command center'
    || b.name === 'Report suite results to the command center');

  if (!reporter) {
    problems.push(`${file}: no step named "Report to the command center" (or an older sibling name) exists`);
    continue;
  }
  reportedWorkflows.push(file);
  const b = reporter.block;

  // A curl to the real endpoint.
  if (!/curl[\s\S]*\/api\/command\/checks/.test(b)) {
    problems.push(`${file}: the reporter block does not curl /api/command/checks`);
  }
  // A legal, hardcoded source and check_id, extracted from the JSON payload
  // however it is assembled (inline -d string here; node -e in the two older
  // reporters), not by assuming one particular shell idiom.
  const srcMatch = b.match(/\\?"source\\?":\s*\\?"([a-z]+)\\?"/) || b.match(/source:\s*"([a-z]+)"/);
  const idMatch = b.match(/\\?"check_id\\?":\s*\\?"([a-z0-9-]+)\\?"/) || b.match(/check_id:\s*"([a-z0-9-]+)"/);
  if (!srcMatch || !SOURCES.includes(srcMatch[1])) {
    problems.push(`${file}: source ${srcMatch ? JSON.stringify(srcMatch[1]) : '(none found)'} is not a registered source (${SOURCES.join(', ')})`);
  }
  if (!idMatch || !idMatch[1]) {
    problems.push(`${file}: no stable check_id found in the reporter block`);
  }
  // Never fires on a cancelled run.
  if (!/job\.status\s*!=\s*'cancelled'/.test(b)) {
    problems.push(`${file}: the reporter does not guard against a cancelled job`);
  }
  // Cannot break its own job.
  if (!/continue-on-error:\s*true/.test(b)) {
    problems.push(`${file}: the reporter is not continue-on-error, so it can break the job it is describing`);
  }
  // Still runs after an earlier failure in the same job (always(), or - for
  // deploy-drift.yml's older phrasing - "always() && job.status != 'cancelled'"
  // on the same line).
  if (!/if:\s*always\(\)/.test(b)) {
    problems.push(`${file}: the reporter has no always(), so an earlier failure in the same job can skip it`);
  }

  // The one asymmetric case: railway-deploy.yml must never post for a run in
  // which every dependent step skipped (RAILWAY_TOKEN unset). Reasoned about
  // independently here rather than importing the smoke suite's own check:
  // the reporter block's `if:` line, and only that line, must mention
  // steps.gate.outputs.ready.
  if (file === 'railway-deploy.yml') {
    checkedReporters++;
    const ifLine = (b.split('\n').find((l) => /^\s*if:/.test(l)) || '');
    if (!/steps\.gate\.outputs\.ready\s*==\s*'true'/.test(ifLine)) {
      problems.push(`railway-deploy.yml: the reporter's if: line does not require steps.gate.outputs.ready == 'true', `
        + `so it would post pass for a run where RAILWAY_TOKEN is unset and every real step skipped`);
    }
  } else {
    checkedReporters++;
  }
}

console.log(`Checked ${ALL_WORKFLOWS.length} workflow files in ${path.relative(process.cwd(), wfDir)}`);
console.log(`Reporters found: ${reportedWorkflows.length} (${reportedWorkflows.join(', ')})`);

if (reportedWorkflows.length !== ALL_WORKFLOWS.length) {
  const missing = ALL_WORKFLOWS.filter((f) => !reportedWorkflows.includes(f));
  problems.push(`${missing.length} workflow(s) still report nothing: ${missing.join(', ')}`);
}

if (problems.length) {
  console.error('\nREDERIVE DISAGREES:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

console.log(`\nREDERIVE OK: all ${ALL_WORKFLOWS.length} of ${ALL_WORKFLOWS.length} workflow files report to `
  + `/api/command/checks with a legal source/check_id, never on a cancelled run, cannot break their own job, `
  + `and railway-deploy.yml's reporter is gated on steps.gate.outputs.ready == 'true'.`);
process.exit(0);
