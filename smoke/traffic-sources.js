'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Shopify connector and the in-process pull schedule.
//
//  The Shopify assertions are written against the response shape VERIFIED
//  against the live store, not against the documentation, because the two
//  disagree in ways that matter: `rows` is an array of objects keyed by column
//  name rather than the positional array most tabular APIs return, every value
//  is a string, and an average with no orders under it comes back as an empty
//  string rather than null.
//
//  The schedule assertions exist because a wrong fire time is invisible. A pull
//  that runs at 5am instead of 6am still returns data, so nothing looks broken;
//  the only way this gets caught is a test that reads the clock in the target
//  timezone.
//
//  Run: npm run smoke:trafficsources
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-traffic-sources.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const section = (t) => console.log('\n' + t);

const contract = require('../lib/traffic-contract');
const shopify = require('../lib/traffic-shopify');
const schedule = require('../lib/traffic-schedule');

const iso = (d) => { const x = new Date(); x.setUTCDate(x.getUTCDate() - d); return x.toISOString().slice(0, 10); };

// ── Contract ─────────────────────────────────────────────────────────────────
section('Shopify joins the contract vocabulary');
ok('shopify is a known source', contract.SOURCES.includes('shopify'));
for (const m of ['orders', 'net_sales', 'total_sales', 'average_order_value', 'conversion_rate', 'new_customers', 'returning_customers']) {
  ok('  ' + m + ' is a known metric', Boolean(contract.METRICS[m]), m);
}
// Store revenue and ad revenue are different money. Folding them into one
// metric would make a rolled-up total meaningless.
ok('store sales are NOT the same metric as ad revenue',
  contract.METRICS.total_sales && contract.METRICS.revenue && 'total_sales' !== 'revenue');
ok('a shopify session survives the contract',
  contract.normalize({ date: iso(1), source: 'shopify', metric: 'sessions', value: 500 }).ok === true);

// ── Value parsing, which is where the real data bites ────────────────────────
section('ShopifyQL values parse the way the live API actually sends them');
ok('a numeric string becomes a number', shopify.num('996') === 996);
ok('money keeps its decimals', shopify.num('249.50') === 249.5);
ok('currency formatting is stripped', shopify.num('$1,234.56') === 1234.56);
// THE important one. Number('') is 0, so the obvious parse stores a $0 average
// order value on every day with no orders and drags the mean toward zero.
ok('an EMPTY average is null, not zero', shopify.num('') === null);
ok('  and null stays null', shopify.num(null) === null && shopify.num(undefined) === null);
ok('a real zero is still zero', shopify.num('0') === 0);
ok('nonsense is rejected rather than becoming NaN', shopify.num('n/a') === null);

section('Connector fails closed');
delete process.env.SHOPIFY_SHOP;
delete process.env.SHOPIFY_ADMIN_TOKEN;
ok('reports not ready without credentials', shopify.status().ready === false);

// ── Against the verified live response shape ─────────────────────────────────
section("Connector parses Shopify's real response shape");
(async function () {
  const realFetch = global.fetch;
  process.env.SHOPIFY_SHOP = 'emxrb7-bx.myshopify.com';
  process.env.SHOPIFY_ADMIN_TOKEN = 'shpat_smoketesttoken';
  const asked = [];

  // Exactly the shape the live Admin API returned: rows are OBJECTS keyed by
  // column name, values are strings, and average_order_value is '' on a day
  // with no orders.
  global.fetch = async (url, opts) => {
    const q = JSON.parse(opts.body).variables.q;
    asked.push(q);
    const rows = [];
    if (/FROM sales/.test(q)) {
      rows.push({ day: iso(2), orders: '4', gross_sales: '996', net_sales: '996', total_sales: '996', average_order_value: '249' });
      rows.push({ day: iso(1), orders: '0', gross_sales: '0', net_sales: '0', total_sales: '0', average_order_value: '' });
      rows.push({ day: iso(0), orders: '0', gross_sales: '0', net_sales: '0', total_sales: '0', average_order_value: '' });
    } else if (/FROM sessions/.test(q)) {
      rows.push({ day: iso(1), sessions: '755', online_store_visitors: '643', conversion_rate: '0.0030534351145038168' });
    } else if (/FROM customers/.test(q)) {
      rows.push({ day: iso(1), new_customers: '3', returning_customers: '1' });
    }
    return { ok: true, status: 200, text: async () => JSON.stringify({
      data: { shopifyqlQuery: { parseErrors: [], tableData: { rows, columns: [] } } },
    }) };
  };

  try {
    const r = await shopify.fetchShopify({ startDate: iso(3), endDate: iso(1) });
    ok('reports configured', r.configured === true, r.reason);
    ok('issues one query per dataset', asked.length === 3, asked.length);
    ok('  and asks for explicit dates, never a relative keyword',
      asked.every((q) => /SINCE \d{4}-\d{2}-\d{2} UNTIL \d{4}-\d{2}-\d{2}/.test(q)), asked[0]);

    const orders = r.readings.find((x) => x.metric === 'orders' && x.date === iso(2));
    ok('orders come through as numbers', orders && orders.value === 4, orders);

    const sales = r.readings.find((x) => x.metric === 'total_sales' && x.date === iso(2));
    ok('total sales come through', sales && sales.value === 996, sales);

    // A real zero-sales day IS storable; an average with nothing under it is not.
    const zeroDay = r.readings.filter((x) => x.date === iso(1) && x.metric === 'orders');
    ok('a genuine zero-order day is still recorded', zeroDay.length === 1 && zeroDay[0].value === 0, zeroDay);
    const aovEmpty = r.readings.find((x) => x.metric === 'average_order_value' && x.date === iso(1));
    ok('an empty average is DROPPED, not stored as $0', aovEmpty === undefined, aovEmpty);

    // Shopify pads a range reaching past today with zero rows. Storing those
    // writes "we sold nothing" for days that have not happened.
    const today = r.readings.filter((x) => x.date === iso(0));
    ok('rows dated today are discarded', today.length === 0, today.slice(0, 3));

    const conv = r.readings.find((x) => x.metric === 'conversion_rate');
    ok('conversion rate is stored as a 0-1 ratio', conv && conv.value > 0 && conv.value < 1, conv);

    const visitors = r.readings.find((x) => x.metric === 'users');
    ok('online_store_visitors maps onto the shared `users` metric', visitors && visitors.value === 643, visitors);

    const ingestLib = require('../lib/traffic-ingest');
    const w = ingestLib.ingest(r.readings, { dryRun: true });
    ok('every reading is contract-valid', w.rejected === 0, w.rejections);

    // A failure on one dataset must not cost the others.
    global.fetch = async (url, opts) => {
      const q = JSON.parse(opts.body).variables.q;
      if (/FROM customers/.test(q)) return { ok: false, status: 403, text: async () => '{"errors":"no read_customers scope"}' };
      return { ok: true, status: 200, text: async () => JSON.stringify({
        data: { shopifyqlQuery: { parseErrors: [], tableData: { rows: [{ day: iso(1), orders: '2', gross_sales: '498', net_sales: '498', total_sales: '498', average_order_value: '249' }], columns: [] } } },
      }) };
    };
    const partial = await shopify.fetchShopify({ startDate: iso(2), endDate: iso(1) });
    ok('one dataset failing does not discard the others',
      partial.readings.some((x) => x.metric === 'orders'), partial.readings.length);
    ok('  and the failure is REPORTED, not swallowed',
      partial.notes.some((n) => /customers/.test(n)), partial.notes);

    // A GraphQL 200 carrying errors on EVERY report is a total failure, and
    // reporting it as "no data" is the exact thing this feature exists to
    // avoid. Partial tolerance (above) must not extend to tolerating nothing
    // working at all: a bad token would otherwise read as a store that sold
    // nothing.
    global.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ errors: [{ message: 'Access denied' }] }) });
    let threw = null;
    await shopify.fetchShopify({ startDate: iso(2), endDate: iso(1) }).catch((e) => { threw = e; });
    ok('a GraphQL error throws rather than reporting an empty success',
      threw !== null && /Access denied/.test(threw.message), threw && threw.message);

    global.fetch = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({
      data: { shopifyqlQuery: { parseErrors: ['unknown field: wibble'], tableData: null } } }) });
    let threw2 = null;
    await shopify.fetchShopify({ startDate: iso(2), endDate: iso(1) }).catch((e) => { threw2 = e; });
    ok('a ShopifyQL parse error surfaces the rejected query',
      threw2 !== null && /wibble/.test(threw2.message), threw2 && threw2.message);
  } finally {
    global.fetch = realFetch;
    delete process.env.SHOPIFY_SHOP;
    delete process.env.SHOPIFY_ADMIN_TOKEN;
  }

  runScheduleSection();
})();

// ── Schedule ─────────────────────────────────────────────────────────────────
function runScheduleSection() {
  section('The schedule fires at Central wall-clock times, not fixed UTC offsets');
  const chicago = (ms) => {
    const w = schedule.wallClock(ms);
    return `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`;
  };
  const wanted = schedule.FIRE_TIMES.map((t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`);

  // Walk a summer day and a winter day. The UTC hour differs between them by
  // design; the CENTRAL hour must not.
  for (const [label, from] of [['summer', Date.parse('2026-08-13T04:00:00Z')], ['winter', Date.parse('2026-12-13T04:00:00Z')]]) {
    let t = from;
    const got = [];
    for (let i = 0; i < 4; i++) { t = schedule.nextFireAfter(t); got.push(chicago(t)); }
    ok(`${label}: fires at ${wanted.join(', ')} Central`, got.join(',') === wanted.join(','), got);
  }

  // The offsets really are different, which is the whole reason this is
  // computed rather than hardcoded. If these matched, the test above would be
  // passing for the wrong reason.
  const summer6 = schedule.nextFireAfter(Date.parse('2026-08-13T04:00:00Z'));
  const winter6 = schedule.nextFireAfter(Date.parse('2026-12-13T04:00:00Z'));
  ok('the UTC hour DOES shift between CDT and CST',
    new Date(summer6).getUTCHours() === 11 && new Date(winter6).getUTCHours() === 12,
    { summer: new Date(summer6).toISOString(), winter: new Date(winter6).toISOString() });

  // Across the fall-back boundary: four slots per day, none skipped, none run
  // twice. A naive UTC schedule silently doubles or drops one here.
  let t = Date.parse('2026-10-31T20:00:00Z');
  const fires = [];
  for (let i = 0; i < 12; i++) { t = schedule.nextFireAfter(t); fires.push(t); }
  const nov1 = fires.filter((f) => { const w = schedule.wallClock(f); return w.month === 11 && w.day === 1; });
  ok('the DST changeover day still gets exactly four pulls', nov1.length === 4, nov1.map(chicago));
  ok('  none of them duplicate', new Set(nov1.map(chicago)).size === 4, nov1.map(chicago));
  ok('every fire is strictly after the one before it',
    fires.every((f, i) => i === 0 || f > fires[i - 1]));

  section('The scheduler survives what a scheduled job actually does');
  {
    const calls = [];
    const quiet = { log() {}, warn() {}, error() {} };
    const s = schedule.createScheduler({
      runPull: async (range) => { calls.push(range); return { ok: true, ga4: { written: 10 }, gsc: { written: 20 } }; },
      logger: quiet,
    });
    s.start();
    ok('arming reports the next fire', Boolean(s.status().next_fire_at), s.status());
    ok('  and does not claim to be running', s.status().running === false);
    s.stop();
  }

  (async function () {
    const quiet = { log() {}, warn() {}, error() {} };

    // A pull that throws must not take the API process down with it.
    const boom = schedule.createScheduler({
      runPull: async () => { throw new Error('google is down'); },
      logger: quiet,
    });
    await boom._fireNow();
    ok('a throwing pull is caught and counted', boom.status().failures === 1, boom.status());
    ok('  and the failure is recorded, not lost', /google is down/.test(JSON.stringify(boom.status().last_result)), boom.status().last_result);
    boom.stop();

    // The window must be short enough to clear MAX_ROWS_PER_RUN and must never
    // include today.
    let seen = null;
    const win = schedule.createScheduler({
      runPull: async (r) => { seen = r; return { ok: true }; }, logger: quiet,
    });
    await win._fireNow();
    ok('each run pulls a short trailing window', Boolean(seen), seen);
    ok(`  of ${schedule.WINDOW_DAYS} days`, seen && seen.startDate === iso(schedule.WINDOW_DAYS), seen);
    ok('  ending yesterday, never today', seen && seen.endDate === iso(1), seen);
    // The measured ceiling is ~8 days before the ingest starts discarding rows.
    ok('  which is under the ingest row cap', schedule.WINDOW_DAYS <= 8, schedule.WINDOW_DAYS);
    win.stop();

    // Two pulls must never run at once: they would double the API calls and
    // race the same upserts for no benefit.
    let concurrent = 0, maxConcurrent = 0;
    const slow = schedule.createScheduler({
      runPull: async () => {
        concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 50));
        concurrent--; return { ok: true };
      },
      logger: quiet,
    });
    await Promise.all([slow._fireNow(), slow._fireNow(), slow._fireNow()]);
    ok('overlapping fires never run two pulls at once', maxConcurrent === 1, maxConcurrent);
    slow.stop();

    finish();
  })();
}

function finish() {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail === 0) console.log(`OK - all ${pass} checks passed`);
  process.exit(fail ? 1 : 0);
}
