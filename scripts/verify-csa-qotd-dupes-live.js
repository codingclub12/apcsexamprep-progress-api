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
  const fetch = (p) => sf.raw(p, { follow: false });
  const counts = { live: 0, unpublished: 0, redirected: 0, wrong: 0 };
  let failed = 0;

  rows.forEach((row) => {
    const s = stageOf(row, fetch);
    counts[s.stage] += 1;
    if (s.stage === 'wrong') {
      failed += 1;
      console.log('  WRONG ' + row.Path.replace('/blogs/ap-csa-daily-practice/', '').padEnd(52) + s.why);
    }
  });

  console.log('');
  console.log('  ' + counts.live + ' live, ' + counts.unpublished + ' unpublished, '
    + counts.redirected + ' redirected, ' + counts.wrong + ' wrong, of ' + rows.length);

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
  rows.forEach((row) => {
    let t;
    try { t = fetch(row.Target); } catch (e) { badTargets.push(row.Target + ': ' + e.message); return; }
    if (!t || t.code !== '200') badTargets.push(row.Target + ': answered ' + (t && t.code));
  });
  if (badTargets.length) {
    failed += badTargets.length;
    console.log('');
    console.log('  ' + badTargets.length + ' redirect TARGET(s) do not serve a page:');
    badTargets.slice(0, 10).forEach((t) => console.log('    ' + t));
  } else {
    console.log('  All ' + rows.length + ' redirect targets serve a page.');
  }

  process.exit(failed ? 1 : 0);
}
