'use strict';
// -----------------------------------------------------------------------------
//  CSP EXERCISE 1 STIMULUS: the page must show what its questions ask about.
//
//  Report esc_75eed3a1756556a978585f39: /pages/ap-csp-topic-1-2-exercise-1 asked
//  six graded questions and a Part B prompt about the LunchDash Log, and the log
//  was nowhere on the site. It lives in Part A of the student handout, and the
//  generator deliberately left Part A on paper. This suite pins three things:
//
//   1. The 1.2 log is on the page, row for row, ABOVE the Part B heading, and
//      every fact the graded stems lean on is in it.
//   2. The log is the handout's own table, not an invented one: five rows, the
//      handout's column headers, the handout's row order (which is not
//      chronological, and must not be "fixed" here, see below).
//   3. The class guard: an Exercise 1 page whose Part B cites a numbered row
//      must carry its log. KNOWN_GAPS names the pages still missing theirs, and
//      is only allowed to shrink.
//
//  Run: node smoke/csp-exercise-stimulus.js
// -----------------------------------------------------------------------------

const { allPages, SOURCE } = require('../lib/csp-exercise-pages');
const { renderStimulus } = require('../lib/csp-exercise-stimulus');

let fails = 0;
function ok(label, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && detail !== undefined ? `\n      ${JSON.stringify(detail)}` : ''}`);
  if (!cond) fails++;
}

// Mirror-only Exercise 1 pages whose Part B cites a numbered row of a Part A
// log the page does not show yet. Same defect as 1.2, but no graded question
// depends on them. Remove an entry when its log is extracted; never add one.
// Emptied on 2026-09-23 (board 397), when 2.3, 5.3 and 5.6 got their logs.
const KNOWN_GAPS = new Set([]);

const H = 'ap-csp-topic-1-2-exercise-1';
const src = SOURCE[H];
const page = allPages().find((p) => p.handle === H);
const body = page.bodyHtml;

// ---- 1. the log is on the page, where a student reads it first -------------
const logAt = body.indexOf('<table class="log">');
const partBAt = body.indexOf('Part B, from your handout');
const checkAt = body.indexOf('Graded check');
ok('1.2 Exercise 1 paints the log table', logAt !== -1);
ok('the log sits above the Part B heading', logAt !== -1 && logAt < partBAt, { logAt, partBAt });
ok('the log sits above the graded check', logAt !== -1 && logAt < checkAt);
const block = body.slice(body.lastIndexOf('<div class="item paper">', logAt), partBAt);
ok('the log is inside an item paper block', block.startsWith('<div class="item paper">'));
const between = body.slice(logAt, partBAt);
ok('the log block is the last thing before the Part B heading',
  !between.slice(0, -4).includes('<h2') && /<\/table>\s*<\/div>\s*(<p class="log-note">[^<]*<\/p>\s*)?<\/div>\s*<h2>$/.test(between));

// Every fact the six graded stems and Part B Q3 lean on. If the log is ever
// edited, this is the list that says which questions it would orphan.
const leans = [
  ['row 4 exists (Part B Q3)', '<td class="row-id">4</td>'],
  ['a twenty-minute idle window (Q1, Q6, Part B Q3)', 'Nothing - no orders for 20 minutes'],
  ['the instant 11:00 tap (Q1, Part B Q3)', 'reacts instantly to the 11:00 tap'],
  ['the 11:25 inventory transmission (Q2)', "inventory software transmits 'pizza: 0 remaining'"],
  ['the tile greys out (Q2, Q4)', 'The pizza tile turns gray'],
  ['two Surprise me taps seconds apart (Q3)', "tap the same 'Surprise me' button seconds apart"],
  ['different meals offered (Q3)', 'One student is offered pizza; the other is offered the salad bowl'],
  ['the pizza tile tap (Q5)', 'A student taps the pizza tile on the touchscreen'],
  ['confirmation plus a buzz (Q5)', 'An order confirmation appears on screen and the phone buzzes once'],
];
for (const [what, needle] of leans) ok(`the page carries ${what}`, body.includes(needle), needle);
ok('Part B Q2 still names the nine-line segment itself', body.includes('the 9 lines inside it that gray out a sold-out tile'));

// ---- 2. it is the handout's table, not a new one --------------------------
ok('five rows, as on the handout', src.log.rows.length === 5, src.log.rows.length);
ok('the handout column headers',
  JSON.stringify(src.log.columns) === JSON.stringify(['ID', 'Moment', 'What happened', 'How the program reacted', 'Detail worth noticing']),
  src.log.columns);
ok('rows numbered 1 to 5 in handout order', src.log.rows.map((r) => r[0]).join() === '1,2,3,4,5');
// The handout lists row 1 at 11:14 and row 2 at 11:25. That is its order, and
// "row 4" on the page has to be row 4 on paper, so the page keeps it.
ok('handout order kept even where it is not chronological',
  src.log.rows[0][1] === '11:14 a.m.' && src.log.rows[1][1] === '11:25 a.m.', src.log.rows.map((r) => r[1]));

// Pizza cannot be ordered or offered after it has sold out. The handout had it
// selling out at 10:30 and then ordered at 11:14 and offered at 11:20; the fix
// (board 400) moved the sell-out to 11:25. This is the invariant, not the time:
// whatever the handout says next, the sell-out row must come after every row
// that orders or offers pizza.
const minutes = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const soldOut = src.log.rows.find((r) => /0 remaining/.test(r[2]));
const pizzaAfter = src.log.rows.filter((r) => r !== soldOut && /pizza/i.test(r[2] + ' ' + r[3]));
ok('the sell-out row exists', !!soldOut);
ok(`pizza sells out after every row that orders or offers it (${pizzaAfter.map((r) => r[1]).join(', ')})`,
  !!soldOut && pizzaAfter.length >= 2 && pizzaAfter.every((r) => minutes(r[1]) < minutes(soldOut[1])),
  { soldOut: soldOut && soldOut[1], pizza: pizzaAfter.map((r) => r[1]) });
const q2 = require('../seed/csp-exercise-checks/1-2.js')[H].questions[1].stem;
ok('graded Q2 names the same sell-out time as the log', !!soldOut && q2.startsWith(`At ${soldOut[1].replace(/ a\.m\.$/, '')} `), q2.slice(0, 40));
ok('the log is pure ASCII', /^[\x20-\x7e]*$/.test(JSON.stringify(src.log)));
ok('no em dash anywhere in the log', !/\u2014/.test(JSON.stringify(src.log)));
ok('one table on the page', (body.match(/<table/g) || []).length === 1);
ok('pure ASCII page body', /^[\x09\x0a\x0d\x20-\x7e]*$/.test(body));

// ---- 3. inert where there is no log, and the class guard -------------------
ok('an entry with no log renders nothing', renderStimulus(SOURCE['ap-csp-topic-1-1-exercise-2'], 'csp-ex') === '');
let threw = false;
try {
  renderStimulus({ handle: 'x', log: { columns: ['a', 'b'], rows: [['1']] } }, 'csp-ex');
} catch (_) { threw = true; }
ok('a ragged row refuses to render', threw);

const cites = Object.entries(SOURCE)
  .filter(([, v]) => v.exercise === 1 && /\b[Rr]ow\s*\d/.test(v.partB.map((q) => q.text).join(' ')))
  .map(([h]) => h);
const missing = cites.filter((h) => !SOURCE[h].log && !KNOWN_GAPS.has(h));
ok('every Exercise 1 page citing a numbered row carries its log (or is a named gap)', !missing.length, missing);
const healed = [...KNOWN_GAPS].filter((h) => SOURCE[h].log);
ok('KNOWN_GAPS lists no page that already has its log', !healed.length, healed);
ok('every page with a log paints a table',
  allPages().filter((p) => SOURCE[p.handle].log).every((p) => p.bodyHtml.includes('<table class="log">')));

// ---- 4. every page with a log, the same way 1.2 is held -------------------
// Each row a Part B prompt cites by number must be a row on that page, and the
// log has to sit above Part B. A name column must be free to wrap; only a
// "Moment" column is held on one line.
for (const p of allPages().filter((pg) => SOURCE[pg.handle].log)) {
  const b = p.bodyHtml;
  const L = SOURCE[p.handle].log;
  const at = b.indexOf('<table class="log">');
  const pb = b.indexOf('Part B, from your handout');
  ok(`${p.handle}: log above Part B`, at !== -1 && at < pb);
  const ids = [...b.matchAll(/<td class="row-id">(\d+)<\/td>/g)].map((m) => m[1]);
  ok(`${p.handle}: rows 1 to 5 in handout order`, ids.join() === '1,2,3,4,5', ids);
  const cited = [...SOURCE[p.handle].partB.map((q) => q.text).join(' ').matchAll(/\b[Rr]ows?\s*(\d+)/g)].map((m) => m[1]);
  ok(`${p.handle}: every row Part B cites is on the page (${[...new Set(cited)].join(',')})`,
    cited.length > 0 && cited.every((n) => ids.includes(n)), cited);
  ok(`${p.handle}: nowrap only on a Moment column`,
    b.includes('class="row-when"') === (L.columns[1] === 'Moment'));
}

// The handout facts each new page's Part B leans on. Quoted from the student
// handouts' Part A; if one disappears, the prompt citing it is orphaned.
const LEANS = {
  'ap-csp-topic-2-3-exercise-1': [
    'Survey Workbook Log: Five Rows Under Review',
    '<td>The app instantly re-orders 1,400 songs by the day each was added</td>',
    '<td>No audio file was opened or changed during the sort</td>',
  ],
  'ap-csp-topic-5-3-exercise-1': [
    'Incident Log: Five Systems Under Audit',
    '<td>HireBrite (resume screener)</td>',
    '<td>Solo developer framed the problem as step-counting on day one</td>',
    'Training audio came from one region; vendor now proposes 10x more of it',
  ],
  'ap-csp-topic-5-6-exercise-1': [
    'Trail Log: Five Public Artifacts About Jordan',
    '<td>Convenient for Jordan - and a bundle of PII in one place</td>',
    '<td>The delete button removed only the original copy</td>',
  ],
};
for (const [h, needles] of Object.entries(LEANS)) {
  const b = allPages().find((p) => p.handle === h).bodyHtml;
  for (const n of needles) ok(`${h}: carries ${JSON.stringify(n.replace(/<\/?td>/g, '').slice(0, 50))}`, b.includes(n), n);
  ok(`${h}: pure ASCII body`, /^[\x09\x0a\x0d\x20-\x7e]*$/.test(b));
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
