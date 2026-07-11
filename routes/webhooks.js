'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SHOPIFY ORDER WEBHOOK — turns a purchase into entitlement rows.
//  Mounted in server.js with a RAW body parser BEFORE express.json, because the
//  HMAC is computed over the exact raw request bytes:
//    app.use('/api/webhooks/shopify', express.raw({ type: '*/*' }), require('./routes/webhooks'));
//
//  Security posture:
//   • FAILS CLOSED. With SHOPIFY_WEBHOOK_SECRET unset, every call returns 503.
//     There is no unsigned path.
//   • Verifies X-Shopify-Hmac-Sha256 with a constant-time compare over the raw
//     body before parsing or trusting anything.
//   • Idempotent: the order id rides in external_ref and dedupes on a unique
//     index, so Shopify's at-least-once retries never double-grant.
//   • Records entitlements only; it never mutates gradebook data.
// ─────────────────────────────────────────────────────────────────────────────
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { entitlementForSku } = require('../data/shopify-entitlements');
const { grantEntitlement } = require('../lib/entitlements');

const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';

function validHmac(rawBuf, headerHmac) {
  if (!headerHmac) return false;
  const digest = crypto.createHmac('sha256', SECRET).update(rawBuf).digest('base64');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(headerHmac));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /api/webhooks/shopify/orders  (orders/create or orders/paid topic)
router.post('/orders', (req, res) => {
  if (!SECRET) {
    return res.status(503).json({ error: 'Shopify webhook disabled. Set SHOPIFY_WEBHOOK_SECRET.' });
  }

  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : '');
  if (!validHmac(raw, req.get('X-Shopify-Hmac-Sha256'))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let order;
  try { order = JSON.parse(raw.toString('utf8')); }
  catch (e) { return res.status(400).json({ error: 'Malformed order payload' }); }

  const email = String(order.email || (order.customer && order.customer.email) || '').trim();
  const orderId = order.id != null ? String(order.id)
    : (order.order_number != null ? String(order.order_number) : null);

  // Business no-ops still return 200 so Shopify marks the webhook delivered and
  // stops retrying. Only signature/parse failures are non-2xx.
  if (!email) return res.status(200).json({ ok: true, granted: 0, reason: 'order has no email' });

  const items = Array.isArray(order.line_items) ? order.line_items : [];
  const grants = [];
  for (const li of items) {
    const ent = entitlementForSku(li && li.sku);
    if (!ent) continue; // unmapped SKU: ignored on purpose
    const r = grantEntitlement({ email, course: ent.course, unit: ent.unit, source: 'shopify', externalRef: orderId });
    if (r.granted) grants.push({ course: ent.course, unit: ent.unit });
  }
  res.status(200).json({ ok: true, granted: grants.length, grants });
});

module.exports = router;
