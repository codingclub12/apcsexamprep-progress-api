'use strict';
// One-time backfill of teacher course entitlements from a Matrixify Orders CSV
// export (Phase 4 slice 2 companion). The live orders/paid webhook only fires on
// NEW paid orders, so teachers who bought a pack before the webhook went live
// never get a grant. This replays those historical orders through the SAME live
// endpoint: it reads the CSV, rebuilds a minimal orders/paid payload per order,
// signs it with SHOPIFY_WEBHOOK_SECRET exactly as Shopify would, and POSTs it.
//
// Why replay the endpoint instead of writing the DB directly:
//   - reuses the deployed grant path (HMAC verify, grant/pending, claim-on-auth),
//   - is idempotent, because the webhook dedupes on (email, course, order id), so
//     re-running grants nothing extra,
//   - needs no direct access to the Railway SQLite file.
//
// The SKU -> course mapping is imported from config/shopify-skus.js, the single
// source of truth the webhook itself uses, so this script and production can
// never disagree about which product grants which course.
//
// Usage:
//   node scripts/backfill-entitlements-from-csv.js <orders.csv>            # dry run (default)
//   node scripts/backfill-entitlements-from-csv.js <orders.csv> --send     # actually POST
//
// Options:
//   --send            Actually sign and POST each order. Without it, prints the
//                     plan and sends nothing (safe default).
//   --url <url>       Webhook URL. Default: production.
//   --include-refunded  Also replay orders that are cancelled or fully refunded
//                     (skipped by default, since a refund should not grant).
//
// Env:
//   SHOPIFY_WEBHOOK_SECRET   Required with --send. Must match the secret the live
//                            webhook verifies against (the one set in Railway).
const fs = require('fs');
const crypto = require('crypto');
const { courseForLineItem } = require('../config/shopify-skus');

const DEFAULT_URL = 'https://progress.apcsexamprep.com/api/shopify/webhook/orders-paid';

// ── args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const positional = argv.filter((a) => !a.startsWith('--'));
const csvPath = positional[0];
const urlIdx = argv.indexOf('--url');
const WEBHOOK_URL = urlIdx !== -1 && argv[urlIdx + 1] ? argv[urlIdx + 1] : DEFAULT_URL;
const SEND = flags.has('--send');
const INCLUDE_REFUNDED = flags.has('--include-refunded');

if (!csvPath) {
  console.error('Usage: node scripts/backfill-entitlements-from-csv.js <orders.csv> [--send] [--url <url>] [--include-refunded]');
  process.exit(2);
}

// ── minimal RFC 4180 CSV parser ─────────────────────────────────────────────
// Handles quoted fields, embedded commas/newlines, and "" escapes. Order exports
// carry addresses, notes, and user-agent strings with all of those, so a naive
// split on commas would corrupt the columns.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else if (c === '\r') {
      // swallow; \n handles the row break (CRLF)
    } else {
      field += c;
    }
  }
  // trailing field / row (file may not end in a newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ── read + index columns ────────────────────────────────────────────────────
const raw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(raw);
if (rows.length < 2) { console.error('CSV has no data rows'); process.exit(1); }
const header = rows[0];
const col = (name) => header.indexOf(name);
const need = ['ID', 'Name', 'Payment: Status', 'Line: Type', 'Line: Product ID'];
for (const n of need) {
  if (col(n) === -1) { console.error(`CSV is missing expected column: "${n}". Is this a Matrixify Orders export?`); process.exit(1); }
}
const cID = col('ID');
const cName = col('Name');
const cEmail = col('Email');
const cCustEmail = col('Customer: Email');
const cPay = col('Payment: Status');
const cCancelled = col('Cancelled At');       // -1 if absent
const cRefund = col('Price: Total Refund');   // -1 if absent
const cLineType = col('Line: Type');
const cSku = col('Line: SKU');
const cVarSku = col('Line: Variant SKU');
const cPid = col('Line: Product ID');
const cTitle = col('Line: Title');

const cell = (r, i) => (i !== -1 && r[i] != null ? String(r[i]).trim() : '');

// ── group rows into orders ──────────────────────────────────────────────────
// Order-level fields repeat on every row of an order; line items are the rows
// where Line: Type === 'Line Item' (Transaction / Fulfillment Line rows carry
// the same SKU and would otherwise double-count).
const orders = new Map(); // order ID -> { id, name, email, pay, cancelled, refund, items:[] }
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const id = cell(r, cID);
  if (!id) continue;
  if (!orders.has(id)) {
    orders.set(id, {
      id,
      name: cell(r, cName),
      email: (cell(r, cEmail) || cell(r, cCustEmail)).toLowerCase(),
      pay: cell(r, cPay).toLowerCase(),
      cancelled: cCancelled !== -1 ? cell(r, cCancelled) : '',
      refund: cRefund !== -1 ? parseFloat(cell(r, cRefund)) || 0 : 0,
      items: [],
    });
  }
  const o = orders.get(id);
  // carry forward order-level fields if they were only on the top row
  if (!o.email) o.email = (cell(r, cEmail) || cell(r, cCustEmail)).toLowerCase();
  if (!o.pay) o.pay = cell(r, cPay).toLowerCase();
  if (cell(r, cLineType) === 'Line Item') {
    const sku = cell(r, cSku) || cell(r, cVarSku);
    const product_id = cell(r, cPid);
    o.items.push({ sku: sku || null, product_id: product_id || null, title: cell(r, cTitle) });
  }
}

// ── build the plan: only paid orders carrying a mapped teacher pack ──────────
const plan = [];       // orders we will send
const skipped = [];    // {order, reason}
for (const o of orders.values()) {
  const teacherItems = o.items.filter((it) => courseForLineItem(it));
  if (teacherItems.length === 0) continue; // no teacher pack in this order at all
  if (o.pay !== 'paid') { skipped.push({ o, reason: `payment status "${o.pay || 'unknown'}" (not paid)` }); continue; }
  if (!INCLUDE_REFUNDED && o.cancelled) { skipped.push({ o, reason: 'order cancelled' }); continue; }
  if (!INCLUDE_REFUNDED && o.refund > 0) { skipped.push({ o, reason: `refunded ($${o.refund})` }); continue; }
  if (!o.email) { skipped.push({ o, reason: 'no email on order (webhook would skip it too)' }); continue; }
  const courses = [...new Set(teacherItems.map((it) => courseForLineItem(it)))];
  plan.push({ o, teacherItems, courses });
}

// ── report ──────────────────────────────────────────────────────────────────
console.log(`Parsed ${orders.size} orders from ${csvPath}`);
console.log(`Mapped teacher-pack orders to backfill: ${plan.length}`);
console.log(`Skipped (had a teacher pack but not grantable): ${skipped.length}`);
console.log('');
for (const p of plan) {
  console.log(`  GRANT  ${p.o.name}  ${p.o.email}  -> ${p.courses.join(', ')}`);
}
if (skipped.length) {
  console.log('');
  for (const s of skipped) {
    console.log(`  SKIP   ${s.o.name}  ${s.o.email || '(no email)'}  -> ${s.reason}`);
  }
}

// ── send (only with --send) ─────────────────────────────────────────────────
function sign(bodyStr, secret) {
  return crypto.createHmac('sha256', secret).update(Buffer.from(bodyStr, 'utf8')).digest('base64');
}

async function send() {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) { console.error('\n--send requires SHOPIFY_WEBHOOK_SECRET in the environment (same secret the live webhook uses).'); process.exit(2); }
  console.log(`\nSending ${plan.length} order(s) to ${WEBHOOK_URL} ...\n`);
  let granted = 0, pending = 0, skippedResp = 0, failed = 0;
  for (const p of plan) {
    // Minimal orders/paid payload: only the fields the webhook reads. Line items
    // are limited to the mapped teacher packs so server logs stay clean.
    const payload = {
      id: Number.isFinite(Number(p.o.id)) ? Number(p.o.id) : p.o.id,
      email: p.o.email,
      line_items: p.teacherItems.map((it) => ({ sku: it.sku, product_id: it.product_id })),
    };
    const body = JSON.stringify(payload);
    const hmac = sign(body, secret);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Hmac-Sha256': hmac },
        body,
      });
      let json = null; try { json = await res.json(); } catch (e) {}
      if (res.status !== 200) {
        failed++;
        console.log(`  FAIL   ${p.o.name}  HTTP ${res.status}  ${JSON.stringify(json)}`);
        continue;
      }
      granted += (json && json.granted) || 0;
      pending += (json && json.pending) || 0;
      skippedResp += (json && json.skipped) || 0;
      console.log(`  OK     ${p.o.name}  granted=${json && json.granted} pending=${json && json.pending} skipped=${json && json.skipped}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL   ${p.o.name}  ${e.message}`);
    }
  }
  console.log(`\nDone. granted=${granted} pending=${pending} skipped=${skippedResp} failed=${failed}`);
  console.log('(Grants apply to existing teacher accounts; pending rows are claimed automatically when the buyer next registers or logs in.)');
  process.exit(failed === 0 ? 0 : 1);
}

if (SEND) {
  send();
} else {
  console.log('\nDry run: nothing was sent. Re-run with --send (and SHOPIFY_WEBHOOK_SECRET set) to apply.');
}
