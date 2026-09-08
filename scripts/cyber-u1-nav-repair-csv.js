'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  BUILD THE MATRIXIFY SHEET THAT REPAIRS THE UNIT 1 NAVIGATOR.
//
//  Reads the live bodies, repairs the ones that are wrong, proves each rewrite
//  against a re-parse, and writes one MERGE sheet. It imports nothing: every
//  Shopify page change in this repo ships as a sheet a human imports once.
//
//  ── THE TARGET TABLE IS NOT TYPED HERE ─────────────────────────────────────
//  25 (lesson, label) pairs plus 5 lesson hrefs have to come from somewhere,
//  and retyping a handle is exactly how the site ended up teaching 3.3 under
//  3.4's title. So the table is built from two sources that were authored
//  independently and must agree on every row before anything is written:
//
//    config/cyber-topics.json   the CED taxonomy, for the five lesson handles
//    the correct live pages     every (lesson, label) -> href they serve today
//
//  If those two ever disagree, this refuses and names the row. That is the
//  check that would have caught the swap when it landed.
//
//  Run:
//    node scripts/cyber-u1-nav-repair-csv.js            live, writes the sheet
//    node scripts/cyber-u1-nav-repair-csv.js --fixtures offline, from smoke/fixtures
//    node scripts/cyber-u1-nav-repair-csv.js --save-fixtures   refresh fixtures
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const nav = require('../lib/cyber-u1-nav.js');
const { roundTrip } = require('../tools/ap-cyber-ced/sheet-csv.js');

const ROOT = path.join(__dirname, '..');
const FIXDIR = path.join(ROOT, 'smoke', 'fixtures', 'live-bodies', 'cyber-u1-nav');
const OUTDIR = path.join(ROOT, 'imports', '2026-09-08');
const OUTCSV = path.join(OUTDIR, 'cyber-u1-nav-repair-pages.csv');
const HEADER = ['Handle', 'Command', 'Body HTML'];

const argv = process.argv.slice(2);
const OFFLINE = argv.includes('--fixtures');
const SAVE = argv.includes('--save-fixtures');

//  ---------------------------------------------------------------------------
//  The page set. Everything in Unit 1 that could carry a rail.
const topics = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'cyber-topics.json'), 'utf8'));
  return (raw.topics || raw).filter((t) => String(t.topic).startsWith('1.'));
})();

const PAGES = (() => {
  const p = ['ap-cyber-unit-1-exam', 'ap-cyber-unit-1-project', 'ap-cyber-unit-1-scenario-practice'];
  topics.forEach((t) => p.push(t.handles[0]));
  for (const n of nav.LESSONS) {
    p.push(`ap-cyber-unit-1-lesson-${n}-exercise-1`, `ap-cyber-unit-1-lesson-${n}-exercise-2`,
      `ap-cyber-unit-1-lesson-${n}-lab`, `ap-cyber-unit-1-lesson-${n}-quiz`);
  }
  return [...new Set(p)];
})();

function readBodies() {
  const out = {};
  if (OFFLINE) {
    for (const f of fs.readdirSync(FIXDIR)) {
      if (f.endsWith('.html')) out[f.replace(/\.html$/, '')] = fs.readFileSync(path.join(FIXDIR, f), 'utf8');
    }
    return out;
  }
  //  ── THE BYTES COME FROM THE JSON ROUTE, NOT THE RENDERED PAGE ───────────
  //  The first version of this read the rendered page through
  //  scripts/extract-live-body.js, and generating the sheet twice produced two
  //  different files. The diff was one attribute:
  //
  //    data-cfemail="3f535550515a4c7f4c5c57505053115a5b4a"   first run
  //    data-cfemail="325e585d5c57417241515a5d5d5e1c575647"   second run
  //
  //  Cloudflare obfuscates email addresses at render time and re-randomises
  //  the XOR key on every response, so the rendered body is never stable and,
  //  worse, is not the body Shopify stores. Importing it would make that
  //  rewrite PERMANENT and leave a dead [email protected] cipher span where a
  //  real address used to be. lib/storefront-fetch.js already records this
  //  happening to a quiz option on ap-cyber-unit-5-lesson-5.
  //
  //  /pages/<handle>.json never passes through Liquid, so there is no HTML for
  //  Cloudflare to rewrite and no wrapper div for an extractor to miscount.
  //  storefront-fetch names it the preferred source for any generator that
  //  writes a body back, and that is what this is.
  const sf = require('../lib/storefront-fetch.js');
  for (const h of PAGES) {
    try { out[h] = sf.pageBody(h).body_html; } catch (e) {
      console.log(`  skip ${h}: ${e.message.slice(0, 70)}`);
    }
  }
  return out;
}

//  ---------------------------------------------------------------------------
//  TABLE, from the two authorities, with the disagreement check in between.
function buildTable(bodies) {
  const fromCed = {};
  for (const t of topics) fromCed[`lesson${String(t.topic).split('.')[1]}`] = `/pages/${t.handles[0]}`;

  //  ── WHY THIS VOTES INSTEAD OF FILTERING ──────────────────────────────────
  //  The first version of this picked its witnesses by agreement with the CED
  //  taxonomy and then checked the survivors against that same taxonomy. A
  //  mutation test in smoke/cyber-u1-nav.js broke the taxonomy on purpose and
  //  the guard did not fire: every page had been excluded for disagreeing with
  //  the very thing it was supposed to be able to contradict, so the check
  //  reported "no live page supplies a target" instead. That is a hollow
  //  guard, and it was hollow in the exact direction that matters, because the
  //  taxonomy is the thing a session is most likely to get wrong.
  //
  //  So the live pages now vote, and the CED never touches who is eligible. A
  //  page is a witness if it is SELF-consistent: its Lesson step and its
  //  lesson tab point at the same page. The 10 swapped pages pass that test,
  //  which is the point, they are wrong but coherently wrong, so they get a
  //  vote and lose it 18 to 10. Only then is the majority compared with the
  //  CED, and the two are finally independent.
  const votes = {};
  const witnesses = [];
  for (const [h, body] of Object.entries(bodies)) {
    let parsed;
    try { parsed = nav.parse(body); } catch (e) { continue; }
    const selfConsistent = parsed.groups.every((g) => {
      const lesson = g.steps.find((s) => s.label === 'Lesson');
      return !lesson || !lesson.href || !g.lessonHref || lesson.href === g.lessonHref;
    });
    if (!selfConsistent) continue;
    witnesses.push(h);
    for (const g of parsed.groups) {
      if (g.lessonHref) {
        const lk = `lesson${g.n}`;
        votes[lk] = votes[lk] || {};
        votes[lk][g.lessonHref] = (votes[lk][g.lessonHref] || 0) + 1;
      }
      for (const s of g.steps) {
        if (s.tag !== 'a' || !s.href) continue;
        const k = `${g.n}|${s.label}`;
        votes[k] = votes[k] || {};
        votes[k][s.href] = (votes[k][s.href] || 0) + 1;
      }
    }
  }

  //  A row is decided only by a clear majority. A near-tie means the live site
  //  does not actually know the answer, and guessing it here is how a wrong
  //  handle gets laundered into 10 page bodies.
  const table = {};
  const dissent = [];
  const unclear = [];
  for (const [k, tally] of Object.entries(votes)) {
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const [top, topN] = ranked[0];
    const runnerN = ranked[1] ? ranked[1][1] : 0;
    if (topN <= runnerN || topN < (topN + runnerN) * 0.6) { unclear.push(`${k}: ${ranked.map(([v, n]) => `${v} x${n}`).join(' vs ')}`); continue; }
    table[k] = top;
    if (ranked.length > 1) dissent.push({ row: k, winner: top, votes: topN, others: ranked.slice(1).map(([v, n]) => `${v} x${n}`) });
  }
  if (unclear.length) throw new Error(`the live pages do not agree clearly enough on ${unclear.length} rows:\n  ${unclear.join('\n  ')}`);

  //  The two authorities, compared at last. The live majority and the CED
  //  taxonomy must name the same page for each of the five topics.
  const disagree = [];
  for (const n of nav.LESSONS) {
    const live = table[`lesson${n}`];
    const ced = fromCed[`lesson${n}`];
    if (live && ced && live !== ced) disagree.push(`topic 1.${n}: the live majority says ${live}, config/cyber-topics.json says ${ced}`);
    const step = table[`${n}|Lesson`];
    if (step && ced && step !== ced) disagree.push(`topic 1.${n}: the Lesson step majority says ${step}, config/cyber-topics.json says ${ced}`);
  }
  if (disagree.length) throw new Error(`the CED taxonomy and the live pages disagree:\n  ${disagree.join('\n  ')}`);

  const missing = [];
  for (const n of nav.LESSONS) {
    if (!table[`lesson${n}`]) missing.push(`lesson${n}`);
    for (const l of nav.LABELS) if (!table[`${n}|${l}`]) missing.push(`${n}|${l}`);
  }
  if (missing.length) throw new Error(`no live page supplies a target for: ${missing.join(', ')}`);

  return { table, witnesses, dissent };
}

//  ---------------------------------------------------------------------------
function main() {
  const bodies = readBodies();
  console.log(`\nread ${Object.keys(bodies).length} page bodies ${OFFLINE ? 'from fixtures' : 'live'}\n`);

  if (SAVE) {
    fs.mkdirSync(FIXDIR, { recursive: true });
    for (const [h, b] of Object.entries(bodies)) fs.writeFileSync(path.join(FIXDIR, `${h}.html`), b);
    console.log(`  saved ${Object.keys(bodies).length} fixtures to ${path.relative(ROOT, FIXDIR)}`);
  }

  const { table, witnesses } = buildTable(bodies);
  console.log(`  target table built from ${witnesses.length} self-consistent pages and the CED taxonomy, no conflicts`);
  for (const n of nav.LESSONS) console.log(`    1.${n}  ${table[`lesson${n}`]}`);

  const rows = [];
  const report = [];
  for (const h of Object.keys(bodies).sort()) {
    let parsed;
    try { parsed = nav.parse(bodies[h]); } catch (e) { continue; }
    const problems = nav.audit(parsed, table);
    if (!problems.length) { report.push({ h, ok: true }); continue; }

    const { out, changes } = nav.repair(bodies[h], table);
    const fails = nav.verify(bodies[h], out, table);
    if (fails.length) throw new Error(`the repair of ${h} does not verify:\n  ${fails.join('\n  ')}`);
    //  Ask again on the way out. pageBody() already refuses a rewritten body,
    //  but a sheet is the last place a bad byte is still cheap to stop, and a
    //  fixture captured through some other route would slip past that check.
    const cf = require('../lib/storefront-fetch.js').cloudflareRewritten(out);
    if (cf) throw new Error(`${h}: ${cf}`);
    rows.push({ Handle: h, Command: 'MERGE', 'Body HTML': out });
    report.push({ h, ok: false, problems: problems.length, changes, delta: out.length - bodies[h].length });
  }

  console.log('\n  pages needing repair:');
  for (const r of report.filter((x) => !x.ok)) {
    const k = {};
    r.changes.forEach((c) => { k[c.kind] = (k[c.kind] || 0) + 1; });
    console.log(`    ${r.h.padEnd(44)} ${String(r.problems).padStart(2)} problems  ${JSON.stringify(k)}  ${r.delta >= 0 ? '+' : ''}${r.delta} bytes`);
  }
  console.log(`\n  clean: ${report.filter((x) => x.ok).length}    repaired: ${rows.length}`);

  const totals = {};
  report.filter((x) => !x.ok).forEach((r) => r.changes.forEach((c) => { totals[c.kind] = (totals[c.kind] || 0) + 1; }));
  console.log(`  changes by kind: ${JSON.stringify(totals)}`);

  const rt = roundTrip(rows, HEADER);
  if (rt.drift.length) throw new Error(`the sheet does not survive a parse-back:\n  ${rt.drift.join('\n  ')}`);
  console.log('  parse-back: clean, every Body HTML byte identical after a write and read');

  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(OUTCSV, rt.csv);
  console.log(`\n  wrote ${path.relative(ROOT, OUTCSV)}  (${rows.length} rows, ${rt.csv.length} bytes)\n`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(`\n  REFUSED: ${e.message}\n`); process.exit(1); }
}
module.exports = { buildTable, PAGES, HEADER, OUTCSV, FIXDIR };
