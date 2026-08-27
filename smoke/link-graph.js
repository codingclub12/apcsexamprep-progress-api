'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LINK GRAPH AND LINK BLOCK RULES, PINNED OFFLINE.
//
//  Both directions for every rule, same discipline as smoke/site-crawl.js: the
//  rule fires on the broken input AND stays silent on the correct one.
//
//  The zone rules get the most attention here because the whole architecture
//  report rests on them. If chrome detection quietly starts calling nav links
//  content, every page on the site reads as well-linked and the 101 unreachable
//  pages board task 73 is about become invisible. That failure is silent, which
//  is exactly the kind this suite exists to catch.
//
//  No network. Run: npm run smoke:linkgraph
// ─────────────────────────────────────────────────────────────────────────────
const G = require('../lib/link-graph');
const B = require('../lib/link-block');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

console.log('\nzone: structural');
{
  const html = '<header><a href="/pages/nav">Nav</a></header>'
    + '<main><a href="/pages/body-target">In the content</a></main>'
    + '<footer><a href="/pages/foot">Foot</a></footer>'
    + '<nav><a href="/pages/menu">Menu</a></nav>';
  const links = G.extractLinks(html);
  const zone = (p) => (links.find((l) => l.path === p) || {}).zone;
  ok('header link is chrome', zone('/pages/nav') === 'chrome', links);
  ok('footer link is chrome', zone('/pages/foot') === 'chrome');
  ok('nav link is chrome', zone('/pages/menu') === 'chrome');
  ok('content link is body', zone('/pages/body-target') === 'body');
}

console.log('\nzone: ubiquity outranks structure');
{
  // A target linked from the content of most pages is still boilerplate. This
  // is the half that survives a theme change.
  const pages = [];
  for (let i = 0; i < 10; i++) {
    pages.push({
      path: `/pages/p${i}`, status: 200, title: `P${i}`,
      links: [
        { path: '/pages/everywhere', anchor: 'Everywhere', zone: 'body' },
        { path: '/pages/rare', anchor: 'Rare', zone: 'body' },
      ].slice(0, i === 0 ? 2 : 1),
    });
  }
  const g = G.buildGraph(pages);
  ok('ubiquitous body link demoted to chrome', g.chromeTargets.has('/pages/everywhere'));
  ok('rare body link stays content', !g.chromeTargets.has('/pages/rare'));
  ok('demoted link contributes no inbound body count',
    g.nodes.get('/pages/everywhere').inBody === 0, g.nodes.get('/pages/everywhere'));
  ok('rare link keeps its inbound body count', g.nodes.get('/pages/rare').inBody === 1);
}

console.log('\nlink filtering');
{
  const html = '<main>'
    + '<a href="https://google.com/x">offsite</a>'
    + '<a href="https://www.apcsexamprep.com/pages/ours">our absolute</a>'
    + '<a href="mailto:a@b.c">mail</a><a href="#top">frag</a>'
    + '<a href="/cart">cart</a><a href="/account/login">acct</a>'
    + '<a href="/pages/keep?ref=x#y">query and frag</a>'
    + '</main>';
  const paths = G.extractLinks(html).map((l) => l.path);
  ok('offsite dropped', !paths.some((p) => /google/.test(p)));
  ok('our own absolute url kept as a path', paths.includes('/pages/ours'), paths);
  ok('mailto and fragment dropped', !paths.includes('#top'));
  ok('cart and account ignored', !paths.includes('/cart') && !paths.includes('/account/login'));
  ok('query and fragment normalised off', paths.includes('/pages/keep'), paths);
}

console.log('\ncode samples cannot forge links');
{
  // A Java example containing an anchor must not become an edge. site-crawl.js
  // learned this; the same input reaches this parser.
  const html = '<main><pre><a href="/pages/from-a-code-sample">x</a></pre>'
    + '<code><a href="/pages/also-code">y</a></code>'
    + '<a href="/pages/real">real</a></main>';
  const paths = G.extractLinks(html).map((l) => l.path);
  ok('link inside <pre> is not an edge', !paths.includes('/pages/from-a-code-sample'), paths);
  ok('link inside <code> is not an edge', !paths.includes('/pages/also-code'));
  ok('real link survives', paths.includes('/pages/real'));
}

console.log('\ngraph: orphans, depth and self-links');
{
  const pages = [
    { path: '/', status: 200, title: 'Home', links: [{ path: '/pages/hub', anchor: 'Hub', zone: 'body' }] },
    { path: '/pages/hub', status: 200, title: 'Hub', links: [{ path: '/pages/spoke', anchor: 'Spoke', zone: 'body' }] },
    { path: '/pages/spoke', status: 200, title: 'Spoke', links: [{ path: '/pages/spoke', anchor: 'Self', zone: 'body' }] },
    { path: '/pages/orphan', status: 200, title: 'Orphan', links: [] },
  ];
  const g = G.buildGraph(pages);
  const a = G.analyze(g);
  ok('self-link is not an edge', g.nodes.get('/pages/spoke').inBody === 1, g.nodes.get('/pages/spoke'));
  ok('orphan found', a.orphans.length === 1 && a.orphans[0].path === '/pages/orphan',
    a.orphans.map((o) => o.path));
  ok('depth counts clicks from home', a.depth.get('/pages/spoke') === 2, Array.from(a.depth));
  ok('orphan has no depth', !a.depth.has('/pages/orphan'));
  ok('dead end found', a.deadEnds.some((d) => d.path === '/pages/orphan'));
}

console.log('\ngraph: a chrome-only inbound link does not rescue an orphan');
{
  // The single most important assertion in this file. 135 nav anchors per page
  // must not make an unreachable page look reachable.
  const pages = [];
  for (let i = 0; i < 20; i++) {
    pages.push({
      path: `/pages/p${i}`, status: 200, title: `P${i}`,
      links: [{ path: '/pages/only-in-nav', anchor: 'Nav item', zone: 'chrome' }],
    });
  }
  pages.push({ path: '/pages/only-in-nav', status: 200, title: 'Nav target', links: [] });
  const a = G.analyze(G.buildGraph(pages));
  ok('page linked only from chrome is still an orphan',
    a.orphans.some((o) => o.path === '/pages/only-in-nav'), a.orphans.map((o) => o.path));
}

console.log('\nroles and courses');
{
  ok('lesson', G.roleOf('/pages/ap-csa-lesson-1-2-x', 'ap-csa-lesson-1-2-x') === 'lesson');
  ok('unit hub', G.roleOf('/pages/ap-csa-unit-1', 'ap-csa-unit-1') === 'unit-hub');
  ok('product', G.roleOf('/products/x', null) === 'product');
  ok('article', G.roleOf('/blogs/news/a-post', null) === 'article');
  ok('home', G.roleOf('/', null) === 'home');
  ok('csa course', G.courseOf('ap-csa-lesson-1-2') === 'ap-csa');
  ok('cyber matches long prefix', G.courseOf('ap-cybersecurity-unit-1-x') === 'ap-cyber');
  ok('unknown handle has no course', G.courseOf('contact') === null);
}

// ── LINK BLOCK ───────────────────────────────────────────────────────────────
const BODY = '<style>\n#w .related{color:red;}\n</style>'
  + '<div id="w"><div class="content"><p>Body</p></div>'
  + '<div class="related"><h3>Related Resources</h3>\n<a href="/pages/existing">Existing</a></div>'
  + '<div class="nav-row"><a href="/pages/prev">Prev</a></div></div>';
const BARE = '<style>\n#w{color:#000;}\n</style><div id="w"><div class="content"><p>Body</p></div></div>';
const LIVE = new Set(['a-real-page', 'another-real-page', 'existing']);

console.log('\nlink block: reading');
{
  ok('wrapper id read', B.wrapperId(BODY) === 'w');
  ok('related block found', !!B.findRelated(BODY));
  ok('no related block on a bare page', B.findRelated(BARE) === null);
  ok('existing links read', B.existingLinks(B.findRelated(BODY).inner).length === 1);
}

console.log('\nlink block: extending an existing block');
{
  const r = B.build(BODY, [{ handle: 'a-real-page', label: 'A Real Page' }], LIVE);
  ok('changed', r.changed);
  ok('extended, did not create a second block',
    (r.body.match(/class="related"/g) || []).length === 1, r.body);
  ok('existing link preserved', r.body.includes('/pages/existing'));
  ok('new link added', r.body.includes('/pages/a-real-page'));
  ok('nav-row still last', r.body.indexOf('nav-row') > r.body.indexOf('a-real-page'));
}

console.log('\nlink block: inserting into a page with none');
{
  const r = B.build(BARE, [{ handle: 'a-real-page', label: 'A Real Page' }], LIVE);
  ok('block created', (r.body.match(/class="related"/g) || []).length === 1);
  ok('scoped css appended because the page had none', /#w \.related\{/.test(r.body), r.body);
  ok('css went inside the style block', r.body.indexOf('#w .related{') < r.body.indexOf('</style>'));
  ok('existing css kept', r.body.includes('#w{color:#000;}'));
}
{
  const r = B.build(BODY, [{ handle: 'a-real-page', label: 'A' }], LIVE);
  ok('css NOT duplicated when the page already styles .related',
    (r.body.match(/#w \.related\{/g) || []).length === 1, (r.body.match(/#w \.related\{/g) || []));
}

console.log('\nlink block: what is dropped');
{
  const r = B.build(BODY, [
    { handle: 'ghost-page', label: 'Ghost' },
    { handle: 'existing', label: 'Dupe' },
    { handle: 'a-real-page', label: 'Real' },
  ], LIVE, { selfHandle: 'self-page' });
  const why = (h) => (r.dropped.find((d) => d.handle === h) || {}).why;
  ok('handle not in live set is dropped', why('ghost-page') === 'handle not in live set', r.dropped);
  ok('already-linked handle is dropped', why('existing') === 'already linked');
  ok('a link to a page that does not exist is never rendered', !r.body.includes('ghost-page'));
  ok('the real link survived', r.body.includes('/pages/a-real-page'));
}
{
  const r = B.build(BODY, [
    { handle: 'a-real-page', label: 'A' },
    { handle: 'another-real-page', label: 'B' },
  ], LIVE, { max: 2 });
  ok('cap is reported rather than silent',
    r.dropped.some((d) => /capped at 2/.test(d.why)), r.dropped);
}
{
  const r = B.build(BODY, [{ handle: 'existing', label: 'Dupe' }], LIVE);
  ok('nothing to add returns the body unchanged', !r.changed && r.body === BODY);
}

console.log('\nlink block: escaping');
{
  const r = B.build(BODY, [{ handle: 'a-real-page', label: 'Arrays & <ArrayList>' }], LIVE);
  ok('ampersand escaped once', r.body.includes('Arrays &amp; &lt;ArrayList&gt;'), r.body.slice(-400));
  ok('no double escaping', !r.body.includes('&amp;amp;'));
}
{
  ok('an already-escaped entity is left alone', B.esc('a &amp; b &#39; c') === 'a &amp; b &#39; c', B.esc('a &amp; b &#39; c'));
}

console.log('\nlink block: refusals');
{
  const refuses = (name, fn) => {
    try { fn(); ok(name, false, 'did not refuse'); }
    catch (e) { ok(name, e instanceof B.Refusal, e.message); }
  };
  refuses('empty body', () => B.build('', [{ handle: 'a-real-page', label: 'A' }], LIVE));
  refuses('no live handle set', () => B.build(BODY, [{ handle: 'a-real-page', label: 'A' }], new Set()));
  refuses('no wrapper id', () => B.build('<p>no wrapper</p>', [{ handle: 'a-real-page', label: 'A' }], LIVE));
  refuses('div imbalance', () => B.check(BODY, BODY + '<div>', 0));
  refuses('body did not grow', () => B.check(BODY, BODY, 0));
  refuses('anchor count disagrees', () => B.check(BODY, BODY + '<a href="/x">x</a>', 5));
  refuses('style block lost', () => B.check(BODY, BODY.replace('<style>', '') + '<a href="/x">x</a>', 1));
  refuses('growth over cap', () => B.check(BODY, BODY + 'x'.repeat(B.MAX_GROWTH_BYTES + 10), 0));
  refuses('two related blocks', () => B.check(BODY, BODY + '<div class="related"><a href="/x">x</a></div>', 1));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
