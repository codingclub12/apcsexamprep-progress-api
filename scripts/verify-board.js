#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY-BOARD. Phase 0.3, reconciling the ledger, as a button rather than a
//  terminal session.
//
//  Reads the digest, takes every task sitting in needs_verification, and runs
//  scripts/verify-artifact.js against each one whose artifact is a fetchable
//  URL. Emits a markdown report: what looks confirmed, what looks wrong, and
//  what cannot be checked by a machine at all.
//
//  ── READ-ONLY, AND IT CANNOT BE OTHERWISE ───────────────────────────────────
//
//  It never PATCHes, never claims, and never sets `verified`. It cannot: the
//  verify bit is cookie-auth only, so the agent that did the work can never be
//  the one that closes the loop on it. This produces the EVIDENCE for a human's
//  ten-second verify click; it does not produce the click.
//
//  ── WHY A SCRIPT AND NOT A WORKFLOW ─────────────────────────────────────────
//
//  The logic lives here so it can be tested offline (smoke/verify-board.js) and
//  run by hand. The workflow is a thin wrapper that supplies the credential and
//  pastes the output into a run summary. Logic buried in YAML is logic nobody
//  can test.
//
//  Usage:
//    node scripts/verify-board.js                    # every needs_verification task
//    node scripts/verify-board.js --limit 5          # cap the run
//    node scripts/verify-board.js --task 70          # one task
//    node scripts/verify-board.js --json             # machine-readable
//    node scripts/verify-board.js --redact           # drop titles (public logs)
//
//  Credential: TODO_KEY in the environment. Base URL: APCS_BASE, defaulting to
//  production.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const { execFileSync } = require('child_process');

const BASE = process.env.APCS_BASE || 'https://progress.apcsexamprep.com';
const VERIFIER = path.join(__dirname, 'verify-artifact.js');
// Severity comes from the verifier, never from a second copy of the rule here.
// A duplicate of this rule already shipped one wrong P0 to the board.
const { classifyStatus } = require('./verify-artifact.js');

// The storefront rate-limits, and verify-artifact already paces itself and backs
// off on 429. This is the second brake: a sweep of thirty tasks in one run is
// how a read-only check earns a block. Whatever it skips is REPORTED, never
// silently dropped, because a truncated sweep that looks complete is the exact
// failure this whole system is about.
const DEFAULT_LIMIT = 12;

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
const wantJson = process.argv.includes('--json');

// --redact drops task TITLES from the output. Everything else stays: ids,
// artifact URLs, signals, and the reason a task could not be checked.
//
// WHY THIS EXISTS. This repo is PUBLIC, and so are its Actions logs - anyone
// can read a job log with no login. The board's titles are free text a human
// typed about their own business, and the first five live runs published
// "Personal follow-up to <person>", "Chase <person>'s unpaid PO #<number>" and
// an internal incident description into that public log. The whole product
// posture here is zero PII; the tooling around it does not get an exemption.
//
// A task id is enough to act on. The reader owns the board and can look up the
// title there, behind a credential, which is where free text belongs.
const redact = process.argv.includes('--redact');
// Titles are the only free-text field in a task, so this is the whole guard.
const title = (t) => (redact ? '' : ` ${t.title}`);

function die(msg, code = 1) {
  console.error(`verify-board: ${msg}`);
  process.exit(code);
}

// A task's artifact is machine-checkable only if it contains a URL we can
// actually fetch. "emailed the district on the 12th" is a perfectly good
// artifact and is not a failure; it is simply not ours to check.
function firstUrl(artifact) {
  if (!artifact) return null;
  const word = String(artifact).split(/\s+/).find((w) => /^https?:\/\//i.test(w));
  return word || null;
}

function runVerifier(url) {
  try {
    const out = execFileSync('node', [VERIFIER, url, '--json'], {
      encoding: 'utf8',
      timeout: 120000,
    });
    return { ok: true, data: JSON.parse(out)[0] };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e).slice(0, 300) };
  }
}

// Turn one verifier result into a verdict a human can act on in a second.
// Deliberately conservative: this reports SIGNALS, never a conclusion. The
// wording matters, because the two mis-closures that started all of this both
// came from someone turning a signal into a verdict too early.
function readSignals(v) {
  const signals = [];
  if (!v.usable) {
    const kind = classifyStatus(v.status);
    if (kind === 'rate-limit') {
      signals.push({ level: 'P1', text: `rate limited after ${v.attempts} attempts, NOT broken - re-run slower` });
    } else if (kind === 'needs-human') {
      signals.push({
        level: 'needs-human',
        text: `responded ${v.status}. This carries no credential, so that is CORRECT `
          + 'for an endpoint meant to require auth, and a fault only if it is meant '
          + 'to be public. No severity is claimed.',
      });
    } else {
      signals.push({ level: 'P0', text: `status ${v.status}, not 200` });
    }
    return signals;
  }
  if (v.mojibake && v.mojibake.length) {
    signals.push({ level: 'P0', text: `mojibake on ${v.mojibake.length} line(s)` });
  }
  const staleReal = (v.stale_dates || []).filter((d) => !d.noise);
  if (staleReal.length) {
    signals.push({
      level: 'P1',
      text: `${staleReal.length} past date(s) in BODY COPY: ${staleReal.map((d) => `${d.date} (${d.days_past}d)`).join(', ')}`,
    });
  }
  if (v.duplicate_blocks && v.duplicate_blocks.length) {
    signals.push({ level: 'P1', text: `${v.duplicate_blocks.length} duplicated block(s) shipping on every load` });
  }
  if (v.headings && v.headings.count !== 1) {
    signals.push({ level: 'P1', text: `${v.headings.count} <h1> tags (expected 1)` });
  }
  return signals;
}

async function main() {
  const key = (process.env.TODO_KEY || '').trim();
  if (!key) {
    die('No TODO_KEY in the environment. It must match the value the API runs with, '
      + 'or every read comes back 401.', 2);
  }

  const res = await fetch(`${BASE}/api/command/digest`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await res.text();
  if (res.status === 401) die('401 from the digest. The credential does not match the API.', 2);
  if (!res.ok) die(`${res.status} from the digest: ${text.slice(0, 200)}`, 2);

  let digest;
  try {
    digest = JSON.parse(text);
  } catch (e) {
    die(`the digest did not parse as JSON: ${e.message}`, 2);
  }
  if (!Array.isArray(digest.needs_verification)) {
    die('the digest carried no needs_verification array. Wrong endpoint, or a changed shape.', 2);
  }

  const only = arg('--task', null);
  const limit = Number(arg('--limit', DEFAULT_LIMIT));

  let queue = digest.needs_verification;
  if (only) queue = queue.filter((t) => String(t.id) === String(only));

  const checkable = [];
  const notCheckable = [];
  for (const t of queue) {
    const url = firstUrl(t.artifact_url);
    if (url) checkable.push({ ...t, url });
    else {
      notCheckable.push({
        ...t,
        why: t.artifact_url ? 'artifact is a note, not a URL' : 'no artifact recorded',
      });
    }
  }

  const toCheck = checkable.slice(0, limit);
  const overCap = checkable.slice(limit);

  const results = [];
  for (const t of toCheck) {
    const r = runVerifier(t.url);
    if (!r.ok) {
      results.push({ task: t, error: r.error, signals: [{ level: 'P1', text: `verifier failed: ${r.error}` }] });
      continue;
    }
    results.push({ task: t, data: r.data, signals: readSignals(r.data) });
  }

  const report = {
    generated_at: new Date().toISOString(),
    base: BASE,
    needs_verification_total: digest.needs_verification.length,
    checked: results.length,
    limit,
    quiet: results.filter((r) => r.signals.length === 0).map((r) => r.task.id),
    // A task whose ONLY signal is needs-human belongs in neither bucket. It is
    // not a finding (nothing is known to be wrong) and it is emphatically not
    // "nothing flagged" (that reads as clean). Filing it under either one is
    // the same mistake in opposite directions.
    findings: results.filter((r) => r.signals.length > 0
      && !r.signals.every((s) => s.level === 'needs-human')),
    undecidable: results.filter((r) => r.signals.length > 0
      && r.signals.every((s) => s.level === 'needs-human')),
    not_machine_checkable: notCheckable,
    over_cap: overCap.map((t) => ({ id: t.id, ...(redact ? {} : { title: t.title }) })),
  };

  // --json carries whole task objects, so redaction has to reach them too or
  // the flag is decorative on the one output most likely to be piped somewhere.
  if (redact) {
    const strip = (t) => { if (t && 'title' in t) delete t.title; };
    for (const f of report.findings) strip(f.task);
    for (const f of report.undecidable) strip(f.task);
    for (const t of report.not_machine_checkable) strip(t);
  }

  if (wantJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const L = [];
  const p = (s) => L.push(s);
  p('### Board reconciliation');
  p('');
  p(`Read at ${report.generated_at}. **Nothing was written.** \`verified\` is cookie-auth only,`);
  p('so this produces the evidence for your verify click, never the click.');
  p('');
  p(`In needs_verification: **${report.needs_verification_total}**  |  checked: **${report.checked}**`
    + `  |  not machine-checkable: **${notCheckable.length}**`);
  p('');

  if (report.findings.length) {
    p(`#### Look at these first (${report.findings.length})`);
    p('');
    for (const f of report.findings) {
      p(`**#${f.task.id}${title(f.task)}**`);
      p('');
      p(`- artifact: ${f.task.url}`);
      for (const s of f.signals) p(`- **${s.level}** ${s.text}`);
      p('');
    }
  }

  if (report.undecidable.length) {
    p(`#### Fetched, but no verdict is possible (${report.undecidable.length})`);
    p('');
    p('The artifact answered, but this tool holds no credential for it, so a 401 or');
    p('403 is indistinguishable from the endpoint working exactly as designed.');
    p('');
    for (const f of report.undecidable) {
      p(`**#${f.task.id}${title(f.task)}**`);
      p('');
      p(`- artifact: ${f.task.url}`);
      for (const s of f.signals) p(`- **${s.level}** ${s.text}`);
      p('');
    }
  }

  if (report.quiet.length) {
    p(`#### Nothing flagged (${report.quiet.length})`);
    p('');
    p('The page fetched cleanly and no signal fired. That is evidence, not a verdict:');
    p('a static fetch cannot run JavaScript, so a thing hidden by a script still ships.');
    p('');
    for (const r of results.filter((x) => x.signals.length === 0)) {
      p(`- **#${r.task.id}**${title(r.task)}`);
    }
    p('');
  }

  if (notCheckable.length) {
    p(`#### Not machine-checkable (${notCheckable.length})`);
    p('');
    p('These need a human. Chasing an invoice and deleting a draft leave no trace a');
    p('script can read, and saying so is better than inventing a signal.');
    p('');
    for (const t of notCheckable) p(`- **#${t.id}**${title(t)} - ${t.why}`);
    p('');
  }

  if (overCap.length) {
    p(`#### Not checked this run (${overCap.length})`);
    p('');
    p(`Over the per-run cap of ${limit}, which exists because the storefront rate-limits.`);
    p('Re-run with a higher `--limit`, or check one with `--task <id>`.');
    p('');
    for (const t of overCap) p(`- **#${t.id}**${title(t)}`);
    p('');
  }

  console.log(L.join('\n'));
}

main().catch((e) => die(e.message || String(e)));
