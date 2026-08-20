'use strict';
// -----------------------------------------------------------------------------
//  Gate the teacher files on ap-csp-teacher-resources.
//
//  ── WHY THERE IS A SECOND PAGE ──────────────────────────────────────────────
//  Fixing csp-command-center alone would not have closed the leak. This page
//  publishes the SAME 222 answer keys, and it is worse: the Command Center at
//  least has a client-side FREE_BI array and hides locked material behind an
//  unlocked flag. This page has no gate of any kind. It is static HTML with
//  <a href> links, served to anyone, titled "AP CSP Teacher Resources
//  (Premium)".
//
//  Found by sweeping rather than by reasoning. It is the argument for sweeping.
//
//  ── WHAT IT CHANGES ─────────────────────────────────────────────────────────
//  Every href whose path appears in the teacher-file manifest becomes an id
//  resolved by /api/files. Membership of the manifest is the test, not the link
//  class or the section heading, because the manifest is already the single
//  definition of "teacher only" and a second definition would eventually
//  disagree with it. Student handouts are not in the manifest and are untouched.
//
//  The page carries no JavaScript at all today, so the click handler and its
//  config are appended as one script block. Same delegated-listener shape as the
//  Command Center, for the same reason: one listener, not one per link.
//
//  ── ORDER ───────────────────────────────────────────────────────────────────
//  /api/files must be deployed and verified before this is imported. Import it
//  first and every teacher file on a paying teacher's page stops working.
//
//  Run: node scripts/csp-teacher-resources-gate.js <live-body.html> <out.csv>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const MANIFEST = require('../seed/csp-teacher-files.json');

const HANDLE = 'ap-csp-teacher-resources';
const TITLE = 'AP CSP Teacher Resources (Premium)';
const PUBLISHED_AT = '2026-03-01 12:00:00';
const SNAP = path.join(__dirname, '..', 'shopify', 'page-snapshots', HANDLE + '.before-file-gate.html');

const BY_PATH = new Map(Object.entries(MANIFEST).map(([id, f]) => [f.path, id]));

const HANDLER = `
<script>
(function(){
  "use strict";
  /* Teacher files are ids now, not URLs. Printing the URLs here is what put 222
     answer keys one anonymous request away. */
  var API = "https://progress.apcsexamprep.com";
  var TOKEN_KEY = "apcse_teacher_token";
  document.addEventListener("click", function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest("a[data-file]") : null;
    if(!a) return;
    ev.preventDefault();
    if(a.getAttribute("data-busy")) return;
    a.setAttribute("data-busy","1");
    var tok = null;
    try { tok = localStorage.getItem(TOKEN_KEY); } catch(e){ tok = null; }
    fetch(API + "/api/files/" + encodeURIComponent(a.getAttribute("data-file")) + "?as=json", {
      headers: tok ? { Authorization: "Bearer " + tok } : {}
    })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if(d && d.url){ window.open(d.url, "_blank", "noopener"); }
        else { alert("That file is part of the Teacher Bundle. Sign in with the teacher account that owns it."); }
      })
      .catch(function(){ alert("Could not reach the file service. Check your connection and try again."); })
      .then(function(){ a.removeAttribute("data-busy"); });
  });
})();
</script>`;

function rewrite(body) {
  const hrefs = [...new Set([...body.matchAll(/href="(\/cdn\/shop\/files\/[^"]+)"/g)].map((m) => m[1]))];
  const teacher = hrefs.filter((h) => BY_PATH.has(h));
  const student = hrefs.filter((h) => !BY_PATH.has(h));

  let out = body;
  let swapped = 0;
  for (const href of teacher.sort((a, b) => b.length - a.length)) {
    const needle = 'href="' + href + '"';
    const parts = out.split(needle);
    if (parts.length < 2) continue;
    swapped += parts.length - 1;
    out = parts.join('href="#" data-file="' + BY_PATH.get(href) + '"');
  }
  out += HANDLER;
  return { body: out, teacher, student, swapped };
}

function main(argv) {
  const [src, dest] = argv;
  if (!src || !dest) {
    console.error('usage: node scripts/csp-teacher-resources-gate.js <body.html> <out.csv>');
    process.exit(2);
  }
  const body = fs.readFileSync(src, 'utf8');
  const problems = [];
  if (!body.includes('/cdn/shop/files/')) problems.push('this body carries no file links, so it is not the right page');
  if (!fs.existsSync(SNAP)) problems.push(`no snapshot at ${SNAP}`);
  else if (fs.readFileSync(SNAP, 'utf8') !== body) problems.push('the snapshot on disk is not this body');
  if (problems.length) return refuse(problems);

  const r = rewrite(body);
  if (!r.swapped) problems.push('nothing was swapped');
  const keys = r.teacher.filter((h) => /answer|key|solution|rubric/i.test(h));
  if (keys.length !== 222) problems.push(`${keys.length} answer keys found on the page, expected 222`);
  for (const h of r.teacher) {
    if (r.body.includes('"' + h + '"')) { problems.push(`a teacher file URL survives: ${h}`); break; }
  }
  for (const h of r.student) {
    if (!r.body.includes(h)) { problems.push(`a student file URL was lost: ${h}`); break; }
  }
  const leftKeys = (r.body.match(/\/cdn\/shop\/files\/[^"]*/g) || []).filter((u) => /answer|key|solution|rubric/i.test(u));
  if (leftKeys.length) problems.push(`${leftKeys.length} answer key URL(s) still in the HTML`);
  if (!r.body.includes('data-file=')) problems.push('no gated links were produced');
  if ((r.body.match(/<script/g) || []).length !== 1) problems.push('expected exactly one script block after the patch');
  if (problems.length) return refuse(problems);

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([HANDLE, 'MERGE', TITLE, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(dest, '﻿' + lines.join('\r\n') + '\r\n');
  console.log(`    ${r.swapped} teacher file links gated (${keys.length} of them answer keys)`);
  console.log(`    ${r.student.length} student file links left untouched`);
  console.log(`\n  wrote ${dest}`);
  console.log('\n  DO NOT IMPORT until /api/files is deployed and verified.\n');
}

function refuse(problems) {
  console.error(`\n  ${problems.length} problem(s). No file written:\n`);
  problems.forEach((p) => console.error('    ' + p));
  console.error('');
  process.exit(1);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { rewrite, HANDLER };
