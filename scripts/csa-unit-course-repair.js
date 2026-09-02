#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE FOUR AP CSA UNIT COURSE PAGES, WHICH ARE HOW A TEACHER WALKS THE COURSE.
//
//  Each unit page lists its lessons as a row: the number, the lesson title, and
//  a strip of pills reading Exercise 1, Exercise 2, Debug, FRQ. That page is the
//  only place in the course every activity is reachable from. Two things are
//  wrong with it and both were measured, not assumed.
//
//  1  THIRTY-TWO EXERCISE 2 PAGES ARE REACHABLE FROM NOWHERE.
//     38 lessons have an `-exercise-2` page. Six of them carry an Exercise 2
//     pill. The other 32 pages exist, are published, and nothing on the site
//     links them, so a teacher working through the course never sees them. The
//     lesson pages do not link their own activities either: Exercise 1, Debug
//     and FRQ are reachable ONLY from the unit page, which is what makes an
//     omission there invisible rather than merely inconvenient.
//
//  2  SIX ROWS NAME A LESSON THAT IS NOT THE ONE THEY LINK.
//     Unit 4 row 4.7 reads "ArrayList Introduction" and opens Wrapper Classes.
//     Row 4.6 reads "Arrays as Parameters and Return Values", which is a topic
//     the 2025-2026 CED removed, and opens Using Text Files. A teacher planning
//     from this page writes the wrong lesson into their calendar. Three more
//     rows differ only in wording (1.3, 3.6, 3.9) and are corrected the same
//     way, because a unit page and a lesson page disagreeing at all is the
//     thing that costs a teacher time.
//
//  WHERE THE RIGHT ANSWER COMES FROM
//  Every lesson page states its own number and title in its h1: "Lesson 4.7:
//  Wrapper Classes". That is the authority here, not this program and not the
//  handle. A row is rewritten to match the page it opens, and a lesson whose h1
//  does not have that shape is refused rather than guessed at.
//
//  The Exercise 2 pill is not authored either. It is the row's OWN Exercise 1
//  anchor with two substitutions, `-exercise-1` to `-exercise-2` in the href
//  and `Exercise 1` to `Exercise 2` in the label, so it cannot introduce a
//  style, a word or an attribute the page did not already have. Where a row
//  already has an Exercise 2 pill, the shape is confirmed against it.
//
//    node scripts/csa-unit-course-repair.js --bodies bodies/ \
//      --handles smoke/fixtures/live-page-handles.txt [--out imports/YYYY-MM-DD]
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const UNITS = ['1', '2', '3', '4'];
const unitPage = (u) => `ap-csa-unit-${u}-course`;

//  A row: the number span, the title span, then the Exercise 1 anchor that
//  names the lesson. Nothing between them may be skipped over, so the gap is
//  bounded and a row that does not match this shape is reported, not repaired.
const ROW = /<span[^>]*>(\d+\.\d+)<\/span><span([^>]*)>([^<]{2,160})<\/span>([\s\S]{0,600}?)<a href="\/pages\/(ap-csa-lesson-\d+-\d+-[a-z0-9-]+?)-exercise-1"([^>]*)>([^<]{0,40})<\/a>/g;

//  EVERY UNIT PAGE SAYS EACH TITLE MORE THAN ONCE, AND NOT IN THE SAME MARKUP.
//  Above the row strip sits a second listing, and it is a different shape on
//  every unit: `u1-lesson-card` and `u4-lesson-card` on units 1 and 4,
//  `u3-topic-row` on unit 3. Repairing only the strip leaves "Lesson 4.7
//  ArrayList Introduction" in the card that opens Wrapper Classes, which is the
//  half-fixed state a reader would trust least. A suite assertion caught that;
//  reading the page did not.
//
//  So the title repair does not chase markup. It replaces every occurrence of
//  the exact stale title on the page, and requires each one to sit within 400
//  characters of a link to the very lesson it names. Either side: the card
//  listing puts the anchor before the title and the row strip puts the activity
//  pills after it. An occurrence that cannot be tied to that lesson refuses the
//  whole page rather than being left behind or rewritten blind.
const NEAR = 400;
function titleOccurrences(page, base, stale) {
  const out = [];
  let i = page.indexOf(stale);
  while (i !== -1) {
    //  A WHOLE text node, not a substring of a longer one. "Searching and
    //  Sorting" is row 4.13's stale title and also sits inside row 4.17's
    //  correct one, "Recursive Searching and Sorting"; a substring replace
    //  would eventually eat half of that.
    const whole = page[i - 1] === '>' && page[i + stale.length] === '<';
    const w = page.slice(Math.max(0, i - NEAR), i + stale.length + NEAR);
    if (whole) out.push({ at: i, tied: w.includes(`href="/pages/${base}"`) || w.includes(`href="/pages/${base}-`) });
    i = page.indexOf(stale, i + 1);
  }
  return out;
}

const H1 = /<h1[^>]*>([\s\S]{0,160}?)<\/h1>/;
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (html) => unescape(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

//  "Lesson 4.7: Wrapper Classes" off the lesson page's own h1. Fifty of the 53
//  lesson pages are headed that way and three of them, 3.1, 3.3 and 3.4, are
//  headed "AP CSA 3.1: Abstraction and Program Design" instead. Both state the
//  number and the title, so both are accepted; the inconsistency between them
//  is its own small thing and is left alone here rather than fixed in passing.
//  Anything else is not a title this program is willing to copy.
const HEADING = /^(?:Lesson|AP CSA) (\d+\.\d+):\s*(.+)$/;
function lessonTitle(body) {
  const m = H1.exec(body || '');
  if (!m) return null;
  const t = HEADING.exec(text(m[1]));
  return t ? { num: t[1], title: t[2] } : null;
}

function planUnit(unit, page, lessons, live) {
  const spans = [];
  const problems = [];
  const rows = [];
  let m;
  ROW.lastIndex = 0;
  while ((m = ROW.exec(page)) !== null) {
    const [whole, num, titleAttrs, titleHtml, gap, base, exAttrs, exLabel] = m;
    const titleStart = m.index + whole.indexOf(`<span${titleAttrs}>`) + `<span${titleAttrs}>`.length;
    const anchorStart = m.index + whole.lastIndexOf('<a href="/pages/');
    const anchor = whole.slice(whole.lastIndexOf('<a href="/pages/'));
    rows.push({ num, base });

    const said = lessons[base];
    if (!said) { problems.push(`unit ${unit} row ${num}: /pages/${base} does not head itself "Lesson N.M: Title" or "AP CSA N.M: Title"`); continue; }
    if (said.num !== num) { problems.push(`unit ${unit} row ${num}: the lesson it links calls itself ${said.num}`); continue; }

    //  A. the visible title, made to agree with the page it opens, everywhere
    //  the page says it.
    const shown = text(titleHtml);
    if (shown !== said.title) {
      const stale = titleHtml;
      const found = titleOccurrences(page, base, stale);
      const loose = found.filter((f) => !f.tied);
      if (loose.length) {
        problems.push(`unit ${unit} row ${num}: ${JSON.stringify(text(stale))} appears `
          + `${loose.length} time(s) not tied to a link to ${base}, so it is not safe to replace`);
        continue;
      }
      for (const f of found) {
        spans.push({ kind: f.at === titleStart ? 'title' : 'card', at: f.at, from: stale,
          to: escape(said.title), num, base, was: shown, now: said.title });
      }
    }

    //  B. the Exercise 2 pill, copied from this row's own Exercise 1 pill.
    const two = `${base}-exercise-2`;
    if (live.has(two) && !page.includes(`href="/pages/${two}"`)) {
      const pill = anchor.replace('-exercise-1"', '-exercise-2"').replace('Exercise 1', 'Exercise 2');
      if (pill === anchor) { problems.push(`unit ${unit} row ${num}: the Exercise 1 pill did not yield an Exercise 2 pill`); continue; }
      if (!/Exercise 2/.test(pill)) { problems.push(`unit ${unit} row ${num}: the copied pill lost its label`); continue; }
      spans.push({ kind: 'pill', at: anchorStart + anchor.length, from: '', to: pill, num, base, target: two });
    }
  }

  return { spans, problems, rows };
}

//  Apply by offset, latest first, so every earlier offset stays valid.
function apply(page, spans) {
  let out = page;
  for (const s of [...spans].sort((a, b) => b.at - a.at)) {
    out = out.slice(0, s.at) + s.to + out.slice(s.at + s.from.length);
  }
  return out;
}

//  The reverse of the same walk. Byte for byte, or nothing ships.
function verify(before, after, spans) {
  const ordered = [...spans].sort((a, b) => a.at - b.at);
  let out = '';
  let cursor = 0;
  let drift = 0;
  for (const s of ordered) {
    out += after.slice(cursor + drift, s.at + drift) + s.from;
    cursor = s.at + s.from.length;
    drift += s.to.length - s.from.length;
  }
  out += after.slice(cursor + drift);
  const anchorsAdded = spans.filter((s) => s.kind === 'pill').length;
  const before_a = (before.match(/<a\b/g) || []).length;
  const after_a = (after.match(/<a\b/g) || []).length;
  return { roundTrip: out === before, anchorsOk: after_a - before_a === anchorsAdded,
    added: anchorsAdded, retitled: spans.filter((s) => s.kind === 'title').length,
    recarded: spans.filter((s) => s.kind === 'card').length };
}

function build(bodies, live) {
  const lessons = {};
  for (const [handle, body] of Object.entries(bodies)) {
    if (!/^ap-csa-lesson-\d+-\d+-/.test(handle)) continue;
    const t = lessonTitle(body);
    if (t) lessons[handle] = t;
  }
  const rows = [];
  const problems = [];
  let rowsSeen = 0;
  for (const u of UNITS) {
    const page = bodies[unitPage(u)];
    if (!page) { problems.push(`${unitPage(u)}: no stored body`); continue; }
    const plan = planUnit(u, page, lessons, live);
    rowsSeen += plan.rows.length;
    problems.push(...plan.problems);
    //  One row this cannot verify stops the whole page. A sheet that rewrites a
    //  body while part of it is unaccounted for is the half-written state this
    //  repo refuses everywhere else.
    if (plan.problems.length || !plan.spans.length) continue;
    const after = apply(page, plan.spans);
    const v = verify(page, after, plan.spans);
    if (!v.roundTrip) { problems.push(`${unitPage(u)}: reversing the edit does not give the original body back`); continue; }
    if (!v.anchorsOk) { problems.push(`${unitPage(u)}: the number of links moved by more than the pills added`); continue; }
    rows.push({ handle: unitPage(u), before: page, after, spans: plan.spans, ...v });
  }
  //  Every pill has to point at a page the sitemap says is live.
  for (const r of rows) {
    for (const s of r.spans.filter((x) => x.kind === 'pill')) {
      if (!live.has(s.target)) problems.push(`${r.handle}: the new pill points at ${s.target}, which is not live`);
    }
  }
  return { rows, problems, lessons, rowsSeen };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '﻿';

//  Handle, Command, Body HTML, and every row is rewriting a body. A blank cell
//  is an erase in every column, so nothing else travels with it.
function sheet(rows) {
  if (!rows.length) return null;
  const lines = [['Handle', 'Command', 'Body HTML'].map(cell).join(',')];
  for (const r of rows) lines.push([r.handle, 'MERGE', r.after].map(cell).join(','));
  return { csv: BOM + lines.join('\r\n') + '\r\n', rows: rows.length };
}

const readBodies = (dir) => Object.fromEntries(fs.readdirSync(dir).filter((f) => f.endsWith('.html'))
  .map((f) => [f.slice(0, -5), fs.readFileSync(path.join(dir, f), 'utf8')]));

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  const dir = opt('bodies');
  const handlesFile = opt('handles');
  if (!dir || !handlesFile) {
    console.error('usage: node scripts/csa-unit-course-repair.js --bodies <dir> --handles <live-handles.txt> [--out <dir>]');
    process.exit(2);
  }
  const live = new Set(fs.readFileSync(handlesFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  if (live.size < 100) { console.error(`refusing: only ${live.size} live handles, that is not the sitemap`); process.exit(1); }
  const { rows, problems, lessons, rowsSeen } = build(readBodies(dir), live);

  console.log(`\nAP CSA UNIT COURSE PAGES\n\n  ${rowsSeen} lesson rows across ${UNITS.length} unit pages, `
    + `${Object.keys(lessons).length} lesson pages read for their own title\n`);
  for (const r of rows) {
    console.log(`  ${r.handle}: ${r.retitled} row(s) and ${r.recarded} card(s) retitled, `
      + `${r.added} Exercise 2 pill(s) added`);
    for (const s of r.spans.filter((x) => x.kind === 'title')) {
      console.log(`      row ${s.num} said ${JSON.stringify(s.was)}\n            now says ${JSON.stringify(s.now)}`);
    }
  }
  const pills = rows.reduce((n, r) => n + r.added, 0);
  const titles = rows.reduce((n, r) => n + r.retitled, 0);
  console.log(`\n  ${titles} rows now name the lesson they open, `
    + `${pills} Exercise 2 pages are now reachable`);
  if (problems.length) {
    console.error(`\n  ${problems.length} refused. No file written.\n`);
    problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  const out = opt('out');
  if (out && rows.length) {
    const sh = sheet(rows);
    fs.writeFileSync(`${out}/csa-unit-course-pages.csv`, sh.csv);
    console.log(`\n  wrote ${out}/csa-unit-course-pages.csv  (${sh.rows} rows, one body column, no blanks)`);
  }
  console.log('');
}

module.exports = { build, sheet, planUnit, apply, verify, lessonTitle, text, escape, ROW, UNITS, HEADING, titleOccurrences };
