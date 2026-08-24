'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: /pages/join must reach the API by a name schools do not block.
//
//  WHY THIS SUITE EXISTS
//  On 2026-08-24 a class of 27 could not join. Every student typed the class
//  code, pressed Continue, and read "Could not reach server. Try again." The
//  server was fine the whole time: GET /api/class/JAVA-XCZH/exists answered 200
//  with the right CORS headers on both hostnames, and the class row was active.
//
//  The page was calling apcsexamprep-progress-api-production.up.railway.app,
//  the hostname the app happens to be deployed on. School content filters
//  routinely block *.up.railway.app as an uncategorised cloud host while
//  apcsexamprep.com and its subdomains are allowed, so the page itself loaded
//  and only the fetch died. Nothing about that is visible from outside the
//  school network, which is why it survived: it reproduces for the students and
//  for nobody else.
//
//  Every other student-facing page in this repo already used the API's own name.
//  The join page was the last one that did not, and it is the one page a student
//  must get through before any other page can matter.
//
//  WHAT IS LOCKED HERE
//  Not "the string says progress.apcsexamprep.com" - that is one edit away from
//  being true again while the behaviour is wrong. The real apiFetch is lifted
//  out of the shipped file and run against a stubbed fetch, so what is asserted
//  is the order it dials, when it gives up, and when it must NOT retry.
//
//  Zero PII: page markup only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:joinhost
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'shopify/join.html');
const src = fs.readFileSync(FILE, 'utf8');

let pass = 0;
const fail = [];
function ok(cond, label) {
  if (cond) { pass++; return; }
  fail.push(label);
}

// ── LIFT THE REAL CODE OUT OF THE SHIPPED PAGE ───────────────────────────────
//  Sliced from the host list to the start of APJoin, so this suite runs the
//  bytes that ship rather than a copy that can drift away from them.
const start = src.indexOf('const API_HOSTS');
const end = src.indexOf('window.APJoin');
ok(start > -1, 'shopify/join.html declares API_HOSTS');
ok(end > start, 'the helper block sits above window.APJoin');

function freshSandbox(fetchImpl) {
  const ctx = { fetch: fetchImpl, console };
  vm.createContext(ctx);
  vm.runInContext(src.slice(start, end), ctx);
  // Named exports out of the block, so the assertions below can reach them.
  vm.runInContext('this.__hosts = API_HOSTS; this.__fetch = apiFetch; this.__current = () => API;', ctx);
  return ctx;
}

// A response object shaped like the parts of fetch's Response that apiFetch uses.
function res(status, body, { json = true } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (!json) throw new SyntaxError('Unexpected token < in JSON at position 0');
      return body;
    },
  };
}
const NETWORK_DEAD = () => Promise.reject(new TypeError('Failed to fetch'));

// ── 1. THE API IS ADDRESSED BY ITS OWN NAME, AND THAT NAME IS DIALLED FIRST ──
{
  const ctx = freshSandbox(NETWORK_DEAD);
  const hosts = ctx.__hosts;
  ok(hosts[0] === 'https://progress.apcsexamprep.com',
    `the first host tried is the API's own name, got ${hosts[0]}`);
  ok(!/railway\.app/.test(hosts[0]),
    'the deploy hostname is never the host tried first');
  ok(hosts.length >= 2, 'a second, independently routed host exists');
}

// ── 2. A BLOCKED FIRST HOST IS NOT A DEAD END ────────────────────────────────
//  The exact shape of the incident: host one never answers. The student must
//  still get through, because the second host is a different route in.
async function blockedFirstHost() {
  const tried = [];
  const ctx = freshSandbox((url) => {
    tried.push(url);
    if (url.startsWith('https://progress.apcsexamprep.com')) return NETWORK_DEAD();
    return Promise.resolve(res(200, { exists: true, class_name: 'SDGD - 7th Hour' }));
  });
  await run2(ctx, tried);
}

async function run2(ctx, tried) {
  const out = await ctx.__fetch('/api/class/JAVA-XCZH/exists');
  ok(out.ok === true, 'the fallback host produces a usable answer');
  ok(out.data.exists === true, 'the answer is the body the second host returned');
  ok(tried.length === 2, `both hosts were tried, got ${tried.length}`);
  ok(tried[0].startsWith('https://progress.apcsexamprep.com'), 'the API name was tried first');

  // The second call must not pay the dead host again. A student clicks through
  // four of these to finish joining, and a stalled connection each time reads
  // as a broken page even when it eventually works.
  const before = tried.length;
  await ctx.__fetch('/api/student/join', { method: 'POST' });
  ok(tried.length === before + 1, 'once a host answers, later calls start there');
  ok(ctx.__current().includes('railway.app'), 'the working host is remembered');
}

// ── 3. AN HTTP ERROR IS AN ANSWER, NOT A REASON TO REDIAL ────────────────────
async function rest() {
  {
    const tried = [];
    const ctx = freshSandbox((url) => {
      tried.push(url);
      return Promise.resolve(res(404, { error: 'Class not found or inactive. Check your class code.' }));
    });
    const out = await ctx.__fetch('/api/class/NOPE-0000/exists');
    ok(tried.length === 1, `a 404 is never retried against the other host, got ${tried.length} calls`);
    ok(out.ok === false && out.status === 404, 'the HTTP status is passed back to the caller');
    ok(/Class not found/.test(out.data.error), 'the server error text survives to the page');
  }

  // ── 4. A CAPTIVE PORTAL IS NOT A CONNECTION FAILURE ────────────────────────
  //  School WiFi answering with an HTML sign-in page used to raise inside
  //  r.json(), and every caller reported it as "could not reach server". It is
  //  an answer, so it must come back as one.
  {
    const ctx = freshSandbox(() => Promise.resolve(res(200, null, { json: false })));
    let threw = null;
    let out = null;
    try { out = await ctx.__fetch('/api/class/X/exists'); } catch (e) { threw = e; }
    ok(threw === null, 'a non-JSON body does not throw out of apiFetch');
    ok(out && typeof out.data === 'object', 'a non-JSON body yields an empty object');
    ok(out && out.data.exists === undefined, 'and the page reads it as "no such class", not as offline');
  }

  // ── 5. NO HOST AT ALL IS THE ONE CASE THAT REPORTS AS OFFLINE ──────────────
  {
    const tried = [];
    const ctx = freshSandbox((url) => { tried.push(url); return NETWORK_DEAD(); });
    let threw = null;
    try { await ctx.__fetch('/api/class/X/exists'); } catch (e) { threw = e; }
    ok(threw !== null, 'apiFetch throws only when nothing answered');
    ok(tried.length === ctx.__hosts.length, 'every host was tried before giving up');
  }

  // ── 6. EVERY CALL SITE GOES THROUGH THE ONE DOOR ───────────────────────────
  //  The lock that matters most. A new fetch() written against a hardcoded host
  //  reintroduces the incident on whichever flow it was added to, and it would
  //  pass all five assertions above.
  {
    const body = src.slice(end);
    const rawFetches = body.match(/[^.\w]fetch\s*\(/g) || [];
    ok(rawFetches.length === 0,
      `no call site calls fetch() directly, found ${rawFetches.length}`);

    const hardcoded = body.match(/https:\/\/(progress\.apcsexamprep\.com|[\w-]+\.up\.railway\.app)/g) || [];
    ok(hardcoded.length === 0,
      `no API host is hardcoded below the helper, found ${hardcoded.join(', ')}`);

    // The five flows a student can be stopped by. They still exist, and with
    // no raw fetch and no hardcoded host left in the body, each one reaching
    // the network can only be doing it through apiFetch.
    ['/api/class/', '/api/student/join', '/api/student/solo-init',
      '/api/student/login', '/api/student/enroll'].forEach((p) => {
      ok(body.includes(`'${p}`), `the ${p} flow is still wired up`);
    });
    ok((body.match(/apiFetch\(/g) || []).length === 5,
      'all five flows call the helper, and nothing else does');
  }

  // ── 7. THE STUDENT IS TOLD SOMETHING THEY CAN ACT ON ───────────────────────
  //  "Try again" was the whole message for a failure that would never resolve
  //  by trying again. The replacement has to name the network.
  {
    ok(/OFFLINE_MSG/.test(src), 'there is one shared offline message');
    const m = src.match(/OFFLINE_MSG: '([^']+)'/);
    ok(m !== null, 'the offline message is a plain literal');
    if (m) {
      ok(/school/i.test(m[1]), 'it names the school network as the likely cause');
      ok(/teacher/i.test(m[1]), 'it tells the student who to show it to');
    }
    ok(!/Could not reach server\. Try again\./.test(src),
      'the old dead-end message is gone from every catch');
  }

}

// ── DONE ─────────────────────────────────────────────────────────────────────
blockedFirstHost()
  .then(rest)
  .then(() => {
    console.log(`  join-api-host: ${pass} passed, ${fail.length} failed`);
    if (fail.length) {
      fail.forEach((f) => console.log(`    FAIL  ${f}`));
      process.exit(1);
    }
  })
  .catch((e) => { console.error('join-api-host threw:', e); process.exit(1); });
