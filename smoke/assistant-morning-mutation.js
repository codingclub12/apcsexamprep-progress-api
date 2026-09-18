#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the morning verify/fix guardrails.
//
//  Break each rule on purpose, one at a time, and require
//  smoke/assistant-morning.js to go red FOR THAT RULE. A green mutation run is a
//  FAILED check, and here that is the exit code.
//
//  WHY THIS ONE MATTERS MORE THAN THE OTHERS IN THIS REPO. The thing behind this
//  guard is an automated writer pointed at a live storefront that students are
//  reading right now. Every other mutation battery here protects a report being
//  wrong. This one protects a page being wrong.
//
//  So the mutations are aimed at the failures that would be SILENT:
//    - the tier order flipping, so a leak gets filed as a redirect
//    - one Never Touch entry going missing
//    - a gate becoming an OR, so satisfying any one of four is enough
//    - the dry-run default flipping, which would ship writes on a deploy
//    - a mode typo being read as live
//
//  `must` names the assertion that has to be the one that fails, because a
//  suite that goes red for a different rule is telling you the rule you meant to
//  test is hollow.
//
//  Run: npm run smoke:assistantmorningmutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'assistant-morning.js');
const FILES = {
  morning: path.join(ROOT, 'lib', 'assistant', 'morning.js'),
  route: path.join(ROOT, 'routes', 'assistant.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });
process.on('uncaughtException', (e) => { restore(); throw e; });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('    ok    ' + n); }
  else { fail++; console.log('    FAIL  ' + n + (x !== undefined ? '\n            ' + JSON.stringify(x, null, 2).slice(0, 900) : '')); }
};

function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8', timeout: 240000 });
  const out = (r.stdout || '') + (r.stderr || '');
  return {
    code: r.status,
    failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:\s\s\{|\s\s\[|\s\s"|$)/gm)].map((m) => m[1].trim()),
    out,
  };
}

const MUTATIONS = [
  // ── The tier ORDER. The single most dangerous thing in the file. ─────────
  {
    name: 'ORDER: the auto-fix list is consulted before Never Touch',
    file: 'morning',
    find: "  if (NEVER_TOUCH_CATEGORIES.includes(category)) {",
    repl: "  if (AUTO_FIX_TYPES[issueType]) {\n    return { tier: 'auto_fix', type: issueType, reason: 'reordered', action: 'x' };\n  }\n  if (NEVER_TOUCH_CATEGORIES.includes(category)) {",
    must: ['a report that is BOTH a broken link and a leak is a leak'],
  },
  {
    name: 'ORDER: the phrase check stops running',
    file: 'morning',
    find: "  const phrase = firstMatch(text, NEVER_TOUCH_PHRASES);\n  if (phrase) {",
    repl: "  const phrase = firstMatch(text, NEVER_TOUCH_PHRASES);\n  if (false && phrase) {",
    must: ['every Never Touch phrase is refused even with an auto-fixable issue type'],
  },

  // ── One entry going missing from each Never Touch list. ─────────────────
  {
    name: 'NEVER TOUCH: assessment_visibility drops off the category list',
    file: 'morning',
    find: "  'assessment_visibility',\n  // Entitlements and access.",
    repl: "  // (removed) 'assessment_visibility',\n  // Entitlements and access.",
    must: ['every Never Touch category is refused even with an auto-fixable issue type'],
  },
  {
    name: 'NEVER TOUCH: the gradebook categories drop off',
    file: 'morning',
    find: "  'gradebook_missing_scores',",
    repl: "  // (removed) 'gradebook_missing_scores',",
    must: ['every Never Touch category is refused even with an auto-fixable issue type'],
  },
  {
    name: 'NEVER TOUCH: the money phrases drop off',
    file: 'morning',
    find: "  'price', 'pricing', 'discount', 'coupon', 'refund', 'invoice', 'purchase order',",
    repl: "  'refund', 'invoice', 'purchase order',",
    must: ['every Never Touch phrase is refused even with an auto-fixable issue type'],
  },
  {
    name: 'NEVER TOUCH: the destructive phrases drop off',
    file: 'morning',
    find: "  'delete the page', 'unpublish', 'rename the handle', 'change the url',",
    repl: "  'unpublish', 'change the url',",
    must: ['every Never Touch phrase is refused even with an auto-fixable issue type'],
  },
  {
    name: 'NEVER TOUCH: a refused report starts proposing a fix anyway',
    file: 'morning',
    find: "      reason: `the report mentions \"${phrase}\"`,\n      action: 'Email Tanner. Do nothing else.',",
    repl: "      reason: `the report mentions \"${phrase}\"`,\n      action: 'Fix it.',",
    must: ['its action is to email a human and stop'],
  },

  // ── The gates. Each one alone. ──────────────────────────────────────────
  {
    name: 'GATE: dry run stops being the default',
    file: 'morning',
    find: "  return String(process.env.MORNING_FIX_MODE || 'dry_run').trim().toLowerCase() === 'live'",
    repl: "  return String(process.env.MORNING_FIX_MODE || 'live').trim().toLowerCase() === 'live'",
    must: ['the mode defaults to dry_run'],
  },
  {
    name: 'GATE: a typo in the mode reads as live',
    file: 'morning',
    find: "    ? 'live'\n    : 'dry_run';",
    repl: "    ? 'live'\n    : (String(process.env.MORNING_FIX_MODE || '').trim() ? 'live' : 'dry_run');",
    must: ['a typo in the mode is a dry run, not a live run'],
  },
  {
    name: 'GATE: the mode check drops out of writeDecision',
    file: 'morning',
    find: "  if (fixMode() !== 'live') {\n    return { write: false, why: 'MORNING_FIX_MODE is dry_run' };\n  }",
    repl: "  if (false) {\n    return { write: false, why: 'MORNING_FIX_MODE is dry_run' };\n  }",
    must: ['an auto-fix item is NOT written in dry run'],
  },
  {
    name: 'GATE: the kill switch stops being honoured',
    file: 'morning',
    find: "  if (!fixEnabled()) {\n    return { write: false, why: 'MORNING_FIX_ENABLED is off' };\n  }",
    repl: "  if (false) {\n    return { write: false, why: 'MORNING_FIX_ENABLED is off' };\n  }",
    must: ['the kill switch refuses on its own, in live mode, under the cap'],
  },
  {
    name: 'GATE: the write cap stops being honoured',
    file: 'morning',
    find: "  if (writesSoFar >= maxWrites()) {",
    repl: "  if (false && writesSoFar >= maxWrites()) {",
    must: ['the cap refuses on its own'],
  },
  {
    name: 'GATE: the tier check stops being honoured, so propose-tier items write',
    file: 'morning',
    find: "  if (!verdict || verdict.tier !== 'auto_fix') {",
    repl: "  if (!verdict) {",
    must: ['but a propose-tier item still is not'],
  },
  {
    name: 'GATE: an unreproduced report becomes auto-fixable',
    file: 'morning',
    find: "  if (!issueType) {\n    return {\n      tier: 'needs_tanner',",
    repl: "  if (false) {\n    return {\n      tier: 'needs_tanner',",
    //  The TIER assertion cannot catch this one: with no issue type the
    //  classifier reaches the same tier by falling through the two lookups, so
    //  removing the explicit branch changes only what it SAYS. That is still
    //  worth guarding, because what it says is what a human reads at 7am.
    must: ['and it says it was not reproduced, rather than blaming a null issue type'],
  },
  {
    name: 'GATE: an unknown issue type falls through to a fix instead of a human',
    file: 'morning',
    find: "  return {\n    tier: 'needs_tanner',\n    type: issueType,\n    reason: `issue type \"${issueType}\" is on no tier list`,",
    repl: "  return {\n    tier: 'auto_fix',\n    type: issueType,\n    reason: `issue type \"${issueType}\" is on no tier list`,",
    must: ['an issue type on no list goes to a human, not to a default fix'],
  },

  // ── The email. ──────────────────────────────────────────────────────────
  {
    name: 'EMAIL: the morning prefix is renamed',
    file: 'morning',
    find: "const PREFIX_MORNING = '[APCS Morning]';",
    repl: "const PREFIX_MORNING = '[APCS Daily]';",
    must: ['the subject is the exact [APCS Morning] shape'],
  },
  {
    name: 'EMAIL: the morning mail takes an inbound rule prefix, so it leaves the Inbox',
    file: 'morning',
    find: "const PREFIX_MORNING = '[APCS Morning]';",
    repl: "const PREFIX_MORNING = '[APCS Bug]';",
    must: ['it is NOT one of the three inbound rule prefixes, so it stays in the Inbox'],
  },
  {
    name: 'EMAIL: a dry run stops announcing itself',
    file: 'morning',
    find: "  if (fixMode() !== 'live') {\n    lines.push('DRY RUN.",
    repl: "  if (false) {\n    lines.push('DRY RUN.",
    must: ['a dry run says so in the body, above the Fixed list'],
  },
  {
    name: 'EMAIL: the junk text is printed instead of counted',
    file: 'morning',
    find: "  lines.push(`JUNK DISMISSED: ${o.dismissed || 0}`);",
    repl: "  lines.push('JUNK DISMISSED: none reported');",
    must: ['the body carries all four sections'],
  },

  // ── The endpoints. ──────────────────────────────────────────────────────
  {
    name: 'AUTH: the PATCH starts accepting the read-only key',
    file: 'route',
    find: "router.patch('/api/assistant/reports/:id', requireReportAdmin(), async (req, res) => {",
    repl: "router.patch('/api/assistant/reports/:id', requireReportAdmin({ readOnly: true }), async (req, res) => {",
    must: ['PATCH refuses the read-only key'],
  },
  {
    name: 'AUTH: the report endpoints stop failing closed',
    file: 'route',
    find: "    if (hasAdminKey(req)) return next();\n    if (readOnly && hasAdminReadKey(req)) return next();\n    return res.status(403).json({ error: 'Invalid or missing admin key.' });",
    repl: "    return next();",
    must: ['GET /reports with no key is refused'],
  },
  {
    name: 'PATCH: fixed stops going through the once-only thank-you path',
    file: 'route',
    find: "    if (status === 'fixed') {\n      const out = await thanks.markFixed(id, note);",
    repl: "    if (false) {\n      const out = await thanks.markFixed(id, note);",
    must: ['PATCH to fixed sends exactly one thank-you'],
  },
  {
    name: 'PATCH: an unknown status is accepted',
    file: 'route',
    find: "    if (!morning.STATUS_SET.has(status)) {\n      return res.status(400).json({ error: 'Unknown status.', statuses: morning.STATUSES });\n    }\n    const row = db.prepare('SELECT id, status, thread_key FROM chat_escalations WHERE id = ?').get(id);",
    repl: "    const row = db.prepare('SELECT id, status, thread_key FROM chat_escalations WHERE id = ?').get(id);",
    must: ['PATCH refuses an unknown status'],
  },
];

(async () => {
  console.log('Mutation battery: the morning verify/fix guardrails');
  console.log(`  baseline first, then ${MUTATIONS.length} mutations\n`);

  const baseline = runSuite();
  ok('baseline: the suite passes unmutated', baseline.code === 0,
    { code: baseline.code, failed: baseline.failed.slice(0, 5) });
  if (baseline.code !== 0) {
    console.log('\n  Baseline is red. Nothing below can mean anything. Stopping.');
    console.log(baseline.out.slice(-3000));
    restore();
    process.exit(1);
  }

  for (const m of MUTATIONS) {
    console.log(`\n  ${m.name}`);
    const p = FILES[m.file];
    const src = ORIGINAL[m.file];
    if (!src.includes(m.find)) {
      ok('the mutation target still exists in the source', false, { file: m.file, find: m.find.slice(0, 140) });
      continue;
    }
    fs.writeFileSync(p, src.replace(m.find, m.repl));
    const res = runSuite();
    restore();

    ok('the suite goes RED', res.code !== 0, { code: res.code });
    for (const want of m.must) {
      ok(`and it is "${want}" that fails`, res.failed.some((f) => f.startsWith(want)),
        { wanted: want, sawInstead: res.failed.slice(0, 6) });
    }
  }

  restore();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log('A mutation the suite did not catch means that rule is HOLLOW.');
  process.exit(fail ? 1 : 0);
})().catch((e) => { restore(); console.error(e); process.exit(1); });
