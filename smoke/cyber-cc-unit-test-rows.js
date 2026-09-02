'use strict';
// ---------------------------------------------------------------------------
//  SMOKE: two rows go in, and NOTHING ELSE ON A LIVE TEACHER PAGE MOVES.
//
//  The Cyber Command Center body is 68,654 characters and is one script: the
//  entitlement gate, the unit pacing, the renderers, the resource list. The edit
//  is two lines of data inside it. So the property worth testing is not "did the
//  rows appear", it is "did anything else change", and the guard is one
//  comparison: remove the inserted block from the result and you must get the
//  original back, byte for byte.
//
//  Offline. Fixtures mirror the real body's shape, including the trap that
//  matters: MORE THAN ONE array ends with the same close, so an anchor on the
//  close alone lands in the wrong place.
//
//  Run: npm run smoke:ccrows
//  Pure ASCII source: emoji come from code points. No em-dashes.
// ---------------------------------------------------------------------------
const { addRows, verify, toCsv, rows, HEADER, COMMAND } = require('../scripts/cyber-cc-unit-test-rows');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const CLIP = String.fromCodePoint(0x1F4CB);
const PIN = String.fromCodePoint(0x1F4C5);
const FOLDER = '1nVxjKSNwZLUVayeEl8qAGW21IWI8Xl0j';

//  Shaped like the real body: an earlier array that ALSO ends in `/view" },` so
//  a careless anchor has somewhere wrong to land, then RESOURCES, then the
//  renderer that must survive untouched.
const BODY = [
  '<div id="actc-wrap"></div>',
  '<script>',
  '  var F = "https://drive.google.com/file/d/", D = CFG.DRIVE;',
  '  var DECOY = [',
  '    { ico:"' + PIN + '", label:"Decoy", href:F+"0000000000000000000000/view" },',
  '  ];',
  '  var RESOURCES = [',
  '    { ico:"' + CLIP + '", label:"Start Here", href:F+"1AAAAAAAAAAAAAAAAAAAAA/view" },',
  '    { ico:"' + PIN + '", label:"Pacing Guide: Full Year", href:F+"1BBBBBBBBBBBBBBBBBBBBB/view" },',
  '    { ico:"' + PIN + '", label:"Pacing Guide: Block", href:F+"1CCCCCCCCCCCCCCCCCCCCC/view" },',
  '    { ico:"' + CLIP + '", label:"Rubric", href:F+"1DDDDDDDDDDDDDDDDDDDDD/view" },',
  '    { ico:"' + PIN + '", label:"Threat Report", href:F+"1EEEEEEEEEEEEEEEEEEEEE/view" },',
  '  ];',
  '  function renderResources(){ return RESOURCES.length; }',
  '</script>',
].join('\n');

console.log('\n1. The rows go in, at the end of RESOURCES and not the decoy');
{
  const r = addRows(BODY, FOLDER);
  ok('  it changed something', r.changed && !r.error, r);
  ok('  both rows are present', /Unit Tests: Teacher Bundle/.test(r.after)
    && /Unit Test Answer Keys: Teacher Bundle/.test(r.after));
  ok('  they landed inside RESOURCES, not the decoy array',
    r.after.indexOf('Unit Tests: Teacher Bundle') > r.after.indexOf('var RESOURCES'), r.cut);
  ok('  the decoy array is untouched',
    (r.after.match(/label:"Decoy"/g) || []).length === 1
    && r.after.indexOf('Decoy') < r.after.indexOf('var RESOURCES'));
  ok('  RESOURCES now holds seven rows',
    (r.after.slice(r.after.indexOf('var RESOURCES'),
      r.after.indexOf('function renderResources')).match(/\{\s*ico:/g) || []).length === 7);
}

console.log('\n2. THE GUARD: remove the insertion and you get the original back');
{
  const r = addRows(BODY, FOLDER);
  ok('  verify accepts the honest result', verify(BODY, r.after, FOLDER).length === 0,
    verify(BODY, r.after, FOLDER));

  //  The failure this is really for: a rewrite that also reformats, or drops a
  //  character somewhere far from the edit.
  const squeezed = r.after.replace('  function renderResources', ' function renderResources');
  ok('  a one-space change elsewhere in the body is refused',
    verify(BODY, squeezed, FOLDER).length > 0);
  ok('  and it points at the first differing byte',
    /first difference at byte \d+/.test(verify(BODY, squeezed, FOLDER).join(' ')),
    verify(BODY, squeezed, FOLDER));

  const lostRenderer = r.after.replace('function renderResources', 'function renderResourcesX');
  ok('  losing the renderer is refused', verify(BODY, lostRenderer, FOLDER).length > 0);

  const otherRow = r.after.replace('label:"Rubric"', 'label:"Rubrick"');
  ok('  editing an existing resource row is refused',
    verify(BODY, otherRow, FOLDER).length > 0);

  ok('  the unchanged body is refused, since nothing was inserted',
    verify(BODY, BODY, FOLDER).length > 0);
}

console.log('\n3. The icon is one the page already had, so no new glyph ships');
{
  const r = addRows(BODY, FOLDER);
  const glyphs = (t) => new Set(t.match(/[\u{1F300}-\u{1FAFF}]/gu) || []);
  const added = [...glyphs(r.after)].filter((g) => !glyphs(BODY).has(g));
  ok('  no emoji glyph is introduced that the page did not already use',
    added.length === 0, added);
  ok('  exactly two icon instances were added',
    (r.after.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length
    - (BODY.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length === 2);

  //  A body that never used the clipboard must not silently gain one.
  const noClip = BODY.split(CLIP).join(PIN);
  ok('  and verify refuses when the icon is NOT already on the page',
    verify(noClip, addRows(noClip, FOLDER).after, FOLDER).length > 0);
}

console.log('\n4. Both rows point at the folder that was given, and nowhere else');
{
  const r = addRows(BODY, FOLDER);
  const hrefs = (r.after.match(/href:D\+"([^"]+)"/g) || []);
  ok('  two folder-prefixed hrefs were added', hrefs.length === 2, hrefs);
  ok('  both carry the folder id given', hrefs.every((h) => h.includes(FOLDER)), hrefs);
  ok('  and they use the FOLDER prefix D, not the file prefix F',
    !rows(FOLDER).includes('href:F+'), rows(FOLDER));
}

console.log('\n5. Refusals');
{
  ok('  a malformed Drive id is refused', !!addRows(BODY, 'nope').error);
  ok('  an empty Drive id is refused', !!addRows(BODY, '').error);
  ok('  a body with no RESOURCES array is refused',
    !!addRows('<script>var X = 1;</script>', FOLDER).error);
  const twice = addRows(addRows(BODY, FOLDER).after, FOLDER);
  ok('  running it twice adds nothing', !twice.changed && /already there/.test(twice.reason), twice);
  ok('  and returns the body unchanged', twice.after === addRows(BODY, FOLDER).after);
}

console.log('\n6. The sheet');
{
  const r = addRows(BODY, FOLDER);
  const csv = toCsv('cyber-command-center', r.after);
  ok('  the header is Handle, Command, Body HTML only',
    JSON.stringify(HEADER) === JSON.stringify(['Handle', 'Command', 'Body HTML']), HEADER);
  ok('  no Published At column, which is the safer default', !csv.includes('Published At'));
  ok('  the command is MERGE', COMMAND === 'MERGE' && csv.includes('"MERGE"'));
  ok('  it opens with a BOM', csv.charCodeAt(0) === 0xFEFF);
  ok('  rows are CRLF terminated', /\r\n$/.test(csv));
  ok('  the body cell is not blank, which would wipe the page',
    /,"<div id="".*/.test(csv.split('\r\n')[1]) || csv.split('\r\n')[1].length > 200);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
