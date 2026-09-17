'use strict';
// -----------------------------------------------------------------------------
//  SWEEP THE AP CSA DAILY-PRACTICE BLOG FOR PUBLISHED AUTHOR DELIBERATION.
//
//      node scripts/csa-qotd-authoring-sweep.js [--cache <dir>] [--json <file>]
//
//  Walks every article in ap-csa-daily-practice, pulls the stored body out of
//  the rendered page, and reports what lib/authoring-tells.js finds. 429
//  articles on 2026-09-15, nine of them talking to themselves in front of a
//  student.
//
//  WHY IT CACHES
//  A full pass is 438 storefront requests and about eight minutes. The first
//  version of this sweep did not cache, so widening the rule set meant paying
//  for the whole walk again, and the rule set DID need widening: the first cut
//  of the patterns found five of the nine. With a cache on disk, a new rule is
//  re-run over the same bodies in under a second, which is the difference
//  between iterating on a detector and guessing at one.
//
//  Fetching goes through lib/storefront-fetch.js and sends NO User-Agent, per
//  the repo rule. A sweep that cannot prove it got a real page reports a blog
//  full of clean articles when it is actually being challenged.
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const sf = require('../lib/storefront-fetch.js');
const { extractArticle } = require('./csa-article-body-extract.js');
const tells = require('../lib/authoring-tells.js');

const BLOG = 'ap-csa-daily-practice';

function handles() {
  const out = [];
  let page = 1; let pages = 1;
  do {
    const r = sf.rawOnce('/blogs/' + BLOG + '?view=qotd-json&page=' + page, {});
    if (r.code !== '200') throw new Error('article listing page ' + page + ' answered ' + r.code);
    const j = JSON.parse(r.body);
    pages = j.pages;
    j.articles.forEach((a) => out.push(a.handle));
    page += 1;
  } while (page <= pages);
  return out;
}

//  EVERY failure mode of a single article is caught here, including a THROW.
//  The first version let one bad fetch take down the whole walk: on 2026-09-17
//  a transfer failed with a null status code on article 199 of 429 and the
//  exception unwound out of main(), losing eight minutes of fetching and the
//  other 230 articles. A sweep over hundreds of pages that cannot survive one
//  network blip is a sweep nobody can finish.
function fetchBody(handle) {
  try { return fetchBodyOnce(handle); }
  catch (e) { return { error: (e && e.message) || String(e) }; }
}

function fetchBodyOnce(handle) {
  const r = sf.rawOnce('/blogs/' + BLOG + '/' + handle, {});
  if (!r || !r.code) return { error: 'no status code came back, so the transfer failed' };
  if (r.code !== '200') return { error: 'fetch ' + r.code };
  if (!sf.looksReal(r.body)) return { error: 'not a rendered page, so nothing it does or does not contain means anything' };
  const e = extractArticle(r.body);
  if (e.error) return { error: 'extract: ' + e.error };
  const cf = sf.cloudflareRewritten(e.body);
  if (cf) return { error: 'cloudflare rewrote this body at render time' };
  return { body: e.body };
}

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
}

function main(argv) {
  const cache = flag(argv, '--cache');
  const jsonOut = flag(argv, '--json');
  const only = flag(argv, '--handle');
  if (cache) fs.mkdirSync(cache, { recursive: true });

  const list = only ? [only] : handles();
  console.log('scanning ' + list.length + ' articles in ' + BLOG);

  const hits = []; const errors = [];
  list.forEach((h, i) => {
    let body = null;
    const cached = cache ? path.join(cache, h + '.html') : null;
    if (cached && fs.existsSync(cached)) body = fs.readFileSync(cached, 'utf8');
    else {
      const r = fetchBody(h);
      if (r.error) { errors.push({ handle: h, error: r.error }); return; }
      body = r.body;
      if (cached) fs.writeFileSync(cached, body);
    }
    const strict = tells.find(body, { strictOnly: true });
    const loose = tells.find(body).filter((x) => !x.strict);
    if (strict.length || loose.length) {
      hits.push({
        handle: h,
        strict: strict.map((x) => ({ id: x.id, kind: x.kind, excerpt: x.excerpt.replace(/\s+/g, ' ') })),
        report_only: loose.map((x) => ({ id: x.id, excerpt: x.excerpt.replace(/\s+/g, ' ') })),
      });
    }
    if ((i + 1) % 50 === 0) process.stderr.write('  ' + (i + 1) + '/' + list.length + '\n');
  });

  const withStrict = hits.filter((h) => h.strict.length);
  console.log('\n' + withStrict.length + ' article(s) carry a strict tell, '
    + (hits.length - withStrict.length) + ' carry a report-only one, '
    + errors.length + ' could not be read.\n');
  withStrict.forEach((h) => {
    console.log('  ' + h.handle);
    h.strict.forEach((x) => console.log('      [' + x.id + '] ' + x.excerpt.slice(0, 150)));
  });
  errors.forEach((e) => console.log('  UNREADABLE ' + e.handle + ': ' + e.error));

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify({ blog: BLOG, scanned: list.length, as_of: new Date().toISOString(), hits, errors }, null, 2));
    console.log('\nwrote ' + jsonOut);
  }
  //  A tell is a lead, never a verdict. This exits 0 on a hit on purpose: the
  //  next step is to re-derive the answer, and a sweep that fails a build would
  //  push somebody to delete the sentence instead of fixing the item.
  return { hits, errors };
}

module.exports = { handles, fetchBody, main };
if (require.main === module) main(process.argv.slice(2));
