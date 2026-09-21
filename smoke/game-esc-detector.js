'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  MUTATION TEST FOR THE COLLAPSED-esc() DETECTOR.
//
//  A guard that cannot go red is decoration, so every rule it claims is broken
//  here on purpose and the case must be caught INDEPENDENTLY. The two cases that
//  matter most are the ones a simpler detector gets wrong:
//
//   * a map written with Unicode escapes, which IS correct and which a detector
//     comparing raw source text would condemn forever, and
//   * a Unicode escape that decodes back to the bare character, which LOOKS
//     careful and is the same no-op as before.
//
//  Run: node smoke/game-esc-detector.js
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const { classify } = require('../scripts/sweep-game-esc-live');

const SINK = "'<div class=\"nm\">'+esc(e.name||'anon')+'</div>'";
const mk = (map) => 'function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return ' +
  map + '[c]; }); }\n' + SINK;

const U = '\\u0026'; // six source characters, what JavaScript reads as '&'

const cases = [
  ['identity map, the live defect', mk('{\'&\':\'&\',\'<\':\'<\',\'>\':\'>\',\'"\':\'"\'}'), 'BROKEN'],
  ['named entities', mk('{\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'&quot;\'}'), 'SAFE'],
  ['numeric entities', mk('{\'&\':\'&#38;\',\'<\':\'&#60;\',\'>\':\'&#62;\',\'"\':\'&#34;\'}'), 'SAFE'],
  ['unicode-escaped entities, the repair',
    mk(`{'&':'${U}amp;','<':'${U}lt;','>':'${U}gt;','"':'${U}quot;'}`), 'SAFE'],
  ['unicode escapes that decode to the bare character',
    mk('{\'&\':\'\\u0026\',\'<\':\'\\u003c\',\'>\':\'\\u003e\',\'"\':\'\\u0022\'}'), 'BROKEN'],
  ['only < collapsed, everything else correct',
    mk(`{'&':'${U}amp;','<':'<','>':'${U}gt;','"':'${U}quot;'}`), 'BROKEN'],
  ['only & collapsed', mk('{\'&\':\'&\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'&quot;\'}'), 'BROKEN'],
  //  '"' only matters inside an attribute value, and one authored shape here
  //  escapes the other three and never touches quotes. Its output goes into
  //  element text, so that is correct and must not be reported.
  ['no quote mapping, output is element text', mk('{\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\'}'), 'SAFE'],
  ['< missing entirely', mk('{\'&\':\'&amp;\',\'>\':\'&gt;\',\'"\':\'&quot;\'}'), 'BROKEN'],
  ['quote mapped to itself while the rest are right',
    mk('{\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'"\'}'), 'BROKEN'],
  //  The chained-replace shape, which shell-hop carries. Same defect, and the
  //  detector read it as "unparsed" until it was taught this form.
  ['chained replaces, collapsed',
    'function esc(s) {\n  return String(s).replace(/&/g, \'&\').replace(/</g, \'<\').replace(/>/g, \'>\');\n}',
    'BROKEN'],
  ['chained replaces, unicode-escaped entities',
    'function esc(s) {\n  return String(s).replace(/&/g, \'\\u0026amp;\')' +
    '.replace(/</g, \'\\u0026lt;\').replace(/>/g, \'\\u0026gt;\');\n}',
    'SAFE'],
  ['no leaderboard component at all', '<p>a page with no board</p>', 'ABSENT'],
];

let pass = 0; let fail = 0;
for (const [name, body, want] of cases) {
  const got = classify(body);
  const ok = got.state === want;
  ok ? pass++ : fail++;
  console.log((ok ? '  ok   ' : '  FAIL ') + name.padEnd(52) +
    'got=' + got.state + ' want=' + want + (ok ? '' : '  [' + got.broken.join(' ') + ']'));
}

//  The detector must also see the concat sink, because BROKEN without the sink
//  is a dead escaper and BROKEN with it is a live stored XSS.
const withSink = classify(mk('{\'&\':\'&\',\'<\':\'<\',\'>\':\'>\',\'"\':\'"\'}'));
const noSink = classify('function esc(s){ return String(s).replace(/[&<>"]/g, ' +
  'function(c){ return {\'&\':\'&\',\'<\':\'<\',\'>\':\'>\',\'"\':\'"\'}[c]; }); }');
for (const [name, ok] of [
  ['the sink is seen when a row is concatenated', withSink.sink === true],
  ['the sink is not seen when no row is concatenated', noSink.sink === false],
]) { ok ? pass++ : fail++; console.log((ok ? '  ok   ' : '  FAIL ') + name); }

console.log('\n  ' + pass + '/' + (pass + fail) + ' assertions passed.');
if (fail) process.exit(1);
