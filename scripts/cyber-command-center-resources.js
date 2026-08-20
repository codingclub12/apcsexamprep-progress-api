'use strict';
// -----------------------------------------------------------------------------
//  THE CYBER COMMAND CENTER: publish the course-level premium documents.
//
//  ── WHAT IS WRONG TODAY ─────────────────────────────────────────────────────
//  Every teaching material on /pages/cyber-command-center is per lesson. Each
//  lesson carries a deck, guided notes, a quiz, supplements and a teacher guide,
//  and the UNITS array deep-links all five. What has no home anywhere on the
//  page is the set of documents that describe the COURSE rather than a lesson:
//  the two pacing guides, the capstone rubric, and the two orientation docs.
//  They exist, they are finished, they are shared, and a teacher who bought the
//  bundle has no way to reach them from the hub. The page shows a "Pacing"
//  stat tile reading "155 days" and then offers nothing to click.
//
//  ── WHAT THIS ADDS ──────────────────────────────────────────────────────────
//  One "Course resources" card between the stat blocks and the unit accordions,
//  holding five Drive links. Same visual language as a lesson's materials row,
//  because it is the same kind of thing: labels, an icon, an arrow, and the
//  locked treatment when the teacher is not entitled.
//
//  ── GATING ──────────────────────────────────────────────────────────────────
//  Premium, all five. Not `STATE.entitled || unitFree(u)` the way a lesson is,
//  because these documents span the whole year rather than Unit 1, and Unit 1
//  being a free preview is not a reason to hand out the full-year pacing guide.
//  An unentitled teacher sees the labels greyed out with a PREMIUM tag, which is
//  the same funnel signal a locked unit already gives.
//
//  Worth saying plainly: this is presentation gating, not access control. A
//  Drive file shared "anyone with the link" is reachable by anyone holding the
//  link, and all 25 lesson materials already on this page work exactly that way.
//  This change publishes five more such links into public HTML. That is the same
//  exposure shape routes/files.js was built to close on csp-command-center. It
//  is consistent with how the Cyber hub already works and it is not a fix for
//  it. Closing it here means moving Cyber onto the file-gate pattern, which is
//  a different and larger change than this one.
//
//  ── HOW IT EDITS ────────────────────────────────────────────────────────────
//  Surgically, the same way scripts/csp-command-center-links.js does. Four
//  anchored insertions into a 59 KB body, each asserted to happen exactly once.
//  Nothing else in the body moves by a byte.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a body that is not the Cyber Command Center
//    - a body that does not match the snapshot on disk
//    - any anchor that is absent, or present more than once
//    - a resource list that is not five entries with distinct Drive ids
//    - an output that is not larger than the input
//    - anything non-ASCII in what it writes
//
//  Run: node scripts/cyber-command-center-resources.js <live-body.html> <out.csv>
//  Get the live body from the Shopify Admin API, or via
//  scripts/extract-live-body.js against the rendered page. Snapshot first.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const HANDLE = 'cyber-command-center';
const PUBLISHED_AT = '2026-03-01 12:00:00';

const REQUIRED = ['var CFG = {', 'COURSE: "ap-cybersecurity"', 'var UNITS = [', 'function renderBlocks()'];

const SNAP = path.join(__dirname, '..', 'shopify', 'page-snapshots',
  HANDLE + '.before-course-resources.html');

// The five course-level documents, in the order a teacher meets them: orient,
// plan the year, then the one rubric that is not owned by a single lesson.
// Ids are Drive file ids; every one of these is shared "anyone with the link"
// as of 2026-08-20, which is what makes the button work for a teacher who is
// not in the owner's Drive. Icons are HTML entities rather than literal emoji
// so everything this script writes stays ASCII.
const RESOURCES = [
  { id: '1AS8EqcG-U24AJtWUVqJpspxtKhZKr0EI', ico: '&#127919;', label: 'Start Here' },
  { id: '1m7Wi6aR17eBpkmdl0oc6SQtXXXVUg9r0', ico: '&#128214;', label: 'How To Use This Course' },
  { id: '1ycmbdAITUjU1GccuJzmn-vmybBVclUeS', ico: '&#128197;', label: 'Pacing Guide: Full Year' },
  { id: '1qR_b07ZDEGn8hVCOTDo8_Qx2QVQlhmg7', ico: '&#128197;', label: 'Pacing Guide: Block &amp; Semester' },
  { id: '1nCqSjlhCgFv-UR3WJqK3Xe9MPvyjFe3j', ico: '&#128221;', label: 'Threat Defense Report Rubric' },
];

// ── The four anchors. Each must appear exactly once in the live body. ─────────

const A_SLOT = '    <div class="blocks" id="actc-blocks"></div>\n';
const A_SLOT_NEW = A_SLOT + '    <div id="actc-res"></div>\n';

const A_BLOCKS = '  /* ---------- summary stat blocks (always shown: overview + funnel) ---------- */';

const A_PAINT = '  function paint(){ renderWho(); renderBanner(); renderBlocks(); renderProgress(); renderUnits(); }';
const A_PAINT_NEW = '  function paint(){ renderWho(); renderBanner(); renderBlocks(); renderResources(); renderProgress(); renderUnits(); }';

function resourceJS() {
  const rows = RESOURCES.map(
    (r) => `    { ico:"${r.ico}", label:"${r.label}", href:F+"${r.id}/view" },`
  ).join('\n');
  return `  /* ---------- course-level resources (Drive) ----------
     The documents that describe the course rather than a lesson. Per-lesson
     materials live on UNITS; these do not belong to any one unit, so they get
     their own card above the accordions.

     Premium, all five, including on the free Unit 1 preview: these cover the
     whole year, and Unit 1 being free is not a reason to hand out the full-year
     pacing guide. Locked renders exactly like a locked lesson material. */
  var F = "https://drive.google.com/file/d/";
  var RESOURCES = [
${rows}
  ];

  function renderResources(){
    var unlocked = STATE.entitled;
    var items = RESOURCES.map(function(r){
      if(!unlocked){
        return '<span class="mat disabled"><span class="m-ico">'+r.ico+'</span>'+r.label+'</span>';
      }
      return '<a class="mat" href="'+esc(r.href)+'" target="_blank" rel="noopener"><span class="m-ico">'+r.ico+'</span>'+r.label+' '+ARROW+'</a>';
    }).join("");
    el("actc-res").innerHTML =
      '<div class="block" style="margin-bottom:20px;">'
      + '<div class="mats-lbl" style="margin-top:0;">Course resources'
      + (unlocked ? '' : ' <span class="tag locked">&#128274; PREMIUM</span>')
      + '</div><div class="mats">'+items+'</div></div>';
  }

`;
}

// One replacement, asserted to be the only one. A silently-missed anchor would
// ship a page whose renderResources is never called, which looks like nothing
// happened rather than like a failure.
function once(body, anchor, replacement, what, problems) {
  let n = 0;
  let i = body.indexOf(anchor);
  while (i > -1) { n++; i = body.indexOf(anchor, i + anchor.length); }
  if (n !== 1) {
    problems.push(`the ${what} anchor appears ${n} times, expected exactly 1`);
    return body;
  }
  return body.replace(anchor, replacement);
}

function build(inBody) {
  for (const marker of REQUIRED) {
    if (inBody.indexOf(marker) === -1) {
      throw new Error(`this body is missing ${JSON.stringify(marker)}, so it is not the Cyber Command Center`);
    }
  }
  if (!fs.existsSync(SNAP)) {
    throw new Error('no snapshot at ' + path.relative(process.cwd(), SNAP) + ', so there is no rollback path');
  }
  if (fs.readFileSync(SNAP, 'utf8') !== inBody) {
    throw new Error('this body differs from the snapshot on disk, so the page moved since it was taken');
  }

  const problems = [];

  const ids = RESOURCES.map((r) => r.id);
  if (ids.length !== 5) problems.push(`${ids.length} resources, expected 5`);
  if (new Set(ids).size !== ids.length) problems.push('two resources point at the same Drive file');
  if (ids.some((id) => !/^[A-Za-z0-9_-]{20,}$/.test(id))) problems.push('a resource id is not a Drive file id');

  let body = inBody;
  body = once(body, A_SLOT, A_SLOT_NEW, 'render slot', problems);
  body = once(body, A_BLOCKS, resourceJS() + A_BLOCKS, 'resource data', problems);
  body = once(body, A_PAINT, A_PAINT_NEW, 'paint', problems);

  if (Buffer.byteLength(body) <= Buffer.byteLength(inBody)) {
    problems.push('the output is not larger than the input, so nothing was inserted');
  }
  // Every link that was on the page has to still be on the page.
  const drive = (s) => new Set(s.match(/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+/g) || []);
  const lost = [...drive(inBody)].filter((l) => !drive(body).has(l));
  if (lost.length) problems.push(`${lost.length} existing Drive link(s) disappeared`);
  // The new links are assembled at runtime from F + id, so they are counted by
  // id rather than by full URL. Each must be new to the page and appear once.
  const added = ids.filter((id) => inBody.indexOf(id) === -1);
  if (added.length !== ids.length) problems.push(`${ids.length - added.length} resource(s) are already linked on this page`);
  const twice = ids.filter((id) => body.split(id).length - 1 !== 1);
  if (twice.length) problems.push(`${twice.length} resource id(s) appear more than once in the output`);

  // House rule: everything this script writes is ASCII.
  const written = resourceJS() + A_PAINT_NEW + A_SLOT_NEW;
  // eslint-disable-next-line no-control-regex
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(written)) problems.push('the generated markup contains non-ASCII characters');

  return { body, problems };
}

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/cyber-command-center-resources.js <live-body.html> <out.csv>');
    process.exit(2);
  }
  const inBody = fs.readFileSync(src, 'utf8');
  let res;
  try { res = build(inBody); }
  catch (e) { console.error('\n  Refused: ' + e.message + '\n'); process.exit(1); }

  if (res.problems.length) {
    console.error(`\n  ${res.problems.length} problem(s). No file written:\n`);
    res.problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', res.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  console.log(`\n    published ${RESOURCES.length} course resources`);
  RESOURCES.forEach((r) => console.log('      ' + r.label));
  console.log(`\n    body ${(Buffer.byteLength(inBody) / 1024).toFixed(0)} KB in, ${(Buffer.byteLength(res.body) / 1024).toFixed(0)} KB out`);
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live page first.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, RESOURCES, HANDLE };
