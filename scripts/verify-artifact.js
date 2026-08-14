#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY-ARTIFACT. Fetches a URL and reports EVIDENCE, never a verdict.
//
//  Why this exists: three tasks in a row were mis-closed because someone looked
//  at a rendered page and concluded the work was done. The Spring 2026 bootcamp
//  banner is the canonical case - it is hidden by a JS date check, so a browser
//  shows nothing, while the stale copy still ships in the HTML of every page.
//  The opposite error happened too: /pages/join was flagged as leaking install
//  instructions when the leak was in an HTML comment belonging to a different
//  task, and the page body was clean.
//
//  Both errors have the same root cause: rendered output and shipped markup are
//  different things, and only one of them is what you were asked about. So every
//  check here reports WHICH LAYER a hit lives in:
//
//      visible   - a human reading the page sees this
//      comment   - shipped in the HTML, invisible to a reader, visible to a crawler
//      script    - inside <script>, may or may not execute
//      style     - inside <style>
//
//  ZERO DEPENDENCIES and read-only. No database, no writes, no auth. It cannot
//  mark anything verified: that guard is cookie-auth on purpose and stays.
//
//  Usage:
//    node scripts/verify-artifact.js <url> [<url> ...]
//    node scripts/verify-artifact.js <url> --json
// ─────────────────────────────────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// apcsexamprep.com sits behind Cloudflare, which answers the default fetch
// user-agent with error 1010. Every request from here carries a browser UA.
//
// It also rate-limits: a fast sweep earns 429s, and a 429 read as a failure is
// a false P0 that sends someone hunting a page that is fine. So: sequential
// requests, a pause between them, and exponential backoff on 429 with the
// attempt count reported alongside the result.
const PAUSE_MS = Number(process.env.VERIFY_PAUSE_MS || 1200);
const MAX_RETRIES = Number(process.env.VERIFY_MAX_RETRIES || 4);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fs = require('fs');

async function get(url) {
  const started = Date.now();

  // A local path is treated as an already-fetched body. Lets the smoke suite
  // exercise every check offline, and lets a saved page be re-examined without
  // hitting a rate-limited host again.
  if (!/^https?:\/\//i.test(url)) {
    const body = fs.readFileSync(url, 'utf8');
    return { status: 200, url, body, ms: Date.now() - started, attempts: 1, local: true };
  }

  let attempt = 0;
  let res;
  let body;

  for (;;) {
    res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    body = await res.text();
    if (res.status !== 429 || attempt >= MAX_RETRIES) break;
    attempt += 1;
    // Honour Retry-After when the server sends one, otherwise 2s, 4s, 8s, 16s.
    const ra = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 2000 * 2 ** (attempt - 1);
    await sleep(wait);
  }

  return { status: res.status, url: res.url, body, ms: Date.now() - started, attempts: attempt + 1 };
}

// ── layer separation ─────────────────────────────────────────────────────────
function layers(html) {
  const comments = (html.match(/<!--[\s\S]*?-->/g) || []).join('\n');
  const scripts = (html.match(/<script[\s\S]*?<\/script>/gi) || []).join('\n');
  const styles = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');

  let rest = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const visible = decode(rest.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return { visible, comment: comments, script: scripts, style: styles };
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '-').replace(/&ndash;/g, '-')
    .replace(/&bull;/g, '*').replace(/&amp;/g, '&');
}

// ── checks ───────────────────────────────────────────────────────────────────

// Mojibake. Genuinely shape-based, because the same damage renders two ways.
// UTF-8 bytes read back as latin1 and as cp1252 produce DIFFERENT garbage from
// identical source: the bullet U+2022 is E2 80 A2, and byte 0x80 is a control
// character under latin1 but the Euro sign under cp1252. A pattern list written
// for one of those silently misses the other, which is exactly what the first
// version of this check did - it enumerated the cp1252 forms and found nothing
// at all in the latin1 forms, while its own smoke fixture used latin1 and never
// asserted on the result.
//
// So match the SHAPE. Mojibake is always a UTF-8 lead byte followed by one to
// three continuation bytes, in whatever glyphs the mis-decode chose for them.
//   lead: 0xC2-0xDF (2-byte), 0xE0-0xEF (3-byte), 0xF0-0xF4 (4-byte)
//   cont: 0x80-0xBF, which is U+0080-U+00BF under latin1 and, for the 0x80-0x9F
//         half, the cp1252 punctuation block instead.
// Both encodings pass 0xA0-0xFF through unchanged, so one lead class covers both.
//
// Written as escapes on purpose: half of these code points are control
// characters, and a literal would make this file unreadable and unpasteable.
const MOJI_LEAD = '\u00C2-\u00DF\u00E0-\u00EF\u00F0-\u00F4';
const MOJI_CONT = '\u0080-\u00BF'
  + '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D'
  + '\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178';
const MOJI_RE = new RegExp('[' + MOJI_LEAD + '][' + MOJI_CONT + ']{1,3}');

function checkMojibake(html) {
  const hits = [];
  for (const line of html.split('\n')) {
    if (!MOJI_RE.test(line)) continue;
    hits.push(line.trim().slice(0, 120));
    if (hits.length >= 5) break;
  }
  return hits;
}

// Dates in the shipped markup that have already passed. This is the check that
// would have caught the bootcamp banner: the copy is stale, the page renders
// fine, and nothing else flags it.
function layerOf(L, snippet) {
  if (L.script.includes(snippet)) return 'script';
  if (L.style.includes(snippet)) return 'style';
  if (L.comment.includes(snippet)) return 'comment';
  return 'body';
}

function checkStaleDates(html, now, L) {
  const found = new Map();
  const re = /\b(20\d{2})-(\d{2})-(\d{2})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(20\d{2})\b/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let d;
    if (m[1]) d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    else {
      const mo = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
        .indexOf(m[4].toLowerCase());
      d = new Date(Date.UTC(Number(m[6]), mo, Number(m[5])));
    }
    if (isNaN(d)) continue;
    const days = Math.floor((now - d) / 86400000);
    if (days > 30) {
      const key = m[0];
      if (!found.has(key)) {
        const raw = html.slice(Math.max(0, m.index - 90), m.index + 90);
        const ctx = raw.replace(/\s+/g, ' ');
        const layer = layerOf(L, html.slice(Math.max(0, m.index - 40), m.index + 40));
        // An API version pin is not stale copy.
        const versionPin = /revision|version|api[-_ ]?date|@\d|schema/i.test(ctx);
        found.set(key, {
          date: m[0], days_past: days, layer,
          noise: layer !== 'body' || versionPin,
          context: decode(ctx).trim(),
        });
      }
    }
  }
  return [...found.values()].sort((a, b) => b.days_past - a.days_past).slice(0, 8);
}

// A block pasted twice into theme.liquid ships twice on every page.
function checkDuplicateBlocks(html) {
  const out = [];
  const comments = html.match(/<!--[\s\S]{40,400}?-->/g) || [];
  const seen = new Map();
  for (const c of comments) {
    const k = c.replace(/\s+/g, ' ').trim();
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, n] of seen) {
    if (n > 1) out.push({ kind: 'comment', count: n, sample: k.slice(0, 90) });
  }
  // Repeated style blocks that declare the same top-level id.
  const styleIds = new Map();
  for (const s of html.match(/<style[\s\S]*?<\/style>/gi) || []) {
    const id = (s.match(/#([a-zA-Z][\w-]{4,})\s*\{/) || [])[1];
    if (id) styleIds.set(id, (styleIds.get(id) || 0) + 1);
  }
  for (const [id, n] of styleIds) {
    if (n > 1) out.push({ kind: 'style', count: n, sample: `#${id} { ... }` });
  }
  return out;
}

function checkHeadings(html) {
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const texts = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return { count: h1, texts: texts.slice(0, 5) };
}

function checkMeta(html) {
  const d = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    title: t ? decode(t[1]).trim().slice(0, 120) : null,
    description: d ? decode(d[1]).trim() : null,
    description_len: d ? d[1].length : 0,
  };
}

// Where does a phrase actually live? This is the whole point of the tool.
function locate(html, L, phrase) {
  const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    phrase,
    visible: re.test(L.visible),
    comment: re.test(L.comment),
    script: re.test(L.script),
    style: re.test(L.style),
    total_in_source: (html.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length,
  };
}

async function inspect(url, phrases, now) {
  let r;
  try {
    r = await get(url);
  } catch (e) {
    return { url, error: String(e.message || e) };
  }
  const L = layers(r.body);
  // An error page is not the page. Running meta/heading checks against a 429
  // body invents findings about a document nobody was asked about.
  const usable = r.status === 200;
  return {
    url,
    final_url: r.url,
    status: r.status,
    bytes: r.body.length,
    ms: r.ms,
    attempts: r.attempts,
    local: !!r.local,
    usable,
    visible_chars: L.visible.length,
    mojibake: usable ? checkMojibake(r.body) : [],
    stale_dates: usable ? checkStaleDates(r.body, now, L) : [],
    duplicate_blocks: usable ? checkDuplicateBlocks(r.body) : [],
    headings: usable ? checkHeadings(r.body) : { count: 1, texts: [] },
    meta: usable ? checkMeta(r.body) : { title: null, description: 'n/a', description_len: 100 },
    phrases: usable ? phrases.map((p) => locate(r.body, L, p)) : [],
  };
}

function report(x) {
  const out = [];
  const P = (s) => out.push(s);
  if (x.error) { P(`FETCH FAILED  ${x.url}\n  ${x.error}`); return out.join('\n'); }

  P(`${x.status}  ${x.url}`);
  if (x.final_url !== x.url) P(`     redirected to ${x.final_url}`);
  P(`     ${x.bytes} bytes shipped, ${x.visible_chars} chars visible, ${x.ms}ms`
    + (x.attempts > 1 ? `, ${x.attempts} attempts (rate limited)` : ''));

  if (!x.usable && x.status !== 429) P('     content checks skipped: not a 200 response');
  if (x.status === 429) P(`  [P1] still 429 after ${x.attempts} attempts - rate limited, NOT broken. Re-run slower.`);
  else if (x.status !== 200) P(`  [P0] status is ${x.status}, not 200`);

  if (x.mojibake.length) {
    P(`  [P0] mojibake on ${x.mojibake.length} line(s):`);
    x.mojibake.forEach((l) => P(`         ${l}`));
  }

  const staleReal = x.stale_dates.filter((d) => !d.noise);
  const staleNoise = x.stale_dates.filter((d) => d.noise);
  if (staleReal.length) {
    P(`  [P1] ${staleReal.length} past date(s) in BODY COPY:`);
    staleReal.forEach((d) => P(`         ${d.date}  (${d.days_past}d ago)  ...${d.context.slice(0, 110)}`));
  }
  if (staleNoise.length) {
    P(`  [info] ${staleNoise.length} past date(s) in script/style/comment or version pins - probably fine:`);
    staleNoise.slice(0, 3).forEach((d) => P(`         ${d.date} (${d.layer})  ${d.context.slice(0, 70)}`));
  }

  if (x.duplicate_blocks.length) {
    P(`  [P1] duplicated block(s) shipped on every page load:`);
    x.duplicate_blocks.forEach((d) => P(`         ${d.kind} x${d.count}  ${d.sample}`));
  }

  if (x.headings.count !== 1) {
    P(`  [P1] ${x.headings.count} <h1> tags (expected 1): ${x.headings.texts.join(' | ').slice(0, 140)}`);
  }

  if (!x.meta.description) P(`  [P1] no meta description`);
  else if (x.meta.description_len < 70 || x.meta.description_len > 160) {
    P(`  [P2] meta description is ${x.meta.description_len} chars (want 70-160)`);
  }

  for (const p of x.phrases) {
    const where = ['visible', 'comment', 'script', 'style'].filter((k) => p[k]);
    if (!where.length) P(`  phrase "${p.phrase}": ABSENT from the page`);
    else if (p.visible) {
      P(`  phrase "${p.phrase}": in RENDERED MARKUP (${p.total_in_source}x in source)`);
      P(`         static fetch cannot run JS - check for a script that hides it before judging`);
    } else {
      P(`  phrase "${p.phrase}": shipped in ${where.join(' + ')} only (${p.total_in_source}x)`);
      P(`         invisible to a reader, still served to crawlers`);
    }
  }
  return out.join('\n');
}

(async () => {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const phrases = [];
  const urls = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--phrase') { phrases.push(argv[++i]); continue; }
    if (argv[i].startsWith('--')) continue;
    urls.push(argv[i]);
  }
  if (!urls.length) {
    console.error('usage: node scripts/verify-artifact.js <url> [--phrase "text"] [--json]');
    process.exit(64);
  }
  const now = new Date();
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    if (i) await sleep(PAUSE_MS);
    results.push(await inspect(urls[i], phrases, now));
  }

  if (json) { console.log(JSON.stringify(results, null, 2)); return; }
  console.log(`EVIDENCE  ${now.toISOString()}\n`);
  for (const r of results) { console.log(report(r)); console.log(''); }
  console.log('This tool reports evidence, not a verdict. Nothing here marks a task verified.');
})();
