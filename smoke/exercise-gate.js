#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  lib/cyber-exercise-gate.js: the two judgement calls it makes, tested.
//
//  Most of that module is structural and the per-page sabotage suites exercise
//  it end to end. Two pieces are not structural, and both were written in
//  response to something that went wrong:
//
//  1. AMBIGUOUS WORDS. The Unit 2 tactics are ordinary English. On Exercise 1 a
//     credited option read "Authority (impersonating a trusted figure in
//     power)", which is the tactic taught as vocabulary and is the defect. On
//     Exercise 2 a feedback string reads "Sarah M. is new CFO (authority
//     source)", which is the ordinary noun and is fine. The first version of
//     the check was a substring match and flagged the second, which would have
//     driven an edit to prose that was not broken.
//
//  2. KEYWORD LISTS MAY GROW, NEVER SHRINK. Free-text answers are scored by
//     matching against a keyword array. Dropping an accepted keyword silently
//     marks down every student who used that word, and nothing on the page
//     shows it happened.
//
//  Offline: no network, no secrets, no browser.
// -----------------------------------------------------------------------------

const assert = require('assert');
const g = require('../lib/cyber-exercise-gate');

let failures = 0;
function check(name, fn) {
  try { fn(); console.log(`  ok    ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}`); console.log(`        ${e.message.split('\n')[0]}`); }
}

console.log('exercise gate judgement calls\n');

// ---- 1. ambiguous words -----------------------------------------------------
const TAUGHT = [
  'Authority (impersonating a trusted figure in power)',
  'Scarcity (limited resource creating pressure)',
  'authority (the Unit 2 tactic)',
  'Pretexting (building a false narrative)',
];
const ORDINARY = [
  'Sarah M. is new CFO (authority source)',
  'Travel timing + missed invoice + CFO authority = most effective combination',
  'appearing to come from the new CFO who has authority to request payment',
  'The scarcity of qualified staff made the request plausible',
];

for (const s of TAUGHT) {
  check(`taught as vocabulary is caught: ${JSON.stringify(s.slice(0, 46))}`, () => {
    assert.ok(g.namesLegacyTerm(s), 'should have been flagged');
  });
}
for (const s of ORDINARY) {
  check(`ordinary English is not: ${JSON.stringify(s.slice(0, 46))}`, () => {
    assert.strictEqual(g.namesLegacyTerm(s), null, `wrongly flagged as ${g.namesLegacyTerm(s)}`);
  });
}

// ---- 2. the unambiguous ones match anywhere ---------------------------------
check('a legacy taxonomy term is caught mid-sentence', () => {
  assert.strictEqual(
    g.namesLegacyTerm('Correct. Spear phishing with accurate personal details.'),
    'spear phishing');
});
check('and so is one inside a longer clause', () => {
  assert.ok(g.namesLegacyTerm('classify it as voice cloning, or vishing on a phone call'));
});
check('CED vocabulary is never flagged', () => {
  for (const s of ['AI phishing built on AI reconnaissance', 'An AI deepfake of the CFO',
    'Data poisoning of the training set', 'A pre-arranged shared secret',
    'AI malware that rewrites its own code']) {
    assert.strictEqual(g.namesLegacyTerm(s), null, `wrongly flagged: ${s}`);
  }
});

// ---- 3. keyword lists may grow, never shrink --------------------------------
const page = (keys) => `<select id="s1"><option value="">-</option>
<option value="a">Alpha</option><option value="b">Beta</option></select>
<script>var v=document.getElementById('s1').value;
if(v==='a'){pts++;}
var why=document.getElementById('t1').value;
var n=tCount(why,[${keys.map((k) => `'${k}'`).join(',')}]);
</script><textarea id="t1"></textarea>`;

check('adding an accepted keyword is a note, not a failure', () => {
  const r = g.check(page(['osint', 'detail']), page(['osint', 'recon', 'detail']));
  assert.strictEqual(r.fail.length, 0, r.fail.join('; '));
  assert.ok(r.note.some((n) => n.includes('now also accepts: recon')), r.note.join(' | '));
});
check('dropping an accepted keyword FAILS', () => {
  const r = g.check(page(['osint', 'recon', 'detail']), page(['osint', 'detail']));
  assert.ok(r.fail.some((f) => f.includes('dropped accepted answers: recon')), r.fail.join('; '));
});
check('losing a whole keyword list FAILS', () => {
  const before = page(['osint', 'detail']);
  const after = before.replace(/var n=tCount\([^;]*;/, '');
  const r = g.check(before, after);
  assert.ok(r.fail.some((f) => f.includes('keyword list count changed')), r.fail.join('; '));
});

// ---- 3b. variable bindings are positional, not global -----------------------
//  Found by running the gate on the Topic 1.4 lab. These pages declare a fresh
//  `var t` inside each `if(n===N){...}` block, so one page bound `t` to
//  s1-technique, s2-technique and s4-techniques in turn. A name-to-element map
//  keeps only the last, which attributed `t==='spear'` to a TEXTAREA at the
//  bottom of the page and reported two perfectly good keys as ungettable. A
//  gate that cries wolf on a sound page is worse than no gate: it gets ignored.
check('a name rebound in a later block does not steal an earlier comparison', () => {
  const html = `
    <select id="s1-tech"><option value="">-</option><option value="spear">A</option><option value="ai">B</option></select>
    <select id="s2-tech"><option value="">-</option><option value="deep">C</option><option value="ai">D</option></select>
    <textarea id="s4-free"></textarea>
    <script>
      if(n===1){ var t=document.getElementById('s1-tech').value; if(t==='spear'){pts+=2;} }
      if(n===2){ var t=document.getElementById('s2-tech').value; if(t==='deep'){pts+=2;} }
      if(n===4){ var t=document.getElementById('s4-free').value.trim(); }
    </script>`;
  const got = g.credited(html).map((k) => `${k.select}=${k.value}`);
  assert.deepStrictEqual(got, ['s1-tech=spear', 's2-tech=deep'],
    `attributed to the wrong elements: ${got.join(' ')}`);
  const r = g.check(html, html);
  assert.ok(!r.fail.some((f) => f.includes('UNGETTABLE')),
    `reported a sound page as broken: ${r.fail.join('; ')}`);
});

// ---- 4. the known gap, recorded so nobody assumes the check is exhaustive ---
check('KNOWN GAP: a mid-sentence teaching use with no gloss is not caught', () => {
  //  This is a limitation, not a bug. Tightening the pattern to catch it would
  //  flag "CFO authority" and drive edits to prose that is fine, which is the
  //  worse failure. The human position audit stays the real measurement.
  assert.strictEqual(g.namesLegacyTerm('The attacker exploited authority'), null,
    'if this now returns a term the check was tightened, which is fine: update this test '
    + 'and re-audit the pages for false positives before trusting it');
});

// ---- 5. an ungettable key is the headline failure ---------------------------
check('a credited value naming no option FAILS', () => {
  const before = page(['osint']);
  const after = before.replace("v==='a'", "v==='z'");
  const r = g.check(before, after);
  assert.ok(r.fail.some((f) => f.includes('UNGETTABLE')), r.fail.join('; '));
});

console.log('');
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log('all checks passed');
