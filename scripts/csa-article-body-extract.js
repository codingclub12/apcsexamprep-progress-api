'use strict';
// Byte-exact article body out of a rendered page, by matching the theme's own
// content wrapper rather than guessing content tokens.
//
// The theme renders {{ article.content }} verbatim inside
//   <div class="article-template__content ... rte ...">
// so the body is exactly that element's children. Counting div nesting finds the
// close; nothing about the article's own markup has to be known, which is why
// this handles BOTH QOTD templates where a token-based slice handled only one.
//
// Verified against a control whose raw body came from the Admin API.
const WRAPPER = /<div\s+class="article-template__content[^"]*"\s*\n?\s*>/;
const TOK = /<div\b|<\/div>/gi;

function extractArticle(html) {
  const m = WRAPPER.exec(html);
  if (!m) return { error: 'theme content wrapper not found' };
  const start = m.index + m[0].length;
  let depth = 1;
  TOK.lastIndex = start;
  let t, end = null;
  while ((t = TOK.exec(html))) {
    depth += t[0].toLowerCase().startsWith('<div') ? 1 : -1;
    if (depth === 0) { end = t.index; break; }
  }
  if (end === null) return { error: 'wrapper never closes' };
  const body = html.slice(start, end).replace(/^\n\s*/, '').replace(/\s*$/, '');
  if (body.length < 3000) return { error: 'suspiciously short: ' + body.length };
  // Refusals that matter: theme markup inside the slice means the boundary is
  // wrong, and uploading it would inject the nav into the article content.
  if (/article-template|predictive-search|apcs-qotd-funnel|<\/body>/.test(body)) {
    return { error: 'theme markup leaked into the slice' };
  }
  if (!/qotd-wrapper|apcs-practice-wrapper/.test(body)) {
    return { error: 'no known article wrapper inside' };
  }
  return { body };
}
module.exports = { extractArticle };
