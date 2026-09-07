#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Is the 1.1 analysis activity actually SERVED BY THE SERVER now, and is its
//  answer key actually off the page?
//
//  Both halves matter and they fail independently. The API can be serving the
//  activity correctly while the Shopify page still carries the old copy, in
//  which case nothing is locked and the key is still in View Source. The page
//  reaches students only when a human imports the sheet, so this check is the
//  one that says whether that has happened.
//
//  NO CREDENTIAL NEEDED. Everything asserted here is what an anonymous visitor
//  sees, which is exactly the request a student makes in a private window.
//
//  Run: node scripts/verify-analysis-live.js
// ─────────────────────────────────────────────────────────────────────────────
const sf = require('../lib/storefront-fetch');
const specs = require('../lib/analysis-spec');

const API = process.env.API_BASE || 'https://progress.apcsexamprep.com';
const spec = specs.get('ap-cybersecurity', '1.1-lab');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 220) : '')); }
};
const txt = (x) => (typeof x === 'string' ? x : (x && (x.body || x.html)) || '');

(async () => {
  if (!spec) { console.log('  [FAIL] the 1.1 spec did not load'); process.exit(1); }
  console.log(`\n  checking ${API} and the live page, with no token\n`);

  //  ── the API half ─────────────────────────────────────────────────────────
  const r = await fetch(`${API}/api/analysis/${spec.course}/${spec.item_id}`);
  const body = await r.json().catch(() => null);
  //  A 404 answers with a JSON error body, so "did it parse" is not the question.
  //  The question is whether it answered with an ACTIVITY or a refusal, and
  //  anything else means this route is not deployed yet.
  const served = r.status === 200 && body && (body.locked === true || !!body.activity);
  ok('the analysis endpoint answers with an activity or a refusal',
    served, { status: r.status, body: body && Object.keys(body) });
  if (!served) {
    console.log('\n  The route is not deployed here yet, so nothing below could be checked.');
    console.log(`\n  ${pass} passed, ${fail} failed`);
    process.exit(1);
  }

  const wire = JSON.stringify(body);
  if (body.locked) {
    console.log('  NOTE: a class has this closed, so the API is withholding it. That is the');
    console.log('  feature working. The key assertions below still apply.');
  } else {
    ok('it serves every specimen', (body.activity.specimens || []).length === spec.specimens.length,
      body.activity && (body.activity.specimens || []).length);
    ok('and the full point total', body.activity.points === spec.points, body.activity.points);
  }
  for (const k of ['senderKey', 'elementsKey', 'impactKey', 'actionKey', 'tacticWhy', 'typeWhy']) {
    ok(`the API never sends ${k}`, !wire.includes(k));
  }

  //  ── the grader half, which was in the page until this shipped ────────────
  const g = await fetch(`${API}/api/analysis/${spec.course}/${spec.item_id}/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responses: { 1: { sender: 'zzzzzzzzzz', tactic: '', elements: 'zzzzzzzzzzzz', type: '', impact: 'zzzzzz', action: 'zzzzzz' } } }),
  });
  const gb = await g.json().catch(() => null);
  ok('the server grades, which the browser used to do', g.status === 200 && gb
    && (gb.locked === true || typeof gb.score === 'number'), { status: g.status });
  if (gb && !gb.locked) {
    ok('a deliberately wrong submission scores zero', gb.specimens[0].points === 0, gb.specimens[0]);
    ok('and the grader does not echo what was submitted', !JSON.stringify(gb).includes('zzzzzz'));
  }

  //  ── the page half ────────────────────────────────────────────────────────
  const page = txt(await sf.page('/pages/' + spec.page_handle));
  ok('the live page still renders', page.length > 20000, page.length);
  const keyOnPage = ['senderKey', 'impactKey', 'actionKey', 'elementsKey', 'var answers']
    .filter((k) => page.includes(k));
  ok('THE ANSWER KEY IS OFF THE PAGE, which was false before this shipped',
    keyOnPage.length === 0, keyOnPage);
  ok('the activity is no longer baked into the page body',
    !page.includes('Email Specimen #1'), 'specimens still in the page body');
  ok('the page mounts the player instead', page.includes('analysis-player.js'));
  ok('and keeps its outage fallback', page.includes('APCSPageFallback'));

  if (keyOnPage.length) {
    console.log('\n  The API side is live but the PAGE has not been imported yet, so the');
    console.log('  answer key is still in View Source and nothing is locked for students.');
  }

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('  [FAIL] the check threw: ' + e.message); process.exit(1); });
