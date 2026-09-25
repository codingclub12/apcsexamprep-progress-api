'use strict';
// -----------------------------------------------------------------------------
//  BOARD 333 LIVE CHECK, AT EVERY STAGE OF THE IMPORT.
//
//      npm run verify:qotddupes
//
//  The 72 duplicate handles go away in two steps that MUST happen in order: a
//  human unpublishes them, then the redirect sheet is imported. This reads the
//  live store and says which stage each one is at. It takes no flag for which
//  stage it expects, because a flag can be set wrong.
//
//      live         Path still answers 200. The unpublish has not happened, and
//                   importing the sheet now would create a redirect that never
//                   fires while Matrixify logs every row as a success.
//      unpublished  Path answers 404. Ready for the sheet.
//      redirected   Path answers 301 and lands on its Target. Done.
//      wrong        anything else, named rather than glossed.
//
//  ── WHY THIS IS NOT PARANOIA ───────────────────────────────────────────────
//  Shopify: "You can redirect only from broken URLs. If the URL still loads a
//  valid webpage, then the URL redirect won't work." So importing first is a
//  silent no-op that LOOKS like success from inside Admin: 72 redirect rows
//  present, 72 URLs still serving the old article. Nothing in the import log
//  says otherwise. Only asking the live store does.
//
//  Fetching goes through lib/storefront-fetch.js with NO User-Agent. Redirects
//  are read with follow disabled, because following them hides the 301 that is
//  the entire thing being measured. A redirect has no body, so looksReal() does
//  not apply to it; a 200 DOES get that check, since a bot challenge served
//  with a 200 would otherwise read as "still live" and be indistinguishable
//  from the real thing.
//
//  No em-dashes, per repo convention. Zero PII: public URLs only.
// -----------------------------------------------------------------------------

const sf = require('../lib/storefront-fetch.js');
const G = require('./csa-qotd-dupe-redirects.js');

const STORE_HOST = /^https?:\/\/(www\.)?apcsexamprep\.com/i;

function samePath(a, b) {
  return String(a).replace(STORE_HOST, '').replace(/[?#].*$/, '').replace(/\/$/, '')
    === String(b).replace(STORE_HOST, '').replace(/[?#].*$/, '').replace(/\/$/, '');
}

//  One article's stage. Never throws for a bad answer: a wrong state is a
//  RESULT to report across all 72, not an exception that hides the other 71.
function stageOf(row, fetch) {
  let r;
  try { r = fetch(row.Path); } catch (e) { return { stage: 'wrong', why: 'fetch failed: ' + e.message }; }
  if (!r || !r.code) return { stage: 'wrong', why: 'no status code' };

  if (r.code === '301' || r.code === '302') {
    if (!r.redirectUrl) return { stage: 'wrong', why: r.code + ' with no destination' };
    if (!samePath(r.redirectUrl, row.Target)) {
      return { stage: 'wrong', why: r.code + ' goes to ' + r.redirectUrl + ', not ' + row.Target };
    }
    return { stage: 'redirected', note: r.code };
  }
  //  A 429 THAT OUTLIVED ITS RETRIES IS NOT AN ANSWER ABOUT THE PAGE, so it is
  //  its own state rather than `wrong`. raw() already retries it a bounded
  //  number of times; reaching here means the limit is sustained, which is a
  //  fact about this check's request rate and not about the article. Reported
  //  as `wrong` it reads as a broken page: on 2026-09-21 that was 20 handles
  //  and 23 targets, and on 2026-09-25, after the retry was added, still 31
  //  targets. Every one was fine. Pacing lowers how often this happens and
  //  cannot prevent it, so the classifier must never be able to call it a
  //  content failure in the first place.
  if (r.code === '429') return { stage: 'unknown', why: 'rate limited after retries, so this read proves nothing either way' };
  if (r.code === '404') return { stage: 'unpublished' };
  if (r.code === '200') {
    if (!sf.looksReal(r.body)) return { stage: 'wrong', why: '200 but not a rendered page, so this read proves nothing' };
    return { stage: 'live' };
  }
  return { stage: 'wrong', why: 'answered ' + r.code };
}

module.exports = { stageOf, samePath };

if (require.main === module) {
  const rows = G.rowsFor(G.load());
  //  sf.raw, NOT sf.rawOnce. This walks 144 storefront requests (72 paths plus
  //  72 targets) and the store rate limits well inside that. rawOnce returns the
  //  429 as if it were an answer about the page, so on 2026-09-21 this reported
  //  20 handles `wrong` and 23 targets not serving, all of them fine. raw()
  //  retries only a 429, a bounded number of times with a growing wait, which is
  //  the whole reason it exists: the module's own comment records the same bug
  //  in verify-cyber-qotd-live on 2026-09-04, throttled on its sixth request and
  //  calling a correct import broken. Everything else still fails on the first
  //  answer, because a 404 retried three times is still a 404.
  //  AND PACED. Retrying was not enough on its own: on 2026-09-25 this still
  //  reported 31 of 72 redirect targets "not serving", every one a 429 from its
  //  own request rate. raw() retries a bounded number of times with a short
  //  backoff, which clears a momentary limit and not a sustained one, and 144
  //  requests as fast as node can issue them is sustained. An independent
  //  verifier re-measuring the same 72 with 100ms between requests got zero.
  //  So the retry is the floor and the spacing is what keeps us off it.
  const pause = () => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 120);
  const fetch = (p) => { pause(); return sf.raw(p, { follow: false }); };
  const counts = { live: 0, unpublished: 0, redirected: 0, wrong: 0, unknown: 0 };
  let failed = 0;

  rows.forEach((row) => {
    const s = stageOf(row, fetch);
    counts[s.stage] += 1;
    if (s.stage === 'wrong') {
      failed += 1;
      console.log('  WRONG ' + row.Path.replace('/blogs/ap-csa-daily-practice/', '').padEnd(52) + s.why);
    } else if (s.stage === 'unknown') {
      console.log('  ?     ' + row.Path.replace('/blogs/ap-csa-daily-practice/', '').padEnd(52) + s.why);
    }
  });

  console.log('');
  console.log('  ' + counts.live + ' live, ' + counts.unpublished + ' unpublished, '
    + counts.redirected + ' redirected, ' + counts.wrong + ' wrong, '
    + counts.unknown + ' unknown, of ' + rows.length);
  //  An unknown is not a pass and not a failure. Saying so is the point: the
  //  run has to be repeated when the limit clears, and a summary that folded
  //  these into either column would hide that.
  if (counts.unknown) {
    console.log('  ' + counts.unknown + ' could not be read because of rate limiting. Re-run when the');
    console.log('  limit clears; nothing above is a verdict on those.');
  }

  if (counts.live === rows.length) {
    console.log('  STAGE 1 NOT DONE. All 72 still serve a page, so the redirect sheet would');
    console.log('  import cleanly and do nothing. A human unpublishes these first.');
  } else if (counts.unpublished === rows.length) {
    console.log('  Ready. Import imports/2026-09-18-csa-qotd-333/' + G.SHEET + ' now.');
  } else if (counts.redirected === rows.length) {
    console.log('  Done. All 72 redirect to the daily-series handle that carries the question.');
  } else if (!counts.wrong) {
    console.log('  PART WAY. Finish the unpublish before importing, or the sheet covers only some.');
  }

  //  A target that does not resolve would send a student to a 404, so it is
  //  checked even when every Path is still live.
  const badTargets = [];
  const unknownTargets = [];
  rows.forEach((row) => {
    let t;
    try { t = fetch(row.Target); } catch (e) { badTargets.push(row.Target + ': ' + e.message); return; }
    if (t && t.code === '429') { unknownTargets.push(row.Target); return; }
    if (!t || t.code !== '200') badTargets.push(row.Target + ': answered ' + (t && t.code));
  });
  if (badTargets.length) {
    failed += badTargets.length;
    console.log('');
    console.log('  ' + badTargets.length + ' redirect TARGET(s) do not serve a page:');
    badTargets.slice(0, 10).forEach((t) => console.log('    ' + t));
  } else if (!unknownTargets.length) {
    console.log('  All ' + rows.length + ' redirect targets serve a page.');
  }
  if (unknownTargets.length) {
    console.log('  ' + unknownTargets.length + ' target(s) could not be read because of rate limiting,');
    console.log('  which is this check\'s request rate and not a fact about those pages.');
  }

  process.exit(failed ? 1 : 0);
}
