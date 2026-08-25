(function (root, factory) {
  'use strict';
  // ───────────────────────────────────────────────────────────────────────────
  //  THE PRACTICE HUB RENDERER, AND WHY IT IS A UMD
  //
  //  This file has two callers that must never disagree:
  //
  //    1. scripts/cyber-practice-hubs-csv.js requires it in Node to generate the
  //       hub pages' STATIC HTML, which is what a crawler reads and what has to
  //       rank. A hub whose cards only appear after JavaScript runs is a hub
  //       Google sees as an empty page.
  //
  //    2. The browser loads it from /practice-hub.js and it re-renders the same
  //       cards from /api/practice/:course on load, so a fifth practice set
  //       authored tomorrow shows up on every hub without another Matrixify
  //       import.
  //
  //  The obvious way to do that is to write the card markup twice, once in a
  //  Node generator and once here. That is exactly how the static half goes
  //  stale: the two copies drift, and nobody notices because both "work". So
  //  there is one implementation, in one file, that runs in both places. Parity
  //  is a property of the file rather than a test that has to keep passing.
  //
  //  IT UPLOADS NOTHING. One GET, for a public table of contents. Same posture
  //  as frq-player.js, and smoke/practice-hub.js fails the build on any write
  //  method appearing here.
  //
  //  No em-dashes, per repo convention.
  // ───────────────────────────────────────────────────────────────────────────
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.APCSPracticeHub = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // A difficulty is a promise about where to start, so it is rendered as a word
  // rather than a colour alone. "Stretch" tells a student something; an orange
  // dot does not.
  var DIFF_LABEL = { intro: 'Start here', core: 'Core', stretch: 'Stretch' };

  // An empty span is not the same as no span: it leaves a gap the card's own
  // margins still reserve, so a lab with no blurb would sit taller than its
  // neighbours for no reason. Absent content emits no element at all.
  // Difficulty as a coloured pill. "Stretch" should be visible before the card
  // is read, because it is the whole basis on which a student picks one.
  function pill(difficulty) {
    var label = DIFF_LABEL[difficulty];
    if (!label) return '';
    return '<span class="ph-pill ph-pill-' + difficulty + '">' + esc(label) + '</span>';
  }

  function span(cls, text) {
    if (text == null || text === '') return '';
    return '<span class="' + cls + '">' + esc(text) + '</span>';
  }

  function minutes(n) {
    if (!n) return '';
    return n + ' min';
  }

  /**
   * One Device Security Analysis card.
   *
   * `page_url` is preferred over the API's own player URL because a student who
   * lands on the storefront should stay on the storefront. A set with no page
   * yet still gets a card, pointing at the player, rather than being dropped:
   * silently omitting authored practice is the failure mode this whole file
   * exists to prevent.
   */
  function frqCard(set, base) {
    var href = set.page_url || (base + set.url);
    var meta = [];
    if (set.est_minutes) meta.push(esc(minutes(set.est_minutes)));
    if (set.parts) meta.push('Parts A to E');
    if (set.sources) meta.push(esc(set.sources) + ' sources');
    return ''
      + '<a class="ph-card" href="' + esc(href) + '">'
      + span('ph-card-focus', set.focus)
      + '<span class="ph-card-title">' + esc(set.title || set.set_id) + '</span>'
      + span('ph-card-blurb', set.blurb)
      + '<span class="ph-card-meta">' + pill(set.difficulty) + meta.join(' &middot; ') + '</span>'
      + '<span class="ph-card-go">Start &rarr;</span>'
      + '</a>';
  }

  /** One terminal lab card. Labs carry a unit and a lesson, so they say so. */
  function labCard(lab, base) {
    var href = lab.page_url || (base + lab.url);
    var meta = [];
    if (lab.lesson_id) meta.push('Topic ' + esc(lab.lesson_id));
    if (lab.est_minutes) meta.push(esc(minutes(lab.est_minutes)));
    if (lab.checks) meta.push(esc(lab.checks) + ' checks');
    return ''
      + '<a class="ph-card" href="' + esc(href) + '">'
      + span('ph-card-focus', String(lab.unit || '').replace('unit-', 'Unit '))
      + '<span class="ph-card-title">' + esc(lab.title || lab.item_id) + '</span>'
      + span('ph-card-blurb', lab.blurb)
      + '<span class="ph-card-meta">'
      + '<span class="ph-pill ' + (lab.graded ? 'ph-pill-core' : 'ph-pill-intro') + '">'
      + (lab.graded ? 'Graded' : 'Practice') + '</span>'
      + meta.join(' &middot; ') + '</span>'
      + '<span class="ph-card-go">Open &rarr;</span>'
      + '</a>';
  }


  /**
   * The card grid for one kind of practice.
   *
   * `kind` is 'frq' or 'labs'. An empty group renders an honest sentence rather
   * than an empty div, because a hub section that shows nothing and says nothing
   * reads as broken rather than as not-yet-written.
   */
  function grid(index, kind, base) {
    var items = (index && index[kind]) || [];
    if (!items.length) {
      return '<p class="ph-empty">Nothing published here yet. This section fills in as sets are authored.</p>';
    }
    var card = kind === 'frq' ? frqCard : labCard;
    var out = ['<div class="ph-grid">'];
    for (var i = 0; i < items.length; i++) out.push(card(items[i], base));
    out.push('</div>');
    return out.join('');
  }

  // ── THE CYBER HOUSE STYLE, NOT A NEW ONE ──────────────────────────────────
  // The first cut of these pages used a teal palette and system sans. Every
  // other AP Cybersecurity page on the site is purple and serif: the complete
  // course guide sets --purple #6B21A8, --cy2 #7C3AED, --accent #A855F7,
  // --navy #1E1B4B, cards on #F5F0FF with #e9d5ff borders at 14px radius, and
  // Georgia bodies under DM Serif Display headings.
  //
  // So these pages did not look unstyled so much as foreign: correct content
  // wearing another product's clothes. Everything below is taken from the
  // guide rather than invented, because a hub that matches the course it
  // belongs to is worth more than one that is prettier on its own.
  //
  // Fixed column counts rather than auto-fit or auto-fill: the page generators
  // reject those, because Shopify's own stylesheet has collapsed them before.
  var CSS = [
    // Flex rather than a fixed 2-column grid. Five sets in two columns leaves a
    // lonely fifth card with dead space beside it, which reads as a broken
    // layout rather than as an odd number of sets. Flex lets the last row
    // centre itself, and it stays correct as sets are authored. auto-fit and
    // auto-fill would do this too, and the generators reject both.
    '.ph-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin:16px 0 30px;}',
    '.ph-grid>.ph-card{flex:1 1 330px;max-width:508px;}',
    '@media (max-width:760px){.ph-grid>.ph-card{flex:1 1 100%;max-width:none;}}',
    // A card is a link, so it gets a link's affordances: it lifts, the border
    // takes the accent, and the arrow moves. Static pages get none of that, so
    // the arrow is always visible rather than appearing on hover.
    '.ph-card{display:block;position:relative;background:#F5F0FF;border:1px solid #e9d5ff;',
    'border-radius:14px;padding:18px 20px 46px;text-decoration:none!important;',
    'transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;}',
    '.ph-card:hover{transform:translateY(-2px);border-color:#A855F7;',
    'box-shadow:0 6px 20px rgba(107,33,168,.14);}',
    '.ph-card-focus{display:block;font-family:"DM Sans",system-ui,sans-serif;font-size:11px;',
    'font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#7C3AED;margin:0 0 7px;}',
    '.ph-card-title{display:block;font-family:"DM Serif Display",Georgia,serif;font-size:20px;',
    'line-height:1.25;color:#1E1B4B;margin:0 0 9px;}',
    '.ph-card-blurb{display:block;font-family:Georgia,serif;font-size:15px;line-height:1.55;',
    'color:#4B5563;margin:0 0 12px;}',
    // The meta row sits on the floor of the card so every card in a row ends
    // at the same place regardless of how long its blurb runs.
    '.ph-card-meta{position:absolute;left:20px;right:20px;bottom:16px;',
    'font-family:"DM Sans",system-ui,sans-serif;font-size:12.5px;color:#6B7280;}',
    '.ph-card-go{position:absolute;right:18px;bottom:14px;font-family:"DM Sans",system-ui,sans-serif;',
    'font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6B21A8;}',
    // Difficulty is the one thing a student should be able to see without
    // reading, so it is a pill with its own colour rather than grey text.
    '.ph-pill{display:inline-block;font-family:"DM Sans",system-ui,sans-serif;font-size:11px;',
    'font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:999px;',
    'padding:3px 9px;margin:0 7px 0 0;vertical-align:1px;}',
    '.ph-pill-intro{background:#DCFCE7;color:#15803D;}',
    '.ph-pill-core{background:#EDE9FE;color:#6B21A8;}',
    '.ph-pill-stretch{background:#FEF3C7;color:#B45309;}',
    '.ph-empty{font-family:Georgia,serif;font-size:15px;color:#6B7280;font-style:italic;',
    'margin:12px 0 24px;}',
  ].join('');

  function styleTag() { return '<style>' + CSS + '</style>'; }

  // ── the browser half ───────────────────────────────────────────────────────
  // Everything above is pure string building and runs identically in Node. Only
  // what follows touches the DOM, and it is skipped entirely when required.

  function base() {
    var cfg = (typeof window !== 'undefined' && window.APCS_PRACTICE) || {};
    return cfg.base || 'https://progress.apcsexamprep.com';
  }

  /**
   * Refresh one already-rendered section against the live index.
   *
   * The element arrives from the Matrixify import already holding correct cards.
   * This replaces them only once a good response is in hand, so a failed fetch,
   * an offline student or a cold Railway container leaves the static HTML alone
   * rather than blanking a page that was working.
   */
  function refresh(node, course, kind) {
    if (!node) return Promise.resolve(false);
    var url = base() + '/api/practice/' + encodeURIComponent(course);
    return fetch(url, { method: 'GET', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (index) {
        if (!index || !Array.isArray(index[kind])) return false;
        var html = grid(index, kind, base());
        if (html === node.innerHTML) return false;
        node.innerHTML = html;
        return true;
      })
      .catch(function () { return false; });
  }

  /** Refresh every [data-practice-course][data-practice-kind] on the page. */
  function mountAll(doc) {
    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return;
    var nodes = d.querySelectorAll('[data-practice-course][data-practice-kind]');
    for (var i = 0; i < nodes.length; i++) {
      refresh(nodes[i], nodes[i].getAttribute('data-practice-course'),
        nodes[i].getAttribute('data-practice-kind'));
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { mountAll(document); });
    } else {
      mountAll(document);
    }
  }

  return {
    grid: grid, frqCard: frqCard, labCard: labCard,
    styleTag: styleTag, CSS: CSS, esc: esc, span: span, pill: pill,
    refresh: refresh, mountAll: mountAll, DIFF_LABEL: DIFF_LABEL,
  };
}));
