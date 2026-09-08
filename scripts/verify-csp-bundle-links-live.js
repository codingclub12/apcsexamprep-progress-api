#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  BOARD 91: "CSP bundle links to exercise pages that do not exist."
//
//  Measured 2026-09-06 and the answer is that it is already fixed. This exists so
//  the claim is re-derivable rather than a report, and so it goes red again if
//  the links rot a second time.
//
//  ── THE THING THAT MAKES THIS CHECK NON-OBVIOUS ─────────────────────────────
//  The command center's links are DATA, not markup. Its body carries 187
//  references to /pages/ and exactly TWO of them are <a href> tags; the other
//  127 sit in a JSON blob as pageLinks:[{href,label}] that the page renders at
//  runtime. An anchor-scraping sweep finds two links, calls the page clean, and
//  is wrong about 98% of it. That is the first sweep this file replaced.
//
//  ── WHAT IS CHECKED ─────────────────────────────────────────────────────────
//    1. every handle linked from the bundle surfaces resolves
//    2. the detector is shown FAILING on a handle that does not exist, before
//       any "all clear" is believed
//    3. the exercise pages behind those links carry actual exercise widgets,
//       because a dead link closed by creating an empty page would satisfy 1
//
//  Rule 3 does NOT apply to guided-notes pages. They are notes and have no
//  answer widget by design, and a first draft of this flagged all eighteen of
//  them as thin, which is an exercise-shaped rule pointed at the wrong page type.
//
//  Fetches go through lib/storefront-fetch.js and send NO User-Agent.
//
//  Run: node scripts/verify-csp-bundle-links-live.js
// -----------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch');
const { extract } = require('./extract-live-body');

const PAGE_SURFACES = ['csp-command-center', 'ap-csp-teacher-superpack'];
const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); };

function alive(handle) {
  try { sf.page('/pages/' + handle, { timeout: 30 }); return 200; }
  catch (e) { const m = /answered (\d{3})/.exec(String(e.message)); return m ? Number(m[1]) : 'refused'; }
}

//  ── 0. the detector, proven in the failing direction FIRST ──────────────────
{
  const fake = alive('this-page-does-not-exist-xyzzy-9999');
  if (fake === 200) {
    console.log('  ABORT: a handle that cannot exist answered 200, so this check cannot tell');
    console.log('         a live page from a dead one. Nothing below would mean anything.');
    process.exit(1);
  }
  console.log('  detector: a nonexistent handle is refused (' + fake + '). ok');
}

//  ── 1. every linked handle resolves ─────────────────────────────────────────
const links = new Map();
for (const s of PAGE_SURFACES) {
  const body = extract(sf.page('/pages/' + s, { timeout: 45 }).body);
  for (const m of body.matchAll(/\{"href":"\/pages\/([^"#?]+?)","label":"([^"]*)"/g)) {
    if (!links.has(m[1])) links.set(m[1], []);
    links.get(m[1]).push({ label: m[2], surface: s });
  }
  for (const m of body.matchAll(/href="\/pages\/([a-z0-9-]+)"/g)) {
    if (!links.has(m[1])) links.set(m[1], []);
  }
}
const handles = [...links.keys()].sort();
ok(handles.length > 150, `only ${handles.length} handles found; the JSON blob may have changed shape and this check gone blind`);

const dead = [];
for (const h of handles) { const s = alive(h); if (s !== 200) dead.push({ h, s }); }
ok(dead.length === 0, `${dead.length} dead link(s): ` + dead.map((d) => `${d.h} (${d.s})`).join(', '));
console.log(`  ${handles.length} handles linked from the bundle surfaces, ${dead.length} dead`);

//  ── 2. the exercise pages are not empty shells ──────────────────────────────
const exercises = handles.filter((h) => /^ap-csp-topic-.*-exercise-\d+$/.test(h));
ok(exercises.length > 40, `only ${exercises.length} exercise pages linked; expected the full set`);
const empty = [];
for (const h of exercises) {
  let body = '';
  try { body = extract(sf.page('/pages/' + h, { timeout: 30 }).body); } catch (e) { empty.push(h + ' (unfetchable)'); continue; }
  const widgets = (body.match(/apcs-ex|check-answer|data-answer|<textarea|code-editor/gi) || []).length;
  if (body.length < 1500 || widgets === 0) empty.push(`${h} (${body.length} bytes, ${widgets} widgets)`);
}
ok(empty.length === 0, `${empty.length} exercise page(s) resolve but carry no exercise: ` + empty.join(', '));
console.log(`  ${exercises.length} exercise pages checked for content, ${empty.length} empty`);

console.log('');
if (problems.length) {
  console.log('  ' + problems.length + ' PROBLEM(S):');
  for (const p of problems) console.log('    ' + p);
  process.exit(1);
}
console.log('  all clear: no dead links on the CSP bundle surfaces, and every exercise page has an exercise.');
