#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BOARD 170, AFTER THE IMPORT. Run this once the two sheets have landed.
//
//  This is the live half of the check and it asserts things that were FALSE
//  before the import, which is the whole requirement: measured beforehand, the
//  lab page's <title> said Topic 1.2, the 2.4 lab's sibling list said Topic 1.2,
//  and the hub card said Unit 1 and Topic 1.2 twice. "The page loads" would have
//  passed yesterday and is decoration.
//
//  ── THE HALF THAT IS EXPENSIVE TO GET WRONG ────────────────────────────────
//  Matrixify writes a blank cell as an empty value, so the plausible failure
//  here is not "the label did not change", it is "something else got erased".
//  The sheets were split precisely to avoid that, and a split can still be
//  imported in the wrong order or half-applied. So every page is also checked
//  for the things the sheet must NOT have touched: the lab still has its mount
//  div and its four script blocks, both other pages still have a title and a
//  body of roughly the right size, and the auth-log lab, which was never in
//  either sheet, is unchanged.
//
//  Fetches go through lib/storefront-fetch.js and send NO User-Agent.
//
//  Run: node scripts/verify-cyber-lab-topic-retarget-live.js
// -----------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch');
const { extract } = require('./extract-live-body');

const LAB = 'ap-cyber-unit-1-lesson-2-terminal-lab';
const SIB = 'ap-cyber-unit-2-lesson-4-terminal-lab';
const HUB = 'ap-cybersecurity-labs';
const UNTOUCHED = 'ap-cyber-unit-1-lesson-2-auth-log-lab';

const problems = [];
const notes = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); };

function page(h) {
  const rendered = sf.page('/pages/' + h, { timeout: 40 }).body;
  return { rendered, body: extract(rendered), title: (rendered.match(/<title>([\s\S]*?)<\/title>/) || [])[1].trim() };
}

// ── 1. the lab page: title and description moved, body untouched ─────────────
{
  const p = page(LAB);
  const desc = (p.rendered.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  //  <title> comes from the SEO Title metafield, the rendered <h1> from the page
  //  Title. They are separate fields and the first import moved only one, so
  //  both are asserted by name rather than treating the title tag as the whole
  //  story.
  const h1 = ((p.rendered.match(/<h1[^>]*>([\s\S]{0,160}?)<\/h1>/) || [])[1] || '').trim();
  ok(/Topic 4\.3/.test(h1), `${LAB}: the rendered h1 (page Title) still reads ${JSON.stringify(h1)}`);
  ok(/Topic 4\.3/.test(p.title), `${LAB}: <title> (SEO Title) still reads ${JSON.stringify(p.title)}`);
  ok(!/Topic\s*1\.2/.test(p.title), `${LAB}: <title> STILL says Topic 1.2`);
  const og = (p.rendered.match(/property="og:title" content="([^"]*)"/) || [])[1] || '';
  ok(/Topic 4\.3/.test(og), `${LAB}: og:title still reads ${JSON.stringify(og)}`);
  ok(/Topic 4\.3/.test(desc), `${LAB}: meta description does not say Topic 4.3: ${JSON.stringify(desc.slice(0, 90))}`);
  ok(!/Topic\s*1\.2/.test(desc), `${LAB}: meta description STILL says Topic 1.2`);
  ok(p.title.includes('Find the Tournament Code'), `${LAB}: the lab name fell out of the title`);

  //  The body was NOT in that sheet. If it is gone or shrunk, the blank-cell
  //  hazard happened anyway and that is the loud failure.
  ok(p.body.length > 4000, `${LAB}: body is ${p.body.length} bytes, it was 4510. Something wiped it.`);
  ok(p.body.includes('id="apcs-lab-1-2-lab"'), `${LAB}: the lab mount div is gone from the body`);
  const scripts = (p.body.match(/<script/g) || []).length;
  ok(scripts === 4, `${LAB}: expected 4 script blocks in the body, found ${scripts}`);
  notes.push(`${LAB}: title ${JSON.stringify(p.title)}, body ${p.body.length} bytes, ${scripts} script blocks`);
}

// ── 2. the 2.4 lab's sibling list ────────────────────────────────────────────
{
  const p = page(SIB);
  ok(/Topic 4\.3/.test(p.body), `${SIB}: sibling label does not say Topic 4.3`);
  ok(!/Topic\s*1\.2/.test(p.body), `${SIB}: sibling label STILL says Topic 1.2`);
  ok(p.title.length > 10, `${SIB}: title is empty or missing, the sheet may have blanked it`);
  ok(p.body.length > 4000, `${SIB}: body is ${p.body.length} bytes, it was 4669`);
  notes.push(`${SIB}: body ${p.body.length} bytes, title ${JSON.stringify(p.title.slice(0, 60))}`);
}

// ── 3. the labs hub card ─────────────────────────────────────────────────────
{
  const p = page(HUB);
  const open = p.body.indexOf(`<a class="ph-card" href="https://www.apcsexamprep.com/pages/${LAB}"`);
  ok(open >= 0, `${HUB}: the ph-card anchor for the lab is gone`);
  if (open >= 0) {
    const card = p.body.slice(open, p.body.indexOf('</a>', open) + 4);
    ok(/>Unit 4</.test(card), `${HUB}: card focus is not Unit 4`);
    ok(!/>Unit 1</.test(card), `${HUB}: card focus STILL says Unit 1`);
    ok((card.match(/Topic 4\.3/g) || []).length === 2, `${HUB}: expected Topic 4.3 twice in the card`);
    ok(!/Topic\s*1\.2/.test(card), `${HUB}: card STILL says Topic 1.2`);
  }
  //  The other cards must be untouched. The first draft of this asserted that
  //  SOME card must still say Unit 1, on the assumption that a document-wide
  //  replace was the plausible failure. It fired, and it was wrong: the hub
  //  carries exactly two cards and the tournament lab was the only Unit 1 one,
  //  so zero is the correct answer after a correct edit. What actually proves
  //  the replace was scoped is that the OTHER card is untouched.
  const others = [...p.body.matchAll(/<a class="ph-card" href="[^"]*\/pages\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .filter((m) => m[1] !== LAB);
  ok(others.length >= 1, `${HUB}: the hub lost its other card(s) entirely`);
  for (const o of others) {
    ok(!/Topic 4\.3/.test(o[2]), `${HUB}: card ${o[1]} was rewritten to Topic 4.3 and should not have been`);
    ok(/ph-card-focus">Unit \d</.test(o[2]), `${HUB}: card ${o[1]} lost its unit label`);
  }
  ok(p.body.length > 6500, `${HUB}: body is ${p.body.length} bytes, it was 7339`);
  notes.push(`${HUB}: body ${p.body.length} bytes, ${others.length} other card(s) untouched`);
}

// ── 4. the page that was in NEITHER sheet ────────────────────────────────────
{
  const p = page(UNTOUCHED);
  ok(/Topic 4\.3/.test(p.body), `${UNTOUCHED}: its sibling label used to say Topic 4.3 and no longer does`);
  ok(p.body.length > 3000, `${UNTOUCHED}: body is ${p.body.length} bytes, it should not have changed at all`);
  notes.push(`${UNTOUCHED}: untouched, body ${p.body.length} bytes`);
}

for (const n of notes) console.log('  ' + n);
console.log('');
if (problems.length) {
  console.log(`  ${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log('    ' + p);
  process.exit(1);
}
console.log('  all clear: the lab reads Topic 4.3 on all three surfaces, and nothing else moved.');
