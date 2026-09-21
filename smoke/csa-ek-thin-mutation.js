'use strict';
// -----------------------------------------------------------------------------
//  MUTATION TESTING FOR smoke/csa-ek-thin.js. Board 373.
//
//      node smoke/csa-ek-thin-mutation.js [--snapshots <dir>]
//
//  A GREEN MUTATION RUN IS A FAILED CHECK. Each case damages the rewritten body
//  in one specific way and the gate must go red FOR THAT REASON: every case
//  asserts on the text of the refusal, because a case going red for a different
//  rule is telling you the rule you meant to test is hollow. Two guards in this
//  repo were found hollow that way and a third the day after.
//
//  The two cases worth reading are 2 and 3. The comparator in the gate, canon(),
//  normalizes whitespace next to tags, which it has to, and that blinds it to a
//  page-wide whitespace pass. Case 3 IS a page-wide whitespace pass, on a line
//  that never held a citation, and the only thing that catches it is the
//  line-site check. If someone simplifies that check away, case 3 goes green and
//  says so.
//
//  Pure ASCII source, no em-dashes, per repo convention.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { thin, decisions } = require('../lib/csa-ek-thin');
const { checkPair } = require('./csa-ek-thin');

//  Read by smoke/mutation-leak.js. Every other harness in this directory writes
//  its sabotage into a tracked file and puts the file back on the way out, which
//  is how a mutation once reached a commit. This one damages a STRING and hands
//  it to the gate function, so there is nothing on disk to leak and nothing to
//  restore. The guard verifies the claim against this file rather than taking
//  it: declaring this and then calling fs.writeFileSync is a refusal.
const MUTATION_LEAK = 'in-memory';
void MUTATION_LEAK;

const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const SNAP = arg('--snapshots') || path.join(__dirname, '..', 'shopify', 'csa-ek-fixture');

if (!fs.existsSync(SNAP)) {
  console.error(`no snapshots at ${SNAP}; pass --snapshots <dir>`);
  process.exit(2);
}

const conf = decisions();
//  One page carrying every shape at once: 3.6 has parentheticals, an objective
//  label, a CED range heading, six prose decisions, graded MCQs and a JSON-LD
//  block. A mutation that needs a shape the page does not have proves nothing.
const TOPIC = '3.6';
function load(topic) {
  const page = JSON.parse(fs.readFileSync(path.join(SNAP, `${topic}.json`), 'utf8'));
  const before = page.body_html;
  return { before, clean: thin(before, topic, conf).body };
}

const cases = [];
//  `topic` defaults to 3.6 and is named only where the shape lives elsewhere.
//  Picking a page that does not carry the shape is how a mutation goes INERT,
//  which the runner reports rather than counting as a pass.
const add = (name, expect, mutate, topic) => cases.push({ name, expect, mutate, topic: topic || TOPIC });

//  1. a citation survives the cut
add('one citation left behind', 'visible citations survive',
  (a) => a.replace('Same-class access is permitted.', 'EK 3.6.A.3: same-class access is permitted.'));

//  2. a word changed where no citation ever was
add('a word changed away from any citation', 'something other than a citation changed',
  (a) => a.replace('mutable object', 'immutable object'));

//  3. a whitespace-only pass on a line that held no citation. canon() cannot
//     see this by construction. The line-site check is the whole defence.
add('a whitespace pass on an uncited line', 'carried no visible citation',
  (a) => {
    const lines = a.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/\s\./.test(lines[i]) && !/\d\.\d\.[A-C]/.test(lines[i])) {
        lines[i] = lines[i].replace(/\s+\./g, '.');
        return lines.join('\n');
      }
    }
    throw new Error('no uncited line with a space before a period; rewrite this case');
  });

//  4. an MCQ loses an option
add('an answer option deleted', 'option count changed',
  (a) => a.replace(/<div class="apcs-opt" data-letter="D">[\s\S]*?<\/div>/, ''));

//  5. an answer key flipped
add('an answer key changed', 'an MCQ answer key changed',
  (a) => a.replace('data-answer="B"', 'data-answer="A"'));

//  6. a question deleted outright
add('a question deleted', 'MCQ count changed',
  (a) => a.replace(/<div class="apcs-ex" data-type="mcq" data-answer="[^"]+">/, '<div class="apcs-ex-gone">'));

//  7. the JSON-LD touched, which the decisions file says explicitly it is not
//     3.6 has no ld+json citation of its own, so this case runs on 2.1, which
//     has one. Pointing it at 3.6 made an earlier version INERT: the mutation
//     matched nothing, and the harness said so rather than counting it a pass.
//     That miss is also how the eighth script citation was found to be a game's
//     feedback string rather than metadata.
add('the ld+json citations cut too', 'the JSON-LD citation count moved',
  (a) => a.replace(/(<script[^>]*application\/ld\+json[^>]*>)([\s\S]*?)(<\/script>)/,
    (m, o, body, c) => o + body.replace(/(?:EK\s*)?\d\.\d\.[A-C](?:\.\d)?/g, 'that topic') + c),
  '2.1');

//  8. tag balance broken
add('an unbalanced div', 'unbalanced',
  (a) => a.replace('</div>', ''));

//  9. a stale decision: the live page no longer carries the text a decision
//     names. This is the sheet-goes-stale failure, and it must be a refusal
//     rather than a quiet skip.
const STALE = [{ find: 'a sentence that is not on this page', found: 0 }];
add('a decision whose text is no longer on the page', 'expected 1', 'stale');

//  10. something that was hidden became visible
add('a hidden element unhidden', 'were hidden and are not any more',
  (a) => a.replace(/style="display:\s*none[^"]*"/, 'style=""'));

let hollow = 0;
let skipped = 0;
for (const c of cases) {
  const { before, clean } = load(c.topic);
  const stale = c.mutate === 'stale';
  let damaged = clean;
  if (!stale) {
    try { damaged = c.mutate(clean); }
    catch (e) { skipped++; console.log(`SKIP    ${c.name}: ${e.message}`); continue; }
  }
  if (damaged === clean && !stale) {
    hollow++;
    console.log(`INERT   ${c.name}: the mutation matched nothing, so it tests nothing`);
    continue;
  }
  const { fail } = checkPair(c.topic, before, damaged, conf, stale ? STALE : []);
  const said = fail.some((f) => f.includes(c.expect));
  if (fail.length && said) console.log(`red     ${c.name}`);
  else if (fail.length) {
    hollow++;
    console.log(`HOLLOW  ${c.name}: red for the wrong reason, wanted ${JSON.stringify(c.expect)}\n`
      + fail.slice(0, 2).map((f) => `        ${f.split('\n')[0]}`).join('\n'));
  } else {
    hollow++;
    console.log(`GREEN   ${c.name}: the gate accepted it`);
  }
}

//  The negative control. A gate that refuses everything is red for every
//  mutation and worth nothing.
const base = load(TOPIC);
const clean = checkPair(TOPIC, base.before, base.clean, conf, []);
if (!clean.fail.length) console.log('green   the undamaged rewrite, as it must be');
else { hollow++; console.log('FAILED  the undamaged rewrite does not pass:\n        ' + clean.fail[0]); }

if (hollow) {
  console.log(`\n${hollow} of ${cases.length + 1} cases did not behave. A green mutation run is a failed check.`);
  process.exit(1);
}
console.log(`\nall ${cases.length - skipped} mutations red and the clean rewrite green: every rule in the `
  + 'EK thinning gate bites on its own.');
