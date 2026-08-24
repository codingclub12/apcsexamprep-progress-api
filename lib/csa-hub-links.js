'use strict';
// -----------------------------------------------------------------------------
//  AP CSA UNIT HUB: link the coding exercises, and repair the broken CTA block.
//
//  WHY THIS EXISTS
//  Twenty-one CSA exercise pages are live on the storefront and the four unit
//  hub pages link none of them. Measured 2026-08-24 against the Shopify Admin
//  API: the stored body of ap-csa-unit-1-course and ap-csa-unit-2-course
//  contains lesson cards and resource cards and not one href ending in
//  `-exercise-1`. The only path into an exercise today is the accordion nav
//  (lib/csa-nav.js), which is injected on Unit 1 and Unit 4 pages only, so a
//  student working Unit 2 or Unit 3 has no route to a graded exercise at all.
//
//  WHY A GENERATOR AND NOT AN EDIT
//  Same reason as scripts/csp-games-hub-patch.js: these are live pages whose
//  stored bodies this repo is not the source of truth for. Nothing here is
//  typed against a live body. The body goes in, a generated section goes in at
//  ONE anchor, the result is checked against the input, and a sheet comes out.
//
//  WHAT IS AND IS NOT GUESSED
//  The lesson list is PARSED out of the hub body itself rather than restated
//  here, so it cannot drift from the page it is patching. Which exercise pages
//  EXIST is never inferred from a handle pattern: the caller passes the live
//  handle set, queried from the Admin API. A chip for a page that does not
//  exist is worse than no chip, so an unbuilt exercise renders as an inert
//  locked chip, the same lock semantics lib/csa-nav.js already uses.
//
//  THE DEAD LESSON LINKS
//  Measured the same day: the Unit 4 hub links six lesson handles that no page
//  carries any more (4.6 arrays-as-parameters, 4.7 arraylist-introduction, 4.13
//  searching-and-sorting, 4.14 reading-data-from-files, 4.15 using-data-sets,
//  4.17 informal-code-analysis). Those lessons were recontented against the real
//  CED on 2026-08-20 and republished under new handles, and the hub was never
//  updated, so six of its seventeen cards are 404s today. It also means the
//  exercise chips underneath them would all lock for the wrong reason. A dead
//  link is relinked ONLY when the live handle set contains exactly one lesson
//  page for that lesson number: zero or two candidates is a refusal, never a
//  guess.
//
//  THE CTA REPAIR
//  Every hub body carries `\nclass="uN-cta">` where `<div class="uN-cta">`
//  belongs. The opening tag was lost in some earlier edit, so the literal text
//  `class="u1-cta">` renders on the live page and the block's `</div>` closes
//  the wrapper early. It is repaired here rather than in a separate pass
//  because this module already has to account for the resulting div imbalance,
//  and a checker that had to tolerate one unexplained stray close could not
//  then catch a real one.
// -----------------------------------------------------------------------------

// The hub bodies scope every rule to `#uN-hub`. A body scraped from the
// rendered page usually starts at the wrapper and drops the stylesheet, which
// imports cleanly and renders an unstyled page.
function requiredMarkers(p) {
  return ['<style>', `<div id="${p}-hub">`];
}

// Insertion point, tried in order. Exactly one match is required: a section
// placed at a guessed anchor lands somewhere nobody looked.
function anchors(p) {
  return [
    new RegExp(`<div class="${p}-learn">`),
    new RegExp(`<div class="${p}-resources">`),
    new RegExp(`<nav class="${p}-nav">`),
  ];
}

function unitPrefix(body) {
  const hits = [...String(body).matchAll(/<div id="u([1-4])-hub">/g)].map((m) => m[1]);
  const uniq = [...new Set(hits)];
  if (uniq.length !== 1) {
    throw new Error(`expected exactly one <div id="uN-hub"> wrapper, found ${hits.length}`);
  }
  return `u${uniq[0]}`;
}

// Two hub markup models are live, and both are legitimate. Units 1, 2 and 4 use
// a grid of `uN-lesson-card` anchors; Unit 3 uses a list of `uN-topic-row`
// anchors. Measured 2026-08-24: parsing only the first model finds zero lessons
// on the Unit 3 hub, which is exactly the kind of silent nothing this module is
// supposed to refuse rather than ship.
function lessonPatterns(p) {
  return [
    new RegExp(
      `<a class="${p}-lesson-card" href="/pages/([a-z0-9-]+)">[\\s\\S]*?`
      + `<div class="${p}-lesson-num">Lesson ([0-9.]+)</div>[\\s\\S]*?`
      + `<div class="${p}-lesson-title">([^<]*)</div>`,
      'g',
    ),
    new RegExp(
      `<a class="${p}-topic-row[^"]*" href="/pages/([a-z0-9-]+)">[\\s\\S]*?`
      + `<span class="${p}-topic-num">([0-9.]+)</span>[\\s\\S]*?`
      + `<span class="${p}-topic-name">([^<]*)</span>`,
      'g',
    ),
  ];
}

// One entry per lesson actually on the page, in page order.
function parseLessons(body, p) {
  for (const re of lessonPatterns(p)) {
    const out = [];
    for (const m of body.matchAll(re)) {
      out.push({ handle: m[1], id: m[2], title: m[3].trim() });
    }
    if (out.length) return out;
  }
  return [];
}

// scripts/live-pages-dump.js recovers a body from the RENDERED page, which is
// the right tool for reading a page and the wrong input for patching one: it
// trims by div balance and the storefront serves the broken CTA opener with its
// `>` escaped. Patching that and importing the result would ship a body
// reconstructed from a render. Measured on the live Unit 1 and Unit 2 hubs.
function assertNotRendered(body, p) {
  if (body.indexOf(`class="${p}-cta"&gt;`) !== -1) {
    throw new Error('this body came from a rendered page, not from the Admin API: the broken CTA '
      + 'opener is entity-escaped. Fetch the stored Body HTML instead.');
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// The generated markup is pure ASCII. The live pages use raw arrows and check
// marks; numeric character references render identically and keep this file
// inside the house rule on prose characters.
const ARROW = '&#8594;';
const LOCK = '&#128274;';

function chip(p, ex) {
  const base = 'display:inline-block!important;font-size:12px!important;font-weight:700!important;'
    + 'padding:4px 10px!important;border-radius:999px!important;margin:0 6px 6px 0!important;'
    + 'text-decoration:none!important;';
  if (!ex.built) {
    return `<span style="${base}background:#f1f5f9!important;color:#94a3b8!important;`
      + '-webkit-text-fill-color:#94a3b8!important;cursor:not-allowed!important;'
      + `border:1px solid #e2e8f0!important;" title="Not built yet">${LOCK} ${esc(ex.label)}</span>`;
  }
  return `<a href="/pages/${ex.handle}" style="${base}background:#fffbeb!important;`
    + 'color:#92400e!important;-webkit-text-fill-color:#92400e!important;'
    + `border:1px solid #fcd34d!important;">${esc(ex.label)} ${ARROW}</a>`;
}

// A lesson row renders even when nothing under it is built. Unbuilt work is
// visibly present and visibly not-yet-available, never hidden, matching the
// accordion nav's precedent.
function row(p, lesson) {
  const chips = lesson.exercises.map((ex) => chip(p, ex)).join('');
  return '<div style="display:flex!important;align-items:baseline!important;gap:12px!important;'
    + 'flex-wrap:wrap!important;padding:10px 0!important;border-bottom:1px solid #f1f5f9!important;">'
    + '<span style="font-size:13px!important;font-weight:700!important;color:#92400e!important;'
    + `-webkit-text-fill-color:#92400e!important;min-width:52px!important;">${esc(lesson.id)}</span>`
    + '<span style="font-size:14px!important;color:#475569!important;'
    + `-webkit-text-fill-color:#475569!important;flex:1 1 200px!important;">${esc(lesson.title)}</span>`
    + `<span style="flex:0 0 auto!important;">${chips}</span>`
    + '</div>';
}

function section(p, lessons, builtCount) {
  return `<div class="${p}-exercises" style="margin-bottom:40px!important;">`
    + `<h2 class="${p}-section-title">Coding Exercises</h2>`
    + '<p style="font-size:14px!important;color:#475569!important;'
    + '-webkit-text-fill-color:#475569!important;line-height:1.6!important;margin:0 0 14px!important;">'
    + 'Write real Java in the browser and submit it. Every exercise is graded against hidden '
    + 'test cases, and your score reports to your teacher automatically. '
    + `${builtCount} of ${lessons.length} are open so far; the rest unlock as they are built.</p>`
    + '<div style="background:#fff!important;border:2px solid #e5e7eb!important;'
    + 'border-radius:10px!important;padding:6px 16px!important;">'
    + lessons.map((l) => row(p, l)).join('')
    + '</div></div>';
}

// The stray `class="uN-cta">` and its matching `</div>`. Repairing the open tag
// is a one-div swing that check() is told to expect; leaving it alone would
// mean tolerating an imbalance forever.
function fixCta(body, p) {
  // Anchored at the start of a line, which is exactly where the live breakage
  // sits. A looser match also hits the `<div class="uN-cta">` of an already
  // repaired body and doubles the tag.
  const broken = new RegExp(`(^|\\r?\\n)[ \\t]*class="${p}-cta">`, 'g');
  const hits = [...body.matchAll(broken)];
  if (!hits.length) return { body, fixed: 0 };
  if (hits.length > 1) {
    throw new Error(`the broken CTA opener appears ${hits.length} times; refusing to guess`);
  }
  return { body: body.replace(broken, `$1<div class="${p}-cta">`), fixed: 1 };
}

function check(inBody, outBody, p, lessons, ctaFixed, relinked) {
  const problems = [];
  if (!outBody.trim()) problems.push('the output body is empty, which would wipe the live page');
  if (Buffer.byteLength(outBody) < Buffer.byteLength(inBody)) {
    problems.push('the output is SMALLER than the input, so something was lost rather than added');
  }
  const links = (s) => new Set(s.match(/\/pages\/[a-z0-9-]+/g) || []);
  const before = links(inBody);
  const after = links(outBody);
  // A relinked dead handle is supposed to disappear. Everything else is not.
  const intended = new Set((relinked || []).map((r) => `/pages/${r.from}`));
  const lost = [...before].filter((l) => !after.has(l) && !intended.has(l));
  for (const r of (relinked || [])) {
    if (!after.has(`/pages/${r.to}`)) problems.push(`${r.id} was relinked to ${r.to}, which is not in the output`);
    if (after.has(`/pages/${r.from}`)) problems.push(`${r.id} still links the dead handle ${r.from}`);
  }
  if (lost.length) problems.push(`${lost.length} existing link(s) disappeared: ${lost.slice(0, 4).join(', ')}`);

  for (const l of lessons) {
    for (const ex of l.exercises) {
      if (!ex.built) continue;
      if (outBody.indexOf(`/pages/${ex.handle}`) === -1) problems.push(`${ex.handle} is not linked in the output`);
    }
  }
  // A locked chip must never carry an href: a link to a page that does not
  // exist is the exact failure this section is meant to prevent.
  for (const l of lessons) {
    for (const ex of l.exercises) {
      if (ex.built) continue;
      if (outBody.indexOf(`/pages/${ex.handle}`) !== -1) problems.push(`${ex.handle} does not exist but is linked`);
    }
  }

  const opens = (s) => (s.match(/<div[\s>]/g) || []).length;
  const closes = (s) => (s.match(/<\/div>/g) || []).length;
  const expected = (opens(inBody) + ctaFixed) - closes(inBody);
  const actual = opens(outBody) - closes(outBody);
  if (actual !== expected) {
    problems.push(`div balance moved by ${actual - expected} beyond what the insert and the CTA repair account for`);
  }
  if (ctaFixed && outBody.indexOf(`<div class="${p}-cta">`) === -1) {
    problems.push('the CTA repair did not land');
  }
  // eslint-disable-next-line no-control-regex
  const nonAscii = section(p, lessons, 0).match(/[^\x09\x0A\x0D\x20-\x7E]/g);
  if (nonAscii) problems.push(`the generated section has ${nonAscii.length} non-ASCII char(s)`);
  return problems;
}

// A lesson page for this lesson number that actually exists. Exercise handles
// are excluded: `...-exercise-1` is not a candidate for the lesson link.
function lessonCandidates(id, liveHandles) {
  const prefix = `ap-csa-lesson-${String(id).replace(/\./g, '-')}-`;
  return [...liveHandles].filter((h) => h.startsWith(prefix) && !/-exercise-\d+$/.test(h));
}

// liveHandles: a Set of page handles that ACTUALLY exist on the storefront.
// Queried, never inferred. An empty set is legal and renders every chip locked.
function build(inBody, liveHandles) {
  if (!(liveHandles instanceof Set)) {
    throw new Error('the live handle set is required; query it from the Admin API rather than assuming');
  }
  const p = unitPrefix(inBody);
  const missing = requiredMarkers(p).filter((m) => inBody.indexOf(m) === -1);
  if (missing.length) {
    throw new Error(`this is not the stored hub body, it is missing ${missing.join(', ')}. `
      + 'Fetch it from the Shopify Admin API rather than from the rendered page.');
  }
  if (inBody.indexOf(`class="${p}-exercises"`) !== -1) {
    throw new Error('this body already carries an exercises section; re-run against the pre-patch body');
  }
  assertNotRendered(inBody, p);
  const parsed = parseLessons(inBody, p);
  if (!parsed.length) {
    throw new Error('no lessons were found in this body under either hub markup model');
  }

  // Relink before the exercise handles are derived, or the six recontented
  // Unit 4 lessons would lock chips whose pages are live.
  const relinked = [];
  let body0 = inBody;
  const parsedFixed = parsed.map((l) => {
    if (liveHandles.has(l.handle)) return l;
    const cand = lessonCandidates(l.id, liveHandles);
    if (cand.length === 0) return { ...l, dead: true };
    if (cand.length > 1) {
      throw new Error(`lesson ${l.id} links a handle no page carries and ${cand.length} pages could be it `
        + `(${cand.join(', ')}); confirm which one is live rather than guessing`);
    }
    relinked.push({ id: l.id, from: l.handle, to: cand[0] });
    body0 = body0.split(`/pages/${l.handle}"`).join(`/pages/${cand[0]}"`);
    return { ...l, handle: cand[0] };
  });

  const lessons = parsedFixed.map((l) => ({
    ...l,
    exercises: [
      { label: 'Exercise 1', handle: `${l.handle}-exercise-1`, built: liveHandles.has(`${l.handle}-exercise-1`) },
      { label: 'Exercise 2', handle: `${l.handle}-exercise-2`, built: liveHandles.has(`${l.handle}-exercise-2`) },
    ],
  }));
  const builtCount = lessons.filter((l) => l.exercises.some((e) => e.built)).length;

  const hit = anchors(p).map((re) => ({ re, n: (body0.match(new RegExp(re.source, 'g')) || []).length }))
    .find((a) => a.n === 1);
  if (!hit) throw new Error('no single unambiguous anchor was found in this body; refusing to guess a location');

  const at = body0.search(hit.re);
  let body = body0.slice(0, at) + section(p, lessons, builtCount) + body0.slice(at);
  const cta = fixCta(body, p);
  body = cta.body;

  return {
    body,
    unit: p,
    lessons,
    builtCount,
    relinked,
    ctaFixed: cta.fixed,
    problems: check(inBody, body, p, lessons, cta.fixed, relinked),
  };
}

module.exports = {
  build, section, row, chip, parseLessons, lessonPatterns, lessonCandidates, unitPrefix,
  fixCta, check, requiredMarkers, anchors, assertNotRendered,
};
