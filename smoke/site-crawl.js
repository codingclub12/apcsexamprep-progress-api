'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE CRAWL RULES, PINNED OFFLINE.
//
//  Every check in lib/site-crawl.js is asserted here in BOTH directions: it
//  fires on the broken input, and it stays silent on the correct one. A check
//  that only has the first half is a check that can quietly start matching
//  everything, and a nightly report whose checks all match everything is one
//  nobody reads by the end of the week.
//
//  Two of these tests exist because the mistake already happened during the
//  build, against the live site, and both are the SILENT direction:
//
//    - looksLikeChallenge must not fire on a real page. A /captcha/i test
//      matched all 20 pages in the first probe, because Shopify's own bundled
//      JS ships 'recaptcha-v3-token' on every render. That check would have
//      aborted the crawl every night.
//
//    - 'coming soon' must not be a placeholder. /pages/ap-csa-course marks
//      unshipped topics COMING SOON deliberately and explains the convention on
//      the page.
//
//  No network. Fixtures are synthetic, built to the shapes measured against the
//  live storefront one graded page per course.
//
//  Run: npm run smoke:sitecrawl
// ─────────────────────────────────────────────────────────────────────────────
const C = require('../lib/site-crawl');
const { shardOf, dayOfYear } = require('../scripts/site-crawl');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

// A body big enough to clear the truncation floor, so size never confounds the
// check under test.
const BULK = '<p>' + 'lesson prose. '.repeat(2500) + '</p>';
const page = (parts) => `<!doctype html><html><head><title>${parts.title || 'A Lesson | APCSExamPrep'}</title>` +
  `<meta name="description" content="${parts.meta === undefined ? 'A real description.' : parts.meta}">` +
  `</head><body>${parts.scripts || ''}${parts.body || ''}${parts.bulk === false ? '' : BULK}</body></html>`;

const script = (name) => `<script src="//cdn.shopify.com/s/files/assets/${name}"></script>`;
const res = (html, over = {}) => ({ status: 200, html, ms: 300, redirects: 0, ...over });
const url = (h) => `https://www.apcsexamprep.com/pages/${h}`;
const kindsOf = (f) => f.map((x) => x.kind);

console.log('\n  URL classification\n');
ok('a /pages/ URL is a page', C.classify(url('ap-csa-course')) === 'page');
ok('a blog article is an article', C.classify('https://x/blogs/news/how-to-study') === 'article');
ok('a product is a product', C.classify('https://x/products/csa-kit') === 'product');
ok('a collection is a collection', C.classify('https://x/collections/all') === 'collection');
ok('the root is home', C.classify('https://x/') === 'home');

console.log('\n  Which reporter each course owes\n');
ok('CSA expects apcs-reporter.js', C.expectedReporters(url('ap-csa-lesson-1-3-x'))[0] === 'apcs-reporter.js');
ok('CSP expects ap-csp-reporter.js', C.expectedReporters(url('ap-csp-course-bi1-x'))[0] === 'ap-csp-reporter.js');
ok('cyber expects the SCORE reporter, not the visit tracker',
  C.expectedReporters(url('ap-cyber-unit-1-lesson-2-exercise-1')).join() === 'apcs-score-reporter.js');
ok('the older ap-cybersecurity prefix resolves to the same course',
  C.expectedReporters(url('ap-cybersecurity-cyberattack-phases')).join() === 'apcs-score-reporter.js');
ok('networking expects its own reporter', C.expectedReporters(url('ap-networking-lesson-1-1-x'))[0] === 'ap-networking-reporter.js');
ok('intro java expects its own reporter', C.expectedReporters(url('intro-java-lesson-1-1-x'))[0] === 'intro-java-reporter.js');
ok('a blog article owes no reporter', C.expectedReporters('https://x/blogs/news/a').length === 0);

console.log('\n  Graded-widget detection across all five families\n');
//  Measured against the live storefront. Counting data-item-id alone (the first
//  version) read CSP and cyber as ungraded; a substring test for check-btn read
//  seven CSA reference pages as broken.
const csaBody = '<div class="apcs-ex" data-item-id="1.3-cfu-1"></div><div class="apcs-opt">A</div>';
const cspBody = '<div class="mcq-option">A</div><div class="mcq-option">B</div>';
const cyberBody = '<button class="check-btn">Check</button><button class="check-btn">Check</button>';
const spBody = '<div class="sp-opt">A</div><button class="sp-check-btn">Check</button>';
ok('CSA: data-item-id and apcs-opt count as graded', C.parse(page({ body: csaBody })).graded === true);
ok('CSP: mcq-option counts as graded', C.parse(page({ body: cspBody })).graded === true);
ok('cyber: check-btn counts as graded', C.parse(page({ body: cyberBody })).graded === true);
ok('cyber quizzes: option-label counts as graded',
  C.parse(page({ body: '<label class="option-label">A</label>' })).graded === true);
ok('a hub with no question widget is not graded', C.parse(page({ body: '<h1>Course hub</h1>' })).graded === false);

//  The exact-token rule. `\bcheck-btn\b` matched inside `sp-check-btn` because a
//  hyphen is a word boundary, and seven CSA reference pages were reported as P0.
ok('sp-check-btn is NOT check-btn', (C.parse(page({ body: spBody })).widgets['check-btn'] || 0) === 0);
ok('sp-opt is counted as its own family', C.parse(page({ body: spBody })).widgets['sp-opt'] === 1);

//  Site chrome appears on every page at high counts and is not a question.
ok('cyber-check-item nav chrome is not a graded widget',
  C.parse(page({ body: '<li class="cyber-check-item">x</li>'.repeat(15) })).graded === false);
ok('apcs-dropdown-link nav chrome is not a graded widget',
  C.parse(page({ body: '<a class="apcs-dropdown-link">x</a>'.repeat(135) })).graded === false);

console.log('\n  Script blocks are not markup\n');
//  This site's FRQ pages build navigation in JavaScript. Reading hrefs out of
//  the raw HTML pulled `/pages/ap-csa-` from the middle of a string
//  concatenation and reported a broken link on 240 pages.
const jsBuiltNav = page({
  scripts: '<script>var s = \'<a class="check-btn" href="/pages/ap-csa-\' + year + \'-frq-\' + n + \'">go</a>\';</script>',
  body: '<h1>Course hub</h1>',
});
ok('an href built inside a <script> is not a link', !C.parse(jsBuiltNav).links.some((h) => h.includes('/pages/ap-csa-')));
ok('a class named inside a <script> is not a widget', C.parse(jsBuiltNav).graded === false);
ok('an http:// URL inside a <script> is not mixed content',
  !C.parse(page({ scripts: '<script>var u="http://example.com/x.png";</script>', body: '<p>ok</p>' })).mixedContent);
ok('a real http:// resource still is mixed content',
  C.parse(page({ body: '<img src="http://example.com/a.png">' })).mixedContent === true);

console.log('\n  The grade path: what is provable\n');
//  data-item-id is the manifest-gated path CLAUDE.md specifies, so a page
//  carrying it and not its reporter is a contract break, not an inference.
ok('CSA data-item-id page with its reporter is clean',
  kindsOf(C.checkPage(url('ap-csa-lesson-1-3-x'), res(page({ scripts: script('apcs-reporter.js'), body: csaBody })))).length === 0);
ok('CSA data-item-id page WITHOUT its reporter is a P0',
  C.checkPage(url('ap-csa-lesson-1-3-x'), res(page({ body: csaBody })))
    .some((f) => f.kind === 'reporter-missing' && f.tier === 'P0'));
ok('a course hub loading no reporter is NOT a finding',
  kindsOf(C.checkPage(url('ap-csa-course'), res(page({ body: '<h1>Course hub</h1>' })))).length === 0);

console.log('\n  The grade path: what is only a guess, and is therefore NOT asserted\n');
//  Measuring the live site found five widget families and cyber quizzes loading
//  apcs-quiz-wiring.js where cyber exercises load apcs-score-reporter.js. An
//  assumed widget-to-reporter matrix produced twelve confident P0s and every one
//  was wrong, so these shapes must stay SILENT on a single night's evidence.
ok('a CSP mcq page with no reporter is not guessed at',
  !C.checkPage(url('ap-csp-course-bi1-x'), res(page({ body: cspBody })))
    .some((f) => f.kind === 'reporter-missing'));
ok('a cyber check-btn page with no reporter is not guessed at',
  !C.checkPage(url('ap-cyber-unit-2-lesson-4-quiz'), res(page({ body: cyberBody })))
    .some((f) => f.kind === 'reporter-missing'));
ok('a CSA reference page using the sp- widgets is not guessed at',
  !C.checkPage(url('ap-csa-api-quick-reference'), res(page({ body: spBody })))
    .some((f) => f.kind === 'reporter-missing'));

console.log('\n  The grade path: what last night proves\n');
const wasReporting = { reporters: ['apcs-score-reporter.js', 'apcs-tracker.js'], widgetCount: 12 };
ok('a page that lost a reporter since last night is a P0',
  C.checkPage(url('ap-cyber-unit-1-lesson-2-exercise-1'),
    res(page({ scripts: script('apcs-tracker.js'), body: cyberBody })), { before: wasReporting })
    .some((f) => f.kind === 'reporter-regressed' && f.tier === 'P0'));
ok('a page whose reporters are unchanged is clean',
  !C.checkPage(url('ap-cyber-unit-1-lesson-2-exercise-1'),
    res(page({ scripts: script('apcs-score-reporter.js') + script('apcs-tracker.js'), body: cyberBody })), { before: wasReporting })
    .some((f) => f.kind === 'reporter-regressed'));
ok('a page that lost its graded widgets is flagged',
  C.checkPage(url('ap-cyber-unit-1-lesson-2-exercise-1'),
    res(page({ scripts: script('apcs-score-reporter.js') + script('apcs-tracker.js'), body: '<h1>Lesson</h1>' })), { before: wasReporting })
    .some((f) => f.kind === 'widgets-regressed'));
ok('with no previous fingerprint nothing is claimed either way',
  !C.checkPage(url('ap-cyber-unit-1-lesson-2-exercise-1'), res(page({ body: cyberBody })))
    .some((f) => f.kind === 'reporter-regressed' || f.kind === 'widgets-regressed'));

console.log('\n  The challenge detector, the one that already cost a false positive\n');
const realPageWithCaptchaInBundle = page({
  scripts: '<script>var f=["recaptcha-v3-token","g-recaptcha-response","h-captcha-response"];</script>',
  body: csaBody,
});
ok('a real 350KB page whose bundled JS mentions captcha is NOT a challenge',
  C.looksLikeChallenge(realPageWithCaptchaInBundle, 200) === false);
ok('a small interstitial IS a challenge',
  C.looksLikeChallenge('<html><head><title>Just a moment...</title></head><body></body></html>', 200) === true);
ok('a 429 is a challenge whatever the body says', C.looksLikeChallenge('<html>fine</html>', 429) === true);
ok('a 503 is a challenge', C.looksLikeChallenge('', 503) === true);
ok('a challenge short-circuits the other checks rather than reporting ten of them',
  C.checkPage(url('x'), res('<html><title>Just a moment...</title></html>')).length === 1);

console.log('\n  Encoding, template leaks and placeholders\n');
ok('double-encoded text is detected', C.detectMojibake('the studentâ€™s answer').length > 0);
ok('a correctly encoded accent is NOT mojibake', C.detectMojibake('naive café résumé').length === 0);
ok('mojibake in visible prose is a finding',
  C.checkPage(url('x'), res(page({ body: '<p>the studentâ€™s answer</p>' }))).some((f) => f.kind === 'mojibake'));
ok('unrendered Liquid in the body is a finding',
  C.checkPage(url('x'), res(page({ body: '<p>{{ product.title }}</p>' }))).some((f) => f.kind === 'liquid-leak'));
ok('a Liquid tag is a finding',
  C.checkPage(url('x'), res(page({ body: '<p>{% if customer %}hi{% endif %}</p>' }))).some((f) => f.kind === 'liquid-leak'));
ok('braces inside a <script> are NOT a Liquid leak',
  !C.checkPage(url('x'), res(page({ scripts: '<script>var t=`{{ product.x }}`;</script>', body: '<p>fine</p>' })))
    .some((f) => f.kind === 'liquid-leak'));
//  This site teaches Java. Doubled braces are ordinary content.
ok('a Java 2D array literal is NOT a Liquid leak',
  !C.checkPage(url('linear-search-ap-csa'), res(page({ body: '<p>int[][] a = {{5,3,5,8}};</p>' })))
    .some((f) => f.kind === 'liquid-leak'));
ok('a Java method body opening inside a loop is NOT a Liquid leak',
  !C.checkPage(url('linear-search-ap-csa'), res(page({ body: '<p>for (int i=0;i&lt;n;i++) {{ return i; }}</p>' })))
    .some((f) => f.kind === 'liquid-leak'));
ok('"coming soon" is NOT a placeholder on this site',
  !C.checkPage(url('ap-csa-course'), res(page({ body: '<p>topics marked COMING SOON are in active production</p>' })))
    .some((f) => f.kind === 'placeholder-text'));
ok('Lorem ipsum IS a placeholder',
  C.checkPage(url('x'), res(page({ body: '<p>Lorem ipsum dolor sit amet</p>' })))
    .some((f) => f.kind === 'placeholder-text'));

console.log('\n  Page-level checks\n');
ok('a 404 in the sitemap is a P0 dead page',
  C.checkPage(url('gone'), res('', { status: 404 })).some((f) => f.kind === 'dead-page' && f.tier === 'P0'));
ok('a dead page reports once, not once per check',
  C.checkPage(url('gone'), res('', { status: 404 })).length === 1);
ok('a body under the floor is flagged as truncated',
  C.checkPage(url('x'), res(page({ body: '<p>hi</p>', bulk: false }))).some((f) => f.kind === 'truncated-body'));
ok('a title that is only the store suffix is flagged',
  C.checkPage(url('x'), res(page({ title: ' | APCSExamPrep' }))).some((f) => f.kind === 'title-missing'));
ok('a real title is not flagged',
  !C.checkPage(url('x'), res(page({ title: 'AP CSA Lesson 1.3 | APCSExamPrep' }))).some((f) => f.kind === 'title-missing'));
ok('a missing meta description is flagged',
  C.checkPage(url('x'), res(page({ meta: '' }))).some((f) => f.kind === 'meta-missing'));
ok('one redirect is fine, two is a chain',
  !C.checkPage(url('x'), res(page({}), { redirects: 1 })).some((f) => f.kind === 'redirect-chain') &&
  C.checkPage(url('x'), res(page({}), { redirects: 2 })).some((f) => f.kind === 'redirect-chain'));
ok('an http:// resource is mixed content',
  C.checkPage(url('x'), res(page({ body: '<img src="http://example.com/a.png">' }))).some((f) => f.kind === 'mixed-content'));

console.log('\n  Which links are worth checking\n');
ok('an on-site path is crawlable', C.isCrawlableLink('/pages/ap-csa-course'));
ok('mailto is not', !C.isCrawlableLink('mailto:a@b.com'));
ok('tel is not', !C.isCrawlableLink('tel:+15551234'));
ok('a bare anchor is not', !C.isCrawlableLink('#top'));
ok('an off-site link is not this crawler\'s business', !C.isCrawlableLink('https://college board.org'));
ok('/cart is gated by design, not broken', !C.isCrawlableLink('/cart'));
ok('/account is gated by design, not broken', !C.isCrawlableLink('/account/login'));
//  Cloudflare rewrites this in the browser and 404s a direct GET by design. It
//  is on every page, so leaving it in reported a 240-page break every night.
ok('/cdn-cgi/l/email-protection is a Cloudflare artifact, not a broken link',
  !C.isCrawlableLink('/cdn-cgi/l/email-protection'));
ok('query and hash are stripped before dedupe',
  C.normalizeLink('/pages/a?x=1#top') === '/pages/a');

console.log('\n  Ranking and grouping\n');
const mixed = [
  { kind: 'meta-missing', tier: 'P2', url: 'u1', detail: 'd', evidence: 'e2' },
  { kind: 'dead-page', tier: 'P0', url: 'u2', detail: 'd', evidence: 'e0' },
  { kind: 'mojibake', tier: 'P1', url: 'u3', detail: 'd', evidence: 'e1' },
];
ok('P0 sorts above P1 sorts above P2', C.rank(mixed).map((f) => f.tier).join() === 'P0,P1,P2');
const many = Array.from({ length: 9 }, (_, i) => ({ kind: 'broken-internal-link', tier: 'P1', url: 'u' + i, detail: 'd', evidence: '/pages/dead' }));
const g = C.group(many);
ok('nine pages hitting one dead link collapse to a single row', g.length === 1 && g[0].count === 9);
ok('a collapsed row keeps a few examples, not all nine', g[0].urls.length === 5);
//  The detail line comes from the first member. A run once printed one page's
//  widget counts above a list of seven URLs that each had different ones.
ok('a collapsed row marks its detail line as an example', g[0].detail_is_example === true);
ok('a single-page row does NOT call its detail an example',
  C.group([{ kind: 'mojibake', tier: 'P1', url: 'u', detail: 'd', evidence: 'e' }])[0].detail_is_example === undefined);
const wide = C.rank([...many, { kind: 'mojibake', tier: 'P1', url: 'z', detail: 'd', evidence: 'one' }]);
ok('within a tier, the widest blast radius sorts first', wide[0].kind === 'broken-internal-link');

console.log('\n  The delta, so a quiet night reads as quiet\n');
const cur = { findings: [{ kind: 'dead-page', tier: 'P0', url: 'a', evidence: 'x' }], crawledUrls: new Set(['a', 'b']) };
ok('no baseline says so rather than calling everything new', C.delta(null, cur).baseline === false);
const prev = { findings: [{ kind: 'dead-page', tier: 'P0', url: 'b', evidence: 'y', nights: 3 }] };
const d = C.delta(prev, cur);
ok('a finding absent tonight on a page that WAS recrawled counts as resolved', d.resolved.length === 1);
ok('a finding on a page tonight and not last night is new', d.fresh.length === 1);
const dUntouched = C.delta({ findings: [{ kind: 'dead-page', tier: 'P0', url: 'never-crawled', evidence: 'y' }] }, cur);
ok('a finding on a page NOT crawled tonight is not claimed as resolved', dUntouched.resolved.length === 0);
const dAge = C.delta({ findings: [{ kind: 'dead-page', tier: 'P0', url: 'a', evidence: 'x', nights: 4 }] }, cur);
ok('a persisting finding carries its age forward', dAge.ages['dead-page|a|x'] === 5);

console.log('\n  Sharding, so coverage rotates instead of re-randomising\n');
ok('a URL lands in the same shard every time',
  shardOf('https://x/pages/a', 7) === shardOf('https://x/pages/a', 7));
const spread = {};
for (let i = 0; i < 2000; i++) {
  const s = shardOf('https://x/pages/page-' + i, 7);
  spread[s] = (spread[s] || 0) + 1;
}
const sizes = Object.values(spread);
ok('all seven shards are used', Object.keys(spread).length === 7, spread);
ok('no shard is more than twice the smallest', Math.max(...sizes) <= Math.min(...sizes) * 2, sizes);
ok('day of year advances', dayOfYear(new Date('2026-01-01T00:00:00Z')) === 1);

console.log('\n  The severity model itself\n');
ok('every finding kind declares a tier', Object.values(C.KINDS).every((k) => ['P0', 'P1', 'P2', 'P3'].includes(k.tier)));
ok('every finding kind explains its cost', Object.values(C.KINDS).every((k) => k.why && k.why.length > 20));
ok('the grade-path kinds are all P0',
  ['reporter-missing', 'reporter-asset-dead', 'api-down', 'reporter-regressed'].every((k) => C.KINDS[k].tier === 'P0'));

console.log('\n' + (fail ? ('  ' + fail + ' FAILED, ' + pass + ' passed') : ('  OK - all ' + pass + ' checks passed')) + '\n');
process.exit(fail ? 1 : 0);
