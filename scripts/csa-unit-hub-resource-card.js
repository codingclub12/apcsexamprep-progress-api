'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ADD ONE RESOURCE CARD TO A CSA UNIT HUB, AS A MATRIXIFY SHEET.
//
//  Built for board 352: ap-csa-array-mastery-interactive-practice is a real
//  7-problem autograded array practice page with ZERO inbound content links.
//
//  ── WHY THE CARD DECK AND NOT THE CODING PRACTICE SECTION ──────────────────
//  ap-csa-unit-4-course has both. The "Coding Practice" section's own copy
//  promises "your score reports to your teacher automatically". The array
//  mastery page carries no data-lesson-id and executes against emkc.org's
//  piston rather than this repo's Judge0 proxy, so it reports NOTHING. Putting
//  it there would publish a promise the page cannot keep. The u4-resources
//  deck is where the ungraded self-study resources already live, so that is
//  the honest home.
//
//  ── WHY THE STORED BODY AND NOT THE RENDERED PAGE ──────────────────────────
//  The rendered page carries ~135 mega-menu anchors before its content starts.
//  Grepping the RENDERED hub for sibling array handles reports them present
//  when they exist only in chrome. That mistake was made on this very task on
//  2026-09-10 and corrected on 2026-09-17: the hub's own body links the 17
//  lesson families and four resource cards, and no standalone array page.
//  So the body comes from /pages/<handle>.json, which is what Shopify stores
//  and what MERGE overwrites.
//
//  ── WHY IT IS FENCED ───────────────────────────────────────────────────────
//  Same reason lib/link-block.js fences: a second run otherwise appends a
//  second card and nobody notices until the deck renders five wide. The fence
//  makes the pass idempotent and the edit reversible from the page itself.
//
//  Zero PII. No em-dash in authored text, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const mojibake = require('../lib/mojibake');

const OPEN = (id) => `<!-- apcse:resource-card:${id} -->`;
const CLOSE = (id) => `<!-- /apcse:resource-card:${id} -->`;
const PUBLISHED_AT = '2026-03-01 12:00:00';
const DECK = '<div class="u4-resources">';

function refuse(why) { const e = new Error(why); e.name = 'Refused'; throw e; }

//  Strip a previously inserted card so a re-run rebuilds from the original.
//  The fenced region OWNS the newline that separates it from the card above,
//  because the insertion adds one. Leaving that newline outside the fence is
//  what made the first version of this script fail its own reversal check:
//  unmark() returned a body one byte longer than the one build() started from.
//  That is the guard earning its place, so it stays strict rather than being
//  loosened to a trim.
function unmark(body, id) {
  let o = body.indexOf(OPEN(id));
  if (o === -1) return body;
  const c = body.indexOf(CLOSE(id));
  if (c === -1) refuse(`open fence for ${id} with no close fence`);
  if (o > 0 && body[o - 1] === '\n') o -= 1;
  return body.slice(0, o) + body.slice(c + CLOSE(id).length);
}

//  The deck's first card ends at the first </a> after the deck opens. The new
//  card goes after it: the study guide stays first, tutoring stays last.
function insertionPoint(body) {
  const d = body.indexOf(DECK);
  if (d === -1) refuse('no u4-resources deck in this body');
  const end = body.indexOf('</a>', d);
  if (end === -1) refuse('u4-resources deck has no closing anchor');
  return end + 4;
}

function card(id, link) {
  return `\n${OPEN(id)}\n  <a class="u4-resource-card" href="/pages/${link.handle}">`
    + `\n    <span class="u4-resource-label">${link.label}</span>`
    + `\n    <span class="u4-resource-name">${link.name}</span>`
    + `\n    <span class="u4-resource-desc">${link.desc}</span>`
    + `\n  </a>\n${CLOSE(id)}`;
}

const countTag = (s, re) => (s.match(re) || []).length;

function build(original, id, link, liveHandles) {
  if (typeof original !== 'string' || !original.trim()) refuse('empty body');
  if (!(liveHandles instanceof Set) || liveHandles.size === 0) {
    refuse('no live handle set was passed, so no link can be shown to exist');
  }
  if (!liveHandles.has(link.handle)) refuse(`${link.handle} is not in the live handle set`);

  const base = unmark(original, id);
  const rerun = base !== original;
  if (base.includes(`/pages/${link.handle}`)) refuse(`body already links ${link.handle} outside the fence`);

  for (const [field, text] of Object.entries({ label: link.label, name: link.name, desc: link.desc })) {
    if (/—/.test(text)) refuse(`em-dash in authored ${field}`);
    if (/\b\d\.\d\.[A-Z]\b/.test(text)) refuse(`CED Essential Knowledge code in authored ${field}`);
    if (/[<>&"]/.test(text)) refuse(`unescaped markup character in authored ${field}`);
  }

  const at = insertionPoint(base);
  const after = base.slice(0, at) + card(id, link) + base.slice(at);

  //  ── THE REFUSALS. Every one returns nothing rather than a partial body. ──
  const grew = after.length - base.length;
  if (grew <= 0) refuse('body did not grow');
  if (grew > 1024) refuse(`body grew ${grew} bytes, over the 1KB cap for one card`);
  if (countTag(after, /<a\s/g) !== countTag(base, /<a\s/g) + 1) refuse('anchor count moved by other than one');
  if (countTag(after, /<div\b/g) !== countTag(base, /<div\b/g)) refuse('div balance changed');
  if (countTag(after, /<\/div>/g) !== countTag(base, /<\/div>/g)) refuse('closing div count changed');
  if (countTag(after, /<style/g) !== countTag(base, /<style/g)) refuse("the page's style block changed");
  if (countTag(after, /u4-resource-card/g) !== countTag(base, /u4-resource-card/g) + 1) refuse('resource card count moved by other than one');
  //  Asked as a DELTA, not an absolute. A pre-existing corrupted character
  //  somewhere in a 64KB hub body is a separate defect and not this edit's to
  //  fix; what must never happen is this edit ADDING one.
  const mjBefore = mojibake.analyze(base).length;
  const mjAfter = mojibake.analyze(after).length;
  if (mjAfter > mjBefore) refuse(`this edit added ${mjAfter - mjBefore} mojibake run(s)`);
  //  Reversal is exact or the edit is refused.
  if (unmark(after, id) !== base) refuse('the fence does not reverse to the body it started from');

  return { body: after, grew, rerun };
}

const cellq = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

//  ── THREE THINGS scripts/matrixify-preflight.js REFUSES, AND EARNED ────────
//  The first draft of this generator tripped all three, which is the argument
//  for running the gate rather than trusting the format:
//    1. NO BOM. Plain utf-8 makes the consuming tool guess Latin-1, so the
//       bullets and arrows already in this hub body arrive on the live page as
//       three characters each.
//    2. A CSV HAS NO TAB NAME, so Matrixify reads the sheet type off the FILE
//       NAME. A name without 'pages' in it is rejected whole, in one second.
//    3. An emoji in a body reads as introduced unless an original is supplied
//       to show it was already there, so the sheet ships with its carrying
//       file and the preflight round-trips against it.
function sheet(rows) {
  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cellq).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.body, 'TRUE', PUBLISHED_AT].map(cellq).join(','));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

module.exports = { build, unmark, sheet, card, OPEN, CLOSE, PUBLISHED_AT };

if (require.main === module) {
  const out = process.argv[2] || 'pages-ap-csa-unit-4-array-mastery.csv';
  if (!/(page|product|blog|article|collection|customer|order|redirect|metafield)/i.test(path.basename(out))) {
    console.error(`refusing to write ${path.basename(out)}: Matrixify reads the sheet type off the `
      + `file name, so it must carry 'pages'. The whole file is rejected otherwise.`);
    process.exit(2);
  }
  const HUB = 'ap-csa-unit-4-course';
  const ID = 'u4-array-mastery';
  const LINK = {
    handle: 'ap-csa-array-mastery-interactive-practice',
    label: 'Array Drills',
    name: 'Array Mastery Practice',
    desc: 'Seven array problems with hidden test cases, ungraded self-check',
  };

  //  The live handle set and the body are taken in the SAME sitting. A sheet
  //  built from a week-old body MERGE-reverts whatever landed in between, and
  //  this hub was edited the morning this ran.
  const idx = sf.raw('/sitemap.xml').body;
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  const live = new Set();
  for (const m of maps.filter((u) => /sitemap_pages/.test(u))) {
    const r = sf.raw(m.replace(/^https?:\/\/[^/]+/, ''));
    for (const g of r.body.matchAll(/<loc>([^<]+)<\/loc>/g)) live.add(g[1].replace(/^.*\/pages\//, ''));
  }
  console.log(`live handle set: ${live.size} handles`);

  const page = sf.pageBody(HUB);
  console.log(`${HUB}: ${page.body_html.length} bytes, updated_at ${page.updated_at}`);

  const res = build(page.body_html, ID, LINK, live);
  console.log(`inserted one card, +${res.grew} bytes${res.rerun ? ' (rebuilt over an existing fence)' : ''}`);

  fs.writeFileSync(out, sheet([{ handle: HUB, body: res.body }]));
  fs.writeFileSync(out.replace(/\.csv$/, '.intended.html'), res.body);
  //  The body the sheet was built FROM, so the preflight can prove every
  //  non-ASCII character in the row was already live rather than introduced.
  fs.writeFileSync(out.replace(/\.csv$/, '.carrying.json'),
    JSON.stringify({ [HUB]: page.body_html }, null, 0));
  console.log(`wrote ${out}`);
  console.log(`wrote ${path.basename(out.replace(/\.csv$/, '.carrying.json'))} for the preflight round-trip`);
}
