'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE OUTPUT FILTER  (spec section 5, layer 6)
//
//  The last thing between an assembled response and a browser. It is a TRIPWIRE,
//  not a filter, and the difference is what happens when it fires: the whole
//  response is dropped, a refusal is substituted, and a high severity escalation
//  is written. If this ever hits, one of layers 1 to 5 is broken and Tanner
//  should hear about it the same day.
//
//  That framing decides the design. A filter is allowed to be noisy because it
//  edits; a tripwire that cries wolf gets disabled, so every rule here has to be
//  something that cannot plausibly appear in a legitimate answer about how the
//  site works.
//
//  WHERE THIS DEPARTS FROM THE SPEC, AND WHY. Spec section 5 says to flag "a
//  bare letter sequence of length 3 or more". Taken literally that blocks CSA,
//  CSP, PIN, FAQ, API and PDF, which is to say it blocks nearly every correct
//  answer this assistant will ever give, and a tripwire with a 90 percent false
//  positive rate is turned off within a day of launch. Narrowed here to runs
//  drawn from A-E, which is the option alphabet on every activity in this repo
//  and therefore the alphabet a leaked key is written in. CSA fails that test on
//  the S; ACBD does not. The length 3 threshold from the spec is kept.
//
//  Both directions are asserted in smoke/assistant-exfiltration.js: seeded
//  sentinel keys must be caught, and a list of ordinary support answers must all
//  pass. A rule tested only against the attacks it was written for reports
//  success at any threshold.
//
//  No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const reads = require('./reads');

// A run of option labels, spaced ("1. A  2. C  3. B") or compact ("ACBD").
//
// The two forms carry different thresholds and the asymmetry is deliberate. The
// SPACED form keeps the spec's length of 3, because single letters separated by
// nothing but punctuation is not a shape English produces by accident. The
// COMPACT form is 4, not 3, because at 3 it matches ABC and ADA, and "ABC order"
// or a class somebody named ABC would fire the tripwire, block a correct answer
// and page Tanner. Spec section 9's own warning applies to this rule as much as
// to the classifier: a pager that fires on ambiguity becomes a pager nobody
// reads. At 4 the English collisions are all-caps words like BEAD and CEDE,
// which do not occur in prose about class settings.
//
// What that gives up is a compact three-question key, ACB. Layers 1 to 5 mean
// the model never has one to emit, and the spaced form still catches the way a
// key is usually written out. Both directions are asserted in the suite.
// The separator excludes LETTERS, not letters and digits. That one character
// class is the difference between catching a written-out key and missing the
// commonest way one is written: in "1. A  2. C  3. B" the gap between A and C
// contains the digit 2, so a digit-excluding class never matches and the rule
// was blind to numbered lists. Found by probing the finished rule against the
// shapes a key actually takes rather than against the shapes it was written for.
//
// The one letter allowed in a separator is a question label, Q1 or q3, so that
// "Q1 A, Q2 C, Q3 B" matches too. It is added as a narrow alternation rather
// than by allowing letters generally: a separator that accepted any letters
// would match "A or B or C", and prose is where the false positives live.
const SEP = '(?:[^A-Za-z]|[Qq]\\d){1,8}';
const KEY_RUN_SPACED = new RegExp(`\\b[A-E]\\b${SEP}\\b[A-E]\\b${SEP}\\b[A-E]\\b`);
const KEY_RUN_COMPACT = /\b[A-E]{4,}\b/;

const REFUSAL =
  'I stopped that reply before sending it, because it contained something this ' +
  'assistant is never allowed to hand out. That is a fault on my side rather ' +
  'than anything you did. It has been logged and Tanner has been notified. ' +
  'Please ask again in different words, or use the report button if you were ' +
  'trying to tell me about a problem.';

// Returns { blocked, kind, refusal }. `kind` is one of access_code, quiz_option,
// quiz_text, key_run, scan_error, and it is the only thing about the offending
// content that is ever recorded. The text itself is dropped on the floor: the
// point of a tripwire is that the secret goes nowhere, and a log line holding it
// would just be a leak with a different destination.
function check(text, opts = {}) {
  const t = typeof text === 'string' ? text : '';
  if (!t.trim()) return { blocked: false, kind: null, refusal: null };

  if (KEY_RUN_SPACED.test(t) || KEY_RUN_COMPACT.test(t)) {
    return { blocked: true, kind: 'key_run', refusal: REFUSAL };
  }

  const scan = reads.scanForSecrets(t, opts);
  if (scan.hit) return { blocked: true, kind: scan.kind, refusal: REFUSAL };

  return { blocked: false, kind: null, refusal: null };
}

module.exports = { check, REFUSAL, KEY_RUN_SPACED, KEY_RUN_COMPACT, SEP };
