'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SURVIVING AN API OUTAGE, FROM INSIDE THE PAGE.
//
//  ── THE INCIDENT THIS IS FOR ───────────────────────────────────────────────
//  progress.apcsexamprep.com went down and pages "went down" with it. They did
//  not 404. They returned 200, rendered their heading and their prose, and then
//  sat on "Loading the practice question..." forever, which to a teacher in
//  front of a class is worse than a 404: a 404 is unambiguous, a spinner looks
//  like their own connection.
//
//  The socket-and-appliance pattern is why the site can edit content with a
//  commit instead of a re-import, and it is worth keeping. But it couples every
//  lesson, lab and practice page to one Railway container, and nothing in the
//  generated markup acknowledged that.
//
//  ── THREE WAYS IT BREAKS, AND ONLY ONE WAS HANDLED ─────────────────────────
//  a) The player SCRIPT never loads (API down, DNS, TLS). The inline
//     `APCSFrq.mountById(...)` then throws ReferenceError and the mount point
//     keeps its loading text forever. UNHANDLED before this.
//  b) The script loads but the spec FETCH fails. Both players catch this and
//     write one bare sentence. Handled, badly: no way out of the page.
//  c) The API accepts the connection and never answers. fetch never settles, no
//     catch ever runs, the spinner is permanent. UNHANDLED before this, and the
//     worst of the three because it has no end.
//
//  ── WHY THE CHECK IS A SENTINEL NODE, NOT THE LOADING TEXT ─────────────────
//  The tempting timeout is "if the container still says Loading, fall back".
//  That matches TEXT rather than a FACT, and this workstream has already been
//  bitten five times by exactly that. So the mount point ships with a sentinel
//  element carrying its own id. The players replace the container's contents on
//  success, which removes the sentinel. Asking whether the sentinel is still in
//  the DOM is a structural question with a yes or no answer.
//
//  ── WHAT THE FALLBACK SAYS ─────────────────────────────────────────────────
//  It names the real cause, tells the student their work is unaffected (these
//  are self-scored and nothing is transmitted, so an outage genuinely costs
//  them nothing), and gives them somewhere to go: the hub, which is static HTML
//  and keeps working when this API is entirely down. That last part is the
//  whole reason the hubs were built static.
//
//  No em-dashes, per repo convention. ASCII only: this ships inside a Shopify
//  page body and the sheet generators reject non-ASCII.
// ─────────────────────────────────────────────────────────────────────────────

const STORE = 'https://www.apcsexamprep.com';

// Long enough that a cold Railway container still wins the race, short enough
// that a class is not staring at a spinner. A cold boot on this service has
// been observed in the low seconds; twelve gives it several times that.
const TIMEOUT_MS = 12000;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The mount point, carrying the sentinel the timeout asks about.
 * Callers must use this rather than hand-rolling the div, or the timeout has
 * nothing to test and mode (c) goes back to being a permanent spinner.
 */
function mountPoint(mountId, loadingText) {
  return '<div id="' + esc(mountId) + '">'
    + '<p id="' + esc(mountId) + '-loading">' + esc(loadingText) + '</p>'
    + '</div>';
}

function sentinelId(mountId) { return mountId + '-loading'; }

/** The styles the fallback needs. Scoped, and small enough to inline per page. */
const CSS = '.apcs-offline{border:1px solid #e3c9c9;background:#fdf6f6;border-radius:8px;'
  + 'padding:15px 17px;margin:8px 0;}'
  + '.apcs-offline p{margin:0 0 9px;line-height:1.55;}'
  + '.apcs-offline p:last-child{margin-bottom:0;}'
  + '.apcs-offline .apcs-offline-h{font-weight:700;}';

/**
 * The inline bootstrap. Emitted BEFORE the player script tag, because the tag's
 * onerror attribute has to be able to reach the fallback the moment the request
 * for the player fails.
 *
 * opts:
 *   mountId    the element built by mountPoint()
 *   globalName 'APCSFrq' or 'APCSLab'
 *   course     course id passed to mountById
 *   itemId     set_id or item_id passed to mountById
 *   noun       what the student was trying to open, for the message
 *   hubHandle  a STATIC page that keeps working while this API is down
 *   hubText    link text for it
 */
function bootstrapScript(opts) {
  const j = JSON.stringify;
  const fallbackHtml = '<div class="apcs-offline">'
    + '<p class="apcs-offline-h">This ' + opts.noun + ' could not be loaded.</p>'
    + '<p>The practice service is not responding right now. This is on our side, '
    + 'not yours, and it is usually brief.</p>'
    + '<p>Nothing you have written is affected. These are self-scored and nothing '
    + 'you type is ever sent anywhere, so there is no work to lose.</p>'
    + '<p>Reload in a minute, or <a href="' + STORE + '/pages/' + opts.hubHandle + '">'
    + opts.hubText + '</a>, which keeps working while this is down.</p>'
    + '</div>';

  // Written as one expression per line rather than minified: this is the code
  // that runs when everything else has failed, and the next person to debug an
  // outage should be able to read it in the page source.
  return [
    '<script>',
    '(function(){',
    '  var MID=' + j(opts.mountId) + ',SID=' + j(sentinelId(opts.mountId)) + ';',
    '  var shown=false;',
    '  function fallback(){',
    '    if(shown)return;shown=true;',
    '    var el=document.getElementById(MID);',
    '    if(el)el.innerHTML=' + j(fallbackHtml) + ';',
    '  }',
    // A registry rather than a per-page function name: mount ids contain
    // hyphens and would not be valid identifiers.
    '  window.APCSPageFallback=window.APCSPageFallback||{};',
    '  window.APCSPageFallback[MID]=fallback;',
    '  window.APCSPageGo=window.APCSPageGo||{};',
    '  window.APCSPageGo[MID]=function(){',
    '    var el=document.getElementById(MID);',
    '    if(!el)return;',
    // (a) the player script never loaded
    '    if(!window[' + j(opts.globalName) + ']){fallback();return;}',
    '    var p;',
    '    try{p=window[' + j(opts.globalName) + '].mountById(el,' + j(opts.course) + ',' + j(opts.itemId) + ');}',
    '    catch(e){fallback();return;}',
    // (b) the spec fetch rejected. Both players already write a bare sentence;
    // this replaces it with one that has a way out.
    '    if(p&&typeof p.catch==="function"){shown=false;p.catch(fallback);}',
    '  };',
    // (c) the API accepted the connection and never answered, so nothing ever
    // rejected. The sentinel is still in the DOM, which is a fact, not text.
    '  setTimeout(function(){if(document.getElementById(SID))fallback();},' + TIMEOUT_MS + ');',
    '})();',
    '</' + 'script>',
  ].join('\n');
}

/**
 * The player script tag, wired to the fallback for the case where it 404s.
 *
 * Single quotes inside the double-quoted attribute rather than &quot; entities:
 * scripts/lab-pages-csv.js refuses a body with an entity-quoted attribute
 * value, and it is right to. Mount ids are [a-z0-9-] only, so there is nothing
 * to escape.
 */
function playerTag(src, mountId) {
  if (!/^[a-z0-9-]+$/.test(mountId)) {
    throw new Error("mount id '" + mountId + "' must be [a-z0-9-] to sit in an onerror attribute");
  }
  var handler = "window.APCSPageFallback['" + mountId + "']()";
  return '<script src="' + src + '" onerror="' + handler + '"></' + 'script>';
}

/** The call that actually mounts, emitted after the player tag. */
function goTag(mountId) {
  return '<script>window.APCSPageGo[' + JSON.stringify(mountId) + ']();</' + 'script>';
}

module.exports = { mountPoint, sentinelId, bootstrapScript, playerTag, goTag,
  CSS, TIMEOUT_MS, STORE, esc };
