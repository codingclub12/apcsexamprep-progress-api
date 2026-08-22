'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SEED PAGE LINKS - bootstrap the (lesson, activity) -> page handle map.
//
//  page_links learns handles from /track, which means a brand new install can
//  link nothing until students start browsing, and CSA can never derive a link
//  at all (its handles carry a title slug the lesson id does not hold). The
//  authored page handles are already in this repo, in the seed modules that
//  build those pages, so this harvests them.
//
//  Deliberately dumb about where a handle comes from: it scans the seed and
//  content trees for handle-shaped strings and keeps only the ones
//  pageFromHandle parses. That parser is the same authority /track uses, so a
//  string that is not a real course page is dropped rather than guessed at, and
//  this script never needs updating when a new seed module lands.
//
//  Safe to re-run. Rows are upserted, and a real visit later overwrites a seeded
//  handle with the live one.
//
//  Runs on boot (server.js) and by hand:
//    node scripts/seed-page-links.js [--dry]
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { pageFromHandle } = require('../utils');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['seed', 'content', 'lib'].map((d) => path.join(ROOT, d));
const HANDLE_RE = /['"`]((?:ap-csa|ap-csp|ap-cyber|ap-cybersecurity|ap-networking|intro-java)-[a-z0-9-]{4,110})['"`]/g;

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(js|json)$/.test(e.name)) out.push(full);
  }
  return out;
}

function harvest() {
const found = new Map();   // handle -> parsed key
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir, [])) {
    const text = fs.readFileSync(file, 'utf8');
    let m;
    HANDLE_RE.lastIndex = 0;
    while ((m = HANDLE_RE.exec(text))) {
      const handle = m[1];
      if (found.has(handle)) continue;
      const parsed = pageFromHandle(handle);
      if (parsed) found.set(handle, parsed);
    }
  }
}

// A lesson page handle also implies its activity pages: the graded exercises and
// the quiz on the same lesson are the same handle plus a suffix, and that is how
// the page builders in lib/ construct them. Adding them here is what makes a
// CSA quiz cell clickable before anyone has opened the quiz.
const ACTIVITY_SUFFIXES = ['exercise-1', 'exercise-2', 'exercise-3', 'quiz', 'debug'];
for (const [handle, parsed] of [...found]) {
  if (parsed.activity_type !== 'lesson') continue;
  for (const suffix of ACTIVITY_SUFFIXES) {
    const candidate = `${handle}-${suffix}`;
    if (found.has(candidate)) continue;
    const back = pageFromHandle(candidate);
    if (back && back.activity_type === suffix && back.course === parsed.course
        && back.unit === parsed.unit && String(back.lesson) === String(parsed.lesson)) {
      found.set(candidate, back);
    }
  }
}

return found;
}

// Insert-only, so a handle a student actually visited is never replaced by one
// harvested from source. Idempotent, which is what lets it run on every boot.
function seedPageLinks() {
  const links = require('../lib/lesson-links');
  const found = harvest();
  let changed = 0;
  for (const [handle, parsed] of found) {
    if (links.learn(parsed, handle, { onlyIfAbsent: true })) changed++;
  }
  return { total: found.size, changed };
}

module.exports = { harvest, seedPageLinks };

if (require.main === module) {
  const found = harvest();
  const byCourse = {};
  for (const p of found.values()) byCourse[p.course] = (byCourse[p.course] || 0) + 1;
  console.log(`Found ${found.size} page handles:`);
  for (const [course, n] of Object.entries(byCourse).sort()) console.log(`  ${course.padEnd(20)} ${n}`);

  if (process.argv.includes('--dry')) { console.log('\n--dry: nothing written.'); process.exit(0); }
  const r = seedPageLinks();
  console.log(`\nSeeded ${r.changed} new rows of ${r.total} into page_links.`);
}
