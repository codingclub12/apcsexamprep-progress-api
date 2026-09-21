#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  WHAT THE AP CSA LESSON PAGES ACTUALLY SERVE, ON THE EK CODES. Board 373.
//
//      node scripts/verify-csa-ek-live.js [unit-2|unit-3|unit-4]
//
//  Run it BEFORE importing a sheet and AFTER. Before, because a generated sheet
//  goes stale: on 2026-09-08 one sat unimported for a day while somebody fixed
//  the same page a better way, and importing it would have reverted the fix. A
//  unit that already reads clean is a sheet to delete, and this is what says so.
//  After, because a merged PR is not evidence and neither is an import log.
//
//  ---- IT ASSERTS THE THING THAT MATTERS, NOT THE THING THAT IS EASY ---------
//  "No EK codes" is easy and almost worthless: a sheet that blanked the body
//  would pass it. So the count is one of four, and the other three are what a
//  broken import looks like:
//
//    the body is still a lesson      a page that lost its content has no codes
//    every MCQ key names an option   the 3.6 and 3.7 stems and feedback are
//                                    rewritten, so this is not theoretical
//    the ld+json still has its 7     those are deliberately untouched, and an
//                                    import that removed them did something
//                                    nobody asked for
//
//  Through lib/storefront-fetch.js with NO User-Agent, so a bot challenge cannot
//  be mistaken for a clean page. Every assertion here is positive for exactly
//  that reason: "the codes are gone" passes on an interstitial, and "12 MCQs are
//  present" does not.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const ek = require('../lib/cyber-ek-density');

const ROOT = path.join(__dirname, '..');
const SPECS = path.join(ROOT, '..', 'APCSExamPrep-theme', 'teacher-bundle', 'specs');
const ONLY = process.argv.find((a) => /^unit-[234]$/.test(a));

//  The 19 pages board 373 is about, and their counts as measured on 2026-09-21
//  before any import. A page not in this list is a page that never had a code.
const EXPECT = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'csa-ek-decisions.json'), 'utf8'));

function specs() {
  const out = [];
  for (const u of ['unit-2', 'unit-3', 'unit-4']) {
    if (ONLY && u !== ONLY) continue;
    const dir = path.join(SPECS, u);
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      out.push({ unit: u, topic: s.topic, handle: s.handle });
    }
  }
  return out.sort((a, b) => parseFloat(a.topic) - parseFloat(b.topic));
}

function visible(body) {
  const skip = [...body.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g)]
    .map((m) => [m.index, m.index + m[0].length]);
  return ek.citations(body).citations
    .filter((c) => !c.protectedBy && !skip.some(([a, z]) => a <= c.index && c.index < z));
}

function main() {
  const list = specs();
  const fail = [];
  const dirty = [];
  let clean = 0;
  let meta = 0;
  for (const p of list) {
    let body;
    try { body = sf.pageBody(p.handle).body_html; }
    catch (e) { fail.push(`${p.topic}: ${e.message}`); continue; }

    //  positive: this is still a lesson page
    const mcq = (body.match(/class="apcs-ex"/g) || []).length;
    const opts = (body.match(/class="apcs-opt"/g) || []).length;
    if (body.length < 20000) fail.push(`${p.topic}: body is ${body.length} bytes, too short to be a lesson`);
    if (mcq && opts < mcq * 2) fail.push(`${p.topic}: ${mcq} questions but only ${opts} options`);
    for (const m of body.matchAll(/<div[^>]*class="apcs-ex"[^>]*data-answer="([^"]+)"[^>]*>/g)) {
      const seg = body.slice(m.index, m.index + 4000);
      if (!seg.includes(`data-letter="${m[1]}"`)) fail.push(`${p.topic}: an answer key names ${m[1]} and no option has it`);
    }

    const v = visible(body).length;
    const j = ek.summary(body).total - v;
    meta += j;
    if (v) dirty.push(`${p.topic} (${p.unit}): ${v}`);
    else clean++;
  }

  const wantMeta = ONLY ? null : EXPECT.shapes['json-ld-script'];
  if (wantMeta !== null && meta !== wantMeta) {
    fail.push(`${meta} citations in the ld+json metadata, expected ${wantMeta} left untouched`);
  }

  for (const f of fail) console.log(`FAIL ${f}`);
  if (dirty.length) {
    console.log(`\n${dirty.length} page(s) still serve an EK code to a student:`);
    for (const d of dirty) console.log(`  ${d}`);
    console.log('\nBefore an import that is the work still to do. After one it is a failed import.');
  }
  if (fail.length || dirty.length) process.exit(1);
  console.log(`${clean} live page(s)${ONLY ? ' in ' + ONLY : ''}: not one EK code in student-visible text, `
    + `${meta} left in the ld+json metadata on purpose, every question still has the options its key names.`);
}

if (require.main === module) main();
