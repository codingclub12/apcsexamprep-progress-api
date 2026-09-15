'use strict';
// ---------------------------------------------------------------------------
//  MUTATION TEST FOR scripts/cyber-lab-denominator-csv.js
//
//      npm run smoke:cyberlabdenom
//
//  The generator rewrites TEN LIVE PAGE BODIES and ships them as a MERGE sheet,
//  which overwrites a live body with no undo. The only thing between it and a
//  damaged storefront page is its own refusals, so each refusal is broken here
//  on purpose and the generator has to say no FOR THE RULE BEING TESTED. A case
//  that goes red on a different message is telling you the rule you meant to
//  test is hollow, which is why every case matches its own wording.
//
//  TWO FAMILIES OF CASE, because the generator has two families of rule.
//
//  BODY RULES run before the substitution and a real page can violate them, so
//  they are tested by mutating the fixture. The fixture is the live body of
//  ap-cyber-unit-2-lesson-1-lab, the 2.1 Lab whose column is the one Tanner
//  screenshotted at 483 percent. Each of these must produce EXACTLY ONE
//  message: they return early, and a case that produces two is a case that is
//  tripping something other than the rule it names.
//
//  SUBSTITUTION RULES run after, and with the index splice the generator uses
//  they cannot fail, which would make them decoration. They are reachable
//  because the substitution is injectable: each case below passes a saboteur
//  through opts.substitute. That is what will catch the next person who reaches
//  for a regex here, and it is the reason those rules are allowed to count.
//
//  THE MOJIBAKE CASE INJECTS SINGLE-PASS CORRUPTION, not double. CLAUDE.md is
//  explicit about why: a mutation built from the double-pass form goes green
//  against a detector that is blind to the single-pass bug actually seen on
//  live pages, and that green report is worse than no report. The bullet below
//  is U+2022 read as cp1252 and re-encoded once.
//
//  Zero PII: one public storefront page body. Pure ASCII source, no em-dashes.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const gen = require('../scripts/cyber-lab-denominator-csv.js');
const { transform, defaultSubstitute, parseCsv, BAD, GOOD, KEEP } = gen;

const FIXTURE = path.join(__dirname, 'fixtures', 'ap-cyber-unit-2-lesson-1-lab.live-body.html');
const LIVE = fs.readFileSync(FIXTURE, 'utf8');
const H = 'ap-cyber-unit-2-lesson-1-lab';

//  U+2022 BULLET as UTF-8 bytes read back through cp1252. One pass, not two.
//  Built from code points on purpose. Writing the characters themselves would
//  put real mojibake in this file and turn smoke:encoding red on the repo scan,
//  which is how the hazard note that TEACHES mojibake ended up corrupted.
const SINGLE_PASS_BULLET = String.fromCharCode(0x00e2, 0x20ac, 0x00a2);

function breakJsonLd(body) {
  return body.replace(/(<script[^>]*application\/ld\+json[^>]*>)/, '$1,');
}

const BODY_CASES = [
  {
    name: 'control: the real 2.1 Lab body rewrites cleanly',
    body: LIVE,
    accept: true,
  },
  {
    name: 'the running denominator is written twice',
    body: LIVE.replace(BAD, BAD + ';' + BAD),
    expect: /appears 2 time\(s\), expected exactly 1/,
  },
  {
    name: 'the page does not carry the running denominator at all',
    body: LIVE.replace(BAD, "document.getElementById('score-display').textContent=te"),
    expect: /appears 0 time\(s\), expected exactly 1/,
  },
  {
    name: 'a half fixed page, where the good line is already present beside the bad one',
    body: LIVE.replace(BAD, GOOD + ';' + BAD),
    expect: /the fix is already in this body/,
  },
  {
    name: 'the completion test is a different shape, so comp may mean something else here',
    body: LIVE.replace(KEEP, 'if(comp>=totalSteps)'),
    expect: /the completion test is not in the shape this was written for/,
  },
  {
    name: 'totalPts is not declared, so the fix would throw a ReferenceError',
    body: LIVE.replace('var totalPts=30', 'var TP=30'),
    expect: /totalPts is not declared in this body/,
  },
  {
    name: 'totalSteps is not declared, so the page total cannot be cross checked',
    body: LIVE.replace('var totalSteps=6', 'var TS=6'),
    expect: /totalSteps is not declared in this body/,
  },
  {
    name: 'the page prices itself at a total the steps do not add up to',
    body: LIVE.replace('var totalPts=30', 'var totalPts=24'),
    expect: /totalPts 24 is not 5 times totalSteps 6/,
  },
  {
    name: 'totalPts is declared below the line that would use it',
    body: LIVE.replace('var totalPts=30', 'var TP=30').replace(BAD, BAD + ';var totalPts=30'),
    expect: /totalPts is declared after the line being fixed/,
  },
  {
    name: 'totalPts is declared in a different script block',
    body: LIVE.replace('var totalPts=30', 'var TP=30').replace('<script', '<script>var totalPts=30;</script><script'),
    expect: /totalPts and the fixed line are in different script blocks/,
  },
];

const SABOTAGE_CASES = [
  {
    name: 'the substitution also adds a byte somewhere else',
    substitute: (body, at) => defaultSubstitute(body, at) + ' ',
    expect: /changed by more bytes than the substitution/,
  },
  {
    name: 'the substitution edits text before the fixed line',
    substitute: (body, at) => 'x' + defaultSubstitute(body, at).slice(1),
    expect: /the text before the fixed line moved/,
  },
  {
    name: 'the substitution edits text after the fixed line',
    substitute: (body, at) => { const s = defaultSubstitute(body, at); return s.slice(0, -1) + 'x'; },
    expect: /the text after the fixed line moved/,
  },
  {
    name: 'the substitution leaves the running denominator in place',
    substitute: (body) => body,
    expect: /the running denominator is still in the result/,
  },
  {
    name: 'a regex replace writes the fixed line more than once',
    substitute: (body, at) => defaultSubstitute(body, at).replace(GOOD, GOOD + ';' + GOOD),
    expect: /the fixed line is not in the result exactly once/,
  },
  {
    name: 'the substitution takes the completion test with it',
    substitute: (body, at) => defaultSubstitute(body, at).replace(KEEP, 'if(comp>totalSteps)'),
    expect: /the completion test count changed/,
  },
  {
    name: 'the substitution breaks the results panel total',
    substitute: (body, at) => defaultSubstitute(body, at)
      .replace("getElementById('r-score').textContent=te+'/'+totalPts",
               "getElementById('r-score').textContent=te+'/'+comp"),
    expect: /r-score no longer renders the real total/,
  },
  {
    name: 'the substitution leaves a script block that does not compile',
    substitute: (body, at) => defaultSubstitute(body, at).replace(GOOD, GOOD + ';var x=;'),
    expect: /a script block does not compile/,
  },
  {
    name: 'the substitution breaks the JSON-LD block',
    substitute: (body, at) => breakJsonLd(defaultSubstitute(body, at)),
    expect: /JSON-LD does not parse/,
  },
  {
    name: 'the substitution carries single pass mojibake into the body',
    substitute: (body, at) => defaultSubstitute(body, at)
      .replace('<div', '<div data-note="' + SINGLE_PASS_BULLET.repeat(3) + '"'),
    expect: /mojibake in the result/,
  },
];

let fail = 0;
const check = (ok, msg) => { if (ok) console.log('    ok    ' + msg); else { console.log('    FAIL  ' + msg); fail++; } };

console.log('\n  body rules, tested by mutating the live 2.1 Lab body');
for (const c of BODY_CASES) {
  const r = transform(H, c.body);
  if (c.accept) {
    check(r.fail.length === 0 && typeof r.out === 'string',
      c.name + (r.fail.length ? ' -> ' + r.fail.join('; ') : ''));
    continue;
  }
  const hit = r.fail.some((f) => c.expect.test(f));
  const only = r.fail.length === 1;
  check(hit && only, c.name + ' -> ' + (r.fail.join('; ') || 'ACCEPTED, which is the failure'));
}

console.log('\n  substitution rules, tested by sabotaging the substitution itself');
for (const c of SABOTAGE_CASES) {
  const r = transform(H, LIVE, { substitute: c.substitute });
  const hit = r.fail.some((f) => c.expect.test(f));
  check(hit, c.name + ' -> ' + (r.fail.join('; ') || 'ACCEPTED, which is the failure'));
}

//  WHAT THE FIX IS FOR, asserted on the real body rather than described.
//  The page's own expression is pulled out of the body and evaluated, so this
//  is the page's arithmetic and not a restatement of it.
console.log('\n  the grade the reporter would record, before and after');
{
  const after = transform(H, LIVE).out;
  const exprOf = (body) => {
    const m = body.match(/getElementById\('score-display'\)\.textContent=([^;]+)/);
    return m[1];
  };
  const display = (body, te, comp) =>
    // eslint-disable-next-line no-new-func
    new Function('te', 'comp', 'totalPts', 'totalSteps', 'return ' + exprOf(body))(te, comp, 30, 6);

  //  parseScore, re-implemented from the deployed asset rather than imported.
  const parseScore = (text) => {
    const m = String(text).replace(/\s+/g, ' ').trim()
      .match(/(-?\d{1,3})\s*(?:\/|\bout\s+of\b|\bof\b)\s*(\d{1,3})/i);
    if (!m) return null;
    const earned = parseInt(m[1], 10), possible = parseInt(m[2], 10);
    if (possible <= 0 || earned < 0 || earned > possible) return null;
    return { earned, possible };
  };
  const pctOf = (body, te, comp) => {
    const p = parseScore(display(body, te, comp));
    return p ? Math.round(p.earned / p.possible * 100) : null;
  };

  //  Two of six steps done perfectly. The lab is out of 30 either way.
  check(pctOf(LIVE, 10, 2) === 100, 'before: two steps of six at full marks records 100 percent');
  check(pctOf(after, 10, 2) === 33, 'after: the same run records 33 percent');
  check(String(display(LIVE, 10, 2)) === '10 / 10', 'before: the student is shown 10 / 10');
  check(String(display(after, 10, 2)) === '10 / 30', 'after: the student is shown 10 / 30');

  //  A finished run must be untouched, or this change would move real grades.
  let same = true;
  for (let te = 0; te <= 30; te++) if (pctOf(LIVE, te, 6) !== pctOf(after, te, 6)) same = false;
  check(same, 'a finished run records exactly what it recorded before, for every score 0 to 30');
}

console.log('\n  csv round trip, which the parse-back check leans on');
{
  const hard = 'a,"b"" , with a quote and comma","line\nbreak"';
  const rows = parseCsv(gen.BOM + '"h1","h2","h3"\r\n' + hard + '\r\n');
  const ok = rows.length === 2
    && rows[0].join('|') === 'h1|h2|h3'
    && rows[1][1] === 'b" , with a quote and comma'
    && rows[1][2] === 'line\nbreak';
  check(ok, 'quoted commas, escaped quotes, a BOM and embedded newlines survive');
}

console.log(fail ? `\n  ${fail} FAILED\n` : `\n  all green (${BODY_CASES.length} body rules, ${SABOTAGE_CASES.length} substitution rules)\n`);
process.exit(fail ? 1 : 0);
