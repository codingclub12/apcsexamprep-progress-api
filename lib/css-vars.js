'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A CSS CUSTOM PROPERTY THAT NOTHING DEFINES, AND THE ONE CASE THAT HIDES A
//  BUTTON.
//
//  ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//  On 2026-09-03 a teacher reported that the Check buttons on the AP Cyber 1.1
//  lab were invisible. The page read ten custom properties and declared none of
//  them. An undefined var() is invalid at COMPUTED-VALUE time, and the part that
//  surprises people is what that does: the whole declaration is dropped, not
//  just the colour. So
//
//      .check-btn{ background:var(--purple); color:#ffffff;
//                  -webkit-text-fill-color:#ffffff; }
//
//  kept both white-text declarations and lost its background, on a card that is
//  .lab-section{background:#ffffff}. White on white. Five of the six buttons on
//  that page could not be seen, the four that grade an email and the one that
//  leads to the quiz, so 27 of 32 students in one class had no lab score and
//  nothing anywhere threw, logged or failed.
//
//  Nothing in this repo could see it. The page serves 200, parses, passes the
//  mojibake guard, passes the em-dash rule, and every string a verifier looks
//  for is present. The defect is entirely in what the browser does with a name
//  it cannot resolve.
//
//  ── THE TWO FINDINGS, AND WHY THEY ARE NOT THE SAME FINDING ─────────────────
//  `unresolvable()` is the broad, cheap fact: this page reads a name nothing on
//  it defines. That is drift and belongs at P2, because most of the time it
//  costs a border or a tint that nobody has missed.
//
//  `invisibleText()` is the narrow, expensive one: a rule paints very light text
//  and its own background came from a name that does not resolve. Light text is
//  only ever authored against a dark background, so a rule that asks for white
//  text and then loses its background is making something unreadable. That is
//  the 1.1 lab exactly, and it is P0 rather than P2 because the student cannot
//  see that anything is wrong.
//
//  ── THE FALSE POSITIVE THIS CHECK IS BUILT AROUND ───────────────────────────
//  `var(--x, #fff)` HAS A FALLBACK and resolves perfectly well whether or not
//  --x exists. A check that counts every var() reference reports those as
//  broken, and the theme uses them, so the first honest version of this rule
//  would have been noise on the majority of the site. Only a reference with no
//  fallback can take its declaration down, and only those are counted here.
//
//  The other direction is deliberately permissive: "defined" is gathered from
//  the WHOLE page rather than from the scope the use sits in. A property defined
//  on some unrelated selector therefore counts as resolvable, which can hide a
//  real scope bug. That is the trade taken on purpose. Being wrong in this
//  direction stays quiet; being wrong in the other prints a P0 every night for a
//  page that is fine, and site-crawl.js is explicit that a noisy check buries
//  the real one underneath it.
//
//  Zero PII: public page markup only. Pure ASCII, no em-dashes, per convention.
// ─────────────────────────────────────────────────────────────────────────────

//  Everything inside <style> elements, which is where authored page CSS lives on
//  this store. Inline style="" attributes are deliberately NOT read: they cannot
//  carry a custom property definition that another rule depends on, and reading
//  them would mean parsing every attribute on a 400KB page for no finding.
function styleBlocks(html) {
  return Array.from(String(html || '').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)).map((m) => m[1]);
}

//  A reference with NO fallback. The capture stops at the delimiter so a comma
//  can be told from a close paren, and only the close-paren form is returned.
//  This is the whole difference between a rule that is worth having and one that
//  reports the theme's own defensive var(--x, default) as broken.
function usedWithoutFallback(css) {
  const out = new Set();
  for (const m of String(css || '').matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
    if (m[2] === ')') out.add(m[1]);
  }
  return out;
}

//  Every reference, fallback or not. Used only for reporting context.
function usedAny(css) {
  return new Set(Array.from(String(css || '').matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)).map((m) => m[1]));
}

//  A definition has the property on its own left-hand side. The leading boundary
//  is what keeps `var(--x)` from reading as a definition of --x.
function definedIn(css) {
  return new Set(Array.from(String(css || '').matchAll(/(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g)).map((m) => m[1]));
}

//  Custom properties this page reads with no fallback and never defines. A name
//  in here cannot resolve: nothing anywhere in the document supplies it.
function unresolvable(html) {
  const css = styleBlocks(html).join('\n');
  if (!css) return [];
  const def = definedIn(css);
  return [...usedWithoutFallback(css)].filter((v) => !def.has(v)).sort();
}

// ── COLOUR, ONLY AS FAR AS "IS THIS NEARLY WHITE" ────────────────────────────
//  Not a colour library. The question is narrow: would this text vanish if the
//  thing behind it stayed the page's own light background. Anything this cannot
//  parse returns null and the rule declines to fire, which is the right way for
//  a check like this to fail.
const NAMED = { white: [255, 255, 255], ivory: [255, 255, 240], snow: [255, 250, 250], ghostwhite: [248, 248, 255] };

function rgbOf(value) {
  const v = String(value || '').trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return [0, 1, 2].map((i) => parseInt(m[1][i] + m[1][i], 16));
  m = v.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [1, 2, 3].map((i) => Number(m[i]));
  return null;
}

//  Relative luminance, sRGB. 1 is white.
function luminance(rgb) {
  const f = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}

//  Rules as {selector, decls}. The body pattern excludes braces, so the inner
//  rules of an @media block match individually and the at-rule prelude simply
//  never matches on its own. That is enough for this question and avoids
//  carrying a CSS parser.
function rules(css) {
  const out = [];
  //  Comments are stripped FIRST, and the reason is the report rather than the
  //  parse: a section banner sits immediately above the rule it labels, so the
  //  selector captured for .check-btn came out as the banner and the selector
  //  glued together and every finding read as two lines of noise.
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    const decls = [];
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i === -1) continue;
      decls.push({ prop: d.slice(0, i).trim().toLowerCase(), value: d.slice(i + 1).trim() });
    }
    if (decls.length) out.push({ selector, decls });
  }
  return out;
}

//  Strip !important and comments so a value can be compared.
function bare(value) {
  return String(value || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/!\s*important/gi, '').trim();
}

//  Does this value depend on a name that cannot resolve? Only a fallback-less
//  reference counts, for the reason in the header.
function dependsOnMissing(value, missing) {
  for (const m of String(value || '').matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])/g)) {
    if (m[2] === ')' && missing.has(m[1])) return m[1];
  }
  return null;
}

//  THE NARROW ONE. A rule that paints very light text and whose own winning
//  background declaration was dropped because it named something unresolvable.
//
//  "Winning" means the LAST such declaration in the rule, which is what the
//  cascade takes. That matters and is not pedantry: a declaration invalid at
//  computed-value time is applied as unset rather than skipped, so an earlier
//  perfectly good `background:#fff` does not survive a later broken one.
const LIGHT = 0.75;

function invisibleText(html) {
  const css = styleBlocks(html).join('\n');
  if (!css) return [];
  const missing = new Set(unresolvable(html));
  if (!missing.size) return [];

  const out = [];
  for (const r of rules(css)) {
    let textColour = null;
    let bg = null;
    for (const d of r.decls) {
      if (d.prop === 'color' || d.prop === '-webkit-text-fill-color') {
        const rgb = rgbOf(bare(d.value));
        //  A colour that is itself a var() tells us nothing about brightness, so
        //  the rule declines rather than guesses.
        if (rgb) textColour = { rgb, value: bare(d.value) };
      }
      if (d.prop === 'background' || d.prop === 'background-color') bg = d;
    }
    if (!textColour || !bg) continue;
    if (luminance(textColour.rgb) < LIGHT) continue;
    const culprit = dependsOnMissing(bare(bg.value), missing);
    if (!culprit) continue;
    out.push({
      selector: r.selector,
      property: culprit,
      color: textColour.value,
      background: bare(bg.value),
    });
  }
  return out;
}

//  The crawl's finding shape. Kinds are registered in lib/site-crawl.js like
//  every other check; this module decides only what is true.
function check(html) {
  const out = [];
  const missing = unresolvable(html);
  if (!missing.length) return out;

  const hidden = invisibleText(html);
  for (const h of hidden) {
    out.push({
      kind: 'css-var-invisible-text',
      detail: `${h.selector} paints ${h.color} text and its background is ${h.background}, which does not resolve`,
      evidence: `${h.selector} { background:${h.background}; color:${h.color} }  ${h.property} is never defined`,
    });
  }

  //  Reported once for the page rather than once per property, because these
  //  arrive in families: one missing palette block is ten names, and ten lines a
  //  night for one defect is how a report stops being read.
  out.push({
    kind: 'css-var-undefined',
    detail: `${missing.length} custom propert${missing.length === 1 ? 'y is' : 'ies are'} read with no fallback and never defined`,
    evidence: missing.join(' '),
  });
  return out;
}

module.exports = {
  styleBlocks, usedWithoutFallback, usedAny, definedIn, unresolvable,
  rules, rgbOf, luminance, invisibleText, dependsOnMissing, check, LIGHT,
};
