'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE CRAWL - the checks, the severity model, and the ranking.
//
//  Split from scripts/site-crawl.js so every rule in here can be pinned offline
//  by smoke/site-crawl.js against fixture HTML. A check that only ever runs
//  against the live site is a check nobody can prove still works, and this file
//  is the half that decides what counts as a finding.
//
//  ── WHY A SEVERITY MODEL LIVES IN CODE ──────────────────────────────────────
//  The nightly report is read half awake, and its whole value is that the first
//  line is the thing that matters most. If ranking were left to whoever writes
//  the summary it would drift run to run, and two mornings that rank the same
//  facts differently teach a reader to stop trusting the order. So severity is
//  a property of the FINDING KIND, declared once, here.
//
//  The tiers, and what separates them:
//
//    P0  Students are blocked, or graded work is silently not recording.
//        The 2026-08-21 teacher report is the shape: three defects, nothing
//        threw, nothing logged, and the only thing that surfaced it was an
//        email. P0 means someone is losing work RIGHT NOW and cannot tell.
//
//    P1  A student will hit this and it is wrong. A dead link out of a course
//        hub, a body that imported truncated, mojibake in the visible text.
//        Visible, damaging, but the student can see it happened.
//
//    P2  Drift and discoverability. Missing meta, duplicate titles, redirect
//        chains, orphans. Nobody is blocked. It compounds.
//
//    P3  Hygiene. Slow pages, oversized bodies.
//
//  ── FALSE POSITIVES ARE THE FAILURE MODE ────────────────────────────────────
//  board-delta.js already records the lesson this file inherits: "A job that
//  reprints the same fourteen tasks every morning is wallpaper inside a week."
//  A nightly crawl fails the same way but faster, because a single noisy check
//  buries the one real finding underneath it. Every check here is therefore
//  written to be SILENT unless it is sure, and each one that has already cost a
//  false positive carries the reason inline.
//
//  Zero PII: public URLs and public page content only. Nothing here reads a
//  student record, and the crawler sends no credential to the storefront.
// ─────────────────────────────────────────────────────────────────────────────

// Severity ordering. Lower sorts first.
const TIERS = { P0: 0, P1: 1, P2: 2, P3: 3 };

// ── THE FINDING KINDS ────────────────────────────────────────────────────────
//  One row per kind: its tier, the one-line headline a human reads first, and
//  `why`, which is the sentence that explains the cost. The report prints `why`
//  verbatim rather than paraphrasing, for the same reason lib/command-hazards.js
//  concatenates hazard strings instead of rewriting them.
const KINDS = {
  'dead-page': {
    tier: 'P0',
    headline: 'Page in the sitemap is dead',
    why: 'The sitemap advertises this URL to Google and to students. It returns an error.',
  },
  'reporter-missing': {
    tier: 'P0',
    headline: 'Graded page loads no reporter',
    why: 'The page has graded widgets and nothing on it can record a score. This is silent to the student and to their teacher.',
  },
  'reporter-asset-dead': {
    tier: 'P0',
    headline: 'Reporter asset does not load',
    why: 'The page asks for a reporter the storefront does not serve. Every score on it is lost silently.',
  },
  'api-down': {
    tier: 'P0',
    headline: 'Progress API endpoint is not healthy',
    why: 'Scores reported by the storefront have nowhere to land.',
  },
  'challenge-served': {
    tier: 'P0',
    headline: 'Storefront served a challenge instead of the page',
    why: 'Bot protection is answering for real URLs. Students on shared school IPs hit this too.',
  },
  'broken-internal-link': {
    tier: 'P1',
    headline: 'Link on a live page is broken',
    why: 'A student following this link from a page they are on lands on an error.',
  },
  'truncated-body': {
    tier: 'P1',
    headline: 'Page body looks truncated or empty',
    why: 'A Matrixify import that half-landed leaves exactly this shape. The page renders, so nothing else catches it.',
  },
  'mojibake': {
    tier: 'P1',
    headline: 'Double-encoded text on a live page',
    why: 'Characters whose UTF-8 bytes were read as latin-1. Visible to students as garbage in the middle of a sentence.',
  },
  'liquid-leak': {
    tier: 'P1',
    headline: 'Unrendered template syntax in the page body',
    why: 'Raw Liquid reached the student instead of the value it was supposed to print.',
  },
  'placeholder-text': {
    tier: 'P1',
    headline: 'Placeholder text is live',
    why: 'Draft scaffolding shipped to production.',
  },
  'reporter-regressed': {
    tier: 'P0',
    headline: 'Page lost a reporter it had last night',
    why: 'This page carried the asset on the previous run and does not now. Whatever it was recording, it has stopped.',
  },
  'widgets-regressed': {
    tier: 'P1',
    headline: 'Page lost its graded widgets',
    why: 'The page had graded questions on the previous run and has none now. Either an import dropped them or the activity was emptied.',
  },
  'title-missing': {
    tier: 'P2',
    headline: 'Page has no real title',
    why: 'Search results and browser tabs show the store suffix alone.',
  },
  'meta-missing': {
    tier: 'P2',
    headline: 'Page has no meta description',
    why: 'Google writes its own snippet, usually from whatever text is nearest the top.',
  },
  'duplicate-title': {
    tier: 'P2',
    headline: 'Two pages share a title',
    why: 'Search engines pick one and drop the other. Students searching the site see the wrong page.',
  },
  'redirect-chain': {
    tier: 'P2',
    headline: 'URL redirects more than once',
    why: 'Every hop is latency on a school network, and link equity leaks at each one.',
  },
  'mixed-content': {
    tier: 'P2',
    headline: 'Page references an http:// resource',
    why: 'Browsers block it. Whatever it was supposed to load does not load.',
  },
  'oversized': {
    tier: 'P3',
    headline: 'Page is very large',
    why: 'School Chromebooks on shared wifi are the floor this has to clear.',
  },
  'slow': {
    tier: 'P3',
    headline: 'Page was slow to respond',
    why: 'Measured from this runner, so treat it as a trend rather than a verdict.',
  },
  'stale-year': {
    tier: 'P1',
    headline: 'Page advertises a school year that has ended',
    why: 'A teacher choosing a curriculum in August, or a student searching for this year exam, reads the year and moves on. The year is frequently the query.',
  },
  'brand-doubled': {
    tier: 'P2',
    headline: 'Title carries the store name twice',
    why: 'The domain was typed into the SEO title field by hand and the theme appended the real one. Both are shown, and the second one costs the characters that would have held keywords.',
  },
  'h1-is-title': {
    tier: 'P2',
    headline: 'The SEO title string is rendered as a visible H1',
    why: 'Pipe-delimited boilerplate, sometimes the brand, sits in the strongest heading signal on the page instead of a heading.',
  },
  'h1-duplicate': {
    tier: 'P2',
    headline: 'Page has more than one H1',
    why: 'Every extra H1 dilutes the one that describes the page. A shared template section is the usual cause, so the blast radius is the whole site rather than one page.',
  },
  'meta-scraped': {
    tier: 'P2',
    headline: 'Meta description is scraped page furniture',
    why: 'Shopify falls back to body text when the description metafield is unset, so navigation and breadcrumbs become the search snippet.',
  },
  'title-overlong': {
    tier: 'P3',
    headline: 'Title is long enough to be cut mid-phrase',
    why: 'Everything past roughly sixty rendered characters is dropped from the result, and it is usually the tail that carries the keywords.',
  },
};

function tierOf(kind) {
  return (KINDS[kind] && KINDS[kind].tier) || 'P3';
}

// ── URL CLASSIFICATION ───────────────────────────────────────────────────────
//  Which checks apply depends on what kind of URL this is. A blog article that
//  loads no reporter is correct; a CSA lesson page that loads no reporter is a
//  P0. Getting this wrong in the permissive direction produces the noise that
//  kills the report, so anything unrecognised gets the CONSERVATIVE set.
function classify(url) {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  if (/^\/pages\//.test(path)) return 'page';
  if (/^\/blogs\/[^/]+\/[^/]+/.test(path)) return 'article';
  if (/^\/blogs\/[^/]+\/?$/.test(path)) return 'blog';
  if (/^\/products\//.test(path)) return 'product';
  if (/^\/collections\//.test(path)) return 'collection';
  if (path === '/' || path === '') return 'home';
  return 'other';
}

// Which reporter asset a page of a given course is expected to load. Taken from
// scripts/grade-path-audit.js, which learned each of these the hard way. Kept as
// a prefix map rather than derived from pageFromHandle so this file stays
// offline-testable and carries no database dependency.
//
//  `score` is the asset that carries a grade to the API. `also` is the visit
//  tracker, which is a different job: apcs-tracker.js records that a page was
//  opened and is loaded on plenty of pages that grade nothing, so treating it as
//  a score reporter would make every hub look like a broken activity.
const REPORTER_BY_PREFIX = [
  // 'ap-cyber' matches 'ap-cybersecurity-...' too, which is the same course
  // under an older handle prefix.
  { prefix: 'ap-cyber', score: ['apcs-score-reporter.js'], also: ['apcs-tracker.js'] },
  { prefix: 'ap-csa', score: ['apcs-reporter.js'], also: [] },
  { prefix: 'ap-csp', score: ['ap-csp-reporter.js'], also: [] },
  { prefix: 'ap-networking', score: ['ap-networking-reporter.js'], also: [] },
  { prefix: 'intro-java', score: ['intro-java-reporter.js'], also: [] },
];

function handleOf(url) {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const m = path.match(/^\/pages\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function expectedReporters(url) {
  const handle = handleOf(url);
  if (!handle) return [];
  const hit = REPORTER_BY_PREFIX.find((r) => handle.startsWith(r.prefix));
  return hit ? hit.score : [];
}

// ── PARSING ──────────────────────────────────────────────────────────────────
//  Everything the checks need, pulled out in ONE pass so the caller can drop the
//  body immediately afterwards. Pages here run 350KB to 750KB, so holding four
//  hundred of them would be 200MB+ on a box capped at 1GB. That is reason
//  enough on its own; it is not the cause of the $169 bill, which was an API
//  recursing into itself, and the note that used to claim otherwise here was
//  wrong. See the RUNAWAY section in scripts/site-crawl.js for the hazard that
//  incident actually describes and why this crawler cannot reproduce it.
const abs = (u) => (u.startsWith('//') ? 'https:' + u : u);

// Every class token on the page, counted. Built once per page so the widget
// checks share one pass rather than each running its own regex over 400KB.
// ── THE GRADED-QUESTION WIDGET VOCABULARY ────────────────────────────────────
//  Measured by counting class tokens across one page per course plus the CSA
//  reference pages. There are at least five families, not the three the first
//  version assumed:
//
//    apcs-opt / apcs-ex   CSA lessons, alongside data-item-id
//    mcq-option           CSP lessons
//    check-btn            cyber exercises
//    option-label         cyber quizzes and exams
//    sp-opt               CSA scenario-practice and reference pages
//
//  DELIBERATELY EXCLUDED: 'cyber-check-item' and 'apcs-dropdown-link' appear on
//  every page on the site at counts of 15 and 135. They are the nav chrome, not
//  questions, and counting them would make every page look graded.
const WIDGET_FAMILIES = ['apcs-ex', 'apcs-opt', 'mcq-option', 'check-btn', 'option-label', 'sp-opt'];

// Every reporter and tracker asset worth fingerprinting, score reporters and the
// visit tracker and the quiz wiring alike. The regression checks care about any
// of them disappearing, not about which one a page ought to have.
const ALL_REPORTERS = [
  'apcs-reporter.js', 'ap-csp-reporter.js', 'apcs-score-reporter.js',
  'ap-networking-reporter.js', 'intro-java-reporter.js',
  'apcs-tracker.js', 'apcs-quiz-wiring.js',
];

function classTokens(html) {
  const counts = new Map();
  for (const m of html.matchAll(/class=["']([^"']*)["']/g)) {
    for (const tok of m[1].trim().split(/\s+/)) {
      if (tok) counts.set(tok, (counts.get(tok) || 0) + 1);
    }
  }
  return counts;
}

//  ── EVERYTHING STRUCTURAL IS READ FROM THE STRIPPED COPY ────────────────────
//  A script block is full of things that look exactly like markup and are not.
//  This site's FRQ pages build their own navigation in JavaScript:
//
//      prevNext += '<a class="fc-nav-btn" href="/pages/ap-csa-' + year + '-frq-'
//
//  Reading hrefs out of the raw HTML pulled `/pages/ap-csa-` out of the middle
//  of that concatenation, found it 404s, and reported a broken link on 240
//  pages. The same block would have contributed `fc-nav-btn` to the class-token
//  counts and any http:// string to the mixed-content check.
//
//  So scripts and styles come out ONCE, and only the `src` list is read from the
//  original. Anything a script builds at runtime is out of scope for a crawler
//  that does not execute it, and pretending otherwise is how the first version
//  produced its most confident wrong answer.
function stripCode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

function parse(html) {
  const scripts = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)).map((m) => abs(m[1]));
  const clean = stripCode(html);
  const flat = clean.replace(/\n/g, ' ');
  const titleM = flat.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaM = flat.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const links = Array.from(clean.matchAll(/<a[^>]+href=["']([^"']+)["']/g)).map((m) => m[1]);
  const itemIds = Array.from(clean.matchAll(/data-item-id=["']([^"']+)["']/g)).map((m) => m[1]);
  const lessonIds = Array.from(clean.matchAll(/data-lesson-id=["']([^"']+)["']/g)).map((m) => m[1]);
  // ── THE THREE GRADED-WIDGET SYSTEMS ────────────────────────────────────────
  //  Measured against the live storefront, one graded page per course:
  //
  //    CSA lesson        data-item-id x10, apcs-ex x77   -> apcs-reporter.js
  //    CSP lesson        apcs-ex x13, NO data-item-id    -> ap-csp-reporter.js
  //    Cyber exercise    check-btn x13, NO data-item-id  -> apcs-score-reporter.js
  //    Networking        data-item-id x1                 -> ap-networking-reporter.js
  //    Intro Java        data-item-id x6                 -> intro-java-reporter.js
  //    CSA / CSP hubs    none of the three               -> no reporter, correctly
  //
  //  The first version of this file counted data-item-id alone, which made it
  //  blind to CSP and cyber entirely: it read every cyber exercise as an
  //  ungraded page and could never have caught the 2026-08-21 failure it was
  //  written to catch. Graded means ANY of the three.
  //  EXACT CLASS TOKENS, NOT SUBSTRINGS. The first version tested
  //  /class=["'][^"']*\bcheck-btn\b/, and \b treats a hyphen as a word
  //  boundary, so it matched `class="sp-check-btn"` on seven CSA reference
  //  pages that use an entirely different widget family. Every one of them was
  //  reported as a P0 "graded page loads no reporter". Splitting the class
  //  attribute and comparing whole tokens is the only reading that cannot do
  //  that.
  const cls = classTokens(clean);
  const widgets = {};
  let widgetCount = 0;
  for (const fam of WIDGET_FAMILIES) {
    const n = cls.get(fam) || 0;
    if (n) { widgets[fam] = n; widgetCount += n; }
  }
  if (itemIds.length) { widgets['data-item-id'] = itemIds.length; widgetCount += itemIds.length; }
  //  H1s are read from the code-stripped HTML for the same reason the link and
  //  widget scans are: a Java example on a lesson page can contain anything.
  const h1s = Array.from(clean.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi))
    .map((m) => m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return {
    bytes: Buffer.byteLength(html),
    title: titleM ? titleM[1].trim() : '',
    meta: metaM ? metaM[1].trim() : '',
    h1s,
    scripts,
    links,
    itemIds: Array.from(new Set(itemIds)),
    lessonIds: Array.from(new Set(lessonIds)),
    widgets,
    widgetCount,
    graded: widgetCount > 0,
    // The reporters this page actually loads, as bare filenames. This is the
    // fingerprint the regression checks compare between nights.
    reporters: ALL_REPORTERS.filter((a) => scripts.some((u) => u.includes(a))),
    // Kept as a boolean rather than the matched text: knowing WHICH http:// URL
    // it was is nice, holding the string for every page is not worth the bytes.
    mixedContent: /(?:src|href)=["']http:\/\/(?!localhost)/i.test(clean),
  };
}

// ── THE CHALLENGE DETECTOR ───────────────────────────────────────────────────
//  This one has already cost a false positive, and the shape of the mistake is
//  worth keeping: a naive /captcha/i test matches EVERY page on this storefront,
//  because Shopify's own bundled JS contains the strings 'recaptcha-v3-token'
//  and 'h-captcha-response' on every render. A probe of 20 live pages flagged
//  all 20, which would have aborted the crawl every single night.
//
//  The honest signal is SIZE plus SHAPE. A real page here is 350KB+; an
//  interstitial is a few KB and has no theme chrome. So: small body, and no
//  sign of the theme having rendered.
function looksLikeChallenge(html, status) {
  if (status === 403 || status === 429 || status === 503) return true;
  if (Buffer.byteLength(html) > 60000) return false;
  return /Just a moment|Attention Required|Checking your browser|cf-browser-verification|_cf_chl/i.test(html);
}

// ── MOJIBAKE ─────────────────────────────────────────────────────────────────
//  The same detector smoke/encoding-guard.js runs over the repository, applied
//  to live rendered HTML instead. Lead characters are what the first byte of a
//  multi-byte UTF-8 character becomes after a round trip through a single-byte
//  codec. Reversing the sequence and checking it yields exactly one character is
//  what separates real mojibake from an accented character that belongs there.
const LEADS = new Set(['Â', 'Ã', 'â']);

//  ── WHY THIS DOES CP1252 AND smoke/encoding-guard.js DOES NOT ───────────────
//  That file scans repository SOURCE and notes, correctly for its job, that
//  latin-1 covers every byte value. This one reads LIVE RENDERED HTML, where the
//  overwhelmingly common mojibake is the cp1252 form: U+2019 becomes the three
//  characters a-circumflex, euro sign, trademark. The last two are U+20AC and
//  U+2122, both above 0xFF, so Buffer.from(chunk,'latin1') truncates them and
//  the round-trip guard correctly rejects the reversal. The result is a detector
//  that is right about its own rules and blind to the case that actually appears
//  on a web page, which is how it shipped here failing its own test.
//
//  Only the 0x80 to 0x9F window differs between the two codecs; every other byte
//  is identical. Written as escapes rather than literal characters so this table
//  cannot itself be corrupted by the thing it exists to detect.
const CP1252_HIGH = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8a,
  '\u2039': 0x8b, '\u0152': 0x8c, '\u017D': 0x8e, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9a, '\u203A': 0x9b, '\u0153': 0x9c,
  '\u017E': 0x9e, '\u0178': 0x9f,
};

// Turn a run of characters back into the bytes they were before something read
// them with the wrong codec. Returns null the moment a character cannot have
// come from this codec, which is what stops legitimate text being "repaired".
function toBytes(chunk, codec) {
  const bytes = [];
  for (const ch of chunk) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xff) {
      // In cp1252 the 0x80-0x9F slots hold the characters in the table above, so
      // a raw control character in that window did not come from cp1252 text.
      if (codec === 'cp1252' && cp >= 0x80 && cp <= 0x9f) return null;
      bytes.push(cp);
      continue;
    }
    if (codec === 'cp1252' && CP1252_HIGH[ch] !== undefined) { bytes.push(CP1252_HIGH[ch]); continue; }
    return null;
  }
  return Buffer.from(bytes);
}

function reverseOnce(chunk) {
  const width = [...chunk].length;
  for (const codec of ['cp1252', 'latin1']) {
    const buf = toBytes(chunk, codec);
    if (!buf || buf.length !== width) continue;
    const decoded = buf.toString('utf8');
    // A successful reversal yields exactly one character and is not a no-op.
    // U+FFFD means the bytes were not valid UTF-8, so this was not mojibake.
    if ([...decoded].length === 1 && decoded !== chunk && !decoded.includes('�')) return decoded;
  }
  return null;
}

function detectMojibake(text, cap = 5) {
  const hits = [];
  for (let i = 0; i < text.length && hits.length < cap; i++) {
    if (!LEADS.has(text[i])) continue;
    for (const width of [3, 2]) {
      const chunk = text.slice(i, i + width);
      if (chunk.length < width) continue;
      const fixed = reverseOnce(chunk);
      if (fixed) { hits.push({ raw: chunk, fixed, index: i }); break; }
    }
  }
  return hits;
}

// Visible-text-only extraction for the checks that must not read scripts.
//  Mojibake and Liquid leaks inside a <script> block are almost always a library
//  doing something legitimate. Stripping script and style first is what keeps
//  those two checks quiet enough to be worth having.
function visibleText(html) {
  return stripCode(html).replace(/<[^>]+>/g, ' ');
}

// ── PLACEHOLDER TEXT ─────────────────────────────────────────────────────────
//  Deliberately short and specific. 'TODO' is not on this list: it appears in
//  legitimate lesson copy about writing code, and a check that fires on a CS
//  lesson saying "add a TODO comment" is exactly the noise that gets a report
//  ignored. Each pattern here is one that cannot be innocent in rendered prose.
//  'coming soon' and 'TBD' were BOTH on this list and both had to come off after
//  the first live run flagged /pages/ap-csa-course. That page marks unshipped
//  topics COMING SOON on purpose and explains the convention in the paragraph
//  above the list: it is a deliberate status badge, not draft scaffolding. A
//  check that fires forever on correct copy is worse than no check, because it
//  is the row a reader learns to scroll past.
const PLACEHOLDERS = [
  { re: /\bLorem ipsum\b/i, label: 'Lorem ipsum' },
  { re: /\bXXX(?:XX)+\b/, label: 'XXXXX placeholder' },
  { re: /\[insert [a-z ]{3,30}\]/i, label: '[insert ...]' },
  { re: /\bplaceholder text\b/i, label: 'placeholder text' },
];

// Links that are not broken when they do not resolve to a 200 for an anonymous
// crawler. Account and cart pages redirect or gate by design, and a checkout URL
// is not something a crawler should be pulling on at all.
//  /cdn-cgi/ is Cloudflare's own namespace. `/cdn-cgi/l/email-protection` is the
//  obfuscated-address placeholder Cloudflare rewrites in the browser, and it
//  answers 404 to a direct GET by design. It appears on every page of this site,
//  so leaving it in reported a 240-page broken link every single night.
const LINK_IGNORE = [
  /^\/account/, /^\/cart/, /^\/checkout/, /^\/challenge/,
  /^\/search/, /^\/cdn-cgi\//, /^\/[a-z]{2}-[a-z]{2}\//,
];

function isCrawlableLink(href) {
  if (!href) return false;
  if (/^(mailto:|tel:|javascript:|#|data:)/i.test(href)) return false;
  // Off-site links are not this crawler's business. External link rot is real
  // but checking it means hammering third parties nightly, which is somebody
  // else's rate limit to blow.
  if (/^https?:\/\//i.test(href)) return false;
  if (!href.startsWith('/')) return false;
  const path = href.split('#')[0].split('?')[0];
  if (!path || path === '/') return false;
  return !LINK_IGNORE.some((re) => re.test(path));
}

function normalizeLink(href) {
  return href.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
}

// ── SCHOOL YEARS THAT HAVE ENDED ─────────────────────────────────────────────
//  A school year runs July to June, so the current one starts in the calendar
//  year of any month from July onward and in the previous year otherwise.
//  `now` is injectable so the smoke suite can pin a date rather than drift.
function currentSchoolYearStart(now) {
  const d = now ? new Date(now) : new Date();
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

function staleSchoolYears(text, now) {
  const cur = currentSchoolYearStart(now);
  const out = new Set();
  for (const m of String(text || '').matchAll(/\b(20\d{2})\s*[-\u2013\u2014]\s*(20\d{2}|\d{2})\b/g)) {
    const start = Number(m[1]);
    const endRaw = m[2];
    const end = endRaw.length === 2 ? Number(String(start).slice(0, 2) + endRaw) : Number(endRaw);
    // Consecutive years only. Anything wider is a historical range, not a school year.
    if (end !== start + 1) continue;
    if (start < cur) out.add(m[0]);
  }
  return Array.from(out);
}

// Structural markers of Shopify's body-text fallback. Never length.
const SCRAPED_MARKERS = [
  /[\u203a\u25b8\u25bc\u00bb]/,              // breadcrumb and disclosure glyphs
  /&amp;(?:amp|gt|lt|quot);/i,                  // entities escaped a second time
  /-&gt;/,
  /[A-Z][a-z]+(?:[A-Z][a-z]*){3,}/,             // nav labels run together, e.g. HubsCyberCSPCSANetworking
];

function looksScraped(meta) {
  const t = String(meta || '');
  return SCRAPED_MARKERS.some((re) => {
    const m = t.match(re);
    if (!m) return false;
    // The concatenated-nav marker needs length behind it or it fires on
    // ordinary CamelCase like 'ArrayList' or 'APCSExamPrep'.
    if (re === SCRAPED_MARKERS[3]) return m[0].length >= 20;
    return true;
  });
}

// ── THE PER-PAGE CHECKS ──────────────────────────────────────────────────────
//  `res` is { status, html, ms, redirects }. Returns findings; never throws.
//  `html` is read here and never retained.
function checkPage(url, res, opts = {}) {
  const out = [];
  const kind = classify(url);
  const add = (k, detail, evidence) => out.push({ kind: k, tier: tierOf(k), url, detail, evidence });

  if (res.status === 0) {
    add('dead-page', `request failed: ${res.error || 'no response'}`, String(res.error || ''));
    return out;
  }
  if (looksLikeChallenge(res.html || '', res.status)) {
    add('challenge-served', `HTTP ${res.status}, ${Buffer.byteLength(res.html || '')} bytes`, (res.html || '').slice(0, 200));
    return out;
  }
  if (res.status >= 400) {
    add('dead-page', `HTTP ${res.status}`, `${res.status} on ${url}`);
    return out;
  }

  const p = parse(res.html || '');

  if ((res.redirects || 0) > 1) {
    add('redirect-chain', `${res.redirects} hops before a final response`, `${res.redirects} hops`);
  }

  // A real page here is 350KB+. Anything under the floor either failed to render
  // or imported truncated, and both are worth waking up for.
  const FLOOR = opts.bodyFloor || 20000;
  if (p.bytes < FLOOR) {
    add('truncated-body', `${p.bytes} bytes, under the ${FLOOR} byte floor`, `${p.bytes} bytes`);
  }

  if (kind === 'page' || kind === 'article' || kind === 'product' || kind === 'collection') {
    // The theme glues ' | APCSExamPrep' onto every title, so a page with no
    // title of its own still has a non-empty <title>. Strip the suffix before
    // deciding, or this check can never fire.
    const bare = p.title.replace(/\s*\|\s*APCSExamPrep\s*$/i, '').trim();
    if (!bare) add('title-missing', 'title is the store suffix alone', p.title || '(empty)');
    if (!p.meta) add('meta-missing', 'no meta description', '');

    // ── THE STORE NAME, TWICE ────────────────────────────────────────────────
    //  Measured on three teacher bundles: the casing differs between the two
    //  occurrences ('apcsexamprep.com' then 'APCSExamPrep.com'), which is what
    //  says the domain was typed into the SEO title field by hand rather than
    //  emitted twice by one template.
    const brandHits = (p.title.match(/apcsexamprep\.com/gi) || []).length;
    if (brandHits > 1) {
      add('brand-doubled', `store name appears ${brandHits} times in the title`, p.title);
    }

    if (p.title.length > (opts.titleMax || 70)) {
      add('title-overlong', `${p.title.length} characters`, p.title);
    }

    // ── A SCHOOL YEAR THAT HAS ENDED ─────────────────────────────────────────
    //  Only CONSECUTIVE year pairs count. The catalogue is full of legitimate
    //  historical ranges: an FRQ archive spanning 2004-2025, a written-response
    //  guide covering (2024-2026). Neither is a school year and neither is
    //  stale. '2025-2026' and '2025-26' are.
    const stale = staleSchoolYears(`${p.title} ${p.meta} ${(p.h1s || []).join(' ')}`, opts.now);
    if (stale.length) {
      add('stale-year', `advertises ${stale.join(', ')}`, stale.join(', '));
    }

    // ── SHOPIFY'S FALLBACK SNIPPET ───────────────────────────────────────────
    //  Keyed on structure, never on length: the longest authored description on
    //  this site is 324 characters and entirely deliberate, so a length rule
    //  would flag the best page on the site. Scraped furniture looks different.
    //  It carries breadcrumb glyphs, double-escaped entities, or a run of nav
    //  labels concatenated with no spaces.
    if (p.meta && looksScraped(p.meta)) {
      add('meta-scraped', 'description looks like scraped page furniture', p.meta.slice(0, 120));
    }
  }

  // ── HEADINGS ───────────────────────────────────────────────────────────────
  //  Both of these usually come from a shared template, so they are reported
  //  once per page and the blast-radius grouping is what makes them readable.
  const h1s = p.h1s || [];
  if (h1s.length > 1) {
    add('h1-duplicate', `${h1s.length} H1 elements`, h1s.slice(0, 3).join(' / '));
  }
  for (const h of h1s) {
    if (h.includes(' | ') && p.title && p.title.slice(0, 25) && h.startsWith(p.title.slice(0, 25))) {
      add('h1-is-title', 'an H1 is the title string, pipes included', h);
      break;
    }
  }

  const text = visibleText(res.html || '');

  const moji = detectMojibake(text);
  if (moji.length) {
    add('mojibake', `${moji.length}+ double-encoded sequence(s)`,
      moji.map((h) => `${h.raw} should be ${h.fixed}`).join(', '));
  }

  //  ── WHY THIS IS KEYED ON LIQUID OBJECTS AND NOT ON BRACES ─────────────────
  //  A bare /\{\{/ test is unusable on a site that teaches Java. The first run
  //  flagged /pages/linear-search-ap-csa on `{{5,3,5,8}}`, a 2D array literal,
  //  and on `{{` where a method body opens inside a for loop. Doubled braces are
  //  ordinary content here, so the check has to key on something that is Liquid
  //  and cannot be Java: a known template object root, or a real tag keyword.
  const LIQUID = /\{\{\s*(?:product|page|shop|settings|collection|article|blog|cart|customer|section|block|forloop|template|request|routes|content_for|linklists?)\b|\{%\s*(?:if|unless|for|assign|capture|render|include|section|schema|liquid|case|when|endif|endfor)\b/i;
  if (LIQUID.test(text)) {
    const m = text.match(/(\{\{[^}]{0,60}\}\}|\{%[^%]{0,60}%\})/);
    add('liquid-leak', 'unrendered Liquid in the visible body', m ? m[1].trim() : '');
  }

  for (const ph of PLACEHOLDERS) {
    if (ph.re.test(text)) { add('placeholder-text', `found "${ph.label}"`, ph.label); break; }
  }

  if (p.mixedContent) add('mixed-content', 'references an http:// resource', '');

  // ── THE GRADE PATH, PER PAGE ───────────────────────────────────────────────
  //  Only for /pages/ URLs belonging to a course, and only when the page ACTUALLY
  //  has graded widgets. A course hub carries no data-item-id and is supposed to
  //  load no reporter; firing on it would flag dozens of correct pages a night.
  if (kind === 'page') {
    // ── WHAT IS PROVABLE, AND WHAT IS ONLY A GUESS ───────────────────────────
    //  The first version of this block asserted a widget-to-reporter matrix
    //  inferred from one sample page per course. Measuring the live site found
    //  five widget families rather than three, and cyber quizzes loading
    //  apcs-quiz-wiring.js where cyber exercises load apcs-score-reporter.js.
    //  An assumed matrix produced twelve confident P0s, and every one of them
    //  was wrong. So this now asserts only the part that is written down, and
    //  gets everything else from evidence rather than inference.
    //
    //  PROVABLE: data-item-id is the manifest-gated path CLAUDE.md specifies.
    //  A page carrying those attributes and not its course's reporter is the
    //  2026-08-21 failure exactly, and that is a contract, not a guess.
    const want = expectedReporters(url);
    if (want.length && p.itemIds.length) {
      const missing = want.filter((a) => !p.reporters.includes(a));
      if (missing.length) {
        add('reporter-missing', `${p.itemIds.length} data-item-id widget(s), but ${missing.join(', ')} is not loaded`,
          missing.join(', '));
      }
    }

    // NOT PROVABLE from one night, and therefore compared against the last one
    // instead. `before` is this page's fingerprint from the previous run. A page
    // that loaded a reporter yesterday and does not today is a regression on any
    // reading, and needs no matrix to detect.
    const before = opts.before;
    if (before) {
      const lost = (before.reporters || []).filter((a) => !p.reporters.includes(a));
      if (lost.length) {
        add('reporter-regressed', `${lost.join(', ')} was loaded on the last run and is not loaded now`, lost.join(', '));
      }
      if ((before.widgetCount || 0) > 0 && p.widgetCount === 0) {
        add('widgets-regressed', `${before.widgetCount} graded widget(s) on the last run, none now`,
          `${before.widgetCount} -> 0`);
      }
    }
  }

  if (p.bytes > (opts.oversized || 900000)) {
    add('oversized', `${Math.round(p.bytes / 1024)} KB`, `${Math.round(p.bytes / 1024)} KB`);
  }
  if (res.ms > (opts.slowMs || 5000)) {
    add('slow', `${(res.ms / 1000).toFixed(1)}s to first byte`, `${res.ms}ms`);
  }

  return out;
}

// ── RANKING ──────────────────────────────────────────────────────────────────
//  Tier first, then blast radius, then the URL so the order is stable run to run.
//  Blast radius is how many distinct pages carry the same finding kind: one dead
//  link is a nit, the same dead link on ninety lesson pages is a navigation
//  element that broke, and those must not sort next to each other.
function rank(findings) {
  const radius = new Map();
  for (const f of findings) {
    const key = f.kind + '|' + (f.evidence || f.detail || '');
    radius.set(key, (radius.get(key) || 0) + 1);
  }
  return findings
    .map((f) => ({ ...f, blast: radius.get(f.kind + '|' + (f.evidence || f.detail || '')) || 1 }))
    .sort((a, b) => (TIERS[a.tier] - TIERS[b.tier]) || (b.blast - a.blast) || a.url.localeCompare(b.url));
}

// Collapse findings that are the same problem seen from many pages into one row
// carrying the count and a few examples. Ninety rows of the same broken nav link
// is the report burying itself.
function group(findings) {
  const byKey = new Map();
  for (const f of rank(findings)) {
    const key = f.kind + '|' + (f.evidence || f.detail || '');
    if (!byKey.has(key)) {
      byKey.set(key, {
        kind: f.kind, tier: f.tier, detail: f.detail, evidence: f.evidence,
        urls: [], count: 0, linked_from: f.linked_from || null, nights: f.nights || 1,
      });
    }
    const g = byKey.get(key);
    g.count += 1;
    // The detail line is taken from the FIRST member of the group. When the
    // group has more than one member that line describes an example, not all of
    // them, and the report has to say so: a run once printed one page's widget
    // counts above a list of seven URLs with different counts.
    if (g.count > 1) g.detail_is_example = true;
    g.nights = Math.max(g.nights, f.nights || 1);
    if (g.urls.length < 5) g.urls.push(f.url);
  }
  return Array.from(byKey.values())
    .sort((a, b) => (TIERS[a.tier] - TIERS[b.tier]) || (b.count - a.count));
}

// ── DELTA ────────────────────────────────────────────────────────────────────
//  Straight from board-delta.js, and for the same reason it exists there: a
//  report that reprints the same list every morning is wallpaper inside a week.
//  What is NEW leads. What RESOLVED is worth one line. What PERSISTS is a count
//  and an age, not a re-listing.
//
//  A missing previous run reports 'no baseline' rather than calling everything
//  new, because a false alarm on the one morning with nothing to compare against
//  is how someone learns to ignore mornings.
function delta(previous, current) {
  const keyOf = (f) => `${f.kind}|${f.url}|${f.evidence || f.detail || ''}`;
  if (!previous || !Array.isArray(previous.findings)) {
    return { baseline: false, fresh: current.findings.slice(), resolved: [], persisting: [], ages: {} };
  }
  const before = new Map(previous.findings.map((f) => [keyOf(f), f]));
  const now = new Map(current.findings.map((f) => [keyOf(f), f]));
  const fresh = [];
  const persisting = [];
  const ages = {};
  for (const [k, f] of now) {
    const prior = before.get(k);
    if (!prior) { fresh.push(f); ages[k] = 1; }
    else { persisting.push(f); ages[k] = (prior.nights || 1) + 1; }
  }
  const resolved = [];
  for (const [k, f] of before) {
    // Only claim a resolution when the URL was actually looked at again. On a
    // sharded night most of the site is not crawled, and reporting untouched
    // findings as fixed would be a lie every single morning.
    if (!now.has(k) && current.crawledUrls && current.crawledUrls.has(f.url)) resolved.push(f);
  }
  return { baseline: true, fresh, resolved, persisting, ages };
}

module.exports = {
  KINDS, TIERS, tierOf, classify, handleOf, expectedReporters, REPORTER_BY_PREFIX,
  parse, classTokens, stripCode, staleSchoolYears, currentSchoolYearStart, looksScraped, WIDGET_FAMILIES, ALL_REPORTERS, looksLikeChallenge, detectMojibake, visibleText, checkPage, rank, group, delta,
  isCrawlableLink, normalizeLink, PLACEHOLDERS, LINK_IGNORE,
};
