'use strict';
// -----------------------------------------------------------------------------
//  POINT THE CSP GUIDED NOTES AT A SECTION THAT EXISTS.
//
//  All 17 live CSP guided notes pages tell a student to "check yourself with the
//  matching CFUs on the Topic N.N page". Measured 2026-09-21: not one of the 17
//  lesson pages contains the string "CFU", or "Check for Understanding", or
//  anything else a teacher could search for. A paying teacher (board 381) read
//  that sentence, went looking, found nothing, and assumed he was the problem.
//
//  The section the notes mean is headed, on screen, "MCQ Practice", and holds
//  six questions. So this is not a missing feature. It is a page naming a label
//  it never printed.
//
//  TWO DEFECTS, AND THE SECOND SURVIVES A RENAME. The notes prompt a self-check
//  after EACH numbered section. The lesson page carries ONE six-question set for
//  the whole topic. Renaming the label alone would leave the page promising a
//  per-section match that cannot be delivered, so the replacement wording says
//  when to use it as well as what it is called.
//
//  WHY A SHEET AND NOT AN ADMIN EDIT. 299,432 bytes of live body go back up to
//  change 67 sentences. A MERGE overwrites a live body with no undo, so the
//  proof below is about the other 299,000. It ships SPLIT, one sheet per Big
//  Idea, because the blast radius of one click is however many rows are in the
//  file.
//
//  WHAT THIS DELIBERATELY DOES NOT DO. These bodies carry 467 em-dashes. Only
//  the one inside the header sentence goes, because that sentence is being
//  rewritten anyway. Re-flattening the other 450 would be a content rewrite
//  wearing a bug fix's clothes, and a diff nobody could review.
//
//    node scripts/csp-notes-cfu-fix.js            # fetch live, write the sheets
//    node scripts/csp-notes-cfu-fix.js --check    # build only, write nothing
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const DATA = require('../seed/csp-notes-cfu-fix.json');
const OUT_DIR = path.join(__dirname, '..', 'imports', '2026-09-21');

const BOM = '﻿';
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

//  Topic substitution is done here rather than stored 17 times, so the canonical
//  file holds one rule and cannot drift between pages.
const forTopic = (s, topic) => s.split(DATA.topic_placeholder).join(topic);

function sheet(rows) {
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.out].map(cell).join(','));
  return BOM + lines.join('\r\n') + '\r\n';
}

//  A CSV reader written against the emitter above rather than shared with it, so
//  a quoting bug shows up as a disagreement instead of cancelling out.
function parseBack(text) {
  const s = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const rows = [];
  let cur = '', row = [], inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r' && s[i + 1] === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  if (!rows.length) return null;
  const head = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    head.forEach((h, i) => { o[h] = r[i]; });
    return o;
  });
}

//  Rule 4 lives here rather than inline so it can be tested on its own. The
//  property it guarantees is the one the whole MERGE rests on: apply the rules
//  backwards and you must land on the live body BYTE FOR BYTE. Any edit the
//  generator made that was not a declared replacement shows up as a mismatch,
//  which a count of replacements could never reveal.
function inverseOf(out, rules) {
  let back = out;
  for (const r of rules.slice().reverse()) back = back.split(r.replace).join(r.find);
  return back;
}

//  `live` is a map of handle -> stored body_html. It is a parameter so the
//  mutation harness can hand over bodies that break each rule on purpose.
function build(live) {
  const problems = [];
  const pages = [];

  for (const p of DATA.pages) {
    const body = live[p.handle];
    if (typeof body !== 'string') { problems.push(p.handle + ': no live body supplied'); continue; }

    const rules = DATA.rules.map((r) => ({
      id: r.id,
      find: forTopic(r.find, p.topic),
      replace: forTopic(r.replace, p.topic),
    }));

    //  1. The replacement text must not already be in the live body, and the
    //     search text must survive into the output nowhere. Both are
    //     preconditions for the inverse round trip in rule 4 being a PROOF
    //     rather than a coincidence, so they are asserted rather than assumed.
    for (const r of rules) {
      if (body.includes(r.replace)) {
        problems.push(p.handle + ': live body already contains the ' + r.id + ' replacement, so this page is already fixed or the sheet is stale');
      }
    }

    let out = body;
    const counts = {};
    for (const r of rules) {
      counts[r.id] = out.split(r.find).length - 1;
      out = out.split(r.find).join(r.replace);
    }

    //  2. Every sentence this page is known to carry must be found. A page that
    //     matches fewer than expected has been edited since the audit, and a
    //     sheet built from a stale read would MERGE an old body over a newer
    //     one. That nearly happened on 2026-09-08 and reverted a better fix.
    const found = counts['per-section'] + counts['page-header'];
    if (found !== p.cfu_sentences) {
      problems.push(p.handle + ': expected ' + p.cfu_sentences + ' CFU sentences, matched ' + found
        + ' (per-section ' + counts['per-section'] + ', header ' + counts['page-header'] + ')');
    }
    if (counts['page-header'] !== 1) {
      problems.push(p.handle + ': expected exactly 1 header sentence, matched ' + counts['page-header']);
    }

    //  3. The point of the exercise. Nothing student-visible may still say CFU.
    const leftover = (out.match(/CFU/g) || []).length;
    if (leftover) problems.push(p.handle + ': ' + leftover + ' occurrence(s) of CFU survived the rewrite');

    //  4. The round trip everything else rests on. Applying the rules backwards
    //     must reproduce the live body BYTE FOR BYTE. This is what proves no
    //     other edit crept in: a count of replacements cannot tell you whether
    //     something else moved, and 299 KB is far too much to eyeball.
    const back = inverseOf(out, rules);
    if (back !== body) {
      problems.push(p.handle + ': the body differs from live somewhere other than the declared sentences ('
        + body.length + ' -> ' + out.length + ' bytes, inverse gave ' + back.length + ')');
    }

    pages.push({ handle: p.handle, big_idea: p.big_idea, topic: p.topic, out, liveBytes: body.length });
  }

  if (pages.length !== DATA.expected_pages) {
    problems.push('expected ' + DATA.expected_pages + ' pages, built ' + pages.length);
  }

  //  5. Split into one sheet per Big Idea, then prove the split LOSSLESS. A
  //     split that drops a page is worse than the big sheet, because nothing
  //     announces it.
  const sheets = [];
  for (const bi of [...new Set(DATA.pages.map((p) => p.big_idea))].sort()) {
    const rows = pages.filter((p) => p.big_idea === bi);
    if (!rows.length) continue;
    sheets.push({
      bigIdea: bi,
      name: 'csp-notes-cfu-fix-bi' + bi + '-pages.csv',
      rows,
      csv: sheet(rows),
    });
  }

  const seen = new Map();
  for (const s of sheets) {
    for (const r of s.rows) {
      if (seen.has(r.handle)) problems.push(r.handle + ' appears in two sheets: bi' + seen.get(r.handle) + ' and bi' + s.bigIdea);
      seen.set(r.handle, s.bigIdea);
    }
  }
  if (seen.size !== pages.length) {
    problems.push('split lost pages: ' + pages.length + ' built, ' + seen.size + ' across the sheets');
  }

  //  6. Parse each sheet back with the independent reader and diff. Generation
  //     is not evidence that generation worked: the CSP sheet lost 90 bytes a
  //     page while every semantic check passed.
  for (const s of sheets) {
    const parsed = parseBack(s.csv);
    if (!parsed || parsed.length !== s.rows.length) {
      problems.push(s.name + ': parsed back as ' + (parsed ? parsed.length : 0) + ' rows, expected ' + s.rows.length);
      continue;
    }
    parsed.forEach((row, i) => {
      const want = s.rows[i];
      if (row.Handle !== want.handle) problems.push(s.name + ' row ' + i + ': handle ' + row.Handle);
      if (row.Command !== 'MERGE') problems.push(s.name + ' row ' + i + ': command ' + row.Command);
      if (row['Body HTML'] !== want.out) {
        problems.push(s.name + ' row ' + i + ' (' + want.handle + '): parsed body differs by '
          + (want.out.length - String(row['Body HTML']).length) + ' bytes');
      }
    });
  }

  return { problems, pages, sheets };
}

function liveBodies() {
  const sf = require('../lib/storefront-fetch');
  const live = {};
  for (const p of DATA.pages) {
    const r = sf.raw('/pages/' + p.handle + '.json');
    const j = JSON.parse(r.body);
    live[p.handle] = (j.page || j).body_html;
  }
  return live;
}

function main() {
  const check = process.argv.includes('--check');
  const live = liveBodies();
  const { problems, pages, sheets } = build(live);

  if (problems.length) {
    console.error('REFUSED, ' + problems.length + ' problem(s):');
    problems.forEach((p) => console.error('  - ' + p));
    process.exit(1);
  }

  const totalLive = pages.reduce((a, p) => a + p.liveBytes, 0);
  const totalOut = pages.reduce((a, p) => a + p.out.length, 0);
  console.log('built ' + pages.length + ' pages across ' + sheets.length + ' sheets');
  console.log('  live ' + totalLive + ' bytes -> ' + totalOut + ' bytes (' + (totalOut - totalLive) + ')');
  for (const s of sheets) console.log('  ' + s.name + '  ' + s.rows.length + ' pages  ' + s.csv.length + ' bytes');

  if (check) { console.log('\n--check: nothing written'); return; }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const s of sheets) fs.writeFileSync(path.join(OUT_DIR, s.name), s.csv);
  console.log('\nwrote ' + sheets.length + ' sheets to ' + OUT_DIR);
}

if (require.main === module) main();
module.exports = { build, sheet, parseBack, forTopic, inverseOf, DATA };
