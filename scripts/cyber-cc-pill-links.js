'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE PACING PILLS BECOME LINKS, BECAUSE THERE IS FINALLY SOMEWHERE TO GO.
//
//  ── THE HISTORY, SO THIS IS NOT UNDONE BY ACCIDENT ─────────────────────────
//  Each unit on the cyber Command Center ends with three chips: free-response
//  days, lab days, review and test days. Teachers reported them as the single
//  biggest confusion point on the page. They were <span class="wp"> styled with
//  a background, a border and a 9px radius, which is the same visual language
//  as the .mat buttons directly above them, so teachers clicked them and
//  nothing happened.
//
//  scripts/cyber-cc-clarity.js fixed that the only way it could at the time: it
//  stripped the chip styling so they read as a line of budget text under a
//  "Days set aside in this unit" label. Its own comment says why it went no
//  further, and it is worth repeating: "There is nowhere to send a teacher yet,
//  and a chip that navigates to a thin page is worse than one that does not
//  navigate at all. When the FRQ and Labs hubs exist, THAT is the change that
//  makes them links."
//
//  The hubs now exist, so this is that change.
//
//  ── TWO OF THREE, AND WHY THE THIRD STAYS TEXT ─────────────────────────────
//  Free-response  -> ap-cybersecurity-frq-practice
//  Lab / project  -> ap-cybersecurity-labs
//  Review & unit test -> still a plain span.
//
//  The unit tests are not on the Command Center yet and have no student and
//  answer-key split, so there is no honest destination for the third pill. A
//  link to a page that does not answer the click is the exact problem this
//  whole thread started with. It becomes a link when the unit test audit lands,
//  and not before.
//
//  ── THEY LOOK LIKE LINKS, NOT LIKE BUTTONS ─────────────────────────────────
//  Deliberately NOT restoring the pill styling. The pill look is what made them
//  read as buttons, and turning them into buttons that work would still leave a
//  teacher unable to tell the two live ones from the dead third. So the two
//  that navigate get link affordances, underline and the page's blue, and the
//  one that does not stays muted text. The difference is now visible before the
//  click rather than after it.
//
//  A new class rather than styling a.wp: .wp carries colour with !important, and
//  a specificity fight is a worse dependency than one more three-letter class.
//
//  Run: node scripts/cyber-cc-pill-links.js <command-center-body.html> <out.csv>
//  Get the body from the Shopify Admin API, or from a rendered page through
//  scripts/extract-live-body.js. Never retype it.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const CC_HANDLE = 'cyber-command-center';

const FRQ_HUB = '/pages/ap-cybersecurity-frq-practice';
const LABS_HUB = '/pages/ap-cybersecurity-labs';

// The row exactly as scripts/cyber-cc-clarity.js left it, and as it was read
// back off the live page. Matched in full rather than by fragment: if any part
// of it has changed since, this script must fail rather than half-patch a row
// it no longer understands.
const ROW_BEFORE = "var wrap = '<div class=\"uwrap\">'\n"
  + "        + '<span class=\"wplbl\">Days set aside in this unit</span>'\n"
  + "        + '<span class=\"wp\">\u{1F4DD} Free-response & review · '+(u.frqDays||0)+'d</span>'\n"
  + "        + '<span class=\"wpsep\">|</span>'\n"
  + "        + '<span class=\"wp\">\u{1F527} Lab / project · '+(u.labDays||0)+'d</span>'\n"
  + "        + '<span class=\"wpsep\">|</span>'\n"
  + "        + '<span class=\"wp\">✅ Review & unit test · '+(u.testDays||0)+'d</span>'\n"
  + "        + '</div>';";

const ROW_AFTER = "var wrap = '<div class=\"uwrap\">'\n"
  + "        + '<span class=\"wplbl\">Days set aside in this unit</span>'\n"
  + "        + '<a class=\"wpl\" href=\"" + FRQ_HUB + "\">\u{1F4DD} Free-response & review · '+(u.frqDays||0)+'d</a>'\n"
  + "        + '<span class=\"wpsep\">|</span>'\n"
  + "        + '<a class=\"wpl\" href=\"" + LABS_HUB + "\">\u{1F527} Lab / project · '+(u.labDays||0)+'d</a>'\n"
  + "        + '<span class=\"wpsep\">|</span>'\n"
  + "        + '<span class=\"wp\">✅ Review & unit test · '+(u.testDays||0)+'d</span>'\n"
  + "        + '</div>';";

// Anchored on the .wpsep rule, which cyber-cc-clarity.js introduced and nothing
// else on the page defines, so the insertion point is unambiguous.
const CSS_ANCHOR = '.wpsep{color:var(--line)!important;-webkit-text-fill-color:var(--line)!important;'
  + 'padding:0 2px;}';
const CSS_AFTER = CSS_ANCHOR
  + '.wpl{font-size:12px;font-weight:600;color:var(--blue)!important;'
  + '-webkit-text-fill-color:var(--blue)!important;background:transparent!important;'
  + 'border:0;padding:0;text-decoration:underline;text-underline-offset:2px;}'
  + '.wpl:hover{text-decoration-thickness:2px;}';

// A locked unit already greys its pacing text. That rule names .wp, so without
// this the two new links would stay bright blue inside an otherwise greyed-out
// locked unit, which is the loudest thing on the card drawing attention to the
// one unit a teacher has not opened. Found by reading the CSS around the
// insertion point rather than by looking at the row alone.
//
// They stay navigable: the hubs are public student pages and are not gated by
// unit. Only the shouting is removed.
const LOCK_ANCHOR = '#actc-wrap .unit.lock .uwrap .wp{color:var(--lock)!important;'
  + '-webkit-text-fill-color:var(--lock)!important;}';
const LOCK_AFTER = LOCK_ANCHOR
  + '\n  #actc-wrap .unit.lock .uwrap .wpl{color:var(--lock)!important;'
  + '-webkit-text-fill-color:var(--lock)!important;text-decoration:none;}';

function patch(body) {
  if (!body.includes('var STU = {')) {
    throw new Error('this is not the cyber command center body');
  }
  if (body.includes('class=\\"wpl\\"') || body.includes('.wpl{')) {
    return { body, changed: false, why: 'already patched' };
  }
  if (!body.includes('wplbl')) {
    throw new Error('the pacing row has not had scripts/cyber-cc-clarity.js applied to it yet; '
      + 'run that first, this script patches the row that leaves behind');
  }
  if (body.split(ROW_BEFORE).length - 1 !== 1) {
    throw new Error('the pacing row is not the one this script was written against');
  }
  if (body.split(CSS_ANCHOR).length - 1 !== 1) {
    throw new Error('the .wpsep rule is not the one this script was written against');
  }
  if (body.split(LOCK_ANCHOR).length - 1 !== 1) {
    throw new Error('the locked-unit pacing rule is not the one this script was written against');
  }
  return {
    body: body.replace(ROW_BEFORE, ROW_AFTER)
      .replace(CSS_ANCHOR, CSS_AFTER)
      .replace(LOCK_ANCHOR, LOCK_AFTER),
    changed: true,
  };
}

// The checks that matter are about the DIFFERENCE, not about the page. A 68 KB
// body written by other hands will fail almost any absolute assertion (it has
// em-dashes and emoji in it already), so every check below compares before to
// after. That is the lesson from four separate self-inflicted failures where a
// guard matched text rather than a fact.
function checkPatch(before, after) {
  const bad = [];
  const count = (s, re) => (s.match(re) || []).length;

  if (after.length <= before.length) bad.push('the patched body did not grow');

  // Exactly two pills became links, and the third did not.
  const linksAdded = count(after, /class="wpl"/g) - count(before, /class="wpl"/g);
  if (linksAdded !== 2) bad.push(`${linksAdded} pill(s) became links, expected exactly 2`);
  const spansLeft = count(after, /<span class=\\?"wp\\?"/g);
  const spansBefore = count(before, /<span class=\\?"wp\\?"/g);
  if (spansBefore - spansLeft !== 2) {
    bad.push(`${spansBefore - spansLeft} wp span(s) were consumed, expected exactly 2`);
  }
  if (!after.includes('Review & unit test')) bad.push('the third pill lost its text');
  if (/Review & unit test[^<]*<\/a>/.test(after)) bad.push('the third pill became a link, it must not');

  // Both destinations present, and both are the hubs this repo actually builds.
  for (const href of [FRQ_HUB, LABS_HUB]) {
    if (!after.includes(href)) bad.push(`the patched row does not link ${href}`);
  }

  // Nothing else moved. Everything outside the row and the one CSS rule must be
  // untouched, which is checkable by putting the original back.
  const restored = after.replace(ROW_AFTER, ROW_BEFORE)
    .replace(CSS_AFTER, CSS_ANCHOR)
    .replace(LOCK_AFTER, LOCK_ANCHOR);
  if (restored !== before) bad.push('the patch changed something outside the row and the two CSS rules');

  // A locked unit must not end up with a bright link in it.
  if (!after.includes('.unit.lock .uwrap .wpl{')) {
    bad.push('locked units would still show the new links in full colour');
  }

  // House rules, as a delta. The body already contains em-dashes written by
  // other hands; what this script may not do is ADD one.
  const dashDelta = count(after, /—/g) - count(before, /—/g);
  if (dashDelta !== 0) bad.push(`the patch added ${dashDelta} em-dash(es)`);

  const opens = count(after, /<script[\s>]/g) - count(before, /<script[\s>]/g);
  const closes = count(after, /<\/script>/g) - count(before, /<\/script>/g);
  if (opens !== 0 || closes !== 0) bad.push('the patch changed the script tag balance');
  return bad;
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main(argv) {
  const [inPath, out] = argv;
  if (!inPath || !out) {
    console.error('usage: node scripts/cyber-cc-pill-links.js <command-center-body.html> <out.csv>');
    process.exit(2);
  }
  const before = fs.readFileSync(inPath, 'utf8');
  const res = patch(before);
  if (!res.changed) {
    console.error(`Nothing to do: ${res.why}.`);
    process.exit(1);
  }
  const problems = checkPatch(before, res.body);
  if (problems.length) {
    console.error('Refusing to write a sheet with these problems in it:');
    problems.forEach((c) => console.error('  ' + c));
    process.exit(1);
  }

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([CC_HANDLE, 'MERGE', res.body, 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`Wrote ${CC_HANDLE} to ${out}`);
  console.log(`  ${before.length} bytes in, ${res.body.length} out, +${res.body.length - before.length}`);
  console.log('  Free-response pill  -> ' + FRQ_HUB);
  console.log('  Lab / project pill  -> ' + LABS_HUB);
  console.log('  Review & unit test  -> still plain text, on purpose. See the header.');
  console.log('\nImport the hub pages FIRST. These links 404 until they exist.');
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { patch, checkPatch, ROW_BEFORE, ROW_AFTER, CSS_ANCHOR, CSS_AFTER,
  LOCK_ANCHOR, LOCK_AFTER,
  FRQ_HUB, LABS_HUB, CC_HANDLE };
