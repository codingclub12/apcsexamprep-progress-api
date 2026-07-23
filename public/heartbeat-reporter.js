/*
 * APCSExamPrep session heartbeat reporter (reference implementation)
 * ==================================================================
 * Measures time on site, active (engaged) time, and page views per browser
 * visit, and flushes them to POST /api/progress/heartbeat. One session id per
 * tab (sessionStorage), cumulative counters, coalesced flushes: ~1-2 tiny
 * requests per minute plus one on page hide. The server keeps the MAX of each
 * counter, so a retried or out-of-order flush can never double count.
 *
 * This file is the canonical source. It lives in the progress-api repo because
 * the theme repo is maintained separately; copy it into the theme (or serve it
 * from the API origin) and include it on lesson pages AFTER the student is
 * logged in. See docs/session-time-tracking.md.
 *
 * Integration: the reporter needs two things from the host page:
 *   1. the student JWT (same token the existing tracker sends as a Bearer)
 *   2. the course slug ('ap-csa' | 'ap-csp' | 'ap-cybersecurity' | 'solo')
 * Provide them via window.APCS_HEARTBEAT before this script runs:
 *   window.APCS_HEARTBEAT = {
 *     getToken: () => localStorage.getItem('apcs_student_token'), // your key
 *     course:   document.body.dataset.course,                     // or a literal
 *     base:     'https://progress.apcsexamprep.com'               // API origin
 *   };
 * Fallbacks are attempted if the config is absent (see resolveConfig), but set
 * getToken explicitly to match however the existing apcs-tracker stores auth.
 *
 * Zero PII: only a random session id, durations, and a page-view count leave the
 * browser. No URL, no page title, no student input.
 */
(function () {
  "use strict";

  var IDLE_MS = 30000;        // no interaction for this long => not "active"
  var FLUSH_MS = 45000;       // periodic flush cadence
  var SS = window.sessionStorage;

  // ── Config resolution ──────────────────────────────────────────────────
  function resolveConfig() {
    var cfg = window.APCS_HEARTBEAT || {};
    var base = cfg.base || (window.APCS_API_BASE) || "https://progress.apcsexamprep.com";
    var course = cfg.course ||
      (document.body && document.body.dataset && document.body.dataset.course) ||
      (document.querySelector("[data-course]") && document.querySelector("[data-course]").getAttribute("data-course")) ||
      "";
    var channelHint = cfg.channelHint || null; // e.g. 'Class link' on the join landing
    var getToken = typeof cfg.getToken === "function" ? cfg.getToken : function () {
      // Best-effort fallbacks; override via window.APCS_HEARTBEAT.getToken to
      // match the existing tracker's storage key.
      try {
        return window.APCS_STUDENT_TOKEN ||
          localStorage.getItem("apcs_student_token") ||
          localStorage.getItem("student_token") || "";
      } catch (e) { return ""; }
    };
    return { base: base, course: course, getToken: getToken, channelHint: channelHint };
  }

  var cfg = resolveConfig();
  if (!cfg.course) return; // nothing to attribute time to; stay silent

  // ── Session id + cross-page cumulative counters (per tab) ───────────────
  function uuid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "s-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
  }
  function ssGet(k, d) { try { var v = SS.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function ssSet(k, v) { try { SS.setItem(k, String(v)); } catch (e) {} }

  var K_SID = "apcs_hb_sid", K_ACT = "apcs_hb_active", K_TOT = "apcs_hb_total", K_PV = "apcs_hb_pv";
  var K_CH = "apcs_hb_channel", K_REF = "apcs_hb_ref";

  // Acquisition channel + referrer domain, classified ONCE at the start of the
  // visit from document.referrer and any UTM tags, then reused for every page of
  // the session (entry-channel / first-touch). Zero PII: an enum plus a hostname,
  // never a full URL or query string.
  function refHost() {
    try {
      if (!document.referrer) return "";
      return new URL(document.referrer).hostname.replace(/^www\./, "");
    } catch (e) { return ""; }
  }
  var CHANNEL_SET = /^(Direct|Organic Search|Social|Referral|Email|Paid|Class link)$/;
  function classifyChannel(host) {
    // First-party teacher referral wins: the join/enroll landing can set
    // channelHint 'Class link', or the entry URL carries a class code / join path.
    if (cfg.channelHint && CHANNEL_SET.test(cfg.channelHint)) return cfg.channelHint;
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("class") || q.get("classcode") || q.get("class_code") || q.get("join") ||
          /\/(join|enroll)\b/i.test(location.pathname)) return "Class link";
    } catch (e) {}
    var medium = "", source = "";
    try {
      var p = new URLSearchParams(location.search);
      medium = (p.get("utm_medium") || "").toLowerCase();
      source = (p.get("utm_source") || "").toLowerCase();
    } catch (e) {}
    if (medium) {
      if (/cpc|ppc|paid|display|banner/.test(medium)) return "Paid";
      if (/email|newsletter/.test(medium) || source === "email") return "Email";
      if (/social/.test(medium)) return "Social";
      if (/organic/.test(medium)) return "Organic Search";
      if (/referral/.test(medium)) return "Referral";
    }
    if (!host) return "Direct";
    var self = location.hostname.replace(/^www\./, "");
    if (host === self || /apcsexamprep\.com$/.test(host)) return "Direct";
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|baidu|yandex|ask|aol)\./.test(host)) return "Organic Search";
    if (/(facebook|fb\.com|instagram|twitter|x\.com|t\.co|tiktok|youtube|youtu\.be|linkedin|lnkd\.in|reddit|pinterest|threads)/.test(host)) return "Social";
    if (/(^mail\.|outlook|gmail|mailchimp|sendgrid)/.test(host)) return "Email";
    return "Referral";
  }

  var sid = ssGet(K_SID, "");
  var channel, referrer;
  if (!sid) {
    sid = uuid(); ssSet(K_SID, sid);
    referrer = refHost();
    channel = classifyChannel(referrer);
    ssSet(K_CH, channel); ssSet(K_REF, referrer);
  } else {
    channel = ssGet(K_CH, "Direct");
    referrer = ssGet(K_REF, "");
  }
  var baseActive = parseInt(ssGet(K_ACT, "0"), 10) || 0;   // seconds from prior pages this visit
  var baseTotal = parseInt(ssGet(K_TOT, "0"), 10) || 0;
  var pv = (parseInt(ssGet(K_PV, "0"), 10) || 0) + 1;      // this page load counts as a view
  ssSet(K_PV, pv);

  var activeThisPage = 0;  // engaged seconds on THIS page
  var totalThisPage = 0;   // foreground seconds on THIS page
  var lastActivity = Date.now();

  // ── Activity + visibility tracking (listeners added once) ───────────────
  function bump() { lastActivity = Date.now(); }
  ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "wheel"].forEach(function (ev) {
    window.addEventListener(ev, bump, { passive: true });
  });

  function isVisible() { return document.visibilityState === "visible"; }

  // One 1s ticker. total counts foreground seconds; active also requires recent
  // interaction. No per-event timers, no accumulation.
  var ticker = window.setInterval(function () {
    if (!isVisible()) return;
    totalThisPage += 1;
    if (Date.now() - lastActivity < IDLE_MS) activeThisPage += 1;
  }, 1000);

  // ── Flush ───────────────────────────────────────────────────────────────
  function flush() {
    var token = cfg.getToken();
    if (!token) return;
    var body = JSON.stringify({
      session_id: sid,
      course: cfg.course,
      active_seconds: baseActive + activeThisPage,
      total_seconds: baseTotal + totalThisPage,
      page_views: pv,
      channel: channel,
      referrer_host: referrer
    });
    try {
      // keepalive lets the final flush survive page unload while still carrying
      // the Authorization header (sendBeacon cannot set headers).
      fetch(cfg.base + "/api/progress/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: body,
        keepalive: true,
        credentials: "omit"
      }).catch(function () {});
    } catch (e) { /* offline or blocked; drop this beat */ }
  }

  // Persist this page's contribution so the next page in the tab continues the
  // same cumulative counters.
  function persist() {
    ssSet(K_ACT, baseActive + activeThisPage);
    ssSet(K_TOT, baseTotal + totalThisPage);
  }

  var interval = window.setInterval(flush, FLUSH_MS);

  document.addEventListener("visibilitychange", function () {
    if (!isVisible()) { persist(); flush(); }
  });
  // pagehide is the reliable unload signal on mobile Safari and bfcache.
  window.addEventListener("pagehide", function () {
    window.clearInterval(ticker);
    window.clearInterval(interval);
    persist();
    flush();
  });
})();
