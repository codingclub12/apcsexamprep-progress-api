'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DOES THE DECLARED PARENT ACTUALLY LINK THE CHILD.
//
//      node scripts/verify-architecture-live.js              all 153 parents
//      node scripts/verify-architecture-live.js --limit 20   sample
//      node scripts/verify-architecture-live.js --json out.json
//
//  Board 372, the other half of board 351. classify() answers "has a home";
//  this answers "is the home wired up". They are different questions and the
//  gap between them is large: sampled 2026-09-18 across 11 clusters that DO
//  have a hub, the hub's stored body linked the child in 6 of 11. A page whose
//  parent ignores it is exactly as unreachable as one with no parent.
//
//  ── WHY THIS IS SIX MINUTES AND NOT FORTY TWO ──────────────────────────────
//  The naive reading is that it needs the full crawl. It does not. Only PARENTS
//  have to be read, and although 347 pages are hubs, just 153 of them actually
//  have members claiming them. 153 fetches at one per second.
//
//  ── IT READS THE STORED BODY, NEVER THE RENDERED PAGE ──────────────────────
//  Not a preference. The rendered page carries about 135 mega-menu anchors
//  before its content starts, so a rendered hub appears to link most of the
//  site. On 2026-09-10 a session in this repo read a hub's sibling links off the
//  RENDERED page and reported six links that existed only in the nav. The stored
//  body from /pages/<handle>.json is what Shopify holds and the only honest
//  source for this question.
//
//  ── AND IT MATCHES HREF BOUNDARIES ─────────────────────────────────────────
//  lib/site-architecture.js linksTo() exists because a plain includes() is wrong
//  for 52 of the 712 parented pages: a handle that is a strict prefix of another
//  live handle reads as linked when the body links only the longer one. The
//  error runs in the quiet direction, reporting a page reachable when it is not.
//
//  ── A MISS IS NOT AN ORPHAN, AND THE FIRST DRAFT OF THIS SCRIPT IMPLIED IT WAS
//  The first full run reported 432 member pages "not linked" and that number,
//  presented alone, is badly misleading. Checked by hand: ap-csa-lesson-2-3-if-
//  statements really does not link its own -debug, -exercise-1, -exercise-2 or
//  -frq pages, and carries only four outbound page links in total. But
//  ap-csa-unit-2-course links all four of them. So they are REACHABLE, just not
//  from their own lesson page.
//
//  So every miss is asked a second question, and it costs no extra fetch because
//  the answer is already in the 153 bodies being read: is this member linked by
//  ANY hub, or by none of them?
//
//    NOWHERE    no hub read here links it. The serious case, and the closest
//               this check gets to "unreachable".
//    ELSEWHERE  a DIFFERENT hub links it. Reachable; its own parent is a dead
//               end for it. Navigation quality, not an orphan.
//
//  And two shapes for the parent, because the fix differs:
//
//    PARTIAL   links most members, misses a few. The hub-down fix
//              docs/internal-linking.md argues for: one edit rescues several.
//    TOTAL     links NONE of its members. Usually the PARENT is wrong rather
//              than the links missing, because a hub that owns nine pages and
//              links none is probably not their hub.
//
//  THE LIMIT, stated rather than buried: "linked by no hub" means no hub AMONG
//  THE 153 READ HERE. An ordinary page could still link it. Only the full crawl
//  in scripts/link-graph.js answers that, and this is deliberately the cheap
//  approximation rather than a replacement for it.
//
//  Zero PII: public page bodies only, and no User-Agent is sent.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const A = require('../lib/site-architecture');
const sf = require('../lib/storefront-fetch');

const CONFIG = path.join(__dirname, '..', 'config', 'site-architecture.json');

//  docs/site-crawl.md measured 1,000ms as comfortable rather than merely
//  tolerated, and records why pushing harder is not worth it: the cost of a
//  throttled run is the storefront serving challenges to real students on shared
//  school IPs. So it backs off and it STOPS rather than pushing through.
const DELAY_MS = 1000;
const THROTTLE_GIVE_UP = 5;

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const opt = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};

function main() {
  const limit = Number(opt('limit', 0)) || 0;
  const jsonOut = opt('json', '');

  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  const fam = new Map(cfg.pages.map((p) => [p.handle, p.family]));
  const aliasOf = new Map(cfg.pages.map((p) => [p.handle, !!p.parent_is_alias]));
  let index = A.parentIndex(cfg.pages);
  const total = index.length;
  if (limit) index = index.slice(0, limit);

  console.log(`parents to read: ${index.length}${limit ? ` of ${total} (--limit)` : ''}`);
  console.log(`members claiming them: ${index.reduce((s, e) => s + e.members.length, 0)}`);
  console.log(`about ${Math.ceil(index.length * DELAY_MS / 1000 / 60)} minute(s) at ${DELAY_MS}ms spacing\n`);

  const rows = [];
  const linkedByAnyHub = new Set();
  let throttled = 0;
  let aborted = null;

  for (let i = 0; i < index.length; i++) {
    const { parent, members } = index[i];
    let body = null;
    let err = null;
    try {
      body = sf.pageBody(parent).body_html;
    } catch (e) {
      err = e.message;
      //  A 429 is not an answer about the page. Treat it as pressure, not data.
      if (/\b(429|503)\b/.test(e.message)) {
        throttled++;
        if (throttled >= THROTTLE_GIVE_UP) {
          aborted = `${THROTTLE_GIVE_UP} throttled responses; stopped rather than pushing through`;
          break;
        }
      }
    }
    if (body !== null) {
      //  Every /pages/ handle this hub links, kept instead of the body so a
      //  153-body run does not hold 10MB of markup. Railway is 1 vCPU and 1GB
      //  and this repo has already paid for one unbounded-array mistake.
      for (const m of body.matchAll(/\/pages\/([A-Za-z0-9-]+)/g)) linkedByAnyHub.add(m[1]);
      const misses = A.missesIn(body, members);
      const crossFamily = members.filter((m) => fam.get(m) !== fam.get(parent)).length;
      rows.push({
        parent,
        members: members.length,
        linked: members.length - misses.length,
        missed: misses.length,
        shape: misses.length === 0 ? 'ok' : (misses.length === members.length ? 'TOTAL' : 'PARTIAL'),
        alias_members: members.filter((m) => aliasOf.get(m)).length,
        cross_family_members: crossFamily,
        misses,
      });
    } else {
      rows.push({ parent, members: members.length, error: err, shape: 'ERROR', misses: [] });
    }
    if (i < index.length - 1) sleep(DELAY_MS);
  }

  const ok = rows.filter((r) => r.shape === 'ok');
  const partial = rows.filter((r) => r.shape === 'PARTIAL').sort((a, b) => b.missed - a.missed);
  const totalMiss = rows.filter((r) => r.shape === 'TOTAL').sort((a, b) => b.members - a.members);
  const errors = rows.filter((r) => r.shape === 'ERROR');

  console.log('── PARENTS THAT LINK EVERY MEMBER ─────────────────────────────');
  console.log(`  ${ok.length} of ${rows.length}\n`);

  console.log('── PARTIAL: links most, misses some. Hub-down fix. ────────────');
  if (!partial.length) console.log('  none');
  for (const r of partial.slice(0, 25)) {
    console.log(`  ${String(r.missed).padStart(3)} of ${String(r.members).padEnd(3)} missed  ${r.parent}`);
    console.log(`      ${r.misses.slice(0, 4).join(', ')}${r.misses.length > 4 ? ` +${r.misses.length - 4} more` : ''}`);
  }
  if (partial.length > 25) console.log(`  ... and ${partial.length - 25} more`);

  console.log('\n── TOTAL: links NONE of its members. Check the PARENT first. ──');
  if (!totalMiss.length) console.log('  none');
  for (const r of totalMiss.slice(0, 25)) {
    const note = r.cross_family_members === r.members ? '  (every member is from another family)' : '';
    console.log(`  ${String(r.members).padStart(3)} members, 0 linked  ${r.parent}${note}`);
  }
  if (totalMiss.length > 25) console.log(`  ... and ${totalMiss.length - 25} more`);

  if (errors.length) {
    console.log(`\n── COULD NOT READ ─────────────────────────────────────────────`);
    for (const r of errors.slice(0, 10)) console.log(`  ${r.parent}: ${String(r.error).slice(0, 70)}`);
  }

  //  The question that decides whether a miss matters. Asked after the loop so
  //  every hub has contributed its links first.
  const allMisses = [...new Set(rows.flatMap((r) => r.misses))];
  const nowhere = allMisses.filter((h) => !linkedByAnyHub.has(h)).sort();
  const elsewhere = allMisses.filter((h) => linkedByAnyHub.has(h));

  console.log('\n── LINKED BY NO HUB READ HERE. The serious ones. ───────────────');
  if (!nowhere.length) console.log('  none');
  nowhere.slice(0, 40).forEach((h) => console.log('  ' + h));
  if (nowhere.length > 40) console.log(`  ... and ${nowhere.length - 40} more`);

  console.log('\n── SUMMARY ────────────────────────────────────────────────────');
  console.log(`  parents read              ${rows.length - errors.length}`);
  console.log(`  link every member         ${ok.length}`);
  console.log(`  PARTIAL                   ${partial.length}`);
  console.log(`  TOTAL                     ${totalMiss.length}`);
  console.log(`  unreadable                ${errors.length}`);
  console.log(`  distinct members missed    ${allMisses.length}`);
  console.log(`    linked by ANOTHER hub    ${elsewhere.length}   reachable, parent is a dead end`);
  console.log(`    linked by NO hub read    ${nowhere.length}   the serious case`);

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({
      counts: {
        parents_read: rows.length - errors.length,
        ok: ok.length,
        partial: partial.length,
        total_miss: totalMiss.length,
        errors: errors.length,
        distinct_members_missed: allMisses.length,
        linked_by_another_hub: elsewhere.length,
        linked_by_no_hub: nowhere.length,
      },
      linked_by_no_hub: nowhere,
      rows,
    }, null, 2) + '\n');
    console.log(`\nwrote ${jsonOut}`);
  }

  if (aborted) {
    console.error(`\nABORTED: ${aborted}`);
    process.exit(1);
  }
}

if (require.main === module) main();
