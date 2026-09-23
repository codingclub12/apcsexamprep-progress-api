'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  EVERY PUBLISHED PAGE THAT CARRIES A GAME LEADERBOARD, FOUND FROM THE SITEMAP
//  RATHER THAN FROM THE REGISTRY, AND JUDGED BY RUNNING ITS OWN esc().
//
//  scripts/sweep-game-esc-live.js reads the game list out of routes/game.js and
//  builds each handle from a prefix rule. That is the right way to sweep what
//  the server knows about, and it is blind to exactly one thing: a page carrying
//  a pasted leaderboard that the registry does not name, or a handle the prefix
//  rule does not produce. Board 383 was written with the lock pattern
//  `ap-csp-course-*-game-*`, and no published handle matches it; the games live
//  at `ap-csp-game-*` and `ap-networking-game-*`. A sweep built from the board's
//  wording would have fetched nothing and reported nothing broken.
//
//  So this starts from the storefront's own page sitemap, keeps every handle
//  containing "game" (or every page with --all), and treats a page as carrying
//  the component only if its body calls /api/game/leaderboard.
//
//  Two witnesses per page, and they must agree:
//    parse  classify() from sweep-game-esc-live.js, which reads the map literal
//    run    the served esc() source, extracted and EXECUTED in a vm against a
//           hostile string. This does not read the map at all, so it cannot
//           share the parser's blind spots, and it is what a browser would do.
//  Plus the row builder itself: the player name must reach the row through
//  textContent, and no `+ esc(e.name` concatenation may remain.
//
//  It also counts any fetched body stating "undefined questions", the Applied
//  Challenge card defect, so --all answers both halves of board 383 site-wide.
//
//  Fetched through lib/storefront-fetch.js: no User-Agent, and a body that is
//  not provably a rendered page throws instead of reading as clean.
//
//  Run: node scripts/verify-game-leaderboard-sitemap-live.js [--all] [--json <path>]
//  Exit 1 if any leaderboard page is unsafe or the two witnesses disagree.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const sf = require('../lib/storefront-fetch');
const { classify, registryIds, handleFor } = require('./sweep-game-esc-live');

function sitemapHandles() {
  const idx = sf.raw('/sitemap.xml');
  if (idx.code !== '200') throw new Error('sitemap.xml answered ' + idx.code);
  const pageMaps = [...idx.body.matchAll(/<loc>([^<]*sitemap_pages[^<]*)<\/loc>/g)]
    .map((m) => m[1].replace(/&amp;/g, '&'));
  if (!pageMaps.length) throw new Error('sitemap.xml lists no pages sitemap');
  const out = new Set();
  for (const u of pageMaps) {
    const r = sf.raw(u);
    if (r.code !== '200') throw new Error(u + ' answered ' + r.code);
    for (const m of r.body.matchAll(/<loc>[^<]*\/pages\/([^<?#]+)<\/loc>/g)) out.add(m[1]);
  }
  //  A pages sitemap with a handful of entries is a fetch that went wrong, not a
  //  small store. The store had 1365 published pages on 2026-09-23.
  if (out.size < 500) throw new Error('pages sitemap returned only ' + out.size + ' handles');
  return [...out].sort();
}

//  The index just past the brace that closes the one at `open`. Aware of
//  quoted strings and of regex literals, because every esc() keeps its special
//  characters in one: `/"/g` carries a quote that is not a string, and a
//  scanner that read it as one ran off the end of csp-command-center's escaper.
//  A slash starts a regex when the last significant character cannot end an
//  operand, which is the rule a JavaScript tokenizer uses for these shapes.
function closeBrace(src, open) {
  let depth = 0;
  let q = null;
  let prev = '';
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '\\') { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { q = c; prev = c; continue; }
    if (c === '/' && src[i + 1] !== '/' && src[i + 1] !== '*' && (prev === '' || '(,=:[!&|?{};'.includes(prev))) {
      let inClass = false;
      let j = i + 1;
      for (; j < src.length; j++) {
        const d = src[j];
        if (d === '\\') { j++; continue; }
        if (d === '\n') break;
        if (inClass) { if (d === ']') inClass = false; continue; }
        if (d === '[') inClass = true;
        else if (d === '/') break;
      }
      if (src[j] === '/') { i = j; prev = '/'; continue; }
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
    if (!/\s/.test(c)) prev = c;
  }
  return -1;
}

const HOSTILE = '<img src=x onerror=1>&"';

//  Run every esc() on the page. A result is safe when no bare < or > survives
//  and every & begins an entity.
function runEscapers(body) {
  const out = [];
  const re = /function\s+esc\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(body))) {
    const end = closeBrace(body, m.index + m[0].length - 1);
    if (end < 0) { out.push({ safe: null, why: 'could not find the closing brace' }); continue; }
    const src = body.slice(m.index, end);
    try {
      const got = vm.runInNewContext('(' + src + ')(' + JSON.stringify(HOSTILE) + ')', {}, { timeout: 200 });
      out.push({ safe: !/[<>]/.test(got) && !/&(?![a-zA-Z]+;|#[0-9]+;|#[xX][0-9a-fA-F]+;)/.test(got), got });
    } catch (e) {
      out.push({ safe: null, why: e.message });
    }
  }
  return out;
}

function judge(body) {
  const cls = classify(body);
  const ran = runEscapers(body);
  const textName = /\.textContent\s*=\s*e\.name\b/.test(body);
  const concatName = /\+\s*esc\(\s*e\.name\b/.test(body);
  const runSafe = ran.length > 0 && ran.every((r) => r.safe === true);
  const parseSafe = cls.state === 'SAFE';
  let verdict;
  if (runSafe && parseSafe && textName && !concatName) verdict = 'SAFE';
  else if (runSafe !== parseSafe) verdict = 'DISAGREE';
  else verdict = 'BROKEN';
  return { verdict, parse: cls.state, parseBroken: cls.broken, run: ran.map((r) => r.safe), textName, concatName };
}

function main() {
  const all = process.argv.includes('--all');
  const jsonAt = process.argv.indexOf('--json');
  const handles = sitemapHandles();
  const targets = all ? handles : handles.filter((h) => h.includes('game'));
  console.log(handles.length + ' published pages in the sitemap; fetching ' + targets.length +
    (all ? ' (all).' : ' whose handle contains "game".') + '\n');

  const lb = [];
  const undef = [];
  const failed = [];
  for (const h of targets) {
    let body;
    try { body = sf.page('/pages/' + h).body; } catch (e) { failed.push(h + ': ' + e.message); continue; }
    if (/undefined questions/i.test(body)) undef.push(h);
    if (!body.includes('/api/game/leaderboard')) continue;
    const r = judge(body);
    r.handle = h;
    lb.push(r);
    console.log('  ' + r.verdict.padEnd(9) + h.padEnd(44) + 'parse=' + r.parse + ' run=' + r.run.join(',') +
      ' textContent=' + (r.textName ? 'yes' : 'no') + ' concat=' + (r.concatName ? 'yes' : 'no'));
  }

  //  The registry and the storefront, compared both ways.
  const reg = new Set(registryIds().map(handleFor));
  const lbSet = new Set(lb.map((r) => r.handle));
  const notInRegistry = [...lbSet].filter((h) => !reg.has(h));
  const registryNoPage = [...reg].filter((h) => !handles.includes(h));

  const bad = lb.filter((r) => r.verdict !== 'SAFE');
  console.log('\n  ' + lb.length + ' pages carry the leaderboard: ' + (lb.length - bad.length) + ' SAFE, ' +
    bad.filter((r) => r.verdict === 'BROKEN').length + ' BROKEN, ' +
    bad.filter((r) => r.verdict === 'DISAGREE').length + ' DISAGREE.');
  console.log('  ' + undef.length + ' fetched pages state "undefined questions"' + (undef.length ? ': ' + undef.join(' ') : '.'));
  console.log('  leaderboard pages the registry does not name: ' + (notInRegistry.join(' ') || 'none'));
  console.log('  registry games with no published page: ' + registryNoPage.length +
    (registryNoPage.length ? ' (' + registryNoPage.map((h) => h.replace(/^ap-(csp|networking)-game-/, '')).join(' ') + ')' : ''));
  if (failed.length) { console.log('  FETCH FAILED ' + failed.length + ':'); for (const f of failed) console.log('    ' + f); }

  if (jsonAt > -1 && process.argv[jsonAt + 1]) {
    fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify({
      swept_at: new Date().toISOString(), sitemap_pages: handles.length, fetched: targets.length,
      leaderboard_pages: lb, undefined_questions: undef, not_in_registry: notInRegistry,
      registry_no_page: registryNoPage, fetch_failed: failed,
    }, null, 2));
  }
  //  A fetch failure is not a clean page, so it fails the run too.
  process.exitCode = (bad.length || undef.length || failed.length) ? 1 : 0;
}

if (require.main === module) main();
module.exports = { judge, runEscapers, closeBrace, sitemapHandles, HOSTILE };
