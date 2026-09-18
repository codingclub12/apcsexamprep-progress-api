'use strict';
// -----------------------------------------------------------------------------
//  REPAIRING 86 HAND-AUTHORED PAGES WITHOUT REWRITING THEM.
//
//  These pages have no generator and are not getting one in this pass: they are
//  86 indexed bodies in four different formats, and regenerating them all at
//  once is how you turn a list of small defects into one large incident. So
//  every transform here is a SURGICAL edit to the live body, and every one of
//  them refuses rather than guesses.
//
//  ── THE RULE THAT MAKES THAT SAFE ──────────────────────────────────────────
//  A transform states the exact text it expects to find. If the text is not
//  there, the page is REFUSED and named, and no row is written for it. A repair
//  that quietly matches nothing is the worst possible outcome, because the
//  import reports success and the page is unchanged.
//
//  Measured on 2026-09-17 against live bodies pulled through
//  lib/storefront-fetch.js. docs/reports/2026-09-17-csa-frq-audit.md has the
//  method and the counts.
//
//  ── WHY THE CALLOUT IS SELF-CONTAINED ──────────────────────────────────────
//  40 of these pages have no wrapper id at all and the other 46 have one each,
//  frq14q1 through frq22q4. There is no shared stylesheet to hook into, so the
//  2026 scoring note carries its own unique id and its own scoped CSS, with the
//  all:initial reset the theme's CONVENTIONS.md requires. It renders the same
//  on a 8KB page from 2008 and a 38KB one from 2022 because it depends on
//  neither.
//
//  The 2023 to 2025 pages already carry a correct callout and are skipped. What
//  they get here is the date correction only.
//
//  Zero PII. Pure ASCII, no em-dashes, both asserted by the suite.
// -----------------------------------------------------------------------------

const path = require('path');
const spec = require(path.join(__dirname, '..', 'config', 'csa-frq-archive-repair.json'));
//  The exam numbers have ONE home. Two copies of 7/7/5/6 is how one goes stale.
const frq2026 = require(path.join(__dirname, '..', 'config', 'csa-frq-2026.json'));

const EXAM = frq2026.exam;
const QUESTIONS = frq2026.questions;
const SECTION_POINTS = QUESTIONS.reduce((n, q) => n + q.points, 0);

class Refused extends Error {
  constructor(handle, why) { super(handle + ': ' + why); this.handle = handle; this.why = why; }
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

//  A DOM id that is valid, unique per page and cannot collide with anything the
//  page already declares: every existing wrapper here is frqNNqN or yhubNNNN.
function noteId(handle) {
  return 'frq2026note-' + handle.replace(/[^a-z0-9]+/g, '-');
}


//  "May 2027" out of "Wednesday, May 12, 2027".
function examMonthYear() {
  const m = EXAM.nextExamDate.match(/([A-Z][a-z]+)\s+\d+,\s*(\d{4})/);
  if (!m) throw new Error('nextExamDate is not a shape this can read: ' + EXAM.nextExamDate);
  return m[1] + ' ' + m[2];
}

// -- THE 2026 SCORING NOTE ---------------------------------------------------
//  What a reader of an archive page most needs and cannot get from the page: the
//  rubric they are about to self-grade against was retired. It states the old
//  number too, because "this is now 7 points" without "it used to be 9" reads
//  like a typo to someone holding a printout.
function scoringNote(handle) {
  const id = noteId(handle);
  const rows = QUESTIONS.map((q) => {
    const parts = q.parts.length > 1
      ? q.parts.map((p) => 'Part ' + p.label + ' ' + p.points).join(' + ')
      : 'single part';
    return '<tr><td>Question ' + q.number + '</td><td><strong>' + q.points + '</strong></td>'
      + '<td>' + esc(parts) + '</td><td>' + esc(q.typeLabel) + '</td></tr>';
  }).join('');

  const css = [
    '#' + id + '{all:initial!important;display:block!important;box-sizing:border-box!important;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;',
    'background:#fffbeb!important;border:1px solid #fcd34d!important;border-left:5px solid #d97706!important;',
    'border-radius:8px!important;margin:0 0 18px 0!important;padding:0!important;overflow:hidden!important;}',
    '#' + id + ' *{box-sizing:border-box!important;font-family:inherit!important;}',
    '#' + id + ' summary{display:block!important;cursor:pointer!important;padding:12px 15px!important;',
    'font-size:0.95em!important;line-height:1.5!important;list-style:none!important;',
    'color:#78350f!important;-webkit-text-fill-color:#78350f!important;}',
    '#' + id + ' summary::-webkit-details-marker{display:none!important;}',
    '#' + id + ' summary::marker{content:""!important;}',
    '#' + id + ' summary:hover{background:#fef3c7!important;}',
    '#' + id + ' summary strong{font-weight:700!important;color:#78350f!important;-webkit-text-fill-color:#78350f!important;}',
    '#' + id + ' .n26-body{display:block!important;padding:0 15px 14px!important;',
    'font-size:0.92em!important;line-height:1.6!important;color:#78350f!important;-webkit-text-fill-color:#78350f!important;}',
    '#' + id + ' .n26-body p{margin:0 0 10px!important;color:#78350f!important;-webkit-text-fill-color:#78350f!important;}',
    '#' + id + ' .n26-body strong{font-weight:700!important;color:#78350f!important;-webkit-text-fill-color:#78350f!important;}',
    '#' + id + ' table{border-collapse:collapse!important;width:100%!important;margin:0 0 10px!important;',
    'font-size:0.95em!important;background:#fffdf5!important;}',
    '#' + id + ' th,#' + id + ' td{border:1px solid #fcd34d!important;padding:6px 9px!important;text-align:left!important;',
    'color:#78350f!important;-webkit-text-fill-color:#78350f!important;}',
    '#' + id + ' th{background:#fef3c7!important;font-weight:700!important;}',
    '#' + id + ' a{color:#92400e!important;-webkit-text-fill-color:#92400e!important;text-decoration:underline!important;}',
    '#' + id + ' .n26-src{font-size:0.85em!important;font-style:italic!important;margin:0!important;}',
  ].join('');

  return '<style>' + css + '</style>\n'
    + '<details id="' + id + '">\n'
    //  "the May 12 exam" is what the first draft produced, because stripping the
    //  weekday and cutting at the first comma also drops the year. A month and a
    //  year is what a student actually needs in a summary line.
    + '<summary><strong>Heads up: the ' + examMonthYear()
    + ' exam scores free response differently from this one.</strong> Tap for the current point structure.</summary>\n'
    + '<div class="n26-body">\n'
    + '<p>Every AP CSA free-response question from 2004 through 2025 was worth <strong>9 points</strong>,'
    + ' and the section was 36. From 2026 the four questions are worth <strong>7, 7, 5 and 6</strong>,'
    + ' the section is <strong>' + SECTION_POINTS + ' points</strong>, and only Question 1 has parts.</p>\n'
    + '<table><tr><th>Question</th><th>Points</th><th>Parts</th><th>Type</th></tr>' + rows + '</table>\n'
    + '<p>Section I is now ' + EXAM.sectionOneQuestions + ' multiple-choice questions at '
    + EXAM.sectionOnePercent + '% of the score, and Section II is ' + EXAM.sectionTwoPercent + '%.'
    + ' The question on this page is still worth practising. The 9 points printed below it are not the'
    + ' rubric you will be scored against.</p>\n'
    + '<p class="n26-src">Point totals from College Board\'s 2026 scoring guidelines; section weightings'
    + ' from the AP Computer Science A exam page. See the '
    + '<a href="/pages/ap-csa-frq-2026">2026 questions</a> for the current format.</p>\n'
    + '</div>\n</details>\n';
}


// -- THE TRANSFORMS ----------------------------------------------------------
//  Each returns { body, changes[] } or throws Refused. None of them is allowed
//  to no-op silently: a transform that was asked to run and matched nothing is
//  a refusal.

function addScoringNote(handle, body) {
  if (body.indexOf(noteId(handle)) >= 0) {
    throw new Refused(handle, 'already carries the 2026 scoring note');
  }
  if (/frq-2026-callout/.test(body)) {
    throw new Refused(handle, 'already carries the template callout, so it does not need this one');
  }
  return { body: scoringNote(handle) + body, changes: ['added the 2026 scoring note'] };
}

function fixDates(handle, body) {
  const stale = spec.dates.staleExam;
  if (body.indexOf(stale) < 0) throw new Refused(handle, 'does not name ' + stale);
  const before = body.split(stale).length - 1;
  //  The long form first, so "Friday, May 15, 2026" does not become
  //  "Friday, May 12, 2027" with the wrong weekday on the front.
  let out = body.replace(/\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,\s*May 15, 2026/g, spec.dates.nextExamLong);
  out = out.split(stale).join(spec.dates.nextExam);
  if (out.indexOf(stale) >= 0) throw new Refused(handle, 'still names ' + stale + ' after the replacement');
  return { body: out, changes: [before + ' stale exam date(s) moved to ' + spec.dates.nextExam] };
}

function fixUnit(handle, body) {
  const want = spec.unitFix[handle];
  if (!want) throw new Refused(handle, 'has no unit correction declared');
  const unit = spec.units[String(want.unit)];
  const changes = [];
  let out = body;

  //  The Curriculum Alignment line, where it names the wrong unit.
  const align = out.match(/Curriculum Alignment:<\/strong>\s*Unit (\d)\s*\(([^)]*)\)/);
  if (align && Number(align[1]) !== want.unit) {
    out = out.replace(align[0],
      'Curriculum Alignment:</strong> Unit ' + want.unit + ' (' + unit.name + ')');
    changes.push('alignment Unit ' + align[1] + ' to Unit ' + want.unit);
  }

  //  The Study This Topic link, where it points at another unit's guide. Also
  //  where "Unit 1: Primitive Types" lives, which is the retired curriculum.
  const link = out.match(/(Study This Topic:<\/strong>\s*<a href=")\/pages\/([a-z0-9-]+)("[^>]*>)([^<]*)(<\/a>)/);
  if (!link) throw new Refused(handle, 'has no Study This Topic link to correct');
  const currentHandle = link[2];
  if (currentHandle !== unit.handle) {
    out = out.replace(link[0],
      link[1] + '/pages/' + unit.handle + link[3]
      + 'Unit ' + want.unit + ': ' + unit.name + ' Complete Study Guide' + link[5]);
    changes.push('study link ' + currentHandle + ' to ' + unit.handle);
  }

  if (!changes.length) throw new Refused(handle, 'matched nothing to correct');
  return { body: out, changes };
}

//  2016 FRQ 3 ships a JSON-LD block that has never parsed. Its FAQ answer talks
//  about the null character and writes it as a backslash followed by a zero
//  inside a JSON string, which is not one of the escapes JSON allows, so Google
//  discards the whole block. The text is right and only its escaping is wrong,
//  so the repair doubles the backslash rather than rewording anything.
//
//  Deliberately narrow: it only touches text INSIDE an ld+json element, and only
//  a backslash followed by a character JSON does not accept after one.
function fixJsonLd(handle, body) {
  const bad = /\\(?!["\\\/bfnrtu])/g;
  let fixed = 0;
  const out = body.replace(/(<script[^>]*application\/ld\+json[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (all, open, json, close) => {
      try { JSON.parse(json); return all; } catch (e) { /* only touch a block that is broken */ }
      const repaired = json.replace(bad, (m) => { fixed++; return '\\\\'; });
      try { JSON.parse(repaired); } catch (e) { return all; }
      return open + repaired + close;
    });
  if (!fixed) throw new Refused(handle, 'has no invalid JSON-LD escape to repair');
  return { body: out, changes: [fixed + ' invalid JSON escape(s) repaired so the block parses'] };
}

function retitleStub(handle, currentTitle) {
  const s = spec.stubs[handle];
  if (!s) throw new Refused(handle, 'is not a declared stub page');
  const year = handle.match(/(\d{4})/)[1];
  const n = handle.match(/-frq-(\d)/)[1];
  return year + ' AP CSA FRQ ' + n + ': ' + s.name + ' (' + (s.short || s.caseStudy) + ', Not Tested)';
}

function newTitle(handle, currentTitle) {
  if (spec.stubs[handle]) return retitleStub(handle, currentTitle);
  return spec.titles[handle] || null;
}


module.exports = {
  spec, EXAM, QUESTIONS, SECTION_POINTS, Refused, esc, noteId,
  scoringNote, addScoringNote, fixDates, fixUnit, fixJsonLd, newTitle, retitleStub,
};
