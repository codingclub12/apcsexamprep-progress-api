'use strict';
// -----------------------------------------------------------------------------
//  BOARD 170. The "Find the tournament code" terminal lab is filed as Topic 1.2
//  and it is Topic 4.3 content.
//
//  CED 1.2 is "Suspicious Website Logins": signs of a password attack, weak
//  authentication, password hygiene. There is no permissions content in it. This
//  lab hunts a file through a shared machine and then asks who else could read
//  it, which is CED 4.3 "Protecting Devices". config/labs/ already agrees:
//  lesson_id 4.3, unit-4. The storefront never got the message.
//
//  ── WHAT THE BOARD NOTE GOT WRONG, AND IT CHANGES THE SHEET ─────────────────
//  The note says the page is labelled Topic 1.2 nine times IN THE PAGE. It is
//  not. The stored Body HTML contains zero topic labels: the only two "1.2"
//  strings in it are a CSS line-height and the lab's own item id, and neither is
//  something a student reads. Every visible label comes from the page TITLE and
//  the SEO description, which the theme renders into <title>, the <h1>, og and
//  twitter tags and the JSON-LD breadcrumb. So the fix is a title and a
//  description, not a body rewrite, on that page.
//
//  Two OTHER pages do carry the label in their bodies, and they disagree with
//  each other, which is how this survived:
//
//    ap-cyber-unit-2-lesson-4-terminal-lab   sibling list says "Topic 1.2"
//    ap-cyber-unit-1-lesson-2-auth-log-lab   sibling list already says "Topic 4.3"
//    ap-cybersecurity-labs                   card says "Unit 1" and "Topic 1.2" twice
//
//  ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
//  The handle stays ap-cyber-unit-1-lesson-2-terminal-lab. Renaming a live
//  handle is on the NEVER_AUTO list and is Tanner's call, so the URL will keep
//  saying unit-1-lesson-2 after this lands. That is a smaller wrong than a page
//  whose visible title contradicts its own gradebook column.
//
//  The lab's item_id stays 1.2-lab for the same reason it stayed through the
//  terminal-lab rename: changing it is a data change that would orphan attempts,
//  and it needs the migration treatment, not a sheet.
//
//  Run: node scripts/gen-cyber-lab-topic-retarget.js
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch');
const { extract } = require('./extract-live-body');

//  TWO sheets, not one, and the split is not tidiness. Matrixify reads a BLANK
//  cell as "set this field to empty", never as "leave it alone". A single sheet
//  here would carry a blank Body HTML on the title-only row and blank Title and
//  SEO Description on the two body rows, which would have WIPED the lab page's
//  body and both other pages' titles. scripts/matrixify-preflight.js refused it
//  in exactly those words. So each sheet carries only columns that every one of
//  its rows is actually changing.
const OUT_META = path.join(__dirname, '..', 'matrixify', 'cyber-lab-topic-retarget-title-pages.csv');
const OUT_BODY = path.join(__dirname, '..', 'matrixify', 'cyber-lab-topic-retarget-body-pages.csv');

const LAB = 'ap-cyber-unit-1-lesson-2-terminal-lab';

//  The canonical facts this sheet is built from. Nothing below retypes them.
const FROM_TOPIC = 'Topic 1.2';
const TO_TOPIC   = 'Topic 4.3';
const FROM_UNIT  = 'Unit 1';
const TO_UNIT    = 'Unit 4';

const NEW_TITLE = 'AP Cybersecurity Terminal Lab: Find the Tournament Code | Topic 4.3';
const NEW_SEO_DESC =
  'Hunt a file through a shared machine with nothing but a terminal, then work out who else '
  + 'could read it. Free AP Cybersecurity Topic 4.3 practice lab.';

function live(handle) {
  const rendered = sf.page('/pages/' + handle, { timeout: 40 }).body;
  return { rendered, body: extract(rendered) };
}

//  Replace exactly `want` occurrences, or throw. A silent zero is how a sheet
//  ships that changes nothing, and a silent extra is how one changes a card that
//  was not the target.
function replaceExactly(text, find, repl, want, label) {
  const parts = text.split(find);
  const found = parts.length - 1;
  if (found !== want) {
    throw new Error(`${label}: expected ${want} occurrence(s) of ${JSON.stringify(find)}, found ${found}`);
  }
  return parts.join(repl);
}

const metaRows = [];
const bodyRows = [];
const report = [];

// ── 1. the lab page itself: title and description only ───────────────────────
{
  const { rendered } = live(LAB);
  const title = (rendered.match(/<title>([\s\S]*?)<\/title>/) || [])[1].trim();
  const desc = (rendered.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!title.includes(FROM_TOPIC)) throw new Error(`${LAB}: title does not say ${FROM_TOPIC}, it says ${JSON.stringify(title)}`);
  if (!desc.includes(FROM_TOPIC)) throw new Error(`${LAB}: description does not say ${FROM_TOPIC}`);

  //  Guard the assumption this whole row rests on: no topic label in the body.
  const body = extract(rendered);
  const inBody = (body.match(/Topic\s*1\.2/gi) || []).length;
  if (inBody) throw new Error(`${LAB}: the body DOES carry ${inBody} topic label(s); this sheet would miss them`);

  metaRows.push({ Handle: LAB, Command: 'MERGE', Title: NEW_TITLE, 'SEO Description': NEW_SEO_DESC });
  report.push({ handle: LAB, kind: 'title + seo description', was: title, now: NEW_TITLE, bodyChanged: false });
}

// ── 2. the 2.4 lab's sibling list ────────────────────────────────────────────
{
  const h = 'ap-cyber-unit-2-lesson-4-terminal-lab';
  const { body } = live(h);
  const next = replaceExactly(body, `>${FROM_TOPIC}<`, `>${TO_TOPIC}<`, 1, h);
  bodyRows.push({ Handle: h, Command: 'MERGE', 'Body HTML': next });
  report.push({ handle: h, kind: 'sibling label', was: FROM_TOPIC, now: TO_TOPIC, bodyChanged: true, bytes: [body.length, next.length] });
}

// ── 3. the labs hub card ─────────────────────────────────────────────────────
//  Scoped to this lab's own <a class="ph-card"> block. "Unit 1" appears on other
//  cards, so a document-wide replace would retarget labs that are correctly
//  filed. The card is bounded by its href and its closing anchor.
{
  const h = 'ap-cybersecurity-labs';
  const { body } = live(h);
  const open = body.indexOf(`<a class="ph-card" href="https://www.apcsexamprep.com/pages/${LAB}"`);
  if (open < 0) throw new Error(`${h}: no ph-card anchor for ${LAB}`);
  const close = body.indexOf('</a>', open);
  if (close < 0) throw new Error(`${h}: the ph-card anchor never closes`);
  const card = body.slice(open, close + 4);

  let fixed = replaceExactly(card, `>${FROM_UNIT}<`, `>${TO_UNIT}<`, 1, `${h} card focus`);
  fixed = replaceExactly(fixed, FROM_TOPIC, TO_TOPIC, 2, `${h} card blurb and meta`);

  const next = body.slice(0, open) + fixed + body.slice(close + 4);
  //  Nothing outside the card moved.
  if (next.length - body.length !== fixed.length - card.length) throw new Error(`${h}: splice changed bytes outside the card`);
  bodyRows.push({ Handle: h, Command: 'MERGE', 'Body HTML': next });
  report.push({ handle: h, kind: 'hub card focus, blurb, meta', was: `${FROM_UNIT} / ${FROM_TOPIC} x2`, now: `${TO_UNIT} / ${TO_TOPIC} x2`, bodyChanged: true, bytes: [body.length, next.length] });
}

// ── write it ─────────────────────────────────────────────────────────────────
//  QUOTE_ALL including the header, UTF-8 BOM, MERGE. Published At is omitted
//  rather than guessed: MERGE leaves a field alone when the COLUMN is absent,
//  which is the only safe way to say "do not touch this", and inventing a date
//  is how a live page gets republished.
const q = (s2) => '"' + String(s2 == null ? '' : s2).replace(/"/g, '""') + '"';
function write(file, cols, rows) {
  for (const r of rows) for (const c of cols) {
    if (r[c] == null || r[c] === '') throw new Error(`${file}: row ${r.Handle} has an empty ${c}, which Matrixify would write as a blank`);
  }
  const csv = '\ufeff' + [cols.map(q).join(',')]
    .concat(rows.map((r) => cols.map((c) => q(r[c])).join(',')))
    .join('\r\n') + '\r\n';
  fs.writeFileSync(file, csv);
  return csv.length;
}
const a = write(OUT_META, ['Handle', 'Command', 'Title', 'SEO Description'], metaRows);
const b = write(OUT_BODY, ['Handle', 'Command', 'Body HTML'], bodyRows);
const rel = (f) => path.relative(path.join(__dirname, '..'), f);
console.log('wrote ' + rel(OUT_META) + '  ' + a + ' bytes, ' + metaRows.length + ' row');
console.log('wrote ' + rel(OUT_BODY) + '  ' + b + ' bytes, ' + bodyRows.length + ' rows\n');
for (const r of report) {
  console.log('  ' + r.handle);
  console.log('     ' + r.kind + ': ' + r.was + '  ->  ' + r.now);
  if (r.bytes) console.log('     body ' + r.bytes[0] + ' -> ' + r.bytes[1] + ' bytes');
}
module.exports = { metaRows, bodyRows, NEW_TITLE, NEW_SEO_DESC, LAB, FROM_TOPIC, TO_TOPIC, FROM_UNIT, TO_UNIT };
