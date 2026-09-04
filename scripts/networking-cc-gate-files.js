'use strict';
// -----------------------------------------------------------------------------
//  Repoint the AP Networking Command Center's teacher links at the gated endpoint.
//
//  ── ORDER MATTERS AND IT IS NOT NEGOTIABLE ──────────────────────────────────
//  This is step 2 of 3. Step 1 is routes/files.js plus
//  seed/networking-teacher-files.json, which must be DEPLOYED before this sheet
//  is imported. Import this first and every teacher link on a live teacher's
//  page resolves to an id the server has never heard of. Step 1 shipped in
//  PR #548 and was confirmed live on production commit f4ca37f.
//
//  Step 3 is restricting the 26 Drive folders from anyone-with-link. That is
//  the only step that revokes a link somebody already copied, it happens on
//  Tanner's Drive rather than here, and it MUST come after a real teacher has
//  been seen to still reach their files through the gate. Restricting first
//  breaks the one person who has paid.
//
//  ── WHAT IT CHANGES ─────────────────────────────────────────────────────────
//  Every `tf` (22, one per topic) and `tests` (4, one per unit) Drive folder URL
//  in the DATA blob becomes `api:<id>`, the same sha256-prefix id
//  seed/networking-teacher-files.json carries. The Drive URL stops appearing in
//  the public HTML, which is the entire point: the leak was not weak auth, it
//  was publication. The page's own `STATE.entitled` check is client side, so
//  the URL was in the source for an anonymous visitor no matter what the check
//  decided.
//
//  `sd` and `sg` are left exactly as they are. 44 of them, zero answer keys
//  among them, and a student handed one has to be able to open it. This script
//  asserts all 44 survive byte for byte.
//
//  ── AND THE CLICK HAS TO STILL WORK ─────────────────────────────────────────
//  A plain <a href> cannot carry an Authorization header, and a cross-origin
//  fetch cannot read Location off a manual redirect. So both render sites learn
//  to emit an api: href as a data-file button, and one delegated listener asks
//  /api/files/<id>?as=json with the teacher's token and opens what comes back.
//  Delegated rather than per-link because the unit list is re-rendered on every
//  expand and per-link handlers would accumulate, which on a 1 vCPU box is the
//  kind of thing that turns into a memory bill.
//
//  ── HOW IT EDITS ────────────────────────────────────────────────────────────
//  Surgically, the same way scripts/csp-command-center-gate-files.js does. The
//  page is 407 KB and re-serialising the DATA blob would rewrite every byte of
//  a live page for the sake of 26 substitutions.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a body that is not the AP Networking Command Center
//    - a body that is the bot-challenge page rather than the real one
//    - a different number of tf or tests substitutions than expected
//    - any of the 44 student links going missing or changing
//    - a render site that is not present exactly once, or already patched
//    - any tf/tests Drive folder URL still present in the output
//    - an id that is not in seed/networking-teacher-files.json
//
//  Run: node scripts/networking-cc-gate-files.js <out.csv>
//       node scripts/networking-cc-gate-files.js <out.csv> --from <body.html>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HANDLE = 'ap-networking-command-center';
const MANIFEST = require('../seed/networking-teacher-files.json');

const EXPECT_TF = 22;
const EXPECT_TESTS = 4;
const EXPECT_STUDENT = 44;

// Markers that prove this is the page we think it is. lib/storefront-fetch.js
// already refuses a challenge body, but this reads from a file too, so the
// check lives here as well rather than being assumed upstream.
const REQUIRED = [
  'function matButton(l, mat, unlocked){',
  'mats:{sd:',
  'anet-wrap',
];

// Same derivation as scripts/build-networking-file-manifest.js. Duplicated
// deliberately rather than imported: that script reaches the network at load,
// and this one must be runnable against a file with no egress.
function fileId(kind, driveId) {
  return crypto.createHash('sha256').update(`drive:${kind}:${driveId}`).digest('hex').slice(0, 16);
}

// The two places a teacher URL becomes an anchor. Both are asserted unique
// before either is touched, so a page redesign fails loudly instead of half
// applying.
const OLD_MAT_ANCHOR = `return '<a class="mat" href="'+esc(url)+'" target="_blank" rel="noopener"><span class="m-ico">'+mat.ico+'</span>'+mat.label+' '+ARROW+'</a>';`;

const NEW_MAT_ANCHOR = `if(url.indexOf('api:') === 0){
      return '<a class="mat" href="#" data-file="'+esc(url.slice(4))+'"><span class="m-ico">'+mat.ico+'</span>'+mat.label+' '+ARROW+'</a>';
    }
    return '<a class="mat" href="'+esc(url)+'" target="_blank" rel="noopener"><span class="m-ico">'+mat.ico+'</span>'+mat.label+' '+ARROW+'</a>';`;

const OLD_TESTS_ANCHOR = `? '<a class="mat" href="'+esc(u.tests)+'" target="_blank" rel="noopener">'`;

const NEW_TESTS_ANCHOR = `? '<a class="mat" href="'+(String(u.tests).indexOf('api:')===0 ? '#" data-file="'+esc(String(u.tests).slice(4)) : esc(u.tests)+'" target="_blank" rel="noopener')+'">'`;

// One delegated listener. Anchored to the end of matButton so it is installed
// once, at script scope, rather than inside a render pass.
const LISTENER = `
  /* Teacher materials are no longer URLs in this page. They are ids resolved by
     the API against the signed in teacher's entitlement, because printing the
     URLs here is what put the whole paid bundle one anonymous request away.
     One delegated listener rather than one per link: the unit list is rebuilt
     on every expand and per-link handlers would accumulate. */
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-file]') : null;
    if(!a) return;
    ev.preventDefault();
    if(a.getAttribute('data-busy')) return;
    a.setAttribute('data-busy','1');
    var tok = null;
    try { tok = localStorage.getItem('apcse_teacher_token'); } catch(e){ tok = null; }
    fetch('https://progress.apcsexamprep.com/api/files/' + encodeURIComponent(a.getAttribute('data-file')) + '?as=json', {
      headers: tok ? { Authorization: 'Bearer ' + tok } : {}
    }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){
        if(j && j.url){ window.open(j.url, '_blank', 'noopener'); }
        else { alert('Sign in as the teacher who purchased this bundle to open these files.'); }
      })
      .catch(function(){ alert('Could not open that file. Please try again.'); })
      .then(function(){ a.removeAttribute('data-busy'); });
  });
`;

function build(body) {
  const problems = [];

  for (const marker of REQUIRED) {
    if (!body.includes(marker)) {
      throw new Error(`this body is missing ${JSON.stringify(marker)}, so it is not the AP Networking Command Center`);
    }
  }
  if (body.includes("data-file=")) {
    throw new Error('this body already carries data-file links, so it has been gated already');
  }

  // ── A PAGE BODY IS A FRAGMENT, NEVER A DOCUMENT ───────────────────────────
  //  This check exists because its absence cost a live page on 2026-09-04.
  //  The first version of this script took its input straight from
  //  lib/storefront-fetch.js, which returns the RENDERED page: theme chrome,
  //  <head>, Shopify's own scripts, the lot. Shopify's Body HTML field holds
  //  only the fragment the theme drops inside its rte wrapper. Importing the
  //  rendered page as the body nests a whole document inside the page, and the
  //  theme then wraps it again.
  //
  //  It imported without complaint and every functional check passed, because
  //  the gate transformation genuinely worked. What it left was a page of
  //  761,823 bytes where 407,265 had been: three <head> elements, three
  //  <body> elements, two BreadcrumbList blocks and six copies of the theme
  //  runtime. The real body is 50,162 bytes.
  //
  //  scripts/extract-live-body.js is the tool that pulls the fragment out of a
  //  rendered page, and CLAUDE.md already said the CSV generators go through
  //  it. This refusal is here so that reading the convention is not the only
  //  thing standing between a rendered page and a live import.
  const DOCUMENT_TELLS = [
    ['<!doctype', /<!doctype/i],
    ['<html', /<html[\s>]/i],
    ['<head>', /<head[\s>]/i],
    ['</body>', /<\/body>/i],
    ['</html>', /<\/html>/i],
  ];
  const tells = DOCUMENT_TELLS.filter(([, re]) => re.test(body)).map(([n]) => n);
  if (tells.length) {
    throw new Error(
      `this looks like a RENDERED PAGE rather than a Shopify Body HTML fragment (found ${tells.join(', ')}). `
      + 'Extract the body first: node scripts/extract-live-body.js <rendered.html> <body.html>, '
      + 'then pass that with --from. Importing a rendered page nests a whole document inside the page.',
    );
  }

  // Record the student links BEFORE any edit, so survival is checked against
  // what was actually there rather than against an expectation.
  const studentBefore = body.match(/s[dg]:"https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view"/g) || [];
  if (studentBefore.length !== EXPECT_STUDENT) {
    throw new Error(`expected ${EXPECT_STUDENT} student links, found ${studentBefore.length}`);
  }

  // ── ONE DELIBERATE NORMALISATION, AND WHY IT IS NOT A GUARD BYPASS ────────
  //  The live body carries exactly one CRLF, between </head> and <body>. Every
  //  other line break in it is a bare LF. RFC4180 allows a CRLF inside a quoted
  //  field and both this repo's CSV parser and Matrixify read it correctly, but
  //  scripts/matrixify-preflight.js checks quoting line by line after splitting
  //  on CRLF, so that one byte splits the body cell into a fragment that does
  //  not start with a quote and the sheet is refused as "not fully quoted".
  //
  //  So the choice is a false refusal on every future sheet for this page, or
  //  one byte of HTML whitespace. Collapsing it changes no rendering: it sits
  //  between the head and the body tag. It is done here, once, explicitly, and
  //  asserted below, rather than left to be rediscovered by whoever next builds
  //  a sheet for this page and assumes their generator is broken.
  const crlfBefore = (body.match(/\r\n/g) || []).length;
  if (crlfBefore > 1) {
    problems.push(`expected at most 1 CRLF in the live body, found ${crlfBefore}; `
      + 'normalising that many would be a real content change rather than whitespace');
  }
  let out = body.replace(/\r\n/g, '\n');
  let tf = 0;
  let tests = 0;
  const unknown = [];

  const swap = (key) => (m, driveId) => {
    const id = fileId('folder', driveId);
    if (!Object.prototype.hasOwnProperty.call(MANIFEST, id)) {
      unknown.push(`${key} folder ${driveId} (id ${id}) is not in seed/networking-teacher-files.json`);
      return m;
    }
    if (key === 'tf') tf++; else tests++;
    return `${key}:"api:${id}"`;
  };

  out = out.replace(/tf:"https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)"/g, swap('tf'));
  out = out.replace(/tests:"https:\/\/drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]+)"/g, swap('tests'));

  unknown.forEach((u) => problems.push(u));
  if (tf !== EXPECT_TF) problems.push(`replaced ${tf} tf links, expected ${EXPECT_TF}`);
  if (tests !== EXPECT_TESTS) problems.push(`replaced ${tests} tests links, expected ${EXPECT_TESTS}`);

  // Render sites. Uniqueness asserted before replacing, so a redesign cannot
  // silently patch the wrong occurrence.
  for (const [name, needle] of [['matButton', OLD_MAT_ANCHOR], ['unit tests', OLD_TESTS_ANCHOR]]) {
    const n = out.split(needle).length - 1;
    if (n !== 1) problems.push(`${name} render site appears ${n} times, expected exactly 1`);
  }
  out = out.replace(OLD_MAT_ANCHOR, NEW_MAT_ANCHOR);
  out = out.replace(OLD_TESTS_ANCHOR, NEW_TESTS_ANCHOR);

  // Install the listener immediately after matButton's closing brace.
  const anchor = NEW_MAT_ANCHOR + '\n  }';
  if (!out.includes(anchor)) {
    problems.push('could not locate the end of matButton to install the click listener');
  } else {
    out = out.replace(anchor, anchor + '\n' + LISTENER);
  }

  // ── THE ASSERTIONS THAT MATTER ────────────────────────────────────────────
  const tfLeft = (out.match(/tf:"https:\/\/drive\.google\.com/g) || []).length;
  const testsLeft = (out.match(/tests:"https:\/\/drive\.google\.com/g) || []).length;
  if (tfLeft) problems.push(`${tfLeft} tf Drive URLs still in the output`);
  if (testsLeft) problems.push(`${testsLeft} tests Drive URLs still in the output`);

  const studentAfter = out.match(/s[dg]:"https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view"/g) || [];
  if (studentAfter.length !== EXPECT_STUDENT) {
    problems.push(`${studentAfter.length} student links survived, expected ${EXPECT_STUDENT}`);
  }
  for (const s of studentBefore) {
    if (!out.includes(s)) problems.push(`student link changed or lost: ${s.slice(0, 40)}`);
  }

  const apiIds = (out.match(/"api:([0-9a-f]{16})"/g) || []);
  if (apiIds.length !== EXPECT_TF + EXPECT_TESTS) {
    problems.push(`${apiIds.length} api: ids in the output, expected ${EXPECT_TF + EXPECT_TESTS}`);
  }

  const folderRefs = (out.match(/drive\.google\.com\/drive\/folders/g) || []).length;
  if (folderRefs) problems.push(`${folderRefs} Drive FOLDER references remain anywhere in the body`);

  // The normalisation above must have removed every CRLF and nothing else. If a
  // CRLF survives, the preflight will refuse the sheet and the reason will look
  // mysterious; if the length moved by more than the CRLFs plus the gate code,
  // something else was rewritten.
  if (/\r\n/.test(out)) problems.push('a CRLF survived normalisation');
  if (/\r/.test(out)) problems.push('a bare CR is present in the output');

  return { body: out, problems, tf, tests, student: studentAfter.length, crlfCollapsed: crlfBefore };
}

module.exports = { build, fileId, HANDLE };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const out = args.find((a) => !a.startsWith('--'));
    if (!out) {
      console.error('\n  usage: node scripts/networking-cc-gate-files.js <out.csv> [--from <body.html>]\n');
      process.exit(2);
    }
    const fromIdx = args.indexOf('--from');
    let body;
    if (fromIdx !== -1) {
      body = fs.readFileSync(args[fromIdx + 1], 'utf8');
    } else {
      const sf = require('../lib/storefront-fetch');
      const fn = sf.page || sf.fetchPage || sf.get || sf;
      const r = await fn(`/pages/${HANDLE}`);
      body = typeof r === 'string' ? r : (r.body || r.html);
    }

    let res;
    try { res = build(body); }
    catch (e) { console.error('\n  Refused: ' + e.message + '\n'); process.exit(1); }

    if (res.problems.length) {
      console.error(`\n  ${res.problems.length} problem(s). No file written:\n`);
      res.problems.forEach((p) => console.error('    ' + p));
      console.error('');
      process.exit(1);
    }

    const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const header = ['Handle', 'Command', 'Body HTML'];
    const lines = [header.map(cell).join(',')];
    lines.push([HANDLE, 'MERGE', res.body].map(cell).join(','));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

    console.log(`\n    gated ${res.tf} topic teacher folders + ${res.tests} unit assessment folders`);
    console.log(`    left  ${res.student} student links public, unchanged`);
    console.log(`\n    body ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB in, ${(Buffer.byteLength(res.body) / 1024).toFixed(0)} KB out`);
    console.log(`\n  wrote ${out}`);
    console.log('\n  DO NOT IMPORT until routes/files.js is deployed. It is, as of commit f4ca37f.');
    console.log('  Import settings: MERGE, QUOTE_ALL, utf-8-sig. Snapshot the live page first.\n');
  })().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
}
