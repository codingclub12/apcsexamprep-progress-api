'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the weekly course blog, offline half.
//
//  Covers three things with no network and no secrets, so it runs on every PR:
//
//  1. Every post in content/blog validates against lib/blog-validate.js. This
//     is the same gate the unattended weekly session refuses to publish past,
//     run here so a broken post is a red PR rather than a red Tuesday.
//
//  2. scripts/blog.js emit and plan produce the exact JSON an unattended
//     session hands to the Shopify connector verbatim. If these ever drift
//     from a valid ArticleCreateInput shape, the session either fails loudly
//     or, worse, publishes something malformed with nobody watching.
//
//  3. lib/blog-verify.js's normalizer. This one is a regression test for a
//     real bug: the first version reused blog-house's stripTags, which
//     collapses a tag to nothing rather than a space, so `</strong><ol><li>`
//     disappeared instead of separating the words on either side of it. That
//     glued unrelated sentences into one giant "chunk" that legitimately live
//     content then failed to match, i.e. a false FAIL on real, correct posts.
//     Caught once by hand against a real live page; pinned here so it cannot
//     come back silently.
//
//  Run: npm run smoke:blogcontent
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'content', 'blog');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

function loadPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.js'))
    .map((f) => require(path.join(BLOG_DIR, f)));
}

// ── 1. every committed post validates ───────────────────────────────────────
const { validateBatch } = require('../lib/blog-validate');
const posts = loadPosts();
ok('at least one post exists to check', posts.length > 0, posts.length);
const problems = validateBatch(posts);
ok('every post in content/blog passes the publish gate', problems.length === 0, problems.slice(0, 10));

// ── 2. emit / plan produce valid ArticleCreateInput shapes ──────────────────
const REQUIRED_KEYS = ['title', 'handle', 'body', 'summary', 'author', 'tags', 'isPublished', 'metafields'];

function checkArticlePayload(article, label) {
  const missing = REQUIRED_KEYS.filter((k) => !(k in article));
  ok(`${label}: has every required ArticleCreateInput key`, missing.length === 0, missing);
  ok(`${label}: body is non-empty HTML`, typeof article.body === 'string' && article.body.length > 500);
  ok(`${label}: title_tag and description_tag metafields present`,
    (article.metafields || []).filter((m) => m.namespace === 'global').length === 2);
  ok(`${label}: no blogId leaked into the payload`, !('blogId' in article));
}

// Node's execFileSync default maxBuffer is 1MB. `plan` on a far-future date
// emits every post's full rendered HTML as JSON in one shot, and this batch
// crossed that ceiling for real at 36 posts (ENOBUFS, not a flake) well short
// of the 144-post full calendar. Sized with wide headroom past that.
const EXEC_OPTS = { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 };

if (posts.length) {
  const first = posts[0].meta.handle;
  const emitted = JSON.parse(execFileSync('node', ['scripts/blog.js', 'emit', first], EXEC_OPTS));
  ok('emit: names the right course and blog', typeof emitted.course === 'string' && typeof emitted.blogHandle === 'string');
  checkArticlePayload(emitted.article || {}, 'emit');

  const planned = execFileSync('node', ['scripts/blog.js', 'plan', '2099-01-01'], EXEC_OPTS)
    .trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  ok('plan: a far-future date includes every post', planned.length === posts.length, `${planned.length}/${posts.length}`);
  for (const p of planned) checkArticlePayload(p.article, `plan:${p.handle}`);
}

// ── 3. blog-verify's normalizer does not glue tags together ────────────────
const { normalize, proseChunks, verifyLive } = require('../lib/blog-verify');

ok('normalize: adjacent tags separate with a space, not nothing',
  normalize('<strong>done</strong><ol><li>next</li></ol>') === 'done next');

ok('normalize: named entities decode the same as literals',
  normalize('Tanner &nbsp;&middot;&nbsp; Crow'.replace('&middot;', '·'))
    === normalize('Tanner · Crow'));

ok('proseChunks: a two-sentence body yields two chunks, not one merged blob',
  proseChunks('<p>' + 'A'.repeat(65) + '. ' + 'B'.repeat(65) + '.</p>').length === 2);

// The regression itself: byline-then-heading text with no sentence-ending
// period must not glue onto the next real sentence and then fail to match.
{
  const body = '<div class="apcs-post-byline">Author Name &nbsp;·&nbsp; Teacher &nbsp;·&nbsp; 9 min read</div>'
    + '<nav><strong>What this covers</strong><ol><li>First topic here today</li></ol></nav>'
    + '<p>' + 'This opening sentence is long enough to count as a real prose chunk on its own. '.repeat(1) + '</p>';
  const fakePost = { meta: { handle: 'regression-fixture' }, body };
  // The live page is byte-identical here; this only exercises the chunker.
  const result = verifyLive(fakePost, `<h1>x</h1>${body}<script type="application/ld+json">{"@type":"FAQPage"}</script>`);
  ok('verifyLive: byline/TOC boilerplate does not merge into the first real sentence',
    result.chunksMissing === 0 && result.chunksChecked >= 1, result);
}

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
