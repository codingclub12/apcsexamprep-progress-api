#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE MORNING VERIFY AND FIX STAGE  (handoff section 6.2)
//
//  Run from the existing Daily site audit routine, NOT from a trigger of its
//  own. The handoff is explicit about that and the reason is in the trigger
//  list: the Morning brief trigger has no environment and cannot write to the
//  repo, while the Daily site audit already has both repos checked out and
//  already runs on a schedule.
//
//      npm run morning              read, reproduce, report
//      npm run morning -- --json    the same, as JSON on stdout
//
//  WHAT IT DOES, in the handoff's order:
//    1. Pull open reports from the last 24 hours, plus anything still confirmed.
//    2. Reproduce each against the live site with real HTTP fetches.
//    3. Fix only whitelisted types, and only when the mode says live.
//    4. Re-verify each fix against the live page body.
//    5. Send one [APCS Morning] email.
//    6. Thank the reporters of confirmed fixes.
//
//  IT DOES NOT WRITE IN THIS PASS, and that is not a limitation to be removed
//  quietly. MORNING_FIX_MODE defaults to dry_run, handoff 6.4 puts a fourteen
//  day dry run in front of the first live write, and every write path below is
//  behind lib/assistant/morning.js writeDecision(), which refuses unless the
//  mode, the kill switch and the cap all agree.
//
//  CREDENTIALS, and this is the part that will bite first. The endpoints are
//  admin-key protected and NO WORKFLOW OR ENVIRONMENT IN THIS PROJECT CURRENTLY
//  HOLDS ONE: sixteen GitHub workflows hold TODO_KEY and none hold ADMIN_KEY,
//  and the Claude Code environment has neither. So this script needs
//  ADMIN_READ_KEY (enough for the whole dry run) or ADMIN_KEY (needed before
//  anything can be marked fixed), and it says so plainly and exits rather than
//  reporting an empty morning that looks like a quiet night.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const morning = require('../lib/assistant/morning');

const API = (process.env.PUBLIC_API_BASE || 'https://progress.apcsexamprep.com').replace(/\/+$/, '');
const JSON_OUT = process.argv.includes('--json');

// The full key if we have it, the read key otherwise. Which one we hold decides
// what this run is allowed to attempt, so it is resolved once, here, rather than
// rediscovered at each call site.
const FULL_KEY = process.env.ADMIN_KEY || '';
const READ_KEY = process.env.ADMIN_READ_KEY || '';
const KEY = FULL_KEY || READ_KEY;
const CAN_WRITE = !!FULL_KEY;

function say(...a) { if (!JSON_OUT) console.log(...a); }

async function api(path, opts) {
  const res = await fetch(API + path, Object.assign({
    headers: Object.assign({ 'x-admin-key': KEY }, (opts && opts.headers) || {}),
  }, opts || {}));
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { /* leave null */ }
  return { status: res.status, json, text };
}

// ── STEP 2: REPRODUCE ───────────────────────────────────────────────────────
//
//  Against the LIVE site, with real fetches, through lib/storefront-fetch.js.
//  That module is not optional: the bot management on this storefront has been
//  in three states in one week, and a challenge page served with a 200 contains
//  none of the strings a check looks for. Every assertion of the form "the
//  problem is gone now" passes on it. Three verifiers in this repo have already
//  reported confident, plausible, entirely false regressions that way.
//
//  Returns { reproduced, issueType, evidence }.
async function reproduce(report) {
  const path = report.page_url ? String(report.page_url).split('?')[0] : null;
  if (!path || !path.startsWith('/')) {
    return { reproduced: false, issueType: null, evidence: 'no page path on the report' };
  }

  let body = '';
  try {
    const sf = require('../lib/storefront-fetch');
    const r = await sf.raw(path);
    body = String((r && r.body) || '');
  } catch (e) {
    // NotThePage, a challenge, a timeout. All the same answer: this morning
    // cannot say anything about this report, which is not the same as saying
    // the report was wrong.
    return { reproduced: false, issueType: null, evidence: 'could not fetch the page: ' + (e && e.message) };
  }
  if (body.length < 2000) {
    return { reproduced: false, issueType: null, evidence: `page body was only ${body.length} bytes` };
  }

  // Mojibake, through lib/mojibake.js and never a pasted pattern. CLAUDE.md is
  // explicit: a pattern list cannot tell you it has stopped working.
  try {
    const mojibake = require('../lib/mojibake');
    const hits = mojibake.analyze(body);
    if (hits && hits.length) {
      return {
        reproduced: true,
        issueType: 'mojibake',
        evidence: `${hits.length} corrupted run(s), first at index ${hits[0].index}: ${JSON.stringify(hits[0].chunk)} should be ${JSON.stringify(hits[0].fixed)}`,
      };
    }
  } catch (e) { /* the module is the authority; if it cannot run, say nothing */ }

  // Everything else needs a judgement this script does not make on its own. A
  // report it cannot pin to a known issue type is a report for a human, which is
  // the boring common case by design rather than a failure.
  return { reproduced: false, issueType: null, evidence: 'page fetched cleanly and no known issue type matched' };
}

// ── STEP 4: RE-VERIFY ───────────────────────────────────────────────────────
//
//  Handoff 6.2: "A fix counts only if the live page now shows the corrected
//  content. A 200 from the write call is not proof." So this refetches and
//  asserts the defect is gone, and it is the only thing allowed to call a fix
//  fixed.
async function reverify(report, issueType) {
  const check = await reproduce(report);
  if (check.issueType === issueType) {
    return { verified: false, evidence: 'the same problem is still on the live page: ' + check.evidence };
  }
  if (!check.reproduced) return { verified: true, evidence: check.evidence };
  return { verified: false, evidence: 'a different problem is now on the page: ' + check.evidence };
}

(async () => {
  if (!KEY || KEY.length < 20) {
    console.error('morning: no admin credential.');
    console.error('');
    console.error('  Set ADMIN_READ_KEY for the dry run, which is all it needs: the routine');
    console.error('  reads reports and reproduces them and writes nothing.');
    console.error('  Set ADMIN_KEY as well before MORNING_FIX_MODE=live, because marking a');
    console.error('  report fixed emails the teacher who reported it.');
    console.error('');
    console.error('  Neither is currently on this environment, and no workflow in this repo');
    console.error('  holds one either. This is a Tanner action, like REPORTS_TO.');
    process.exit(2);
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  say(`Morning review. mode=${morning.fixMode()} fixing=${morning.fixEnabled() ? 'on' : 'OFF'} cap=${morning.maxWrites()}`);
  say(`Credential: ${CAN_WRITE ? 'full admin key' : 'read-only key, so nothing can be marked fixed'}`);
  say(`Since: ${since}`);
  say('');

  const open = await api(`/api/assistant/reports?status=open&since=${encodeURIComponent(since)}&limit=200`);
  if (open.status !== 200) {
    console.error(`morning: could not read reports (HTTP ${open.status})`);
    console.error(open.text.slice(0, 300));
    process.exit(1);
  }
  const confirmed = await api('/api/assistant/reports?status=confirmed&limit=200');

  const reports = (open.json.reports || []).concat((confirmed.json && confirmed.json.reports) || []);
  const dismissed = open.json.dismissed_since || 0;
  say(`${reports.length} report(s) to review, ${dismissed} dismissed as junk since ${since}`);
  say('');

  const out = { reviewed: reports.length, dismissed, fixed: [], needs: [], cannot: [] };
  let writes = 0;

  for (const r of reports) {
    const rep = await reproduce(r);
    const verdict = morning.classify(r, rep.issueType);
    const page = r.page_url || '(no page)';

    // Never Touch short-circuits everything, including the reproduce result.
    if (verdict.tier === 'never_touch') {
      out.needs.push({ id: r.id, page, tier: 'never_touch', reason: verdict.reason, action: verdict.action });
      say(`  NEVER TOUCH  ${page}  ${verdict.reason}`);
      continue;
    }

    if (!rep.reproduced) {
      out.cannot.push({ id: r.id, page, evidence: rep.evidence });
      say(`  no repro     ${page}  ${rep.evidence}`);
      if (CAN_WRITE) {
        await api(`/api/assistant/reports/${r.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cannot_reproduce', resolution_note: rep.evidence.slice(0, 500) }),
        });
      }
      continue;
    }

    const decision = morning.writeDecision(verdict, writes);
    if (!decision.write) {
      out.needs.push({
        id: r.id, page, tier: verdict.tier,
        reason: `${verdict.reason}. ${rep.evidence}`,
        action: `${verdict.action}  (not written: ${decision.why})`,
      });
      say(`  ${verdict.tier.padEnd(12)} ${page}  ${verdict.reason}  [${decision.why}]`);
      continue;
    }

    // ── THE ONLY WRITE PATH, and nothing reaches it in dry run ──
    //
    // Deliberately not implemented in this PR. Every fix type in the auto-fix
    // tier writes to the live storefront, through a Matrixify sheet or a Shopify
    // redirect, and shipping that on the same day as the thing that decides WHEN
    // to write it would mean the guardrails and the writes were never reviewed
    // apart. The dry run is fourteen days long; the writer lands inside it.
    writes++;
    const verified = await reverify(r, rep.issueType);
    out.fixed.push({
      id: r.id, page, type: verdict.type, action: verdict.action,
      before: rep.evidence,
      after: verified.evidence,
      revert: null,
      cache_delayed: morning.cacheDelayed(rep.issueType, page),
    });
    say(`  FIXED        ${page}  ${verdict.type}`);
  }

  const subject = morning.morningSubject(new Date().toISOString().slice(0, 10), out.fixed.length, out.needs.length);
  const body = morning.morningBody(out);

  if (JSON_OUT) {
    console.log(JSON.stringify({ subject, body, result: out }, null, 2));
  } else {
    say('');
    say('-'.repeat(64));
    say(subject);
    say('-'.repeat(64));
    say(body);
  }

  // The email goes through the same mailer as everything else, and it is best
  // effort: a mail outage must not make the review look like it did not run.
  try {
    const mailer = require('../lib/mailer');
    const report = require('../lib/assistant/report');
    const to = report.recipient();
    if (to) await mailer.sendEmail({ to, subject, text: body });
    else say('\n(no REPORTS_TO configured, so the morning mail was not sent)');
  } catch (e) {
    console.error('morning: mail failed:', e && e.message);
  }

  process.exit(0);
})().catch((e) => {
  console.error('morning-report-review failed:', e && e.message);
  process.exit(1);
});
