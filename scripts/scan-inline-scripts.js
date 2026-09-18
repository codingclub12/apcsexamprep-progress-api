#!/usr/bin/env node
'use strict';
// ---------------------------------------------------------------------------
//  Find a DEAD inline script on a live page.
//
//    node scripts/scan-inline-scripts.js <handle> [<handle> ...]
//    node scripts/scan-inline-scripts.js --from-sitemap --limit 40
//    node scripts/scan-inline-scripts.js --from-sitemap --shard 3 --shards 7
//
//  WHY THIS EXISTS. Board 175. On 2026-09-03 two live pages were serving
//  JavaScript that could not run, and NOTHING in this repo could see it. A page
//  with a dead script still answers 200, still carries every string a link check
//  or a content check looks for, and still renders all of its markup. Only the
//  INTERACTION is gone, and no check here was looking at interaction.
//
//  CSA 1.9 is the case worth understanding, because it defeats the obvious
//  instrument. Two stray newlines had been injected into the page body:
//
//    re          the keyword `return` split in half. A hard SyntaxError, so the
//    turn $$;    browser skips the WHOLE block and no editor is ever created.
//
//    opt.getAtt  an identifier split in half. This one PARSES, because ASI
//    ribute(...) inserts a semicolon after `opt.getAtt`, and then throws
//                ReferenceError: ribute is not defined at RUNTIME.
//
//  So a syntax check alone is green on the second one, which is the worse of the
//  two: the click handler set data-answered before it threw, so a student got no
//  feedback and the question stayed locked on their first pick forever.
//
//  THEREFORE TWO RULES, NOT ONE:
//    rule 1  every executable inline script must COMPILE
//    rule 2  no member access may be split across a newline, which is the
//            signature of rule 1's blind spot
//
//  ld+json IS NOT JAVASCRIPT AND MUST BE SKIPPED. A structured-data block is
//  JSON, and compiling it as a script fails on its first colon. A scanner that
//  does not filter by type reports five errors per page on a healthy site, which
//  is how a check gets switched off in a day. Measured on CSA 1.9 and 1.8: five
//  ld+json blocks each, all five "failing", all five fine.
//
//  COMPILE, NEVER RUN. vm.Script compiles and does not execute, so a hostile or
//  broken body cannot do anything here.
//
//  No em-dashes, per repo convention.
// ---------------------------------------------------------------------------
const vm = require('vm');

// ── the pure half, exported so the smoke suite can pin it offline ──────────

// A type attribute that means "the browser will execute this as a classic
// script". Absent counts. Anything else (ld+json, application/json, a
// templating type such as text/x-template) is data, not code.
const EXECUTABLE_TYPES = new Set([
  'text/javascript', 'application/javascript', 'application/ecmascript',
  'text/ecmascript', 'text/jscript', 'module',
]);

function attrValue(attrs, name) {
  const m = new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s"\'>]+))', 'i').exec(attrs);
  if (!m) return null;
  return (m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] || '').trim();
}

/** Every <script> in the html, with its raw attribute string and body. */
function extractScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    out.push({ attrs: m[1] || '', source: m[2], index: m.index });
  }
  return out;
}

/**
 * Should this block be compiled? Inline only, executable type only.
 * An external script has its own URL and is not this page's body to fix.
 */
function isExecutableInline(script) {
  if (attrValue(script.attrs, 'src')) return false;
  const type = attrValue(script.attrs, 'type');
  if (type === null || type === '') return true;
  return EXECUTABLE_TYPES.has(type.toLowerCase());
}

/**
 * rule 1. Returns null when it compiles, or the error message when it does not.
 *
 * `goal` is 'script' or 'module'. A MODULE is not compiled at all, and that is
 * a deliberate gap rather than an oversight: vm.Script compiles in script goal,
 * where top-level await and import/export are syntax errors even though they
 * are perfectly legal in a module. Compiling module goal needs
 * vm.SourceTextModule behind --experimental-vm-modules, which is not something
 * to hang a nightly check on.
 *
 * This was found by running the scanner over the site rather than by reasoning
 * about it: /pages/ap-csa-topics was reported broken for a top-level await
 * inside Shopify's own injected shop-follow-button loader, which is correct
 * code. A checker that cries wolf is the failure this whole instrument exists
 * to avoid, so the module gets the ASI rule and not the compile rule.
 */
function syntaxError(source, goal) {
  if (!source.trim()) return null;
  if (goal === 'module') return null;
  try {
    // eslint-disable-next-line no-new
    new vm.Script(source);
    return null;
  } catch (e) {
    return e && e.message ? e.message : String(e);
  }
}

/** 'module' when the tag says so, otherwise 'script'. */
function goalOf(script) {
  const type = attrValue(script.attrs, 'type');
  return type && type.trim().toLowerCase() === 'module' ? 'module' : 'script';
}

// rule 2. `obj.getAtt` ending a line, a bare identifier opening the next, and a
// call straight after it. That is the shape ASI turns into two statements: the
// member access is evaluated and thrown away, then the fragment is called as a
// free identifier and throws ReferenceError.
//
// A line that STARTS with a dot is ordinary method chaining and is not this.
const ASI_SPLIT = /(^|[^\w$.])([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)[ \t]*\r?\n[ \t]*([A-Za-z_$][\w$]*)[ \t]*\(/gm;

// Words that legitimately open a statement. `foo.bar` then `if (x)` on the next
// line is correct code, not a split identifier.
const STATEMENT_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'do', 'try', 'catch', 'return', 'throw',
  'typeof', 'delete', 'void', 'new', 'function', 'var', 'let', 'const',
  'else', 'case', 'break', 'continue', 'await', 'yield', 'super', 'import',
]);

function asiSplits(source) {
  const out = [];
  ASI_SPLIT.lastIndex = 0;
  let m;
  while ((m = ASI_SPLIT.exec(source))) {
    const [, , obj, head, tail] = m;
    if (STATEMENT_KEYWORDS.has(tail)) continue;
    out.push({
      object: obj,
      head,
      tail,
      joined: head + tail,
      line: source.slice(0, m.index).split('\n').length,
      snippet: m[0].replace(/\s+/g, ' ').trim().slice(0, 80),
    });
  }
  return out;
}

/** Both rules over one stored page body. */
function scanBody(html) {
  const scripts = extractScripts(html);
  const findings = [];
  let checked = 0;

  for (const s of scripts) {
    if (!isExecutableInline(s)) continue;
    checked++;
    const err = syntaxError(s.source, goalOf(s));
    if (err) {
      findings.push({ rule: 'syntax', bytes: s.source.length, detail: err });
    }
    for (const hit of asiSplits(s.source)) {
      findings.push({
        rule: 'asi-split',
        bytes: s.source.length,
        detail: `${hit.object}.${hit.head} / ${hit.tail}(  joins to "${hit.joined}"  line ${hit.line}`,
        snippet: hit.snippet,
      });
    }
  }
  return { total: scripts.length, checked, findings };
}

module.exports = {
  extractScripts, isExecutableInline, syntaxError, asiSplits, scanBody, attrValue, goalOf,
};

// ── the network half ───────────────────────────────────────────────────────
if (require.main === module) main();

function opt(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const sf = require('../lib/storefront-fetch');
  const args = process.argv.slice(2);
  const fromSitemap = args.includes('--from-sitemap');
  let handles = args.filter((a) => !a.startsWith('--'));
  // drop values that belong to flags
  for (const flag of ['limit', 'shard', 'shards']) {
    const v = opt(flag, null);
    if (v) handles = handles.filter((h) => h !== v);
  }

  if (fromSitemap) {
    const shards = Math.max(1, Number(opt('shards', '1')));
    const shard = Number(opt('shard', '0'));
    const limit = Number(opt('limit', '0')) || Infinity;
    handles = (await sitemapPageHandles(sf))
      .filter((h, i) => shards === 1 || hashShard(h, shards) === shard)
      .slice(0, limit);
    console.log(`sitemap: ${handles.length} page handle(s)` +
      (shards > 1 ? `  (shard ${shard} of ${shards})` : ''));
  }

  if (!handles.length) {
    console.error('nothing to scan. Give handles, or --from-sitemap.');
    process.exit(2);
  }

  console.log(`\nINLINE SCRIPT SCAN: ${handles.length} page(s)\n`);

  let scanned = 0, unreachable = 0;
  const broken = [];

  for (const handle of handles) {
    let page;
    try {
      page = sf.pageBody(handle);
    } catch (e) {
      unreachable++;
      console.log(`  UNREACHABLE  ${handle}  ${e.message}`);
      continue;
    }
    scanned++;
    const r = scanBody(page.body_html);
    if (r.findings.length) {
      broken.push({ handle, ...r });
      console.log(`  BROKEN  ${handle}  (${r.checked} executable of ${r.total} scripts)`);
      for (const f of r.findings) console.log(`      [${f.rule}] ${f.detail}`);
    }
  }

  console.log(`\nscanned ${scanned} page(s), ${unreachable} unreachable`);
  console.log(`pages with a dead or hazardous inline script: ${broken.length}`);

  // An unreachable page measured nothing. Saying "0 broken" after failing to
  // read half the site is the shape of a green tick that means nothing.
  if (unreachable && !scanned) {
    console.error('\nNOTHING WAS READ. Not a pass: every page failed to fetch.');
    process.exit(2);
  }

  if (broken.length) {
    console.log('\nA page here answers 200 and looks right. Its JavaScript does not run,');
    console.log('so the interaction a student needs is simply missing. Repair the page');
    console.log('body through a Matrixify sheet, never by hand.');
    process.exit(1);
  }

  console.log('\nEvery executable inline script compiles, and none splits a member');
  console.log('access across a newline.');
}

async function sitemapPageHandles(sf) {
  const index = sf.raw('/sitemap.xml');
  if (index.code !== '200') throw new Error(`sitemap.xml answered ${index.code}`);
  const children = [...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const pageMaps = children.filter((u) => /sitemap_pages/.test(u));
  const handles = new Set();
  for (const url of pageMaps) {
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const r = sf.raw(path);
    if (r.code !== '200') continue;
    for (const m of r.body.matchAll(/<loc>[^<]*\/pages\/([^<?]+)<\/loc>/g)) {
      handles.add(m[1].replace(/\/$/, ''));
    }
  }
  return [...handles].sort();
}

function hashShard(s, shards) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % shards;
}
