'use strict';
// -----------------------------------------------------------------------------
//  THE AUTHOR'S THINKING, PUBLISHED.
//
//  WHAT THIS FINDS
//  Not bad writing. A specific, recoverable failure: the reasoning that produced
//  a piece of content shipped inside the content. On 2026-09-15 the AP CSA
//  question of the day, global day 22, served this to every student who pressed
//  Check Answer:
//
//      III: INCORRECT. ... Cast to int gives 5-12, which seems right. But when
//      Math.random() is close to 1 ... Actually this does produce 5-12... Wait.
//      Let me recheck: ... This is actually correct too.
//      Correction: Both I and III produce values in the range 5-12. The answer
//      should evaluate III more carefully.
//
//  WHY IT IS A DETECTOR AND NOT A STYLE NOTE
//  That passage is not only embarrassing, it is a CONFESSION that the item is
//  mis-keyed, and it was right: the page keys (A) and the correct answer is (C).
//  Three of the five articles this module found on its first run have a wrong
//  answer key, and in every one of the three the leaked sentence is sitting on
//  top of the defect. So a tell is a lead, not a typo. The caller's job after a
//  hit is to re-derive the answer, not to delete the sentence.
//
//  WHY IT LOOKS AT student-visible TEXT AND NOT AT THE MARKUP
//  Two of the five hide their deliberation inside <pre><code> as a run of //
//  comments, which a reader sees in full. One hides it in ordinary <p> prose.
//  None of them are in a <script>. So <style> and <script> come out and
//  everything else stays, which is the opposite of what a "strip the code"
//  instinct would do and is the only version that finds all five.
//
//  STRICT AND LOOSE, AND WHY BOTH
//  A build may only fail on a rule that cannot reasonably occur in real teaching
//  prose. "Let me recheck" cannot. "Actually the loop runs twice" can, and a
//  teacher writes it, so the actually-rule reports and never refuses. Mixing the
//  two would have one of two outcomes and both are bad: a gate nobody can keep
//  green, or a gate loosened until it finds nothing.
//
//  Go through this module rather than pasting one of its patterns. That rule is
//  lib/mojibake.js's and lib/cyber-ek-density.js's for the same reason: a pasted
//  pattern list cannot tell you it has stopped working, and the first sweep
//  written for this defect used a pattern set that missed two of the five.
//
//  Zero PII: page bodies are author content. No em-dashes, per repo convention.
// -----------------------------------------------------------------------------

//  Each rule is { id, kind, strict, re } and optionally `raw`. `strict` means it
//  is safe to refuse a body on, because no teacher writing an answer explanation
//  produces it. `raw` means the rule is about MARKUP and must be matched before
//  the tags are stripped, because stripping them would erase the thing it looks
//  for.
const RULES = [
  // ── the author catching themselves ────────────────────────────────────────
  { id: 'let-me', kind: 'self-correction', strict: true,
    re: /\blet me (re-?check|re-?count|re-?trace|reconsider|verify|redo|think|try)\b/i },
  { id: 'wait', kind: 'self-correction', strict: true,
    re: /\bwait\b\s*[.,!]|\bwait\b\s*-\s|\bwait\b\s*:/i },
  { id: 'hold-on', kind: 'self-correction', strict: true, re: /\bhold on\b/i },
  { id: 'hmm', kind: 'self-correction', strict: true, re: /\bhmm+\b/i },
  { id: 'second-thought', kind: 'self-correction', strict: true, re: /\bon second thought\b/i },
  { id: 'correction-label', kind: 'self-correction', strict: true, re: /(^|[\s>])correction:/i },
  //  REPORTS ONLY, and the reason is a measured false positive. "re-check the
  //  same index since a new element shifted in" is exactly how you teach the
  //  while-removal pattern, and ap-csa-u4-c2-day-9-while-removal says it in
  //  correct, deliberate prose. Both real occurrences of a leaked recheck are
  //  already caught by let-me ("Let me recheck") and wait ("WAIT - rechecking"),
  //  so demoting this loses no detection and drops the only false hit in 429.
  { id: 'rechecking', kind: 'self-correction', strict: false, re: /\bre-?check(ing)?\b|\bre-?tracing\b|\bre-?counting\b/i },
  { id: 'scratch-that', kind: 'self-correction', strict: true, re: /\bscratch that\b|\bi was wrong\b|\bmy mistake\b/i },

  // ── the author doubting the key, which is the one that matters ────────────
  { id: 'answer-should', kind: 'key-doubt', strict: true, re: /\bthe answer should\b|\bthe key should\b/i },
  { id: 'seems-right', kind: 'key-doubt', strict: true,
    re: /\bwhich seems right\b|\bthis is actually correct\b|\bseems correct\b|\bis also correct\b.{0,40}\bbut\b/i },
  { id: 'i-think-answer', kind: 'key-doubt', strict: true, re: /\bi think the answer\b|\bprobably the answer\b/i },

  // ── the assistant talking to a person who is not the student ──────────────
  { id: 'as-an-ai', kind: 'assistant-voice', strict: true,
    re: /\bas an ai\b|\blanguage model\b|\bi am an? (ai|assistant)\b|\bi cannot browse\b/i },
  { id: 'here-is', kind: 'assistant-voice', strict: true,
    re: /\bhere (is|are) the (answer|explanation|question|json|html|code block)\b/i },
  { id: 'certainly', kind: 'assistant-voice', strict: true,
    re: /\b(certainly|of course|sure)[,!]\s+(here|i|let)\b/i },

  // ── drafting scaffold that was never removed ──────────────────────────────
  { id: 'todo', kind: 'scaffold', strict: true, re: /\bTODO\b|\bFIXME\b|\bPLACEHOLDER\b|\bLOREM IPSUM\b/i },
  { id: 'insert-here', kind: 'scaffold', strict: true, re: /\[insert\b|\[your \w+ here\]|\bXXX\b/i },
  { id: 'note-to-self', kind: 'scaffold', strict: true, re: /\bnote to self\b/i },
  { id: 'fence', kind: 'scaffold', strict: true, re: /```/ },
  //  raw: this one is MARKUP, so it has to be matched before the tags come
  //  out. Running it against visible text made it a rule that could never
  //  fire, which the mutation half of smoke/csa-qotd-authoring-tells.js
  //  caught on its first run.
  { id: 'thinking-tag', kind: 'scaffold', strict: true, raw: true, re: /<\/?thinking>|<\/?scratchpad>/i },
  { id: 'ignore-previous', kind: 'scaffold', strict: true, re: /\bignore (the )?(previous|above)\b/i },

  // ── a broken entity is not deliberation, but it travels with it ───────────
  { id: 'blank-entity', kind: 'artifact', strict: true, re: /&blank;/i },

  // ── reports only: a teacher writes these on purpose ───────────────────────
  { id: 'actually', kind: 'self-correction', strict: false,
    re: /\bactually,?\s+(this|that|it|both|the answer|a\b|b\b|c\b|d\b)/i },
  { id: 'first-person', kind: 'first-person-author', strict: false,
    re: /\bi (need|should|must|will|am going) to\b|\bwe proved earlier\b/i },
];

const ENTITIES = [
  [/&lt;/g, '<'], [/&gt;/g, '>'], [/&quot;/g, '"'], [/&#0?39;/g, "'"],
  [/&apos;/g, "'"], [/&nbsp;/g, ' '], [/&amp;/g, '&'],
];

//  Everything a reader sees, and nothing a browser only executes. <pre><code>
//  stays: two of the five bodies carry their deliberation there as // comments.
//  &amp; is decoded LAST so that "&amp;blank;" is read the way it renders, as
//  the literal text "&blank;", which is how the artifact rule finds it.
function visibleText(html) {
  let s = String(html || '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  ENTITIES.forEach(([re, ch]) => { s = s.replace(re, ch); });
  return s.replace(/[ \t ]+/g, ' ');
}

//  Findings against already-visible text. Callers with HTML use find().
function findInText(text, opts) {
  const o = opts || {};
  const out = [];
  RULES.forEach((rule) => {
    if (o.strictOnly && !rule.strict) return;
    if (o.only && o.only !== rule.id) return;
    if (o.skip && o.skip.indexOf(rule.id) !== -1) return;
    const re = new RegExp(rule.re.source, rule.re.flags.indexOf('g') === -1 ? rule.re.flags + 'g' : rule.re.flags);
    let m;
    while ((m = re.exec(text))) {
      out.push({
        id: rule.id, kind: rule.kind, strict: rule.strict, index: m.index,
        match: m[0],
        excerpt: text.slice(Math.max(0, m.index - 90), m.index + m[0].length + 110).trim(),
      });
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
  });
  return out.sort((a, b) => a.index - b.index);
}

//  Two passes, because two kinds of rule look at two different things. The
//  markup rules read the body as stored; everything else reads it as a student
//  sees it. Indexes are reported in whichever string the rule ran against, which
//  is only ever used to cut an excerpt.
function find(html, opts) {
  const o = opts || {};
  const rawIds = RULES.filter((r) => r.raw).map((r) => r.id);
  const visible = findInText(visibleText(html), Object.assign({}, o, {
    skip: (o.skip || []).concat(rawIds),
  }));
  const raws = rawIds
    .filter((id) => !(o.only && o.only !== id) && !(o.skip || []).includes(id))
    .reduce((acc, id) => acc.concat(findInText(String(html || ''), Object.assign({}, o, { only: id, skip: [] }))), []);
  return visible.concat(raws);
}

//  True when a body is clean enough to publish by this module's standard.
function clean(html) { return find(html, { strictOnly: true }).length === 0; }

module.exports = { RULES, visibleText, find, findInText, clean };
