'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE ANSWER KEY PANEL on the cyber Command Center.
//
//  A teacher assigning a lab needs three things the lab page does not show
//  them: the rubric (which check is worth what), the reference walkthrough, and
//  the correct option for each question with the reason. This puts all three
//  one click from the lesson row, and takes them from the API rather than from
//  the page, so the key a teacher reads is generated from the same spec the
//  student plays.
//
//  WHY THE PAGE HOLDS NO ANSWERS
//  The injected code holds a lab id and nothing else. The key arrives over
//  GET /api/labs/:course/:item_id/key with the teacher's bearer, which fails
//  closed for a student token, an unentitled teacher, or no token at all. If
//  this markup were the key, publishing it would publish the answers.
//
//  WHAT IT IS HONEST ABOUT
//  The panel prints the disclosure the API sends with the key: the player
//  grades in the browser, so the correct options are in the spec a student can
//  already fetch. A gate on the key page is not secrecy. See docs/lab-key.md.
//
//  HOW IT EDITS
//  Four anchored edits inside the page's existing IIFE, so the new code shares
//  the closure that already holds CFG.API, STATE.token and esc(). Nothing is
//  appended after the script; a second <script> could not see any of that.
//
//  Run: node scripts/cyber-lab-key-panel.js <command-center.html> <out.csv>
//  Get the body from the Shopify Admin API, never from the rendered page.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const labs = require('../lib/lab-spec');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const CC_HANDLE = 'cyber-command-center';

// Which lesson rows get a key button, derived from the specs rather than
// listed, so a new cyber lab appears here by existing.
function labsByLesson() {
  const out = {};
  for (const s of labs.all()) {
    if (s.course !== 'ap-cybersecurity') continue;
    out[s.lesson_id] = { course: s.course, item: s.item_id, title: s.title };
  }
  return out;
}

const MARK = '/* apcs-lab-key panel */';

function panelCode(byLesson) {
  return '\n  ' + MARK + '\n'
    + '  var LABKEY = ' + JSON.stringify(byLesson) + ';\n'
    + '\n'
    + '  // The button only. The key itself is fetched, gated, on click.\n'
    + '  function labKeySection(l, unlocked){\n'
    + '    var k = LABKEY[l.id]; if(!k) return "";\n'
    + '    if(!unlocked) return \'<div class="mats-lbl">Lab answer key</div>\'\n'
    + '      + \'<div class="mats"><span class="mat disabled">Sign in to open the key</span></div>\';\n'
    + '    return \'<div class="mats-lbl">Lab answer key</div><div class="mats">\'\n'
    + '      + \'<button class="mat lab-key-btn" data-key-course="\'+esc(k.course)+\'" data-key-item="\'+esc(k.item)+\'">\'\n'
    + '      + \'Answer key: \'+esc(k.title)+\'</button></div>\';\n'
    + '  }\n'
    + '\n'
    + '  function labKeyStyles(){\n'
    + '    if(document.getElementById("apcs-labkey-css")) return;\n'
    + '    var s = document.createElement("style"); s.id = "apcs-labkey-css";\n'
    + '    s.textContent = "'
      + '.lab-key-btn{cursor:pointer}'
      + '#apcs-labkey-ov{position:fixed;inset:0;background:rgba(15,31,61,.6);z-index:99999;'
      + 'display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}'
      + '#apcs-labkey-md{background:#fff;max-width:820px;width:100%;border-radius:10px;padding:22px 26px;'
      + 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#12203a}'
      + '#apcs-labkey-md h3{margin:0 0 4px;font-size:20px}'
      + '#apcs-labkey-md h4{margin:18px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#5a6b86}'
      + '#apcs-labkey-md .lk-sub{color:#5a6b86;font-size:13px;margin:0 0 6px}'
      + '#apcs-labkey-md ol,#apcs-labkey-md ul{margin:0;padding-left:20px;line-height:1.55}'
      + '#apcs-labkey-md code{background:#eef2f7;padding:1px 5px;border-radius:4px;font-size:13px}'
      + '#apcs-labkey-md .lk-right{color:#146c43;font-weight:700}'
      + '#apcs-labkey-md .lk-why{color:#3d4d66;font-size:13px;margin:2px 0 10px}'
      + '#apcs-labkey-md .lk-note{background:#fff6e5;border-left:3px solid #c98a00;padding:9px 12px;'
      + 'border-radius:0 6px 6px 0;font-size:13px;margin:16px 0 0}'
      + '#apcs-labkey-md .lk-close{float:right;cursor:pointer;border:0;background:#0f1f3d;color:#fff;'
      + 'border-radius:6px;padding:6px 12px;font-weight:600}'
      + '#apcs-labkey-md .lk-print{float:right;cursor:pointer;border:1px solid #c3ccdb;background:#fff;'
      + 'color:#12203a;border-radius:6px;padding:6px 12px;font-weight:600;margin-right:8px}'
      + '";\n'
    + '    document.head.appendChild(s);\n'
    + '  }\n'
    + '\n'
    + '  function labKeyHTML(k){\n'
    + '    var h = \'<button class="lk-close" id="apcs-labkey-x">Close</button>\'\n'
    + '      + \'<button class="lk-print" id="apcs-labkey-p">Print</button>\'\n'
    + '      + "<h3>"+esc(k.title)+"</h3>"\n'
    + '      + \'<p class="lk-sub">\'+esc(k.course)+" &middot; lesson "+esc(k.lesson_id)+" &middot; "+k.points\n'
    + '      + " point"+(k.points===1?"":"s")+(k.graded?" &middot; graded":" &middot; practice, records nothing")+"</p>";\n'
    + '    h += "<h4>Rubric, one check one point</h4><ul>";\n'
    + '    k.rubric.forEach(function(r){\n'
    + '      h += "<li><b>"+r.n+". "+esc(r.label)+"</b><br><span class=\\"lk-why\\">"+esc(r.satisfied_by)+"</span></li>";\n'
    + '    });\n'
    + '    h += "</ul><h4>Reference walkthrough</h4><ol>";\n'
    + '    k.walkthrough.forEach(function(w){\n'
    + '      h += "<li>"+(w.kind==="command" ? "<code>"+esc(w.text)+"</code>"\n'
    + '        : esc(w.text)+(w.correct?" &rarr; <span class=\\"lk-right\\">"+esc(w.correct)+"</span>":""))+"</li>";\n'
    + '    });\n'
    + '    h += "</ol><h4>Questions</h4>";\n'
    + '    k.questions.forEach(function(q){\n'
    + '      h += "<p style=\\"margin:12px 0 4px\\"><b>"+esc(q.prompt)+"</b></p><ul>";\n'
    + '      q.options.forEach(function(o){\n'
    + '        h += "<li>"+(o.correct?\'<span class="lk-right">\'+esc(o.text)+" &check;</span>":esc(o.text))+"</li>";\n'
    + '      });\n'
    + '      h += "</ul>"+(q.why?\'<p class="lk-why">\'+esc(q.why)+"</p>":"");\n'
    + '    });\n'
    + '    return h + \'<p class="lk-note">\'+esc(k.disclosure)+"</p>";\n'
    + '  }\n'
    + '\n'
    + '  function openLabKey(course, item){\n'
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
    + '    fetch(CFG.API+"/api/labs/"+encodeURIComponent(course)+"/"+encodeURIComponent(item)+"/key",\n'
    + '      { headers: STATE.token ? { Authorization:"Bearer "+STATE.token } : {} })\n'
    + '      .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; }); })\n'
    + '      .then(function(res){\n'
    + '        if(!res.ok || !res.j || !res.j.key){\n'
    + '          md.innerHTML = \'<button class="lk-close" id="apcs-labkey-x">Close</button>\'\n'
    + '            + "<h3>Not available</h3><p>The answer key is for signed-in teachers with this course. "\n'
    + '            + "If you are signed in and still see this, your access to AP Cybersecurity is not active.</p>";\n'
    + '        } else { md.innerHTML = labKeyHTML(res.j.key); }\n'
    + '        var x = document.getElementById("apcs-labkey-x");\n'
    + '        if(x) x.addEventListener("click", function(){ ov.remove(); });\n'
    + '        var p = document.getElementById("apcs-labkey-p");\n'
    + '        if(p) p.addEventListener("click", function(){ window.print(); });\n'
    + '      })\n'
    + '      .catch(function(){ md.innerHTML = "<p>The key could not be loaded. Try again in a moment.</p>"; });\n'
    + '  }\n'
    + '\n'
    + '  document.addEventListener("click", function(e){\n'
    + '    var b = e.target && e.target.closest ? e.target.closest(".lab-key-btn") : null;\n'
    + '    if(!b) return;\n'
    + '    e.preventDefault();\n'
    + '    openLabKey(b.getAttribute("data-key-course"), b.getAttribute("data-key-item"));\n'
    + '  });\n'
    + '  ' + MARK + ' end\n';
}

function patch(body) {
  if (!body.includes('var STU = {')) throw new Error('this is not the cyber command center body');
  if (!body.includes('CFG.API') && !body.includes('API: "https://progress.apcsexamprep.com"')) {
    throw new Error('the page does not name the API origin this panel calls');
  }
  if (body.includes(MARK)) return { body, changed: false };

  const byLesson = labsByLesson();
  if (!Object.keys(byLesson).length) throw new Error('no ap-cybersecurity lab specs, so there is no key to show');

  // 1. the code, inserted inside the existing IIFE so it shares CFG/STATE/esc.
  const fnAnchor = '  function studentSection(l, unlocked){';
  if (body.split(fnAnchor).length - 1 !== 1) {
    throw new Error('studentSection is not where this script expects it');
  }
  let out = body.replace(fnAnchor, panelCode(byLesson) + '\n' + fnAnchor);

  // 2. the call, so a lesson row actually renders the button.
  const callAnchor = '      +     studentSection(l, unlocked)\n';
  if (out.split(callAnchor).length - 1 !== 1) {
    throw new Error('the lessonHTML body is not where this script expects it');
  }
  out = out.replace(callAnchor, callAnchor + '      +     labKeySection(l, unlocked)\n');

  return { body: out, changed: true };
}

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

function main(argv) {
  const [ccIn, out] = argv;
  if (!ccIn || !out) {
    console.error('usage: node scripts/cyber-lab-key-panel.js <command-center.html> <out.csv>');
    process.exit(2);
  }
  const before = fs.readFileSync(ccIn, 'utf8');
  const { body, changed } = patch(before);
  if (!changed) { console.log('    already carries the key panel, nothing to import'); return; }

  // The page must not contain an answer. If it does, this script built the key
  // into the markup instead of fetching it, and importing would publish it.
  //
  // Only distinctive strings are worth testing. An option like `-r` is two
  // characters and occurs in any HTML by accident, so a substring test on it
  // reports a leak that is not one and teaches everybody to ignore this check.
  // Eight characters is the line: long enough that a match means something.
  const DISTINCTIVE = 8;
  const leaked = [];
  for (const spec of labs.all()) {
    for (const q of spec.questions || []) {
      for (const text of [q.options[q.answer], q.explain]) {
        if (!text || text.length < DISTINCTIVE) continue;
        if (body.includes(text) && !before.includes(text)) leaked.push(text.slice(0, 60));
      }
    }
    for (const step of spec.solution || []) {
      if (typeof step !== 'string' || step.length < DISTINCTIVE) continue;
      if (body.includes(step) && !before.includes(step)) leaked.push(step);
    }
  }
  if (leaked.length) {
    throw new Error('the patched body contains key content, so importing it would publish the answers: '
      + JSON.stringify(leaked));
  }
  if (body.length <= before.length) throw new Error('the edit did not grow the body');

  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(csvCell).join(',')];
  lines.push([CC_HANDLE, 'MERGE', body, 'TRUE', PUBLISHED_AT].map(csvCell).join(','));
  fs.writeFileSync(out, '﻿' + lines.join('\n') + '\n', 'utf8');

  console.log(`    ${CC_HANDLE}: +${body.length - before.length} bytes`);
  console.log(`    lessons with a key button: ${Object.keys(labsByLesson()).join(', ')}`);
  console.log(`\nWrote 1 page edit to ${out}`);
  console.log('The page holds lab ids only. The key itself is fetched with the teacher bearer.');
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (e) { console.error('REFUSED: ' + e.message); process.exit(1); }
}

module.exports = { patch, labsByLesson, panelCode, MARK, CC_HANDLE };
