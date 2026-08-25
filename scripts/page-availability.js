'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  IS THE SITE ACTUALLY USABLE RIGHT NOW?
//
//  ── WHY HTTP 200 IS NOT THE QUESTION ───────────────────────────────────────
//  When progress.apcsexamprep.com went down, every page kept returning 200.
//  They served their heading, their prose and a mount point, and then sat
//  waiting for an API that was not answering. An uptime check that asks for a
//  status code would have been green for the entire outage.
//
//  So this asks the question a student would ask: if I open this page, is the
//  thing I came for going to appear? For a page that mounts content from the
//  API, that means checking the API endpoint THAT PAGE depends on, not a
//  generic health route. /api/health can be perfectly happy while /api/frq is
//  broken by a bad spec.
//
//  ── WHAT IT CHECKS, PER PAGE ───────────────────────────────────────────────
//  1. the page responds 200
//  2. its body is not suspiciously short (a truncated import looks like this)
//  3. every API endpoint the page mounts from answers, and answers with the
//     shape the page expects
//  4. the page carries an outage fallback, so that even if 3 fails today the
//     student gets an explanation rather than a spinner
//
//  Check 4 is the one that turns a total outage into a degraded one. A page
//  that fails 3 but passes 4 is not down; it is honest.
//
//  Single threaded with a pause between pages: board item #79 records 46 pages
//  returning 429 during a parallel crawl of this storefront.
//
//  Zero PII: public pages and public endpoints only. No credentials are sent.
//
//  Run: node scripts/page-availability.js [--json]
//  Exit 0 if everything a student needs works, 1 otherwise.
// ─────────────────────────────────────────────────────────────────────────────

const STORE = 'https://www.apcsexamprep.com';
const API = 'https://progress.apcsexamprep.com';
const DELAY_MS = 1500;

// A floor rather than an exact size: these pages are edited legitimately. It is
// set well under the smallest real rendered page and exists to catch a body
// that arrived empty or truncated, not to police normal drift.
const MIN_RENDERED_BYTES = 50000;

// The pages a class actually depends on, and what each one needs to work.
// A page listed here with `mounts` is one that would show a spinner rather than
// content if that endpoint were down.
const PAGES = [
  { handle: 'cyber-command-center', why: 'the teacher hub for AP Cybersecurity' },
  { handle: 'ap-cybersecurity-complete-course-guide', why: 'the student course spine' },
  { handle: 'ap-cybersecurity-practice-exam', why: 'the multiple choice practice' },
  { handle: 'ap-cybersecurity-frq-practice', why: 'the FRQ hub', optional: true },
  { handle: 'ap-cybersecurity-practice', why: 'the practice umbrella', optional: true },
  { handle: 'ap-cybersecurity-labs', why: 'the labs hub', optional: true },
  { handle: 'ap-cybersecurity-frq-library-kiosk', why: 'a Device Security Analysis set',
    mounts: '/api/frq/ap-cybersecurity/dsa-library-kiosk', expect: (j) => !!j.parts },
  { handle: 'ap-cyber-unit-1-lesson-2-terminal-lab', why: 'a terminal lab',
    mounts: '/api/labs/ap-cybersecurity/1.2-lab', expect: (j) => Array.isArray(j.checks) },
];

// Endpoints checked once, independently of any page.
const ENDPOINTS = [
  { path: '/api/health', expect: (j) => j.status === 'ok', why: 'the service is up at all' },
  { path: '/api/frq', expect: (j) => Array.isArray(j.sets) && !j.spec_errors.length,
    why: 'every practice set loads and validates' },
  { path: '/api/labs', expect: (j) => Array.isArray(j.labs) && !j.spec_errors.length,
    why: 'every lab loads and validates' },
  { path: '/api/practice/ap-cybersecurity', expect: (j) => Array.isArray(j.frq),
    why: 'the hubs can refresh themselves' },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// A total outage does not return a status code. DNS fails, the connection is
// refused, TLS times out, and fetch REJECTS. That is the single most likely
// shape of the thing this script exists to detect, so a throw has to become a
// reported failure rather than a stack trace: an operator reading a 3am
// workflow summary needs to see which thing is down, not a Node backtrace.
//
// Found by running this script against a simulated outage. It exited non-zero,
// which was correct, and printed a stack trace, which was useless.
async function getText(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return { status: res.status, ok: res.ok, text: await res.text() };
  } catch (e) {
    return { status: 0, ok: false, text: '', error: e.message };
  }
}

async function getJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, status: res.status, json: null };
    try { return { ok: true, status: res.status, json: await res.json() }; }
    catch (e) { return { ok: false, status: res.status, json: null, parse: e.message }; }
  } catch (e) {
    return { ok: false, status: 0, json: null, error: e.message };
  }
}

async function main(argv) {
  const asJson = argv.includes('--json');
  const results = [];
  let bad = 0;

  for (const e of ENDPOINTS) {
    const r = await getJson(API + e.path);
    const good = r.ok && r.json && e.expect(r.json);
    if (!good) bad++;
    results.push({ kind: 'endpoint', target: e.path, ok: good, status: r.status, why: e.why,
      error: r.error || null });
    await sleep(300);
  }

  for (const p of PAGES) {
    const r = await getText(`${STORE}/pages/${p.handle}`);
    const rec = { kind: 'page', target: p.handle, why: p.why, status: r.status,
      bytes: r.text.length, ok: true, notes: [] };

    if (r.status === 404 && p.optional) {
      rec.ok = true;
      rec.notes.push('not imported yet, which is expected');
    } else if (r.error) {
      rec.ok = false;
      rec.notes.push(`unreachable: ${r.error}`);
    } else if (!r.ok) {
      rec.ok = false;
      rec.notes.push(`HTTP ${r.status}`);
    } else {
      if (r.text.length < MIN_RENDERED_BYTES) {
        rec.ok = false;
        rec.notes.push(`only ${r.text.length} bytes rendered, which looks truncated`);
      }
      // The fallback is what makes an API outage survivable. Its absence is not
      // an outage today, but it is the difference between degraded and down
      // during the next one, so it is reported rather than ignored.
      if (p.mounts && !r.text.includes('APCSPageFallback')) {
        rec.notes.push('WARN: no outage fallback on this page, so an API outage '
          + 'would show as a permanent spinner');
      }
      if (p.mounts) {
        const api = await getJson(API + p.mounts);
        const good = api.ok && api.json && p.expect(api.json);
        if (!good) {
          rec.ok = false;
          rec.notes.push(`its content endpoint ${p.mounts} is not answering correctly `
            + `(HTTP ${api.status})`);
        }
      }
    }
    if (!rec.ok) bad++;
    results.push(rec);
    await sleep(DELAY_MS);
  }

  if (asJson) {
    console.log(JSON.stringify({ checked_at: new Date().toISOString(), bad, results }, null, 2));
  } else {
    console.log('\nENDPOINTS');
    results.filter((r) => r.kind === 'endpoint').forEach((r) => {
      console.log(`  ${r.ok ? 'OK  ' : 'DOWN'}  ${r.target.padEnd(34)} ${r.why}`);
      if (r.error) console.log(`        unreachable: ${r.error}`);
      else if (!r.ok) console.log(`        HTTP ${r.status}, or the response was not the expected shape`);
    });
    console.log('\nPAGES');
    results.filter((r) => r.kind === 'page').forEach((r) => {
      console.log(`  ${r.ok ? 'OK  ' : 'DOWN'}  ${r.target}`);
      console.log(`        ${r.why}, ${r.bytes} bytes, HTTP ${r.status}`);
      r.notes.forEach((n) => console.log(`        ${n}`));
    });
    console.log(bad
      ? `\n${bad} problem(s). See docs/availability.md for what each one means.`
      : '\nEverything a class needs is answering.');
  }
  process.exit(bad ? 1 : 0);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}

module.exports = { PAGES, ENDPOINTS, MIN_RENDERED_BYTES, STORE, API };
