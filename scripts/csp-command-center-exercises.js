'use strict';
// -----------------------------------------------------------------------------
//  THE CSP COMMAND CENTER: link the exercise pages, and the Big Idea exams.
//
//  WHAT IS WRONG TODAY
//  All 70 CSP exercise pages went live on 2026-08-22 at the handles printed
//  inside the Teacher Course Bundle handouts. Measured against the live page on
//  2026-08-24: the Command Center mentions NONE of them. Every topic already
//  lists the exercise as a .docx under studentFiles, so a teacher sees the
//  worksheet to print and no sign that the same exercise exists online.
//
//  The five Big Idea exam rows carry an empty pageLinks array, so the unit test
//  pages, which do exist and are the highest stakes assessment in the course,
//  are unreachable from the page a teacher plans from.
//
//  WHAT THIS ADDS
//    - 70 exercise links, two per topic across all 35.
//    - 6 unit test links on the 5 exam rows. Big Idea 3's test is split into
//      part A and part B, so it gets two.
//
//  THE LABEL IS THE POINT, NOT DECORATION
//  Only topic 1.1's two pages carry an auto-graded check today. The other 68
//  are handout mirrors: real work, saved in the student's own browser, scored by
//  nobody. A teacher deciding what to assign has to know which is which BEFORE
//  assigning it, so the label says so, the same way the study game already says
//  "(not graded)" for exactly this reason. Whether a page is graded is read from
//  the renderer that builds it, never hardcoded here, so a topic that gains
//  check questions relabels itself on the next run.
//
//  HOW IT EDITS
//  By INSERTION, which is even narrower than the sibling script's replacement.
//  Each new entry is spliced in immediately before its pageLinks array's closing
//  bracket, so every byte that was already in the blob is still there, in order,
//  unchanged. The diff is purely additive.
//
//  THE TRIPWIRE IS DERIVED, NOT COPIED
//  scripts/csp-command-center-links.js carries a hardcoded title per topic so a
//  renumbered curriculum fails loudly. Eighteen titles are maintainable; this
//  script covers all 35 and would rot. Instead the check is derived: a topic's
//  existing pageLinks MUST already contain the lesson handle that
//  lib/csp-exercise-pages assigns that topic number, which comes from the same
//  COURSES config the exercise pages and the reporter read. If the Command
//  Center and the course config ever disagree about which lesson topic 3.8 is,
//  this stops instead of writing a link onto the wrong topic.
//
//  WHAT IT REFUSES
//    - a body that is not the stored Command Center body
//    - a topic whose existing links do not include its own lesson page
//    - a target handle that is not in the verified live set
//    - DATA that no longer parses as JSON after the edit
//    - any pre-existing link that stopped being linked
//    - a non-ASCII character in anything it writes
//    - an output no larger than the input
//
//  Idempotent: a link already present is left alone and counted as skipped, so
//  a re-run after a partial import adds only what is missing.
//
//  Run: node scripts/csp-command-center-exercises.js <live-body.html> <out.csv> [--verified handles.txt]
//  Get the live body with scripts/live-pages-dump.js or the Admin API, never by
//  retyping it.
// -----------------------------------------------------------------------------

const fs = require('fs');
const { allPages, BY_TOPIC } = require('../lib/csp-exercise-pages');

const HANDLE = 'csp-command-center';
const PUBLISHED_AT = '2026-03-01 12:00:00';

const REQUIRED = ['var DATA = {', '"bigIdeas"', 'csp-command-center'];

// Big Idea -> its unit test page(s). Big Idea 3 sits across two class periods
// and its test ships as two separate pages, which utils.js already knows about
// (they are two separate lessons there for the same reason: one submission per
// page id, so folding them into one would have part B overwrite part A).
const UNIT_TESTS = {
  1: [['ap-csp-course-bi1-unit-test', 'Unit test']],
  2: [['ap-csp-course-bi2-unit-test', 'Unit test']],
  3: [['ap-csp-course-bi3-unit-test-part-a', 'Unit test part A'],
      ['ap-csp-course-bi3-unit-test-part-b', 'Unit test part B']],
  4: [['ap-csp-course-bi4-unit-test', 'Unit test']],
  5: [['ap-csp-course-bi5-unit-test', 'Unit test']],
};

function label(page) {
  const n = 'Exercise ' + page.kind.slice('exercise-'.length);
  return page.graded
    ? `${n} (online, auto-graded)`
    : `${n} (online, not graded yet)`;
}

// The exercise pages a topic owns, in exercise order, from the renderer.
function exercisesByTopic() {
  const by = new Map();
  for (const p of allPages()) {
    if (!by.has(p.topic)) by.set(p.topic, []);
    by.get(p.topic).push(p);
  }
  for (const list of by.values()) list.sort((a, b) => a.kind.localeCompare(b.kind));
  return by;
}

// The lesson page handle the course config says owns this topic. Used only as a
// tripwire against the Command Center's own data.
function lessonHandleFor(topic) {
  const t = BY_TOPIC.get(topic);
  if (!t) return null;
  return `ap-csp-course-bi${topic.split('.')[0]}-${t.slug}`;
}

// Find the pageLinks array that belongs to the object starting at `at`, and
// return where its closing bracket is. Bounded so it can never run into the
// next topic, and it rejects a nested array it does not expect.
function pageLinksAt(body, at, whose) {
  const window = body.slice(at, at + 4000);
  const m = /"pageLinks":\[/.exec(window);
  if (!m || m.index > 120) {
    throw new Error(`${whose} does not have a pageLinks array near its id`);
  }
  const open = at + m.index + m[0].length - 1;
  let depth = 0;
  for (let i = open; i < body.length && i < open + 8000; i++) {
    const c = body[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return { open, close: i, empty: i === open + 1 };
    }
  }
  throw new Error(`${whose} has an unterminated pageLinks array`);
}

function build(inBody, verified) {
  const missing = REQUIRED.filter((m) => inBody.indexOf(m) === -1);
  if (missing.length) {
    throw new Error('this is not the stored Command Center body, it is missing '
      + missing.join(', ') + '. Fetch it from the Shopify Admin API.');
  }

  const byTopic = exercisesByTopic();
  const targets = [];

  // Topics, in reverse document order so an earlier insertion never shifts the
  // offsets of one not yet made.
  for (const [topic, pages] of byTopic) {
    const anchor = `"id":"${topic}","title":"`;
    const at = inBody.indexOf(anchor);
    if (at === -1) throw new Error(`topic ${topic} is not in the Command Center`);
    if (inBody.indexOf(anchor, at + 1) !== -1) throw new Error(`topic ${topic} appears more than once`);
    const lesson = lessonHandleFor(topic);
    if (!lesson) throw new Error(`topic ${topic} is not in the COURSES config`);
    const span = pageLinksAt(inBody, at, `topic ${topic}`);
    const existing = inBody.slice(span.open, span.close + 1);
    if (existing.indexOf(`/pages/${lesson}`) === -1) {
      throw new Error(`topic ${topic} does not link its own lesson page ${lesson}; `
        + 'the Command Center and the course config disagree about this topic');
    }
    const links = pages
      .map((p) => ({ href: '/pages/' + p.handle, label: label(p) }))
      .filter((l) => existing.indexOf(`"${l.href}"`) === -1);
    targets.push({ what: `topic ${topic}`, span, links, existing });
  }

  // The five Big Idea exam rows.
  for (const n of Object.keys(UNIT_TESTS)) {
    const anchor = `"exam":{"id":"${n}.99","title":"`;
    const at = inBody.indexOf(anchor);
    if (at === -1) throw new Error(`Big Idea ${n} has no exam row`);
    const span = pageLinksAt(inBody, at, `Big Idea ${n} exam`);
    const existing = inBody.slice(span.open, span.close + 1);
    const links = UNIT_TESTS[n]
      .map(([h, l]) => ({ href: '/pages/' + h, label: l }))
      .filter((l) => existing.indexOf(`"${l.href}"`) === -1);
    targets.push({ what: `Big Idea ${n} exam`, span, links, existing });
  }

  for (const t of targets) {
    for (const l of t.links) {
      const h = l.href.replace('/pages/', '');
      if (verified && !verified.has(h)) {
        throw new Error(`${t.what}: ${h} is not in the verified live page set`);
      }
    }
  }

  // Apply back to front so every recorded offset stays valid.
  let body = inBody;
  const applied = targets.slice().sort((a, b) => b.span.open - a.span.open);
  for (const t of applied) {
    if (!t.links.length) continue;
    const json = t.links.map((l) => JSON.stringify(l)).join(',');
    const sep = t.span.empty ? '' : ',';
    body = body.slice(0, t.span.close) + sep + json + body.slice(t.span.close);
  }

  const added = targets.filter((t) => t.links.length);
  const skipped = targets.filter((t) => !t.links.length);
  const problems = check(inBody, body, added);
  return { body, added, skipped, problems };
}

function check(inBody, outBody, added) {
  const problems = [];
  const wrote = added.reduce((n, a) => n + a.links.length, 0);

  if (wrote && Buffer.byteLength(outBody) <= Buffer.byteLength(inBody)) {
    problems.push('the output is not larger than the input, so nothing was added');
  }

  const m = outBody.match(/var DATA = (\{[\s\S]*?\});\s*\n/) || outBody.match(/var DATA = (\{[\s\S]*?\})\s*;/);
  if (!m) problems.push('the DATA blob could not be located after the edit');
  else {
    let d = null;
    try { d = JSON.parse(m[1]); } catch (e) { problems.push('DATA no longer parses as JSON: ' + e.message); }
    if (d) {
      // Every topic must now link both of its exercises, and every exam its test.
      const byTopic = exercisesByTopic();
      let missingEx = [];
      for (const bi of d.bigIdeas) {
        for (const t of bi.topics) {
          const want = (byTopic.get(t.id) || []).map((p) => '/pages/' + p.handle);
          const have = new Set((t.pageLinks || []).map((l) => l.href));
          for (const w of want) if (!have.has(w)) missingEx.push(t.id + ' ' + w);
        }
        const exam = bi.exam;
        const wantT = (UNIT_TESTS[bi.n] || []).map(([h]) => '/pages/' + h);
        const haveT = new Set((exam && exam.pageLinks || []).map((l) => l.href));
        for (const w of wantT) if (!haveT.has(w)) missingEx.push(bi.n + '.99 ' + w);
      }
      if (missingEx.length) {
        problems.push(`${missingEx.length} link(s) still missing after the edit: ${missingEx.slice(0, 4).join(', ')}`);
      }
      // A graded label may only sit on a page that really is graded.
      const gradedHandles = new Set(allPages().filter((p) => p.graded).map((p) => '/pages/' + p.handle));
      for (const bi of d.bigIdeas) {
        for (const t of bi.topics) {
          for (const l of t.pageLinks || []) {
            if (/auto-graded/.test(l.label) && !gradedHandles.has(l.href)) {
              problems.push(`${t.id}: ${l.href} is labelled auto-graded but carries no check questions`);
            }
          }
        }
      }
    }
  }

  const links = (s) => new Set(s.match(/\/pages\/[a-z0-9-]+/g) || []);
  const lost = [...links(inBody)].filter((l) => !links(outBody).has(l));
  if (lost.length) problems.push(`${lost.length} existing link(s) disappeared: ${lost.slice(0, 4).join(', ')}`);

  const written = added.map((a) => JSON.stringify(a.links)).join('');
  // eslint-disable-next-line no-control-regex
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(written)) problems.push('the generated links contain non-ASCII characters');

  // The bytes that were there before must still be there, in order. This is the
  // whole claim of an insert-only edit, so it is checked rather than asserted.
  let i = 0;
  for (const ch of inBody) {
    i = outBody.indexOf(ch, i);
    if (i === -1) { problems.push('the edit was not purely additive'); break; }
    i++;
  }
  return problems;
}

function toCsv(body) {
  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const rows = [header.map(cell).join(','), [HANDLE, 'MERGE', body, 'TRUE', PUBLISHED_AT].map(cell).join(',')];
  return '﻿' + rows.join('\r\n') + '\r\n';
}

function main(argv) {
  const src = argv[0];
  const out = argv[1];
  if (!src || !out) {
    console.error('usage: node scripts/csp-command-center-exercises.js <live-body.html> <out.csv> [--verified handles.txt]');
    process.exit(2);
  }
  let verified = null;
  const vi = argv.indexOf('--verified');
  if (vi > -1) {
    verified = new Set(fs.readFileSync(argv[vi + 1], 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  }
  const inBody = fs.readFileSync(src, 'utf8');

  let res;
  try {
    res = build(inBody, verified);
  } catch (e) {
    console.error('\n  REFUSING TO WRITE. ' + e.message + '\n');
    process.exit(1);
  }
  if (res.problems.length) {
    console.error(`\n  REFUSING TO WRITE. ${res.problems.length} problem(s):\n`);
    for (const p of res.problems) console.error('    ' + p);
    console.error('');
    process.exit(1);
  }

  const wrote = res.added.reduce((n, a) => n + a.links.length, 0);
  if (!wrote) {
    console.log('\n  Nothing to add: every link this script writes is already on the page.\n');
    return;
  }

  fs.writeFileSync(out, toCsv(res.body));
  const ex = res.added.filter((a) => a.what.startsWith('topic'));
  const exams = res.added.filter((a) => a.what.endsWith('exam'));
  console.log('');
  console.log(`    ${String(ex.reduce((n, a) => n + a.links.length, 0)).padStart(3)}  exercise links across ${ex.length} topics`);
  console.log(`    ${String(exams.reduce((n, a) => n + a.links.length, 0)).padStart(3)}  unit test links across ${exams.length} Big Idea exams`);
  if (res.skipped.length) console.log(`    ${String(res.skipped.length).padStart(3)}  already linked, left alone`);
  console.log(`\n  wrote ${out}`);
  console.log(`    body grew from ${Buffer.byteLength(inBody)} to ${Buffer.byteLength(res.body)} bytes, insert only`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, label, UNIT_TESTS, HANDLE };
