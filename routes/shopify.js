'use strict';
// Shopify orders/paid webhook: recognize a purchase and grant a per-course
// entitlement (Phase 4 slice 2). Server only; this does not gate any content.
//
// HMAC note: Shopify signs the EXACT raw request bytes. server.js mounts
// express.json() globally, which would consume and re-serialize the body and
// break the signature, so this router parses its own body with express.raw and
// is mounted BEFORE the global json parser in server.js. Do not add a json
// parser ahead of this route.
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const db = require('../db');
const { grantOrRefresh } = require('../lib/entitlements');
const { courseForLineItem } = require('../config/shopify-skus');

const SECRET_ENV = 'SHOPIFY_WEBHOOK_SECRET';

// Constant-time base64 HMAC-SHA256 comparison over the raw body. Returns false
// on any missing input or length mismatch rather than throwing, so a malformed
// request is a clean 401 and never a 500.
function verifyHmac(rawBody, headerHmac, secret) {
  if (!Buffer.isBuffer(rawBody) || !headerHmac || !secret) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(headerHmac));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Prepared once at module scope.
const findTeacherByEmail = db.prepare(
  'SELECT id, email FROM teachers WHERE email = ? COLLATE NOCASE'
);
// Partial unique index uidx_pending_ent_unclaimed makes this idempotent: a
// redelivered order cannot park the same (email, course, order_ref) twice while
// it is still unclaimed.
const insertPending = db.prepare(`
  INSERT OR IGNORE INTO pending_entitlements (email, course, source, order_ref)
  VALUES (?, ?, ?, ?)
`);

// Extract the buyer email from an order, preferring order.email and falling back
// to the customer object. Returns null when neither is present.
function orderEmail(order) {
  const raw = (order && (order.email || (order.customer && order.customer.email))) || null;
  return raw ? String(raw).trim().toLowerCase() : null;
}

// Turn a verified order into entitlements. Courses are deduped so two line items
// mapping to the same course grant once. Unmapped line items are logged and
// skipped. All writes are idempotent, so replaying the same order is a no-op on
// second delivery. Returns a small summary for logging / the 200 body.
function processOrder(order) {
  const orderRef = order && order.id != null ? String(order.id) : null;
  const email = orderEmail(order);
  const lineItems = order && Array.isArray(order.line_items) ? order.line_items : [];

  const courses = new Set();
  let skipped = 0;
  for (const item of lineItems) {
    const course = courseForLineItem(item);
    if (!course) {
      skipped++;
      console.warn(
        `[shopify] unmapped line item on order ${orderRef}: sku=${item && item.sku} product_id=${item && item.product_id} (logged and skipped)`
      );
      continue;
    }
    courses.add(course);
  }

  if (courses.size === 0) {
    return { order_ref: orderRef, granted: 0, pending: 0, skipped };
  }

  if (!email) {
    // No email means we can neither resolve a teacher nor park a claimable
    // pending row. Log and skip rather than fail; the webhook still 200s.
    console.warn(`[shopify] order ${orderRef} has no email; cannot grant, ${courses.size} course(s) skipped`);
    return { order_ref: orderRef, granted: 0, pending: 0, skipped: skipped + courses.size };
  }

  const teacher = findTeacherByEmail.get(email);
  let granted = 0;
  let pending = 0;
  for (const course of courses) {
    if (teacher) {
      grantOrRefresh(teacher.id, course, 'shopify_order', orderRef, null);
      granted++;
    } else {
      insertPending.run(email, course, 'shopify_order', orderRef);
      // Count the intent regardless of whether the row was newly inserted or a
      // duplicate was ignored; either way the buyer will claim it on auth.
      pending++;
    }
  }
  return { order_ref: orderRef, granted, pending, skipped };
}

// POST /api/shopify/webhook/orders-paid
// express.raw gives us req.body as the exact Buffer Shopify signed.
router.post('/webhook/orders-paid', express.raw({ type: 'application/json' }), (req, res) => {
  const secret = process.env[SECRET_ENV];
  if (!secret) {
    // Fail closed: with no secret we cannot verify anything, so trust nothing.
    console.error(`[shopify] ${SECRET_ENV} is not set; rejecting webhook`);
    return res.status(401).json({ error: 'unauthorized' });
  }

  const headerHmac = req.get('X-Shopify-Hmac-Sha256');
  const rawBody = req.body;
  if (!verifyHmac(rawBody, headerHmac, secret)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Verified past this point. Always answer 200 fast so Shopify does not retry a
  // request we have already accepted. Parsing or processing problems are logged,
  // not surfaced as non-200 (idempotency makes a manual replay safe).
  let order;
  try {
    order = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    console.error(`[shopify] verified webhook body was not valid JSON: ${e.message}`);
    return res.status(200).json({ ok: true, granted: 0, pending: 0, skipped: 0 });
  }

  try {
    const summary = processOrder(order);
    return res.status(200).json({ ok: true, ...summary });
  } catch (e) {
    console.error('[shopify] error processing verified order (logged, returning 200):', e);
    return res.status(200).json({ ok: true, granted: 0, pending: 0, skipped: 0, error: 'logged' });
  }
});

module.exports = router;
