'use strict';
// Assertions from Task A, run against the transformed nav block.

const { STEP_LABELS, stepTargets, LEGACY_HANDLES, findNavBlock } = require('./lib-nav.js');
const { STEP_RE } = require('./transform-nav.js');

function classOpenCount(html) {
  return (html.match(/class="[^"]*\bopen\b[^"]*"/g) || []).length;
}

function containerInner(html, n) {
  const re = new RegExp(`<(span|div)\\b[^>]*\\bid="ucn-s${n}"[^>]*>`, 'i');
  const m = re.exec(html);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const scan = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
  scan.lastIndex = m.index + m[0].length;
  let depth = 1;
  let x;
  while ((x = scan.exec(html)) !== null) {
    if (x[0][1] === '/') {
      depth--;
      if (depth === 0) return { tag, inner: html.slice(m.index + m[0].length, x.index) };
    } else depth++;
  }
  return null;
}

function assertNav(oldBody, newBody, handle) {
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass, detail: detail || '' });

  const oldNb = findNavBlock(oldBody);
  const nb = findNavBlock(newBody);
  if (!nb) { ok('nav block present', false); return results; }
  const nav = nb.html;

  // 1. five lesson anchors, five step containers
  const lAnchors = (nav.match(/id="ucn-l[1-5]"/g) || []).length;
  const sConts = (nav.match(/id="ucn-s[1-5]"/g) || []).length;
  ok('1. 5 ucn-lN anchors and 5 ucn-sN containers', lAnchors === 5 && sConts === 5, `l=${lAnchors} s=${sConts}`);

  // 2 + 3. twenty-five steps, each slot holding its canonical target
  let total = 0;
  let currents = 0;
  const slotProblems = [];
  for (let n = 1; n <= 5; n++) {
    const c = containerInner(nav, n);
    if (!c) { slotProblems.push(`s${n} missing`); continue; }
    if (c.tag !== 'div') slotProblems.push(`s${n} container is <${c.tag}>, expected <div>`);
    const targets = stepTargets(n);
    let i = 0;
    let m;
    STEP_RE.lastIndex = 0;
    while ((m = STEP_RE.exec(c.inner)) !== null) {
      const [, tagName, attrs, isCurrent] = m;
      if (i > 4) { slotProblems.push(`s${n} extra step`); break; }
      if (isCurrent) {
        currents++;
        if (tagName.toLowerCase() !== 'span') slotProblems.push(`s${n}/${STEP_LABELS[i]} current is <${tagName}>`);
      } else {
        const hm = /href="([^"]*)"/.exec(attrs);
        const want = `/pages/${targets[i]}`;
        if (tagName.toLowerCase() !== 'a') slotProblems.push(`s${n}/${STEP_LABELS[i]} is <${tagName}>, expected <a>`);
        else if (!hm || hm[1] !== want) slotProblems.push(`s${n}/${STEP_LABELS[i]} href=${hm ? hm[1] : 'none'} want ${want}`);
      }
      i++;
      total++;
    }
    if (i !== 5) slotProblems.push(`s${n} has ${i} steps`);
  }
  ok('2. exactly 25 steps', total === 25, `got ${total}`);
  ok('3. every slot holds its canonical target (current self-marks its own cell)', slotProblems.length === 0, slotProblems.join('; '));

  // 4. l3 / l4 destinations
  const l3 = /<a\b[^>]*id="ucn-l3"[^>]*>/.exec(nav);
  const l4 = /<a\b[^>]*id="ucn-l4"[^>]*>/.exec(nav);
  const l3ok = l3 && /href="\/pages\/ap-cybersecurity-unit-1-wireless-security"/.test(l3[0]);
  const l4ok = l4 && /href="\/pages\/ap-cybersecurity-unit-1-ai-driven-threats"/.test(l4[0]);
  ok('4. ucn-l3 -> wireless-security, ucn-l4 -> ai-driven-threats', !!(l3ok && l4ok));

  // 5. no legacy handles
  const surviving = LEGACY_HANDLES.filter((h) => nav.includes(h));
  ok('5. zero legacy handles', surviving.length === 0, surviving.join(', '));

  // 6. no greyed-out styling left (whitespace-insensitive)
  const greyed = (nav.match(/opacity:\s*0\.4/gi) || []).length;
  ok('6. zero opacity:0.4 in nav', greyed === 0, `got ${greyed}`);

  // 7. at most one span step, and it must be the current marker
  const spanSteps = (nav.match(/<span\b[^>]*\bclass="ucn-step( current)?"/g) || []);
  const nonCurrentSpans = spanSteps.filter((s) => !s.includes('current')).length;
  ok('7. at most one span step, carrying current', spanSteps.length <= 1 && nonCurrentSpans === 0,
    `spanSteps=${spanSteps.length} nonCurrent=${nonCurrentSpans}`);

  // 8. open count preserved
  const oldOpen = classOpenCount(oldNb.html);
  const newOpen = classOpenCount(nav);
  ok('8. open count unchanged', oldOpen === newOpen, `${oldOpen} -> ${newOpen}`);

  // 9. everything outside the nav block is byte-identical
  const oldOutside = oldBody.slice(0, oldNb.start) + oldBody.slice(oldNb.end);
  const newOutside = newBody.slice(0, nb.start) + newBody.slice(nb.end);
  ok('9. body outside nav byte-identical', oldOutside === newOutside,
    oldOutside === newOutside ? '' : `len ${oldOutside.length} vs ${newOutside.length}`);

  return results;
}

module.exports = { assertNav, classOpenCount };
