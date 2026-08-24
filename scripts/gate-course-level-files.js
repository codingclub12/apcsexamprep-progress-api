'use strict';
// -----------------------------------------------------------------------------
//  Gate the seven course-level teacher files the first pass missed.
//
//  ── WHY THERE WAS A SECOND PASS ─────────────────────────────────────────────
//  build-file-manifest.js used to collect files by looking for keys NAMED
//  `teacherFiles`. Seven paid teacher files do not live under that key: they sit
//  in `courseResources` (a bare [{href,label}] list) and are re-referenced by
//  `projects` ([{name,days,when,href}]). START HERE, both pacing guides, the
//  Create Performance Task Pack, the Big Idea 2 Data Project and the Innovation
//  Investigations. All published, all anonymously downloadable, on both pages.
//
//  The manifest now collects by SHAPE (any Shopify file href not inside
//  studentFiles), so it carries 446 entries instead of 439. This script closes
//  the same seven on the two live pages.
//
//  ── WHY NOT RE-RUN THE ORIGINAL SCRIPTS ─────────────────────────────────────
//  Both first-pass scripts assert a PRE-gate body: csp-command-center-gate-files
//  patches fileBtn (already patched live) and csp-teacher-resources-gate appends
//  the click handler and asserts exactly one script block and exactly 222 answer
//  keys on the page (already zero). Re-running either against a gated body is
//  refused, correctly. This is the incremental pass: it swaps whatever teacher
//  URLs REMAIN and leaves the already-gated ids alone.
//
//  ── WHAT IT CHANGES ─────────────────────────────────────────────────────────
//  csp-command-center: the seven hrefs inside DATA become `api:<id>`, and the
//  two renderers that print them are routed through a `fileAttrs` helper. Those
//  two renderers never went through fileBtn, which is why they still emitted raw
//  URLs after the first pass. The courseResources renderer had no entitlement
//  check at all, so a signed-out visitor got working download links.
//
//  ap-csp-teacher-resources: the seven <a href> become href="#" data-file="<id>".
//  The delegated listener that first pass appended already matches them.
//
//  Membership of the manifest is the only test for "teacher file", same as the
//  first pass. Student handouts are not in the manifest and are untouched.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a body that is not the page named
//    - a body with no matching snapshot on disk
//    - fewer swaps than the page has teacher URLs
//    - any student file URL going missing
//    - any manifest file URL surviving in the output
//    - DATA that stops parsing (Command Center only)
//    - a Command Center renderer that was not patched
//
//  Run: node scripts/gate-course-level-files.js <handle> <live-body.html> <out.csv>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { parseData } = require('./build-file-manifest');
const MANIFEST = require('../seed/csp-teacher-files.json');

const BY_PATH = new Map(Object.entries(MANIFEST).map(([id, f]) => [f.path, id]));
const SNAP_DIR = path.join(__dirname, '..', 'shopify', 'page-snapshots');
const SNAP_SUFFIX = '.before-course-level-gate.html';
const PUBLISHED_AT = '2026-03-01 12:00:00';

// One helper, two call sites. An api: href becomes a data-file button that the
// listener already on the page resolves against the teacher's entitlement.
const FILEATTRS = `  function fileAttrs(href){
    if(String(href).indexOf('api:') === 0){ return 'href="#" data-file="'+esc(String(href).slice(4))+'"'; }
    return 'href="'+esc(href)+'" target="_blank" rel="noopener"';
  }
`;

// Both of these printed a raw CDN URL. Neither went through fileBtn.
const PATCHES = [
  {
    what: 'courseResources renderer',
    from: `    var btns=items.map(function(f){ return '<a class="mat" href="'+esc(f.href)+'" target="_blank" rel="noopener">'+esc(f.label)+' '+ARROW+'</a>'; }).join("");`,
    to: `    var btns=items.map(function(f){ return '<a class="mat" '+fileAttrs(f.href)+'>'+esc(f.label)+' '+ARROW+'</a>'; }).join("");`,
  },
  {
    what: 'projects renderer',
    from: `      var link = (STATE.entitled) ? '  <a href="'+esc(p.href)+'" target="_blank" rel="noopener">open pack '+ARROW+'</a>' : '';`,
    to: `      var link = (STATE.entitled) ? '  <a '+fileAttrs(p.href)+'>open pack '+ARROW+'</a>' : '';`,
  },
];

const PAGES = {
  'csp-command-center': {
    title: 'CSP Command Center',
    required: ['var DATA = {', '"bigIdeas"', 'function fileBtn(', 'a[data-file]'],
    rewrite(body) {
      let out = body;
      let swapped = 0;
      // Longest first so one path that is a prefix of another cannot be half
      // replaced. Only the exact quoted href is targeted, never a substring.
      for (const href of teacherUrls(body)) {
        const needle = '"href":"' + href + '"';
        const parts = out.split(needle);
        if (parts.length < 2) continue;
        swapped += parts.length - 1;
        out = parts.join('"href":"api:' + BY_PATH.get(href) + '"');
      }
      const problems = [];
      // fileAttrs goes in immediately before fileBtn, which is a function
      // declaration in the same scope, so ordering does not matter to the
      // parser and it reads next to the thing it is a sibling of.
      const anchor = '  function fileBtn(';
      if (out.indexOf(anchor) < 0) problems.push('fileBtn is missing, so there is nowhere to put fileAttrs');
      else out = out.replace(anchor, FILEATTRS + anchor);
      for (const p of PATCHES) {
        if (!out.includes(p.from)) { problems.push(`the ${p.what} does not match the expected source`); continue; }
        out = out.replace(p.from, p.to);
      }
      try { parseData(out); } catch (e) { problems.push('DATA no longer parses: ' + e.message); }
      if (!out.includes('function fileAttrs(')) problems.push('fileAttrs was not inserted');
      return { body: out, swapped, problems };
    },
  },
  'ap-csp-teacher-resources': {
    title: 'AP CSP Teacher Resources (Premium)',
    required: ['/cdn/shop/files/', 'a[data-file]'],
    rewrite(body) {
      let out = body;
      let swapped = 0;
      for (const href of teacherUrls(body)) {
        const needle = 'href="' + href + '"';
        const parts = out.split(needle);
        if (parts.length < 2) continue;
        swapped += parts.length - 1;
        out = parts.join('href="#" data-file="' + BY_PATH.get(href) + '"');
      }
      return { body: out, swapped, problems: [] };
    },
  },
};

// Every Shopify file URL on the page that the manifest calls a teacher file.
// Longest first, for the prefix reason above.
function teacherUrls(body) {
  const all = new Set(body.match(/\/cdn\/shop\/files\/[^"'\s)]+/g) || []);
  return [...all].filter((u) => BY_PATH.has(u)).sort((a, b) => b.length - a.length);
}

function studentUrls(body) {
  const all = new Set(body.match(/\/cdn\/shop\/files\/[^"'\s)]+/g) || []);
  return [...all].filter((u) => !BY_PATH.has(u));
}

function main(argv) {
  const [handle, src, dest] = argv;
  const page = PAGES[handle];
  if (!page || !src || !dest) {
    console.error('usage: node scripts/gate-course-level-files.js <'
      + Object.keys(PAGES).join('|') + '> <body.html> <out.csv>');
    process.exit(2);
  }
  const body = fs.readFileSync(src, 'utf8');
  const snap = path.join(SNAP_DIR, handle + SNAP_SUFFIX);
  const problems = [];
  for (const marker of page.required) {
    if (!body.includes(marker)) problems.push(`this is not the ${handle} body: ${marker} is missing`);
  }
  if (!fs.existsSync(snap)) problems.push(`no snapshot at ${snap}; a Matrixify import of a live page is not undoable`);
  else if (fs.readFileSync(snap, 'utf8') !== body) problems.push('the snapshot on disk is not this body');
  if (problems.length) return refuse(problems);

  const teacher = teacherUrls(body);
  const student = studentUrls(body);
  if (!teacher.length) problems.push('no ungated teacher file URLs on this page, so there is nothing to do');
  if (problems.length) return refuse(problems);

  const r = page.rewrite(body);
  problems.push(...r.problems);
  if (!r.swapped) problems.push('nothing was swapped');

  for (const href of teacher) {
    if (r.body.includes(href)) { problems.push(`a teacher file URL survives: ${href}`); break; }
  }
  for (const href of student) {
    if (!r.body.includes(href)) { problems.push(`a student file URL was lost: ${href}`); break; }
  }
  // Belt and braces: nothing the manifest knows about may remain as a URL.
  const left = (r.body.match(/\/cdn\/shop\/files\/[^"'\s)]+/g) || []).filter((u) => BY_PATH.has(u));
  if (left.length) problems.push(`${left.length} manifest file URL(s) still in the HTML`);
  if (problems.length) return refuse(problems);

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([handle, 'MERGE', page.title, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(dest, '﻿' + lines.join('\r\n') + '\r\n');

  console.log(`\n  ${handle}`);
  console.log(`    ${teacher.length} teacher file(s) gated in ${r.swapped} place(s)`);
  teacher.forEach((u) => console.log(`      ${BY_PATH.get(u)}  ${MANIFEST[BY_PATH.get(u)].label}`));
  console.log(`    ${student.length} student file URL(s) left untouched`);
  console.log(`    wrote ${dest}\n`);
}

function refuse(problems) {
  console.error(`\n  ${problems.length} problem(s). No file written:\n`);
  problems.forEach((p) => console.error('    ' + p));
  console.error('');
  process.exit(1);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { PAGES, teacherUrls, studentUrls, FILEATTRS, PATCHES };
