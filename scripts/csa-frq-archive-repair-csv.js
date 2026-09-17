'use strict';
// -----------------------------------------------------------------------------
//  THE ARCHIVE REPAIR SHEETS.
//
//    node scripts/csa-frq-archive-repair-csv.js imports/2026-09-17-frq-archive
//
//  Writes SIX sheets, not one, and the split is the whole point. MERGE
//  overwrites a live body with no undo, so the blast radius of a single click
//  is however many rows you chose to put in the file. Tanner's question about
//  the first big sheet is the rule: can we not do this by unit.
//
//    1  titles          41 rows, TITLE ONLY, no Body HTML column at all
//    2  2004-2007       16 bodies
//    3  2008-2013       24 bodies
//    4  2014-2017       16 bodies
//    5  2018-2022       18 bodies
//    6  hub             1 body, and it depends on the 2026 import
//
//  Sheet 1 is first and separate on purpose. A title repair cannot damage a
//  page body, so 41 of the 86 fixes ship with zero body risk before anything
//  touches a body at all.
//
//  ── THE BODIES ARE READ LIVE, NOT FROM A CACHE ──────────────────────────────
//  Every row is built from the body the storefront is serving at generation
//  time, through lib/storefront-fetch.js. A sheet built from yesterday's body
//  reverts whatever landed in between, and on 2026-09-08 one nearly did.
//
//  ── EVERY TRANSFORM REFUSES RATHER THAN NO-OPS ──────────────────────────────
//  A repair that matches nothing is worse than one that fails, because the
//  import reports success and the page is unchanged. lib/csa-frq-archive-repair
//  throws on a miss and this refuses to write the sheet.
//
//  Zero PII.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const repair = require('../lib/csa-frq-archive-repair.js');
const mojibake = require('../lib/mojibake.js');
const sf = require('../lib/storefront-fetch.js');

const spec = repair.spec;
const PUBLISHED_AT = '2026-03-01 12:00:00';

//  Year blocks, chosen on the page formats the audit measured rather than on
//  round numbers: 2004-2007 and 2008-2013 are two different templates, and so
//  are 2014-2017 and 2018-2022.
const BLOCKS = [
  { id: '2004-2007', from: 2004, to: 2007 },
  { id: '2008-2013', from: 2008, to: 2013 },
  { id: '2014-2017', from: 2014, to: 2017 },
  { id: '2018-2022', from: 2018, to: 2022 },
];

//  Synchronous, because everything in this generator is.
function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

const yearOf = (h) => Number(h.match(/(\d{4})/)[1]);
const isQuestion = (h) => /^ap-csa-\d{4}-frq-\d/.test(h);


// -- THE HUB -----------------------------------------------------------------
//  Bespoke, because there is one of it. Each entry is find-or-refuse: a `find`
//  that is not in the live body stops the whole sheet.
//
//  `needs2026` marks the edits that are only true once the 2026 pages exist.
//  The runbook orders the imports so that is already so.
function hubEdits() {
  const Q = repair.QUESTIONS;
  const total = repair.SECTION_POINTS;
  const E = repair.EXAM;
  return [
    { why: 'the FRQ count, which counted 22 years times 4 and got 88 where 86 exist',
      needs2026: true,
      findRe: /<span class="frq-stat-number">88<\/span>(\s*)<span class="frq-stat-label">FRQs Total<\/span>/,
      to: '<span class="frq-stat-number">90</span>$1<span class="frq-stat-label">FRQs Total</span>' },
    { why: 'the coverage range, which stopped at 2025 and used an en dash',
      needs2026: true,
      findRe: /<span class="frq-stat-sub">2004 \u2013 2025<\/span>/,
      to: '<span class="frq-stat-sub">2004 to 2026</span>' },
    { why: 'the year count',
      needs2026: true,
      find: '<span class="frq-stat-number">22 yr</span>',
      to: '<span class="frq-stat-number">23 yr</span>' },
    { why: 'the section point total, retired when the 2026 exam rebuilt the section',
      findRe: /<span class="frq-stat-sub">36 points \u00b7 90 min<\/span>/,
      to: '<span class="frq-stat-sub">' + total + ' points, 90 min</span>' },
    { why: 'the coverage claim, which stopped being true in May 2026',
      needs2026: true,
      find: '<span class="frq-stat-sub">Every released exam</span>',
      to: '<span class="frq-stat-sub">Every released exam, 2004 to 2026</span>' },
    //  The hub carries TWO countdown blocks, frq-urgency and apcs-prep-path,
    //  each with its own visible date and its own script. The first draft of
    //  this edit named one of them and the validator caught the other, so the
    //  date replacement is deliberately global rather than anchored.
    { why: 'both visible exam dates, in the urgency strip and the prep-path header',
      find: 'May 15, 2026', to: spec.dates.nextExam },
    { why: 'the hardcoded countdown, which has read 46 days left since May',
      find: '<span class="frq-urgency-days" id="frq-countdown-days">46 days left</span>',
      to: '<span class="frq-urgency-days" id="frq-countdown-days">counting down</span>' },
    { why: 'both countdown scripts, still targeting a date four months past',
      find: "new Date('2026-05-15T00:00:00')", to: "new Date('2027-05-12T00:00:00')" },
    { why: 'the FAQ answer, which states the retired 36 point section and 9 points a question',
      find: 'The AP CSA exam has 4 FRQs in Section II, worth 45% of your total score (36 points). Each FRQ is worth 9 points. You have 90 minutes for the section, or about 22 minutes per question.',
      to: 'The AP CSA exam has 4 FRQs in Section II, worth ' + E.sectionTwoPercent + '% of your total score. From the 2026 exam the section is ' + total + ' points and the questions are not equal: '
        + Q.map((q) => 'Question ' + q.number + ' is ' + q.points).join(', ') + '. Before 2026 every question was 9 points and the section was 36. You have '
        + E.sectionTwoMinutes + ' minutes for the section, or about ' + E.minutesPerQuestion + ' minutes per question.' },
    { why: 'the second 36 point claim, in the visible FAQ',
      find: '4 FRQs in Section II, worth 45% of your score (36 points total). About 22 minutes per question.',
      to: '4 FRQs in Section II, worth ' + E.sectionTwoPercent + '% of your score. From 2026 the section is ' + total + ' points, split ' + Q.map((q) => q.points).join(', ') + ' rather than 9 each. About ' + E.minutesPerQuestion + ' minutes per question.' },
    { why: 'a misspelled handle for the most recent year\'s question 4, carried by a redirect',
      find: '/pages/ap-csa-2025-frq-4-sumorssamegame',
      to: '/pages/ap-csa-2025-frq-4-sumorsame' },
    { why: 'four 2024 links on a retired handle pattern, each costing a redirect hop',
      find: '/pages/ap-csa-frq-2024-question-1', to: '/pages/ap-csa-2024-frq-1-feeder' },
    { find: '/pages/ap-csa-frq-2024-question-2', to: '/pages/ap-csa-2024-frq-2-scoreboard' },
    { find: '/pages/ap-csa-frq-2024-question-3', to: '/pages/ap-csa-2024-frq-3-wordchecker' },
    { find: '/pages/ap-csa-frq-2024-question-4', to: '/pages/ap-csa-2024-frq-4-gridpath' },
    { why: 'the QOTD hub link, which redirects to /pages/daily-practice',
      find: '/pages/ap-csa-qotd-hub', to: '/pages/daily-practice' },
    { why: 'the headline, which stopped at 2025 and used an en dash',
      needs2026: true,
      findRe: /<h1>AP Computer Science A FRQ Archive \(2004\u20132025\)<\/h1>/,
      to: '<h1>AP Computer Science A FRQ Archive, 2004 to 2026</h1>' },
    { why: 'the Article headline in the structured data, same range and an em dash',
      needs2026: true,
      findRe: /"headline":"AP Computer Science A FRQ Archive \(2004-2025\) \u2014 Complete Solutions"/,
      to: '"headline":"AP Computer Science A FRQ Archive, 2004 to 2026: Complete Solutions"' },
  ];
}

//  The 2026 card goes in front of 2025 in the year grid, so the newest year is
//  first the way every other row on this page is ordered.
function addYearCard(body) {
  //  The card is one anchor, about 560 characters of inline style, and it ends
  //  at the first </a>. Cloning the 2025 one rather than writing fresh markup
  //  means the new card inherits whatever this page's styling happens to be,
  //  which is the only way to match a hand-authored grid without reading it.
  const anchor = body.match(/<a href="\/pages\/ap-csa-frq-2025"[\s\S]*?<\/a>/);
  if (!anchor) throw new repair.Refused(spec.hub.handle, 'has no 2025 year card to copy');
  if (anchor[0].length > 1200) {
    throw new repair.Refused(spec.hub.handle, 'the 2025 year card matched ' + anchor[0].length
      + ' characters, which is too much to be one card');
  }
  if (body.indexOf('/pages/ap-csa-frq-2026') >= 0) {
    throw new repair.Refused(spec.hub.handle, 'already links the 2026 year index');
  }
  const card = anchor[0].split('ap-csa-frq-2025').join('ap-csa-frq-2026').split('2025').join('2026');
  return body.replace(anchor[0], card + anchor[0]);
}

function buildHub(page, opts) {
  let body = page.body_html;
  const changes = [];
  for (const e of hubEdits()) {
    if (e.needs2026 && opts.skip2026) continue;
    if (e.findRe) {
      if (!e.findRe.test(body)) throw new repair.Refused(spec.hub.handle, 'does not contain ' + e.findRe);
      body = body.replace(e.findRe, e.to);
    } else {
      if (body.indexOf(e.find) < 0) throw new repair.Refused(spec.hub.handle, 'does not contain ' + JSON.stringify(e.find.slice(0, 60)));
      body = body.split(e.find).join(e.to);
    }
    if (e.why) changes.push(e.why);
  }
  if (!opts.skip2026) { body = addYearCard(body); changes.push('a 2026 card in the year grid'); }
  return { body, changes };
}


// -- BUILDING THE ROWS -------------------------------------------------------
function buildAll(log) {
  const handles = Object.keys(spec.titles).concat(Object.keys(spec.stubs), Object.keys(spec.unitFix));
  const needBody = new Set(Object.keys(spec.unitFix));
  //  Every question page 2004-2022 gets the scoring note. 2023-2025 already
  //  carry the template's own callout and get the date correction only.
  const live = fs.readFileSync(path.join(ROOT, 'smoke', 'fixtures', 'live-page-handles.txt'), 'utf8')
    .split('\n').map((s) => s.trim()).filter(isQuestion);
  for (const h of live) needBody.add(h);
  for (const h of handles) if (isQuestion(h)) needBody.add(h);

  const pages = new Map();
  const refusals = [];
  const all = [...new Set([...needBody])].sort();
  log('reading ' + all.length + ' live page(s) plus the hub');

  for (const h of all) {
    //  86 sequential reads means a transient reset is likely across a run, and
    //  one dropped connection should not throw away five minutes of correct
    //  work. Narrow on purpose: only a TRANSPORT failure retries. A 404 or a
    //  body the guard refuses is an answer about the page and is not retried,
    //  because asking a second time does not change it.
    let page = null, lastErr = null;
    for (let attempt = 0; attempt < 3 && !page; attempt++) {
      try { page = sf.pageBody(h); }
      catch (e) {
        lastErr = e;
        if (!/curl failed|Recv failure|timed out|Connection reset/i.test(e.message)) break;
        sleepMs(1500 * (attempt + 1));
      }
    }
    if (!page) { refusals.push(h + ': could not read the live body: ' + lastErr.message); continue; }
    let body = page.body_html;
    const changes = [];
    const year = yearOf(h);

    //  The scoring note, on everything before 2023.
    if (year <= 2022) {
      try { const r = repair.addScoringNote(h, body); body = r.body; changes.push(...r.changes); }
      catch (e) { refusals.push(e.message); continue; }
    }
    //  The stale date, wherever it appears. Absent is fine here: most pages
    //  never named it. fixDates throws when asked and missing, so it is only
    //  asked when the string is there.
    if (body.indexOf(spec.dates.staleExam) >= 0) {
      try { const r = repair.fixDates(h, body); body = r.body; changes.push(...r.changes); }
      catch (e) { refusals.push(e.message); continue; }
    }
    //  A JSON-LD block that has never parsed, on the one page that has one.
    const broken = (body.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [])
      .some((b) => { try { JSON.parse(b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')); return false; } catch (e) { return true; } });
    if (broken) {
      try { const r = repair.fixJsonLd(h, body); body = r.body; changes.push(...r.changes); }
      catch (e) { refusals.push(e.message); continue; }
    }

    //  The six unit contradictions.
    if (spec.unitFix[h]) {
      try { const r = repair.fixUnit(h, body); body = r.body; changes.push(...r.changes); }
      catch (e) { refusals.push(e.message); continue; }
    }
    if (!changes.length) continue;
    pages.set(h, { handle: h, title: page.title, body, changes, year, before: page.body_html });
  }
  return { pages, refusals };
}


// -- THE SHEETS --------------------------------------------------------------
const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

function writeSheet(dir, name, header, rows) {
  const lines = [header.map(cell).join(',')];
  for (const r of rows) lines.push(r.map(cell).join(','));
  const csv = '\ufeff' + lines.join('\r\n') + '\r\n';
  const dest = path.join(dir, name);
  fs.writeFileSync(dest, csv);
  return { dest, csv };
}

//  An RFC 4180 reader that shares no code with the writer above. Generation is
//  not evidence that generation worked.
function parseCsv(text) {
  const s = text.replace(/^\ufeff/, '');
  const rows = []; let row = [], field = '', q = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && s[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function checkBody(handle, before, after) {
  const bad = [];
  if (after.length < before.length * 0.98) {
    bad.push('the repaired body is ' + (before.length - after.length) + ' bytes SHORTER; a repair should not remove content');
  }
  const mo = mojibake.analyze(after);
  if (mo && mo.length) bad.push('mojibake in the result: ' + mo.length + ' run(s)');
  //  The repair must not INTRODUCE non-ASCII. These pages already carry some
  //  and cleaning all of it is not this sheet's job, so the test is a delta.
  const na = (s) => (s.match(/[^\x00-\x7F]/g) || []).length;
  if (na(after) > na(before)) bad.push('the repair added ' + (na(after) - na(before)) + ' non-ASCII character(s)');
  if ((after.match(/\u2014/g) || []).length > (before.match(/\u2014/g) || []).length) bad.push('the repair added an em-dash');
  //  BOTH OF THESE ARE DELTAS, AND THE FIRST DRAFT HAD THEM ABSOLUTE.
  //
  //  An absolute rule here fires on content the repair never touched: a page
  //  that already named the retired curriculum and still does has not been made
  //  worse by gaining a scoring note, and refusing the whole sheet over it means
  //  the note never ships. The suite's own controls caught this, which is what
  //  controls are for.
  //
  //  The absolute guarantee still exists and is stronger, one level down:
  //  fixDates throws if the stale date survives it, and fixUnit throws if it
  //  matched nothing. Those are asserted in section 3 of the suite. What is
  //  checked HERE is the only thing this layer can honestly check, which is that
  //  the repair did not make either worse.
  const count = (s, re) => (s.match(re) || []).length;
  const staleRe = new RegExp(spec.dates.staleExam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  //  Two-sided, which is stronger than either half. A page that named the stale
  //  date must come back naming it zero times, because the generator only runs
  //  fixDates when the string is there. A page that never named it must not
  //  gain one. A plain "after > before" misses a repair that removes one
  //  reference and adds another.
  const staleBefore = count(before, staleRe), staleAfter = count(after, staleRe);
  if (staleBefore > 0 && staleAfter > 0) {
    bad.push('named ' + spec.dates.staleExam + ' ' + staleBefore + ' time(s) and still names it ' + staleAfter);
  } else if (staleBefore === 0 && staleAfter > 0) {
    bad.push('the repair added a reference to ' + spec.dates.staleExam);
  }
  if (count(after, /Unit \d:\s*Primitive Types/g) > count(before, /Unit \d:\s*Primitive Types/g)) {
    bad.push('the repair added the retired 10-unit curriculum');
  }
  const opens = (after.match(/<div\b/g) || []).length, closes = (after.match(/<\/div>/g) || []).length;
  const bOpens = (before.match(/<div\b/g) || []).length, bCloses = (before.match(/<\/div>/g) || []).length;
  if (opens - closes !== bOpens - bCloses) bad.push('div balance changed: was ' + (bOpens - bCloses) + ', now ' + (opens - closes));
  const sOpen = (after.match(/<script\b/g) || []).length, sClose = (after.match(/<\/script>/g) || []).length;
  if (sOpen !== sClose) bad.push('unbalanced script elements');
  for (const b of after.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []) {
    const json = b.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    try { JSON.parse(json); } catch (e) { bad.push('JSON-LD no longer parses: ' + e.message.slice(0, 50)); }
  }
  return bad;
}

function checkTitle(handle, title) {
  const bad = [];
  if (/^Ap Csa |\bFrq\b/.test(title)) bad.push('title still lowercases an acronym');
  if (/[^\x00-\x7F]/.test(title)) bad.push('title carries a non-ASCII character');
  if (title.length > 70) bad.push('title is ' + title.length + ' characters, over the 70 Shopify shows');
  if (spec.stubs[handle] && !/Not Tested/.test(title)) bad.push('a stub page title does not say the question is off the exam');
  if (spec.stubs[handle] && /Complete Solution/.test(title)) bad.push('a stub page still promises a Complete Solution');
  return bad;
}

function main(argv) {
  const outDir = argv[0] || 'imports/2026-09-17-frq-archive';
  const skip2026 = argv.includes('--no-2026');
  const dir = path.resolve(ROOT, outDir);
  fs.mkdirSync(dir, { recursive: true });
  const log = (s) => console.log('  ' + s);

  const { pages, refusals } = buildAll(log);

  // -- the hub
  let hub = null;
  try {
    const p = sf.pageBody(spec.hub.handle);
    const r = buildHub(p, { skip2026 });
    hub = { handle: spec.hub.handle, title: spec.hub.title, body: r.body, changes: r.changes, before: p.body_html };
  } catch (e) { refusals.push(String(e.message)); }

  // -- titles
  const titleRows = [];
  for (const h of [...new Set(Object.keys(spec.titles).concat(Object.keys(spec.stubs)))].sort()) {
    const t = repair.newTitle(h);
    if (!t) { refusals.push(h + ': no replacement title'); continue; }
    titleRows.push({ handle: h, title: t });
  }

  // -- validate
  const problems = [...refusals];
  for (const r of titleRows) for (const m of checkTitle(r.handle, r.title)) problems.push(r.handle + ': ' + m);
  for (const p of pages.values()) for (const m of checkBody(p.handle, p.before, p.body)) problems.push(p.handle + ': ' + m);
  if (hub) for (const m of checkBody(hub.handle, hub.before, hub.body)) problems.push(hub.handle + ': ' + m);

  if (problems.length) {
    console.error('\n  ' + problems.length + ' problem(s). No file written:\n');
    for (const m of problems) console.error('    ' + m);
    process.exit(1);
  }

  // -- write
  const written = [];
  //  Sheet 1: titles only. No Body HTML column at all, which is what makes this
  //  the safe one to run first.
  {
    const header = ['Handle', 'Command', 'Title'];
    const rows = titleRows.map((r) => [r.handle, 'MERGE', r.title]);
    const { dest, csv } = writeSheet(dir, '01-csa-frq-titles-pages.csv', header, rows);
    written.push({ dest, csv, header, rows, label: 'titles, no body column' });
  }
  //  Sheets 2-5: bodies, one per year block.
  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  BLOCKS.forEach((b, i) => {
    const rows = [...pages.values()].filter((p) => p.year >= b.from && p.year <= b.to)
      .sort((x, y) => x.handle.localeCompare(y.handle))
      .map((p) => [p.handle, 'MERGE', p.body, 'TRUE', PUBLISHED_AT]);
    if (!rows.length) return;
    const { dest, csv } = writeSheet(dir, '0' + (i + 2) + '-csa-frq-' + b.id + '-pages.csv', header, rows);
    written.push({ dest, csv, header, rows, label: b.id });
  });
  //  Any 2023-2025 page that needed the date correction.
  {
    const rows = [...pages.values()].filter((p) => p.year >= 2023)
      .sort((x, y) => x.handle.localeCompare(y.handle))
      .map((p) => [p.handle, 'MERGE', p.body, 'TRUE', PUBLISHED_AT]);
    if (rows.length) {
      const { dest, csv } = writeSheet(dir, '06-csa-frq-2023-2025-pages.csv', header, rows);
      written.push({ dest, csv, header, rows, label: '2023-2025, dates only' });
    }
  }
  if (hub) {
    const { dest, csv } = writeSheet(dir, '07-csa-frq-archive-hub-pages.csv',
      ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'],
      [[hub.handle, 'MERGE', hub.title, hub.body, 'TRUE', PUBLISHED_AT]]);
    written.push({ dest, csv, header: ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'],
      rows: [[hub.handle, 'MERGE', hub.title, hub.body, 'TRUE', PUBLISHED_AT]], label: 'archive hub' });
  }

  // -- parse every file back and diff it, cell by cell
  const diffs = [];
  for (const w of written) {
    const read = parseCsv(fs.readFileSync(w.dest, 'utf8'));
    if (read.length !== w.rows.length + 1) diffs.push(path.basename(w.dest) + ': read ' + read.length + ' rows, wrote ' + (w.rows.length + 1));
    w.header.forEach((h, i) => { if (read[0][i] !== h) diffs.push(path.basename(w.dest) + ': header ' + i + ' is ' + JSON.stringify(read[0][i])); });
    w.rows.forEach((row, n) => row.forEach((v, i) => {
      if (read[n + 1] && read[n + 1][i] !== v) {
        diffs.push(path.basename(w.dest) + ' row ' + (n + 1) + ' column ' + w.header[i] + ': read '
          + (read[n + 1][i] === undefined ? 'nothing' : read[n + 1][i].length + ' chars, wrote ' + String(v).length));
      }
    }));
  }
  if (diffs.length) {
    console.error('\n  the files do not read back as written:\n');
    for (const d of diffs) console.error('    ' + d);
    for (const w of written) fs.unlinkSync(w.dest);
    process.exit(1);
  }

  console.log('\nwrote ' + written.length + ' sheet(s) to ' + outDir);
  for (const w of written) {
    console.log('  ' + path.basename(w.dest).padEnd(38) + String(w.rows.length).padStart(3) + ' row(s)  '
      + (Buffer.byteLength(w.csv) / 1024).toFixed(0) + ' KB  ' + w.label);
  }
  console.log('  every cell parsed back and diffed clean');
  const changed = [...pages.values()].reduce((n, p) => n + p.changes.length, 0);
  console.log('  ' + pages.size + ' body repair(s) carrying ' + changed + ' change(s), ' + titleRows.length + ' title repair(s)');
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { buildAll, buildHub, hubEdits, addYearCard, checkBody, checkTitle, parseCsv, BLOCKS, PUBLISHED_AT };
