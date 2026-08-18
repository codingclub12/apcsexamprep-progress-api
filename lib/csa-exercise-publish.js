'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  PUBLISH THE CSA EXERCISE PAGES TO SHOPIFY, FROM THE REPO.
//
//  WHY THIS EXISTS RATHER THAN A CSV
//  The house route for page content is a Matrixify sheet, and it still is for
//  anything a human is going to eyeball. But Matrixify needs a person at a
//  laptop to upload the file, and these 53 pages are the content half of a
//  feature whose code half already deploys itself. That mismatch is what left
//  the pages sitting in a validated CSV that nobody could import at 7am.
//
//  This publishes the SAME pages from the SAME renderer, so the bytes are
//  generated rather than retyped. Nothing is transcribed, which removes the one
//  failure mode a manual import cannot rule out: a page that looks right and has
//  a corrupted starter or a broken script block.
//
//  ── THE THREE SAFETY PROPERTIES ─────────────────────────────────────────────
//
//  1. NEVER OVERWRITE. It only ever CREATES. A handle that already exists is
//     skipped and reported, never updated. These pages are all new, so a handle
//     that already exists means either this ran before or somebody made a page
//     by hand, and silently replacing either is the outcome worth preventing.
//     That also makes the whole thing idempotent: run it twice, get the same
//     store.
//
//  2. ALL OR NOTHING ON VALIDATION. Every page is validated BEFORE any page is
//     created, using the same checks the CSV builder runs, including the leak
//     check that refuses to ship a page carrying its own answer key. A partial
//     publish of a broken set is worse than no publish, because the failure is
//     invisible once it is live.
//
//  3. SCOPE CHECKED FIRST, AND SAID PLAINLY. The Admin token in this
//     environment was added for the analytics connector, which needs read
//     access. Writing pages needs `write_content`. If it is missing, this says
//     so in a sentence instead of failing 53 times with a permissions error.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { allPages } = require('./csa-exercise-pages');

const DEFAULT_API_VERSION = '2025-07';
const REQUIRED_SCOPE = 'write_content';
// Shopify's GraphQL bucket refills at 50 cost/sec and a pageCreate is cheap, but
// 53 back to back writes is still worth pacing. Serial with a small gap keeps
// this far under any bucket and makes the log readable.
const GAP_MS = 250;

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
  // A GraphQL 200 can still be a total failure. Treating that as success is how
  // a publish reports "done" having written nothing.
  if (json.errors && json.errors.length) {
    throw new Error('shopify graphql: ' + JSON.stringify(json.errors).slice(0, 600));
  }
  return json.data;
}

// What the token is actually allowed to do. Asked before anything is attempted,
// because "write_content missing" is a five second answer and 53 permission
// errors is not.
async function scopes() {
  const d = await admin('{ currentAppInstallation { accessScopes { handle } } }');
  const list = ((d.currentAppInstallation || {}).accessScopes || []).map((s) => s.handle);
  return { scopes: list, can_write_pages: list.includes(REQUIRED_SCOPE) };
}

// Every ap-csa-lesson-* handle that already exists, so a create is never a
// silent overwrite and a re-run is a no-op.
async function liveHandles() {
  const out = new Set();
  let after = null;
  for (let guard = 0; guard < 20; guard++) {
    const d = await admin(
      `query($after: String) { pages(first: 250, after: $after, query: "handle:ap-csa-lesson*") {
         pageInfo { hasNextPage endCursor } nodes { handle } } }`,
      { after }
    );
    const p = d.pages;
    for (const n of p.nodes) out.add(n.handle);
    if (!p.pageInfo.hasNextPage) break;
    after = p.pageInfo.endCursor;
  }
  return out;
}

const CREATE = `mutation Create($page: PageCreateInput!) {
  pageCreate(page: $page) { page { id handle } userErrors { field message } }
}`;

function pageInput(p) {
  return {
    title: p.title,
    handle: p.handle,
    body: p.bodyHtml,
    isPublished: true,
    // Shopify stores page SEO as these two metafields; PageCreateInput has no
    // seo field of its own.
    metafields: [
      { namespace: 'global', key: 'title_tag', type: 'single_line_text_field', value: p.seoTitle },
      { namespace: 'global', key: 'description_tag', type: 'multi_line_text_field', value: p.seoDescription },
    ],
  };
}

// Validation, borrowed wholesale from the CSV builder so the two can never
// disagree about what a shippable page is.
function validateAll(pages) {
  // Required lazily: the CSV script pulls in the exercise bank, and a require
  // cycle at module load would break the admin router's boot.
  const { checkPage, checkHandleRouting, checkNoLeak } = require('../scripts/csa-exercise-pages-csv');
  const exercises = require('../seed/csa-exercises');
  const expected = require(exercises.EXPECTED_FILE).cases;
  const byLesson = new Map(exercises.all().map((x) => [x.lesson, x]));
  const problems = [];
  for (const p of pages) {
    for (const c of checkPage(p)) problems.push(`${p.handle}: ${c}`);
    const r = checkHandleRouting(p);
    if (r) problems.push(`${p.handle}: ${r}`);
    for (const c of checkNoLeak(p, byLesson.get(p.lesson), expected)) problems.push(`${p.handle}: ${c}`);
  }
  return problems;
}

async function publish({ dryRun = false, unit = null, limit = null } = {}) {
  const all = allPages();

  // Validate the WHOLE set, never just the selection. A page excluded by a
  // filter is still going to ship one day, and finding out then is worse.
  const problems = validateAll(all);
  if (problems.length) {
    return { ok: false, refused: 'validation', problems: problems.slice(0, 40), problem_count: problems.length };
  }

  const perms = await scopes();
  if (!perms.can_write_pages) {
    return {
      ok: false,
      refused: 'scope',
      message: `The Shopify Admin token in this environment cannot write pages: it is missing ${REQUIRED_SCOPE}.`
        + ' It was added for the analytics connector, which only reads. Grant write_content to the custom app,'
        + ' or import the Matrixify sheet from scripts/csa-exercise-pages-csv.js instead.',
      scopes: perms.scopes,
    };
  }

  const live = await liveHandles();
  let wanted = all;
  if (unit) wanted = wanted.filter((p) => p.unit === unit);
  const todo = wanted.filter((p) => !live.has(p.handle));
  const skipped = wanted.filter((p) => live.has(p.handle)).map((p) => p.handle);
  const selected = limit ? todo.slice(0, Number(limit)) : todo;

  if (dryRun) {
    return {
      ok: true, dry_run: true, validated: all.length,
      already_live: skipped.length, would_create: selected.map((p) => p.handle),
    };
  }

  const created = [], failed = [];
  for (const p of selected) {
    try {
      const d = await admin(CREATE, { page: pageInput(p) });
      const errs = d.pageCreate.userErrors || [];
      if (errs.length) failed.push({ handle: p.handle, errors: errs });
      else created.push(p.handle);
    } catch (e) {
      failed.push({ handle: p.handle, errors: [{ message: e.message }] });
    }
    await sleep(GAP_MS);
  }

  return {
    ok: failed.length === 0,
    validated: all.length,
    created: created.length,
    created_handles: created,
    already_live: skipped.length,
    failed: failed.length,
    failures: failed,
  };
}

// Read-only: what is live, what is missing, and can we even write.
async function statusReport() {
  const all = allPages();
  const s = shop(), t = token();
  const base = { shop: s || null, token: Boolean(t), api_version: apiVersion(), total_pages: all.length };
  if (!s || !t) {
    return { ...base, ready: false, message: 'SHOPIFY_SHOP or SHOPIFY_ADMIN_TOKEN is not set in this environment.' };
  }
  const [perms, live] = await Promise.all([scopes().catch((e) => ({ error: e.message })), liveHandles()]);
  const missing = all.filter((p) => !live.has(p.handle));
  return {
    ...base,
    ready: true,
    can_write_pages: perms.can_write_pages === true,
    scopes: perms.scopes || null,
    scope_error: perms.error || undefined,
    live: all.length - missing.length,
    missing: missing.length,
    missing_handles: missing.map((p) => p.handle),
  };
}

module.exports = { publish, statusReport, scopes, liveHandles, validateAll, pageInput, admin };
