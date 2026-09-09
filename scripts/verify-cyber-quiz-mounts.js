'use strict';
// -----------------------------------------------------------------------------
//  DID THE QUIZ MOUNT SHEET LAND, AND DID IT TAKE THE ANSWER KEY WITH IT?
//
//  The mount sheets ship one unit at a time so each import can be checked before
//  the next one goes in. This is that check.
//
//  It asks three things per page, and the third is the one that matters:
//
//    1. the page carries exactly one mount container
//    2. that container names the right course, unit and lesson
//    3. NO answer-key idiom survives anywhere in the body
//
//  Three is not implied by one. A sheet that added the mount and left the old
//  quiz markup in place would render two quizzes and still publish the key, and
//  a check that only looked for the mount would call that a success.
//
//  It also asks the SERVER whether it will actually serve that lesson, because a
//  mount pointing at a bank that does not exist renders nothing at all: the
//  player wraps its whole render in `if (r.status !== 404)`. A page that mounts
//  and answers 404 is worse than one that was never touched.
//
//  Read only, no credential, fetched through lib/storefront-fetch.js.
//
//  Run: node scripts/verify-cyber-quiz-mounts.js [unit]
//       node scripts/verify-cyber-quiz-mounts.js 3
//       node scripts/verify-cyber-quiz-mounts.js        all units
// -----------------------------------------------------------------------------
const sf = require('../lib/storefront-fetch');
const { pageFromHandle } = require('../utils');

const API = 'https://progress.apcsexamprep.com';
const COURSE = 'ap-cybersecurity';

//  The quiz pages this migration covers. 1.1 and 1.2 were mounted earlier and
//  are listed so a regression on them is visible too.
const PAGES = {
  1: [1, 2, 3, 4, 5],
  2: [1, 2, 3, 4],
  3: [1, 2, 3, 4, 5, 6],
  4: [1, 2, 3, 4],
  5: [1, 2, 3, 4, 5, 6],
};

//  Every generation's key idiom. Any one of these surviving means the page can
//  still be graded, or read, in the browser.
const KEY_IDIOMS = [
  ['ANSWERS', /\bANSWERS\s*=/],
  ['CORR', /\bCORR\s*=/],
  ['data-correct', /data-correct=/],
  ['data-val', /data-val=/],
  ['checkMCQ', /checkMCQ\(/],
  ['q-block', /class="q-block"/],
  ['l-q', /class="l-q"/],
  ['opt-btn', /class="opt-btn"/],
];

//  ── AND A CHECK THAT DOES NOT DEPEND ON THE LIST ABOVE ──────────────────────
//  The list went stale, and it went stale silently, which is the only way a
//  list ever fails. On 2026-09-09 this script reported `key: none` for
//  ap-cyber-unit-3-exam, which ships `var CORR=[1,1,1,2,2,...]`: twenty answers
//  in the page source under a name nobody had added. CORR is in the list now,
//  and that fix on its own would be worth nothing, because the next generation
//  will pick a different name and this script will go quiet again.
//
//  So look for the SHAPE instead. An answer key is a run of small integers or
//  single letters bound to a name, and that is true whatever the name is. Four
//  entries is the floor: shorter than that and a coordinate pair or an RGB
//  triple starts matching.
//
//  It reports a CANDIDATE rather than a key, deliberately. `var SIZES=[1,2,3,4]`
//  would match and is innocent. Across all 25 quiz pages and all 5 exams, one
//  literal matched and it was the real thing, so the false positive rate is
//  worth the alternative: a name list that reports clean on a published key.
const KEY_SHAPES = [
  ['array literal', /(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\[\s*(?:(?:[0-4]|'[A-Ea-e]'|"[A-Ea-e]")\s*,\s*){3,}(?:[0-4]|'[A-Ea-e]'|"[A-Ea-e]")\s*\]/g],
  ['index to letter map', /(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\{\s*(?:\d+\s*:\s*['"][A-Ea-e]['"]\s*,\s*){3,}\d+\s*:\s*['"][A-Ea-e]['"]\s*\}/g],
];

function keyShapes(body) {
  const found = [];
  for (const [label, rx] of KEY_SHAPES) {
    for (const m of body.matchAll(new RegExp(rx.source, 'g'))) found.push(`${m[1]} (${label})`);
  }
  return found;
}

async function serves(unit, lesson) {
  const url = `${API}/api/quiz/${COURSE}/${unit}/${encodeURIComponent(lesson)}/quiz`;
  try {
    const r = await fetch(url);
    if (r.status === 404) return { ok: false, why: '404, no bank' };
    const j = await r.json().catch(() => null);
    const pool = j && j.pool;
    return { ok: pool > 0, why: pool > 0 ? `pool ${pool}` : 'no pool' };
  } catch (e) {
    return { ok: false, why: 'unreachable' };
  }
}

(async () => {
  const only = process.argv[2] ? [Number(process.argv[2])] : Object.keys(PAGES).map(Number);
  let mounted = 0, keyed = 0, wrong = 0, unserved = 0, total = 0;

  for (const u of only) {
    if (!PAGES[u]) { console.error(`no such unit: ${u}`); process.exit(2); }
    console.log(`\nUnit ${u}`);
    for (const n of PAGES[u]) {
      const handle = `ap-cyber-unit-${u}-lesson-${n}-quiz`;
      total++;
      let body;
      try { body = sf.pageBody(handle).body_html; }
      catch (e) { console.log(`  ${handle}  UNREACHABLE: ${e.message}`); continue; }

      const mounts = (body.match(/data-apcs-quiz/g) || []).length;
      const named = KEY_IDIOMS.filter(([, rx]) => rx.test(body)).map(([n2]) => n2);
      //  A shape the name list did not know about counts the same as one it did.
      //  Reported separately so a stale list is visible as staleness rather than
      //  disappearing into the same word.
      const shaped = keyShapes(body).filter((f) => !named.some((n2) => f.startsWith(n2 + ' ')));
      const survivors = named.concat(shaped);
      //  utils.pageFromHandle is the resolver production keys on, so the mount
      //  is checked against that rather than against the handle digits. Unit 3's
      //  handles are one lesson higher than the pages they name.
      const want = pageFromHandle(handle);
      const attrOk = !!want
        && body.includes(`data-unit="${want.unit}"`)
        && body.includes(`data-lesson="${want.lesson}"`)
        && body.includes(`data-course="${COURSE}"`);

      if (mounts === 1) mounted++;
      if (survivors.length) keyed++;
      if (mounts === 1 && !attrOk) wrong++;

      let serveNote = '';
      if (mounts === 1 && want) {
        const s = await serves(want.unit, want.lesson);
        if (!s.ok) { unserved++; serveNote = `  SERVER: ${s.why}`; }
        else serveNote = `  server ${s.why}`;
      }

      const state = mounts === 1 && !survivors.length && attrOk ? 'ok  '
        : mounts === 0 ? 'not mounted'
          : 'PROBLEM';
      const bits = [];
      if (mounts !== 1) bits.push(`${mounts} mount(s)`);
      if (survivors.length) bits.push(`key survives: ${survivors.join(', ')}`);
      if (mounts === 1 && !attrOk) bits.push(`wrong mount attrs, wanted ${want && want.lesson}`);
      console.log(`  ${state.padEnd(12)} ${handle.replace('ap-cyber-', '').padEnd(22)}`
        + `${want ? want.lesson.padEnd(5) : '?    '}${bits.join('; ')}${serveNote}`);
    }
  }

  console.log(`\n  ${mounted} of ${total} mounted, ${keyed} still ship a key, `
    + `${wrong} mount the wrong lesson, ${unserved} mounted but not served`);

  //  ── THE UNIT TESTS, REPORTED AND NOT FAILED ─────────────────────────────
  //  None of the five has been migrated, so a key here is the KNOWN state and
  //  must not read as a regression. They are swept anyway for two reasons.
  //  First, a teacher who locks a unit test in the gradebook is relying on
  //  something that does not exist, and this is where that gets counted.
  //  Second, the shape detector above was built because THIS is the page set
  //  that broke the name list, so the check has to run where it can be seen
  //  working rather than only where it currently finds nothing.
  if (!process.argv[2]) {
    console.log('\nUnit tests (not migrated; reported, not failed)');
    let examKeyed = 0;
    for (let u = 1; u <= 5; u++) {
      const handle = `ap-cyber-unit-${u}-exam`;
      let body;
      try { body = sf.pageBody(handle).body_html; }
      catch (e) { console.log(`  ${handle}  UNREACHABLE: ${e.message}`); continue; }
      const mounts = (body.match(/data-apcs-quiz/g) || []).length;
      const named = KEY_IDIOMS.filter(([, rx]) => rx.test(body)).map(([n2]) => n2);
      const shaped = keyShapes(body).filter((f) => !named.some((n2) => f.startsWith(n2 + ' ')));
      const survivors = named.concat(shaped);
      if (survivors.length) examKeyed++;
      console.log(`  ${survivors.length ? 'ships a key' : 'no key found'}  ${handle.replace('ap-cyber-', '').padEnd(14)}`
        + `${mounts} mount(s)  ${survivors.join(', ')}`);
    }
    console.log(`\n  ${examKeyed} of 5 unit tests publish their answer key. `
      + `Locking one in the gradebook does nothing.`);
  }
  //  Non-zero only for a page that is actively broken. "Not mounted yet" is the
  //  expected state before an import and must not read as a failure.
  process.exit(keyed && mounted ? 1 : (wrong || unserved) ? 1 : 0);
})();
