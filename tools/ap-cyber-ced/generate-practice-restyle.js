'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RE-BODY THE FIVE CYBER PRACTICE SPOKES: styling, heading outline, and the
//  one sentence about the unit exam that was false.
//
//  ── WHY THIS IS A SEPARATE SCRIPT AND NOT A RERUN ──────────────────────────
//  generate-practice-sheet.js builds SEVEN rows: these five plus two that
//  EXTEND live pages (ap-cybersecurity-practice and ap-cybersecurity-topics)
//  from stored bodies. Those stored bodies are from 2026-09-04 and the umbrella
//  has gained a Question of the Day card since, which is exactly the trap
//  generate-practice-hub-repair.js was written about: a MERGE republishes the
//  whole Body HTML cell, so re-running the package would silently delete work
//  that landed after the fixtures were taken.
//
//  Nothing here needs those two rows. So this emits five, one per spoke, with
//  Body HTML and nothing else, and the two live hub pages are not in the sheet
//  at all. A row that is not in the file cannot be overwritten by it.
//
//  ── ONE SOURCE FOR THE BODY ────────────────────────────────────────────────
//  The body comes from spokeBody() in generate-practice-sheet.js, called rather
//  than copied. A second opinion about what a spoke looks like is the thing the
//  canonical-data convention exists to prevent, and the copy is always the one
//  that rots.
//
//  ── WHAT CHANGED ON THE PAGE, AND WHY EACH ONE IS NOT COSMETIC ─────────────
//  1. THE UNIT EXAM CARD SAID SOMETHING FALSE. It read "Unit exam" / "The full
//     unit test, once you have done the rest." The site's online unit exam is
//     not the instrument a teacher grades: docs/cyber-unit1-bundle-vs-online.md
//     and docs/cyber-unit-tests-availability.md compared all five against the
//     paper bundle item by item and found zero shared items. Re-measured
//     2026-09-06 against the five lesson quizzes in the server bank as well:
//     zero exact stems, highest token overlap 0.15. It is a different, softer
//     instrument that grades itself in the browser, and the card now says so.
//  2. THE TYPE SCALE WAS SILENTLY 62.5%. The theme sets html font-size to
//     62.5%, so every rem in the old body rendered at about ten pixels to the
//     rem. The lede asked for 1.05rem and got 10.5px while the paragraph below
//     it, having no font-size, inherited 16px, so the page's summary line was
//     smaller than its body text. All lengths are px now.
//  3. THE OUTLINE WAS UPSIDE DOWN. h1, then eight h3 cards, then the page's
//     only h2 at the very bottom.
//  4. THE ONLY STRUCTURED DATA ON THE PAGE SAID THE PARENT COURSE WAS AP CSA.
//     The theme emits one BreadcrumbList per page with AP Computer Science A
//     hardcoded as item 2. Every other cyber page answers it with a correct one
//     in the body; these five carried none.
//
//  ── THE GUARD THAT MATTERS ─────────────────────────────────────────────────
//  MERGE replaces the whole body, so the risk is not a bad style, it is a lost
//  link. Every anchor on the live page is compared against the new body and a
//  single dropped handle refuses the sheet. Measured before writing this: all
//  five come out link for link identical, 35/31/41/30/37.
//
//  Run: node tools/ap-cyber-ced/generate-practice-restyle.js \
//         --bodies <dir of live spoke bodies> [--out <file.csv>]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { roundTrip } = require('./sheet-csv');
const { spokeBody } = require('./generate-practice-sheet');
const spec = require('../../lib/cyber-practice-spec');
//  The prose rules are CALLED, not reimplemented. tools/ap-cyber-ced/validator.js
//  owns them and every one is mutation tested per rule; a second copy here would
//  be a second thing to keep correct, and the copy is always the one that rots.
//  An earlier cut of this file guessed at the two module APIs (findCodes,
//  findRuns) and guarded the calls with `&&`, so both checks passed by never
//  running. That is the hollow guard this repo has already found three times.
const base = require('./validator');

//  Body-only rows. Matrixify updates the columns present and leaves the rest
//  alone, so omitting Title and the SEO columns is how this promises not to
//  touch them. A Body HTML column on a row not receiving a body update is a
//  validator refusal elsewhere in this repo; the inverse is the same idea.
const HEADER = ['Handle', 'Command', 'Body HTML'];

const LINK = /href\s*=\s*["'](?:https?:\/\/[^/"']*apcsexamprep\.com)?\/pages\/([^"'#?]+)/gi;
const linksIn = (body) => new Set([...String(body || '').matchAll(LINK)].map((m) => m[1]));

//  Old handle to the handle it now redirects to. Read rather than written here,
//  so a second rename is a data row and not another edit to this rule.
const RENAMED_TO = Object.fromEntries(
  require('../../config/page-renames.json').renames.map((r) => [r.from, r.to]));

//  Every check that could refuse a row, in one place, so a caller cannot run
//  the generator and skip the guard. Each returns a list of reasons.
function checkRow(s, live, next) {
  const out = [];

  //  1. NO LINK MAY BE LOST. The whole point of a MERGE guard.
  //
  //  A RENAME IS NOT A DELETION, and this rule could not tell the difference
  //  until 2026-09-08. The terminal lab moved from Topic 1.2 to Topic 4.3 and its
  //  handle moved with it, through pageUpdate with redirectNewHandle, so Shopify
  //  holds a 301 and every inbound link still resolves. The live hub bodies still
  //  carry the old handle because their repoint sheet has not been imported yet.
  //  So the generator emitted the new handle, this rule compared link sets by
  //  string, and it refused a correct body for dropping a link that had in fact
  //  been repointed at the same page.
  //
  //  The forgiveness is deliberately narrow: an old handle is excused ONLY when
  //  the handle it was renamed to is present in the new body. Dropping the link
  //  outright still fails, which is what keeps config/page-renames.json a record
  //  of a fact rather than a list of exceptions.
  const before = linksIn(live);
  const after = linksIn(next);
  const lost = [...before].filter((h) => !after.has(h) && !(RENAMED_TO[h] && after.has(RENAMED_TO[h])));
  if (lost.length) {
    out.push(`${s.handle} would drop ${lost.length} link(s) the live page has: ${lost.join(', ')}`);
  }

  //  2. EVERY ASSET IN THE CANONICAL DATA IS STILL ON ITS OWN SPOKE.
  const declared = Object.values(s.assets).flat();
  const missing = declared.filter((h) => !after.has(h));
  if (missing.length) {
    out.push(`${s.handle} is missing ${missing.length} declared asset(s): ${missing.join(', ')}`);
  }

  //  3. THE EXAM CARD IS PRESENT AND MARKED. This is the point of the change,
  //     so it is asserted rather than assumed: the modifier class that colours
  //     it apart, and the sentence that says it is not the graded test.
  if (s.assets.exam && s.assets.exam.length) {
    //  The CLASS ATTRIBUTE on the card, not the string anywhere in the body.
    //  The first cut of this tested next.includes('grp--exam'), and the
    //  stylesheet at the top of every one of these bodies defines .grp--exam,
    //  so the check could not fail while the CSS was present. Mutation caught
    //  it: stripping the modifier off the div left the suite green.
    if (!/class="grp grp--exam"/.test(next)) {
      out.push(`${s.handle} lists a unit exam but does not mark the card apart`);
    }
    if (!/not the questions on the test your teacher grades/.test(next)) {
      out.push(`${s.handle} does not tell a student the exam is a different instrument`);
    }
  }

  //  4. THE PAGE ANSWERS THE THEME'S WRONG BREADCRUMB.
  if (!/"@type":\s*"BreadcrumbList"/.test(next)) {
    out.push(`${s.handle} carries no BreadcrumbList, so the theme's AP CSA one stands unopposed`);
  }
  if (/ap-csa-exam-prep/.test(next)) {
    out.push(`${s.handle} names the CSA course in its own breadcrumb`);
  }

  //  5. THE OUTLINE. One h1, and no heading level skipped under it.
  const levels = [...next.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
  const h1s = levels.filter((n) => n === 1).length;
  if (h1s !== 1) out.push(`${s.handle} has ${h1s} h1 elements in its body, expected exactly 1`);
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      out.push(`${s.handle} jumps from h${levels[i - 1]} to h${levels[i]}, which skips a level`);
      break;
    }
  }

  //  6. rem IS A TRAP ON THIS THEME. See the generator's own note: html is at
  //     62.5%, so a rem here is about ten pixels and the author almost never
  //     means that. Caught mechanically because it is invisible in review.
  const rems = [...next.matchAll(/[\d.]+rem/g)].map((m) => m[0]);
  if (rems.length) {
    out.push(`${s.handle} uses rem (${[...new Set(rems)].join(', ')}); this theme's root is 62.5%,`
      + ' so a rem is about 10px. Use px.');
  }

  //  7. THE HOUSE PROSE RULES, borrowed whole. EK codes in student-visible
  //     text, a fabricated per-unit exam weighting, an em-dash, and mojibake at
  //     either corruption depth. The whole body is ours here, so unlike the
  //     extension rows in the sibling generator there is no fence to respect.
  for (const kind of ['ruleEkCodes', 'ruleExamWeighting', 'ruleEmDash', 'ruleMojibake']) {
    for (const why of base[kind](next)) out.push(`${s.handle}: ${why}`);
  }

  return out;
}

function generate(opts = {}) {
  const dir = opts.bodies;
  const rows = [];
  const refusals = [];
  const notes = [];

  for (const s of spec.spokes()) {
    const file = path.join(dir, `${s.handle}.html`);
    if (!fs.existsSync(file)) {
      throw new Error(`no stored body for ${s.handle} at ${file}. A MERGE cannot be checked for`
        + ' link loss without the body it is replacing, so this refuses rather than guessing.');
    }
    const live = fs.readFileSync(file, 'utf8');
    if (!live.trim()) throw new Error(`stored body for ${s.handle} is empty`);

    const next = spokeBody(s);
    if (!next.trim()) throw new Error(`generated body for ${s.handle} is empty`);
    if (next === live) {
      notes.push(`${s.handle} is already the generated body, so its row would be a no-op`);
      continue;
    }

    refusals.push(...checkRow(s, live, next));
    rows.push({ Handle: s.handle, Command: 'MERGE', 'Body HTML': next });
    notes.push(`${s.handle}  ${Buffer.byteLength(live)} -> ${Buffer.byteLength(next)} bytes,`
      + ` ${linksIn(live).size} links kept`);
  }

  const sheet = roundTrip(rows, HEADER);
  return { rows, refusals, notes, csv: sheet.csv, drift: sheet.drift, bytes: sheet.bytes };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const bodies = arg('--bodies');
  const out = arg('--out');
  if (!bodies) {
    console.error('usage: generate-practice-restyle.js --bodies <dir> [--out <file.csv>]');
    process.exit(2);
  }

  const res = generate({ bodies });
  for (const n of res.notes) console.log(`  ${n}`);

  if (res.drift.length) {
    console.error('\nPARSE-BACK DRIFT. The sheet does not read back as what was written:');
    for (const d of res.drift) console.error(`  ${d}`);
    process.exit(1);
  }
  console.log(`\nparse-back: clean (${res.rows.length} rows, ${res.bytes} bytes)`);

  if (res.refusals.length) {
    console.error(`\nREFUSED (${res.refusals.length}):`);
    for (const r of res.refusals) console.error(`  ${r}`);
    process.exit(1);
  }
  console.log('checks: clean on all 8');

  if (out) {
    fs.writeFileSync(out, res.csv);
    console.log(`\nwrote ${out}`);
    console.log('Import in MERGE mode. Body HTML only, so Title and the SEO columns are untouched.');
  } else {
    console.log('\nno --out given, so nothing was written');
  }
}

if (require.main === module) main();
module.exports = { generate, checkRow, linksIn, HEADER };
