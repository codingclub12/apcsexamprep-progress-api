'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  Small, dependency-free fixed-window rate limiter, keyed by client IP.
//
//  Memory is BOUNDED on purpose (MAX_KEYS): a flood of unique IPs can never grow
//  the map without limit, which matters on the 1 GB Railway box (a prior leak
//  cost $169). When the cap is hit we first drop expired buckets, and only if
//  that is not enough do we clear the map (fail open rather than OOM).
//
//  This mirrors the limiter admin-session.js already uses for /admin/login, made
//  reusable so any route can get its own independent window/limit without copying
//  the bucket bookkeeping. Per-process only (no cross-instance coordination),
//  which is the right tradeoff for a single-instance app; it is a courtesy brake
//  against abuse, not a hard security boundary.
// ─────────────────────────────────────────────────────────────────────────────
function makeRateLimit(opts) {
  const windowMs = (opts && opts.windowMs) || 15 * 60 * 1000;
  const max = (opts && opts.max) || 10;
  const message = (opts && opts.message) || 'Too many requests. Please wait a few minutes and try again.';
  const MAX_KEYS = (opts && opts.maxKeys) || 5000;
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || 'unknown';
    let bucket = buckets.get(ip);
    if (!bucket || now - bucket.start >= windowMs) {
      if (buckets.size >= MAX_KEYS) {
        for (const [k, v] of buckets) if (now - v.start >= windowMs) buckets.delete(k);
        if (buckets.size >= MAX_KEYS) buckets.clear();
      }
      bucket = { start: now, count: 0 };
      buckets.set(ip, bucket);
    }
    bucket.count++;
    if (bucket.count > max) return res.status(429).json({ error: message });
    next();
  };
}

module.exports = { makeRateLimit };
