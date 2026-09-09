'use strict';
// -----------------------------------------------------------------------------
//  DOES ANY CYBER QUIZ PAGE ADVERTISE A QUESTION COUNT ITS BANK DOES NOT HOLD?
//
//  The 1.2 page said [12 Questions] [~25 min] in its badge row while its own
//  blurb one line above said "5 questions, about 10 minutes" and the server
//  served 5. That is the check: the badge count against the SERVER, which is the
//  only party that knows how many questions come out.
//
//  ── WHAT THIS DELIBERATELY DOES NOT FLAG ────────────────────────────────────
//  The duration. 5.5 and 5.6 say ~12 and ~15 minutes where everyone else says
//  ~10, and a first pass of this sweep called both defects. They are not: their
//  counts are right, neither page carries a blurb to contradict, and how long a
//  quiz takes is an estimate somebody made rather than a fact anything can
//  re-derive. A check that cannot say what the right answer would be has no
//  business calling something wrong. Durations are printed, never failed.
//
//  Most pages carry no count badge at all, and that is fine too. Nothing here
//  requires a page to advertise a number; it requires a number, once advertised,
//  to be true.
//
//  Read only, no credential, fetched through lib/storefront-fetch.js.
//
//  Run: node scripts/cyber-quiz-badge-sweep.js
// -----------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch');

const API = 'https://progress.apcsexamprep.com';
const COURSE = 'ap-cybersecurity';
const PAGES = { 1: [1, 2, 3, 4, 5], 2: [1, 2, 3, 4], 3: [1, 2, 3, 4, 5, 6], 4: [1, 2, 3, 4], 5: [1, 2, 3, 4, 5, 6] };

//  The gradebook lesson each page's mount names. Read off the page rather than
//  computed, because unit 3 carries a 3.1 pair and the site numbering does not
//  follow the file numbering there.
function mountedLesson(body) {
  const m = body.match(/data-apcs-quiz(?=[\s>])[^>]*?data-unit="([^"]+)"[^>]*?data-lesson="([^"]+)"/);
  return m ? { unit: m[1], lesson: m[2] } : null;
}

async function poolFor(unit, lesson) {
  const r = await fetch(`${API}/api/quiz/${COURSE}/${unit}/${lesson}/quiz`);
  if (!r.ok) return null;
  const j = await r.json();
  return Number.isInteger(j.pool) ? j.pool : null;
}

(async () => {
  const rows = [];
  for (const [u, lessons] of Object.entries(PAGES)) {
    for (const l of lessons) {
      const handle = `ap-cyber-unit-${u}-lesson-${l}-quiz`;
      let body;
      try { body = sf.pageBody(handle).body_html; } catch (e) {
        rows.push({ handle, err: e.message }); continue;
      }
      const badge = body.match(/>(\d+)\s+Questions</);
      const mins = body.match(/>~(\d+)\s+min</);
      const mount = mountedLesson(body);
      const pool = mount ? await poolFor(mount.unit, mount.lesson) : null;
      rows.push({
        handle,
        badge: badge ? Number(badge[1]) : null,
        mins: mins ? Number(mins[1]) : null,
        lesson: mount ? mount.lesson : null,
        pool,
      });
    }
  }

  const bad = [];
  for (const r of rows) {
    if (r.err) { console.log(`  ??    ${r.handle.padEnd(30)} ${r.err}`); continue; }
    const wrong = r.badge !== null && r.pool !== null && r.badge !== r.pool;
    if (wrong) bad.push(r);
    const advertises = r.badge === null ? 'no count badge' : `badge ${r.badge}`;
    const serves = r.pool === null ? (r.lesson ? 'server does not serve it' : 'not mounted') : `bank ${r.pool}`;
    const dur = r.mins === null ? '' : `  ~${r.mins} min`;
    console.log(`  ${wrong ? 'WRONG' : 'ok   '} ${r.handle.padEnd(30)} ${advertises.padEnd(15)} ${serves.padEnd(26)}${dur}`);
  }

  const withBadge = rows.filter((r) => !r.err && r.badge !== null).length;
  console.log(`\n  ${rows.length} pages, ${withBadge} carrying a question count badge, `
    + `${bad.length} advertising a count the bank does not hold`);
  for (const r of bad) console.log(`    ${r.handle}: says ${r.badge}, bank holds ${r.pool}`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(2); });
