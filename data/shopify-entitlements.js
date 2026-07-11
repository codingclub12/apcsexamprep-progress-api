'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SHOPIFY SKU -> ENTITLEMENT MAP
//
//  Maps a purchased Shopify line-item SKU to the course (and optional unit) it
//  grants. The webhook (routes/webhooks.js) reads this to turn an order into
//  entitlement rows.
//
//  ACTION REQUIRED before this goes live: replace the placeholder SKUs below with
//  the real SKUs from the Shopify products. A SKU not in this map is ignored (the
//  order still 200s), so an unmapped product silently grants nothing. Keep the
//  keys exactly matching the Shopify variant SKU strings.
//
//  unit: null means the purchase grants the whole course; a unit key (e.g.
//  'unit-1') grants just that unit. Match the unit keys to the COURSES config in
//  utils.js.
// ─────────────────────────────────────────────────────────────────────────────

const SKU_ENTITLEMENTS = {
  // Whole-course purchases
  'CYBER-FULL': { course: 'ap-cybersecurity', unit: null },
  'CSA-FULL':   { course: 'ap-csa',           unit: null },
  'CSP-FULL':   { course: 'ap-csp',           unit: null },

  // Per-unit purchases (cyber example; extend as products are created)
  'CYBER-U1': { course: 'ap-cybersecurity', unit: 'unit-1' },
  'CYBER-U2': { course: 'ap-cybersecurity', unit: 'unit-2' },
  'CYBER-U3': { course: 'ap-cybersecurity', unit: 'unit-3' },
  'CYBER-U4': { course: 'ap-cybersecurity', unit: 'unit-4' },
  'CYBER-U5': { course: 'ap-cybersecurity', unit: 'unit-5' },
};

// Returns the entitlement { course, unit } for a SKU, or null if the SKU is not
// mapped. Case-insensitive on the SKU so store casing drift does not silently
// drop a grant.
function entitlementForSku(sku) {
  if (!sku) return null;
  const key = String(sku).trim().toUpperCase();
  return SKU_ENTITLEMENTS[key] || null;
}

module.exports = { SKU_ENTITLEMENTS, entitlementForSku };
