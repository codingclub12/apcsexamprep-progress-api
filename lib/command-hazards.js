'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  HAZARD BLOCKS. Injected into a compiled prompt VERBATIM, never paraphrased.
//
//  Every line here was paid for once already. Shopify reverting button colours
//  on save, mojibake from unescaped characters, &quot; inside an onclick getting
//  decoded back into a literal quote, the 64-minute edge cache tail that made
//  two live fixes look like failed writes: each is a fix that had to be
//  rediscovered because it lived in one person's head. Paraphrasing a hazard is
//  how the detail that mattered gets dropped, so the compiler concatenates these
//  strings and never rewrites them.
//
//  Constants file on purpose: editing a hazard is a one-line diff with history,
//  not a hunt through a template.
// ─────────────────────────────────────────────────────────────────────────────

const SHOPIFY_THEME = `Scope all CSS under one wrapper id with \`all:initial !important\`. Hardcode every colour with
\`!important\` AND \`-webkit-text-fill-color\` - Shopify reverts button and title colours on
save; re-verify after every push. No emojis, HTML entities only (\`•\` / \`ðŸŽ¯\` mojibake is
what unescaped characters produce). \`repeat(N,1fr)\` grids, never \`auto-fit\`. Never use
\`&quot;\` inside an onclick or data attribute - the sanitizer decodes it back to a literal
quote and breaks the attribute. Storefront edge cache has a measured ~64-minute staleness
tail; a stale read is not a failed write.`;

const API = `Additive migrations only. Match existing patterns in \`db.js\` and \`server.js\` - no new
migration framework, ORM, or router style. Zero-PII posture: no emails, no free-text
student input stored anywhere. Railway is 1 vCPU / 1GB with a prior $169 leak.`;

const CONTENT_CSA = `AP CSA 2025-2026 **4-unit** structure only. Source of truth is
\`ap-computer-science-a-course-and-exam-description__1_.pdf\`. Never use the older
curriculum reference file - its topic numbers are wrong. Removed: inheritance,
polymorphism, \`extends\`/\`super\`, interfaces, writing recursion. In: File/Scanner (4.14),
recursion TRACING only (4.16), data sets (4.15). FRQ 3 is ArrayList only.`;

const MCQ = `Harder only. Priority: spot-the-error, then I/II/III multi-correct. No giveaway variable
names. Bold NOT/EXCEPT/ALWAYS/NEVER in the stem. No all-of-the-above or none-of-the-above.
Distractors parallel in length, complexity, and grammatical structure. Balanced key ~25%
per letter, no 3 consecutive identical, no letter above 35%. Predict-first is default OFF -
only on explicit request, only on scenario or applied items.`;

// Anything that looks like it produces multiple-choice items picks up the MCQ
// block on top of its surface block. Blunt on purpose: a false positive costs
// six lines of prompt, a false negative costs a question bank with giveaway
// variable names and a lopsided answer key.
const MCQ_SIGNALS = /\b(mcq|mcqs|multiple[- ]choice|question bank|quiz bank|distractor|distractors|stem|item writing|practice questions)\b/i;

// Which blocks apply to a task. Returns [{ title, body }] in injection order.
function hazardsFor(task) {
  const surface = String(task.surface || '').trim().toLowerCase();
  const course = String(task.course || '').trim().toLowerCase();
  const text = `${task.title || ''} ${task.detail || ''}`;
  const out = [];

  if (surface === 'shopify' || surface === 'theme') {
    out.push({ title: 'Shopify / theme', body: SHOPIFY_THEME });
  }
  if (surface === 'api') {
    out.push({ title: 'API', body: API });
  }
  if (surface === 'content' && (course === 'csa' || course === 'all')) {
    out.push({ title: 'AP CSA content', body: CONTENT_CSA });
  }
  if (MCQ_SIGNALS.test(text)) {
    out.push({ title: 'MCQ writing', body: MCQ });
  }
  return out;
}

module.exports = { hazardsFor, SHOPIFY_THEME, API, CONTENT_CSA, MCQ, MCQ_SIGNALS };
