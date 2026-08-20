'use strict';
// -----------------------------------------------------------------------------
//  Repoint the Command Center's teacher-file links at the gated endpoint.
//
//  This is step 2 of the answer-key fix. Step 1 is routes/files.js, which must
//  be DEPLOYED AND VERIFIED before this sheet is imported. Import this first and
//  every teacher file on a live teacher's page 404s.
//
//  ── WHAT IT CHANGES ─────────────────────────────────────────────────────────
//  Every `teacherFiles[].href` in the DATA blob becomes `api:<id>`, where the id
//  is the same sha256 prefix the manifest uses. The CDN URL stops appearing in
//  the public HTML, which is the entire point: the leak was not weak auth, it
//  was publication.
//
//  studentFiles are left exactly as they are. 334 of them, zero answer keys
//  among them, and a student who is handed one has to be able to open it.
//
//  ── AND THE CLICK HAS TO STILL WORK ─────────────────────────────────────────
//  A plain <a href> cannot carry an Authorization header, and a cross-origin
//  fetch cannot read Location off a manual redirect. So fileBtn renders an
//  api: href as a button that asks /api/files/<id>?as=json with the teacher's
//  token and opens the URL it gets back. One small patch to one function.
//
//  ── HOW IT EDITS ────────────────────────────────────────────────────────────
//  Surgically, the same way scripts/csp-command-center-links.js does. The DATA
//  blob is 132 KB of minified JSON and re-serialising it would rewrite every
//  byte of a live page for the sake of 439 substitutions. So each href is
//  replaced in place and the count is asserted.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a body that is not the Command Center
//    - a body with no snapshot on disk
//    - a different number of substitutions than the manifest expects
//    - any student file URL going missing
//    - DATA that stops parsing as JSON
//    - a teacher CDN URL still present anywhere in the output
//
//  Run: node scripts/csp-command-center-gate-files.js <live-body.html> <out.csv>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { parseData, fileId } = require('./build-file-manifest');

const HANDLE = 'csp-command-center';
const TITLE = 'CSP Command Center';
const PUBLISHED_AT = '2026-03-01 12:00:00';
const REQUIRED = ['var DATA = {', '"bigIdeas"', 'function fileBtn('];
const SNAP = path.join(__dirname, '..', 'shopify', 'page-snapshots',
  HANDLE + '.before-file-gate.html');

// The one function that turns a file record into a link. An api: href becomes a
// button; everything else keeps the behavior it has today.
const OLD_FILEBTN = `  function fileBtn(f, unlocked, cls){
    if(!unlocked){ return '<span class="mat disabled">'+esc(f.label)+'</span>'; }
    return '<a class="mat'+(cls?' '+cls:'')+'" href="'+esc(f.href)+'" target="_blank" rel="noopener">'+esc(f.label)+' '+ARROW+'</a>';
  }`;

const NEW_FILEBTN = `  function fileBtn(f, unlocked, cls){
    if(!unlocked){ return '<span class="mat disabled">'+esc(f.label)+'</span>'; }
    /* Teacher files are no longer URLs in this page. They are ids resolved by
       the API against the signed-in teacher's entitlement, because printing the
       URLs here is what put 222 answer keys one anonymous request away. */
    if(f.href.indexOf('api:') === 0){
      return '<a class="mat'+(cls?' '+cls:'')+'" href="#" data-file="'+esc(f.href.slice(4))+'">'+esc(f.label)+' '+ARROW+'</a>';
    }
    return '<a class="mat'+(cls?' '+cls:'')+'" href="'+esc(f.href)+'" target="_blank" rel="noopener">'+esc(f.label)+' '+ARROW+'</a>';
  }
  /* One delegated listener rather than one per link: the lesson list is rebuilt
     on every render and per-link handlers would accumulate. */
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-file]') : null;
    if(!a) return;
    ev.preventDefault();
    if(a.getAttribute('data-busy')) return;
    a.setAttribute('data-busy','1');
    var tok = null;
    try { tok = localStorage.getItem(CFG.TOKEN_KEY); } catch(e){ tok = null; }
    fetch(CFG.API + '/api/files/' + encodeURIComponent(a.getAttribute('data-file')) + '?as=json', {
      headers: tok ? { Authorization: 'Bearer ' + tok } : {}
    })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if(d && d.url){ window.open(d.url, '_blank', 'noopener'); }
        else { alert('That file is part of the Teacher Bundle. Sign in with the teacher account that owns it.'); }
      })
      .catch(function(){ alert('Could not reach the file service. Check your connection and try again.'); })
      .then(function(){ a.removeAttribute('data-busy'); });
  });`;

function rewrite(body) {
  const data = parseData(body);

  // Collect every teacher href, wherever it lives in the tree.
  const teacherHrefs = [];
  const studentHrefs = [];
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const k of Object.keys(node)) {
      if (k === 'teacherFiles' && Array.isArray(node[k])) { node[k].forEach((f) => teacherHrefs.push(f.href)); continue; }
      if (k === 'studentFiles' && Array.isArray(node[k])) { node[k].forEach((f) => studentHrefs.push(f.href)); continue; }
      walk(node[k]);
    }
  })(data);

  let out = body;
  let swapped = 0;
  // Longest first so one path that is a prefix of another cannot be half
  // replaced. Only the exact quoted href is targeted, never a bare substring.
  for (const href of [...new Set(teacherHrefs)].sort((a, b) => b.length - a.length)) {
    const needle = '"href":"' + href + '"';
    const parts = out.split(needle);
    if (parts.length < 2) continue;
    swapped += parts.length - 1;
    out = parts.join('"href":"api:' + fileId(href) + '"');
  }
  out = out.replace(OLD_FILEBTN, NEW_FILEBTN);
  return { body: out, teacherHrefs, studentHrefs, swapped, patchedBtn: out.includes('data-file') };
}

function main(argv) {
  const [src, dest] = argv;
  if (!src || !dest) {
    console.error('usage: node scripts/csp-command-center-gate-files.js <body.html> <out.csv>');
    process.exit(2);
  }
  const body = fs.readFileSync(src, 'utf8');
  const problems = [];
  for (const marker of REQUIRED) if (!body.includes(marker)) problems.push(`this is not the Command Center body: ${marker} is missing`);
  if (!fs.existsSync(SNAP)) problems.push(`no snapshot at ${SNAP}; a Matrixify import of a live page is not undoable`);
  else if (fs.readFileSync(SNAP, 'utf8') !== body) problems.push('the snapshot on disk is not this body');

  if (problems.length) return refuse(problems);

  const r = rewrite(body);
  if (r.swapped !== r.teacherHrefs.length) {
    problems.push(`swapped ${r.swapped} hrefs but the page carries ${r.teacherHrefs.length} teacher files`);
  }
  if (!r.patchedBtn) problems.push('fileBtn was not patched, so the ids would render as dead links');

  // Not one teacher CDN URL may survive anywhere in the output.
  for (const href of new Set(r.teacherHrefs)) {
    if (r.body.includes(href)) { problems.push(`a teacher file URL is still in the page: ${href}`); break; }
  }
  // And not one student URL may have gone missing.
  for (const href of new Set(r.studentHrefs)) {
    if (!r.body.includes(href)) { problems.push(`a student file URL was lost: ${href}`); break; }
  }
  try { parseData(r.body); } catch (e) { problems.push('DATA no longer parses: ' + e.message); }

  if (problems.length) return refuse(problems);

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', TITLE, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(dest, '﻿' + lines.join('\r\n') + '\r\n');
  console.log(`    ${r.swapped} teacher file URLs replaced with gated ids`);
  console.log(`    ${new Set(r.studentHrefs).size} student file URLs left untouched`);
  console.log(`\n  wrote ${dest}`);
  console.log('\n  DO NOT IMPORT until /api/files is deployed and a real teacher download is verified.\n');
}

function refuse(problems) {
  console.error(`\n  ${problems.length} problem(s). No file written:\n`);
  problems.forEach((p) => console.error('    ' + p));
  console.error('');
  process.exit(1);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { rewrite, OLD_FILEBTN, NEW_FILEBTN };
