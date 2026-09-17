'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE PAGE INDEX  (handoff section 4.4)
//
//  "Help me find a page" returns LINKS FROM THIS INDEX AND NOTHING ELSE.
//
//  That is the whole security property and it is worth stating before the code,
//  because it is easy to lose by accident. A model asked "where is the CSA loops
//  lesson" will happily produce a plausible URL, and a plausible URL on this site
//  is a 404 or, worse, a page that exists and is the wrong one. So the model is
//  never allowed to emit a URL. It is handed a NUMBERED SHORTLIST that came out
//  of this table and may return integers. An integer outside the list is dropped.
//
//  Three consequences follow, and they are the reason the shape is like this:
//
//    1. Nothing this endpoint returns can fail to exist, because every candidate
//       was read out of the sitemap.
//    2. A model outage degrades to plain lexical ranking rather than to an error,
//       because the ranking already happened before the model was asked.
//    3. The worst a compromised or confused model can do is reorder a list or
//       return nothing. It cannot invent a destination.
//
//  THE INDEX IS BUILT FROM THE SITEMAP, through lib/storefront-fetch.js, with no
//  User-Agent. That module is not optional here: the bot management on this
//  storefront has been in three different states in one week, and a challenge
//  page served with a 200 parses as a sitemap with zero URLs, which would empty
//  this table without erroring. looksReal() is what stops that, and build()
//  refuses to prune against a suspiciously small crawl besides.
//
//  TITLES. The sitemap carries <loc> and <lastmod> and no titles at all, checked
//  2026-09-17 against the live file: 1360 page URLs, zero <image:title>. Fetching
//  1360 pages nightly to read a <title> is not worth it for a search box, so the
//  display title is DERIVED from the handle and the derivation is visible in
//  titleFromHandle below. Where a real title is already known to this repo, from
//  config/cyber-topics.json, it wins. Nothing is invented.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../../db');

// Sitemaps worth reading. The products and collections maps are commerce and the
// agentic-discovery one is a Shopify extra; pages and blogs are where lessons,
// hubs and QOTD articles live, which is what somebody searching for a page means.
const WANTED_SITEMAPS = /sitemap_(pages|blogs)_/;

// A crawl that comes back with fewer than this many pages is not believed, and
// specifically is not allowed to prune. The live count was 1360 on 2026-09-17,
// so this is a floor rather than an estimate: it exists to stop a challenge page
// or a half-served sitemap from emptying the table, which is the failure that
// would look like "search stopped finding anything" rather than like an error.
const MIN_CREDIBLE_PAGES = 200;

// ── SCHEMA ───────────────────────────────────────────────────────────────────
//
// In this module rather than db.js because nothing else reads it and it is
// rebuilt wholesale rather than migrated. Additive, IF NOT EXISTS, and it holds
// nothing but public URLs: no student data, no account state, nothing to leak.
function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS page_index (
      path       TEXT PRIMARY KEY,   -- '/pages/ap-csa-lesson-1-9-loops'
      url        TEXT NOT NULL,      -- the absolute URL the sitemap gave
      handle     TEXT NOT NULL,
      title      TEXT NOT NULL,      -- derived, or a known real title
      course     TEXT,               -- ap-csa | ap-csp | ap-cybersecurity | ap-networking | intro-java
      unit       TEXT,
      lesson     TEXT,
      page_type  TEXT NOT NULL,      -- lesson | quiz | exam | lab | exercise | qotd | hub | commerce | other
      kind       TEXT NOT NULL,      -- page | article
      lastmod    TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_page_index_course ON page_index(course, page_type);
  `);
}
ensureSchema();

// ── CLASSIFICATION ───────────────────────────────────────────────────────────
//
// utils.pageFromHandle only understands the CSA lesson pattern (checked: it
// returns null for cyber quizzes, CSP big ideas, QOTD articles and commerce
// pages), so this module classifies for itself rather than pretending that
// parser covers the site. Where the two DO overlap they agree, because both read
// the same handle.

// MEASURED against the live sitemap on 2026-09-17, not assumed. The site spells
// the cyber course TWO ways in its handles: 'ap-cybersecurity-unit-1-...' for the
// lesson pages and 'ap-cyber-unit-1-lesson-1-quiz' for the quizzes. Listing only
// the long form left 27 cyber quizzes with no course at all, which is the kind of
// gap that shows up as "search never finds the cyber quizzes" rather than as an
// error. 'ap-cybersecurity' is listed first so the longer name wins its own
// pages; the two cannot collide anyway, because the short prefix requires a
// hyphen immediately after 'cyber'.
const COURSE_PREFIX = [
  ['ap-cybersecurity', 'ap-cybersecurity'],
  ['ap-cyber', 'ap-cybersecurity'],
  ['ap-csa', 'ap-csa'],
  ['ap-csp', 'ap-csp'],
  ['ap-networking', 'ap-networking'],
  ['intro-java', 'intro-java'],
];

// An ARTICLE takes its course from the blog it is in, not from its own handle.
// A QOTD article is called 'unit-2-cycle-2-day-7' and names no course anywhere in
// itself; the blog does. Measured the same day: 430 articles in
// ap-csa-daily-practice, 112 in ap-csp-daily-practice, and smaller per-course
// blogs beside them. Reading the handle alone left all 351 of them uncoursed.
const BLOG_COURSE = [
  ['ap-cybersecurity', 'ap-cybersecurity'],
  ['ap-cyber', 'ap-cybersecurity'],
  ['ap-csa', 'ap-csa'],
  ['ap-csp', 'ap-csp'],
  ['ap-networking', 'ap-networking'],
];

// The blog handle out of '/blogs/<blog>/<article>'.
function blogOf(path) {
  const m = /^\/blogs\/([^/]+)\//.exec(String(path || ''));
  return m ? m[1].toLowerCase() : null;
}

function courseFromBlog(path) {
  const blog = blogOf(path);
  if (!blog) return null;
  for (const [prefix, course] of BLOG_COURSE) {
    if (blog === prefix || blog.startsWith(prefix + '-')) return course;
  }
  return null;
}

function courseOf(handle) {
  for (const [prefix, course] of COURSE_PREFIX) {
    if (handle === prefix || handle.startsWith(prefix + '-')) return course;
  }
  return null;
}

// The page TYPE, from the end of the handle where the site puts it. Ordered so
// the most specific suffix wins: '-unit-test' must beat '-test'.
function pageTypeOf(handle, kind) {
  if (kind === 'article') return 'qotd';
  if (/-(unit-test|practice-exam|practice-test)$/.test(handle)) return 'exam';
  if (/-exam$/.test(handle)) return 'exam';
  if (/-quiz$/.test(handle)) return 'quiz';
  if (/-lab(-\d+)?$/.test(handle)) return 'lab';
  if (/-(exercise|exercise-\d+|code|debug|gap)$/.test(handle)) return 'exercise';
  if (/-(hub|course-hub|index|home)$/.test(handle)) return 'hub';
  if (/^(pricing|cart|checkout|contact|about|redeem|order|teacher-bundles)/.test(handle)) return 'commerce';
  if (courseOf(handle)) return 'lesson';
  return 'other';
}

// unit-N and a dotted lesson number, where the handle carries them. Deliberately
// tolerant: the site spells units four different ways across four courses, and a
// search box does not need to resolve every one of them correctly to be useful.
function unitOf(handle) {
  let m = /\bunit-(\d+)\b/.exec(handle);
  if (m) return 'unit-' + m[1];
  m = /\bbig-idea-(\d+)\b/.exec(handle);
  if (m) return 'big-idea-' + m[1];
  m = /\bu(\d+)\b/.exec(handle);
  if (m) return 'unit-' + m[1];
  return null;
}

// The unit a dotted lesson number belongs to. Only ever a fallback for a handle
// that does not name its unit; a handle that does always wins, because the site
// spells some units differently from the lesson numbering.
function unitFromLesson(lesson) {
  if (!lesson) return null;
  const m = /^(\d+)\./.exec(String(lesson));
  return m ? 'unit-' + m[1] : null;
}

function lessonOf(handle) {
  // 'lesson-1-9', 'unit-2-2-1', '3-4-firewalls'. The first two digits separated
  // by a hyphen after a unit or lesson marker are the lesson number.
  let m = /\blesson-(\d+)-(\d+)\b/.exec(handle);
  if (m) return `${m[1]}.${m[2]}`;
  m = /\bunit-\d+-(\d+)-(\d+)\b/.exec(handle);
  if (m) return `${m[1]}.${m[2]}`;
  return null;
}

// A readable title from the handle. This is a DERIVATION, not a lookup, and it
// is named that way so nobody later mistakes it for the page's real <title>.
// Course prefixes are stripped because "AP Csa Lesson 1 9 Loops" reads worse
// than "Loops" next to a course label the caller already picked.
const SMALL_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'to', 'in', 'for', 'vs', 'with', 'on']);
function titleFromHandle(handle) {
  let s = handle;
  for (const [prefix] of COURSE_PREFIX) {
    if (s.startsWith(prefix + '-')) { s = s.slice(prefix.length + 1); break; }
  }
  const words = s.split('-').filter(Boolean).map((w, i) => {
    if (/^\d+$/.test(w)) return w;
    if (i > 0 && SMALL_WORDS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const out = words.join(' ').trim();
  return out || handle;
}

// Real titles this repo already knows, so a derivation never overrides a fact.
// config/cyber-topics.json carries the 24 CED titles and the handle each one
// lives at; CLAUDE.md is explicit that those titles are never retyped.
function knownTitles() {
  const map = new Map();
  try {
    const topics = require('../cyber-topics');
    const list = (topics.all && topics.all()) || (topics.topics && topics.topics()) || [];
    for (const t of list) {
      if (t && t.handle && t.title) map.set(String(t.handle).toLowerCase(), t.title);
    }
  } catch (_) { /* the taxonomy is optional to this module */ }
  return map;
}

function classify(url, kind, lastmod, titles) {
  let path;
  try { path = new URL(url).pathname.replace(/\/+$/, '') || '/'; } catch (_) { return null; }
  const m = /\/(?:pages|blogs\/[^/]+)\/([^/]+)$/.exec(path);
  const handle = (m ? m[1] : path.replace(/^\//, '')).toLowerCase();
  if (!handle) return null;
  return {
    path,
    url,
    handle,
    title: titles.get(handle) || titleFromHandle(handle),
    // An article's blog names its course; a page's handle does. Neither is
    // guessed from the other.
    course: (kind === 'article' ? courseFromBlog(path) : null) || courseOf(handle),
    // The lesson number names the unit when the handle does not spell it out.
    // 'ap-csa-lesson-1-9-loops' carries no 'unit-1' anywhere, and leaving the
    // unit null there would drop every CSA lesson out of a unit-scoped filter.
    unit: unitOf(handle) || unitFromLesson(lessonOf(handle)),
    lesson: lessonOf(handle),
    page_type: pageTypeOf(handle, kind),
    kind,
    lastmod: lastmod || null,
  };
}

// ── BUILD ────────────────────────────────────────────────────────────────────

function parseLocs(xml) {
  return [...String(xml || '').matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const block = m[1];
    const loc = /<loc>([^<]+)<\/loc>/.exec(block);
    const mod = /<lastmod>([^<]+)<\/lastmod>/.exec(block);
    return loc ? { url: decodeEntities(loc[1]), lastmod: mod ? mod[1] : null } : null;
  }).filter(Boolean);
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const stUpsert = db.prepare(`
  INSERT INTO page_index (path, url, handle, title, course, unit, lesson, page_type, kind, lastmod, updated_at)
  VALUES (@path, @url, @handle, @title, @course, @unit, @lesson, @page_type, @kind, @lastmod, datetime('now'))
  ON CONFLICT(path) DO UPDATE SET
    url = excluded.url, handle = excluded.handle, title = excluded.title,
    course = excluded.course, unit = excluded.unit, lesson = excluded.lesson,
    page_type = excluded.page_type, kind = excluded.kind, lastmod = excluded.lastmod,
    updated_at = datetime('now')
`);

// Rebuild the index from the live sitemap. Returns a report rather than throwing,
// because this runs on a schedule and a scheduled job that throws is a job whose
// failure goes to a log an agent cannot read.
async function build(opts) {
  const o = opts || {};
  const fetchImpl = o.fetchImpl || null;  // the suite injects one; production uses the module
  ensureSchema();

  let sf = null;
  if (!fetchImpl) sf = require('../storefront-fetch');
  const get = fetchImpl || (async (p) => {
    const r = await sf.raw(p);
    return String((r && r.body) || '');
  });

  const report = { ok: false, sitemaps: 0, seen: 0, written: 0, pruned: 0, errors: [] };

  let rootXml;
  try { rootXml = await get('/sitemap.xml'); } catch (e) {
    report.errors.push('root sitemap: ' + e.message);
    return report;
  }

  const subs = [...String(rootXml).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => decodeEntities(m[1]))
    .filter((u) => WANTED_SITEMAPS.test(u));
  report.sitemaps = subs.length;
  if (!subs.length) {
    report.errors.push('root sitemap named no page or blog sitemaps');
    return report;
  }

  const titles = knownTitles();
  const rows = [];
  for (const sub of subs) {
    const kind = /sitemap_blogs_/.test(sub) ? 'article' : 'page';
    let xml;
    try {
      const u = new URL(sub);
      xml = await get(u.pathname + u.search);
    } catch (e) {
      report.errors.push(sub + ': ' + e.message);
      continue;
    }
    for (const entry of parseLocs(xml)) {
      const row = classify(entry.url, kind, entry.lastmod, titles);
      if (row) rows.push(row);
    }
  }
  report.seen = rows.length;

  // A crawl this small is not believed. Writing what it found is harmless; the
  // damage would be PRUNING everything it did not find, which is how a challenge
  // page empties a search index without anything erroring.
  const credible = rows.length >= MIN_CREDIBLE_PAGES;
  if (!credible) {
    report.errors.push(`only ${rows.length} pages found, below the ${MIN_CREDIBLE_PAGES} floor: not pruning`);
  }

  const write = db.transaction((list) => {
    for (const r of list) stUpsert.run(r);
  });
  write(rows);
  report.written = rows.length;

  if (credible) {
    const keep = new Set(rows.map((r) => r.path));
    const existing = db.prepare('SELECT path FROM page_index').all().map((r) => r.path);
    const gone = existing.filter((p) => !keep.has(p));
    if (gone.length) {
      const del = db.prepare('DELETE FROM page_index WHERE path = ?');
      const prune = db.transaction((list) => { for (const p of list) del.run(p); });
      prune(gone);
      report.pruned = gone.length;
    }
  }

  report.ok = credible && rows.length > 0;
  return report;
}

// ── SEARCH ───────────────────────────────────────────────────────────────────
//
// Lexical, in SQL and in JS, with no model involved. This is the ranking the
// model RE-ORDERS rather than replaces, which is what lets the whole feature
// degrade to "slightly worse ordering" when the model is off.

const STOP = new Set([
  'where', 'is', 'the', 'a', 'an', 'how', 'do', 'i', 'to', 'for', 'of', 'on', 'in',
  'find', 'me', 'page', 'lesson', 'about', 'what', 'can', 'my', 'and', 'get', 'go',
]);

function tokens(q) {
  return String(q || '').toLowerCase().split(/[^a-z0-9.]+/).filter((t) => t && !STOP.has(t)).slice(0, 12);
}

const stAll = db.prepare('SELECT path, url, title, course, unit, lesson, page_type, kind FROM page_index');

// How much each kind of page is worth when nothing in the query asks for it.
//
// MEASURED rather than guessed: "where is the CSA loops lesson" returned three
// QOTD articles before this existed, because 430 daily-practice articles carry
// the word "loops" in their titles and the lesson pages carry it once each. A
// person asking where a lesson is does not want a practice question about it,
// and the whole point of this feature is that the answer is a place to go.
const TYPE_WEIGHT = {
  lesson: 4,
  hub: 3,
  lab: 1,
  exercise: 0,
  commerce: 0,
  other: 0,
  qotd: -3,      // a daily practice item is not a lesson
  quiz: -4,      // and an assessment is the last thing to hand somebody
  exam: -5,
};

// Score one row against the query tokens. Deliberately simple and readable: the
// model re-rank exists precisely so this does not have to be clever, and it has
// to stay good enough to stand alone when the model is off.
function score(row, toks) {
  const hay = `${row.handle || ''} ${row.title} ${row.course || ''} ${row.unit || ''} ${row.lesson || ''}`.toLowerCase();
  let s = 0;
  let hits = 0;
  for (const t of toks) {
    if (!hay.includes(t)) continue;
    hits++;
    s += 2;
    // A lesson number matching exactly is the strongest signal a person gives.
    if (row.lesson && row.lesson === t) s += 8;
    if (row.course && row.course.includes(t)) s += 1;
    if (String(row.title).toLowerCase().split(/\s+/).includes(t)) s += 2;
  }
  if (!hits) return 0;

  s += (TYPE_WEIGHT[row.page_type] !== undefined ? TYPE_WEIGHT[row.page_type] : 0);

  // 'lesson' is a stop word in the query tokens, so asking for one cannot be
  // read off toks. It is read off the raw query by search() and passed here.
  return s;
}

function search(q, opts) {
  const limit = Math.min(Math.max(Number((opts && opts.limit) || 5), 1), 10);
  const toks = tokens(q);
  if (!toks.length) return [];
  // 'lesson' and 'quiz' are stop words for MATCHING, because every handle has
  // one, but they are strong signals about what KIND of page is wanted. Read
  // them off the raw query rather than the tokens.
  const raw = String(q || '').toLowerCase();
  const wantsLesson = /\blessons?\b/.test(raw);
  const wantsAssessment = /\b(quiz|quizzes|test|exam|practice)\b/.test(raw);
  let rows;
  try { rows = stAll.all(); } catch (_) { return []; }
  const scored = [];
  for (const r of rows) {
    let s = score(r, toks);
    if (s <= 0) continue;
    if (wantsLesson && r.page_type === 'lesson') s += 5;
    if (wantsAssessment && (r.page_type === 'quiz' || r.page_type === 'exam')) s += 7;
    scored.push({ row: r, s });
  }
  scored.sort((a, b) => b.s - a.s || a.row.path.localeCompare(b.row.path));
  return scored.slice(0, limit).map((x) => x.row);
}

// Every path this module would ever hand out has to be IN the table. Called on
// the way out, after any re-ranking, so a reordering step cannot smuggle in a
// path that was not a candidate.
const stExists = db.prepare('SELECT 1 AS ok FROM page_index WHERE path = ?');
function isIndexed(path) {
  try { return !!stExists.get(path); } catch (_) { return false; }
}

function count() {
  try { return db.prepare('SELECT COUNT(*) n FROM page_index').get().n; } catch (_) { return 0; }
}

// ── KEEPING IT FILLED AND FRESH ──────────────────────────────────────────────
//
//  THE BUG THIS EXISTS FOR, caught live rather than in a suite: the endpoint
//  deployed green with an EMPTY table, and an empty index answers every question
//  with nothing, in exactly the way a working search answers a bad question. The
//  find endpoint on production returned `{"results":[],"ranked_by":"none"}` for a
//  query that matches 40 pages, and nothing anywhere was red.
//
//  THE REBUILD HAS TO RUN ON THE SERVER, and that is not obvious. The handoff
//  says "rebuild nightly", and the nightly sweep is a GitHub Actions workflow
//  with its own throwaway SQLite file: a build there writes 2000 rows to a
//  runner that is deleted four seconds later. The index lives on the Railway
//  volume, so only this process can fill it. An admin-key endpoint called from
//  Actions would work, except no workflow in this repo holds an ADMIN_KEY (16
//  hold TODO_KEY, none hold that one), so that route needs a secret added before
//  it exists.
//
//  So freshness is traffic-driven instead, which suits a table whose whole job
//  is to answer a search box: the first search after the index goes stale pays
//  for the next day of searches, in the background, and nobody waits.
//
//  Four bounds, because this is reachable from a public endpoint:
//    once per process     _building latches for the life of the container
//    empty OR stale       a fresh index is never rebuilt
//    never awaited        no request ever waits on a crawl
//    never destructive    build() refuses to prune below its credibility floor
const STALE_HOURS = 24;

const stFreshness = db.prepare('SELECT MAX(updated_at) AS newest FROM page_index');
function ageHours() {
  try {
    const row = stFreshness.get();
    if (!row || !row.newest) return Infinity;
    return (Date.now() - Date.parse(row.newest + 'Z')) / 3600000;
  } catch (_) {
    return Infinity;
  }
}

// The DECISION, separated from the act, so a suite can check it exhaustively
// without a network call. Returns a reason string or null.
function needsRebuild(opts) {
  // Number.isFinite rather than `||`, because a staleHours of 0 is a legitimate
  // "rebuild whatever you have" and `||` reads it as absent and silently
  // substitutes 24. The suite caught this by asking for 0 and being told the
  // index was fresh.
  const raw = opts && opts.staleHours;
  const hours = Number.isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : STALE_HOURS;
  if (count() === 0) return 'empty';
  if (ageHours() >= hours) return 'stale';
  return null;
}

let _building = false;
function ensureFresh(opts) {
  if (_building) return false;
  if (!needsRebuild(opts)) return false;
  _building = true;
  build()
    .then((r) => console.log('[page-index] rebuild:', JSON.stringify(r)))
    .catch((e) => console.error('[page-index] rebuild failed:', e && e.message))
    .then(() => {
      // Released on completion rather than latched forever: a container that
      // lives a week should refresh more than once. The staleness check is what
      // stops it happening again immediately.
      _building = false;
    });
  return true;
}

module.exports = {
  build, search, isIndexed, count, ensureSchema, ensureFresh, needsRebuild, ageHours, STALE_HOURS,
  classify, courseOf, courseFromBlog, blogOf, unitOf, unitFromLesson, lessonOf, pageTypeOf,
  titleFromHandle, parseLocs, tokens, score,
  WANTED_SITEMAPS, MIN_CREDIBLE_PAGES, TYPE_WEIGHT,
};
