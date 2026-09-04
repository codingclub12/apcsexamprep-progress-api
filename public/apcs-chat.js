/* APCSExamPrep front desk widget. Phase 3, anonymous commerce pages.
 *
 * Served from the API rather than the theme so a copy change needs no Shopify
 * deploy, and so the script and the endpoint it posts to can never be different
 * versions of each other.
 *
 * WHAT IT SENDS, and this is the entire list: the message the person typed, the
 * page URL, the page title, a session id, and a Turnstile token. It never reads
 * the DOM, never sends selected text, never sends innerText, and there is no
 * code path here that could. That is spec section 5 layer 3, and it is a hard
 * rule rather than a default: the questions are on the page, so a widget that
 * ships page content defeats every other layer.
 *
 * IT REFUSES TO RENDER ON COURSEWORK. The script tag is supposed to be absent
 * from lesson, lab and assessment templates (layer 4), and this check is the
 * second lock on that door: if the tag ever lands on one of those pages by
 * accident, nothing appears. The server refuses those scopes too, so the two
 * agree, but agreeing in two places is the point.
 *
 * Shadow DOM, because the theme rewrites button and heading colors on save and
 * this project has lost that fight repeatedly. Pure ASCII, because the theme
 * pipeline has mangled non-ASCII before.
 *
 * If anything at all goes wrong it removes itself. A store page must never be
 * broken by a support widget.
 */
(function () {
  'use strict';
  if (window.__APCS_CHAT__) return;
  window.__APCS_CHAT__ = 1;

  var API = (function () {
    var s = document.currentScript;
    if (s && s.src) { try { return new URL(s.src).origin; } catch (e) {} }
    return 'https://progress.apcsexamprep.com';
  })();

  // Scope, mirrored from lib/assistant/scope.js. Kept deliberately simple: this
  // is a "do not render" check, and the server decides the real answer.
  var COURSEWORK = /^\/pages\/(ap-csa|ap-csp|ap-cybersecurity|ap-networking|intro-java)\b/;
  var TEACHER = /^\/(admin|teacher)\b|^\/pages\/(teacher|command)/;
  function allowedHere() {
    var p = (location.pathname || '/').toLowerCase();
    if (COURSEWORK.test(p)) return false;
    if (TEACHER.test(p)) return false;
    return true;
  }
  if (!allowedHere()) return;

  function sessionId() {
    try {
      var k = 'apcs_chat_session';
      var v = sessionStorage.getItem(k);
      return v || null;
    } catch (e) { return null; }
  }
  function setSessionId(v) {
    try { if (v) sessionStorage.setItem('apcs_chat_session', v); } catch (e) {}
  }

  var host, root, log, input, sendBtn, panel, launcher, cfg = null, busy = false, tsWidget = null;

  function css() {
    return [
      ':host{all:initial}',
      '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
      '.launch{position:fixed;right:16px;bottom:16px;z-index:2147483000;',
      'background:#2a78d6;color:#fff;border:0;border-radius:999px;padding:12px 18px;',
      'font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.22)}',
      /* Clear of the Raptive ad slot, which anchors to the bottom on mobile. */
      '@media (max-width:600px){.launch{bottom:96px}}',
      '.panel{position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(380px,calc(100vw - 32px));',
      'max-height:min(560px,calc(100vh - 32px));display:flex;flex-direction:column;',
      'background:#fff;color:#111;border:1px solid rgba(0,0,0,.14);border-radius:14px;',
      'box-shadow:0 8px 34px rgba(0,0,0,.24);overflow:hidden}',
      '@media (max-width:600px){.panel{bottom:96px}}',
      '.head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;',
      'border-bottom:1px solid rgba(0,0,0,.10);font-weight:700;font-size:14px}',
      '.head button{background:none;border:0;font-size:20px;line-height:1;cursor:pointer;color:#555;padding:0 4px}',
      '.log{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:9px}',
      '.msg{max-width:92%;padding:9px 11px;border-radius:12px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}',
      '.you{align-self:flex-end;background:#2a78d6;color:#fff;border-bottom-right-radius:4px}',
      '.desk{align-self:flex-start;background:#f0f0ee;color:#111;border-bottom-left-radius:4px}',
      '.ask{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(0,0,0,.10);align-items:flex-end}',
      '.ask textarea{flex:1;min-height:38px;max-height:120px;resize:none;padding:8px 10px;font-size:14px;',
      'border:1px solid rgba(0,0,0,.18);border-radius:9px;color:#111;background:#fff}',
      '.ask button{background:#2a78d6;color:#fff;border:0;border-radius:9px;padding:9px 14px;font-weight:600;cursor:pointer}',
      '.ask button[disabled]{opacity:.5;cursor:default}',
      '.foot{padding:0 14px 10px;font-size:11px;color:#777;line-height:1.4}',
      '.ts{padding:0 12px}',
      '@media (prefers-reduced-motion:no-preference){.panel{animation:pop .14s ease-out}}',
      '@keyframes pop{from{transform:translateY(6px);opacity:.6}to{transform:none;opacity:1}}',
      '@media (prefers-color-scheme:dark){',
      '.panel{background:#1a1a19;color:#fff;border-color:rgba(255,255,255,.14)}',
      '.desk{background:#2a2a28;color:#fff}',
      '.ask textarea{background:#1a1a19;color:#fff;border-color:rgba(255,255,255,.2)}',
      '.head{border-color:rgba(255,255,255,.12)}.ask{border-color:rgba(255,255,255,.12)}}',
    ].join('');
  }

  function bubble(who, text) {
    var d = document.createElement('div');
    d.className = 'msg ' + (who === 'you' ? 'you' : 'desk');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  // Turnstile, only when a site key is configured. Rendered invisible so a
  // person who is obviously a person never sees a puzzle; Cloudflare shows one
  // only when it wants to.
  function loadTurnstile(cb) {
    if (!cfg || !cfg.turnstile_site_key) { cb(null); return; }
    if (window.turnstile) { cb(window.turnstile); return; }
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = function () { cb(window.turnstile || null); };
    s.onerror = function () { cb(null); };
    document.head.appendChild(s);
  }

  function token(cb) {
    loadTurnstile(function (ts) {
      if (!ts) { cb(null); return; }
      try {
        var slot = root.getElementById('ts');
        if (tsWidget === null) {
          tsWidget = ts.render(slot, {
            sitekey: cfg.turnstile_site_key,
            size: 'flexible',
            callback: function () {},
          });
        }
        ts.reset(tsWidget);
        ts.execute(tsWidget);
        // getResponse resolves once the challenge settles. Poll briefly rather
        // than block: a token we never get just means the reply comes from the
        // help articles instead, which is a worse answer and not an error.
        var tries = 0;
        var t = setInterval(function () {
          var v = null;
          try { v = ts.getResponse(tsWidget); } catch (e) { v = null; }
          if (v || ++tries > 40) { clearInterval(t); cb(v || null); }
        }, 150);
      } catch (e) { cb(null); }
    });
  }

  function send() {
    if (busy) return;
    var text = (input.value || '').trim();
    if (!text) return;
    input.value = '';
    busy = true;
    sendBtn.disabled = true;
    bubble('you', text);
    var thinking = bubble('desk', 'One moment...');

    token(function (tok) {
      fetch(API + '/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId(),
          pageUrl: location.href,
          pageTitle: document.title,
          turnstileToken: tok,
        }),
      })
        .then(function (r) { return r.json().then(function (b) { return { s: r.status, b: b }; }); })
        .then(function (o) {
          busy = false; sendBtn.disabled = false;
          thinking.remove();
          if (o.s !== 200 || !o.b || !o.b.reply) {
            bubble('desk', (o.b && o.b.error) ||
              'I could not reach the desk just now. Please try again, or email us.');
            return;
          }
          setSessionId(o.b.session_id);
          bubble('desk', o.b.reply);
        })
        .catch(function () {
          busy = false; sendBtn.disabled = false;
          thinking.remove();
          bubble('desk', 'I could not reach the desk just now. Please try again, or email us.');
        });
    });
  }

  function openPanel() {
    launcher.style.display = 'none';
    panel.hidden = false;
    input.focus();
    if (!log.childNodes.length) {
      bubble('desk', 'Hello. I can help with pricing, licensing, purchase orders and how the site works. I do not help with quiz or lesson content.');
    }
  }
  function closePanel() {
    panel.hidden = true;
    launcher.style.display = '';
    launcher.focus();
  }

  function build() {
    host = document.createElement('div');
    host.setAttribute('data-apcs-chat', '');
    root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = css();
    root.appendChild(style);

    launcher = document.createElement('button');
    launcher.className = 'launch';
    launcher.type = 'button';
    launcher.textContent = 'Questions?';
    launcher.setAttribute('aria-label', 'Open the front desk');
    root.appendChild(launcher);

    panel = document.createElement('div');
    panel.className = 'panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Front desk');
    panel.innerHTML =
      '<div class="head"><span>Front desk</span>' +
      '<button type="button" id="x" aria-label="Close">&#215;</button></div>' +
      '<div class="log" id="log" aria-live="polite"></div>' +
      '<div class="ts" id="ts"></div>' +
      '<div class="ask"><textarea id="q" rows="1" aria-label="Your question" ' +
      'placeholder="Do you take purchase orders?"></textarea>' +
      '<button type="button" id="send">Ask</button></div>' +
      '<div class="foot">We do not answer quiz or lesson questions here. ' +
      'Nothing you type is used to train anything.</div>';
    root.appendChild(panel);

    log = root.getElementById('log');
    input = root.getElementById('q');
    sendBtn = root.getElementById('send');

    launcher.addEventListener('click', openPanel);
    root.getElementById('x').addEventListener('click', closePanel);
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
    });

    document.body.appendChild(host);
  }

  // Ask the server whether the anonymous path is even on. If it is not, or the
  // API is unreachable, nothing renders and the page is untouched.
  function start() {
    fetch(API + '/api/assistant/chat/config')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c || !c.anon_enabled) return;
        cfg = c;
        build();
      })
      .catch(function () { /* page unaffected */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
