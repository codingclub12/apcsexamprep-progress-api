'use strict';
// Task A: normalize the ucnav block. Edits are spliced in by index so that every
// byte outside the edited attribute/element stays exactly as it was.

const { TOPICS, STEP_LABELS, stepTargets, findNavBlock } = require('./lib-nav.js');

// Matches a step element: an <a> or a <span>, class exactly "ucn-step" or
// "ucn-step current". Deliberately does NOT match the "ucn-steps" container.
const STEP_RE = /<(a|span)\b([^>]*\bclass="ucn-step( current)?"[^>]*)>([\s\S]*?)<\/\1>/gi;

// Finds the close tag matching an open tag of the same name, honouring nesting.
function matchingClose(html, openEnd, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
  re.lastIndex = openEnd;
  let depth = 1;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0) return { start: m.index, end: m.index + m[0].length };
    } else {
      depth++;
    }
  }
  return null;
}

// Replaces the value of one attribute inside a single tag string.
function setAttr(tagStr, name, value) {
  const re = new RegExp(`(\\b${name}=")([^"]*)(")`);
  if (!re.test(tagStr)) throw new Error(`attribute ${name} not found in: ${tagStr}`);
  return tagStr.replace(re, `$1${value}$3`);
}

function transformNav(navHtml, notes) {
  let out = navHtml;

  // Work through lessons 5..1 so earlier splices do not shift later indices.
  for (let n = 5; n >= 1; n--) {
    // --- the ucn-sN steps container ---
    const contOpenRe = new RegExp(`<(span|div)\\b([^>]*\\bid="ucn-s${n}"[^>]*)>`, 'i');
    const cm = contOpenRe.exec(out);
    if (!cm) throw new Error(`ucn-s${n} container not found`);
    const contTag = cm[1].toLowerCase();
    const contOpenStart = cm.index;
    const contOpenEnd = cm.index + cm[0].length;
    const close = matchingClose(out, contOpenEnd, contTag);
    if (!close) throw new Error(`unmatched close for ucn-s${n}`);

    const inner = out.slice(contOpenEnd, close.start);
    const targets = stepTargets(n);

    // Rewrite the five steps positionally.
    let slot = 0;
    const newInner = inner.replace(STEP_RE, (full, tagName, attrs, isCurrent, label) => {
      const i = slot++;
      if (i > 4) {
        notes.push(`WARN: ucn-s${n} has more than 5 steps`);
        return full;
      }
      if (isCurrent) {
        // A5: intentional self-marking. Leave the element exactly as-is.
        notes.push(`current kept at s${n}/${STEP_LABELS[i]}`);
        return full;
      }
      if (/opacity:\s*0\.4/i.test(attrs)) notes.push(`revived s${n}/${STEP_LABELS[i]}`);
      return `<a href="/pages/${targets[i]}" class="ucn-step">${label}</a>`;
    });
    if (slot !== 5) throw new Error(`ucn-s${n} had ${slot} steps, expected 5`);

    // A4: span container becomes a div, matched close tag included.
    let openTag = cm[0];
    let closeTag = out.slice(close.start, close.end);
    if (contTag === 'span') {
      openTag = openTag.replace(/^<span\b/i, '<div');
      closeTag = '</div>';
      notes.push(`s${n} container span -> div`);
    }

    out = out.slice(0, contOpenStart) + openTag + newInner + closeTag + out.slice(close.end);

    // --- the ucn-lN lesson anchor ---
    const lessonRe = new RegExp(`<a\\b[^>]*\\bid="ucn-l${n}"[^>]*>`, 'i');
    const lm = lessonRe.exec(out);
    if (!lm) throw new Error(`ucn-l${n} anchor not found`);
    let lessonTag = lm[0];
    const before = lessonTag;
    if (n === 3 || n === 4) {
      lessonTag = setAttr(lessonTag, 'href', `/pages/${TOPICS[n].lesson}`);
      lessonTag = setAttr(lessonTag, 'title', TOPICS[n].title);
    } else if (n === 5) {
      lessonTag = setAttr(lessonTag, 'title', TOPICS[5].title);
    }
    if (lessonTag !== before) notes.push(`l${n} anchor rewritten`);
    out = out.slice(0, lm.index) + lessonTag + out.slice(lm.index + lm[0].length);
  }

  return out;
}

function transformBody(body, notes) {
  const nb = findNavBlock(body);
  if (!nb) throw new Error('no ucnav block');
  const newNav = transformNav(nb.html, notes);
  return {
    body: body.slice(0, nb.start) + newNav + body.slice(nb.end),
    oldNav: nb.html,
    newNav,
    navStart: nb.start,
    navEnd: nb.end,
  };
}

module.exports = { transformBody, transformNav, STEP_RE };
