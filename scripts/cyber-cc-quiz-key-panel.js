'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TWO LINKS PER QUIZ ON THE CYBER COMMAND CENTER: the student page, and the key.
//
//  ── WHAT A TEACHER HAS TODAY ────────────────────────────────────────────────
//  One link. The Student pages row offers the quiz the class takes, and there is
//  nowhere on the hub to see the answers. So a teacher either takes the quiz
//  themselves to find out what it wants, or reads the key out of the page source
//  in front of the class, which is also where a student can read it.
//
//  This pairs every quiz link with an Answer key button. The button holds a
//  location and nothing else; the key arrives over
//  GET /api/quiz/:course/:unit/:lesson/:activity_type/key with the teacher's
//  bearer, which fails closed for a student token, an unentitled teacher, or no
//  token at all. If this markup carried the key, publishing it would publish the
//  answers, and this page is public HTML.
//
//  ── THE GATE IS STATE.entitled, NOT unlocked ───────────────────────────────
//  Lesson materials use `STATE.entitled || unitFree(u)`, so Unit 1 shows its
//  Drive links to a signed-out visitor. That is a presentation rule about links
//  which are public-by-link anyway. A key served from the API is real access
//  control, and a free PREVIEW of Unit 1 is not a reason to hand out its
//  answers, so this gates on entitlement alone. renderResources() on this same
//  page already draws that line for the course-level documents.
//
//  An unentitled teacher still sees a locked chip rather than nothing, which is
//  the funnel signal the locked units already give, and it means the button
//  never renders in a state where clicking it can only fail. The lab key panel
//  does render such a button on Unit 1, and that wart is not copied here.
//
//  ── WHICH ROWS GET ONE ──────────────────────────────────────────────────────
//  Not "every row with a bank". lib/cyber-cc-quiz-keys.js has the reasoning and
//  the two defects that rule avoids; the short version is that the row's own
//  number is not the bank's number in Unit 3, and three Unit 1 banks exist that
//  are not the quiz their page serves. Every button emitted here is justified by
//  the page itself, either because the page fetches that bank or because every
//  one of that bank's questions is on it. A row that cannot be justified gets no
//  button and the refusal is printed.
//
//  ── HOW IT EDITS ────────────────────────────────────────────────────────────
//  Anchored, inside the page's existing IIFE so the new code shares the closure
//  holding CFG.API, STATE.token and esc(). The two lines inside studentSection
//  are extended rather than rewritten, because that function's label carries a
//  middle dot and a clipboard emoji and rewriting it would put those bytes
//  through this file.
//
//  It depends on the lab key panel being installed, and REFUSES a body without
//  it rather than shipping a second copy of the same overlay and stylesheet.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a body that is not the cyber Command Center
//    - a body with no lab key panel to share the modal with
//    - any anchor that is absent, or present more than once
//    - a crosswalk with no justified rows at all
//    - any answer text reaching the output
//    - anything non-ASCII in what it writes
//    - an output smaller than the input
//
//  THIS WRITES A FILE AND NOTHING ELSE. Importing the sheet is a human action,
//  and MERGE overwrites a live body with no undo.
//
//  Run: node scripts/cyber-cc-quiz-key-panel.js <command-center.html> <out.csv>
//  Get the body from the Shopify Admin API, never from the rendered page.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const cw = require('../lib/cyber-cc-quiz-keys');
const sf = require('../lib/storefront-fetch');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const CC_HANDLE = 'cyber-command-center';
const MARK = '/* apcs-quiz-key panel */';
//  The closing marker is a COMMENT, and that is not a style choice. Writing it
//  as MARK + ' end' emits `/* apcs-quiz-key panel */ end`, and a bare `end` is a
//  valid expression statement that throws ReferenceError the moment the IIFE
//  reaches it, aborting the whole Command Center render. It is not a syntax
//  error, so `new Function(code)` accepts it happily; only EXECUTING the panel
//  catches it, which is what smoke:cyberquizkeys section 8 now does.
//  scripts/cyber-lab-key-panel.js had exactly this and was fixed in the same pass.
const END = '/* apcs-quiz-key panel end */';

function banks() {
  return [
    ...require('../seed/cyber-unit-1-web-quizzes.js'),
    ...require('../seed/cyber-units-2-5-web-quizzes.js'),
  ];
}

//  The quiz pages, as served. Through lib/storefront-fetch.js, which sends no
//  User-Agent and refuses a body it cannot prove is a rendered page. That
//  matters more here than in most places: a challenge body contains none of the
//  stems, so every row would refuse and the sheet would ship with no buttons
//  while reporting a clean run.
function fetchQuizPages(stu) {
  const bodies = {};
  for (const p of Object.values(stu)) {
    if (!p) continue;
    const handle = p.replace(/^\/pages\//, '');
    bodies[handle] = sf.page(p).body;
  }
  return bodies;
}

//  ── the injected panel ──────────────────────────────────────────────────────
//  ASCII only. Icons are HTML entities so nothing non-ASCII passes through this
//  file, which is the same rule cyber-command-center-resources.js follows.
function panelCode(byLesson) {
  return '  ' + MARK + '\n'
    + '  var QUIZKEY = ' + JSON.stringify(byLesson) + ';\n'
    + '\n'
    + '  // The button holds a location. The key itself is fetched, gated, on click.\n'
    + '  // Gated on entitlement rather than on `unlocked`: a free Unit 1 preview is\n'
    + '  // not a reason to hand out answers, and a button that can only fail is worse\n'
    + '  // than a locked one that explains itself.\n'
    + '  function quizKeyButton(l, destKey){\n'
    + '    if(destKey !== "quiz") return "";\n'
    + '    var k = QUIZKEY[l.id]; if(!k) return "";\n'
    + '    if(!STATE.entitled) return \'<span class="mat disabled" title="The answer key is part of the teacher bundle">\'\n'
    + '      + \'<span class="m-ico">&#128274;</span>Answer key</span>\';\n'
    + '    return \'<button class="mat quiz-key-btn" title="Open the answer key for this quiz"\'\n'
    + '      + \' data-qk-course="\'+esc(k.course)+\'" data-qk-unit="\'+esc(k.unit)+\'"\'\n'
    + '      + \' data-qk-lesson="\'+esc(k.lesson)+\'" data-qk-activity="\'+esc(k.activity_type)+\'">\'\n'
    + '      + \'<span class="m-ico">&#128273;</span>Answer key</button>\';\n'
    + '  }\n'
    + '\n'
    + '  function quizKeyHTML(k){\n'
    + '    var h = \'<button class="lk-close" id="apcs-labkey-x">Close</button>\'\n'
    + '      + \'<button class="lk-print" id="apcs-labkey-p">Print</button>\'\n'
    + '      + "<h3>Answer key: "+esc(k.lesson)+" "+esc(k.activity_type)+"</h3>"\n'
    + '      + \'<p class="lk-sub">\'+esc(k.course)+" &middot; "+esc(k.unit)+" &middot; "+k.pool\n'
    + '      + " question"+(k.pool===1?"":"s")+" &middot; "+k.total_points\n'
    + '      + " point"+(k.total_points===1?"":"s")+"</p>";\n'
    + '    if(!k.serves_whole_pool){\n'
    + '      h += \'<p class="lk-note">Each student is served \'+k.served+\' of these \'+k.pool\n'
    + '        + \' questions, chosen at random. Every question in the pool is printed below.</p>\';\n'
    + '    }\n'
    + '    k.questions.forEach(function(q){\n'
    + '      h += "<p style=\\"margin:16px 0 4px\\"><b>"+q.n+". "+esc(q.prompt)+"</b></p><ul>";\n'
    + '      q.options.forEach(function(o){\n'
    + '        h += "<li>"+(o.correct?\'<span class="lk-right">\'+esc(o.text)+" &check;</span>":esc(o.text))+"</li>";\n'
    + '      });\n'
    + '      h += "</ul>"+(q.explanation?\'<p class="lk-why">\'+esc(q.explanation)+"</p>":"");\n'
    + '    });\n'
    + '    return h + \'<p class="lk-note">\'+esc(k.disclosure)+"</p>";\n'
    + '  }\n'
    + '\n'
    + '  // Reuses the lab key overlay and stylesheet rather than shipping a second\n'
    + '  // copy of both. The generator refuses a body that does not have them.\n'
    + '  function openQuizKey(course, unit, lesson, activity){\n'
    + '    labKeyStyles();\n'
    + '    var ov = document.getElementById("apcs-labkey-ov");\n'
    + '    if(!ov){\n'
    + '      ov = document.createElement("div"); ov.id = "apcs-labkey-ov";\n'
    + '      ov.innerHTML = \'<div id="apcs-labkey-md"></div>\';\n'
    + '      document.body.appendChild(ov);\n'
    + '      ov.addEventListener("click", function(e){ if(e.target===ov) ov.remove(); });\n'
    + '    }\n'
    + '    var md = ov.querySelector("#apcs-labkey-md");\n'
    + '    md.innerHTML = "<p>Loading the key...</p>";\n'
    + '    var u = CFG.API+"/api/quiz/"+encodeURIComponent(course)+"/"+encodeURIComponent(unit)\n'
    + '      +"/"+encodeURIComponent(lesson)+"/"+encodeURIComponent(activity)+"/key";\n'
    + '    fetch(u, { headers: STATE.token ? { Authorization:"Bearer "+STATE.token } : {} })\n'
    + '      .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; }); })\n'
    + '      .then(function(res){\n'
    + '        if(!res.ok || !res.j || !res.j.key){\n'
    + '          md.innerHTML = \'<button class="lk-close" id="apcs-labkey-x">Close</button>\'\n'
    + '            + "<h3>Not available</h3><p>The answer key is for signed-in teachers with this course. "\n'
    + '            + "If you are signed in and still see this, your access to AP Cybersecurity is not active.</p>";\n'
    + '        } else { md.innerHTML = quizKeyHTML(res.j.key); }\n'
    + '        var x = document.getElementById("apcs-labkey-x");\n'
    + '        if(x) x.addEventListener("click", function(){ ov.remove(); });\n'
    + '        var p = document.getElementById("apcs-labkey-p");\n'
    + '        if(p) p.addEventListener("click", function(){ window.print(); });\n'
    + '      })\n'
    + '      .catch(function(){ md.innerHTML = "<p>The key could not be loaded. Try again in a moment.</p>"; });\n'
    + '  }\n'
    + '\n'
    + '  document.addEventListener("click", function(e){\n'
    + '    var b = e.target && e.target.closest ? e.target.closest(".quiz-key-btn") : null;\n'
    + '    if(!b) return;\n'
    + '    e.preventDefault();\n'
    + '    openQuizKey(b.getAttribute("data-qk-course"), b.getAttribute("data-qk-unit"),\n'
    + '      b.getAttribute("data-qk-lesson"), b.getAttribute("data-qk-activity"));\n'
    + '  });\n'
    + '  ' + END + '\n\n';
}

//  ── the two anchors inside studentSection ──────────────────────────────────
//  Extended, never rewritten. That function's label holds a middle dot and a
//  clipboard emoji; reproducing them here would route two non-ASCII characters
//  through this file for no reason, and this script asserts it writes none.
const LOCKED_ANCHOR = `      if(!unlocked) return '<span class="mat disabled">'+d[1]+'</span>';`;
const LOCKED_AFTER = `      if(!unlocked) return '<span class="mat disabled">'+d[1]+'</span>'+quizKeyButton(l,d[0]);`;
const OPEN_ANCHOR = `data-copy="'+esc(url)+'">\u{1F4CB}</button></span>';`;
const OPEN_AFTER = `data-copy="'+esc(url)+'">\u{1F4CB}</button></span>'+quizKeyButton(l,d[0]);`;

function patch(body, byLesson) {
  if (!body.includes('var STU = {')) throw new Error('this is not the cyber command center body');
  if (!body.includes('function studentSection(l, unlocked){')) {
    throw new Error('studentSection is not in this body');
  }
  // The overlay, the stylesheet and the print button all belong to the lab key
  // panel. Sharing them is deliberate; shipping a second copy would give the
  // page two stylesheets fighting over one set of ids.
  if (!body.includes('function labKeyStyles(){') || !body.includes('apcs-labkey-ov')) {
    throw new Error('the lab key panel is not installed, so there is no modal to share. '
      + 'Run scripts/cyber-lab-key-panel.js first.');
  }
  if (body.includes(MARK)) {
    // Already installed. Refresh the map in place rather than reinstalling,
    // which would register the click listener twice and open two overlays.
    const want = '  var QUIZKEY = ' + JSON.stringify(byLesson) + ';';
    const re = /^ {2}var QUIZKEY = \{.*\};$/m;
    const found = body.match(re);
    if (!found) throw new Error('the panel is installed but its QUIZKEY line is not where this script expects it');
    if (found[0] === want) return { body, changed: false };
    return { body: body.replace(re, want), changed: true, refreshed: true };
  }

  const once = (s, a) => {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`anchor appears ${n} times, expected exactly 1: ${a.slice(0, 60)}`);
  };

  const fnAnchor = '  function studentSection(l, unlocked){';
  once(body, fnAnchor);
  let out = body.replace(fnAnchor, panelCode(byLesson) + fnAnchor);

  once(out, LOCKED_ANCHOR);
  out = out.replace(LOCKED_ANCHOR, LOCKED_AFTER);

  once(out, OPEN_ANCHOR);
  out = out.replace(OPEN_ANCHOR, OPEN_AFTER);

  return { body: out, changed: true };
}

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

function main(argv) {
  const [ccIn, outPath] = argv;
  if (!ccIn || !outPath) {
    console.error('usage: node scripts/cyber-cc-quiz-key-panel.js <command-center.html> <out.csv>');
    process.exit(2);
  }
  const before = fs.readFileSync(ccIn, 'utf8');

  console.log('  reading the quiz pages this hub links to');
  const stu = cw.parseSTU(before);
  const bodies = fetchQuizPages(stu);
  const rows = cw.crosswalk(before, bodies, banks());

  const byLesson = {};
  for (const r of rows) {
    if (r.location) {
      byLesson[r.lessonId] = r.location;
      console.log(`    ${r.lessonId.padEnd(4)} -> ${r.location.unit}/${r.location.lesson}  [${r.basis}]`);
    } else {
      console.log(`    ${r.lessonId.padEnd(4)}    no key: ${r.reason}`);
    }
  }
  const justified = Object.keys(byLesson).length;
  if (!justified) throw new Error('no row could be justified, so there is nothing honest to publish');
  console.log(`  ${justified} of ${rows.length} rows get an answer key`);

  const { body, changed, refreshed } = patch(before, byLesson);
  if (!changed) { console.log('  the quiz key panel is installed and current, nothing to import'); return; }
  if (refreshed) console.log('  the panel was already installed; refreshing its crosswalk');

  // The page must not contain an answer. If it does, this script built the key
  // into the markup instead of fetching it, and importing would publish it to
  // a page that is public HTML. Checked against every option of every seeded
  // cyber question, on distinctive text only: an option two characters long
  // occurs in any HTML by accident, and a check that cries wolf gets ignored.
  const DISTINCTIVE = 12;
  const injected = (body.split(MARK)[1] || '').split(END)[0] || '';
  const leaked = [];
  for (const b of banks()) {
    for (const q of b.questions) {
      const right = (q.options || [])[q.correct_index];
      if (typeof right !== 'string' || right.length < DISTINCTIVE) continue;
      if (injected.includes(right.slice(0, 60))) leaked.push(right.slice(0, 60));
      if (injected.includes(String(q.prompt).slice(0, 60))) leaked.push(String(q.prompt).slice(0, 60));
    }
  }
  if (leaked.length) {
    throw new Error(`the injected code carries quiz text, which importing would publish: ${leaked.slice(0, 3).join(' | ')}`);
  }

  // Everything this script writes must be ASCII, so no import can introduce
  // mojibake through it. The page's own bytes are untouched and not checked
  // here; scripts/matrixify-preflight.js is what audits those.
  const nonAscii = [...injected].filter((c) => c.charCodeAt(0) > 127);
  if (nonAscii.length) {
    throw new Error(`the injected code is not ASCII: ${JSON.stringify(nonAscii.slice(0, 8).join(''))}`);
  }

  if (body.length <= before.length) {
    throw new Error(`the output (${body.length}) is not larger than the input (${before.length})`);
  }

  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const row = [CC_HANDLE, 'MERGE', 'AP Cybersecurity Command Center', body, 'TRUE', PUBLISHED_AT];
  fs.writeFileSync(outPath, '﻿' + header.map(csvCell).join(',') + '\n' + row.map(csvCell).join(',') + '\n', 'utf8');

  console.log(`  wrote ${outPath}`);
  console.log(`  body ${before.length} -> ${body.length} bytes (+${body.length - before.length})`);
  console.log('  import once, MERGE mode, and read the diff first');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (e) { console.error('REFUSED: ' + e.message); process.exit(1); }
}

module.exports = { patch, panelCode, MARK, END, LOCKED_ANCHOR, OPEN_ANCHOR };
