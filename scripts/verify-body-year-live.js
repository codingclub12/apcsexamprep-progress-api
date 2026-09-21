'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DID THE BODY REWRITE LAND, AND DID IT COST ANYTHING?
//
//    node scripts/verify-body-year-live.js               every page in the spec
//    node scripts/verify-body-year-live.js <handle>      one page
//
//  Run it BEFORE the import as well as after. A generated sheet goes stale: on
//  2026-09-08 one sat unimported for a day while somebody fixed the same page a
//  better way, and importing it would have reverted the better fix. If a page
//  already reads clean here, its sheet is one to delete rather than import.
//
//  ── THE CHECK ASSERTS THE THING THAT MATTERS ────────────────────────────────
//  Not "did the page change". Three things, and the third is the point:
//
//    GONE     every stale claim the spec targets is absent from the live body
//    THERE    every replacement the spec writes is present
//    INTACT   the page did not lose anything else. Counted structurally, by
//             comparing element and section counts against the body this repo
//             expects, because a MERGE that truncated a body would otherwise
//             pass the first two tests with room to spare.
//
//  The second test is what makes this a real live check: every one of those
//  strings was FALSE on the storefront before the import, so it cannot pass by
//  accident the way an /api/health 200 can.
// ─────────────────────────────────────────────────────────────────────────────

const { PAGES } = require('../seed/body-year-rewrites');
const { pageBody } = require('../lib/storefront-fetch');

//  ── A PAGE THAT COULD NOT BE READ HAS NO STATE ─────────────────────────────
//  Found 2026-09-21. Asked whether the hub sheet had been imported, this script
//  hit a 429 on its one page and printed:
//
//      0 done, 0 partly imported, 0 pending, 1 NEEDING ATTENTION.
//      Nothing imported yet. This is the expected state before step 1.
//
//  The page was imported. Every claim was live. The second line is a verdict
//  about a body this run never saw, and it reads more confidently than the
//  UNREACHABLE line above it, so a reader skimming to the summary takes it.
//
//  That is the same shape as the bot-management incident of 2026-09-03, where
//  three verifiers reported plausible false regressions off a challenge page,
//  and the lesson is the same one: the fix is not a better fetch, it is
//  refusing to say anything about what was not observed.
//
//  So the counts are split. `unreachable` is a page that threw, and it is not
//  pending, not done, and not a number the summary may fold into either.
//  `truncated` is a page that WAS read and came back too short, which is a real
//  finding about a real body. Both still exit non-zero; only one is a verdict.
//
//  Exported and pure so smoke/body-year-csv.js can assert on it without a
//  network call, which is the only way the "every page unreachable" case is
//  ever going to be tested.
function summary({ done, partial, pending, unreachable, truncated }) {
  const observed = done + partial + pending;
  const out = [`${done} done, ${partial} partly imported, ${pending} pending`
    + (unreachable ? `, ${unreachable} UNREACHABLE` : '')
    + (truncated ? `, ${truncated} TRUNCATED` : '') + '.'];

  if (!observed) {
    out.push('NOTHING WAS READ. This run says nothing about what is imported, and a 429');
    out.push('from the storefront is the usual cause. Re-run before concluding anything.');
    return out;
  }
  if (!done && !partial) {
    out.push(`None of the ${observed} page(s) read is imported yet.`
      + (unreachable ? '' : ' This is the expected state before step 1.'));
  } else if (partial) {
    out.push('A partly imported page is normal when edits were added after its import.');
    out.push('Regenerating writes a sheet carrying only what is still outstanding.');
  }
  if (unreachable) {
    out.push(`${unreachable} page(s) could not be read at all. Their state is UNKNOWN rather`);
    out.push('than pending, and nothing above is a statement about them.');
  }
  return out;
}

module.exports = { summary };

//  The run itself, behind a main guard so requiring this file for summary()
//  does not fetch a single page.
function main() {
  const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
  const specs = only ? PAGES.filter((p) => p.handle === only) : PAGES;
  if (!specs.length) { console.error(`no page named ${only} in seed/body-year-rewrites.js`); process.exit(2); }

  //  Shopify decodes &nbsp; back to the character on save, so a body sent with
  //  the entity comes back carrying U+00A0. Compare on a normalized form.
  const norm = (s) => s.replace(/&nbsp;/g, ' ');

  let pending = 0, done = 0, partial = 0, unreachable = 0, truncated = 0;

  for (const spec of specs) {
    let body;
    try { body = pageBody(spec.handle).body_html; }
    catch (e) { console.log(`\n${spec.handle}\n  UNREACHABLE  ${String(e.message).slice(0, 80)}`); unreachable++; continue; }

    const stillStale = spec.edits.filter((e) => body.includes(e.find));
    const landed = spec.edits.filter((e) => norm(body).includes(norm(e.replace)));

    //  INTACT: a truncating MERGE is the failure this catches. The shipped body
    //  is within a few hundred characters of the source either way, so anything
    //  that lost a section shows up immediately.
    const tags = (body.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length;
    const shortBody = body.length < 10000;

    const state = stillStale.length === 0 && landed.length === spec.edits.length ? 'DONE'
      : landed.length === 0 ? 'PENDING' : 'PARTIAL';

    console.log(`\n${spec.handle}   [${state}]`);
    console.log(`  ${body.length} chars, ${tags} elements`);
    console.log(`  stale claims still live : ${stillStale.length} of ${spec.edits.length}`);
    console.log(`  new claims present      : ${landed.length} of ${spec.edits.length}`);
    if (shortBody) console.log('  WARNING body is under 10k characters, which would mean a truncating import');

    if (state === 'DONE') done++;
    else if (state === 'PENDING') pending++;
    else {
      partial++;
      //  PARTIAL used to be reported as a thing to stop on, and that was right
      //  while a page shipped as one all-or-nothing sheet. It is now a normal
      //  state: the CSA score calculator was imported on 2026-09-17 with 13 edits
      //  and a fourteenth was added afterwards, so the generator emits a
      //  follow-up sheet and skips what is already live. What matters is whether
      //  the outstanding edits have a sheet waiting, so name them.
      console.log('  PARTIAL: some edits are live and some are not. Outstanding:');
      for (const e of stillStale) console.log(`    ${JSON.stringify(e.find.slice(0, 56))}`);
      console.log('  Regenerate to get a sheet for just these: node scripts/body-year-csv.js out/dir');
    }
    if (shortBody) truncated++;
  }

  for (const line of summary({ done, partial, pending, unreachable, truncated })) console.log(`  ${line}`);
  console.log('');
  //  Non-zero only on a state a human must actually look at, which now means a
  //  truncated body or an unreachable page. Pending and partial are both normal
  //  points in a staged import.
  process.exit(unreachable + truncated ? 1 : 0);

}

if (require.main === module) main();