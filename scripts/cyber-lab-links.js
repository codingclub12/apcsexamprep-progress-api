'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK THE CYBER TERMINAL LAB FROM THE TWO PAGES THAT SEND TRAFFIC.
//
//  A lab page nobody links is a lab nobody opens. Two pages decide whether the
//  1.2 terminal lab gets used:
//    ap-cybersecurity-complete-course-guide   students, the Topic 1.2 card
//    cyber-command-center                     teachers, the 1.2 student-pages row
//
//  HOW IT EDITS
//  Surgically, for the same reason csp-command-center-links.js does: these are
//  100 KB and 62 KB live bodies, and re-serialising either to add one link would
//  rewrite every byte of a page other people are also editing. Each edit is an
//  exact anchor string replaced once, asserted once.
//
//  WHAT IT WILL NOT DO
//    - touch ap-cyber-unit-1-lesson-2-lab. That handle is ALREADY a 62 KB
//      graded lab (Password Attack Simulation) and has nothing to do with this
//      one. The terminal lab ships as ap-cyber-unit-1-lesson-2-terminal-lab and
//      is linked ALONGSIDE it, never over it. This is checked, not remembered:
//      a link that would replace the existing Lab row is a refusal.
//    - run against a body that is not the page it expects
//    - insert a link twice, so a re-run after a partial import is safe
//    - name a handle that lib/lab-spec.js does not declare
//
//  Run: node scripts/cyber-lab-links.js <course-guide.html> <command-center.html> <out.csv>
//  Get both bodies from the Shopify Admin API, never from the rendered page.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const labs = require('../lib/lab-spec');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const GUIDE_HANDLE = 'ap-cybersecurity-complete-course-guide';
const CC_HANDLE = 'cyber-command-center';

// The labs being linked, read from the specs so a link and the page it points at
// can never name different handles. Every ap-cybersecurity lab is linked by
// default, so a lab authored later is picked up without editing this file.
//
// Each lesson already has a NON-terminal lab page at
// ap-cyber-unit-<u>-lesson-<l>-lab (1.2 is the 62 KB Password Attack Simulation,
// 2.4 has its own). The terminal lab ships alongside it and never over it, which
// is checked here rather than remembered.
function existingLabHandle(lessonId) {
  const [u, l] = String(lessonId).split('.');
  return `ap-cyber-unit-${u}-lesson-${l}-lab`;
}

function cyberLabs(only) {
  const all = labs.all().filter((s) => s.course === 'ap-cybersecurity');
  const picked = only ? all.filter((s) => s.item_id === only) : all;
  if (!picked.length) {
    throw new Error(only ? `no ap-cybersecurity ${only} spec, so there is nothing to link`
      : 'no ap-cybersecurity lab specs, so there is nothing to link');
  }
  for (const spec of picked) {
    if (!spec.page_handle) throw new Error(`the ${spec.item_id} spec declares no page_handle`);
    if (spec.page_handle === existingLabHandle(spec.lesson_id)) {
      throw new Error(`the ${spec.item_id} spec points at the EXISTING lab handle; refusing to link over it`);
    }
  }
  return picked.sort((a, b) => a.lesson_id.localeCompare(b.lesson_id, undefined, { numeric: true }));
}

const LABEL = 'Terminal Lab';

// ── the student course guide ─────────────────────────────────────────────────
//  The 1.2 card lists its rows in teaching order and ends with the quiz. The
//  terminal lab goes after the existing Lab row and before the quiz, which is
//  where a student would actually reach for it.
//  The anchor is matched on its HREF and its label, not on its whitespace.
//  It used to be an exact string built to the Unit 1 card's shape, and that is
//  a trap the moment a lab moves units: the Unit 4 card indents twelve spaces
//  and puts a space between </div> and <span>, where the Unit 1 card indents
//  fourteen and puts a newline. Both are the same row. Matching the bytes meant
//  moving the 1.2 lab to 4.3 reported "found 0" against a row that was plainly
//  there. Exactly-one is still required, and the matched text is reused verbatim
//  so the inserted row inherits the card's own formatting rather than imposing
//  the other card's.
function patchGuide(body, spec) {
  const existing = existingLabHandle(spec.lesson_id);
  if (!body.includes('id="apcyber-course-hub"')) throw new Error('this is not the cyber course guide body');
  if (body.includes('/pages/' + spec.page_handle)) return { body, changed: false };

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('[ \\t]*<a class="exercise-row" href="/pages/' + esc(existing)
    + '">\\s*<div class="ex-dot"></div>\\s*<span class="ex-label">Lab</span>'
    + '\\s*<span class="ex-tag">[^<]*</span>\\s*</a>[ \\t]*\\n?', 'g');
  const found = body.match(re) || [];
  if (found.length !== 1) {
    throw new Error(`expected exactly 1 Topic ${spec.lesson_id} Lab row to anchor to, found ${found.length}. `
      + 'The card was edited; re-read it before running this again.');
  }
  const anchor = found[0];
  //  Built from the anchor itself, so indentation and the </div> separator match
  //  whatever this card uses.
  const row = anchor
    .replace('/pages/' + existing, '/pages/' + spec.page_handle)
    .replace('<span class="ex-label">Lab</span>', '<span class="ex-label">' + LABEL + '</span>');
  return { body: body.replace(anchor, anchor + row), changed: true };
}

// ── the teacher command center ───────────────────────────────────────────────
//  Two edits. STU["1.2"] gains the destination, and the dests list gains the
//  label that renders it. Either one alone renders nothing, so both are asserted.
function patchCommandCenter(body, spec) {
  if (!body.includes('var STU = {')) throw new Error('this is not the cyber command center body');
  if (body.includes('/pages/' + spec.page_handle)) return { body, changed: false };

  // The STU row for this lesson, located rather than hardcoded, so a lesson whose
  // page handles differ from 1.2's pattern still matches. The braces inside a row
  // are only ever the one pair, so a non-greedy match to the first } is exact.
  const re = new RegExp('"' + spec.lesson_id.replace('.', '\\.') + '":\\{[^}]*\\}', 'g');
  const found = body.match(re) || [];
  if (found.length !== 1) {
    throw new Error(`expected exactly 1 STU row for ${spec.lesson_id}, found ${found.length}`);
  }
  const stuAnchor = found[0];
  if (stuAnchor.includes('termlab:')) {
    throw new Error(`the STU row for ${spec.lesson_id} already names a termlab, but not this one`);
  }
  const stuNew = stuAnchor.slice(0, -1) + ',termlab:"/pages/' + spec.page_handle + '"}';

  // The dests list gains the label that renders a termlab. It is shared by every
  // lesson, so after the first lab it is already correct: patch it when it is
  // missing, leave it alone when it is not. Neither state is an error.
  const destsOld = "var dests = [ ['page','Lesson page'], ['quiz','Quiz'], ['ex1','Scenario 1'], ['ex2','Scenario 2'] ];";
  const destsNew = "var dests = [ ['page','Lesson page'], ['quiz','Quiz'], ['ex1','Scenario 1'], "
    + "['ex2','Scenario 2'], ['termlab','" + LABEL + "'] ];";
  let out = body.replace(stuAnchor, stuNew);
  if (out.includes(destsOld)) {
    out = out.replace(destsOld, destsNew);
  } else if (!out.includes("['termlab','" + LABEL + "']")) {
    throw new Error('the student-pages dests list neither matches the original nor already renders a termlab');
  }
  return { body: out, changed: true };
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function main(argv) {
  const flag = argv.indexOf('--item');
  const only = flag > -1 ? argv[flag + 1] : null;
  const rest = flag > -1 ? argv.filter((a, i) => i !== flag && i !== flag + 1) : argv.slice();
  const [guideIn, ccIn, out] = rest;
  if (!guideIn || !ccIn || !out) {
    console.error('usage: node scripts/cyber-lab-links.js <course-guide.html> <command-center.html> <out.csv> [--item <item_id>]');
    process.exit(2);
  }
  const specs = cyberLabs(only);

  const rows = [];
  const report = [];
  for (const [handle, file, patch] of [
    [GUIDE_HANDLE, guideIn, patchGuide],
    [CC_HANDLE, ccIn, patchCommandCenter],
  ]) {
    const before = fs.readFileSync(file, 'utf8');
    let body = before;
    const linked = [];
    // Cumulative: each lab patches the output of the last, so one page edit
    // carries every lab rather than the sheet holding one row per lab per page.
    for (const spec of specs) {
      const res = patch(body, spec);
      if (!res.changed) continue;
      body = res.body;
      linked.push(spec);
    }
    if (!linked.length) { report.push(`${handle}: already links every lab, nothing to import`); continue; }
    if (body.length <= before.length) throw new Error(`${handle}: the edit did not grow the body`);
    for (const spec of linked) {
      if (!body.includes('/pages/' + spec.page_handle)) {
        throw new Error(`${handle}: the ${spec.item_id} link is not in the output`);
      }
      // The one thing worth checking twice: every existing lab row survived.
      const existing = existingLabHandle(spec.lesson_id);
      if (handle === GUIDE_HANDLE && before.includes('/pages/' + existing) && !body.includes('/pages/' + existing)) {
        throw new Error(`the existing ${existing} link was lost`);
      }
    }
    rows.push([handle, 'MERGE', body, 'TRUE', PUBLISHED_AT]);
    report.push(`${handle}: +${body.length - before.length} bytes, links `
      + linked.map((s) => s.item_id).join(', '));
  }

  report.forEach((r) => console.log('    ' + r));
  if (!rows.length) { console.log('\nNothing to import.'); return; }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  fs.writeFileSync(out, '\ufeff' + lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${rows.length} page edit(s) to ${out}`);
  console.log('Import this ONLY after the lab page sheet, or both links 404 for as long as it takes you.');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { patchGuide, patchCommandCenter, cyberLabs, existingLabHandle, GUIDE_HANDLE, CC_HANDLE, LABEL };
