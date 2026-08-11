/* ───────────────────────────────────────────────────────────────────────────
 *  POSTHOG BROWSER INIT - loaded by every admin and teacher page.
 *
 *  This file is a TEMPLATE. It is never served as-is: server.js substitutes
 *  __POSTHOG_KEY__, __POSTHOG_API_HOST__ and __POSTHOG_ASSETS_HOST__ from the
 *  environment and serves the result at /posthog-init.js. With no key set the
 *  route serves an inert stub instead, so the pages can carry the script tag
 *  unconditionally and analytics stays a pure environment decision.
 *
 *  The project key is a PUBLIC key (phc_...). It is designed to sit in client
 *  source and only permits writes. Never put a personal or secret key here.
 *
 *  CAPTURE POSTURE: everything the browser SDK offers is on. Autocapture,
 *  pageviews, pageleaves, heatmaps, web vitals and session replay. The one
 *  exception is password inputs, which stay masked in replay: those fields hold
 *  the admin key and teacher passwords, and shipping live credentials to a third
 *  party is a different thing from collecting product data.
 *
 *  These pages render real student names. Session replay therefore sends student
 *  names to PostHog. That is intended here; see docs/analytics.md.
 * ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var KEY = '__POSTHOG_KEY__';
  var API_HOST = '__POSTHOG_API_HOST__';
  var ASSETS_HOST = '__POSTHOG_ASSETS_HOST__';

  // Small queue so page code can call phCapture() before array.js has landed
  // without needing to know whether the SDK is ready, or configured at all.
  var pending = [];
  window.phCapture = function (event, props) {
    if (window.posthog && window.posthog.__loaded) window.posthog.capture(event, props);
    else pending.push([event, props]);
  };

  // Decode a JWT payload without verifying it. The browser cannot verify a
  // signature it has no secret for, and it does not need to: this only labels
  // the analytics session. The API still enforces auth on every call.
  function tokenPayload() {
    try {
      var raw =
        localStorage.getItem('apcse_teacher_token') ||
        localStorage.getItem('apcs_teacher_token') ||
        localStorage.getItem('teacher_token') ||
        '';
      if (!raw || raw.split('.').length !== 3) return null;
      var body = raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(body));
    } catch (e) {
      return null;
    }
  }

  // Which of our pages this is, as a low cardinality property. The path is
  // already captured; this makes the common breakdowns one click instead of a
  // regex.
  function surface() {
    var p = location.pathname;
    if (p.indexOf('/admin/') === 0) return 'admin' + p.slice(6);
    if (p.indexOf('/teacher/') === 0) return 'teacher' + p.slice(8);
    return p;
  }

  var script = document.createElement('script');
  script.src = ASSETS_HOST + '/static/array.js';
  script.async = true;

  script.onerror = function () {
    // An ad blocker or a CDN failure must not break the page. Drop the queue.
    pending.length = 0;
  };

  script.onload = function () {
    if (!window.posthog || typeof window.posthog.init !== 'function') return;

    window.posthog.init(KEY, {
      api_host: API_HOST,
      // Profiles for anonymous visitors too, not just identified ones.
      person_profiles: 'always',

      // ── Product analytics: everything on ──
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      capture_performance: true,
      enable_heatmaps: true,

      // ── Session replay ──
      disable_session_recording: false,
      session_recording: {
        // Record input VALUES, which is what makes replay useful for debugging
        // a teacher's actual gradebook session.
        maskAllInputs: false,
        // The single carve out. Password fields hold the admin key and teacher
        // passwords; those are credentials, not analytics.
        maskInputOptions: { password: true },
      },

      loaded: function (ph) {
        ph.register({ app: 'progress-api', surface: surface() });

        var payload = tokenPayload();
        if (payload && payload.id) {
          ph.identify(String(payload.id), {
            role: payload.role || 'teacher',
            email: payload.email || undefined,
          });
        }

        for (var i = 0; i < pending.length; i++) ph.capture(pending[i][0], pending[i][1]);
        pending.length = 0;
      },
    });
  };

  document.head.appendChild(script);
})();
