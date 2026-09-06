'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PUT THE PRACTICE HUB AT THE TOP OF THE COURSE.
//
//  ── WHAT IS WRONG ──────────────────────────────────────────────────────────
//  Measured on the served bodies, 2026-09-04, after the hub and spoke import:
//
//      ap-cybersecurity                        72 anchors   practice hub ABSENT
//      ap-cybersecurity-complete-course-guide 247 anchors   practice hub 247 of 247
//      ap-cybersecurity-topics                 52 anchors   practice hub  51 of 52
//
//  So a student landing on the course either cannot reach the practice layer at
//  all or has to scroll past the whole course to find it. Every one of those
//  links was placed by lib/link-block.js, which APPENDS: it is built to add a
//  related-links block at the end of a body, and it did its job. A link at the
//  top is a different insertion, which is why this is its own generator rather
//  than another call into that module.
//
//  ── WHY IT ADDS NO CSS ─────────────────────────────────────────────────────
//  Both pages scope themselves under a wrapper with `all: initial !important`,
//  so anything inserted inherits nothing and a plain anchor renders as unstyled
//  text. Rather than append to either page's stylesheet, each block is built
//  from classes THAT PAGE ALREADY DEFINES, with inline `!important` for the few
//  colours that differ. Inline important beats a stylesheet important, which is
//  the same idiom the pilot bar on the course guide already uses. Nothing in a
//  <style> block moves, so the diff is markup only.
//
//  ── THE COUNT IS DERIVED, NOT TYPED ────────────────────────────────────────
//  The copy says how many questions the practice exam has. That number lives in
//  config/cyber-exam-items.json and is read from it here, so the day the bank
//  changes this copy moves with it instead of quietly going stale on two live
//  pages. Earlier today a hand-typed count survived onto a rendered page through
//  a guard made of hand-written patterns; this is the cheap version of not
//  repeating that.
//
//  Run: node tools/ap-cyber-ced/generate-course-practice-cta.js \
//         --bodies smoke/fixtures/live-bodies [--out-dir imports/2026-09-04e]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const { roundTrip } = require('./sheet-csv');
const bank = require('../../config/cyber-exam-items.json');
const spec = require('../../lib/cyber-practice-spec');

const HEADER = ['Handle', 'Command', 'Body HTML'];
const HUB = spec.umbrella().handle;
const EXAM = 'ap-cybersecurity-practice-exam';
const MCQ = bank.items.length;

//  The marker every inserted block carries, so a second run is a detectable
//  no-op rather than a second copy of the band.
const MARK = '<!-- apcs-course-practice-cta -->';

//  A link inside the first few body anchors is above the fold on a laptop; one
//  at 52 of 52 is not, and that distinction is the whole change on this page.
const TOP_ANCHORS = 4;

const CARD = 'color:#6B21A8!important;-webkit-text-fill-color:#6B21A8!important;'
  + 'font-weight:700!important;text-decoration:none!important;';

// ─────────────────────────────────────────────────────────────────────────────
//  One entry per page. `before` must appear EXACTLY ONCE in the live body: a
//  marker that matches twice means the page moved under us and the insertion
//  point can no longer be trusted, so it throws rather than guessing.
// ─────────────────────────────────────────────────────────────────────────────
const PAGES = [
  {
    handle: 'ap-cybersecurity',
    //  Immediately after the hero, above the orientation grid. The hero already
    //  carries a Start Here button for a first-timer, so practice first is not
    //  displacing the newcomer path, it is serving the returning student who is
    //  most of the traffic after week one.
    before: '  <!-- START HERE -->',
    //  ch-sec-title, ch-sec-note, ch-startgrid and ch-startcard are this page's
    //  own classes, used verbatim so the band inherits its styling for free.
    block: () => `  ${MARK}
  <span class="ch-sec-title ch-block">Practice as you go</span>
  <span class="ch-sec-note ch-block">You do not have to finish the course first.</span>
  <div class="ch-startgrid ch-block">
    <a class="ch-startcard" href="/pages/${HUB}"><b>Practice Hub</b><span>Every quiz, lab and unit exam in one place</span></a>
    <a class="ch-startcard" href="/pages/${EXAM}"><b>Full Practice Exam</b><span>${MCQ} multiple choice plus a Device Security Analysis</span></a>
  </div>

`,
  },
  {
    handle: 'ap-cybersecurity-complete-course-guide',
    //  Directly under the hero and the all-units-live bar, above the teacher
    //  band. This is a student-facing page, so the student path comes first.
    before: '  <!-- ======= TEACHER BAND',
    //  pilot-bar is this page's own announcement class. The colours are inline
    //  because the green one beside it overrides the same way.
    block: () => `  ${MARK}
  <div class="pilot-bar" style="background:#FAF5FF!important;border-top:3px solid #6B21A8!important;border-bottom:1px solid #E9D5FF!important;color:#4C1D95!important;">
    <strong style="color:#6B21A8!important;">Practice as you go:</strong> you do not have to finish the course first. Every quiz, lab and unit exam is in one place, and the full practice exam is ${MCQ} multiple choice questions plus a Device Security Analysis.
    <a href="/pages/${HUB}" style="${CARD}">Practice Hub</a> &nbsp;<a href="/pages/${EXAM}" style="${CARD}">Full Practice Exam</a>
  </div>

`,
  },
  {
    //  ── THE CONCEPT LAYER, WHICH NEEDS EDITS RATHER THAN A BAND ────────────
    //  This page already has a quick-nav pill row directly under its hero, so a
    //  band beneath it would be a second navigation strip saying the same thing.
    //  The pill row is the right surface and it needs two changes, neither of
    //  which is an insertion of a block:
    //
    //    the practice hub was linked at anchor 52 of 52, the very bottom, by
    //    lib/link-block.js, and appears nowhere near the top
    //
    //    the row's one practice pill reads "Practice" and points at
    //    ap-cybersecurity-practice-questions, which serves FIFTEEN questions,
    //    measured 2026-09-06: 15 data-qid cards, 60 options, and the page says
    //    "15 question" itself. So the single practice link a reader sees at the
    //    top of the concept index goes to the smallest practice surface on the
    //    site while the hub sits at the bottom.
    //
    //  Neither new label states a count. "15-Question Sampler" would be true
    //  today and is exactly the kind of hardcoded number that put "40 MCQ +
    //  3 FRQ" on a live page for two days, so the label describes the shape and
    //  lets the page it links to state its own size.
    handle: 'ap-cybersecurity-topics',
    edits: [
      [
        '<a class="solid" href="/pages/ap-cybersecurity-complete-course-guide">Course Hub</a>',
        '<a class="solid" href="/pages/ap-cybersecurity-complete-course-guide">Course Hub</a>\n'
        + `      <a class="solid" href="/pages/${HUB}">Practice Hub</a>`,
      ],
      [
        '<a href="/pages/ap-cybersecurity-practice-questions">Practice</a>',
        '<a href="/pages/ap-cybersecurity-practice-questions">Quick Sampler</a>',
      ],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
//  EDITS MODE, for a page whose right surface is one it already has.
//
//  The band model above inserts a block before a unique anchor. That is wrong
//  for a page that already carries a navigation row: the fix belongs IN the row,
//  not in a second strip under it. So a page may instead declare `edits`, a list
//  of [from, to] pairs.
//
//  The invariant is the counterpart of the exact-split assertion: every `from`
//  must match EXACTLY ONCE, and undoing every substitution must reproduce the
//  live body character for character. A stray change anywhere else fails that
//  reversal, which is what makes this as tight as the insertion path rather than
//  a looser cousin of it.
// ─────────────────────────────────────────────────────────────────────────────
function buildEdited(page, live) {
  const missed = [];
  for (const [from] of page.edits) {
    const n = live.split(from).length - 1;
    if (n !== 1) missed.push(`matched ${n} times, expected 1: ${JSON.stringify(from.slice(0, 70))}`);
  }
  if (missed.length) {
    throw new Error(`${page.handle}: ${missed.length} of ${page.edits.length} edits do not match `
      + `the live body:\n  ${missed.join('\n  ')}`);
  }

  let body = live;
  for (const [from, to] of page.edits) body = body.replace(from, to);
  if (body === live) throw new Error(`${page.handle}: the edits changed nothing, so this is a no-op`);

  //  Reverse every substitution. Anything the edits did NOT declare survives the
  //  reversal as a difference, and this throws.
  let back = body;
  for (const [from, to] of page.edits) back = back.replace(to, from);
  if (back !== live) {
    throw new Error(`${page.handle}: undoing the declared edits does not reproduce the live body, `
      + 'so something else changed');
  }

  //  Same structural floor as the band path.
  const bal = (s) => (s.match(/<div\b/gi) || []).length - (s.match(/<\/div>/gi) || []).length;
  if (bal(body) !== bal(live)) {
    throw new Error(`${page.handle}: div balance changed, ${bal(live)} in and ${bal(body)} out`);
  }
  for (const tag of ['<style', '<script']) {
    const c = (s) => (s.split(tag).length - 1);
    if (c(body) !== c(live)) throw new Error(`${page.handle}: the ${tag}> count changed`);
  }
  //  ORDINAL, NOT EXISTENTIAL, and the first draft of this line got it wrong for
  //  the third time in one session. It asserted that the result LINKS the
  //  practice hub, which was already true of this page from anchor 52 of 52, so
  //  the mutation written to break it could not go red. The whole point of the
  //  edit is WHERE the link is, so that is what gets asserted.
  const at = (s) => [...s.matchAll(/href="[^"]*\/pages\/([^"'#?]+)/g)]
    .map((m) => m[1]).indexOf(HUB);
  const after = at(body);
  if (after < 0 || after >= TOP_ANCHORS) {
    throw new Error(`${page.handle}: the practice hub is at anchor `
      + `${after < 0 ? 'nowhere' : after + 1} after the edits, not inside the first ${TOP_ANCHORS}`);
  }
  return body;
}

function buildBody(page, live) {
  if (typeof live !== 'string' || !live.trim()) {
    throw new Error(`${page.handle}: the stored body is empty. An empty Body HTML cell erases the live page.`);
  }
  if (page.edits) return buildEdited(page, live);

  if (live.includes(MARK)) {
    throw new Error(`${page.handle} already carries the practice band, so this would be a second copy`);
  }
  const n = live.split(page.before).length - 1;
  if (n !== 1) {
    throw new Error(`${page.handle}: the insertion point matched ${n} times, expected 1: `
      + `${JSON.stringify(page.before)}`);
  }

  const block = page.block();
  const body = live.replace(page.before, block + page.before);

  //  NOTHING MAY BE LOST, and this is the whole of that check.
  //
  //  The first draft also carried a list of per-page markers that had to survive,
  //  copied from the hub repair generator where lib/link-block.js really can
  //  restructure a body. Here it was dead code: buildBody is a pure insertion, so
  //  it cannot remove anything, and deleting the marker check changed no test
  //  outcome. A guard that cannot fire reads as protection and provides none,
  //  which is the same failure as the stale-count pattern list, so it is gone
  //  rather than kept for the look of it.
  //
  //  What survives is stronger anyway: the result must be the live body cut in
  //  two with the block between. A stray replace anywhere else fails here, and
  //  a future edit to this function that starts removing things fails here too.
  const at = live.indexOf(page.before);
  if (body !== live.slice(0, at) + block + live.slice(at)) {
    throw new Error(`${page.handle}: the result is not the live body with one block inserted`);
  }

  //  Structure. Two anchors go on, div tags balance, and no <style> or <script>
  //  is touched, which is what keeps this a markup-only change.
  const anchors = (s) => (s.match(/<a\b/gi) || []).length;
  if (anchors(body) - anchors(live) !== 2) {
    throw new Error(`${page.handle}: anchor count moved by ${anchors(body) - anchors(live)}, expected 2`);
  }
  const bal = (s) => (s.match(/<div\b/gi) || []).length - (s.match(/<\/div>/gi) || []).length;
  if (bal(body) !== bal(live)) {
    throw new Error(`${page.handle}: div balance changed, ${bal(live)} in and ${bal(body)} out`);
  }
  for (const tag of ['<style', '<script']) {
    const c = (s) => (s.split(tag).length - 1);
    if (c(body) !== c(live)) throw new Error(`${page.handle}: the ${tag}> count changed`);
  }
  if (!body.includes(`/pages/${HUB}`) || !body.includes(`/pages/${EXAM}`)) {
    throw new Error(`${page.handle}: the block does not link both practice pages`);
  }
  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
//  `handles` selects which pages go in the sheet, and it exists for a reason
//  that cost this project a scare on board 238.
//
//  The two course-page fixtures are PRE-IMPORT snapshots. Regenerating from them
//  reproduces the rows that already landed on 2026-09-04, and shipping those
//  again in a new sheet would republish a body captured before the import, so
//  anything either page has gained since would be silently reverted. A MERGE
//  writes the whole Body HTML and does not care that the bytes are two days old.
//
//  So the offline suite builds every page, because the fixtures are a consistent
//  set and the assertions about them are a record of what the change did, and a
//  SHEET is only ever emitted for the handles this pass is actually changing.
// ─────────────────────────────────────────────────────────────────────────────
function generate(opts = {}) {
  const rows = [];
  const built = [];
  const wanted = opts.handles ? new Set(opts.handles) : null;
  for (const page of PAGES) {
    if (wanted && !wanted.has(page.handle)) continue;
    const file = path.join(opts.bodies, `${page.handle}.html`);
    if (!fs.existsSync(file)) {
      throw new Error(`no stored body at ${file}. Fetch it before generating:`
        + ' an empty Body HTML cell would erase the live page.');
    }
    const live = fs.readFileSync(file, 'utf8');
    const body = buildBody(page, live);
    rows.push({ Handle: page.handle, Command: 'MERGE', 'Body HTML': body });
    built.push({ handle: page.handle, live, body });
  }

  //  Parse the sheet back and diff. Generation is not evidence that generation
  //  worked: the CSP sheet lost 90 bytes a page while every semantic check
  //  passed, and a parse-back diff is what caught it.
  const { csv, drift } = roundTrip(rows, HEADER);
  if (drift.length) throw new Error(`parse-back drift: ${drift.join('; ')}`);

  return { csv, rows, built, header: HEADER };
}

module.exports = { generate, buildBody, PAGES, HEADER, MARK, HUB, EXAM, MCQ };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
  const bodies = arg('--bodies') || 'smoke/fixtures/live-bodies';
  const outDir = arg('--out-dir');
  const only = arg('--handles');
  const outName = arg('--out-name') || 'cyber-course-practice-cta-pages.csv';
  const r = generate({ bodies, handles: only ? only.split(',') : null });
  for (const b of r.built) {
    const grew = Buffer.byteLength(b.body) - Buffer.byteLength(b.live);
    console.log(`${b.handle.padEnd(38)} ${Buffer.byteLength(b.live)} -> ${Buffer.byteLength(b.body)} bytes (+${grew})`);
  }
  console.log(`practice exam stated at ${MCQ} MCQ, read from the item bank`);
  console.log('parse-back: clean');
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, outName);
    fs.writeFileSync(out, r.csv);
    console.log(`wrote ${out} (${Buffer.byteLength(r.csv)} bytes, ${r.rows.length} rows)`);
  } else {
    console.log('(no --out-dir, nothing written)');
  }
}
