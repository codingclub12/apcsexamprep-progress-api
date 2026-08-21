'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TWO LIVE CONFUSIONS ON THE CYBER PAGES, FIXED IN ONE SHEET.
//
//  ── 1. THE PACING PILLS LOOK LIKE BUTTONS (cyber-command-center) ────────────
//  Each unit ends with three chips: free-response days, lab days, test days.
//  They are <span class="wp"> and they navigate nowhere, but `.wp` carries a
//  background, a border, a 9px radius and 8px padding, which is the same visual
//  language as the `.mat` buttons in the teacher-materials row directly above.
//  Teachers click them and nothing happens. The page is making a promise its
//  markup cannot keep.
//
//  This does NOT make them buttons. There is nowhere to send a teacher yet, and
//  a chip that navigates to a thin page is worse than one that does not
//  navigate at all. It makes them read as what they are: a line of budget text.
//  When the FRQ and Labs hubs exist, THAT is the change that makes them links,
//  and it will be a different, deliberate edit.
//
//  ── 2. UNIT 3 IS NUMBERED TWO WAYS AT ONCE (course guide) ───────────────────
//  The site teaches Unit 3 as six lessons; the CED has five topics, in a
//  different order. The Command Center already handles this well: it carries a
//  unit note explaining the resequencing and tags every lesson with its CED
//  topic. The complete course guide does neither, and it is worse than silent:
//  its unit description is numbered BY CED ("3.4 Protecting Networks:
//  Firewalls") while the lesson list below it is numbered by teaching order
//  ("Lesson 3: Firewalls & ACLs"). A teacher reading both sees 3.4 Firewalls in
//  one place and Firewalls at position 3 in the other, with nothing saying the
//  two numbering systems are different.
//
//  So the guide gets the crosswalk, in the same six rows the Command Center
//  already implies.
//
//  ── 3. AND ONE STALE TITLE, FOUND ON THE WAY ────────────────────────────────
//  The guide calls lesson 6 "Incident Response". The live page
//  ap-cyber-unit-3-lesson-6 is titled "Network Security Policies & Wireless",
//  and the Command Center agrees with the page. The guide is the odd one out,
//  so the guide is what changes. A crosswalk that restated the stale title
//  would publish the error in a second place.
//
//  Run: node scripts/cyber-cc-clarity.js <command-center.html> <course-guide.html> <out.csv>
//  Get both bodies from the Shopify Admin API, never from the rendered page.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const CC_HANDLE = 'cyber-command-center';
const GUIDE_HANDLE = 'ap-cybersecurity-complete-course-guide';

// The crosswalk, stated once. Every row was checked against the live lesson
// page title, not against either page's own copy of it.
const UNIT3 = [
  ['Lesson 1', 'Network Fundamentals &amp; Attack Surface', 'CED 3.1', 'Network Vulnerabilities and Attacks'],
  ['Lesson 2', 'Network Attacks', 'CED 3.1', 'Network Vulnerabilities and Attacks'],
  ['Lesson 3', 'Firewalls &amp; Packet Filtering', 'CED 3.4', 'Protecting Networks: Firewalls'],
  ['Lesson 4', 'Network Segmentation &amp; VLANs', 'CED 3.3', 'Protecting Networks: Segmentation'],
  ['Lesson 5', 'IDS, IPS &amp; SIEM', 'CED 3.5', 'Detecting Network Attacks'],
  ['Lesson 6', 'Network Security Policies &amp; Wireless', 'CED 3.2', 'Protecting Networks: Managerial Controls'],
];

// ── 1. the pills ─────────────────────────────────────────────────────────────
function patchPills(body) {
  if (!body.includes('var STU = {')) throw new Error('this is not the cyber command center body');

  const cssAnchor = '.wp{font-size:12px;font-weight:600;color:var(--navy)!important;'
    + '-webkit-text-fill-color:var(--navy)!important;background:#f1f5f9!important;'
    + 'border:1px solid var(--line);border-radius:9px;padding:8px 11px;}';
  if (!body.includes(cssAnchor)) {
    if (body.includes('.wplbl{')) return { body, changed: false };
    throw new Error('the .wp chip style is not the one this script was written against');
  }
  // Plain text, muted, no chip. The label is what turns three orphan numbers
  // into a sentence a teacher can read: these are days, not destinations.
  const cssNew = '.wp{font-size:12px;font-weight:600;color:var(--muted)!important;'
    + '-webkit-text-fill-color:var(--muted)!important;background:transparent!important;'
    + 'border:0;border-radius:0;padding:0;}'
    + '.wplbl{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;'
    + 'color:var(--muted)!important;-webkit-text-fill-color:var(--muted)!important;padding:0;}'
    + '.wpsep{color:var(--line)!important;-webkit-text-fill-color:var(--line)!important;padding:0 2px;}';

  const rowAnchor = "var wrap = '<div class=\"uwrap\">'\n"
    + "        + '<span class=\"wp\">\u{1F4DD} Free-response & review · '+(u.frqDays||0)+'d</span>'\n"
    + "        + '<span class=\"wp\">\u{1F527} Lab / project · '+(u.labDays||0)+'d</span>'\n"
    + "        + '<span class=\"wp\">✅ Review & unit test · '+(u.testDays||0)+'d</span>'\n"
    + "        + '</div>';";
  if (body.split(rowAnchor).length - 1 !== 1) {
    throw new Error('the pacing chip row is not the one this script was written against');
  }
  const rowNew = "var wrap = '<div class=\"uwrap\">'\n"
    + "        + '<span class=\"wplbl\">Days set aside in this unit</span>'\n"
    + "        + '<span class=\"wp\">\u{1F4DD} Free-response & review · '+(u.frqDays||0)+'d</span>'\n"
    + "        + '<span class=\"wpsep\">|</span>'\n"
    + "        + '<span class=\"wp\">\u{1F527} Lab / project · '+(u.labDays||0)+'d</span>'\n"
    + "        + '<span class=\"wpsep\">|</span>'\n"
    + "        + '<span class=\"wp\">✅ Review & unit test · '+(u.testDays||0)+'d</span>'\n"
    + "        + '</div>';";

  let out = body.replace(cssAnchor, cssNew).replace(rowAnchor, rowNew);

  // While we are in here: the Unit 3 note is good copy carrying an em-dash,
  // which the repo does not use in user-facing strings.
  out = out.split('topic order — every lesson').join('topic order. Every lesson');
  return { body: out, changed: true };
}

// ── 2 and 3. the guide ───────────────────────────────────────────────────────
function patchGuide(body) {
  if (!body.includes('id="apcyber-course-hub"')) throw new Error('this is not the cyber course guide body');
  if (body.includes('cyc-x3')) return { body, changed: false };

  // The stale title first, so the crosswalk and the lesson list agree.
  const staleTitle = '<p class="lesson-name">Lesson 6: Incident Response</p>';
  const freshTitle = '<p class="lesson-name">Lesson 6: Network Security Policies &amp; Wireless</p>';
  let out = body;
  let titleFixed = false;
  if (out.split(staleTitle).length - 1 === 1) {
    out = out.replace(staleTitle, freshTitle);
    titleFixed = true;
  }

  const anchor = '<p class="unit-desc">Weeks 11–18';
  const at = out.indexOf(anchor);
  if (at === -1) throw new Error('the Unit 3 description is not the one this script was written against');
  const close = out.indexOf('</p>', at);
  if (close === -1) throw new Error('the Unit 3 description never closes');

  const rows = UNIT3.map(([n, t, ced, cedName]) =>
    '<tr><td class="x3n">' + n + '</td><td class="x3t">' + t + '</td>'
    + '<td class="x3c">' + ced + '</td><td class="x3d">' + cedName + '</td></tr>').join('');

  const block = '\n<div class="cyc-x3">'
    + '<style>'
    + '.cyc-x3{background:#eff6ff;border:1px solid #bfdbfe;border-left:3px solid #1a56db;'
    + 'border-radius:9px;padding:13px 15px;margin:12px 0 4px;}'
    + '.cyc-x3 .x3h{font-size:13px;font-weight:700;color:#0b2c4d;margin:0 0 4px;}'
    + '.cyc-x3 .x3p{font-size:12.5px;line-height:1.5;color:#0f3b66;margin:0 0 9px;}'
    + '.cyc-x3 .x3wrap{overflow-x:auto;}'
    + '.cyc-x3 table{border-collapse:collapse;width:100%;font-size:12.5px;}'
    + '.cyc-x3 th,.cyc-x3 td{text-align:left;padding:5px 9px 5px 0;color:#0f3b66;vertical-align:top;}'
    + '.cyc-x3 th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5b7fa6;'
    + 'border-bottom:1px solid #bfdbfe;}'
    + '.cyc-x3 .x3n{white-space:nowrap;font-weight:700;}'
    + '.cyc-x3 .x3c{white-space:nowrap;font-weight:700;}'
    + '</style>'
    + '<p class="x3h">Why the numbers below do not match the CED</p>'
    + '<p class="x3p">Unit 3 is taught in six lessons, in a sequence built for the classroom rather '
    + 'than for the CED\'s topic order. All of CED 3.1 through 3.5 is covered. Lessons 1 and 2 both '
    + 'sit under CED 3.1 and share its teacher deck and notes.</p>'
    + '<div class="x3wrap"><table><thead><tr><th>Taught as</th><th>Lesson</th>'
    + '<th>CED topic</th><th>CED title</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '</div>';

  out = out.slice(0, close + 4) + block + out.slice(close + 4);
  return { body: out, changed: true, titleFixed };
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function main(argv) {
  const [ccIn, guideIn, out] = argv;
  if (!ccIn || !guideIn || !out) {
    console.error('usage: node scripts/cyber-cc-clarity.js <command-center.html> <course-guide.html> <out.csv>');
    process.exit(2);
  }

  const rows = [];
  const report = [];

  const ccBefore = fs.readFileSync(ccIn, 'utf8');
  const cc = patchPills(ccBefore);
  if (!cc.changed) report.push(`${CC_HANDLE}: already fixed, nothing to import`);
  else {
    if (cc.body.includes('border-radius:9px;padding:8px 11px;}')
      && cc.body.indexOf('.wp{font-size:12px;font-weight:600;color:var(--navy)') !== -1) {
      throw new Error('the chip style survived the edit');
    }
    if (!cc.body.includes('wplbl')) throw new Error('the budget label is missing');
    if (cc.body.includes('topic order —')) throw new Error('the em-dash survived');
    rows.push([CC_HANDLE, 'MERGE', cc.body, 'TRUE', PUBLISHED_AT]);
    report.push(`${CC_HANDLE}: pills read as text, Unit 3 note de-dashed (${cc.body.length - ccBefore.length >= 0 ? '+' : ''}${cc.body.length - ccBefore.length} bytes)`);
  }

  const gBefore = fs.readFileSync(guideIn, 'utf8');
  const g = patchGuide(gBefore);
  if (!g.changed) report.push(`${GUIDE_HANDLE}: already fixed, nothing to import`);
  else {
    if (!g.body.includes('Network Security Policies &amp; Wireless')) {
      throw new Error('the lesson 6 title was not corrected');
    }
    if (g.body.includes('Lesson 6: Incident Response')) throw new Error('the stale lesson 6 title survived');
    if (g.body.length <= gBefore.length) throw new Error('the guide edit did not grow the body');
    rows.push([GUIDE_HANDLE, 'MERGE', g.body, 'TRUE', PUBLISHED_AT]);
    report.push(`${GUIDE_HANDLE}: Unit 3 crosswalk added, lesson 6 title ${g.titleFixed ? 'corrected' : 'ALREADY OK'} (+${g.body.length - gBefore.length} bytes)`);
  }

  report.forEach((r) => console.log('    ' + r));
  if (!rows.length) { console.log('\nNothing to import.'); return; }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${rows.length} page edit(s) to ${out}`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('REFUSED: ' + e.message); process.exit(1); }
}

module.exports = { patchPills, patchGuide, UNIT3, CC_HANDLE, GUIDE_HANDLE };
