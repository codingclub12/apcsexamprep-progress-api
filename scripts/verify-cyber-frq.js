#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  VERIFY THE AP CYBERSECURITY DEVICE SECURITY ANALYSIS BANK against live state.
//
//  Board tasks 113, 114 and 115 shipped five Device Security Analysis sets and
//  a hub, and all three have been sitting in needs_verification because rule 4
//  says the agent that built a thing is never the one that says it is true.
//  This script is the independent re-check that rule allows: it refetches the
//  live API and the live storefront and re-derives the claim from the raw
//  payload, without reference to whatever the builder asserted.
//
//  -- WHY IT READS THE API AND NOT THE PAGE BODY -----------------------------
//
//  The five FRQ pages inject their sources client side: a curl of
//  /pages/ap-cybersecurity-frq-library-kiosk finds the string "Loading the
//  practice question..." and none of the firewall rules, logs, file listings or
//  policy text it is supposed to assert. So the obvious page-body grep is a
//  false negative generator - it fails against a page that is completely
//  correct. The sources are real, they arrive from /api/frq/:course/:set_id,
//  and that is what this asserts, with the page fetched separately for its
//  status code only.
//
//  -- WHAT IT PROVES ---------------------------------------------------------
//
//  1. Every set the live index advertises resolves, and its storefront page
//     returns 200. A set listed in the hub that 404s is a dead link with a
//     rubric behind it.
//  2. Six sources, parts A through E, 50 minutes. This is the real Section II
//     shape and the reason the bank exists.
//  3. All four artifact types are present in every set: firewall rules, system
//     AND application logs, a file-and-permissions listing, and a device
//     policy. These are asserted by source `kind`, not by prose matching, so a
//     set cannot pass by mentioning the word "firewall" in an intro.
//  4. Every subpart carries a credit rubric. A subpart with no `credit` array
//     is a question a self-scoring student cannot mark, which is the whole
//     promise of the page.
//
//  Run with --json for machine output. Exit 1 on any failure.
// ---------------------------------------------------------------------------

const API = process.env.FRQ_API_BASE || 'https://progress.apcsexamprep.com';
const STORE = process.env.FRQ_STORE_BASE || 'https://apcsexamprep.com';
const COURSE = 'ap-cybersecurity';

// Asserted against the source `kind` field, never against prose.
const REQUIRED_ARTIFACTS = {
  'firewall rules': (kinds) => kinds.includes('firewall-rules'),
  'system log': (kinds) => kinds.some((k) => k === 'auth-log' || k === 'system-log'),
  'application log': (kinds) => kinds.includes('app-log'),
  'file and permissions listing': (kinds) => kinds.includes('file-listing'),
  'device policy': (kinds) => kinds.includes('policy')
};

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} -> HTTP ${r.status}`);
  return r.json();
}

async function statusOf(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    return r.status;
  } catch (err) {
    return 0;
  }
}

function checkSet(set, pageStatus) {
  const kinds = (set.sources || []).map((s) => s.kind);
  const parts = set.parts || {};
  const partIds = Object.keys(parts).sort();
  const subparts = Object.values(parts)
    .reduce((n, p) => n + ((p.subparts || []).length), 0);
  const uncredited = Object.entries(parts).flatMap(([id, p]) =>
    (p.subparts || [])
      .map((sp, i) => (sp.credit && sp.credit.length ? null : `${id}${i + 1}`))
      .filter(Boolean));

  const checks = {
    'page returns 200': pageStatus === 200,
    'six sources': (set.sources || []).length === 6,
    'parts A-E': partIds.join('') === 'ABCDE',
    'fifty minutes': set.est_minutes === 50,
    'every subpart rubriced': uncredited.length === 0
  };
  for (const [name, pred] of Object.entries(REQUIRED_ARTIFACTS)) {
    checks[name] = pred(kinds);
  }

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([n]) => n);
  return { checks, failed, subparts, partIds, uncredited, kinds };
}

async function main() {
  const asJson = process.argv.includes('--json');
  const index = await getJson(`${API}/api/frq`);
  const sets = (index.sets || []).filter((s) => s.course === COURSE);

  if (!sets.length) {
    console.error('FAIL: the live index advertises no ap-cybersecurity sets');
    process.exit(1);
  }

  const results = [];
  for (const meta of sets.sort((a, b) => a.order - b.order)) {
    const set = await getJson(`${API}/api/frq/${COURSE}/${meta.set_id}`);
    const pageStatus = await statusOf(`${STORE}/pages/${meta.page_handle}`);
    const r = checkSet(set, pageStatus);
    results.push({ set_id: meta.set_id, page_handle: meta.page_handle, pageStatus, ...r });
  }

  const bad = results.filter((r) => r.failed.length);

  if (asJson) {
    console.log(JSON.stringify({ count: results.length, failed: bad.length, results }, null, 2));
  } else {
    console.log(`ap-cybersecurity Device Security Analysis sets live: ${results.length}\n`);
    for (const r of results) {
      const tag = r.failed.length ? 'FAIL' : 'PASS';
      console.log(`[${tag}] ${r.set_id.padEnd(26)} http=${r.pageStatus} ` +
        `sources=${r.kinds.length} parts=${r.partIds.join('')} subparts=${r.subparts}`);
      if (r.failed.length) console.log(`       failed: ${r.failed.join(', ')}`);
      if (r.uncredited.length) console.log(`       subparts with no rubric: ${r.uncredited.join(', ')}`);
    }
    console.log('');
    console.log(bad.length
      ? `RESULT: FAIL - ${bad.length} of ${results.length} sets failed`
      : `RESULT: PASS - ${results.length} sets, each six sources, parts A-E, ` +
        'all four artifact types, every subpart rubriced');
  }
  process.exit(bad.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});
