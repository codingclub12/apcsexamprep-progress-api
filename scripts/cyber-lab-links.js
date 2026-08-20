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

// The lab being linked, read from the spec so the link and the page it points at
// can never name different handles.
function theLab() {
  const spec = labs.all().find((s) => s.course === 'ap-cybersecurity' && s.item_id === '1.2-lab');
  if (!spec) throw new Error('no ap-cybersecurity 1.2-lab spec, so there is nothing to link');
  if (!spec.page_handle) throw new Error('the 1.2-lab spec declares no page_handle');
  if (spec.page_handle === 'ap-cyber-unit-1-lesson-2-lab') {
    throw new Error('the spec points at the EXISTING password-attack lab handle; refusing to link over it');
  }
  return spec;
}

const LABEL = 'Terminal Lab';

// ── the student course guide ─────────────────────────────────────────────────
//  The 1.2 card lists its rows in teaching order and ends with the quiz. The
//  terminal lab goes after the existing Lab row and before the quiz, which is
//  where a student would actually reach for it.
function patchGuide(body, spec) {
  const anchor = '              <a class="exercise-row" href="/pages/ap-cyber-unit-1-lesson-2-lab"><div class="ex-dot"></div>\n'
    + '<span class="ex-label">Lab</span><span class="ex-tag">Start ' + '→' + '</span></a>\n';
  if (!body.includes('id="apcyber-course-hub"')) throw new Error('this is not the cyber course guide body');
  if (body.includes('/pages/' + spec.page_handle)) return { body, changed: false };

  const hits = body.split(anchor).length - 1;
  if (hits !== 1) {
    throw new Error(`expected exactly 1 Topic 1.2 Lab row to anchor to, found ${hits}. `
      + 'The card was edited; re-read it before running this again.');
  }
  const row = '              <a class="exercise-row" href="/pages/' + spec.page_handle + '"><div class="ex-dot"></div>\n'
    + '<span class="ex-label">' + LABEL + '</span><span class="ex-tag">Start ' + '→' + '</span></a>\n';
  return { body: body.replace(anchor, anchor + row), changed: true };
}

// ── the teacher command center ───────────────────────────────────────────────
//  Two edits. STU["1.2"] gains the destination, and the dests list gains the
//  label that renders it. Either one alone renders nothing, so both are asserted.
function patchCommandCenter(body, spec) {
  if (!body.includes('var STU = {')) throw new Error('this is not the cyber command center body');
  if (body.includes('/pages/' + spec.page_handle)) return { body, changed: false };

  const stuAnchor = '"1.2":{page:"/pages/ap-cybersecurity-unit-1-password-attacks",'
    + 'quiz:"/pages/ap-cyber-unit-1-lesson-2-quiz",'
    + 'ex1:"/pages/ap-cyber-unit-1-lesson-2-exercise-1",'
    + 'ex2:"/pages/ap-cyber-unit-1-lesson-2-exercise-2"}';
  if (body.split(stuAnchor).length - 1 !== 1) {
    throw new Error('the STU row for 1.2 is not the one this script was written against');
  }
  const stuNew = stuAnchor.slice(0, -1) + ',termlab:"/pages/' + spec.page_handle + '"}';

  const destsAnchor = "var dests = [ ['page','Lesson page'], ['quiz','Quiz'], ['ex1','Scenario 1'], ['ex2','Scenario 2'] ];";
  if (body.split(destsAnchor).length - 1 !== 1) {
    throw new Error('the student-pages dests list is not the one this script was written against');
  }
  // Appended, not inserted: the existing four keep their order, and a lesson
  // without a termlab renders exactly what it renders today.
  const destsNew = "var dests = [ ['page','Lesson page'], ['quiz','Quiz'], ['ex1','Scenario 1'], "
    + "['ex2','Scenario 2'], ['termlab','" + LABEL + "'] ];";

  return { body: body.replace(stuAnchor, stuNew).replace(destsAnchor, destsNew), changed: true };
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function main(argv) {
  const [guideIn, ccIn, out] = argv;
  if (!guideIn || !ccIn || !out) {
    console.error('usage: node scripts/cyber-lab-links.js <course-guide.html> <command-center.html> <out.csv>');
    process.exit(2);
  }
  const spec = theLab();

  const rows = [];
  const report = [];
  for (const [handle, file, patch] of [
    [GUIDE_HANDLE, guideIn, patchGuide],
    [CC_HANDLE, ccIn, patchCommandCenter],
  ]) {
    const before = fs.readFileSync(file, 'utf8');
    const { body, changed } = patch(before, spec);
    if (!changed) { report.push(`${handle}: already links the lab, nothing to import`); continue; }
    if (body.length <= before.length) throw new Error(`${handle}: the edit did not grow the body`);
    if (!body.includes('/pages/' + spec.page_handle)) throw new Error(`${handle}: the link is not in the output`);
    // The one thing worth checking twice: the existing lab row survived.
    if (handle === GUIDE_HANDLE && !body.includes('/pages/ap-cyber-unit-1-lesson-2-lab')) {
      throw new Error('the existing password-attack lab link was lost');
    }
    rows.push([handle, 'MERGE', body, 'TRUE', PUBLISHED_AT]);
    report.push(`${handle}: +${body.length - before.length} bytes, links /pages/${spec.page_handle}`);
  }

  report.forEach((r) => console.log('    ' + r));
  if (!rows.length) { console.log('\nNothing to import.'); return; }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${rows.length} page edit(s) to ${out}`);
  console.log('Import this ONLY after the lab page sheet, or both links 404 for as long as it takes you.');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('REFUSED: ' + e.message); process.exit(1); }
}

module.exports = { patchGuide, patchCommandCenter, theLab, GUIDE_HANDLE, CC_HANDLE, LABEL };
