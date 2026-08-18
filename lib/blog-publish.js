'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PUBLISH THE WEEKLY COURSE POSTS TO SHOPIFY, FROM THE REPO.
//
//  This deliberately mirrors lib/csa-exercise-publish.js rather than inventing
//  a second posture, because the two jobs have the same hazards and the house
//  already decided how to handle them. Same three safety properties:
//
//  1. NEVER OVERWRITE. Only ever CREATE. A handle that already exists is
//     skipped and reported. Re-running is therefore a no-op rather than a
//     surprise edit of a live article that somebody may have since corrected
//     by hand in the Shopify admin.
//
//  2. ALL OR NOTHING ON VALIDATION. Every post in content/blog is validated
//     before ANY post is created, not just the ones due this week. A post that
//     is broken but not yet due is a problem you want to hear about now, while
//     it is cheap, rather than on the morning it publishes itself.
//
//  3. SCOPE CHECKED FIRST, AND SAID PLAINLY. Writing articles needs
//     write_content. If the token lacks it, say so in a sentence instead of
//     failing once per post.
//
//  These posts publish LIVE with no human review, so the validation gate in
//  lib/blog-validate.js is not advisory. Nothing here can bypass it: there is
//  no force flag and adding one would defeat the only control standing between
//  a generated draft and a student reading it.
// ─────────────────────────────────────────────────────────────────────────────

const { validateBatch } = require('./blog-validate');

const DEFAULT_API_VERSION = '2025-07';
const REQUIRED_SCOPE = 'write_content';
const GAP_MS = 300;
const AUTHOR = 'Tanner Crow';

function shop() { return (process.env.SHOPIFY_SHOP || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, ''); }
function token() { return (process.env.SHOPIFY_ADMIN_TOKEN || '').trim(); }
function apiVersion() { return (process.env.SHOPIFY_API_VERSION || DEFAULT_API_VERSION).trim(); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function admin(query, variables) {
  const s = shop(), t = token();
  if (!s || !t) throw new Error('SHOPIFY_SHOP or SHOPIFY_ADMIN_TOKEN is not set');
  const res = await fetch(`https://${s}/admin/api/${apiVersion()}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': t, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: variables || {} }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`shopify ${res.status}: ${text.slice(0, 600)}`);
  let json;
  try { json = JSON.parse(text); } catch (e) { throw new Error('shopify returned non-JSON: ' + text.slice(0, 300)); }
  if (json.errors && json.errors.length) {
    throw new Error('shopify graphql: ' + JSON.stringify(json.errors).slice(0, 600));
  }
  return json.data;
}

async function scopes() {
  const d = await admin('{ currentAppInstallation { accessScopes { handle } } }');
  const list = ((d.currentAppInstallation || {}).accessScopes || []).map((s) => s.handle);
  return { scopes: list, can_write: list.includes(REQUIRED_SCOPE) };
}

// Blog handle to blog id. Resolved live rather than hardcoded, because a
// hardcoded id that is wrong publishes a post into the wrong blog silently.
async function blogIds() {
  const d = await admin('{ blogs(first: 50) { nodes { id handle } } }');
  return new Map(d.blogs.nodes.map((b) => [b.handle, b.id]));
}

// Every article handle already live, so a create is never a silent overwrite.
async function liveHandles() {
  const out = new Set();
  let after = null;
  for (let guard = 0; guard < 40; guard++) {
    const d = await admin(
      `query($after: String) { articles(first: 250, after: $after) {
         pageInfo { hasNextPage endCursor } nodes { handle } } }`,
      { after }
    );
    for (const n of d.articles.nodes) out.add(n.handle);
    if (!d.articles.pageInfo.hasNextPage) break;
    after = d.articles.pageInfo.endCursor;
  }
  return out;
}

const CREATE = `mutation Create($article: ArticleCreateInput!) {
  articleCreate(article: $article) { article { id handle } userErrors { field message } }
}`;

function articleInput(post, blogId) {
  const m = post.meta;
  return {
    blogId,
    title: m.title,
    handle: m.handle,
    body: post.body,
    summary: m.summary,
    author: { name: m.author || AUTHOR },
    tags: m.tags,
    isPublished: true,
    // Shopify stores article SEO in these two metafields, the same way pages do.
    metafields: [
      { namespace: 'global', key: 'title_tag', type: 'single_line_text_field', value: m.seoTitle },
      { namespace: 'global', key: 'description_tag', type: 'multi_line_text_field', value: m.seoDescription },
    ],
  };
}

async function publish({ posts, dryRun = false, on = null } = {}) {
  if (!Array.isArray(posts) || !posts.length) return { ok: false, refused: 'empty', message: 'no posts supplied' };

  // The whole library, not just this week's batch.
  const problems = validateBatch(posts);
  if (problems.length) {
    return { ok: false, refused: 'validation', problem_count: problems.length, problems: problems.slice(0, 40) };
  }

  const perms = await scopes();
  if (!perms.can_write) {
    return {
      ok: false, refused: 'scope', scopes: perms.scopes,
      message: `The Shopify Admin token in this environment cannot write articles: it is missing ${REQUIRED_SCOPE}.`,
    };
  }

  const date = on || new Date().toISOString().slice(0, 10);
  const due = posts.filter((p) => p.meta.publishOn <= date);
  const notYet = posts.filter((p) => p.meta.publishOn > date).map((p) => p.meta.handle);

  const [ids, live] = await Promise.all([blogIds(), liveHandles()]);

  const unknownBlogs = due.filter((p) => !ids.has(p.meta.blogHandle));
  if (unknownBlogs.length) {
    return {
      ok: false, refused: 'blog',
      message: 'these posts target a blog handle that does not exist in the store',
      handles: unknownBlogs.map((p) => `${p.meta.handle} -> ${p.meta.blogHandle}`),
      known_blogs: [...ids.keys()],
    };
  }

  const todo = due.filter((p) => !live.has(p.meta.handle));
  const already = due.filter((p) => live.has(p.meta.handle)).map((p) => p.meta.handle);

  if (dryRun) {
    return {
      ok: true, dry_run: true, validated: posts.length, as_of: date,
      would_create: todo.map((p) => `${p.meta.handle} -> /blogs/${p.meta.blogHandle}/${p.meta.handle}`),
      already_live: already, not_due_yet: notYet,
    };
  }

  const created = [], failed = [];
  for (const p of todo) {
    try {
      const d = await admin(CREATE, { article: articleInput(p, ids.get(p.meta.blogHandle)) });
      const errs = d.articleCreate.userErrors || [];
      if (errs.length) failed.push({ handle: p.meta.handle, errors: errs });
      else created.push(`/blogs/${p.meta.blogHandle}/${d.articleCreate.article.handle}`);
    } catch (e) {
      failed.push({ handle: p.meta.handle, errors: [{ message: e.message }] });
    }
    await sleep(GAP_MS);
  }

  return {
    ok: failed.length === 0,
    validated: posts.length, as_of: date,
    created: created.length, created_urls: created,
    already_live: already.length, not_due_yet: notYet.length,
    failed: failed.length, failures: failed,
  };
}

module.exports = { publish, admin, scopes, blogIds, liveHandles, articleInput };
