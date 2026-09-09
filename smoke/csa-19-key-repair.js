'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the 1.9-cfu-1 key repair, proven per refusal.
//
//  The generator sends 91,573 bytes of live page body back up to change one of
//  them. MERGE has no undo, so what has to be trustworthy is not the edit, it is
//  the claim that nothing else moved. Every refusal is broken here on its own.
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. Seven rules overlap on the same body,
//  and requiring only "it refused" proves nothing: six of them would refuse a
//  body that had lost everything. Each case below names the refusal it expects.
//
//  Two rules are provable with INPUT alone, and those are done that way rather
//  than by patching the source, because a test that feeds the real function a
//  real bad body is worth more than one that breaks the function.
//
//  OFFLINE. The baseline is imports/2026-09-09/csa-19-live-body.json, the body
//  as fetched before the import. It is a frozen fixture, not current live state:
//  Shopify reformats HTML on save, so after the import the live body will differ
//  and that is expected.
//
//    node smoke/csa-19-key-repair.js     # npm run smoke:csa19key
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const Module = require('module');
const gen = require('../scripts/csa-19-cfu1-key-repair-csv.js');

const SRC = path.join(__dirname, '..', 'scripts', 'csa-19-cfu1-key-repair-csv.js');
let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  ok    ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (x === undefined ? '' : '  -> ' + JSON.stringify(x))); }
};
const section = (t) => console.log('\n' + t);

if (!fs.existsSync(gen.SNAP)) {
  console.error('missing baseline ' + gen.SNAP + '; run the generator once to record it');
  process.exit(1);
}
const LIVE = JSON.parse(fs.readFileSync(gen.SNAP, 'utf8'))[gen.HANDLE];
const said = (r, frag) => r.problems.some((p) => p.includes(frag));

section('1. The real body builds, and the build is what it claims');
const good = gen.build(LIVE);
ok('1.1 no problems on the recorded live body', good.problems.length === 0, good.problems);
ok('1.2 exactly one byte shorter', good.out.length === LIVE.length - 1);
ok('1.3 the padded key is gone', !good.out.includes(gen.BROKEN));
ok('1.4 the repaired key is present', good.out.includes(gen.FIXED));
ok('1.5 the sheet is one header and one data row',
  gen.sheet(good.out).split('\r\n').filter((l) => l.length).length === 2);
ok('1.6 the sheet carries MERGE', gen.parseBack(gen.sheet(good.out)).Command === 'MERGE');
ok('1.7 the parsed body round trips byte for byte',
  gen.parseBack(gen.sheet(good.out))['Body HTML'] === good.out);

section('2. Refusals provable with input alone');
//  Already repaired: running this sheet again would be a MERGE that changes
//  nothing, which is still a live overwrite.
const already = LIVE.replace(gen.BROKEN, gen.FIXED);
ok('2.1 refuses a body with no padded key',
  said(gen.build(already), 'expected exactly one padded key'), gen.build(already).problems);
//  Two padded keys is a different job: this generator edits one site by index.
const twice = LIVE.replace('data-answer="A"', gen.BROKEN);
ok('2.2 refuses a body with two padded keys',
  said(gen.build(twice), 'expected exactly one padded key'), gen.build(twice).problems);
//  The padding moved to a question this task is not about.
const elsewhere = LIVE.replace('data-item-id="' + gen.ITEM + '"', 'data-item-id="1.9-cfu-9"');
ok('2.3 refuses when the padded key is not on ' + gen.ITEM,
  said(gen.build(elsewhere), 'is not on ' + gen.ITEM), gen.build(elsewhere).problems);

// -- Mutation testing ----------------------------------------------------------
function mutate(find, replace) {
  const src = fs.readFileSync(SRC, 'utf8');
  if (!src.includes(find)) return null;
  const m = new Module(SRC, null);
  m.filename = SRC;
  m.paths = Module._nodeModulePaths(path.dirname(SRC));
  m._compile(src.replace(find, replace), SRC);
  return m.exports;
}

const MUTATIONS = [
  {
    name: 'the repair writes a DIFFERENT letter',
    why: 'the one mistake worse than the bug. D is a wrong answer marked correct, '
       + 'and it is one keystroke from the right fix.',
    find: "const FIXED = 'data-answer=\"C\"';",
    replace: "const FIXED = 'data-answer=\"D\"';",
    expect: 'the set or order of answer keys changed',
  },
  {
    name: 'the padding is kept',
    why: 'a repair that does not repair. Length and key set both still look right, '
       + 'so only the padded check notices.',
    find: "const FIXED = 'data-answer=\"C\"';",
    replace: "const FIXED = 'data-answer=\"\\nC\"';",
    expect: 'expected a one byte reduction',
  },
  {
    name: 'the edit lands but something else moves with it',
    why: 'the /pages/join shape: an import that quietly takes a section out. The '
       + 'byte count is what sees it, not any semantic check.',
    find: '  const out = live.slice(0, at) + FIXED + live.slice(at + BROKEN.length);',
    replace: '  const out = (live.slice(0, at) + FIXED + live.slice(at + BROKEN.length))\n'
           + "    .replace('<h3>', '');",
    expect: 'expected a one byte reduction',
  },
  {
    name: 'the sheet emitter stops escaping quotes',
    why: 'the parse-back rule, and the reason generation is not evidence that '
       + 'generation worked. The body is full of quoted attributes.',
    find: "const cell = (s) => '\"' + String(s == null ? '' : s).replace(/\"/g, '\"\"') + '\"';",
    replace: "const cell = (s) => '\"' + String(s == null ? '' : s) + '\"';",
    //  Refuses at the parse itself, not at the body comparison: unescaped quotes
    //  break the cell boundaries, so the reader sees more than two rows rather
    //  than two rows that disagree. Asserted on the message it ACTUALLY emits,
    //  after the first draft of this case expected the wrong one and passed the
    //  mutation while proving nothing.
    expect: 'did not parse back as one data row',
  },
  {
    name: 'the sheet ships as a page CREATE instead of a MERGE',
    why: 'not a refusal this generator had until the round trip read the command '
       + 'back. A wrong command word is invisible in the body and changes what '
       + 'Matrixify does with the row.',
    find: "  lines.push([HANDLE, 'MERGE', bodyHtml].map(cell).join(','));",
    replace: "  lines.push([HANDLE, 'NEW', bodyHtml].map(cell).join(','));",
    expect: 'parsed command is NEW',
  },
];

section('3. Mutation: each refusal is load-bearing');
for (const mu of MUTATIONS) {
  const broken = mutate(mu.find, mu.replace);
  ok('3.' + mu.name + ' [applied]', broken !== null);
  if (!broken) continue;
  const r = broken.build(LIVE);
  ok('3.' + mu.name + ' [refuses, on its own rule]',
    r.problems.length > 0 && said(r, mu.expect), r.problems);
}

section('4. The unmutated generator still passes, after all that patching');
ok('4.1 the real module is untouched', gen.build(LIVE).problems.length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
