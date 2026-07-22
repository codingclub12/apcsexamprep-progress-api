'use strict';
// SKU / product-id to course map for the Shopify orders/paid webhook.
//
// THIS IS THE ONE PLACE TO EDIT when a real Shopify product goes live. Add an
// entry keyed by the product's line-item SKU (preferred) or its numeric
// product_id (fallback), with the course as the value. Course values must be one
// of the per-course model keys: 'ap-csa', 'ap-csp', 'ap-cybersecurity'. AP CSA
// is the 2025 4-unit curriculum only.
//
// Two ways to fill it in, so staging and prod can differ without a code change:
//   1. Add lines to DEFAULT_SKU_MAP below (checked into the repo), or
//   2. Set SHOPIFY_SKU_MAP in the environment to a JSON object. Env keys are
//      merged over the defaults, so env wins on any shared key.
//
// A line item whose sku and product_id are both absent from the merged map is
// logged and skipped by the webhook (never a failure), so an unmapped or new
// product cannot 500 the webhook or block the rest of the order.
const DEFAULT_SKU_MAP = {
  // Teacher whole-course purchases only. Each product here grants the buying
  // teacher a full-course entitlement, so student add-ons (reference cards, PDFs,
  // flashcards, tutoring) are deliberately NOT listed. Add a course's teacher
  // pack here when it goes live.
  'AP-CYBER-FOUNDER-2026': 'ap-cybersecurity', // AP Cybersecurity Founding Teacher Bundle, Units 1-5
  'CSA-TSP-COMPLETE':      'ap-csa',            // AP CSA Teacher Superpack, Complete (All 4 Units)
  // AP CSP Teacher Superpack has no line-item SKU, so it is mapped by its numeric
  // Shopify product_id (courseForLineItem falls back to product_id when sku is absent).
  '9278941888727':         'ap-csp',            // AP CSP Teacher Superpack
};

function loadEnvMap() {
  const raw = process.env.SHOPIFY_SKU_MAP;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    console.error('[shopify] SHOPIFY_SKU_MAP must be a JSON object; ignoring it');
    return {};
  } catch (e) {
    console.error('[shopify] SHOPIFY_SKU_MAP is not valid JSON; ignoring it');
    return {};
  }
}

// Merged once at module load. Env values override repo defaults on shared keys.
const SKU_MAP = Object.assign({}, DEFAULT_SKU_MAP, loadEnvMap());

// Resolve a single Shopify line item to a course, or null if unmapped. SKU is
// tried first, then product_id. Both are coerced to strings so a numeric
// product_id matches a JSON/string map key.
function courseForLineItem(item) {
  if (!item || typeof item !== 'object') return null;
  if (item.sku != null && item.sku !== '') {
    const bySku = SKU_MAP[String(item.sku)];
    if (bySku) return bySku;
  }
  if (item.product_id != null && item.product_id !== '') {
    const byProduct = SKU_MAP[String(item.product_id)];
    if (byProduct) return byProduct;
  }
  return null;
}

module.exports = { SKU_MAP, courseForLineItem };
