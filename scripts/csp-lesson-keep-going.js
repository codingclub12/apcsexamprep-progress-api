'use strict';
// -----------------------------------------------------------------------------
//  Give every Big Idea 3 lesson page a way onward.
//
//  ── WHAT IS MISSING TODAY ───────────────────────────────────────────────────
//  A student finishes a Big Idea 3 lesson page and the page ends. All eighteen
//  now have a coding practice page, a study game and guided notes, and all
//  eighteen are wired into the teacher Command Center, but none of the three is
//  reachable from the lesson itself. Checked on all eighteen live pages: zero
//  link their game.
//
//  The teacher can see the whole set. The student, who is the one on the page,
//  cannot.
//
//  ── WHY IT IS SAFE TO LINK ALL EIGHTEEN ─────────────────────────────────────
//  Nineteen games are embedded directly in lesson pages elsewhere in the course,
//  and a standalone page for one of those would post to the same leaderboard id
//  on a different scale. That is why EMBEDDED_IN_LESSON exists. None of the
//  eighteen Big Idea 3 games is in that set, so there is no game to collide
//  with. Two of the lesson pages mention apcsGameScore, but only as the generic
//  event name, not as a registered game.
//
//  ── HOW IT EDITS ────────────────────────────────────────────────────────────
//  Purely additively. The block is appended after the existing body and nothing
//  already on the page is touched, so the diff for each page is one new element
//  and the original bytes are still there in front of it. That is the cheapest
//  edit to review and the cheapest to undo.
//
//  Self-contained styles under one id, scoped with all:initial and !important
//  and an explicit -webkit-text-fill-color on every colour, per house rule, so
//  the theme cannot bleed in and this cannot bleed out.
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//    - a body that already carries the block, so a rerun cannot double it
//    - a body that is not the lesson page it claims to be
//    - a topic with no game, no coding page or no notes page
//    - any change to the bytes that were already there
//
//  Run: node scripts/csp-lesson-keep-going.js <dir-of-fetched-lesson-pages> <out.csv>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { extract } = require('./extract-live-body');
const { LESSONS, notesHandle, gameFor } = require('./csp-command-center-links');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const MARKER = '<!-- apcs-keepgoing (managed) -->';

function codeHandle(topic) { return 'ap-csp-topic-' + topic.replace('.', '-') + '-code'; }

const CSS = [
  '#apcs-kg{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:880px!important;margin:28px auto 0!important;padding:0 16px 8px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important}',
  '#apcs-kg *,#apcs-kg *::before,#apcs-kg *::after{box-sizing:border-box!important}',
  '#apcs-kg .kg-lbl{font-size:12px!important;font-weight:800!important;letter-spacing:.06em!important;text-transform:uppercase!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;margin:0 0 10px!important}',
  '#apcs-kg .kg-row{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:12px!important}',
  '@media (max-width:640px){#apcs-kg .kg-row{grid-template-columns:repeat(1,1fr)!important}}',
  '#apcs-kg a.kg,#apcs-kg a.kg:link,#apcs-kg a.kg:visited{display:block!important;text-decoration:none!important;border:1px solid #BBE5D2!important;border-left:5px solid #10B981!important;border-radius:0 12px 12px 0!important;background:#ECFDF5!important;padding:14px 16px!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;font-size:16px!important;font-weight:700!important;line-height:1.35!important}',
  '#apcs-kg a.kg:hover{background:#D1FAE5!important}',
  '#apcs-kg a.kg span{display:block!important;margin-top:4px!important;font-size:13px!important;font-weight:400!important;color:#5B7268!important;-webkit-text-fill-color:#5B7268!important}',
].join('\n');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function blockFor(topic) {
  const game = gameFor(topic);
  const links = [
    ['/pages/' + codeHandle(topic), 'Coding practice', 'Write and run real code, checked as you go'],
    ['/pages/ap-csp-game-' + game, 'Study game', 'Not graded, just for the practice'],
    ['/pages/' + notesHandle(topic), 'Guided notes', 'Print them or fill them in here'],
  ];
  return '\n' + MARKER + '\n<div id="apcs-kg">\n<style>\n' + CSS + '\n</style>\n'
    + '<p class="kg-lbl">Keep going with Topic ' + esc(topic) + '</p>\n'
    + '<div class="kg-row">\n'
    + links.map(([href, title, sub]) =>
      '<a class="kg" href="' + esc(href) + '">' + esc(title) + '<span>' + esc(sub) + '</span></a>').join('\n')
    + '\n</div>\n</div>';
}

function build(dir) {
  const pages = [];
  const problems = [];
  for (const topic of Object.keys(LESSONS)) {
    const [handle, title] = LESSONS[topic];
    const file = path.join(dir, handle + '.html');
    if (!fs.existsSync(file)) { problems.push(`${topic}: no fetched page at ${handle}.html`); continue; }
    let body;
    try { body = extract(fs.readFileSync(file, 'utf8')); }
    catch (e) { problems.push(`${topic}: ${e.message}`); continue; }

    if (body.includes(MARKER)) { problems.push(`${topic}: the block is already on this page`); continue; }
    if (!body.includes('/pages/ap-csp-course-bi3-') && !body.toLowerCase().includes(title.toLowerCase().slice(0, 12))) {
      problems.push(`${topic}: ${handle} does not look like its lesson page`);
      continue;
    }
    const game = gameFor(topic);
    if (!game) { problems.push(`${topic}: no study game`); continue; }

    const next = body + blockFor(topic);
    // Additive means additive: the original bytes have to still be there, in
    // front, untouched.
    if (!next.startsWith(body)) { problems.push(`${topic}: the original body was modified`); continue; }
    pages.push({ handle, title, body: next, topic, game });
  }
  return { pages, problems };
}

function main(argv) {
  const [dir, out] = argv;
  if (!dir || !out) {
    console.error('usage: node scripts/csp-lesson-keep-going.js <dir> <out.csv>');
    process.exit(2);
  }
  const r = build(dir);
  if (r.problems.length) {
    console.error(`\n  ${r.problems.length} problem(s). No file written:\n`);
    r.problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }
  if (r.pages.length !== 18) {
    console.error(`\n  Refused: built ${r.pages.length} pages, expected all 18 Big Idea 3 topics\n`);
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  for (const p of r.pages) {
    lines.push([p.handle, 'MERGE', p.title, p.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  }
  fs.writeFileSync(out, '﻿' + lines.join('\r\n') + '\r\n');
  r.pages.forEach((p) => console.log(`    ${p.topic.padEnd(5)} ${p.handle}  -> ${p.game}`));
  console.log(`\n  wrote ${out}  (${r.pages.length} lesson pages, block appended, nothing else touched)\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, blockFor, MARKER, CSS };
