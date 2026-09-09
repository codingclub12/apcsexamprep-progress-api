'use strict';
// -----------------------------------------------------------------------------
//  THE PUBLIC COURSE HUB, UNIT 3: the numbers a STUDENT reads.
//
//  ── WHAT IS WRONG ──────────────────────────────────────────────────────────
//  Same defect as the Command Center, on the page that faces students. Measured
//  live 2026-09-09 on /pages/ap-cybersecurity: units 1, 2 and 4 list their
//  lessons on the CED's numbers, and Unit 3 alone runs 3.1 to 3.6 on the retired
//  site numbering. Three of the six links open a lesson about something else,
//  because three bodies swapped handles in the 2026-08-28 renumbering:
//
//      3.3 Firewalls   opens lesson-3, which is Wireless   (CED 3.2)
//      3.5 IDS         opens lesson-5, which is Firewalls  (CED 3.4)
//      3.6 Wireless    opens lesson-6, which is IDS        (CED 3.5)
//
//  A student clicking "3.3 Firewalls & Packet Filtering" lands on wireless
//  security. That is worse than the same bug on the teacher hub, and it is the
//  one that was still unfixed after the Command Center had been looked at.
//
//  ── STUDENTS READ 3.1 TWICE, ON PURPOSE ────────────────────────────────────
//  lib/cyber-unit3-renumber.js DISPLAY_MAP is the authority here, not the
//  gradebook ids. CED 3.1 is one topic taught over two lessons, and both pages
//  say "Topic 3.1" in their own h1, disambiguated by a Part label rather than by
//  inventing a number the CED does not have. The Command Center uses 3.1a and
//  3.1b because a teacher matching a gradebook column needs the column key; a
//  student matching this list against the lesson they opened needs the number
//  printed on it. Using 3.1a here would contradict the page it links to.
//
//  Everything else is derived from the same PLAN the Command Center sheet uses,
//  so the two hubs cannot drift apart.
//
//  THIS WRITES A FILE AND NOTHING ELSE. Importing is a human action, and MERGE
//  overwrites a live body with no undo.
//
//  Run: node scripts/cyber-hub-unit3-ced-numbers.js <body.html|--live> <out.csv>
//       node scripts/cyber-hub-unit3-ced-numbers.js --verify <sheet.csv>
// -----------------------------------------------------------------------------
const fs = require('fs');
const { PLAN, DISPLAY_MAP } = require('../lib/cyber-unit3-renumber');

const HUB_HANDLE = 'ap-cybersecurity';
const HUB_TITLE = 'AP Cybersecurity';
const PUBLISHED_AT = '2026-03-01 12:00:00';

function fail(msg) {
  console.error(`REFUSED  ${msg}`);
  process.exitCode = 1;
  return null;
}

//  { oldId: '3.6', display: '3.2', target: 3, part: null }, in the order the
//  six pages run in, which is CED order.
const ROWS = PLAN
  .map((p) => ({ oldId: p.oldTopic, display: DISPLAY_MAP[p.oldTopic], target: p.target, part: p.part }))
  .sort((a, b) => a.target - b.target);

//  One anchor on the hub. The href and the leading number both move; the title
//  does not, because the title is what identifies the lesson to a reader and
//  renaming it here would put a fourth name on a topic that already has three.
const LINK = /<a class="ch-lesson" href="\/pages\/ap-cyber-unit-3-lesson-(\d)">(\d\.\d)([^<]*)<\/a>/g;

function rewrite(body) {
  //  Scope to the Unit 3 card. Units 1, 2 and 4 carry ch-lesson anchors too and
  //  are already correct, so the rewrite must not be able to reach them.
  const first = body.search(/<a class="ch-lesson" href="\/pages\/ap-cyber-unit-3-lesson-\d">/);
  if (first < 0) return fail('no Unit 3 lesson links on the hub');
  const open = body.lastIndexOf('<div class="ch-lessons">', first);
  const close = body.indexOf('</div>', first);
  if (open < 0 || close < 0) return fail('could not bound the Unit 3 lesson list');
  const block = body.slice(open, close);

  const found = {};
  for (const m of block.matchAll(LINK)) found[m[2]] = { target: Number(m[1]), tail: m[3] };
  const ids = Object.keys(found).sort();
  const wantOld = ROWS.map((r) => r.oldId).sort();
  if (String(ids) !== String(wantOld)) {
    return fail(`precondition: expected the six retired numbers ${wantOld.join(', ')}, found ${ids.join(', ')}. `
      + 'This is a one-shot; running it on a renumbered hub would rotate it again.');
  }
  //  Every anchor in scope must be a Unit 3 anchor, or the bounds are wrong.
  const anchors = (block.match(/<a class="ch-lesson"/g) || []).length;
  if (anchors !== 6) return fail(`the Unit 3 list holds ${anchors} lesson links, expected 6`);

  const indent = (block.match(/\n(\s*)<a class="ch-lesson"/) || [null, '      '])[1];
  const rebuilt = ROWS.map((r) => {
    //  The title travels with the BODY, so it comes from the row that holds
    //  that body today, keyed on the retired number rather than on position.
    const tail = found[r.oldId].tail;
    const part = r.part ? ` (${r.part})` : '';
    return `${indent}<a class="ch-lesson" href="/pages/ap-cyber-unit-3-lesson-${r.target}">${r.display}${tail}${part}</a>`;
  }).join('\n');

  const head = block.slice(0, block.indexOf('<a class="ch-lesson"'));
  const out = body.slice(0, open) + head.replace(/\s*$/, '\n') + rebuilt + '\n    ' + body.slice(close);
  return { out, rows: ROWS };
}

function transform(body) {
  const r = rewrite(body);
  if (!r) return null;
  const a = assertions(body, r.out);
  if (a) return fail(a);
  return r;
}
transform.raw = (body) => { const r = rewrite(body); return r ? r.out : null; };

function assertions(before, out) {
  const links = [...out.matchAll(LINK)].map((m) => ({ target: Number(m[1]), display: m[2], tail: m[3] }));

  // 1. Six links, in CED order, each opening the lesson its number names.
  if (links.length !== 6) return `assertion 1: ${links.length} Unit 3 links after the rewrite, expected 6`;
  for (let i = 0; i < 6; i++) {
    if (links[i].target !== ROWS[i].target) {
      return `assertion 1: link ${i + 1} opens lesson-${links[i].target}, wanted lesson-${ROWS[i].target}`;
    }
    if (links[i].display !== ROWS[i].display) {
      return `assertion 1: link ${i + 1} reads ${links[i].display}, wanted ${ROWS[i].display}`;
    }
  }

  // 2. No 3.6 anywhere: the CED's Unit 3 stops at 3.5.
  if (/>3\.6\s/.test(out)) return 'assertion 2: a lesson still displays 3.6, and the CED has no topic 3.6';

  // 3. The two halves of CED 3.1 both read 3.1 and are told apart by the Part
  //    label, which is what the lesson pages themselves do.
  const threeOnes = links.filter((l) => l.display === '3.1');
  if (threeOnes.length !== 2) return `assertion 3: ${threeOnes.length} links read 3.1, expected the two halves`;
  if (!threeOnes.every((l) => /Part \d of 2/.test(l.tail))) {
    return 'assertion 3: the two 3.1 links are not distinguishable, so a student sees the same number twice with no way to tell them apart';
  }

  // 4. Titles are unchanged as a SET. They move with their bodies, and none is
  //    renamed: CED 3.2 already answers to three names and this is not the place
  //    to add a fourth.
  const titles = (s) => [...s.matchAll(LINK)].map((m) => m[3].replace(/ \(Part \d of 2\)$/, '')).sort().join('|');
  if (titles(before) !== titles(out)) return 'assertion 4: a lesson title changed';

  // 5. Blast radius. Every other unit's lesson links are byte-identical.
  for (const u of [1, 2, 4, 5]) {
    const rx = new RegExp(`<a class="ch-lesson"[^>]*ap-cyber(?:security)?-unit-${u}[^<]*</a>`, 'g');
    if (String(before.match(rx)) !== String(out.match(rx))) return `assertion 5: a unit-${u} link changed`;
  }
  //  The same six pages are still linked, from other positions.
  const set = (s) => (s.match(/ap-cyber-unit-3-lesson-\d/g) || []).sort().join('|');
  if (set(before) !== set(out)) return 'assertion 5: Unit 3 gained or lost a link rather than only moving them';

  // 6. One-shot, and it says so.
  const quiet = console.error; console.error = () => {};
  const code = process.exitCode;
  const twice = transform(out);
  console.error = quiet; process.exitCode = code;
  if (twice !== null) return 'assertion 6: the transform accepted its own output, so a second run would rotate the hub again';

  return null;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function verify(sheetPath) {
  const { parseSheet } = require('./cyber-cc-unit3-ced-numbers');
  const parsed = parseSheet(fs.readFileSync(sheetPath, 'utf8'));
  if (parsed.length !== 1) { console.error(`expected 1 row, parsed ${parsed.length}`); process.exitCode = 1; return; }
  const shipped = parsed[0];
  const live = require('../lib/storefront-fetch').pageBody(HUB_HANDLE).body_html;
  const r = transform(live);
  const expected = r ? r.out : live;
  const diff = shipped['Body HTML'] === expected ? 0 : 1;
  console.log(`handle=${shipped.Handle} command=${shipped.Command} `
    + `bytes=${shipped['Body HTML'].length} parse-back-diff=${diff}`);
  if (diff) process.exitCode = 1;
}

function main() {
  const [src, out] = process.argv.slice(2);
  if (src === '--verify') { verify(out); return; }
  if (!src || !out) {
    console.error('usage: node scripts/cyber-hub-unit3-ced-numbers.js <body.html|--live> <out.csv>');
    process.exit(2);
  }
  const body = src === '--live'
    ? require('../lib/storefront-fetch').pageBody(HUB_HANDLE).body_html
    : fs.readFileSync(src, 'utf8');
  const r = transform(body);
  if (!r) { console.error('\nNo sheet written.'); return; }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([HUB_HANDLE, 'MERGE', HUB_TITLE, r.out, 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${out}`);
  console.log(`  ${body.length} -> ${r.out.length} bytes`);
  for (const row of r.rows) {
    console.log(`  ${row.oldId} -> ${row.display}${row.part ? ' (' + row.part + ')' : ''}  opens ap-cyber-unit-3-lesson-${row.target}`);
  }
  console.log('\nMERGE overwrites the live body and Shopify keeps no undo.');
}

if (require.main === module) main();
module.exports = { transform, rewrite, ROWS, HUB_HANDLE, LINK };
