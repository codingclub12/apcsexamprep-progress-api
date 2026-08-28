#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  SWEEP EVERY LIVE PAGE IN A UNIT FOR THE THREE THINGS A STUDENT MUST NOT SEE.
//
//    node scripts/cyber-unit-sweep.js <handle filter> [<handle filter> ...]
//    node scripts/cyber-unit-sweep.js cyber unit-1        # AND of both
//
//  WHY THIS EXISTS, AND IT IS NOT A GENERALISATION FOR ITS OWN SAKE.
//
//  On 2026-08-28 a verification pass reported "every Unit 1 page, live" over a
//  hand-written list of ten handles. Unit 1 has thirty-two pages. The ten were
//  the ones that pass had touched, so the sweep could only ever confirm the work
//  it had just done, and it read as a statement about the unit. Seventeen pages
//  were carrying exam claims or painted EK codes at the moment the unit was
//  called clean.
//
//  A hand-written list cannot fail that way once, it fails that way every time,
//  because the list is written by whoever already knows which pages they
//  touched. So the page set comes from the store's own sitemap and nothing else.
//  Adding a page to the unit adds it to this sweep with no edit here.
//
//  WHAT IT MEASURES (and what it does not)
//
//  Presentation, not curriculum. Zero uses of "CED" and zero EK codes in what a
//  reader sees, and no claim about what the exam does. Whether the content
//  teaches what the CED requires is a different question that no regex answers;
//  see docs/ap-cyber-unit1-ced-realignment.md.
//
//  Painted text is document.body.innerText from a real browser. Reading markup
//  cannot tell a collapsed teacher table from content a student reads, and
//  getComputedStyle on a child of a display:none parent returns the CHILD's own
//  display, which has produced two confident wrong answers in this repo.
// -----------------------------------------------------------------------------

const { chromium } = require('../smoke/node_modules/playwright');
const tg = require('../lib/cyber-thin-gate');
const cg = require('../lib/cyber-cite-gate');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const EXEC = process.env.CHROMIUM_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const EK = /\b(?:EK )?\d\.\d\.[A-C](?:\.\d)?\b/g;

//  json:true means a leading '<' is a Cloudflare challenge and worth retrying.
//  The sitemap is XML and always starts with '<', so that test must not be
//  applied to it: the first version of this retried the sitemap four times and
//  reported it unreadable.
const get = async (url, { json = true, tries = 4 } = {}) => {
  for (let a = 0; a < tries; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: json ? 'application/json' : '*/*' } });
      const t = await r.text();
      if (!r.ok) return { status: r.status };
      if (json && t.trimStart().startsWith('<')) { await new Promise((s) => setTimeout(s, 1500)); continue; }
      return { text: t };
    } catch (e) { await new Promise((s) => setTimeout(s, 1500)); }
  }
  return { status: 'unreadable' };
};

async function handles(filters) {
  const idx = await get(`${BASE}/sitemap.xml`, { json: false });
  if (!idx.text) throw new Error(`sitemap.xml: ${idx.status}`);
  const out = new Set();
  for (const loc of idx.text.match(/https:\/\/[^<]*sitemap_pages[^<]*/g) || []) {
    const sm = await get(loc.replace(/&amp;/g, '&'), { json: false });
    if (!sm.text) continue;
    for (const m of sm.text.match(/\/pages\/[^<]*/g) || []) {
      const h = m.replace('/pages/', '');
      if (filters.every((f) => h.includes(f))) out.add(h);
    }
  }
  return [...out].sort();
}

//  Centred on the phrase that tripped the check. An excerpt sliced from the
//  start of the match window routinely shows 100 characters of unrelated text
//  and none of the claim, which reads as a false positive and gets dismissed.
function claims(body) {
  const f = tg.flat(body);
  const seen = new Set();
  const out = [];
  for (const m of f.matchAll(cg.claimWindow())) {
    const hit = m[0].match(tg.ASSERTS);
    if (!hit) continue;
    const at = m.index + m[0].indexOf(hit[0]);
    const ex = f.slice(Math.max(0, at - 70), at + hit[0].length + 70).trim();
    if (seen.has(ex)) continue;
    seen.add(ex);
    out.push(ex);
  }
  return out;
}

async function main() {
  const filters = process.argv.slice(2);
  if (!filters.length) {
    console.error('usage: node scripts/cyber-unit-sweep.js <handle filter> [<handle filter> ...]');
    process.exit(2);
  }
  const list = await handles(filters);
  console.log(`${list.length} pages matching ${filters.join(' + ')}\n`);
  const browser = await chromium.launch({ executablePath: EXEC });
  let dirty = 0;
  try {
    for (const handle of list) {
      const res = await get(`${BASE}/pages/${handle}.json?cb=${Date.now()}`);
      if (!res.text) { console.log(`${handle.padEnd(48)} ${res.status}`); dirty++; continue; }
      const body = JSON.parse(res.text).page.body_html || '';
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`,
        { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate(() => ({
        text: document.body.innerText,
        feedback: [...document.querySelectorAll('.cfu-feedback')]
          .filter((e) => getComputedStyle(e).display !== 'none').length,
      }));
      await page.close();
      const ced = (r.text.match(/\bCED\b/g) || []).length;
      const ek = r.text.match(EK) || [];
      const cl = claims(body);
      const bad = ced || ek.length || cl.length || r.feedback;
      if (bad) dirty++;
      console.log(`${handle.padEnd(48)} CED ${String(ced).padStart(2)}  EK ${String(ek.length).padStart(2)}  `
        + `claims ${String(cl.length).padStart(2)}  feedback ${r.feedback}${bad ? '   <<<' : ''}`);
      if (ek.length) console.log(`${' '.repeat(50)}EK: ${[...new Set(ek)].join(' ')}`);
      cl.forEach((c) => console.log(`${' '.repeat(50)}! ...${c}...`));
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${list.length} pages, ${dirty} carrying something a student should not see`);
  process.exit(dirty ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(2); });
