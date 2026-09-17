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
const { PAGES } = require('../seed/body-year-rewrites');

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
function staleYears(body, examYear) {
  const stripped = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(?:href|src|id|class|action)\s*=\s*"[^"]*"/gi, ' ')
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
  const hits = [];
  for (const m of stripped.matchAll(/\b(20\d{2})\b/g)) {
    if (Number(m[1]) < examYear) hits.push(stripped.slice(Math.max(0, m.index - 45), m.index + 25).replace(/\s+/g, ' '));
  }
  return hits;
}

function buildOne(spec, fromDir, examYear) {
  const problems = [];
  const before = loadBody(spec.handle, fromDir);

  let after = before;
  for (const e of spec.edits) {
    const n = before.split(e.find).length - 1;
    if (n !== e.count) {
      problems.push(`${spec.handle}: expected ${e.count} of ${JSON.stringify(e.find.slice(0, 48))}, found ${n}. `
        + 'The live body has moved since the spec was written; re-read it before shipping.');
      continue;
    }
    after = after.split(e.find).join(e.replace);
  }
  if (problems.length) return { problems };

  //  Refusal 2: reversing every replacement must give the original back.
  let reversed = after;
  for (const e of spec.edits) reversed = reversed.split(e.replace).join(e.find);
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

  return { problems: [], before, after: shipped, nbsp, stale,
    edits: spec.edits.reduce((n, e) => n + e.count, 0) };
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
  for (const spec of PAGES) {
    const r = buildOne(spec, fromDir, examYear);
    if (r.problems.length) { allProblems.push(...r.problems); continue; }
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
      + (b.nbsp ? `   ${b.nbsp} nbsp sent as an entity` : ''));
    if (b.stale.length) console.log(`      NOTE ${b.stale.length} past year(s) remain, review: ${b.stale[0].slice(0, 60)}`);
    console.log(`      ${file}`);
  }
  console.log(`\n  ${built.length} sheets. Command is MERGE, so a typo'd handle is a no-op rather than a new page.`);
  console.log('  Import ONE at a time and run the verifier between each.\n');
}

if (require.main === module) main();

module.exports = { buildOne, assertHeaderIsSafe, dangerousEntities, staleYears, FORBIDDEN_COLUMNS, HEADER };
