#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION BATTERY FOR lib/css-vars.js: break each rule on purpose, one at a
//  time, and require the behaviour it guards to change.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK, and here that is the exit code
//  rather than a slogan. Each case below states a PROBE: a small page and the
//  answer the unmutated module gives for it. The probe is first asserted against
//  the real module, so a case cannot pass by being wrong about the baseline.
//  Then the source is patched and the same probe must give a DIFFERENT answer.
//  A probe that survives its own mutation is reporting a rule that does nothing.
//
//  ── WHY THE SOURCE IS PATCHED RATHER THAN THE INPUT ─────────────────────────
//  tools/ap-cyber-ced/validator-mutation.js corrupts the INPUT, which is right
//  for a validator whose rules are about content. The rules here are decisions
//  in code: whether a fallback counts, whether the last background wins, whether
//  a comment is stripped before a selector is read. None of those can be reached
//  by editing a page, so the mutation has to reach the module.
//
//  Every patch is asserted to actually apply. A find string that silently misses
//  after a refactor would make this file report a clean run over a module it
//  never mutated, which is the exact failure the battery exists to prevent.
//
//  Offline: no network, no secrets, nothing written outside the temp directory.
//
//  Run: npm run smoke:cssvarsmutation
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC = path.join(__dirname, '..', 'lib', 'css-vars.js');
const SOURCE = fs.readFileSync(SRC, 'utf8');
const real = require('../lib/css-vars');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('    ok    ' + name); }
  else { fail++; console.log('    FAIL  ' + name + (extra !== undefined ? '\n            ' + JSON.stringify(extra) : '')); }
};

//  Load a patched copy as a real module, from a temp file so require() resolves
//  its own relative paths the same way the original would.
let seq = 0;
function loadMutated(source) {
  const p = path.join(os.tmpdir(), `css-vars-mut-${process.pid}-${seq++}.js`);
  fs.writeFileSync(p, source);
  try {
    delete require.cache[require.resolve(p)];
    return require(p);
  } finally {
    try { fs.unlinkSync(p); } catch (e) { /* the module is already loaded */ }
  }
}

const styled = (css) => `<html><body><style>${css}</style></body></html>`;

const CASES = [
  {
    rule: 'a var() with a fallback resolves and is not a finding',
    find: "    if (m[2] === ')') out.add(m[1]);",
    replace: '    out.add(m[1]);',
    //  Unmutated: silent, because the fallback makes the declaration valid.
    probe: (CV) => CV.unresolvable(styled('#w .b{background:var(--purple, #6B21A8);color:#fff;}')).length,
    expect: 0,
  },
  {
    rule: 'only LIGHT text counts as invisible',
    find: '    if (luminance(textColour.rgb) < LIGHT) continue;',
    replace: '    if (false) continue;',
    //  Unmutated: dark text over a dropped background is drift, not a P0.
    probe: (CV) => CV.invisibleText(styled('#w .b{background:var(--tint);color:#1E1B4B;}')).length,
    expect: 0,
  },
  {
    rule: 'comments are stripped before a selector is read',
    find: "  const clean = String(css || '').replace(/\\/\\*[\\s\\S]*?\\*\\//g, ' ');",
    replace: "  const clean = String(css || '');",
    //  Unmutated: the selector is the selector, not the banner above it.
    probe: (CV) => {
      const f = CV.invisibleText(styled('/* ===== BUTTONS ===== */\n#w .b{background:var(--p);color:#fff;}'));
      return f.length ? f[0].selector : '(none)';
    },
    expect: '#w .b',
  },
  {
    rule: 'the LAST background declaration is the one that wins',
    find: "      if (d.prop === 'background' || d.prop === 'background-color') bg = d;",
    replace: "      if ((d.prop === 'background' || d.prop === 'background-color') && !bg) bg = d;",
    //  Unmutated: a later broken background beats an earlier good one, because a
    //  declaration invalid at computed-value time is applied as unset.
    probe: (CV) => CV.invisibleText(styled('#w .b{background:#6B21A8;background:var(--p);color:#ffffff;}')).length,
    expect: 1,
  },
  {
    rule: 'a definition is the property on its own left-hand side, not a use',
    find: "  return new Set(Array.from(String(css || '').matchAll(/(?:^|[;{\\s])(--[A-Za-z0-9_-]+)\\s*:/g)).map((m) => m[1]));",
    replace: "  return new Set(Array.from(String(css || '').matchAll(/(--[A-Za-z0-9_-]+)\\s*[:)]/g)).map((m) => m[1]));",
    //  Unmutated: reading var(--purple) does not define --purple.
    probe: (CV) => CV.unresolvable(styled('#w .b{background:var(--purple);color:#fff;}')).join(','),
    expect: '--purple',
  },
  {
    rule: 'the broad finding is one line per page, not one per property',
    find: "  out.push({\n    kind: 'css-var-undefined',",
    replace: "  for (const _each of missing) out.push({\n    kind: 'css-var-undefined',",
    //  Unmutated: three missing names is still one finding.
    probe: (CV) => CV.check(styled('#w .b{background:var(--a);border-color:var(--b);outline-color:var(--c);}'))
      .filter((f) => f.kind === 'css-var-undefined').length,
    expect: 1,
  },
];

console.log('\n  baseline: the real module answers each probe as the case claims');
for (const c of CASES) {
  const got = c.probe(real);
  ok(c.rule, JSON.stringify(got) === JSON.stringify(c.expect), { expected: c.expect, got });
}

console.log('\n  mutations: each must change the answer its rule protects');
for (const c of CASES) {
  if (!SOURCE.includes(c.find)) {
    fail++;
    console.log('    FAIL  ' + c.rule
      + '\n            the mutation target is not in lib/css-vars.js any more, so this'
      + '\n            case has been silently testing nothing. Update the find string.');
    continue;
  }
  const mutated = loadMutated(SOURCE.replace(c.find, c.replace));
  let got;
  try { got = c.probe(mutated); } catch (e) { got = 'threw: ' + e.message; }
  const changed = JSON.stringify(got) !== JSON.stringify(c.expect);
  ok(c.rule, changed, changed ? undefined : { stillAnswers: got, meaning: 'the rule is hollow' });
}

console.log(fail
  ? `\n  ${fail} FAILED, ${pass} passed. A rule that survives its mutation is not a rule.\n`
  : `\n  all ${pass} passed: every rule fires, and every rule can be broken\n`);
process.exit(fail ? 1 : 0);
