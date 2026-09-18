'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REDERIVE: which HTTP codes does the one door actually retry?
//
//  Two paths to the same answer, sharing no code:
//
//    static      read lib/storefront-fetch.js as TEXT and parse the RETRY_CODES
//                literal out of it. What the source SAYS.
//    behavioural probe raw() against a local server that answers a given code
//                once and then 200, and count how many requests arrived. What
//                the code DOES.
//
//  They must agree exactly. A disagreement is the interesting case and each
//  direction means something different:
//
//    in static, not behavioural   the set was widened and the loop cannot act on
//                                 it. This is what a broken retry looks like
//                                 while reading perfectly correct.
//    in behavioural, not static   something retries outside RETRY_CODES, so the
//                                 set is no longer the policy and a reader of
//                                 the source is being misled.
//
//  WHY THIS EXISTS RATHER THAN A LIVE CHECK. The change it guards is tooling: it
//  alters nothing the API serves, so there is no durable assertion to make
//  against production. The first version of its deploy gate pinned the commit
//  sha from /api/health, which was true for about ten minutes and then three
//  other pull requests merged. A gate that can never pass again is worse than no
//  gate, because the next person reads the red as a regression.
//
//  Run: node scripts/rederive-retry-policy.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const sf = require('../lib/storefront-fetch');

const SRC = path.join(__dirname, '..', 'lib', 'storefront-fetch.js');

//  ── STATIC ──────────────────────────────────────────────────────────────────
//  Deliberately a text parse and not a require(). Importing would ask the module
//  what it thinks, which is the same path the behavioural probe already takes.
function staticSet() {
  const text = fs.readFileSync(SRC, 'utf8');
  const m = text.match(/const\s+RETRY_CODES\s*=\s*new\s+Set\(\s*\[([^\]]*)\]\s*\)/);
  if (!m) throw new Error('RETRY_CODES is not a shape this can read. If it moved, this check must move with it.');
  const codes = m[1].split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  if (!codes.length) throw new Error('RETRY_CODES parsed as empty, which no version of this module has ever meant');
  return new Set(codes);
}

//  ── BEHAVIOURAL ─────────────────────────────────────────────────────────────
//  The server runs in its own PROCESS. Every caller of storefront-fetch is
//  synchronous, so the Atomics.wait between retry attempts blocks the event loop
//  and an in-process listen() never fires.
const PROBE = ['404', '429', '500', '502', '503', '504'];

function behaviouralSet() {
  const srcPath = path.join(os.tmpdir(), 'rederive-retry-srv-' + process.pid + '.js');
  fs.writeFileSync(srcPath, [
    "const http = require('http');",
    "const seen = Object.create(null);",
    "http.createServer((req, res) => {",
    "  const u = req.url.split('?')[0];",
    "  if (u.startsWith('/__count/')) {",
    "    res.writeHead(200, {'content-type':'text/plain'});",
    "    return res.end(String(seen['/code-' + u.slice(9)] || 0));",
    "  }",
    "  seen[u] = (seen[u] || 0) + 1;",
    "  const m = u.match(/^\\/code-(\\d+)$/);",
    "  if (m && seen[u] === 1) { res.writeHead(Number(m[1])); return res.end('shed'); }",
    "  res.writeHead(200, {'content-type':'text/html'});",
    "  res.end('<html><body>ok</body></html>');",
    "}).listen(Number(process.argv[2]), '127.0.0.1');",
  ].join('\n'));

  const port = 41000 + (process.pid % 2000);
  const child = cp.spawn(process.execPath, [srcPath, String(port)], { stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;

  const ping = () => {
    try {
      return cp.execFileSync('curl', ['-s', '-o', os.devNull, '-w', '%{http_code}',
        '--max-time', '2', base + '/warm'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (e) { return ''; }
  };
  let up = false;
  for (let i = 0; i < 60 && !up; i += 1) {
    if (ping() === '200') up = true;
    else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  if (!up) { try { child.kill(); } catch (e) {} throw new Error('the probe server never came up'); }

  const retried = new Set();
  try {
    for (const code of PROBE) {
      //  retryAttempts 2 is enough to tell "retried" from "not retried" and
      //  keeps the run short: the wait grows with each further attempt.
      sf.raw(base + '/code-' + code, { retryAttempts: 2 });
      const n = Number((sf.raw(base + '/__count/' + code, { retryAttempts: 1 }).body || '').trim());
      if (n > 1) retried.add(code);
    }
  } finally {
    try { child.kill(); } catch (e) {}
    try { fs.unlinkSync(srcPath); } catch (e) {}
  }
  return retried;
}

function main() {
  const a = staticSet();
  const b = behaviouralSet();
  const sorted = (s) => [...s].sort().join(', ') || '(none)';

  console.log('retry policy, derived two ways');
  console.log('  static, parsed from the source :', sorted(a));
  console.log('  behavioural, probed over curl  :', sorted(b));
  console.log('  probed codes                   :', PROBE.join(', '));

  const onlyStatic = [...a].filter((x) => !b.has(x));
  const onlyBehav = [...b].filter((x) => !a.has(x));

  if (onlyStatic.length) {
    console.error('\nIN THE SOURCE BUT NOT IN THE BEHAVIOUR: ' + onlyStatic.join(', '));
    console.error('The set was widened and the retry loop cannot act on it.');
  }
  if (onlyBehav.length) {
    console.error('\nIN THE BEHAVIOUR BUT NOT IN THE SOURCE: ' + onlyBehav.join(', '));
    console.error('Something retries outside RETRY_CODES, so the set is no longer the policy.');
  }
  if (onlyStatic.length || onlyBehav.length) {
    console.error('\nthe two derivations DISAGREE');
    process.exit(1);
  }
  console.log('\nthe two derivations agree on ' + a.size + ' code(s)');
}

if (require.main === module) main();
module.exports = { staticSet, behaviouralSet, PROBE };
