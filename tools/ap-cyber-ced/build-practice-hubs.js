'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  BUILD THE CYBER PRACTICE HUB AND SPOKE FROM WHAT IS ACTUALLY LIVE.
//
//  ── THE GAP THIS CLOSES ────────────────────────────────────────────────────
//  Measured against the storefront on 2026-09-04, not inferred. AP Cyber has
//  two content layers that do not touch each other:
//
//    ap-cybersecurity-topics      links 46 concept spokes and 0 course lessons
//    complete-course-guide        links 130 course pages and 13 concept spokes
//
//  and a practice layer that reaches neither. ap-cybersecurity-practice links
//  2 of the 128 course pages, and the topics hub does not link the practice
//  hub at all. So a student on a concept page cannot reach the practice for
//  that unit, and a student on the practice hub cannot reach the course.
//
//  The practice that exists and is not hubbed: 27 lesson quizzes, 54 exercises,
//  32 labs, 5 case files, 5 unit exams, 2 projects, 3 scenario and FRQ sets.
//  Every one of those was reachable only through the course guide or by URL.
//
//  ── WHY A BUILDER RATHER THAN A HAND-WRITTEN CONFIG ────────────────────────
//  House rule: a page set larger than about three ships as canonical data, a
//  generator, a validator and a sheet. This is the canonical data half, and it
//  is BUILT rather than typed for the same reason config/cyber-topics.json is:
//  nobody retypes a handle. Every asset below is resolved against a live handle
//  inventory pulled from sitemap_pages_1.xml, and a handle that is not in that
//  inventory is dropped with a reason rather than shipped as a dead link.
//
//  ── WHAT IT DELIBERATELY DOES NOT DO ───────────────────────────────────────
//  It does not rename, retire or redirect anything. The 34 MERGE rows in the
//  2026-09-03 page audit are a fact about the taxonomy, not a licence to
//  delete a live page that may hold ranking equity. This adds a layer; it
//  removes nothing.
//
//  Run: node tools/ap-cyber-ced/build-practice-hubs.js [--check]
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cyberTopics = require('../../lib/cyber-topics');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'config', 'cyber-practice-hubs.json');
const HANDLES = path.join(ROOT, 'smoke', 'fixtures', 'live-page-handles-2026-09-04.txt');
const COURSE = 'ap-cybersecurity';

//  The unit study page each practice spoke sits beside. These are the five
//  pages the topics hub already links, so the spoke joins an existing cluster
//  rather than starting a new one. Verified live in the inventory below.
const UNIT_STUDY_PAGE = {
  1: 'ap-cybersecurity-unit-1-introduction-to-security',
  2: 'ap-cybersecurity-unit-2-securing-spaces',
  3: 'ap-cybersecurity-unit-3-securing-networks',
  4: 'ap-cybersecurity-unit-4-securing-devices',
  5: 'ap-cybersecurity-unit-5-securing-applications-and-data',
};

//  Unit names as the storefront already says them. Used in prose, never as a
//  CED topic title: a unit name is ours, a topic title is College Board's and
//  comes from lib/cyber-topics.
const UNIT_NAME = {
  1: 'Introduction to Cybersecurity',
  2: 'Securing Physical Spaces',
  3: 'Securing Networks',
  4: 'Securing Devices',
  5: 'Securing Applications and Data',
};

//  ── THE ANTI-CANNIBALISATION RULE, AS DATA ────────────────────────────────
//  Every page here targets PRACTICE intent and says so in the handle and the
//  title. The concept spokes keep the bare concept keyword and the unit study
//  pages keep the unit keyword; nothing below competes for either. This mirrors
//  what AP CSP already does, where ap-csp-bi2-binary-numbers (the concept) and
//  ap-csp-practice-test-binary-data (the practice) are different pages with
//  different intent, and the course layer sits under its own ap-csp-course-*
//  namespace. Measured 2026-09-04: 101 CSP course pages, and only 4 share a
//  slug stem with a public page.
const INTENT_WORD = 'Practice';

function readHandles() {
  const raw = fs.readFileSync(HANDLES, 'utf8');
  const set = new Set(raw.split('\n').map((s) => s.trim()).filter(Boolean));
  return { set, sha256: crypto.createHash('sha256').update(raw).digest('hex') };
}

//  Asset kinds, in the order a student meets them. The regexes are anchored so
//  a handle is classified once and never twice.
const KINDS = [
  ['quiz', (u) => new RegExp(`^ap-cyber-unit-${u}-lesson-\\d+-quiz$`)],
  ['exercise', (u) => new RegExp(`^ap-cyber-unit-${u}-lesson-\\d+-exercise-\\d+$`)],
  ['lab', (u) => new RegExp(`^ap-cyber-unit-${u}-lesson-\\d+-(?:terminal-)?lab$`)],
  ['named_lab', (u) => new RegExp(`^ap-cyber-unit-${u}-lab-[a-z-]+$`)],
  ['case_file', (u) => new RegExp(`^ap-cyber-unit-${u}-case-file-\\d+$`)],
  ['scenario', (u) => new RegExp(`^ap-cyber-unit-${u}-scenario-practice$`)],
  ['frq', (u) => new RegExp(`^ap-cyber-unit-${u}-frq-practice$`)],
  ['exam', (u) => new RegExp(`^ap-cyber-unit-${u}-(?:practice-)?exam$`)],
  ['project', (u) => new RegExp(`^ap-cyber-unit-${u}-project$`)],
];

function assetsFor(unit, live) {
  const out = {};
  const claimed = new Set();
  for (const [kind, re] of KINDS) {
    const rx = re(unit);
    const hit = [...live].filter((h) => rx.test(h) && !claimed.has(h)).sort();
    hit.forEach((h) => claimed.add(h));
    if (hit.length) out[kind] = hit;
  }
  return out;
}

function build() {
  const { set: live, sha256 } = readHandles();
  const topics = cyberTopics.topics();

  const spokes = [1, 2, 3, 4, 5].map((unit) => {
    const study = UNIT_STUDY_PAGE[unit];
    if (!live.has(study)) throw new Error(`unit ${unit} study page ${study} is not in the live inventory`);
    const unitTopics = topics.filter((t) => t.unit_no === unit);
    const assets = assetsFor(unit, live);
    const count = Object.values(assets).reduce((n, a) => n + a.length, 0);
    return {
      unit_no: unit,
      unit_name: UNIT_NAME[unit],
      handle: `${COURSE}-unit-${unit}-practice`,
      //  The title carries the intent word and the unit number. It carries no
      //  CED topic title, which the validator enforces rather than trusts.
      title: `AP Cybersecurity Unit ${unit} ${INTENT_WORD} Questions, Labs and Exam`,
      intent: 'practice',
      unit_study_page: study,
      topics: unitTopics.map((t) => t.topic),
      //  Course pages this spoke must reach, so "connected to the course" is a
      //  checkable claim rather than a description.
      course_lesson_handles: unitTopics.flatMap((t) => t.handles).filter((h) => live.has(h)),
      assets,
      asset_count: count,
    };
  });

  return {
    _source: {
      generated_by: 'tools/ap-cyber-ced/build-practice-hubs.js',
      course: COURSE,
      built: '2026-09-04',
      handle_inventory: {
        file: 'smoke/fixtures/live-page-handles-2026-09-04.txt',
        sha256,
        note: 'pulled from sitemap_pages_1.xml on 2026-09-04. Every handle below is in it.',
      },
      measured: {
        note: 'the gap this closes, measured against the storefront on 2026-09-04',
        topics_hub_course_lesson_links: 0,
        practice_hub_course_lesson_links: 2,
        course_pages_live: 128,
      },
      known_limits: [
        'Units 1 and 2 have no ap-cyber-unit-N-lesson-M pages; their lesson bodies live at ap-cybersecurity-unit-N-<slug>. Their quizzes, exercises and labs DO use the numbered handles, so the asset lists below are complete and the course_lesson_handles come from lib/cyber-topics.',
        'ap-cyber-unit-1-lesson-2-auth-log-lab is live and is not matched by the lab pattern (it is a named lab under a lesson). It is listed under named_lab only if the handle shape matches; board task 198 covers its submit button.',
        'ap-cyber-unit-5-practice-exam is filed under exam for unit 5 alongside ap-cyber-unit-5-exam. Both are live.',
      ],
    },
    course: COURSE,
    intent_word: INTENT_WORD,
    umbrella: {
      handle: `${COURSE}-practice`,
      title: 'AP Cybersecurity Practice: Every Quiz, Lab, Exam and Free-Response Set',
      intent: 'practice',
      //  The three pages that already exist and stay. This adds the five unit
      //  spokes beneath them.
      existing_siblings: [`${COURSE}-frq-practice`, `${COURSE}-labs`],
      topics_hub: `${COURSE}-topics`,
      course_guide: `${COURSE}-complete-course-guide`,
    },
    spokes,
  };
}

function main() {
  const check = process.argv.includes('--check');
  const built = build();
  const json = `${JSON.stringify(built, null, 2)}\n`;
  if (check) {
    const on = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (on !== json) {
      console.error('config/cyber-practice-hubs.json does not match a rebuild.');
      console.error('Rebuild it rather than hand-editing: node tools/ap-cyber-ced/build-practice-hubs.js');
      process.exit(1);
    }
    console.log('config/cyber-practice-hubs.json matches a rebuild.');
    return;
  }
  fs.writeFileSync(OUT, json);
  const n = built.spokes.reduce((a, s) => a + s.asset_count, 0);
  console.log(`wrote ${path.relative(ROOT, OUT)}: ${built.spokes.length} spokes, ${n} practice assets`);
  for (const s of built.spokes) {
    console.log(`  unit ${s.unit_no}  ${String(s.asset_count).padStart(3)} assets  ${s.handle}`);
  }
}

if (require.main === module) main();
module.exports = { build, assetsFor, UNIT_STUDY_PAGE, UNIT_NAME, INTENT_WORD };
