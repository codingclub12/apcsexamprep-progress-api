'use strict';
// -----------------------------------------------------------------------------
//  AN AP CSA DAILY-PRACTICE ARTICLE, READ AS AN ITEM RATHER THAN AS MARKUP.
//
//  WHY THIS EXISTS
//  Board 332. Nine articles were repaired on 2026-09-15 because their author had
//  thought out loud in the explanation, and seven of the nine turned out to have
//  a broken item underneath. The warning in that run note is the reason for this
//  module: day 15 keyed an answer that was not correct and was not even one of
//  the four options, and the ONLY thing that pointed at it was the word "wait".
//  A sweep for leaked prose cannot find a silently wrong key.
//
//  So this parses each article into { key, options, answer heading, why-not
//  letters, stem, code } and lets a caller ask questions that have exact
//  answers, with no opinion about the subject matter:
//
//      does the grader's key name an option that exists
//      does the explanation's own heading name the same letter
//      does that heading's text match the option it names
//      does the "Why Not the Others" block argue against the keyed answer
//      are two options the same text
//
//  Every one of those is a contradiction INSIDE the page. None of them needs to
//  know any Java, and none of them can be wrong about whether the item is
//  broken, only about which half is wrong.
//
//  IT REFUSES RATHER THAN GUESSES
//  A body this cannot parse is reported as unparseable and counted. It is never
//  skipped quietly. The failure this is written against is a checker that reads
//  400 of 429 articles, finds nothing, and reports the bank clean.
//
//  TWO TEMPLATES, AND THE STYLE BLOCK IS A TRAP
//  224 articles use the qotd template and 205 use the older practice template,
//  and both name their own classes in a <style> block at the top of the body. A
//  selector written against ".apcs-option" matches the CSS rule before it
//  matches any option, which is how the first cut of this parser found the
//  stylesheet and reported zero options. The style block comes out first.
//
//  Zero PII: public page markup. No em-dashes, per repo convention.
// -----------------------------------------------------------------------------

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const ENTITIES = [
  [/&lt;/g, '<'], [/&gt;/g, '>'], [/&quot;/g, '"'], [/&#0?39;/g, "'"],
  [/&apos;/g, "'"], [/&nbsp;/g, ' '], [/&amp;/g, '&'],
];
function decode(s) {
  let out = String(s == null ? '' : s);
  ENTITIES.forEach(([re, ch]) => { out = out.replace(re, ch); });
  return out;
}
//  Visible text of a markup fragment, entities decoded, whitespace collapsed.
function text(html) {
  return decode(String(html == null ? '' : html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
//  For comparing an explanation's restatement of an option against the option.
//  Punctuation and case are noise here; the words and the code are not.
function norm(s) {
  return text(s).toLowerCase().replace(/[\s.,;:!?"'`]+/g, ' ').trim();
}

function withoutStyle(body) {
  return String(body || '').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
}

// ── the grader's key ─────────────────────────────────────────────────────────
//  Three variable names are in use across the blog and all three are read here
//  rather than only the common one, because the rarest was the broken one: the
//  day 25 twins held an array string in `correctAnswer` and compared it to a
//  radio value, so no answer could ever be right.
const KEY_VARS = ['correct', 'correctAnswer', 'defined_answer'];

function readKey(body) {
  for (const name of KEY_VARS) {
    const m = body.match(new RegExp('var\\s+' + name + '\\s*=\\s*\'([^\']*)\'\\s*;'));
    if (m) return { name, value: m[1] };
  }
  return null;
}

// ── the options ──────────────────────────────────────────────────────────────
//  ANCHORED PER TEMPLATE, NEVER STRIPPED HEURISTICALLY.
//
//  The first cut of this took each option's text and removed a leading "(A)" or
//  "A)" with a regex, to drop the letter the qotd template prints inline. On
//  unit-2-cycle-2-day-2-selection-if-else-if that deleted the ANSWER: the
//  question is what the program prints and the four options are the literal
//  strings "A", "Nothing", "C", "B". Option A became empty, option D became
//  empty, and the audit reported an empty option and a duplicate pair on a page
//  where neither is true.
//
//  A false accusation is worse than a miss here, because it sends somebody to
//  rewrite a correct item. So each template is read where it actually puts the
//  text, and an option matching neither shape is an error rather than a guess:
//
//    practice   <span class="apcs-option-letter">A)</span>
//               <span class="apcs-option-content">A</span>   <- the answer
//    qotd       <input ...> (A)&nbsp;&nbsp;<span>I only</span>   <- the answer
function readOptions(clean) {
  const out = [];
  const errors = [];
  const re = /<input[^>]*type="radio"[^>]*value="([A-E])"[^>]*>([\s\S]*?)(?=<input[^>]*type="radio"|<\/form>|<button)/g;
  let m;
  while ((m = re.exec(clean))) {
    const letter = m[1];
    const frag = m[2];

    const practice = frag.match(/<span class="apcs-option-content">([\s\S]*?)<\/span>/);
    if (practice) { out.push({ letter, text: text(practice[1]), via: 'apcs-option-content' }); continue; }

    //  qotd: the letter is inline text before the span that holds the answer.
    //  Take the span, and require it, so a template change is loud.
    const spans = [...frag.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)];
    if (spans.length) { out.push({ letter, text: text(spans[spans.length - 1][1]), via: 'span' }); continue; }

    //  Neither shape. Report the raw text and say so rather than inventing a rule.
    const bare = text(frag);
    out.push({ letter, text: bare, via: 'bare' });
    errors.push('option ' + letter + ' matches neither template shape, so its text was taken whole');
  }
  return { options: out, errors };
}

// ── what the explanation claims the answer is ────────────────────────────────
//  qotd:      <h3>Answer: (C) I and III only</h3>
//  practice:  a "Why This Answer?" section, which names no letter, so it is
//             reported as null rather than guessed at.
function readAnswerHeading(clean) {
  const m = clean.match(/<h3[^>]*>\s*Answer:\s*\(([A-E])\)([\s\S]*?)<\/h3>/);
  if (!m) return null;
  return { letter: m[1], text: text(m[2]) };
}

// ── which letters the explanation argues AGAINST ─────────────────────────────
//  The keyed letter appearing here is how day 22 read: the page keyed (A) and
//  its own Why Not block explained why (C) was wrong, while (C) was correct.
function readWhyNot(clean) {
  const block = clean.match(/<div class="qotd-why-not">([\s\S]*?)<\/div>/);
  if (!block) return null;
  const letters = [...block[1].matchAll(/<strong>\s*\(([A-E])\)\s*<\/strong>/g)].map((m) => m[1]);
  return [...new Set(letters)];
}

// ── the question and its code ────────────────────────────────────────────────
function readStem(clean) {
  const q = clean.match(/<div class="qotd-question-box">([\s\S]*?)<form/)
    || clean.match(/<div class="apcs-question-text">([\s\S]*?)<\/div>/);
  return q ? text(q[1].replace(/<div class="qotd-code-block">[\s\S]*?<\/div>/g, ' ')) : null;
}

function readCode(clean) {
  const blocks = [];
  const re = /<div class="qotd-code-block">([\s\S]*?)<\/div>|<pre><code>([\s\S]*?)<\/code><\/pre>/g;
  let m;
  while ((m = re.exec(clean))) {
    const raw = (m[1] !== undefined ? m[1] : m[2]);
    blocks.push(decode(raw.replace(/<[^>]+>/g, '')));
  }
  return blocks;
}

// ── parse ────────────────────────────────────────────────────────────────────
function parse(handle, body) {
  const errors = [];
  const template = /qotd-wrapper/.test(body) ? 'qotd'
    : (/apcs-practice-wrapper/.test(body) ? 'practice' : null);
  if (!template) errors.push('no known article wrapper, so this is neither template');

  const clean = withoutStyle(body);
  const key = readKey(body);
  if (!key) errors.push('no grader key: none of ' + KEY_VARS.join(', ') + ' is assigned');

  const read = readOptions(clean);
  const options = read.options;
  read.errors.forEach((e) => errors.push(e));
  if (!options.length) errors.push('no answer options found');

  return {
    handle,
    template,
    key,
    options,
    answerHeading: readAnswerHeading(clean),
    whyNot: readWhyNot(clean),
    stem: readStem(clean),
    code: readCode(clean),
    //  Kept so a caller can quote the page rather than paraphrase it.
    body,
    errors,
    ok: errors.length === 0,
  };
}

module.exports = { parse, decode, text, norm, LETTERS, KEY_VARS, withoutStyle };
