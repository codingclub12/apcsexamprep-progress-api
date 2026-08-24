'use strict';
// -----------------------------------------------------------------------------
//  VERIFY EVERY CSP CHECK QUESTION AGAINST THE ANSWER KEY IT CLAIMS.
//
//  THE CLAIM THIS ENFORCES
//  Every authored check question carries `keyCite`, the sentence in the teacher
//  answer key it was derived from, and `keyDoc`, the document that sentence is
//  in. The whole design rests on those citations being real: a question whose
//  "correct" answer was invented would look exactly like a good one from every
//  other angle, and it would be marking real students wrong.
//
//  So the citation is CHECKED, not trusted. This reads the cached key document
//  and fails if the quoted sentence is not in it.
//
//  The pilot ran this by hand and reported 10 of 10. It was never committed, so
//  the guarantee lasted exactly as long as that session. This is that check as a
//  script, so it can be re-run by anyone at any time.
//
//  IT IS AN AUTHORING GATE, NOT A CI GATE, AND THAT IS DELIBERATE.
//  Verifying needs the answer keys, and the keys are the answers to the whole
//  course. Caching them into a CI runner to satisfy a check would put every
//  answer in the course into build logs, which is a worse outcome than the one
//  this protects against. So it runs where an author already has the keys, and
//  CI checks the half that needs no key: that every question is structurally
//  complete and carries a citation at all (smoke/csp-exercise-pages.js).
//  Run it before committing new checks.
//
//  MATCHING, AND WHY IT IS LOOSE IN EXACTLY ONE WAY
//  A .docx round trip is not byte stable: Word stores curly quotes, en dashes
//  and non-breaking spaces where an author typed ASCII, and splits a sentence
//  across runs so the extracted text has different internal spacing. Comparing
//  raw would fail on punctuation and teach authors to paste mojibake into the
//  repo to satisfy it.
//
//  So both sides are normalised the same way: quotes and dashes folded to their
//  ASCII forms, whitespace collapsed, case ignored. Nothing else. The WORDS must
//  match, in order, exactly. A paraphrase fails, a summary fails, a citation
//  from a different topic's key fails.
//
//  WHAT IT REFUSES
//    - a keyCite that is not in the named key document
//    - a keyDoc that is not the key belonging to that page
//    - a missing cached key, which would otherwise mean verifying nothing
//    - a question with no keyCite at all
//    - a correct answer that is not one of the options
//    - a rationale missing for any option
//
//  Run:
//    node scripts/verify-csp-exercise-checks.js
//    node scripts/verify-csp-exercise-checks.js --topic 1.2
//
//  Needs the cache: node scripts/fetch-csp-keys.js
// -----------------------------------------------------------------------------

const { allChecks } = require('../lib/csp-exercise-pages');
const { keyIndex, readKey } = require('./fetch-csp-keys');

const LETTERS = ['A', 'B', 'C', 'D'];

// Fold the typographic variants a Word round trip introduces, and nothing else.
function normalise(s) {
  return String(s)
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// `checks` is injectable so the failure path can be proved with a deliberately
// fabricated citation. A verifier nobody has watched fail is a decoration.
function verify({ only, checks: injected } = {}) {
  const checks = injected || allChecks();
  const index = keyIndex();
  const problems = [];
  let questions = 0;
  const handles = Object.keys(checks).filter((h) => !only || h.includes(`-${only.replace('.', '-')}-`));

  for (const handle of handles) {
    const check = checks[handle];
    const meta = index.get(handle);
    if (!meta) { problems.push(`${handle}: no answer key is listed for this page`); continue; }

    // The cited document must be THIS page's key. A citation that is real but
    // from another topic's key is the subtle version of an invented one.
    if (check.keyDoc && normalise(check.keyDoc) !== normalise(meta.doc)) {
      problems.push(`${handle}: cites ${check.keyDoc} but its key is ${meta.doc}`);
      continue;
    }

    const text = readKey(handle);
    if (text == null) {
      problems.push(`${handle}: key not cached, run scripts/fetch-csp-keys.js`);
      continue;
    }
    const hay = normalise(text);

    (check.questions || []).forEach((q, i) => {
      questions++;
      const where = `${handle} q${i + 1}`;
      if (!q.keyCite || !String(q.keyCite).trim()) {
        problems.push(`${where}: no keyCite, so nothing can be verified`);
        return;
      }
      if (hay.indexOf(normalise(q.keyCite)) === -1) {
        problems.push(`${where}: the cited sentence is NOT in ${meta.doc}: ${JSON.stringify(String(q.keyCite).slice(0, 90))}`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        problems.push(`${where}: needs exactly 4 options, has ${(q.options || []).length}`);
      }
      if (!LETTERS.includes(q.correct)) {
        problems.push(`${where}: correct is ${JSON.stringify(q.correct)}, must be one of A B C D`);
      }
      for (const L of LETTERS) {
        if (!q.why || !q.why[L] || !String(q.why[L]).trim()) {
          problems.push(`${where}: no rationale for option ${L}`);
        }
      }
      if (!q.ek || !String(q.ek).trim()) problems.push(`${where}: no EK reference`);
    });

    if (!check.questions || !check.questions.length) {
      problems.push(`${handle}: has no questions`);
    }
  }

  return { problems, questions, pages: handles.length };
}

function main(argv) {
  const i = argv.indexOf('--topic');
  const only = i === -1 ? null : argv[i + 1];
  const { problems, questions, pages } = verify({ only });

  console.log('');
  if (problems.length) {
    console.log(`  FAILED. ${problems.length} problem(s) across ${pages} page(s):\n`);
    for (const p of problems.slice(0, 40)) console.log('    ' + p);
    if (problems.length > 40) console.log(`    ... and ${problems.length - 40} more`);
    console.log('');
    process.exit(1);
  }
  console.log(`    ${String(questions).padStart(3)}  check questions across ${pages} page(s)`);
  console.log('         every one cites a sentence that is really in its answer key');
  console.log('');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { verify, normalise };
