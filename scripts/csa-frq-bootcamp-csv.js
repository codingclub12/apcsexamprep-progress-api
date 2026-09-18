'use strict';
// -----------------------------------------------------------------------------
//  THE FRQ BOOTCAMP, REPOINTED.
//
//    node scripts/csa-frq-bootcamp-csv.js imports/2026-09-17-frq-bootcamp
//
//  Two sheets, and the ORDER matters more here than anywhere else in this
//  repair, because one of them is the one that stops the storefront taking
//  money for a session that happened in April:
//
//    1  products  unpublish the three live-session tiers, create the recording
//    2  pages     rewrite the offer on /pages/ap-csa-frq-bootcamp-2026
//
//  Products FIRST. If the page lands first it advertises a $29.99 recording
//  that has no product behind it; if the products land first the page is
//  briefly stale but nothing is buyable that should not be.
//
//  ── THE THREE TIERS ARE UNPUBLISHED, NOT DELETED ────────────────────────────
//  Deleting a product breaks the order history of everybody who bought one.
//  Published FALSE takes it out of the buy path and is reversible.
//
//  ── NO 2027 DATE IS INVENTED ────────────────────────────────────────────────
//  config/csa-frq-bootcamp-2027.json carries liveDate: null because Tanner has
//  not set one. The page says spring 2027 and that the date comes later. The
//  suite refuses a body that names a specific day while liveDate is null,
//  because a made-up date on a sales page is a promise.
//
//  Zero PII.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const spec = require('../config/csa-frq-bootcamp-2027.json');
const frq2026 = require('../config/csa-frq-2026.json');
const mojibake = require('../lib/mojibake.js');
const sf = require('../lib/storefront-fetch.js');

const EXAM = frq2026.exam;
const PUBLISHED_AT = '2026-03-01 12:00:00';

class Refused extends Error {}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

//  "May 2027" out of "Wednesday, May 12, 2027".
const examMonthYear = (() => {
  const m = EXAM.nextExamDate.match(/([A-Z][a-z]+)\s+\d+,\s*(\d{4})/);
  return m[1] + ' ' + m[2];
})();
//  The exam date without the weekday, which reads better mid-sentence.
const examDay = EXAM.nextExamDate.replace(/^\w+,\s*/, '');
const liveWhen = spec.live.liveDate || (spec.live.season + ', ahead of the ' + examDay + ' exam');


// -- THE PAGE ----------------------------------------------------------------
//  The two cards that replace the three tiers: one thing you can buy, one thing
//  you can look forward to. They reuse the page's own tier-card classes so the
//  grid keeps its styling without a new stylesheet.
function offerCards() {
  const r = spec.recording;
  const feats = r.includes.map((f) =>
    '<div class="tier-feature"><span class="tier-check">&#10003;</span>' + esc(f) + '</div>').join('\n');
  return '<div class="tier-grid">\n'
    + '<div class="tier-card popular">\n'
    + '<div class="popular-badge">Available now</div>\n'
    + '<div class="tier-header">\n'
    + '<div class="tier-name">2026 Session Recording</div>\n'
    + '<div class="tier-price">$' + esc(r.price) + '</div>\n'
    + '<div class="tier-price-sub">One-time payment, yours to keep</div>\n'
    + '</div>\n<div class="tier-body">\n' + feats + '\n</div>\n'
    + '<div class="tier-footer"><a class="tier-btn" href="/products/' + r.handle + '">Get the recording</a></div>\n'
    + '</div>\n'
    + '<div class="tier-card">\n'
    + '<div class="tier-header">\n'
    + '<div class="tier-name">Next Live Bootcamp</div>\n'
    + '<div class="tier-price">' + esc(spec.live.liveDate || spec.live.season.replace(/^./, (c) => c.toUpperCase())) + '</div>\n'
    + '<div class="tier-price-sub">' + (spec.live.liveDate ? 'Live via Zoom' : 'Date announced closer to the time') + '</div>\n'
    + '</div>\n<div class="tier-body">\n'
    + '<div class="tier-feature"><span class="tier-check">&#10003;</span>Rebuilt for the '
    + esc(examMonthYear) + ' exam, which scores free response out of '
    + frq2026.questions.reduce((n, q) => n + q.points, 0) + ' points rather than 36</div>\n'
    + '<div class="tier-feature"><span class="tier-check">&#10003;</span>Worked live, with the recording included</div>\n'
    + '<div class="tier-feature"><span class="tier-check">&#10003;</span>Not on sale yet. The 2026 recording is the thing to get today</div>\n'
    + '</div>\n'
    + '<div class="tier-footer"><a class="tier-btn" href="/pages/ap-csa-frq-2026">See the 2026 questions</a></div>\n'
    + '</div>\n'
    + '</div>';
}

function pageEdits() {
  const r = spec.recording;
  const total = frq2026.questions.reduce((n, q) => n + q.points, 0);
  return [
    { why: 'the hero eyebrow, which announced a live event in April',
      findRe: /<div class="hero-eyebrow">Live Event — April 16, 2026<\/div>/,
      to: '<div class="hero-eyebrow">2026 Recording Available Now</div>' },
    { why: 'the hero subtitle, which told students to walk into a date that has passed',
      findRe: /<p class="hero-sub">A live walkthrough of the 4 hardest FRQ types — hand-picked across 4 different exam years\. Built for students who want to walk into May 15 ready for anything\.<\/p>/,
      to: '<p class="hero-sub">A walkthrough of the four hardest FRQ types, hand-picked across four exam years. '
        + 'The April 2026 session is recorded and available on its own. The next live one is ' + esc(liveWhen) + '.</p>' },
    { why: 'the hero meta row, still advertising a Zoom call in April',
      findRe: /<div class="hero-meta">[\s\S]*?<\/div>\n<\/div>/,
      to: '<div class="hero-meta">\n'
        + '<div class="hero-meta-item"><strong>Full session recording</strong></div>\n'
        + '<div class="hero-meta-item"><strong>$' + esc(r.price) + '</strong></div>\n'
        + '<div class="hero-meta-item"><strong>Watch any time</strong></div>\n'
        + '<div class="hero-meta-item"><strong>Next live: ' + esc(spec.live.liveDate || spec.live.season) + '</strong></div>\n'
        + '</div>\n</div>' },
    { why: 'the urgency bar, counting down to an exam four months past',
      findRe: /<div class="urgency-bar">[\s\S]*?<\/div>/,
      to: '<div class="urgency-bar"><strong>The next AP CSA exam is ' + EXAM.nextExamDate + '.</strong> '
        + 'Free response is ' + EXAM.sectionTwoPercent + '% of the score, and from 2026 the section is '
        + total + ' points rather than 36.</div>' },
    { why: 'the section heading over the tiers, which still offered a choice of three',
      findRe: /<h2 class="section-title">Choose Your Tier<\/h2>\n<p class="section-sub">All tiers include live access and the session recording\. Higher tiers unlock additional prep materials\.<\/p>/,
      to: '<h2 class="section-title">What Is Available</h2>\n<p class="section-sub">The April 2026 session is recorded and on sale by itself. '
        + 'The next live bootcamp is ' + esc(liveWhen) + ' and is not on sale yet.</p>' },
    { why: 'the session description, written in the future tense about a past call',
      findRe: /<p class="section-sub">This is not a lecture\. Every FRQ is worked live, start to finish\.<\/p>/,
      to: '<p class="section-sub">This is not a lecture. Every FRQ was worked live, start to finish, and the recording keeps all of it.</p>' },
    { why: 'the three live-session tiers, replaced by the recording and the 2027 announcement',
      findRe: /<div class="tier-grid">[\s\S]*?<\/div>\n<\/div>\n<\/div>\n<\/div>\n<hr class="divider">/,
      to: offerCards() + '\n<hr class="divider">' },
    { why: 'the closing call to action, still reserving a spot on a past call',
      findRe: /<h2 class="cta-title">Reserve Your Spot<\/h2>[\s\S]*?<\/a>\s*(?=<\/div>|<a href="\/pages)/,
      to: '<h2 class="cta-title">Get the Recording</h2>\n'
        + '<p class="cta-sub">The full April 2026 session, worked end to end, yours to keep.</p>\n'
        + '<a href="/products/' + r.handle + '" class="cta-btn">2026 Recording, $' + esc(r.price) + '</a> ' },
    { why: 'a lineup line pointing at the retired exam date',
      findRe: /exactly what May 15 will test/,
      to: 'exactly what the ' + examMonthYear + ' exam will test' },
  ];
}

function buildPage() {
  const p = sf.pageBody(spec.page.handle);
  let body = p.body_html;
  const changes = [];
  for (const e of pageEdits()) {
    if (!e.findRe.test(body)) throw new Refused(spec.page.handle + ': does not contain ' + e.findRe);
    body = body.replace(e.findRe, e.to);
    changes.push(e.why);
  }
  //  Nothing may still point at a retired tier or a past date.
  for (const h of spec.retire) {
    if (body.indexOf('/products/' + h) >= 0) throw new Refused(spec.page.handle + ': still links the retired product ' + h);
  }
  for (const s of ['April 16', 'May 15', '$49.99', '$69.99', '$109.99',
                   'Choose Your Tier', 'All tiers include', 'Reserve Your Spot', 'Book Now']) {
    if (body.indexOf(s) >= 0) throw new Refused(spec.page.handle + ': still says ' + JSON.stringify(s));
  }
  //  THE GUARD AGAINST INVENTING A SALES DATE, and its first draft was too
  //  blunt: it refused the College Board EXAM date too, which is a published
  //  fact and belongs on the page. What must not appear is a specific day for
  //  the bootcamp itself while nobody has set one. So the exam date is removed
  //  first and the rule looks at what is left.
  if (!spec.live.liveDate) {
    const withoutExam = body.split(examDay).join(' ').split(EXAM.nextExamDate).join(' ');
    const invented = withoutExam.match(/\b(January|February|March|April|May|June)\s+\d{1,2},?\s*2027/);
    if (invented) {
      throw new Refused(spec.page.handle + ': names ' + JSON.stringify(invented[0])
        + ' as a bootcamp date while config/csa-frq-bootcamp-2027.json has liveDate null');
    }
  }
  const mo = mojibake.analyze(body);
  if (mo && mo.length) throw new Refused(spec.page.handle + ': mojibake in the result');
  const na = (s) => (s.match(/[^\x00-\x7F]/g) || []).length;
  if (na(body) > na(p.body_html)) throw new Refused(spec.page.handle + ': the rewrite added non-ASCII');
  const bal = (s) => (s.match(/<div\b/g) || []).length - (s.match(/<\/div>/g) || []).length;
  if (bal(body) !== bal(p.body_html)) {
    throw new Refused(spec.page.handle + ': div balance changed, was ' + bal(p.body_html) + ', now ' + bal(body));
  }
  return { handle: spec.page.handle, title: spec.page.title, body, changes, before: p.body_html };
}


// -- THE SHEETS --------------------------------------------------------------
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
function write(dir, name, header, rows) {
  const csv = '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  const dest = path.join(dir, name);
  fs.writeFileSync(dest, csv);
  return { dest, csv, header, rows };
}
function parseCsv(text) {
  const s = text.replace(/^﻿/, '');
  const rows = []; let row = [], f = '', q = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; } f += c; i++; continue; }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(f); f = ''; i++; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(f); rows.push(row); row = []; f = ''; i += 2; continue; }
    if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; i++; continue; }
    f += c; i++;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function productRows() {
  const r = spec.recording;
  const rows = spec.retire.map((h) => [h, 'MERGE', '', '', '', '', '', 'FALSE', '']);
  rows.push([r.handle, 'MERGE', r.title, r.productType, r.vendor, r.tags,
    '<p>The full AP CSA FRQ Bootcamp session from April 2026, recorded and yours to keep.</p><ul>'
    + r.includes.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul>'
    + '<p>The next live bootcamp is ' + esc(liveWhen) + '.</p>',
    'TRUE', r.price]);
  return rows;
}

function main(argv) {
  const outDir = argv[0] || 'imports/2026-09-17-frq-bootcamp';
  const dir = path.resolve(ROOT, outDir);
  fs.mkdirSync(dir, { recursive: true });

  let page;
  try { page = buildPage(); }
  catch (e) { console.error('\n  refused: ' + e.message + '\n'); process.exit(1); }

  const written = [];
  written.push(write(dir, '01-frq-bootcamp-products.csv',
    ['Handle', 'Command', 'Title', 'Type', 'Vendor', 'Tags', 'Body HTML', 'Published', 'Variant Price'],
    productRows()));
  written.push(write(dir, '02-frq-bootcamp-pages.csv',
    ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'],
    [[page.handle, 'MERGE', page.title, page.body, 'TRUE', PUBLISHED_AT]]));

  const diffs = [];
  for (const w of written) {
    const read = parseCsv(fs.readFileSync(w.dest, 'utf8'));
    if (read.length !== w.rows.length + 1) diffs.push(path.basename(w.dest) + ': row count');
    w.rows.forEach((row, n) => row.forEach((v, i) => {
      if (read[n + 1] && read[n + 1][i] !== v) diffs.push(path.basename(w.dest) + ' row ' + (n + 1) + ' col ' + w.header[i]);
    }));
  }
  if (diffs.length) {
    console.error('\n  the files do not read back as written:\n    ' + diffs.join('\n    '));
    for (const w of written) fs.unlinkSync(w.dest);
    process.exit(1);
  }

  console.log('wrote ' + written.length + ' sheet(s) to ' + outDir);
  for (const w of written) console.log('  ' + path.basename(w.dest).padEnd(34) + w.rows.length + ' row(s)');
  console.log('  every cell parsed back and diffed clean');
  console.log('  page changes: ' + page.changes.length);
  for (const c of page.changes) console.log('    ' + c);
  console.log('  products: ' + spec.retire.length + ' unpublished, 1 created at $' + spec.recording.price);
  if (!spec.live.liveDate) console.log('  live 2027 date is NOT set, so the page says "' + spec.live.season + '" and no specific day');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { buildPage, pageEdits, offerCards, productRows, parseCsv, spec, liveWhen, Refused };
