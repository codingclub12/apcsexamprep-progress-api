'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: PostHog wiring.
//
//  The thing worth asserting is not that events reach PostHog (that needs a live
//  project and a network). It is that the integration is INERT when unconfigured
//  and CANNOT THROW when it is, because both failure modes land on a student
//  mid-submission. Also asserted: the browser template never ships with its
//  placeholders intact, and password masking survives edits to the config.
//
//  Run: npm run smoke:posthog
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };

// Load with a guaranteed-clean env so the "off" assertions mean something even
// on a machine that has a real key in its shell.
delete process.env.POSTHOG_API_KEY;
delete process.env.POSTHOG_HOST;
delete process.env.POSTHOG_ASSETS_HOST;
delete require.cache[require.resolve('../lib/posthog')];
const posthog = require('../lib/posthog');

console.log('off by default');
ok('reports disabled with no key', posthog.isEnabled() === false);
ok('capture() is a silent no-op', (function () {
  try { posthog.capture('smoke_event', 'student-1', { a: 1 }); return true; } catch (e) { return false; }
})());
ok('browser snippet is an inert stub', (function () {
  const s = posthog.browserSnippet();
  return s.indexOf('posthog.init') === -1 && s.indexOf('phCapture') !== -1;
})());
ok('  and carries no placeholder', posthog.browserSnippet().indexOf('__POSTHOG_KEY__') === -1);

console.log('never throws into a request');
ok('capture() survives a circular payload', (function () {
  const circular = { name: 'loop' };
  circular.self = circular;
  try { posthog.capture('smoke_event', 'student-1', circular); return true; } catch (e) { return false; }
})());
ok('capture() survives a null distinctId', (function () {
  try { posthog.capture('smoke_event', null, {}); return true; } catch (e) { return false; }
})());
ok('middleware calls next() when disabled', (function () {
  let called = false;
  posthog.middleware({ path: '/api/progress/attempt', method: 'POST' }, {}, () => { called = true; });
  return called;
})());

console.log('path normalization keeps cardinality bounded');
ok('uuid segments collapse', posthog._normalizePath('/api/admin/student/3f2504e0-4f89-41d3-9a0c-0305e82c3301') === '/api/admin/student/:id',
  posthog._normalizePath('/api/admin/student/3f2504e0-4f89-41d3-9a0c-0305e82c3301'));
ok('class codes collapse', posthog._normalizePath('/api/class/CSA-4821/exists') === '/api/class/:code/exists',
  posthog._normalizePath('/api/class/CSA-4821/exists'));
ok('solo codes collapse', posthog._normalizePath('/api/class/ME-7781/exists') === '/api/class/:code/exists');
ok('numeric ids collapse', posthog._normalizePath('/api/teacher/class/42') === '/api/teacher/class/:n');
ok('lesson and item ids collapse', posthog._normalizePath('/api/progress/1.2-quiz') === '/api/progress/:item',
  posthog._normalizePath('/api/progress/1.2-quiz'));
ok('stable route words are kept', posthog._normalizePath('/api/progress/attempt') === '/api/progress/attempt');

console.log('configured mode');
process.env.POSTHOG_API_KEY = 'phc_smoketestkey0000000000000';
delete require.cache[require.resolve('../lib/posthog')];
const on = require('../lib/posthog');
ok('reports enabled with a key', on.isEnabled() === true);
const snippet = on.browserSnippet();
ok('browser snippet substitutes the key', snippet.indexOf('phc_smoketestkey0000000000000') !== -1);
ok('  leaves no placeholders behind', !/__POSTHOG_(KEY|API_HOST|ASSETS_HOST)__/.test(snippet), snippet.match(/__POSTHOG_\w+__/g));
ok('  defaults to the US ingestion host', snippet.indexOf('https://us.i.posthog.com') !== -1);
ok('  and the US assets host', snippet.indexOf('https://us-assets.i.posthog.com') !== -1);
ok('EU host derives the EU assets host', (function () {
  process.env.POSTHOG_HOST = 'https://eu.i.posthog.com';
  delete require.cache[require.resolve('../lib/posthog')];
  return require('../lib/posthog')._assetsHost() === 'https://eu-assets.i.posthog.com';
})());

console.log('circuit breaker stops a dead endpoint from spamming the log');
// posthog-node console.errors a stack trace plus a dumped Response on every
// failed flush, through a logger it does not let you replace. The breaker is the
// only thing standing between a PostHog outage and an unreadable Railway log.
(async function () {
  const realFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('network down'); };
  try {
    const bf = on._makeBreakerFetch();
    let firstThrew = false;
    try { await bf('https://us.i.posthog.com/batch/', {}); } catch (e) { firstThrew = true; }
    ok('first failure propagates', firstThrew && calls === 1, { calls });

    const second = await bf('https://us.i.posthog.com/batch/', {});
    ok('second failure trips the breaker and reports 200', second.status === 200, second.status);
    ok('  the SDK sees a body it can parse', (await second.json()).status === 'circuit-open');

    const callsAtTrip = calls;
    await bf('https://us.i.posthog.com/batch/', {});
    await bf('https://us.i.posthog.com/batch/', {});
    ok('open circuit makes no further network calls', calls === callsAtTrip, { calls, callsAtTrip });

    // A healthy endpoint must reset the counter, or one blip early in a long
    // uptime would eventually trip the breaker on an unrelated later blip.
    global.fetch = async () => ({ status: 200, text: async () => '{}', json: async () => ({}) });
    const fresh = on._makeBreakerFetch();
    await fresh('u', {});
    global.fetch = async () => { throw new Error('blip'); };
    let threwAfterSuccess = false;
    try { await fresh('u', {}); } catch (e) { threwAfterSuccess = true; }
    ok('a success resets the failure count', threwAfterSuccess);
  } finally {
    global.fetch = realFetch;
  }

    console.log('request events carry the mounted path, not the router-relative one');
  // Express rewrites req.path to be relative to a router's mount point, and the
  // middleware records on 'finish', which is after that rewrite. Reading req.path
  // there logs '/attempt' for /api/progress/attempt and merges same-named routes
  // from different routers into one series. This asserts originalUrl is used.
  await (async function () {
    const express = require('express');
    const zlib = require('zlib');
    const realFetch = global.fetch;
    const events = [];
    global.fetch = async (url, opts) => {
      if (String(url).indexOf('posthog.com') === -1) return realFetch(url, opts);
      try {
        const raw = typeof opts.body === 'string'
          ? opts.body
          : zlib.gunzipSync(Buffer.from(await opts.body.arrayBuffer())).toString('utf8');
        (JSON.parse(raw).batch || []).forEach((e) => events.push(e));
      } catch (e) { /* not a batch we can read */ }
      return { status: 200, text: async () => '{}', json: async () => ({}) };
    };
    try {
      const app = express();
      app.use(on.middleware);
      const sub = express.Router();
      sub.get('/attempt', (req, res) => res.json({ ok: true }));
      app.use('/api/progress', sub);
      const srv = app.listen(0);
      const port = srv.address().port;
      await realFetch(`http://127.0.0.1:${port}/api/progress/attempt?debug=1`);
      await on.shutdown();
      srv.close();

      const ev = events.find((e) => e.event === 'api_request');
      ok('an api_request event is emitted', !!ev, events.map((e) => e.event));
      ok('  path is the full mounted path', ev && ev.properties.path === '/api/progress/attempt', ev && ev.properties.path);
      ok('  the query string is stripped', ev && ev.properties.raw_path.indexOf('?') === -1, ev && ev.properties.raw_path);
      ok('  status and duration are real', ev && ev.properties.status === 200 && typeof ev.properties.duration_ms === 'number', ev && ev.properties);
      ok('  an unauthenticated caller is labelled anonymous', ev && ev.properties.role === 'anonymous', ev && ev.properties.role);
      ok('  and gets a pseudonymous distinct id', ev && /^anon_[0-9a-f]{12}$/.test(ev.distinct_id), ev && ev.distinct_id);
    } finally {
      global.fetch = realFetch;
    }
  })();

  console.log('credential fields stay masked in replay');
const tpl = fs.readFileSync(path.join(__dirname, '..', 'public', 'posthog-init.js'), 'utf8');
ok('password inputs are masked', /maskInputOptions:\s*\{\s*password:\s*true\s*\}/.test(tpl));
// The admin key box and every teacher password box must be type=password, which
// is what the masking above keys off. A future page that uses type=text for a
// credential would silently start recording it.
const pages = fs.readdirSync(path.join(__dirname, '..', 'public')).filter((f) => f.endsWith('.html'));
const credPages = ['login.html', 'teacher-reset.html', 'teacher-change-password.html'];
credPages.forEach((f) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
  const inputs = html.match(/<input[^>]*>/g) || [];
  const cred = inputs.filter((i) => /id="(key|pw|pw2|cur)"/.test(i));
  ok(`${f}: every credential input is type=password`, cred.length > 0 && cred.every((i) => /type="password"/.test(i)), cred);
});

console.log('every page loads the init script');
pages.forEach((f) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
  ok(`${f} carries the tag`, html.indexOf('src="/posthog-init.js"') !== -1);
});

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
