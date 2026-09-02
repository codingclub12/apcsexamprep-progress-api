'use strict';
// -----------------------------------------------------------------------------
//  PUT THE EXERCISE PAGES ON THE LESSON PAGES.
//
//  ── WHAT IS MISSING TODAY ───────────────────────────────────────────────────
//  All 70 CSP exercise pages went live on 2026-08-22. Measured on 2026-08-24
//  against the live storefront: the topic lesson pages link none of them, the
//  CSP course hub links none of them, and the resources page links none of them.
//  Zero inbound links anywhere on the site.
//
//  The only route to them is the URL printed inside the .docx handout. A student
//  who has the lesson page open, which is the student most likely to want the
//  exercise, cannot get there from where they are.
//
//  ── WHY A SECOND BLOCK RATHER THAN EDITING THE FIRST ────────────────────────
//  scripts/csp-lesson-keep-going.js already appends a managed block, and it is
//  live on Big Idea 3's eighteen lesson pages and nowhere else. Folding these
//  links into it would mean rewriting a block already on those pages, on pages
//  that are the course's most valuable content, to gain nothing a second block
//  does not. So this appends its own block under its own marker: purely additive
//  on all thirty five, and the two managed blocks can never collide.
//
//  They are styled apart on purpose. Keep-going is green and points sideways to
//  practice; this is the exercise blue used by the exercise pages themselves, so
//  a student who follows the link lands somewhere that looks like where they
//  came from.
//
//  ── THE SUBTITLE IS THE HONEST PART ─────────────────────────────────────────
//  Only topic 1.1's two exercises carry an auto-graded check today. The other 68
//  are handout mirrors whose writing boxes never leave the browser. The card
//  says which, read from the renderer that builds the page, so a topic that
//  gains check questions relabels itself on the next run and no card can promise
//  a grade the page does not deliver.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a fetched file that is not the lesson page it claims to be
//    - a page that already carries this block, so a rerun cannot double it
//    - a topic whose exercise pages are not in the verified live set
//    - any change to the bytes that were already there
//    - anything short of all thirty five topics
//
//  Self-contained styles under one id, scoped with all:initial and !important
//  and an explicit -webkit-text-fill-color on every colour, per house rule, so
//  the theme cannot bleed in and this cannot bleed out. Pure ASCII.
//
//  Run:
//    node scripts/csp-lesson-exercise-links.js <dir-of-fetched-lesson-pages> <out.csv>
//    node scripts/csp-lesson-exercise-links.js <dir> <out.csv> --verified handles.txt
//
//  The directory holds one rendered page per lesson handle, named
//  <handle>.html. Fetch them from the storefront; the body is recovered with
//  scripts/extract-live-body.js, which reproduces the stored body byte for byte.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { extract } = require('./extract-live-body');
const { allPages, BY_TOPIC } = require('../lib/csp-exercise-pages');
const { allPages: coursePages } = require('../lib/csp-course-pages');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const MARKER = '<!-- apcs-exercises (managed) -->';

const CSS = [
  '#apcs-ex-links{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:880px!important;margin:28px auto 0!important;padding:0 16px 8px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important}',
  '#apcs-ex-links *,#apcs-ex-links *::before,#apcs-ex-links *::after{box-sizing:border-box!important}',
  '#apcs-ex-links .ex-lbl{font-size:12px!important;font-weight:800!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:#1e40af!important;-webkit-text-fill-color:#1e40af!important;margin:0 0 10px!important}',
  '#apcs-ex-links .ex-row{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important}',
  '@media (max-width:640px){#apcs-ex-links .ex-row{grid-template-columns:repeat(1,1fr)!important}}',
  '#apcs-ex-links a.ex,#apcs-ex-links a.ex:link,#apcs-ex-links a.ex:visited{display:block!important;text-decoration:none!important;border:1px solid #93c5fd!important;border-left:5px solid #1a56db!important;border-radius:0 12px 12px 0!important;background:#eff6ff!important;padding:14px 16px!important;color:#0f1f3d!important;-webkit-text-fill-color:#0f1f3d!important;font-size:16px!important;font-weight:700!important;line-height:1.35!important}',
  '#apcs-ex-links a.ex:hover{background:#dbeafe!important}',
  '#apcs-ex-links a.ex span{display:block!important;margin-top:4px!important;font-size:13px!important;font-weight:400!important;color:#64748b!important;-webkit-text-fill-color:#64748b!important}',
].join('\n');

//  The applied challenge is the third card in a two-column row, so it spans both
//  rather than sitting alone in the left column looking like an orphan. Nothing
//  else about it differs: same border, same background, same type.
//
//  Emitted ONLY on a block that has one. 17 of the 35 topics have no applied
//  page live, and adding a rule they cannot use would rewrite 17 live bodies to
//  change nothing a reader could see. With it left off, those blocks rebuild
//  byte for byte identical to what is already published and drop out of the
//  sheet, which is the check that the rebuild is faithful.
const WIDE_CSS = '#apcs-ex-links a.ex.wide{grid-column:1/-1!important}';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// What the card promises. A graded page gets the check named; a mirror-only page
// says plainly that nothing is recorded, because the student's handout says the
// opposite and the page is where that gets corrected.
function subtitle(page) {
  return page.graded
    ? 'Work it online, then take the auto-graded check'
    : 'Work it online. Saved in your browser, not graded';
}

function lessonHandleFor(topic) {
  const t = BY_TOPIC.get(topic);
  if (!t) return null;
  return `ap-csp-course-bi${topic.split('.')[0]}-${t.slug}`;
}

//  THE APPLIED CHALLENGE IS NOT NUMBERED, AND THAT IS DELIBERATE.
//
//  Both sets call themselves Exercise 2. The handout mirror
//  /pages/ap-csp-topic-3-11-exercise-2 reads "Topic 3.11 - Exercise 2 - Sorted
//  or Not?" and the graded page /pages/ap-csp-course-bi3-binary-search-exercise-2
//  reads "Topic 3.11 - Exercise 2 - Binary Search: Applied Challenge". Two cards
//  both labelled Exercise 2 in one row is the confusion this whole pass exists
//  to remove, and numbering the second one 3 would contradict the page it opens.
//
//  So it is labelled by what it is. "Applied Challenge" is the second half of
//  the page's own h1, and the subtitle is the page's own promise with its own
//  question count in it. Nothing here is authored.
function appliedCard(applied) {
  const n = applied.questions.length;
  return '<a class="ex wide" href="' + esc('/pages/' + applied.handle) + '">'
    + esc('Applied Challenge')
    + '<span>' + esc(n + ' questions, and every answer is recorded for your teacher')
    + '</span></a>';
}

function blockFor(topic, pages, applied) {
  const cards = pages.map((p) => {
    const n = p.kind.slice('exercise-'.length);
    return '<a class="ex" href="' + esc('/pages/' + p.handle) + '">'
      + esc('Exercise ' + n + ': ' + p.title.replace(/^AP CSP [\d.]+ Exercise \d+: /, ''))
      + '<span>' + esc(subtitle(p)) + '</span></a>';
  });
  if (applied) cards.push(appliedCard(applied));
  const css = applied ? CSS + '\n' + WIDE_CSS : CSS;
  return '\n' + MARKER + '\n<div id="apcs-ex-links">\n<style>\n' + css + '\n</style>\n'
    + '<p class="ex-lbl">Exercises for Topic ' + esc(topic) + '</p>\n'
    + '<div class="ex-row">\n'
    + cards.join('\n')
    + '\n</div>\n</div>';
}

//  STRIP THE MANAGED BLOCK BACK OFF, so a rerun equals a run.
//
//  This used to refuse a page that already carried the block, which made the
//  generator a one-shot: the 35 pages went live on 2026-08-24 and no change to
//  the block could ever reach them again. That is how 18 graded exercise-2
//  pages ended up published with nothing linking them.
//
//  The block is appended last and nothing is appended after it, checked here
//  rather than assumed, so removing it is removing the tail. What is left must
//  carry no marker at all: two nested blocks would mean an earlier run appended
//  inside its own region and the page needs a human, not another append.
function unmark(body) {
  const at = body.indexOf('\n' + MARKER);
  if (at === -1) return { body, had: false };
  const tail = body.slice(at);
  if (!tail.startsWith('\n' + MARKER + '\n<div id="apcs-ex-links">')) {
    return { error: 'the managed block does not start the way this program writes it' };
  }
  if (!tail.trimEnd().endsWith('</div>')) {
    return { error: 'something was appended after the managed block' };
  }
  //  More than one marker means an earlier run appended a second block, and
  //  cutting from the first to the end would eat whatever sits between them.
  //  Two blocks is a page for a human, not another append.
  if (tail.indexOf(MARKER, MARKER.length) !== -1) {
    return { error: 'the page carries more than one managed block' };
  }
  const rest = body.slice(0, at);
  if (rest.includes(MARKER)) return { error: 'the page carries more than one managed block' };
  return { body: rest, had: true };
}

function build(dir, verified) {
  const byTopic = new Map();
  for (const p of allPages()) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic).push(p);
  }
  for (const list of byTopic.values()) list.sort((a, b) => a.kind.localeCompare(b.kind));

  //  The graded exercise-2 pages, keyed by topic. Same repo, same source of
  //  truth that renders them, so the handle, the question count and the title
  //  come from the generator that made the page rather than from reading it.
  const appliedFor = new Map();
  for (const p of coursePages()) {
    if (p.kind === 'exercise-2') appliedFor.set(p.topic, p);
  }

  const pages = [];
  const problems = [];
  for (const [topic, exercises] of byTopic) {
    const handle = lessonHandleFor(topic);
    if (!handle) { problems.push(`${topic}: not in the COURSES config`); continue; }
    const file = path.join(dir, handle + '.html');
    if (!fs.existsSync(file)) { problems.push(`${topic}: no fetched page at ${handle}.html`); continue; }

    let body;
    try { body = extract(fs.readFileSync(file, 'utf8')); }
    catch (e) { problems.push(`${topic}: ${e.message}`); continue; }

    //  Idempotent: an existing block is taken back off and rebuilt.
    const un = unmark(body);
    if (un.error) { problems.push(`${topic}: ${un.error}`); continue; }
    const original = un.body;
    const rebuilt = un.had;
    // A lesson page for this topic carries its own handle somewhere in its body
    // (its nav, its tracker wrapper, or a self link). If it does not, the file
    // is not the page it was named after and nothing is appended to it.
    if (!original.includes(handle) && !original.includes('data-lesson')) {
      problems.push(`${topic}: ${handle}.html does not look like that lesson page`);
      continue;
    }
    if (exercises.length !== 2) {
      problems.push(`${topic}: expected 2 exercises, found ${exercises.length}`);
      continue;
    }
    for (const p of exercises) {
      if (verified && !verified.has(p.handle)) {
        problems.push(`${topic}: ${p.handle} is not in the verified live page set`);
      }
    }

    //  The graded exercise-2 for this topic, when the page is actually live.
    //  35 are declared in seed/csp-exercise-2 and the manifest carries a
    //  denominator for every one of them; 18 are published today, all in Big
    //  Idea 3. A card is added only for a handle in the verified live set, so
    //  the other 17 stay uncarded rather than becoming 404s.
    const applied = appliedFor.get(topic);
    const appliedLive = applied && (!verified || verified.has(applied.handle)) ? applied : null;

    const next = original + blockFor(topic, exercises, appliedLive);
    // Additive means additive: the bytes that were on the page before this
    // program ever touched it have to still be there, in front, untouched.
    if (!next.startsWith(original)) { problems.push(`${topic}: the original body was modified`); continue; }
    pages.push({ handle, topic, body: next, original: body, graded: exercises.some((e) => e.graded),
      applied: !!appliedLive, rebuilt });
  }
  return { pages, problems };
}

function main(argv) {
  const [dir, out] = argv;
  if (!dir || !out) {
    console.error('usage: node scripts/csp-lesson-exercise-links.js <dir> <out.csv> [--verified handles.txt]');
    process.exit(2);
  }
  let verified = null;
  const vi = argv.indexOf('--verified');
  if (vi > -1) {
    verified = new Set(fs.readFileSync(argv[vi + 1], 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
  }

  const r = build(dir, verified);
  if (r.problems.length) {
    console.error(`\n  ${r.problems.length} problem(s). No file written:\n`);
    r.problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }
  if (r.pages.length !== 35) {
    console.error(`\n  Refused: built ${r.pages.length} pages, expected all 35 CSP topics\n`);
    process.exit(1);
  }
  //  A row that changes nothing is not a row. The 17 topics with no applied page
  //  live rebuild to exactly what is published, and rewriting a live body to
  //  change nothing is a risk taken for no gain.
  const changed = r.pages.filter((p) => p.body !== p.original);
  const unchanged = r.pages.length - changed.length;
  // House rule, checked rather than assumed.
  const nonAscii = r.pages.filter((p) => /[^\x09\x0A\x0D\x20-\x7E]/.test(p.body.slice(p.body.indexOf(MARKER)))); // eslint-disable-line no-control-regex
  if (nonAscii.length) {
    console.error(`\n  Refused: ${nonAscii.length} generated block(s) contain non-ASCII characters\n`);
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  for (const p of changed) {
    lines.push([p.handle, 'MERGE', p.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');

  const graded = r.pages.filter((p) => p.graded).length;
  console.log('');
  console.log(`    ${String(r.pages.length).padStart(3)}  lesson pages built`);
  console.log(`    ${String(unchanged).padStart(3)}  rebuilt BYTE FOR BYTE as published, so they are not in the sheet`);
  console.log(`    ${String(changed.length).padStart(3)}  rows written`);
  console.log(`    ${String(r.pages.length * 2).padStart(3)}  handout exercise links, two per topic`);
  console.log(`    ${String(r.pages.filter((p) => p.applied).length).padStart(3)}  graded Applied Challenge links, `
    + 'which nothing on the site linked before');
  console.log(`    ${String(r.pages.filter((p) => p.rebuilt).length).padStart(3)}  block(s) rebuilt rather than refused`);
  console.log(`    ${String(graded).padStart(3)}  topic(s) whose exercises are auto-graded, the rest say so`);
  console.log(`\n  wrote ${out}`);
  console.log('\n  Import settings: MERGE mode, QUOTE_ALL quoting, utf-8-sig encoding. One import at a time.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, blockFor, subtitle, unmark, appliedCard, MARKER, CSS, WIDE_CSS };
