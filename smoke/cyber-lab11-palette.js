'use strict';
// ---------------------------------------------------------------------------
//  MUTATION TEST FOR scripts/fix-cyber-lab11-palette.js
//
//      npm run smoke:lab11palette
//
//  The generator rewrites a LIVE page body, so the only thing standing between
//  it and a damaged storefront page is its own refusals. This breaks each of
//  those refusals on purpose and requires the generator to say no, and to say no
//  FOR THE RULE BEING TESTED. A suite that goes red for a different reason is
//  telling you the rule you meant to test is hollow, which is why every case
//  here matches the specific message rather than just asserting a refusal.
//
//  Two of these already earned their place:
//
//    - The first "is there a <style> block" guard PASSED a body whose widget
//      style block had been removed, because a second style block (the activity
//      nav) was still there and the generator happily wrote the palette into it.
//      The guard now looks for the block that holds the widget's own rules.
//    - The first mutation for that case replaced <style> with <stylex>, which
//      /<style[^>]*>/ matches perfectly well. That was a bad mutation rather
//      than a hollow guard, and it read exactly like a real failure. A mutation
//      that does not actually mutate is the quietest way to get a green run
//      that means nothing.
//
//  Zero PII: the fixture is a public storefront page body. Pure ASCII source.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { transform, parseCsv, PALETTE } = require('../scripts/fix-cyber-lab11-palette.js');

const FIXTURE = path.join(__dirname, 'fixtures', 'ap-cyber-unit-1-lesson-1-lab.admin-body.html');
const GOOD = fs.readFileSync(FIXTURE, 'utf8');

const CASES = [
  {
    name: 'control: the real pre-fix body transforms cleanly',
    body: GOOD,
    accept: true,
  },
  {
    name: 'a body that is not this page',
    body: GOOD.replace('id="cyber-lab-11"', 'id="cyber-lab-99"'),
    expect: /does not carry the #cyber-lab-11 wrapper/,
  },
  {
    name: 'the style block holding the widget rules is gone, a second block remains',
    body: GOOD.replace('<style>', '<span>'),
    expect: /no <style> block in this body contains #cyber-lab-11 rules/,
  },
  {
    name: 'the style opener carries attributes, so the block must still be found',
    body: GOOD.replace('<style>', '<style media="all">'),
    accept: true,
  },
  {
    name: 'the fix has already landed, so running again must refuse',
    body: GOOD.replace('<style>', '<style>#cyber-lab-11{--purple:#6B21A8;}'),
    expect: /already defines/,
  },
  {
    name: 'the body reads a property the palette does not supply',
    body: GOOD.replace('color:var(--purple)!important;text-decoration:underline',
      'color:var(--nope)!important;text-decoration:underline'),
    expect: /reads --nope/,
  },
  {
    name: 'the palette supplies a property the body no longer reads',
    body: GOOD.replace('#cyber-lab-11 .check-btn:hover{background:var(--purple-mid)!important;}',
      '#cyber-lab-11 .check-btn:hover{background:#7C3AED!important;}'),
    expect: /supplies --purple-mid/,
  },
];

let fail = 0;
console.log('\n  mutation cases');
for (const c of CASES) {
  const r = transform(c.body);
  if (c.accept) {
    if (r.problems) { console.log('    FAIL  %s\n            refused: %s', c.name, r.problems.join('; ')); fail++; }
    else console.log('    ok    %s', c.name);
    continue;
  }
  if (!r.problems) {
    console.log('    FAIL  %s\n            ACCEPTED a body it must refuse. The rule is hollow.', c.name);
    fail++;
  } else if (!r.problems.some((p) => c.expect.test(p))) {
    console.log('    FAIL  %s\n            refused for the wrong reason: %s', c.name, r.problems.join('; '));
    fail++;
  } else console.log('    ok    %s', c.name);
}

//  The edit itself, asserted rather than eyeballed.
console.log('\n  the edit');
const r = transform(GOOD);
if (r.problems) { console.log('    FAIL  the fixture does not transform: ' + r.problems.join('; ')); fail++; }
else {
  const usedAfter = new Set([...r.after.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map((m) => m[1]));
  const defAfter = new Set([...r.after.matchAll(/(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g)].map((m) => m[1]));
  const leftUndefined = [...usedAfter].filter((u) => !defAfter.has(u));
  const check = (ok, msg) => { if (ok) console.log('    ok    ' + msg); else { console.log('    FAIL  ' + msg); fail++; } };

  check(leftUndefined.length === 0, 'every property the page reads now resolves');
  check(Object.keys(PALETTE).every((p) => defAfter.has(p)), 'all ten palette properties are declared');
  check(r.after.includes(GOOD.slice(0, 2000)) && r.after.endsWith(GOOD.slice(-2000)),
    'the original body is carried through untouched at both ends');
  //  The defect in one assertion: white text needs a background that is not white.
  check(/\.check-btn\{[^}]*background:var\(--purple\)/.test(r.after.replace(/\s+/g, '')) === false
    || defAfter.has('--purple'), 'the check button background now has a value');
  check(!/[^\x00-\x7F]/.test(r.after.slice(r.after.indexOf('PALETTE'), r.after.indexOf('PALETTE') + 700)),
    'the inserted block is pure ASCII');
}

//  The CSV reader is used by the generator's own parse-back check, so it has to
//  be worth something. A reader that cannot round-trip a quoted comma and a bare
//  newline would report success on a sheet that splits into the wrong columns.
console.log('\n  csv round trip');
{
  const hard = 'a,"b"" , with a quote and comma","line\nbreak"';
  const rows = parseCsv('"h1","h2","h3"\r\n' + hard + '\r\n');
  const ok = rows.length === 2
    && rows[0].join('|') === 'h1|h2|h3'
    && rows[1][1] === 'b" , with a quote and comma'
    && rows[1][2] === 'line\nbreak';
  if (ok) console.log('    ok    quoted commas, escaped quotes and embedded newlines survive');
  else { console.log('    FAIL  parseCsv mangles a hard row: ' + JSON.stringify(rows)); fail++; }
}

console.log(fail ? `\n  ${fail} FAILED\n` : '\n  all green\n');
process.exit(fail ? 1 : 0);
