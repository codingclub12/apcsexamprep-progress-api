'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Shopify page bodies in shopify/*.html.
//
//  These files are pasted into Shopify page bodies, so nothing about them is
//  exercised by any other suite, and a broken one is only discovered by a
//  teacher clicking a dead button. Two real defects shipped this way:
//
//   1. A STRAY BRACE. cyber-dashboard.html carried an extra "}," that made the
//      whole TCDash object fail to parse, so every button on the page was dead.
//   2. A DELETED METHOD. An edit removed toggleExportMenu, pickExport and
//      setStudentRef while leaving their onclick attributes in the markup, so
//      the export dropdown did nothing when clicked. Silent: an onclick calling
//      a missing method throws into the console and looks like "not clicking".
//
//  So this checks two things per file:
//    - every <script> block parses
//    - every inline handler resolves to something the script actually defines
//
//  No network, no database. Run: npm run smoke:pages
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const dir = path.join(__dirname, '..', 'shopify');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort();

console.log('\nSHOPIFY PAGE BODIES\n');
ok('found page bodies to check', files.length > 0, files.length);

for (const file of files) {
  console.log('\n' + file);
  const html = fs.readFileSync(path.join(dir, file), 'utf8');

  // ── 1. Every script block parses ──────────────────────────────────────────
  const scripts = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    // Skip external and JSON blocks: only inline JavaScript is ours to parse.
    const tag = m[0].slice(0, m[0].indexOf('>'));
    if (/\ssrc=/.test(tag)) continue;
    if (/type=["'](?!text\/javascript|application\/javascript)/.test(tag)) continue;
    scripts.push(m[1]);
  }

  let parsed = true, parseErr = '';
  for (const js of scripts) {
    try { new vm.Script(js); } catch (e) { parsed = false; parseErr = e.message; break; }
  }
  ok('  every inline script parses', parsed, parseErr || undefined);
  if (!parsed) continue;

  const allJs = scripts.join('\n');

  // ── 2. Every inline handler resolves to a defined method ──────────────────
  //  onclick="Obj.method(...)" is only as good as Obj.method existing. A
  //  reference with no definition is a button that silently does nothing.
  const handlerRe = /\bon(?:click|change|input|submit|keyup)\s*=\s*(["'])([\s\S]*?)\1/g;
  const refs = new Set();
  let h;
  while ((h = handlerRe.exec(html)) !== null) {
    const body = h[2];
    let c;
    const callRe = /\b([A-Z][A-Za-z0-9_]*)\.([A-Za-z_]\w*)\s*\(/g;
    while ((c = callRe.exec(body)) !== null) refs.add(`${c[1]}.${c[2]}`);
  }

  const missing = [];
  for (const ref of refs) {
    const method = ref.split('.')[1];
    // A method of an object literal, however it is written.
    const defined =
      new RegExp(`(^|[\\s,{])(async\\s+)?${method}\\s*\\(`, 'm').test(allJs) ||
      new RegExp(`(^|[\\s,{])${method}\\s*:\\s*(async\\s*)?(function|\\()`, 'm').test(allJs);
    if (!defined) missing.push(ref);
  }
  ok(`  all ${refs.size} inline handlers resolve to a defined method`,
    missing.length === 0, missing);
}

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
