'use strict';
// -----------------------------------------------------------------------------
//  DID THE ARCHIVE REPAIR ACTUALLY LAND? ASK THE STOREFRONT.
//
//    node scripts/verify-csa-frq-archive-live.js            every sheet
//    node scripts/verify-csa-frq-archive-live.js --titles   just sheet 1
//    node scripts/verify-csa-frq-archive-live.js --hub      just sheet 7
//
//  Every assertion here is FALSE BEFORE THE IMPORT and true after, which is the
//  only kind worth writing. "The page still serves 200" was true yesterday and
//  would be true if nothing imported at all.
//
//  It fetches through lib/storefront-fetch.js, which refuses a body it cannot
//  prove is a rendered page. That matters more here than usual: most of these
//  assertions are of the form "this string is now present", and every one of
//  them reads FALSE on a bot-challenge page. Three verifiers in this repo once
//  reported a confident, plausible, entirely false regression that way.
//
//  Zero PII.
// -----------------------------------------------------------------------------
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const repair = require('../lib/csa-frq-archive-repair.js');

const spec = repair.spec;
const isQuestion = (h) => /^ap-csa-\d{4}-frq-\d/.test(h);

let pass = 0, fail = 0, skipped = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  -> ' + String(detail).slice(0, 200))); }
}

function body(handle) {
  //  A transport failure is not an answer about the page.
  let last = null;
  for (let i = 0; i < 3; i++) {
    try { return sf.pageBody(handle); }
    catch (e) {
      last = e;
      if (!/curl failed|Recv failure|timed out|Connection reset/i.test(e.message)) throw e;
      const end = Date.now() + 1500 * (i + 1);
      while (Date.now() < end) { /* spin */ }
    }
  }
  throw last;
}

function checkTitles() {
  console.log('\nsheet 1, the titles');
  const handles = [...new Set(Object.keys(spec.titles).concat(Object.keys(spec.stubs)))].sort();
  for (const h of handles) {
    let p;
    try { p = body(h); } catch (e) { ok(h, false, e.message); continue; }
    const want = repair.newTitle(h);
    ok(h.padEnd(38) + ' title', p.title === want, 'is ' + JSON.stringify(p.title) + ', wanted ' + JSON.stringify(want));
  }
}

function checkBodies() {
  console.log('\nsheets 2 to 6, the bodies');
  const handles = require('fs')
    .readFileSync(path.join(__dirname, '..', 'smoke', 'fixtures', 'live-page-handles.txt'), 'utf8')
    .split('\n').map((s) => s.trim()).filter(isQuestion).sort();
  for (const h of handles) {
    const year = Number(h.match(/(\d{4})/)[1]);
    let p;
    try { p = body(h); } catch (e) { ok(h, false, e.message); continue; }
    const b = p.body_html;
    const notes = [];
    //  The one thing this repair is FOR: a reader on an archive page is told
    //  the rubric below them is retired. 2023-2025 carry the template's own
    //  callout instead and are checked for that.
    if (year <= 2022) {
      notes.push(['carries the 2026 scoring note', b.indexOf(repair.noteId(h)) >= 0]);
      notes.push(['the note states the current section total', b.indexOf(String(repair.SECTION_POINTS) + ' points') >= 0]);
    } else {
      notes.push(['carries the template callout', /frq-2026-callout/.test(b)]);
    }
    notes.push(['no longer names ' + spec.dates.staleExam, b.indexOf(spec.dates.staleExam) < 0]);
    if (spec.unitFix[h]) {
      const u = spec.units[String(spec.unitFix[h].unit)];
      notes.push(['study link points at ' + u.handle, b.indexOf('/pages/' + u.handle) >= 0]);
      notes.push(['no retired 10-unit curriculum name', !/Unit \d:\s*Primitive Types/.test(b)]);
    }
    //  The page that has never had valid structured data.
    if (h === 'ap-csa-2016-frq-3-crossword') {
      const blocks = b.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
      const allParse = blocks.length > 0 && blocks.every((x) => {
        try { JSON.parse(x.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '')); return true; }
        catch (e) { return false; }
      });
      notes.push(['every JSON-LD block parses', allParse]);
    }
    const bad = notes.filter((n) => !n[1]);
    ok(h.padEnd(38) + ' ' + notes.length + ' assertion(s)', bad.length === 0, bad.map((n) => n[0]).join('; '));
  }
}

function checkHub() {
  console.log('\nsheet 7, the archive hub');
  let p;
  try { p = body(spec.hub.handle); } catch (e) { ok('hub', false, e.message); return; }
  const b = p.body_html;
  const E = repair.EXAM;
  const rows = [
    ['the title names the full range', p.title === spec.hub.title, JSON.stringify(p.title)],
    ['the FRQ count is 90, not 88', b.indexOf('>90</span>') >= 0 && b.indexOf('>88</span>') < 0],
    ['the coverage range reaches 2026', b.indexOf('2004 to 2026') >= 0],
    ['the year count is 23', b.indexOf('23 yr') >= 0],
    ['the section total is ' + repair.SECTION_POINTS + ', not 36', b.indexOf('36 points') < 0],
    ['the exam date is ' + spec.dates.nextExam, b.indexOf(spec.dates.nextExam) >= 0],
    ['no countdown to the dead date', b.indexOf(spec.dates.staleExam) < 0 && b.indexOf('2026-05-15') < 0],
    ['no hardcoded "46 days left"', b.indexOf('46 days left') < 0],
    ['the 2026 year index is linked', b.indexOf('/pages/ap-csa-frq-2026') >= 0],
    ['the misspelled 2025 handle is gone', b.indexOf('sumorssamegame') < 0],
    ['the four 2024 links use the live handles', b.indexOf('ap-csa-frq-2024-question-') < 0],
    ['the QOTD link no longer redirects', b.indexOf('ap-csa-qotd-hub') < 0],
    //  The first draft asserted "Section II is 45%", which was already on the
    //  page before the import and would have been true if nothing landed. What
    //  is false before and true after is the FAQ saying the questions are NOT
    //  equal, which is the fact the repair adds.
    ['the FAQ says the questions are not equal', /the questions are not equal/.test(b)],
  ];
  for (const [name, cond, detail] of rows) ok(name, cond, detail);
}

function main(argv) {
  const only = argv.find((a) => /^--(titles|bodies|hub)$/.test(a));
  console.log('AP CSA FRQ archive, live');
  if (!only || only === '--titles') checkTitles();
  if (!only || only === '--bodies') checkBodies();
  if (!only || only === '--hub') checkHub();
  console.log('\n' + pass + ' ok, ' + fail + ' failed' + (skipped ? ', ' + skipped + ' skipped' : ''));
  if (fail > 0) {
    console.log('\nNOT IMPORTED YET, or imported and wrong. Every assertion above is false before');
    console.log('the import and true after, so a red run before you import is expected.');
    process.exit(1);
  }
  console.log('OK - the archive repair is live');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { checkTitles, checkBodies, checkHub };
