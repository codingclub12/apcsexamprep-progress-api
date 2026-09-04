'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CYBER PRACTICE HUB AND SPOKE, AS A GRAPH THAT CAN BE CHECKED.
//
//  ── WHAT THIS IS FOR ───────────────────────────────────────────────────────
//  config/cyber-practice-hubs.json says what exists. This says what must be
//  TRUE of it, so that "the practice hub is connected to the course" is a
//  claim a machine can refuse rather than a sentence in a run note.
//
//  Read through here, never by requiring the JSON directly, for the same
//  reason cyber topics go through lib/cyber-topics: one reader means one
//  opinion about the shape, and a second opinion is how the 3.3/3.4 swap
//  survived as long as it did.
//
//  ── THE FOUR EDGES THAT MAKE IT A HUB AND SPOKE ────────────────────────────
//  A hub page that links its spokes and spokes that link nothing back is a
//  list, not an architecture, and the orphan stays invisible the moment a
//  student lands on it from search. So all four directions are named here and
//  every one is enforced in tools/ap-cyber-ced/practice-validator.js:
//
//      umbrella -> spoke     the hub reaches all five units
//      spoke -> umbrella     a student who lands on unit 3 from search can
//                            reach the other four
//      spoke -> course       the connection the ask was actually about
//      spoke -> unit study   the spoke joins the cluster the topics hub
//                            already links, instead of starting a new island
//
//  ── ZERO PII ───────────────────────────────────────────────────────────────
//  Page handles and titles only. Nothing here reads student data, the attempts
//  table or the manifest, so this can never become a second disagreeing source
//  of truth about what a student has done.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'config', 'cyber-practice-hubs.json');
const STOREFRONT = 'https://www.apcsexamprep.com';

let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(FILE)) {
    throw new Error(`config/cyber-practice-hubs.json is missing. Build it: node tools/ap-cyber-ced/build-practice-hubs.js`);
  }
  const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const errs = shapeErrors(parsed);
  if (errs.length) {
    throw new Error(`config/cyber-practice-hubs.json is malformed:\n  ${errs.join('\n  ')}`);
  }
  cache = parsed;
  return cache;
}

function reset() { cache = null; }

//  Shape errors are the ones that make every downstream answer meaningless, so
//  they throw at load rather than surfacing as a confusing failure later.
function shapeErrors(doc) {
  const out = [];
  if (!doc || typeof doc !== 'object') return ['not an object'];
  if (doc.course !== 'ap-cybersecurity') out.push(`course is ${JSON.stringify(doc.course)}`);
  if (!doc.umbrella || !doc.umbrella.handle) out.push('no umbrella handle');
  if (!Array.isArray(doc.spokes)) return out.concat('spokes is not an array');
  if (doc.spokes.length !== 5) out.push(`expected 5 spokes, found ${doc.spokes.length}`);
  const seen = new Set();
  for (const s of doc.spokes) {
    if (!s.handle) { out.push(`unit ${s.unit_no} has no handle`); continue; }
    if (seen.has(s.handle)) out.push(`duplicate spoke handle ${s.handle}`);
    seen.add(s.handle);
    if (!s.unit_study_page) out.push(`${s.handle} has no unit_study_page`);
    if (!Array.isArray(s.topics) || !s.topics.length) out.push(`${s.handle} has no topics`);
    if (!s.assets || !Object.keys(s.assets).length) out.push(`${s.handle} has no assets`);
  }
  return out;
}

const umbrella = () => load().umbrella;
const spokes = () => load().spokes;
const intentWord = () => load().intent_word;
const spoke = (unitNo) => spokes().find((s) => s.unit_no === Number(unitNo)) || null;
const pageUrl = (handle) => `${STOREFRONT}/pages/${handle}`;

//  Every asset handle on one spoke, flattened, in the order the kinds are
//  declared. Deduplicated because a handle must appear under exactly one kind.
function assetHandles(s) {
  const out = [];
  for (const list of Object.values(s.assets || {})) for (const h of list) if (!out.includes(h)) out.push(h);
  return out;
}

function allAssetHandles() {
  const out = [];
  for (const s of spokes()) for (const h of assetHandles(s)) if (!out.includes(h)) out.push(h);
  return out;
}

//  ── THE REQUIRED EDGES ─────────────────────────────────────────────────────
//  Returned as data rather than checked here, so the validator can report a
//  missing edge with the same vocabulary the builder used to declare it. Each
//  edge is {from, to, why}: the why is what a failure message prints, because
//  "spoke -> course missing" tells a reader nothing they can act on.
//  ── THE REVERSE EDGE, AND WHY IT IS PART OF THE CONTRACT ──────────────────
//  Measured live on 2026-09-04, the day the sheets were imported: the five
//  spokes had exactly ONE inbound path between them, topics hub to umbrella to
//  spoke, two hops. The course guide linked none of them, the Command Center
//  linked none, and all five UNIT STUDY PAGES linked none, which is the one
//  that matters: that is the page a student studying unit 3 is actually on,
//  the topics hub already links it, and it pointed at no practice at all.
//
//  A spoke already links UP to its unit study page. Without the edge back, the
//  hub and spoke is a one-way street: reachable if you start at the practice
//  hub, invisible if you start anywhere a student actually starts. So the
//  reverse edge is declared here rather than left to a later linking pass, and
//  rule P3 checks the sheet renders every one of them.
//
//  Deliberately NOT included: the 128 course lesson pages and the 63 concept
//  spokes. Both already link their unit study page, which now links practice,
//  so they are two hops rather than orphaned, and adding 191 more rows to this
//  sheet would be a different change with a different risk profile. That is the
//  internal-link pipeline's job.
function reverseSources() {
  const u = umbrella();
  const out = spokes().map((s) => ({
    from: s.unit_study_page,
    to: s.handle,
    label: `Unit ${s.unit_no} practice: quizzes, labs and the unit exam`,
    why: `unit ${s.unit_no} study page must reach unit ${s.unit_no} practice`,
  }));
  //  The two course-spine hubs reach the umbrella rather than one unit, because
  //  neither is about a single unit.
  //
  //  The course guide is marked `needs_repair`. It carries two links that are
  //  already dead (ap-cyber-unit-1-lesson-1, whose lessons actually live at
  //  ap-cybersecurity-unit-1-<slug>, and a plural ap-cybersecurity-study-guides
  //  where the live handle is singular). A Matrixify MERGE rewrites the WHOLE
  //  body, so adding a link to that page means republishing both dead ones, and
  //  rule R6 refuses the sheet rather than let that through. That refusal is
  //  correct and is why the flag exists: the generator gives this page its own
  //  output file, because repointing an anchor on the course's flagship page is
  //  a content decision a human should see on its own rather than buried in a
  //  seven-row linking sheet. Board 209.
  out.push({
    from: u.course_guide, to: u.handle,
    label: 'AP Cybersecurity practice: every quiz, lab and exam',
    why: 'the course guide must reach the practice hub',
    needs_repair: true,
  });
  out.push({
    from: 'cyber-command-center', to: u.handle,
    label: 'AP Cybersecurity practice hub',
    why: 'the teacher Command Center must reach the practice hub',
  });
  return out;
}

//  The two dead anchors on the course guide, and what each becomes.
//  Chosen rather than guessed:
//    ap-cybersecurity-study-guides is a plural typo; the singular handle is live.
//    ap-cyber-unit-1-lesson-1 does not exist in any form. Its anchor reads
//    "Start Unit 1" inside a "Start the Free Course Now" call to action, so it
//    points at Unit 1's own landing page, which is the page the topics hub
//    already links and the one a "start the unit" link belongs on. That second
//    one is the judgement in this change; the first is a typo fix.
const COURSE_GUIDE_REPAIRS = [
  { from: 'ap-cybersecurity-study-guides', to: 'ap-cybersecurity-study-guide' },
  { from: 'ap-cyber-unit-1-lesson-1', to: 'ap-cybersecurity-unit-1-introduction-to-security' },
];
const courseGuideRepairs = () => COURSE_GUIDE_REPAIRS.slice();

function requiredEdges() {
  const u = umbrella();
  const out = [];
  //  The topics hub is where a student browsing concepts already is, and it
  //  linked no practice page at all before this package. One edge closes that,
  //  and it is hub-down: editing the hub rescues every spoke beneath it, which
  //  is the rule docs/internal-linking.md states.
  out.push({ from: u.topics_hub, to: u.handle, why: 'the concept hub must reach the practice hub' });
  for (const e of reverseSources()) out.push({ from: e.from, to: e.to, why: e.why });
  for (const s of spokes()) {
    out.push({ from: u.handle, to: s.handle, why: `the practice hub must reach unit ${s.unit_no}` });
    out.push({ from: s.handle, to: u.handle, why: `unit ${s.unit_no} must reach the practice hub` });
    out.push({ from: s.handle, to: s.unit_study_page, why: `unit ${s.unit_no} practice must join its unit study page` });
    for (const c of s.course_lesson_handles) {
      out.push({ from: s.handle, to: c, why: `unit ${s.unit_no} practice must reach the course lesson ${c}` });
    }
  }
  return out;
}

//  Handles this package expects to already be live and does not create. A
//  generator that silently invents one of these ships a dead link.
function referencedExistingHandles() {
  const u = umbrella();
  const out = new Set([u.topics_hub, u.course_guide, ...(u.existing_siblings || [])]);
  //  The reverse-edge sources, and the handles a dead-anchor repair points AT.
  //  A repair target is a page this package expects to be live and does not
  //  create, which is exactly what this list is for; leaving it out made R6
  //  refuse the repaired body for naming a handle it could not see.
  for (const e of reverseSources()) out.add(e.from);
  for (const r of courseGuideRepairs()) out.add(r.to);
  for (const s of spokes()) {
    out.add(s.unit_study_page);
    for (const h of s.course_lesson_handles) out.add(h);
    for (const h of assetHandles(s)) out.add(h);
  }
  return [...out].sort();
}

//  The handles this package CREATES. Everything else it touches must pre-exist.
function createdHandles() {
  return [umbrella().handle, ...spokes().map((s) => s.handle)].sort();
}

module.exports = {
  FILE, STOREFRONT,
  load, reset, shapeErrors,
  umbrella, spokes, spoke, intentWord, reverseSources, courseGuideRepairs,
  assetHandles, allAssetHandles,
  requiredEdges, referencedExistingHandles, createdHandles,
  pageUrl,
};
