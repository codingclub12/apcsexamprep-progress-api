#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY for the report-first routing rules.
//
//  Break each rule on purpose, one at a time, and require
//  smoke/assistant-report-routing.js to go red FOR THAT RULE. A green mutation
//  run is a FAILED check, and here that is the exit code.
//
//  WHY THIS IS NOT OPTIONAL HERE. Three guards in this repo have been found
//  hollow: green either way, passing for a reason that had nothing to do with
//  what they claimed to test. The subject-prefix assertions are the most
//  likely next one, because a suite that reads the prefix from the module it is
//  testing passes after any rename. So the mutations below include a rename of
//  each prefix constant, and the suite must notice all three.
//
//  `must` names the assertions that have to be the ones that fail. Requiring
//  only "something went red" is how a mutation battery lies to you: a suite that
//  goes red for a DIFFERENT rule is telling you the rule you meant to test is
//  hollow, which is exactly the finding that made this a repo convention.
//
//  Run: npm run smoke:assistantroutingmutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUITE = path.join(__dirname, 'assistant-report-routing.js');
const FILES = {
  report: path.join(ROOT, 'lib', 'assistant', 'report.js'),
  junk: path.join(ROOT, 'lib', 'assistant', 'junk-filter.js'),
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
  // ── The three prefixes. The whole point of the suite. ────────────────────
  {
    name: 'RULE 3.2a: the urgent prefix is renamed',
    file: 'report',
    find: "const PREFIX_URGENT = '[APCS Urgent]';",
    repl: "const PREFIX_URGENT = '[APCS URGENT]';",
    must: ['the urgent prefix is the exact string'],
  },
  {
    name: 'RULE 3.2b: the bug prefix is renamed',
    file: 'report',
    find: "const PREFIX_BUG = '[APCS Bug]';",
    repl: "const PREFIX_BUG = '[APCS Problem]';",
    must: ['the bug prefix is the exact string'],
  },
  {
    name: 'RULE 3.2c: the suggestion prefix is renamed',
    file: 'report',
    find: "const PREFIX_SUGGESTION = '[APCS Suggestion]';",
    repl: "const PREFIX_SUGGESTION = '[APCS Idea]';",
    must: ['the suggestion prefix is the exact string'],
  },
  {
    //  The named assertions are the full-URL ones, NOT the bare-path one above
    //  them in the suite. A report posted with a bare path cannot tell a path
    //  from a URL, so that assertion stays green under this mutation: it was
    //  hollow, and this battery is what found it.
    name: 'RULE 3.2d: the subject carries the full URL instead of the page path',
    file: 'report',
    find: "  const path = pagePath(pageUrl) || '(no page)';",
    repl: "  const path = pageUrl || '(no page)';",
    must: [
      'a full URL is reduced to its PATH in the subject',
      'the host never reaches the subject',
      'the query string never reaches the subject',
    ],
  },

  // ── Threading, 3.4 ───────────────────────────────────────────────────────
  {
    name: 'RULE 3.4a: follow-ups stop quoting the first Message-ID',
    file: 'report',
    find: "    headers['In-Reply-To'] = head.thread_message_id;",
    repl: "    headers['X-Not-In-Reply-To'] = head.thread_message_id;",
    must: ['the follow-up sets In-Reply-To to the first Message-ID'],
  },
  {
    name: 'RULE 3.4b: the thread key splits on the query string',
    file: 'report',
    find: "  return `${pagePath(pageUrl) || '(nopage)'}|${category}`;",
    repl: "  return `${pageUrl || '(nopage)'}|${category}`;",
    must: ['a query string does not split the thread (path, not URL)'],
  },
  {
    name: 'RULE 3.4c: the head Message-ID stops being stored',
    file: 'report',
    find: "      try { stSetThread.run(messageId, count, r.escalationId); } catch (_) { /* pre-migration */ }",
    repl: "      try { stSetThread.run(null, count, r.escalationId); } catch (_) { /* pre-migration */ }",
    must: ['the head Message-ID is stored on the row'],
  },
  {
    name: 'RULE 3.4d: the follow-up stops saying which report of how many',
    file: 'report',
    find: "    lines.push(`Report ${threadSeq} of ${threadTotal} for this page today.`);",
    repl: "    lines.push('Another report for this page today.');",
    must: ['the follow-up body says which report of how many'],
  },

  // ── Urgency, 3.3 ─────────────────────────────────────────────────────────
  {
    name: 'RULE 3.3a: the answer-key phrases stop raising urgency',
    file: 'report',
    find: "  if (mentionsAny(text, LEAK_PHRASES)) return 'immediate';",
    repl: "  if (false && mentionsAny(text, LEAK_PHRASES)) return 'immediate';",
    must: ['a leak report is raised to immediate by its TEXT'],
  },
  {
    name: 'RULE 3.3b: digest mode swallows urgent reports too',
    file: 'route',
    find: "    if (report.emailMode() === 'digest' && severity !== 'immediate') {",
    repl: "    if (report.emailMode() === 'digest') {",
    must: ['digest mode still sends URGENT immediately (acceptance 3)'],
  },
  {
    name: 'RULE 4.3: a suggestion becomes raisable to urgent',
    file: 'report',
    find: "  if (category === 'suggestion') return 'normal';",
    repl: "  if (category === 'suggestion' && false) return 'normal';",
    must: ['a suggestion is never urgent (handoff 4.3)'],
  },

  // ── The junk filter, 3.5, one rule at a time ─────────────────────────────
  {
    name: 'RULE 3.5a: the too-short rule stops firing',
    file: 'junk',
    find: "  if (words(text) < MIN_WORDS && !anyFieldFilled && !hasConsole) {",
    repl: "  if (false && words(text) < MIN_WORDS && !anyFieldFilled && !hasConsole) {",
    must: ['it names which rule dismissed it'],
  },
  {
    name: 'RULE 3.5b: the external-link rule stops firing',
    file: 'junk',
    find: "  if (ext.length > MAX_EXTERNAL_LINKS) {",
    repl: "  if (false && ext.length > MAX_EXTERNAL_LINKS) {",
    must: ['it names the link rule'],
  },
  {
    name: 'RULE 3.5c: the repeat rule stops firing',
    file: 'junk',
    find: "  if (isRepeat(ipHash, text)) {",
    repl: "  if (false && isRepeat(ipHash, text)) {",
    must: ['it names the repeat rule'],
  },
  {
    name: 'RULE 3.5d: the not-a-browser rule stops firing',
    file: 'junk',
    find: "  if (!adminBypass && !looksLikeBrowser(userAgent)) {",
    repl: "  if (false && !adminBypass && !looksLikeBrowser(userAgent)) {",
    must: ['a non-browser User-Agent is dismissed'],
  },
  {
    name: 'RULE 3.5e: junk gets emailed after all',
    file: 'route',
    find: "    if (dismissed) {\n      report.markEmail(stored.id, 'suppressed');\n      return;\n    }",
    repl: "    if (dismissed && false) {\n      report.markEmail(stored.id, 'suppressed');\n      return;\n    }",
    must: ['NO email goes for it'],
  },
  {
    //  NOTE, because the first version of this mutation was a no-op and that is
    //  worth keeping: breaking the store-time status alone changes nothing,
    //  because recordVerdict writes the status again a few lines later from the
    //  layer 3 verdict. Two independent writes agree, so one has to be wrong
    //  before anything moves. The mutation therefore breaks the SECOND one,
    //  which is the write that actually decides what the row ends up saying.
    name: 'RULE 3.5f: junk is not marked dismissed on the row',
    file: 'route',
    find: "      status: dismissed ? 'dismissed' : 'open',",
    repl: "      status: 'open',",
    must: ['it is stored as dismissed'],
  },
  {
    name: 'LAYER 3 POSTURE: the filter stops failing open when the model is off',
    file: 'junk',
    find: "    return { label: 'real', summary: null, severity: null, reason: 'model_unconfigured' };",
    repl: "    return { label: 'junk', summary: null, severity: null, reason: 'model_unconfigured' };",
    must: ['with no model key, triage answers real'],
  },
  {
    name: 'LAYER 3 PARSING: an unknown label is trusted instead of refused',
    file: 'junk',
    find: "  const label = ['real', 'vague', 'junk'].includes(obj.label) ? obj.label : null;",
    repl: "  const label = obj.label || null;",
    must: ['an unknown label is refused rather than trusted'],
  },

  // ── 3.1, the board ───────────────────────────────────────────────────────
  {
    name: 'RULE 3.1: reports start filing board tasks again by default',
    file: 'report',
    find: "function filesTodos() { return envOn('REPORTS_FILE_TODOS', false); }",
    repl: "function filesTodos() { return envOn('REPORTS_FILE_TODOS', true); }",
    must: ['REPORTS_FILE_TODOS defaults to off'],
  },

  // ── The PII posture, which none of the above may quietly relax ───────────
  {
    name: 'PII: a student report starts keeping its prose',
    file: 'report',
    find: "    summary: keepBodies ? (summary || null) : null,",
    repl: "    summary: summary || null,",
    must: ['a student report stores no prose'],
  },
  {
    name: 'PII: a client-supplied reporter email stops being gated on retention',
    file: 'report',
    find: "    reporter_email: keepBodies ? (reporterEmail || null) : null,",
    repl: "    reporter_email: reporterEmail || null,",
    must: ['a client-supplied reporter email is dropped for a student'],
  },

  // ── Header safety ────────────────────────────────────────────────────────
  {
    //  headerSafe strips CR and LF TWICE, once as whitespace and once inside the
    //  control-character class. Removing either alone is a no-op, which is the
    //  code being right and the first draft of this mutation being useless. Both
    //  have to go before the guard is actually gone.
    name: 'HEADERS: a newline in the page URL can reach the subject line',
    file: 'report',
    find: "    .replace(/[\\r\\n\\t]+/g, ' ')\n    .replace(/[\\u0000-\\u001f\\u007f]+/g, '')",
    repl: "    .replace(/[ ]+/g, ' ')",
    //  NOT the page-URL assertion: pagePath() runs the URL through the WHATWG
    //  parser, which strips CR and LF itself, so that one stays green with
    //  headerSafe gone. The reporter-text assertions are the ones headerSafe is
    //  the only thing standing in front of.
    must: [
      'a newline in the reporter TEXT cannot reach the subject line',
      'headerSafe flattens CR, LF and TAB',
      'headerSafe strips other control characters',
    ],
  },

  // ── The from domain, which decides whether Resend accepts anything ───────
  {
    name: 'MAIL: the From address goes back to the unverified apex domain',
    file: 'report',
    // notifyStatus reports the domain; break it by pointing the default at the
    // apex, which carries none of the Resend records and whose SPF ends in -all.
    find: "    from_domain: mailer.fromDomain(),",
    repl: "    from_domain: 'apcsexamprep.com',",
    must: ['the default from domain is the Resend-verified subdomain'],
  },
];

(async () => {
  console.log('Mutation battery: report-first routing');
  console.log(`  baseline first, then ${MUTATIONS.length} mutations\n`);

  // The baseline has to be GREEN, or every "went red" below means nothing.
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
      ok('the mutation target still exists in the source', false, { file: m.file, find: m.find.slice(0, 120) });
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
