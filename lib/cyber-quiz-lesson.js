'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHICH LESSON DOES A CYBER QUIZ PAGE BELONG TO?
//
//  ── THE BUG THIS EXISTS TO PREVENT ─────────────────────────────────────────
//  The obvious answer is "read the digits out of the handle": ap-cyber-unit-3-
//  lesson-4-quiz is lesson 3.4. That is what the quiz extractor did, and it is
//  wrong for every page in Unit 3.
//
//  Unit 3 was renumbered onto the Fall 2026 CED (lib/cyber-unit3-renumber.js).
//  The renumbering shipped to the page BODIES and not to the handles, which are
//  a Shopify URL and stay put. So the handle carries the SITE number and the
//  page carries the CED number, and they differ by one across the whole unit:
//
//      ap-cyber-unit-3-lesson-2-quiz   handle says 3.2   page says 3.1  (3.1b)
//      ap-cyber-unit-3-lesson-3-quiz   handle says 3.3   page says 3.2
//      ap-cyber-unit-3-lesson-4-quiz   handle says 3.4   page says 3.3
//      ap-cyber-unit-3-lesson-5-quiz   handle says 3.5   page says 3.4
//
//  Reading the handle files a bank of firewall questions under Segmentation.
//  That is the defect CLAUDE.md records as "Unit 3 filed under retired lesson
//  ids", and it throws nowhere: every id is well formed, the seed runs clean,
//  and the gradebook grows a column of the wrong questions.
//
//  ── TWO SOURCES, AND THEY MUST AGREE ───────────────────────────────────────
//  1. config/cyber-topics.json, through lib/cyber-topics.js. Built from the CED
//     text extracts, so it is the authority on the number and the title.
//  2. What the page itself prints in its h1, which is what a student reads.
//
//  Neither alone is enough. The authority does not know Unit 2's quiz handles
//  (its lesson pages use descriptive handles, so topicOfHandle answers null),
//  and the page can print no number at all. Where both are available they are
//  compared and a disagreement is a REFUSAL, because a mismatch means one of
//  them has moved and guessing which would file the bank somewhere plausible.
//
//  ── TOPIC vs LESSON ID ─────────────────────────────────────────────────────
//  CED topic 3.1 is taught over two pages and keys two gradebook columns, 3.1a
//  and 3.1b, so the topic number and the lesson id are not the same string. The
//  pairing is positional: handles[i] goes with lesson_ids[i]. Both pages print
//  "3.1", because both ARE topic 3.1, so the page cross-check compares TOPIC
//  numbers and the bank is keyed on the LESSON ID.
// ─────────────────────────────────────────────────────────────────────────────

const topics = require('./cyber-topics');

const QUIZ_HANDLE = /^(ap-cyber-unit-(\d+)-lesson-(\d+))-quiz$/;

//  The number a page prints for itself. Every generation words the h1
//  differently ("Lesson 2.1 Quiz", "4.4 Quiz", "5.1 Checkpoint", "L5.5
//  Exam-Style Quiz"), and two pages print no number at all, so this answers
//  null rather than guessing.
function statedTopic(body) {
  const h1 = String(body || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!h1) return null;
  const m = h1[1].replace(/<[^>]+>/g, '').match(/\b(?:Lesson\s+|Topic\s+|L)?(\d\.\d)(?![\w.])/);
  return m ? m[1] : null;
}

/**
 * @param {string} handle  e.g. 'ap-cyber-unit-3-lesson-5-quiz'
 * @param {string} body    the page's stored body_html, for the cross-check
 * @returns {{lesson: string, unit: string, topic: string, sources: string[]}}
 * @throws  when the handle is not a cyber quiz handle, or when the authority
 *          and the page disagree, or when neither can answer.
 */
function lessonForQuizHandle(handle, body) {
  const m = QUIZ_HANDLE.exec(String(handle || ''));
  if (!m) throw new Error(`${handle}: not a cyber quiz handle`);
  const [, lessonHandle, unitNo] = m;
  const unit = `unit-${unitNo}`;
  const sources = [];

  let topic = null, lesson = null;
  const t = topics.topicOfHandle(lessonHandle);
  if (t) {
    //  Positional pairing, so a two-page topic lands on the right column.
    const i = t.handles.indexOf(lessonHandle);
    lesson = t.lesson_ids[i >= 0 ? i : 0] || t.lesson_ids[0];
    topic = t.topic;
    sources.push('cyber-topics');
  }

  const printed = statedTopic(body);
  if (printed) sources.push('page h1');

  if (topic && printed && topic !== printed) {
    throw new Error(
      `${handle}: cyber-topics says topic ${topic} and the page prints ${printed}. ` +
      'One of them has moved; filing the bank on either would be a guess.');
  }

  if (!topic) {
    //  No authority entry: Unit 2's lesson pages use descriptive handles. Fall
    //  back to the handle digits, but only when the page says the same thing.
    //  A page that prints nothing gives one source, and one source is how the
    //  Unit 3 mis-filing happened.
    const fromHandle = `${unitNo}.${m[3]}`;
    if (!printed) {
      throw new Error(
        `${handle}: cyber-topics does not know this handle and the page prints no ` +
        'topic number, so nothing corroborates the handle digits.');
    }
    if (printed !== fromHandle) {
      throw new Error(
        `${handle}: handle digits say ${fromHandle} and the page prints ${printed}.`);
    }
    topic = fromHandle;
    lesson = fromHandle;
    sources.push('handle digits');
  }

  return { lesson, unit, topic, sources };
}

module.exports = { lessonForQuizHandle, statedTopic, QUIZ_HANDLE };
