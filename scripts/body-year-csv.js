'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE BODY REWRITE SHEETS.
//
//    node scripts/body-year-csv.js out/            reads the live stored bodies
//    node scripts/body-year-csv.js out/ --from DIR uses bodies already on disk
//
//  ONE SHEET PER PAGE. A `Body HTML` column overwrites a live page body with no
//  undo, so the blast radius of a single click is however many rows are in the
//  file, and here that is deliberately one. The cyber quiz migration shipped as
//  a seventeen-page sheet and the question that followed it, "can we not do
//  this by unit?", is the rule these files obey.
//
//  ── THREE REFUSALS AND ONE REVIEW NOTE ──────────────────────────────────────
//  1  COUNT. Every find-string must appear exactly as many times as
//     seed/body-year-rewrites.js says. A body that moved since the spec was
//     written fails the whole sheet rather than applying half of it.
//  2  SURGICAL. After applying, the new body must differ from the old ONLY
//     inside the intended replacements. Computed by re-deriving the old body
//     from the new one and requiring it back byte for byte.
//  3  ENTITY. A `&lt;` followed by a letter, `/`, `!` or `?` decodes into a TAG
//     when Shopify saves, and the parser then eats what follows. That is how an
//     address was deleted from a live phishing exercise on 2026-09-06. Measured
//     across these four bodies: 130 escaped angle brackets, none of them a tag
//     start, all of them comparison operators. The guard refuses if that ever
//     stops being true rather than trusting the measurement.
//  4  STALE is a NOTE, not a refusal, and the difference is deliberate. These
//     bodies legitimately carry 21 and 23 past years each: 2025 score
//     distributions, the 2022 released exam, "since 2011". Refusing on those
//     would make the check something a person switches off. It prints what it
//     found so a human reads the list, and it is how the JSON-LD twins on the
//     score calculator were found at all, after the visible copy was already
//     handled and the spec looked finished.
//
//  ── WHY LITERAL NON-BREAKING SPACES ARE CONVERTED ───────────────────────────
//  Board #292: a Matrixify import strips a literal U+00A0 out of a page body.
//  ap-csa-reference-sheet carries 16 of them, holding empty table cells open
//  and padding pipe separators. Sent as `&nbsp;` they cross the CSV as ASCII
//  and Shopify decodes them back to the character on save, so the stored body
//  ends up where it started instead of losing them.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { PAGES, TITLES } = require('../seed/body-year-rewrites');

const HEADER = ['Handle', 'Command', 'Body HTML'];
//  A column that could change anything other than the body. `Title` and
//  `Published` are how a page gets renamed or hidden by accident.
const FORBIDDEN_COLUMNS = ['Title', 'Published', 'Published At', 'Template Suffix', 'SEO Title', 'SEO Description'];

function assertHeaderIsSafe(header) {
  const bad = header.filter((c) => FORBIDDEN_COLUMNS.includes(c));
  if (bad.length) {
    throw new Error(`refusing to write a sheet carrying ${bad.join(', ')}. `
      + 'These sheets change a body and nothing else.');
  }
  if (!header.includes('Body HTML')) throw new Error('a body sheet with no Body HTML column changes nothing');
}

//  QUOTE_ALL, per the Matrixify convention in CONVENTIONS.md.
const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';

function loadBody(handle, fromDir) {
  if (fromDir) return fs.readFileSync(path.join(fromDir, handle + '.html'), 'utf8');
  const { pageBody } = require('../lib/storefront-fetch');
  return pageBody(handle).body_html;
}

//  Refusal 3. HTML5 starts a tag only on a letter, '/', '!' or '?'; anything
//  else after '<' is literal text that re-serializes back to '&lt;'.
function dangerousEntities(body) {
  const out = [];
  for (const m of body.matchAll(/&lt;/g)) {
    const next = body[m.index + 4];
    if (next && /[A-Za-z!/?]/.test(next)) out.push(body.slice(Math.max(0, m.index - 30), m.index + 30));
  }
  return out;
}

//  Refusal 4. A year is stale only when it stands alone: not inside a URL, not
//  part of a school-year span, not part of an archive range like 2004 to 2025.
function staleYears(body, examYear, now = new Date()) {
  //  ── A SCHOOL-YEAR SPAN IS CHECKED, NOT SKIPPED ─────────────────────────────
  //  The first version stripped every span before looking, on the reasoning that
  //  2026-27 is correct and should not be flagged. True, but it meant an ENDED
  //  span was not flagged either. ap-csp-reference-sheet says "the 2025-2026 AP
  //  CSP exam" four times and this function called that page clean, which is the
  //  worst kind of check: one that reports nothing and looks like evidence.
  //  Spans are now judged by their END year, the same way scripts/
  //  seo-metadata-csv.js has always judged the ones it writes.
  const spanHits = [];
  const SPAN = /\b(20\d{2})\s*[-–]\s*(20\d{2}|\d{2})\b/g;
  for (const m of body.matchAll(SPAN)) {
    const start = Number(m[1]);
    const end = m[2].length === 2 ? Number(String(start).slice(0, 2) + m[2]) : Number(m[2]);
    //  Only a SCHOOL YEAR, two consecutive years. 2004-2025 is an archive range.
    if (end === start + 1 && end < examYear) {
      spanHits.push(body.slice(Math.max(0, m.index - 45), m.index + 25).replace(/\s+/g, ' '));
    }
  }

  //  ── AN ISO DATE IS INVISIBLE TO EVERY RULE BELOW IT ────────────────────────
  //  Found 2026-09-18 on the CSA hub, the page Google hands the most traffic.
  //  Its Quick Access header carries
  //
  //      <span id="hub-countdown" data-exam-iso="2026-05-15T12:00:00">
  //
  //  and the page's own inline script turns a target in the past into the words
  //  "Exam complete, great work!". Rendered in Chromium on 2026-09-18 that
  //  header read "Quick Access, Exam complete, great work!" to a student eight
  //  months out from the exam.
  //
  //  This function called the page CLEAN, and not by omission. The SPAN regex
  //  above reads "2026-05" as a school-year span: start 2026, end "05", which
  //  the two-digit branch expands to 2005. 2005 is not 2027, so no span hit.
  //  Then the stripper below removed "2026-05" AS a span, so the standalone
  //  scan never saw the 2026 either. The date was eaten by the rule written to
  //  protect correct spans, and every ISO date on every page was invisible the
  //  same way.
  //
  //  So ISO dates are judged FIRST, against the clock rather than against
  //  examYear, because a countdown target that has passed is stale whatever
  //  year it names. Then they are removed explicitly rather than swallowed.
  //
  //  The one exemption is schema.org's own vocabulary for when a thing was
  //  authored. "datePublished": "2026-03-01" sits in the JSON-LD on
  //  ap-csa-reference-sheet and is SUPPOSED to name a past date, the same way
  //  the Last Updated stamp below is. That list is schema.org's rather than one
  //  invented here, which is the difference between an exemption and a pattern
  //  list. Event startDate and endDate are deliberately NOT on it: an event
  //  whose start has passed is exactly the defect this rule is for.
  const base = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(?:href|src|id|class|action|xmlns|xmlns:\w+|viewBox|viewbox|d)\s*=\s*"[^"]*"/gi, ' ')
    //  Any absolute URL, wherever it sits. www.w3.org/2000/svg appears in every
    //  inline SVG on these pages and read as 34 stale years on one of them.
    .replace(/https?:\/\/[^\s"'<>)]+/gi, ' ');

  //  No trailing \b. An ISO instant runs straight into "T12:00:00" and there is
  //  no word boundary between "5" and "T", so requiring one would have missed
  //  the exact shape this rule exists for.
  const ISO = /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(?![-\d])/g;
  const AUTHORED = /"(?:datePublished|dateModified|dateCreated|uploadDate)"\s*:\s*"[^"]*"/g;
  //  KNOWN AND DELIBERATELY NOT EXEMPTED: ap-csa-topics carries a Klaviyo API
  //  version pin, 'revision': '2024-10-15', and this rule calls it a past date.
  //  It is. Exempting it would mean naming another key, and a pattern list is
  //  how a check goes quiet without saying so. These hits are a REVIEW NOTE that
  //  refuses nothing, so a false positive costs a reader one line and a silent
  //  miss costs a live page four months. Do not add the exemption.
  const isoHits = [];
  for (const m of base.replace(AUTHORED, ' ').matchAll(ISO)) {
    //  End of that day, so a date is never called stale during its own day.
    if (new Date(`${m[1]}-${m[2]}-${m[3]}T23:59:59Z`) < now) {
      isoHits.push(base.slice(Math.max(0, m.index - 60), m.index + 25).replace(/\s+/g, ' '));
    }
  }

  const stripped = base
    //  Judged above. Belt and braces, and known to be so: mutating this line
    //  away leaves the suite green, because the span stripper below still eats
    //  "2026-05" as though it were a span. That is the very accident that hid
    //  the hub countdown, working in our favour this once. It is kept because
    //  narrowing that stripper to real school years is a reasonable refactor,
    //  and this is the line that would keep ISO dates out of the bare-year scan
    //  afterwards. Said out loud so nobody reads it as a tested guarantee.
    .replace(ISO, ' ')
    .replace(/\b20\d{2}\s*[-–]\s*(?:20\d{2}|\d{2})\b/g, ' ')
    .replace(/\b20\d{2}\s*(?:to|through)\s*20\d{2}\b/gi, ' ')
    //  Archive and historical labels keep their own year on purpose.
    .replace(/\b20\d{2}\s+(?:FRQ|National Score|Score Distribution|released|Released)/g, ' ')
    .replace(/(?:FRQ|frq)[^<]{0,12}\b20\d{2}\b/g, ' ')
    //  A "last updated" stamp is a timestamp, not a claim about an exam. It is
    //  SUPPOSED to name a date in the past, and a page edited today should say
    //  so. Narrow on purpose: it takes the year only when an updated-stamp word
    //  sits immediately before it, so an exam year elsewhere in the same line
    //  is still caught.
    .replace(/(?:Last\s+)?Updated\s+(?:[A-Z][a-z]+\s+)?20\d{2}/g, ' ');
  const hits = [...isoHits, ...spanHits];
  for (const m of stripped.matchAll(/\b(20\d{2})\b/g)) {
    if (Number(m[1]) < examYear) hits.push(stripped.slice(Math.max(0, m.index - 45), m.index + 25).replace(/\s+/g, ' '));
  }
  return hits;
}

function buildOne(spec, fromDir, examYear) {
  const problems = [];
  const before = loadBody(spec.handle, fromDir);

  let after = before;
  let applied = 0, already = 0;
  for (const e of spec.edits) {
    const n = before.split(e.find).length - 1;
    if (n === e.count) { after = after.split(e.find).join(e.replace); applied += e.count; continue; }

    //  ── AN EDIT THAT IS ALREADY LIVE IS NOT A FAILURE ────────────────────────
    //  The CSA score calculator was imported on 2026-09-17 carrying 13 of these,
    //  and the follow-up sheet had to add four more. Regenerating refused the
    //  whole page, because the 13 find-strings it had just fixed were gone. A
    //  spec that cannot be re-run after a partial import is a spec that gets
    //  edited by hand under pressure, which is how a body sheet goes wrong.
    //
    //  So: find absent AND replace present at the expected count means somebody
    //  already imported this edit. Skip it and say so. Anything else still
    //  refuses, because those are the two states that are actually ambiguous.
    //  The test has to be EXACT, and the first draft was not. It accepted
    //  `r >= e.count`, so an edit whose replacement happened to occur elsewhere
    //  in the body read as already applied and was skipped silently. The
    //  mutation run caught it with a one-character replacement: 'y' appears
    //  hundreds of times, so a find-string that was simply MISSING looked done.
    //  Requiring the replacement to appear exactly as often as the edit would
    //  have produced it, and to be long enough to be distinctive, closes that:
    //  any other count means something is off and the sheet refuses.
    //  The EXACT count is the whole test, and the length floor that used to sit
    //  beside it was both redundant and wrong. It was added as a proxy for
    //  "distinctive" after the mutation run broke the first draft, and it then
    //  refused a legitimately applied edit the very next day: the geq repair
    //  replaces with a single character, U+2265, so an 8-character floor made
    //  a finished page unbuildable.
    //
    //  Exact count already covers what the floor was reaching for. The mutation
    //  cases prove it: a replacement of 'y' occurs hundreds of times and '2027'
    //  dozens, so neither equals the one occurrence the edit would have made,
    //  and both are still refused. A short replacement is only accepted when it
    //  appears exactly as often as applying the edit would have produced it.
    const r = before.split(e.replace).length - 1;
    if (n === 0 && r === e.count) { already += e.count; continue; }

    problems.push(`${spec.handle}: expected ${e.count} of ${JSON.stringify(e.find.slice(0, 48))}, found ${n}`
      + (r ? ` (and ${r} of the replacement, which is neither absent nor a full match)` : '')
      + '. The live body has moved since the spec was written; re-read it before shipping.');
  }
  if (problems.length) return { problems };
  if (applied === 0) return { problems: [], noop: true, already, before, after: before, nbsp: 0, stale: [], edits: 0 };

  //  Refusal 2: reversing every replacement must give the original back.
  let reversed = after;
  for (const e of spec.edits) {
    if (before.split(e.find).length - 1 !== e.count) continue;   // skipped above
    reversed = reversed.split(e.replace).join(e.find);
  }
  if (reversed !== before) {
    problems.push(`${spec.handle}: the edit is not surgical. Reversing the replacements did not `
      + 'return the original body, so something outside the intended spans moved.');
    return { problems };
  }

  //  Refusal 3.
  const danger = dangerousEntities(after);
  if (danger.length) {
    problems.push(`${spec.handle}: ${danger.length} escaped angle bracket(s) would decode into a tag on save, `
      + `for example ${JSON.stringify(danger[0])}. Send &amp;lt; instead.`);
    return { problems };
  }

  //  Board #292 mitigation, applied last so the diff above stays honest.
  const nbsp = (after.match(/ /g) || []).length;
  const shipped = after.replace(/ /g, '&nbsp;');

  //  Refusal 4.
  const stale = staleYears(shipped, examYear);

  return { problems: [], before, after: shipped, nbsp, stale, already, edits: applied };
}

//  ── THE TITLE SHEET, WHICH IS A DIFFERENT AND SMALLER RISK ──────────────────
//  `Title` is forbidden in a body sheet because a wrong value there renames a
//  live page. It gets its own file, with no `Body HTML` beside it, so the two
//  can never go wrong together. The handle is not a column here at all beyond
//  addressing the row, so nothing in this sheet can move a page or break a link.
const TITLE_HEADER = ['Handle', 'Command', 'Title'];

function assertTitleHeaderIsSafe(header) {
  if (header.includes('Body HTML')) {
    throw new Error('refusing to write a title sheet that also carries Body HTML. '
      + 'Those are separate imports precisely so one cannot take the other down with it.');
  }
  if (!header.includes('Title')) throw new Error('a title sheet with no Title column changes nothing');
}

function buildTitles(fromDir) {
  const { pageBody } = fromDir ? { pageBody: null } : require('../lib/storefront-fetch');
  const rows = [], problems = [], already = [];
  for (const t of TITLES) {
    if (!t.to.trim()) { problems.push(`${t.handle}: empty title, which would blank the page name`); continue; }
    if (!pageBody) { rows.push(t); continue; }
    let live;
    try { live = pageBody(t.handle).title; }
    catch (e) { problems.push(`${t.handle}: could not read the live title: ${String(e.message).slice(0, 60)}`); continue; }
    if (live === t.to) { already.push(t.handle); continue; }
    if (live !== t.from) {
      problems.push(`${t.handle}: live title is ${JSON.stringify(live)}, which is neither the `
        + 'value this sheet expects to replace nor the one it writes. Somebody changed it; re-read before shipping.');
      continue;
    }
    rows.push(t);
  }
  return { rows, problems, already };
}

function main() {
  const outDir = process.argv[2];
  if (!outDir) { console.error('usage: node scripts/body-year-csv.js <out-dir> [--from <dir>]'); process.exit(2); }
  const fi = process.argv.indexOf('--from');
  const fromDir = fi > -1 ? process.argv[fi + 1] : null;

  const now = new Date();
  const examYear = now.getUTCMonth() > 4 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();

  assertHeaderIsSafe(HEADER);
  fs.mkdirSync(outDir, { recursive: true });

  const built = [];
  const allProblems = [];
  const noops = [];
  for (const spec of PAGES) {
    const r = buildOne(spec, fromDir, examYear);
    if (r.problems.length) { allProblems.push(...r.problems); continue; }
    if (r.noop) { noops.push(spec.handle); continue; }
    built.push({ spec, ...r });
  }
  if (allProblems.length) {
    console.error(`\nREFUSING TO WRITE. ${allProblems.length} problem(s):\n`);
    for (const p of allProblems) console.error(`  ${p}`);
    console.error('\nNothing was written.\n');
    process.exit(1);
  }

  console.log('\nBody rewrite sheets, one page per file\n');
  for (const b of built) {
    const csv = '﻿' + HEADER.map(cell).join(',') + '\r\n'
      + [b.spec.handle, 'MERGE', b.after].map(cell).join(',') + '\r\n';
    const file = path.join(outDir, `body-${b.spec.handle}.csv`);
    fs.writeFileSync(file, csv);
    console.log(`  ${b.spec.handle}`);
    console.log(`      ${String(b.edits).padStart(2)} replacements   ${b.before.length} -> ${b.after.length} chars`
      + (b.already ? `   (${b.already} already live, skipped)` : '')
      + (b.nbsp ? `   ${b.nbsp} nbsp sent as an entity` : ''));
    //  ISO hits are unshifted to the front by staleYears(), so a countdown
    //  target can never be buried under a list of archive years. Three are shown
    //  rather than one: on the hub the countdown happened to sort first, and
    //  "happened to" is not a property to rely on.
    if (b.stale.length) {
      console.log(`      NOTE ${b.stale.length} past year(s) remain, review (dates first):`);
      for (const h of b.stale.slice(0, 3)) console.log(`           ${h.trim().slice(0, 78)}`);
      if (b.stale.length > 3) console.log(`           ...and ${b.stale.length - 3} more`);
    }
    console.log(`      ${file}`);
  }
  for (const h of noops) console.log(`  ${h}\n      every edit is already live. No sheet written; there is nothing to import.`);
  //  The title sheet, written beside the body sheets but imported separately.
  assertTitleHeaderIsSafe(TITLE_HEADER);
  const t = buildTitles(fromDir);
  if (t.problems.length) {
    console.error('\nREFUSING TO WRITE THE TITLE SHEET:\n');
    for (const p of t.problems) console.error(`  ${p}`);
    process.exit(1);
  }
  if (t.rows.length) {
    const csv = '\ufeff' + TITLE_HEADER.map(cell).join(',') + '\r\n'
      + t.rows.map((r) => [r.handle, 'MERGE', r.to].map(cell).join(',')).join('\r\n') + '\r\n';
    const file = path.join(outDir, 'titles-page-year.csv');
    fs.writeFileSync(file, csv);
    console.log(`\n  page titles: ${t.rows.length} rows`
      + (t.already.length ? `, ${t.already.length} already correct and left out` : ''));
    for (const r of t.rows) console.log(`      ${r.handle}\n          ${JSON.stringify(r.from)}\n       -> ${JSON.stringify(r.to)}`);
    console.log(`      ${file}`);
  } else {
    console.log(`\n  page titles: nothing to do, all ${TITLES.length} are already correct.`);
  }

  console.log(`\n  ${built.length} body sheets. Command is MERGE, so a typo'd handle is a no-op rather than a new page.`);
  console.log('  Import ONE at a time and run the verifier between each.\n');
}

if (require.main === module) main();

module.exports = { buildOne, buildTitles, assertHeaderIsSafe, assertTitleHeaderIsSafe,
  dangerousEntities, staleYears, FORBIDDEN_COLUMNS, HEADER, TITLE_HEADER };
