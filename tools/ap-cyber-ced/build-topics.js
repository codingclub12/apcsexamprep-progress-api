#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  BUILD data/cyber-topics.json - THE CANONICAL AP CYBERSECURITY TAXONOMY.
//
//  ── WHAT IT IS FOR ──────────────────────────────────────────────────────────
//  One file that answers "what is topic 3.2 called, where does it live, and
//  which skill categories can it assess", so that 24 pages become one
//  reviewable sheet instead of 24 judgement calls. Every generator, every
//  Matrixify sheet and every quiz item id downstream reads this file and
//  nothing else.
//
//  ── WHERE EACH FIELD COMES FROM, AND WHERE IT DOES NOT ──────────────────────
//    title        the CED text, via tools/ap-cyber-ced/topics-parse.js. NOT
//                 from page HTML, not from a handle, not from memory. The
//                 recurring 1.3 versus 1.4 swap exists precisely because the
//                 mapping was living in page bodies: the site calls 1.3
//                 "Wireless Security", the CED calls it "Best Practices for
//                 Public Networks", and both were true somewhere.
//    slug         derived from the title, deterministically. This is a NAME,
//                 not a route. Nothing may rename a live page to match it:
//                 renaming a handle is on the NEVER_AUTO list and this file is
//                 not a licence to do it.
//    lesson_ids   the gradebook lesson ids for the topic, read out of
//                 utils.pageFromHandle by asking it what each live handle
//                 tracks as. Derived, never typed: a hand-written second copy
//                 of that map is how the site and the server drift apart.
//    handles      the live page handles that pageFromHandle files under this
//                 topic, intersected with the committed live-handle inventory.
//                 Empty means no page tracks this topic today, which is a fact
//                 worth seeing rather than a hole to fill with a guess.
//    skills       the topic's own SUGGESTED SKILLS block, read down to
//                 category numbers.
//
//  ── WHAT IT DELIBERATELY DOES NOT DECIDE ────────────────────────────────────
//  Which handle a NEW page should use. Units 1 and 2 use topic slugs and Units
//  3 to 5 use numbered slugs (board task 81), and reconciling those is a
//  decision about live URLs, not a parse. Both forms are recorded; neither is
//  blessed here.
//
//  ── SAFETY ──────────────────────────────────────────────────────────────────
//  Writes exactly one file, data/cyber-topics.json, and refuses to write at all
//  unless the parse produces the 24 topics the CED has, every title is plain
//  ASCII with no mojibake, and every topic names at least one skill category.
//  Byte-identical on a second run, which is what makes it safe to re-run and
//  diff rather than trust.
//
//  Zero PII: author content only.
//  No em-dashes, per repo convention.
//
//  Run: node tools/ap-cyber-ced/build-topics.js [--check]
//       --check exits non-zero if the committed file is not what this rebuild
//               produces, and writes nothing. That is the form CI wants.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseTopics, SKILL_CATEGORIES, EXPECTED_TOPICS } = require('./topics-parse');
const { pageFromHandle } = require('../../utils');
const { findMojibake } = require('./mojibake');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'cyber-topics.json');
const COURSE = 'ap-cybersecurity';

const EXTRACTS = [
  path.join(__dirname, 'CED-UNIT1-EXTRACT.txt'),
  path.join(__dirname, 'CED-UNITS-2-5-EXTRACT.txt'),
];
const HANDLE_INVENTORY = path.join(ROOT, 'smoke', 'fixtures', 'live-page-handles.txt');

//  A CED topic taught across more than one site lesson id names the id the
//  manifest row is filed under. Unit 3 is the only case: the site teaches CED
//  3.1 as two pages (3.1a Network Fundamentals, 3.1b Network Attacks), and a
//  manifest row for a lesson id the course config does not list would add a
//  phantom "3.1" column to every cyber gradebook, because lib/gradebook-contract.js
//  builds its lesson grid from the manifest as well as from the config.
const MANIFEST_LESSON = { '3.1': '3.1a' };

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

//  lesson id -> the live handles that track as that lesson's LESSON page.
//  Asking pageFromHandle rather than restating its maps is the whole point:
//  when Unit 3's renumbering changed which handle is 3.2, this follows.
function handlesByLesson() {
  const out = new Map();
  const handles = fs.readFileSync(HANDLE_INVENTORY, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const handle of handles) {
    const page = pageFromHandle(handle);
    if (!page || page.course !== COURSE || page.activity_type !== 'lesson') continue;
    if (!out.has(page.lesson)) out.set(page.lesson, []);
    out.get(page.lesson).push(handle);
  }
  for (const list of out.values()) list.sort();
  return out;
}

//  Every lesson id that belongs to a CED topic. '3.1a' and '3.1b' both belong
//  to topic 3.1; every other cyber lesson id IS its topic number.
function lessonIdsFor(topic, byLesson) {
  const ids = [...byLesson.keys()].filter((id) => id === topic || /^\d\.\d[a-z]$/.test(id) && id.slice(0, 3) === topic);
  //  A topic with no live lesson page still gets its own id, so downstream code
  //  never has to cope with an empty list.
  return ids.length ? ids.sort() : [topic];
}

function build() {
  const topics = [];
  for (const file of EXTRACTS) topics.push(...parseTopics(fs.readFileSync(file, 'utf8')));

  const byLesson = handlesByLesson();

  const rows = topics.map((t) => {
    const lesson_ids = lessonIdsFor(t.topic, byLesson);
    const handles = lesson_ids.flatMap((id) => byLesson.get(id) || []);
    return {
      unit: `unit-${t.unit_no}`,
      unit_no: t.unit_no,
      topic: t.topic,
      title: t.title,
      slug: slugify(t.title),
      skill_categories: t.skill_categories,
      lesson_ids,
      handles,
      manifest: {
        lesson_id: MANIFEST_LESSON[t.topic] || t.topic,
        item_id: `${t.topic}-visit`,
        item_type: 'visit',
        points: 1,
      },
    };
  });

  return {
    _source: {
      generated_by: 'tools/ap-cyber-ced/build-topics.js',
      course: COURSE,
      ced: 'ap-cybersecurity-course-and-exam-description, effective Fall 2026, (c) 2026 College Board',
      ced_extracts: EXTRACTS.map((f) => ({
        file: path.relative(ROOT, f).split(path.sep).join('/'),
        sha256: sha256(f),
      })),
      handle_inventory: {
        file: path.relative(ROOT, HANDLE_INVENTORY).split(path.sep).join('/'),
        sha256: sha256(HANDLE_INVENTORY),
        note: 'a snapshot of live page handles; handles are resolved through utils.pageFromHandle',
      },
      known_limits: [
        'Topic 1.1 lists skill category 1 only. Its SUGGESTED SKILLS block ends at a page break in the CED text, and topics 1.2 through 1.4 list categories 1 and 2, so 1.1 may list a second category on a page this dump does not carry. Recorded as the text states rather than filled in by inference; smoke/cyber-topics.js pins the set so a re-extraction that disagrees shows up as a diff.',
        'The site teaches CED 3.1 as two lesson pages (3.1a, 3.1b), so 24 topics map to 25 lesson pages in Units 1 to 5. The manifest row for 3.1 is filed under lesson 3.1a.',
        'Units 1 and 2 use topic-slug handles, Units 3 to 5 use numbered handles. Board task 81. The slug field here is a name, not a rename instruction.',
      ],
    },
    course: COURSE,
    skill_categories: SKILL_CATEGORIES,
    topics: rows,
  };
}

//  Refusals, not warnings. A taxonomy that is wrong about a title is worse than
//  no taxonomy: every sheet downstream would then be wrong in the same way and
//  the validator would agree with itself.
function verify(doc) {
  const fail = [];
  const seen = doc.topics.map((t) => t.topic);

  if (seen.length !== EXPECTED_TOPICS.length) {
    fail.push(`parsed ${seen.length} topics, the CED has ${EXPECTED_TOPICS.length}`);
  }
  const missing = EXPECTED_TOPICS.filter((t) => !seen.includes(t));
  const extra = seen.filter((t) => !EXPECTED_TOPICS.includes(t));
  if (missing.length) fail.push(`missing topics: ${missing.join(', ')}`);
  if (extra.length) fail.push(`topics the CED does not have: ${extra.join(', ')}`);
  if (new Set(seen).size !== seen.length) fail.push('a topic number appears twice');

  for (const t of doc.topics) {
    if (!t.title) fail.push(`${t.topic} has no title`);
    if (/[^\x20-\x7e]/.test(t.title)) fail.push(`${t.topic} title is not plain ASCII: ${JSON.stringify(t.title)}`);
    if (findMojibake(t.title).length) fail.push(`${t.topic} title carries mojibake: ${JSON.stringify(t.title)}`);
    if (/TOPIC|Required Course Content|return to contents/i.test(t.title)) {
      fail.push(`${t.topic} title picked up page furniture: ${JSON.stringify(t.title)}`);
    }
    if (t.title.length > 90) fail.push(`${t.topic} title is implausibly long: ${t.title.length} chars`);
    if (!t.skill_categories.length) fail.push(`${t.topic} names no skill category`);
    for (const c of t.skill_categories) {
      if (!SKILL_CATEGORIES[c]) fail.push(`${t.topic} names skill category ${c}, which does not exist`);
    }
    if (!t.slug) fail.push(`${t.topic} has no slug`);
    if (t.manifest.item_id !== `${t.topic}-visit`) fail.push(`${t.topic} manifest item id is wrong`);
  }
  return fail;
}

function serialize(doc) {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const doc = build();
  const fail = verify(doc);
  if (fail.length) {
    console.error('REFUSED, the taxonomy did not verify:');
    for (const f of fail) console.error(`  ${f}`);
    process.exit(1);
  }

  const text = serialize(doc);
  const exists = fs.existsSync(OUT);

  if (check) {
    if (!exists) { console.error(`${path.relative(ROOT, OUT)} does not exist; run without --check`); process.exit(1); }
    const have = fs.readFileSync(OUT, 'utf8');
    if (have !== text) {
      console.error(`${path.relative(ROOT, OUT)} is not what a rebuild produces. Re-run without --check and commit the diff.`);
      process.exit(1);
    }
    console.log(`${path.relative(ROOT, OUT)} matches a fresh rebuild (${doc.topics.length} topics)`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const changed = !exists || fs.readFileSync(OUT, 'utf8') !== text;
  fs.writeFileSync(OUT, text);
  console.log(`${changed ? 'wrote' : 'unchanged'} ${path.relative(ROOT, OUT)}: ${doc.topics.length} topics`);
  for (const t of doc.topics) {
    console.log(`  ${t.topic.padEnd(4)} ${t.title.padEnd(74)} skills ${t.skill_categories.join(',')}  ${t.handles.length ? t.handles.join(' ') : 'NO LIVE PAGE'}`);
  }
}

if (require.main === module) main();

module.exports = { build, verify, serialize, slugify, MANIFEST_LESSON };
