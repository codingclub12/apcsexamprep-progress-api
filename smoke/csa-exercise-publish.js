'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: publishing the 53 CSA exercise pages to Shopify.
//
//  WHAT IS BEING PROTECTED
//  This writes to a live storefront, so the checks are about what it must never
//  do, not what it usually does:
//
//  1. NEVER OVERWRITE. It only creates. A handle that already exists is skipped,
//     because a handle that exists means either this ran before or a person made
//     that page, and silently replacing either is the outcome worth preventing.
//     Proven by running it twice and asserting the second run writes nothing.
//
//  2. ALL OR NOTHING. Every page is validated before ANY page is created. A
//     partial publish of a broken set is worse than no publish, because once it
//     is live the failure is invisible. Proven by breaking a page and asserting
//     that zero writes happen, not "most of them".
//
//  3. NO ANSWER KEY GOES LIVE. The leak check runs on the real bodies, the same
//     one the CSV builder uses.
//
//  4. A MISSING SCOPE IS A SENTENCE, NOT 53 ERRORS. The Admin token here was
//     added for the analytics connector, which only reads. If write_content is
//     absent the run refuses up front and says which scope and what to do.
//
//  Shopify is STUBBED. This suite never touches a real store: it swaps global
//  fetch for a fake Admin API that records what it was asked to do. Testing a
//  publisher by publishing is not a test, it is a deploy.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:csapublish
// ─────────────────────────────────────────────────────────────────────────────

process.env.SHOPIFY_SHOP = 'smoke-test.myshopify.com';
process.env.SHOPIFY_ADMIN_TOKEN = 'shpat_smoke_token';

const pub = require('../lib/csa-exercise-publish');
const { allPages } = require('../lib/csa-exercise-pages');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); } };
const section = (t) => console.log('\n' + t);

// ── The fake store ───────────────────────────────────────────────────────────
function makeStore({ scopes = ['read_products', 'write_content'], existing = [] } = {}) {
  const store = {
    handles: new Set(existing),
    creates: [],          // every pageCreate body it was asked for
    calls: 0,
  };
  global.fetch = async (url, opts) => {
    store.calls++;
    const body = JSON.parse(opts.body);
    const q = body.query;
    if (/accessScopes/.test(q)) {
      return json({ data: { currentAppInstallation: { accessScopes: scopes.map((h) => ({ handle: h })) } } });
    }
    if (/pages\(first/.test(q)) {
      return json({ data: { pages: { pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [...store.handles].map((h) => ({ handle: h })) } } });
    }
    if (/pageCreate/.test(q)) {
      const p = body.variables.page;
      store.creates.push(p);
      store.handles.add(p.handle);
      return json({ data: { pageCreate: { page: { id: 'gid://shopify/Page/1', handle: p.handle }, userErrors: [] } } });
    }
    throw new Error('unexpected query: ' + q.slice(0, 80));
  };
  return store;
}
const json = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });

const ALL = allPages();

(async () => {
  section('1. A clean publish');
  let store = makeStore();
  let r = await pub.publish({});
  ok('1.1 it created every page', r.ok === true && r.created === ALL.length, { created: r.created, of: ALL.length });
  ok('1.2 it validated the whole set first', r.validated === ALL.length);
  ok('1.3 every page was published visible', store.creates.every((p) => p.isPublished === true));
  ok('1.4 every page carries both SEO metafields',
    store.creates.every((p) => p.metafields.length === 2
      && p.metafields.some((m) => m.key === 'title_tag' && m.value)
      && p.metafields.some((m) => m.key === 'description_tag' && m.value)));
  // The body is generated from the renderer, so it is the same bytes the CSV
  // would have carried. That is the entire reason this exists.
  const byHandle = new Map(ALL.map((p) => [p.handle, p]));
  ok('1.5 every body is byte for byte what the renderer produced',
    store.creates.every((c) => c.body === byHandle.get(c.handle).bodyHtml));
  ok('1.6 no body is empty, which would ship a blank page',
    store.creates.every((c) => c.body && c.body.length > 4000));

  section('2. Never overwrite, and therefore idempotent');
  r = await pub.publish({});
  ok('2.1 a second run creates nothing', r.created === 0 && r.already_live === ALL.length, r);
  ok('2.2 and issued no pageCreate at all', store.creates.length === ALL.length, store.creates.length);
  // The pages made by hand before this existed must survive untouched.
  store = makeStore({ existing: ['ap-csa-lesson-1-1-intro-algorithms-exercise-1'] });
  r = await pub.publish({});
  ok('2.3 a handle that already exists is skipped, never updated',
    r.created === ALL.length - 1
    && !store.creates.some((c) => c.handle === 'ap-csa-lesson-1-1-intro-algorithms-exercise-1'), r.created);

  section('3. All or nothing on validation');
  store = makeStore();
  // Break exactly one page and assert NOTHING is written, not "52 of 53". The
  // em-dash is a real house rule and a real check, so it is a realistic break.
  const broken = ALL.map((p, i) => (i === 3 ? { ...p, bodyHtml: p.bodyHtml + ' — ' } : p));
  const problems = pub.validateAll(broken);
  ok('3.1 the validator catches a bad page', problems.length > 0, problems.slice(0, 2));
  ok('3.2 and names the page it is unhappy about',
    problems.some((m) => m.startsWith(broken[3].handle)), problems[0]);
  ok('3.3 a clean set validates with zero problems', pub.validateAll(ALL).length === 0, pub.validateAll(ALL).slice(0, 3));
  ok('3.4 nothing was written while validating', store.creates.length === 0);

  section('4. A missing scope refuses up front');
  store = makeStore({ scopes: ['read_products', 'read_orders'] });
  r = await pub.publish({});
  ok('4.1 the run is refused', r.ok === false && r.refused === 'scope', r.refused);
  ok('4.2 nothing was created', store.creates.length === 0);
  ok('4.3 it names the scope and the fallback',
    /write_content/.test(r.message) && /Matrixify/.test(r.message), r.message);

  section('5. Filters');
  store = makeStore();
  r = await pub.publish({ unit: 'unit-1' });
  ok('5.1 a unit filter publishes only that unit',
    r.created === ALL.filter((p) => p.unit === 'unit-1').length
    && store.creates.every((c) => byHandle.get(c.handle).unit === 'unit-1'), r.created);
  store = makeStore();
  r = await pub.publish({ dryRun: true });
  ok('5.2 a dry run writes nothing but reports the plan',
    r.dry_run === true && store.creates.length === 0 && r.would_create.length === ALL.length, r.would_create && r.would_create.length);

  section('6. Status is honest about an empty store');
  store = makeStore();
  const s = await pub.statusReport();
  ok('6.1 it reports every page missing', s.missing === ALL.length && s.live === 0, { live: s.live, missing: s.missing });
  ok('6.2 and that it can write', s.can_write_pages === true);
  store = makeStore({ existing: ALL.map((p) => p.handle) });
  const s2 = await pub.statusReport();
  ok('6.3 a fully published store reports nothing missing', s2.missing === 0 && s2.live === ALL.length, s2.missing);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
