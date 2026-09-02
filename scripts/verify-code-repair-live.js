// ─────────────────────────────────────────────────────────────────────────────
//  THE LIVE CHECK FOR THE DAILY-PRACTICE CODE REPAIR.
//
//  Refetch all 25 articles from the storefront and assert three things that are
//  every one of them FALSE before the import and TRUE after it:
//
//    1  the mangled span is gone       (200 occurrences today, 0 after)
//    2  the code block serves exactly the repaired bytes
//    3  the recovered program still prints the article's own keyed answer
//
//  All 25, not a sample. A partial Matrixify import is the ordinary failure on
//  a sheet this size, and a sample is exactly what a partial import slips
//  through.
//
//  It reads the storefront rather than the Admin API on purpose: the question is
//  what a student's browser receives, and those are not the same question. The
//  edge cache has a measured staleness tail of about an hour, so a failure here
//  within that window is worth re-running before it is worth believing.
//
//  Run: node scripts/verify-code-repair-live.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { extractArticle } = require('./csa-article-body-extract');
const m = require('./csa-daily-practice-code-repair');

const BLOG = 'ap-csa-daily-practice';
const DIR = path.join(__dirname, '..', 'smoke', 'fixtures', 'csa-daily-practice-code');
const UA = 'Mozilla/5.0 (compatible; apcse-link-graph/1.0) Chrome/120';

const fetchArticle = (handle) => cp.execSync(
  'curl -sSL --max-time 45 --compressed -H ' + JSON.stringify('User-Agent: ' + UA)
  + ' ' + JSON.stringify('https://www.apcsexamprep.com/blogs/' + BLOG + '/' + handle),
  { encoding: 'utf8', maxBuffer: 1 << 26 });

const handles = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.html') && !f.startsWith('CONTROL-'))
  .map((f) => f.replace(/\.html$/, '')).sort();

const problems = [];
let clean = 0;
let matched = 0;
let keyed = 0;

for (const handle of handles) {
  const want = m.repairBody(fs.readFileSync(path.join(DIR, handle + '.html'), 'utf8'));
  let live;
  try { live = extractArticle(fetchArticle(handle)); }
  catch (e) { problems.push(handle + ': fetch failed: ' + e.message); continue; }
  if (live.error) { problems.push(handle + ': ' + live.error); continue; }
  const body = live.body;

  const left = [...body.matchAll(m.MANGLE)].length;
  if (left) problems.push(handle + ': still serves ' + left + ' mangled spans');
  else clean += 1;

  //  The code block, compared byte for byte. Everything outside it is the
  //  article's own and this repair never touched it, so a difference there is
  //  someone else's edit rather than a failed import and is reported as such.
  const liveCode = (body.match(m.CODE_BLOCK) || []).join('\n');
  const wantCode = (want.match(m.CODE_BLOCK) || []).join('\n');
  if (liveCode === wantCode) matched += 1;
  else {
    let i = 0;
    while (i < liveCode.length && i < wantCode.length && liveCode[i] === wantCode[i]) i += 1;
    problems.push(handle + ': the served code block differs at offset ' + i
      + '\n      live: ' + JSON.stringify(liveCode.slice(Math.max(0, i - 40), i + 60))
      + '\n      want: ' + JSON.stringify(wantCode.slice(Math.max(0, i - 40), i + 60)));
  }

  const v = m.crossCheckAnswerKey(body);
  if (v.agrees) keyed += 1;
  else problems.push(handle + ': live body vs its own answer key: ' + (v.disagrees || v.skipped));
}

console.log('');
console.log('  articles refetched from the storefront : ' + handles.length);
console.log('  no mangled span remaining              : ' + clean);
console.log('  code block byte-identical to the sheet : ' + matched);
console.log('  live code agrees with its answer key    : ' + keyed);
console.log('');
if (problems.length) {
  console.error('  ' + problems.length + ' problems');
  problems.forEach((p) => console.error('    ' + p));
  process.exit(1);
}
console.log('LIVE VERIFIED ' + handles.length + ' of ' + handles.length
  + ': no mangled spans, code blocks match the sheet, every program prints its keyed answer');
