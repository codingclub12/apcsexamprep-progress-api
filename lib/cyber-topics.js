'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CANONICAL AP CYBERSECURITY TAXONOMY, AS EVERYTHING ELSE SEES IT.
//
//  data/cyber-topics.json is the file; this is the only way to read it. One
//  loader means one shape, one validation, and one place a hand-edit gets
//  caught. Built by tools/ap-cyber-ced/build-topics.js from the CED text; see
//  that file for where each field comes from.
//
//  ── WHY A LOADER AND NOT A require() ────────────────────────────────────────
//  Because the interesting question is never "what does the JSON say", it is
//  "what is topic 3.2 called" and "which manifest rows does this course need".
//  A caller that answers those itself is a second opinion about the taxonomy,
//  and the whole point of the file is that there is only one.
//
//  It also fails LOUD. A missing or malformed file throws on first read rather
//  than returning an empty list, because an empty taxonomy would look exactly
//  like a course with no topics: the seed would write nothing, the generator
//  would emit an empty sheet, and every check downstream would pass.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'cyber-topics.json');
const COURSE = 'ap-cybersecurity';

//  The CED has exactly 24 topics: 1.1-1.5, 2.1-2.4, 3.1-3.5, 4.1-4.4, 5.1-5.6.
//  There is no 2.5, no 3.6 and no 4.5. A file that disagrees is refused rather
//  than believed, because every sheet downstream would inherit the error and
//  the validator would then agree with itself.
const TOPIC_COUNT = 24;

let doc = null;

function load() {
  if (doc) return doc;
  let raw;
  try {
    raw = fs.readFileSync(FILE, 'utf8');
  } catch (e) {
    throw new Error(`cyber-topics: cannot read ${FILE}: ${e.message}. Run node tools/ap-cyber-ced/build-topics.js`);
  }
  const parsed = JSON.parse(raw);
  const fail = shapeErrors(parsed);
  if (fail.length) {
    throw new Error(`cyber-topics: ${FILE} is not usable:\n  ${fail.join('\n  ')}`);
  }
  doc = parsed;
  return doc;
}

//  Structural only. The build script owns the semantic checks (titles come from
//  the CED, no mojibake, a skill category exists); this is the guard against a
//  file that was hand-edited or truncated after it was built.
function shapeErrors(d) {
  const fail = [];
  if (!d || typeof d !== 'object') return ['not an object'];
  if (d.course !== COURSE) fail.push(`course is ${JSON.stringify(d.course)}, expected ${COURSE}`);
  if (!Array.isArray(d.topics)) return fail.concat('topics is not an array');
  if (d.topics.length !== TOPIC_COUNT) fail.push(`${d.topics.length} topics, the CED has ${TOPIC_COUNT}`);
  const seen = new Set();
  for (const t of d.topics) {
    if (!/^\d\.\d$/.test(t.topic || '')) { fail.push(`bad topic number ${JSON.stringify(t.topic)}`); continue; }
    if (seen.has(t.topic)) fail.push(`topic ${t.topic} appears twice`);
    seen.add(t.topic);
    if (!t.title) fail.push(`topic ${t.topic} has no title`);
    if (!Array.isArray(t.lesson_ids) || !t.lesson_ids.length) fail.push(`topic ${t.topic} has no lesson ids`);
    if (!t.manifest || !t.manifest.item_id) fail.push(`topic ${t.topic} has no manifest row`);
  }
  return fail;
}

/** Every topic, in CED order. @returns {object[]} */
function topics() { return load().topics; }

/** One topic by its number, or null. @param {string} n e.g. '3.2' */
function topic(n) { return topics().find((t) => t.topic === n) || null; }

/**
 * The official CED title for a topic number.
 * Throws on an unknown topic: a generator that asks for 3.6 has a bug, and a
 * silent undefined would ship as an empty page title.
 * @param {string} n
 * @returns {string}
 */
function titleOf(n) {
  const t = topic(n);
  if (!t) throw new Error(`cyber-topics: no CED topic ${n}. The CED has ${TOPIC_COUNT} topics and no ${n}.`);
  return t.title;
}

/** The topic a live page handle belongs to, or null for a page that is not a lesson. */
function topicOfHandle(handle) {
  return topics().find((t) => (t.handles || []).includes(handle)) || null;
}

/** The topic a gradebook lesson id belongs to ('3.1a' -> topic 3.1), or null. */
function topicOfLesson(lesson) {
  return topics().find((t) => (t.lesson_ids || []).includes(lesson)) || null;
}

/**
 * The course_manifest rows this taxonomy asks for: one visit row per CED topic.
 *
 * One row per TOPIC, not per lesson page, so the count is the CED's 24 and the
 * denominator a teacher sees is the course they were sold. Unit 3 teaches CED
 * 3.1 across two pages and the row is filed under the first of them; see
 * MANIFEST_LESSON in tools/ap-cyber-ced/build-topics.js for why that matters.
 *
 * @returns {Array<{course, unit, lesson_id, item_id, item_type, points}>}
 */
function manifestRows() {
  return topics().map((t) => ({
    course: COURSE,
    unit: t.unit,
    lesson_id: t.manifest.lesson_id,
    item_id: t.manifest.item_id,
    item_type: t.manifest.item_type,
    points: t.manifest.points,
  }));
}

/** Test seam: forget the cached file so a rebuild can be read back. */
function reset() { doc = null; }

module.exports = {
  FILE, COURSE, TOPIC_COUNT,
  load, shapeErrors, topics, topic, titleOf, topicOfHandle, topicOfLesson, manifestRows, reset,
};
