'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the Google Slides type bump for the CSP and Cyber Teacher Bundles.
//
//  WHY THIS SUITE EXISTS. scripts/slide-type-bump.gs is the only thing either
//  of us ships that cannot be run where it is written. It executes inside
//  Tanner's Apps Script project, against 294 live decks that paying teachers
//  hold links to, and there is no staging copy of those decks. So the usual
//  proof, run it and look, is unavailable, and the script would otherwise
//  reach production having never executed once.
//
//  It is plain ES5, so it can be loaded into a vm context with the Google
//  globals stubbed and exercised for real. That is what this does.
//
//  THE ASSERTION THIS SUITE GOT WRONG THE FIRST TIME, kept at the top because
//  it is the lesson. The original rule was arithmetic: +2.5 below 11.5pt, +2
//  below 13, +1.5 up to 14. This suite asserted it was "monotonic, so
//  hierarchy is preserved" using `b(s) >= b(prev)`. That passes for a rule
//  that maps two different sizes onto the SAME size, and that is exactly what
//  the rule did: 12.5 + 2 and 13 + 1.5 are both 14.5. preview() later read
//  63,842 real runs and found 7,900 of them losing a size distinction and
//  11,638 more inverted, 29% of all text, none of which this suite objected
//  to. Non-decreasing was the wrong property. STRICTLY increasing is the right
//  one, and part A now checks it against the sizes those decks actually use.
//
//  WHAT IS UNDER TEST, in the order it would hurt:
//
//  A. THE LADDER IS STRICTLY INCREASING over the real corpus, and no bumped
//     size lands on or above a size left untouched above it.
//  B. THE ROUND TRIP. revert() must put every size back exactly.
//  C. THE COMPOUNDING GUARD. Running start() twice must not bump twice, with
//     the sheet present AND with it deleted.
//  D. UNKNOWN SIZES ARE REFUSED, not guessed at.
//  E. THE DECK TABLE still matches what routes/slides.js would serve.
//
//  Zero PII, no network, nothing written outside a temp dir.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:slidetypebump
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); }
};

const GS = path.join(__dirname, '..', 'scripts', 'slide-type-bump.gs');

// The size histogram preview() read from 136 real AP CSP decks on 2026-08-28.
// Every claim about hierarchy is checked against THIS, not against invented
// sizes, because the failure mode was specific to how densely these decks
// populate the low end.
const CORPUS = {
  7.5: 4272, 8: 1076, 9: 6432, 9.5: 656, 10: 3512, 10.5: 1048, 11: 4280,
  12: 8208, 12.5: 2392, 13: 4836, 14: 11638, 14.5: 672, 15: 1636, 16: 1768,
  17: 2648, 18: 360, 19: 456, 20: 760, 24: 168, 30: 808, 32: 3872, 34: 152,
  36: 656, 54: 272, 72: 456, 96: 272, 200: 536,
};
const CORPUS_SIZES = Object.keys(CORPUS).map(Number).sort((a, b) => a - b);

// AP CYBER, read on 2026-09-02 from ALL 70 decks (not a sample), 16,900 runs.
// Its vocabulary is denser than CSP's: it adds 11.5, 13.5 and 16.5, and lacks
// 14.5. That difference is why the two courses cannot share one ladder, and
// why proposeLadder_ has to back the lift off for this one.
const CYBER = {
  7.5: 863, 8: 206, 9: 1918, 9.5: 48, 10: 662, 10.5: 342, 11: 1398, 11.5: 6,
  12: 1722, 12.5: 134, 13: 1209, 13.5: 16, 14: 4996, 15: 984, 16: 212,
  16.5: 20, 17: 434, 18: 76, 19: 34, 20: 174, 22: 150, 24: 60, 28: 22,
  30: 108, 32: 596, 34: 4, 36: 197, 44: 10, 54: 70, 72: 34, 96: 60,
  130: 6, 160: 14, 200: 115,
};
const CYBER_SIZES = Object.keys(CYBER).map(Number).sort((a, b) => a - b);

const CORPORA = [
  ['ap-csp', CORPUS, CORPUS_SIZES],
  ['ap-cybersecurity', CYBER, CYBER_SIZES],
];

// ── stubs ────────────────────────────────────────────────────────────────────

function makeText(runs) {
  const model = [];
  let at = 0;
  for (const r of runs) {
    model.push({ start: at, end: at + r.text.length, size: r.size });
    at += r.text.length;
  }
  const view = (start, end) => ({
    getStartIndex: () => start,
    getEndIndex: () => end,
    getTextStyle: () => ({
      getFontSize: () => {
        const covered = model.filter((m) => m.start >= start && m.end <= end);
        if (!covered.length) return null;
        const sizes = new Set(covered.map((m) => m.size));
        return sizes.size === 1 ? covered[0].size : null;
      },
      setFontSize: (n) => {
        model.forEach((m) => { if (m.start >= start && m.end <= end) m.size = n; });
      },
    }),
  });
  return {
    _model: model,
    getRuns: () => model.map((m) => view(m.start, m.end)),
    getRange: (s, e) => view(s, e),
  };
}

const TYPE = { SHAPE: 'SHAPE', TABLE: 'TABLE', GROUP: 'GROUP', IMAGE: 'IMAGE' };

const shapeEl = (id, runs) => {
  const t = makeText(runs);
  return { _text: t, getPageElementType: () => TYPE.SHAPE, getObjectId: () => id, asShape: () => ({ getText: () => t }) };
};
const imageEl = (id) => ({ getPageElementType: () => TYPE.IMAGE, getObjectId: () => id });
const tableEl = (id, grid) => {
  const cells = grid.map((row) => row.map((runs) => makeText(runs)));
  return {
    _cells: cells,
    getPageElementType: () => TYPE.TABLE,
    getObjectId: () => id,
    asTable: () => ({
      getNumRows: () => cells.length,
      getNumColumns: () => cells[0].length,
      getCell: (r, c) => ({ getText: () => cells[r][c] }),
    }),
  };
};
const groupEl = (id, children) => ({
  getPageElementType: () => TYPE.GROUP,
  getObjectId: () => id,
  asGroup: () => ({ getChildren: () => children }),
});

const slide = (id, els) => ({ getObjectId: () => id, getPageElements: () => els });

function makeDeck(slides) {
  let closed = false;
  return {
    _slides: slides,
    _closed: () => closed,
    getSlides: () => slides,
    saveAndClose: () => { closed = true; },
  };
}

function sizesOf(deck) {
  const out = [];
  const walk = (els) => {
    for (const el of els) {
      const t = el.getPageElementType();
      if (t === TYPE.SHAPE) out.push(...el._text._model.map((m) => m.size));
      else if (t === TYPE.TABLE) el._cells.forEach((row) => row.forEach((c) => out.push(...c._model.map((m) => m.size))));
      else if (t === TYPE.GROUP) walk(el.asGroup().getChildren());
    }
  };
  deck.getSlides().forEach((s) => walk(s.getPageElements()));
  return out;
}

// ── harness ──────────────────────────────────────────────────────────────────

function loadGs(decksById, opts) {
  opts = opts || {};
  const files = new Map();
  const sheetRows = [];
  const logs = [];
  const triggers = [];

  const fileHandle = (n) => ({
    getName: () => n,
    setTrashed: () => { files.delete(n); },
    getBlob: () => ({ getDataAsString: () => files.get(n) }),
  });
  const folder = {
    getFilesByName: (n) => {
      const has = files.has(n);
      let served = false;
      return { hasNext: () => has && !served, next: () => { served = true; return fileHandle(n); } };
    },
    getFiles: () => {
      const names = [...files.keys()];
      let i = 0;
      return { hasNext: () => i < names.length, next: () => fileHandle(names[i++]) };
    },
    createFile: (n, body) => { files.set(n, body); return fileHandle(n); },
  };

  const sheetStub = {
    appendRow: (r) => sheetRows.push(r.slice()),
    getLastRow: () => sheetRows.length,
    getRange: (r1, c1, nr, nc) => ({
      getValues: () => sheetRows.slice(r1 - 1, r1 - 1 + nr).map((r) => {
        const out = r.slice(c1 - 1, c1 - 1 + nc);
        while (out.length < nc) out.push('');
        return out;
      }),
    }),
  };
  sheetRows.push(['course', 'key', 'deckId', 'slides', 'runsChanged', 'status']);

  const ctx = {
    SlidesApp: {
      PageElementType: TYPE,
      openById: (id) => {
        if (!decksById[id]) throw new Error('no such presentation: ' + id);
        return decksById[id];
      },
    },
    DriveApp: {
      getFoldersByName: () => ({ hasNext: () => true, next: () => folder }),
      createFolder: () => folder,
      getFilesByName: () => ({ hasNext: () => false, next: () => null }),
    },
    SpreadsheetApp: {
      create: () => ({ getSheets: () => [sheetStub] }),
      open: () => ({ getSheets: () => [sheetStub] }),
    },
    Logger: { log: (m) => logs.push(String(m)) },
    ScriptApp: {
      newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => triggers.push('start') }) }) }),
      getProjectTriggers: () => [],
      deleteTrigger: () => {},
    },
    MimeType: { PLAIN_TEXT: 'text/plain' },
    console,
  };

  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  if (opts.decks) ctx.DECKS = opts.decks;
  Object.assign(ctx, opts.config || {});
  return { ctx, files, sheetRows, logs, triggers };
}

console.log('\nslide-type-bump smoke\n');

// ── A. the ladder, against the real corpus ───────────────────────────────────
console.log('the ladder, checked against the real corpora');
for (const [course, hist, sizes] of CORPORA) {
  const { ctx } = loadGs({});
  const b = (x) => ctx.bumpedSize_(x, course);
  const unk = (x) => ctx.unknownSize_(x, course);
  const FLOOR = ctx.LADDER_FLOOR, CEIL = ctx.LADDER_CEILING;
  const P = (n) => `${course}: ${n}`;

  ok(P('outside the range is untouched'),
    [7.5, 9, 9.5, 18, 32, 200].every((x) => b(x) === null));
  ok(P('null and undefined are untouched'), b(null) === null && b(undefined) === null);
  const TF = ctx.LADDER_TARGET_FLOOR;
  // The table must still DESCRIBE every in-range size even where it maps it to
  // itself, because unknownSize_ reads the table to decide whether to skip a
  // deck. Asserting this through bumpedSize_ would be wrong now: it returns
  // null for a no-op, so a complete table would read as a missing one.
  const table = ctx.LADDERS[course];
  ok(P('every corpus size in range has a ladder ENTRY'),
    sizes.filter((x) => x >= FLOOR && x < CEIL)
      .every((x) => Object.prototype.hasOwnProperty.call(table, String(x))),
    sizes.filter((x) => x >= FLOOR && x < CEIL
      && !Object.prototype.hasOwnProperty.call(table, String(x))));
  ok(P('every bump is an increase'),
    sizes.filter((x) => b(x) !== null).every((x) => b(x) > x));

  // ---- THE ASSERTION WHOSE ABSENCE LET THE COMPLAINT SURVIVE THE FIX -------
  // The shipped ladder was strictly increasing, collision-free and under the
  // ceiling, and 91 tests said so. Not one of them asked where the BOTTOM
  // landed, so cyber's 12pt went to 13.5 and stayed unreadable. This is the
  // property Tanner actually asked for.
  const mapped = sizes.map((x) => [x, b(x) === null ? x : b(x)]);
  // Only for sizes the ladder actually governs. Text under LADDER_FLOOR is
  // deliberately out of scope (it is per-slide furniture), so asserting the
  // floor over the whole corpus fails on 7.5, 8, 9 and 9.5, which is this
  // assertion being wrong rather than the ladder.
  const governed = mapped.filter(([s2]) => s2 >= FLOOR && s2 < CEIL);
  ok(P(`every governed landing is at or above the ${TF}pt floor`),
    governed.every(([, t]) => t >= TF), governed.filter(([, t]) => t < TF));
  ok(P(`12pt, the size complained about, lands at or above ${TF}`),
    !sizes.includes(12) || (b(12) === null ? 12 : b(12)) >= TF,
    b(12));

  // Non-decreasing, not strictly increasing: sizes below the floor DELIBERATELY
  // share a landing now. What stays forbidden is an inversion, a later source
  // landing BELOW an earlier one, which is the bug that made the arithmetic
  // version unusable. Note the `<` rather than `<=`: `<=` cannot tell a
  // deliberate collapse from that bug.
  let ordered = true, offender = null;
  for (let i = 1; i < mapped.length; i++) {
    if (mapped[i][1] < mapped[i - 1][1]) { ordered = false; offender = [mapped[i - 1], mapped[i]]; break; }
  }
  ok(P('the map is non-decreasing over every size in the corpus'), ordered, offender);

  // Two sizes may share a landing only when the collapse is the intended one.
  // 14 itself shares with everything collapsed up to it, which is correct, so
  // the property is about pairs where BOTH are at or above the floor.
  const atOrAbove = governed.filter(([s2]) => s2 >= TF);
  const clash = atOrAbove.filter(([, t], i) => atOrAbove.some(([, t2], j) => j !== i && t2 === t));
  ok(P('no two sizes at or above the floor share a landing'), clash.length === 0, clash);

  ok(P('a size already at or above the floor is left exactly alone'),
    sizes.filter((x) => x >= TF).every((x) => b(x) === null),
    sizes.filter((x) => x >= TF && b(x) !== null));

  let inverted = 0;
  for (let i = 0; i < mapped.length; i++) {
    for (let j = i + 1; j < mapped.length; j++) {
      if (mapped[i][1] > mapped[j][1]) inverted += hist[mapped[i][0]];
    }
  }
  ok(P('no run ends up ABOVE text that used to be bigger'), inverted === 0, inverted);

  // Sizes AT the floor no longer move, by design, so including 14 in the band
  // drags the mean toward zero and measures the wrong thing. The band is the
  // text that was under the bar.
  const inBand = sizes.filter((x) => x >= FLOOR && x < TF);
  // b() returns null for a no-op, so the lift has to treat that as "unchanged"
  // rather than subtracting null. The first version of this line did the
  // latter and reported a mean lift of MINUS 2.99pt, which is not a property of
  // the ladder at all.
  const lift = inBand.reduce((acc, x) => acc + hist[x] * ((b(x) === null ? x : b(x)) - x), 0)
    / inBand.reduce((acc, x) => acc + hist[x], 0);
  ok(P(`the mean lift across the sub-${TF} band is at least 1.25pt`),
    lift >= 1.25, lift.toFixed(2));
  ok(P('no lift is ever negative'),
    sizes.every((x) => (b(x) === null ? x : b(x)) >= x));
  // The largest possible bump is now floor minus LADDER_FLOOR, by construction.
  ok(P(`no single bump exceeds ${ctx.LADDER_TARGET_FLOOR - FLOOR}pt`),
    sizes.filter((x) => b(x) !== null).every((x) => b(x) - x <= ctx.LADDER_TARGET_FLOOR - FLOOR));
  ok(P('nothing in the corpus is left unknown'),
    !sizes.some(unk), sizes.filter(unk));
}

// ── the floor itself, pinned to a LITERAL ────────────────────────────────────
// Every other floor assertion in this file reads LADDER_TARGET_FLOOR, so all of
// them move together if that constant moves: lowering it to 13.5 leaves them
// all green while putting cyber's 12pt back exactly where the complaint came
// from. That is the same shape as a header check comparing against the variable
// that wrote it. The bar Tanner set is 14, written here as 14, so a change to
// the constant has to be a deliberate edit to this line as well.
console.log('\nthe floor is 14, independent of the constant');
{
  const { ctx } = loadGs({});
  ok('LADDER_TARGET_FLOOR is 14', ctx.LADDER_TARGET_FLOOR === 14, ctx.LADDER_TARGET_FLOOR);
  for (const course of ['ap-csp', 'ap-cybersecurity']) {
    const table = ctx.LADDERS[course];
    ok(`${course}: no shipped landing is below 14`,
      Object.values(table).every((t) => t >= 14),
      Object.entries(table).filter(([, t]) => t < 14));
    ok(`${course}: 12pt, the reported size, lands at 14 or more`,
      table['12'] >= 14, table['12']);
  }
}

// The two courses must not be sharing a table.
console.log('\nthe two courses have genuinely different ladders');
{
  const { ctx } = loadGs({});
  // These must ask what each table KNOWS, not what bumpedSize_ returns.
  // bumpedSize_ now returns null for an identity mapping, so 16.5 in cyber and
  // 14.5 in CSP both read as null despite being present. Using it here made
  // three tests fail for a reason that had nothing to do with the ladders.
  ok('cyber knows 11.5, 13.5 and 16.5; CSP does not',
    [11.5, 13.5, 16.5].every((x) => !ctx.unknownSize_(x, 'ap-cybersecurity')
      && ctx.unknownSize_(x, 'ap-csp')));
  ok('CSP knows 14.5; cyber does not',
    !ctx.unknownSize_(14.5, 'ap-csp') && ctx.unknownSize_(14.5, 'ap-cybersecurity'));
  // Under a floor rule the two courses MAP the same way; what still differs is
  // the vocabulary each one is known to contain, which is what the skip guard
  // reads. Asserting a different landing per course would now be asserting a
  // coincidence of the old proportional lift.
  ok('the courses differ by vocabulary rather than by landing',
    ctx.bumpedSize_(10, 'ap-csp') === ctx.bumpedSize_(10, 'ap-cybersecurity')
      && ctx.unknownSize_(11.5, 'ap-csp') !== ctx.unknownSize_(11.5, 'ap-cybersecurity'));
  ok('a course with no ladder treats every in-range size as unknown',
    [10, 12, 14, 17].every((x) => ctx.unknownSize_(x, 'ap-networking'))
      && [10, 12, 14, 17].every((x) => ctx.bumpedSize_(x, 'ap-networking') === null));
  ok('and still leaves out-of-range sizes alone rather than calling them unknown',
    !ctx.unknownSize_(9, 'ap-networking') && !ctx.unknownSize_(32, 'ap-networking'));
}

// ── proposeLadder_ ───────────────────────────────────────────────────────────
console.log('\nproposeLadder_, the generator behind the shipped ladder');
{
  const { ctx } = loadGs({});
  const proposed = ctx.proposeLadder_(CORPUS_SIZES);

  for (const [course, , sizes] of CORPORA) {
    const p = ctx.proposeLadder_(sizes);
    const shipped = ctx.LADDERS[course];
    ok(`${course}: it reproduces the shipped ladder from the corpus it was built from`,
      p.every(([s, t]) => shipped[String(s)] === t)
        && p.length === Object.keys(shipped).length,
      { proposed: p, shipped });
  }

  ok('its output is non-decreasing',
    proposed.every(([, t], i) => i === 0 || t >= proposed[i - 1][1]), proposed);
  ok('every landing clears the target floor',
    proposed.every(([, t]) => t >= ctx.LADDER_TARGET_FLOOR), proposed);
  ok('it never proposes a size at or above the ceiling',
    proposed.every(([, t]) => t < ctx.LADDER_CEILING), proposed);

  // A vocabulary it has never seen, packed tighter than the real one. The
  // taper alone has slope below 1, so without the push-apart pass this is
  // exactly where it would collide.
  const dense = [10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 12, 13, 14, 15, 16, 17, 17.5];
  const p2 = ctx.proposeLadder_(dense);
  ok('a denser vocabulary than the real one still comes out non-decreasing',
    p2.every(([, t], i) => i === 0 || t >= p2[i - 1][1]), p2);
  ok('and every one of its landings clears the floor',
    p2.every(([, t]) => t >= ctx.LADDER_TARGET_FLOOR), p2);
  ok('and still stays under the ceiling',
    p2.every(([, t]) => t < ctx.LADDER_CEILING), p2);
  // The mechanism that makes that possible, asserted on the lift PARAMETER
  // rather than on the observed rise. The push-apart pass can lift an
  // individual size further than the taper asked for, so a backed-off ladder
  // can still contain a 2.5pt jump; the two are not the same measurement.
  // ---- WHAT REPLACED THE BACKOFF ------------------------------------------
  // The lift search is gone. It existed because a tapered lift collided with
  // itself and had to be retried smaller, and retrying smaller is exactly how
  // the bottom of the cyber ladder ended up at 13.5. A floor rule cannot
  // collide with itself, so there is nothing to back off from and no vocabulary
  // it can fail on. These assert that totality rather than the old mechanism.
  ok('the rule is TOTAL: every vocabulary tried yields a ladder, none empty',
    [dense, CORPUS_SIZES, CYBER_SIZES, [10], [17.5], [10, 10.25, 10.5], []]
      .every((v) => Array.isArray(ctx.proposeLadder_(v))));
  ok('and every non-empty one clears the floor',
    [dense, CORPUS_SIZES, CYBER_SIZES, [10], [10, 10.25, 10.5]]
      .every((v) => ctx.proposeLadder_(v).every(([, t]) => t >= ctx.LADDER_TARGET_FLOOR)));

  // IDEMPOTENCE, which the old ladder did not have: running the bump twice was
  // prevented by the sheet and the undo file, never by the arithmetic. Under a
  // floor rule a second pass cannot move anything, because everything it would
  // touch is already at or above the floor. The guards still matter for the
  // record they keep; they are no longer the only thing standing between a
  // deck and a double bump.
  const once = ctx.proposeLadder_(CYBER_SIZES).map(([, t]) => t);
  const twice = ctx.proposeLadder_(once).map(([, t]) => t);
  ok('bumping an already-bumped vocabulary changes nothing',
    JSON.stringify([...new Set(once)].sort((a, b) => a - b))
      === JSON.stringify([...new Set(twice)].sort((a, b) => a - b)),
    { once, twice });
  // The largest possible bump is now bounded by the floor and LADDER_FLOOR
  // rather than by a lift parameter: the smallest governed size is 10 and it
  // lands at 14, so nothing can move more than 4pt and the corpus's smallest
  // size moves exactly that much.
  const cyLifts = ctx.proposeLadder_(CYBER_SIZES).map(([s2, t]) => t - s2);
  ok('the largest bump is exactly floor minus LADDER_FLOOR, and nothing exceeds it',
    Math.max(...cyLifts) === ctx.LADDER_TARGET_FLOOR - ctx.LADDER_FLOOR,
    Math.max(...cyLifts));

  // A vocabulary packed against the ceiling has no room at all. Coming back
  // with an identity ladder is the honest answer: it reads as "nothing to do
  // here" rather than inventing headroom that does not exist.
  const packed = [14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5];
  const p3 = ctx.proposeLadder_(packed);
  ok('a vocabulary packed against the ceiling yields an identity ladder, not a broken one',
    p3.length === packed.length && p3.every(([s, t]) => t === s));
  ok('it skips sizes outside the range',
    ctx.proposeLadder_([8, 9, 9.5, 18, 20, 32]).length === 0);
}

// ── the walk ─────────────────────────────────────────────────────────────────
console.log('\nwalking a deck');
{
  const deck = makeDeck([
    slide('s1', [
      shapeEl('sh1', [{ text: 'small', size: 11 }, { text: 'big', size: 30 }]),
      imageEl('img1'),
      tableEl('tb1', [[[{ text: 'cell', size: 12 }]], [[{ text: 'other', size: 9 }]]]),
      groupEl('g1', [shapeEl('nested', [{ text: 'inside a group', size: 13 }])]),
    ]),
  ]);
  const { ctx } = loadGs({ D: deck });
  const { plan, unknown } = ctx.planForDeck_(deck, 'ap-csp');
  ok('plan covers shape, table cell and grouped shape, and nothing else',
    plan.length === 3, plan.map((p) => [p[1], p[4], p[5]]));
  ok('a shape nested in a group is found', plan.some((p) => p[1] === 'nested'));
  ok('a table cell is found and keyed by row,col', plan.some((p) => p[1] === 'tb1!0,0'));
  ok('the 30pt run is left out of the plan', !plan.some((p) => p[4] === 30));
  ok('the 9pt run is left out of the plan', !plan.some((p) => p[4] === 9));
  ok('an image contributes nothing and does not throw', plan.every((p) => p[1] !== 'img1'));
  ok('nothing is reported unknown for a deck the ladder describes',
    unknown.length === 0, unknown);
}

// ── D. unknown sizes ─────────────────────────────────────────────────────────
console.log('\nunknown sizes are refused, not guessed at');
{
  const { ctx } = loadGs({});
  ok('a size in range with no ladder entry is flagged unknown',
    ctx.unknownSize_(11.25, 'ap-csp') && ctx.unknownSize_(13.5, 'ap-csp'));
  ok('and bumpedSize_ declines to invent a value for it',
    ctx.bumpedSize_(11.25, 'ap-csp') === null && ctx.bumpedSize_(13.5, 'ap-csp') === null);
  ok('a size outside the range is not "unknown", it is out of scope',
    !ctx.unknownSize_(9, 'ap-csp') && !ctx.unknownSize_(18, 'ap-csp'));
  ok('a known size is not unknown',
    CORPUS_SIZES.every((s) => !ctx.unknownSize_(s, 'ap-csp')));

  const mk = () => makeDeck([slide('s1', [
    shapeEl('sh1', [{ text: 'a', size: 12 }, { text: 'b', size: 13.5 }]),
  ])]);
  const deck = mk();
  const before = sizesOf(deck);
  const h = loadGs({ A: deck }, {
    decks: [['ap-csp', 'a', 'A']],
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: false, COURSES: ['ap-csp'] },
  });
  h.ctx.start();
  ok('a deck containing an unknown size is left completely alone',
    JSON.stringify(sizesOf(deck)) === JSON.stringify(before), sizesOf(deck));
  ok('the 12pt run beside it is NOT bumped either, since the relationship matters',
    sizesOf(deck)[0] === 12);
  ok('the skip is recorded with the offending size named',
    h.sheetRows.some((r) => String(r[5]).indexOf('SKIPPED: no ladder entry for 13.5') === 0),
    h.sheetRows);
  ok('no undo file is written for a skipped deck', h.files.size === 0);

  // The same deck under CYBER's ladder is fine, because 13.5 is a size cyber
  // has. Nothing about the deck changed; only which ladder was asked.
  const deckCy = mk();
  const hCy = loadGs({ A: deckCy }, {
    decks: [['ap-cybersecurity', 'a', 'A']],
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: false, COURSES: ['ap-cybersecurity'] },
  });
  hCy.ctx.start();
  ok('the same deck under the cyber ladder is bumped, not skipped',
    sizesOf(deckCy)[0] === 14 && sizesOf(deckCy)[1] === 14,
    sizesOf(deckCy));

  const deck2 = mk();
  const h2 = loadGs({ A: deck2 }, {
    decks: [['ap-csp', 'a', 'A']],
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: true, COURSES: ['ap-csp'] },
  });
  h2.ctx.start();
  ok('ALLOW_UNKNOWN bumps the known sizes and leaves the unknown one alone',
    sizesOf(deck2)[0] === 14 && sizesOf(deck2)[1] === 13.5, sizesOf(deck2));

  // A course nobody has measured has no ladder, so every deck is skipped.
  const deck3 = makeDeck([slide('s1', [shapeEl('sh1', [{ text: 'x', size: 12 }])])]);
  const h3 = loadGs({ A: deck3 }, {
    decks: [['ap-networking', 'a', 'A']],
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: false, COURSES: ['ap-networking'] },
  });
  h3.ctx.start();
  ok('a course with no ladder has every deck skipped, untouched',
    sizesOf(deck3)[0] === 12 && h3.sheetRows.some((r) => String(r[5]).indexOf('SKIPPED') === 0),
    [sizesOf(deck3), h3.sheetRows]);
}

// ── B. the round trip ────────────────────────────────────────────────────────
console.log('\napply and revert round trip');
{
  const build = () => makeDeck([
    slide('s1', [
      // 10 and 12.5 together: 10 bumps TO 12.5, so afterwards this deck holds
      // two runs at 12.5 whose originals differ. Arithmetic cannot undo that.
      shapeEl('sh1', [{ text: 'aaa', size: 10 }, { text: 'bbb', size: 12.5 }]),
      shapeEl('sh2', [{ text: 'ccc', size: 7.5 }, { text: 'ddd', size: 14 }, { text: 'eee', size: 24 }]),
      tableEl('tb1', [[[{ text: 'ff', size: 11 }], [{ text: 'gg', size: 13 }]]]),
      groupEl('g1', [shapeEl('nested', [{ text: 'hh', size: 10.5 }])]),
    ]),
    slide('s2', [shapeEl('sh3', [{ text: 'ii', size: 12 }])]),
  ]);

  const deck = build();
  const before = sizesOf(deck);
  const { ctx } = loadGs({ D: deck });

  const { plan } = ctx.planForDeck_(deck, 'ap-csp');
  const changed = ctx.applyPlan_(deck, plan);
  const after = sizesOf(deck);

  // Six, not seven. The 14pt run is in range and in the table, and now maps to
  // itself, so it is correctly absent from the plan: a no-op is not a change.
  ok('every in-range run that actually moves was changed and nothing else was',
    changed === plan.length && plan.length === 6, [changed, plan.length]);
  ok('the 14pt run is in range but planned for no change',
    after[3] === 14, after);
  ok('the 7.5pt run is untouched', after[2] === 7.5, after);
  ok('the 24pt run is untouched', after[4] === 24, after);
  ok('the deck really did change', JSON.stringify(before) !== JSON.stringify(after));
  // Stronger than before: 10 and 12.5 now land on the SAME size, so a single
  // after-value can come from several before-values. The undo file is the only
  // way back, which is what the round trip below checks.
  ok('the bump is genuinely not invertible by size alone',
    before[0] === 10 && before[1] === 12.5 && after[0] === 14 && after[1] === 14,
    { before: before.slice(0, 2), after: after.slice(0, 2) });

  const back = plan.map((c) => [c[0], c[1], c[2], c[3], c[5], c[4]]);
  const restored = ctx.applyPlan_(deck, back);
  ok('revert touches the same number of runs', restored === plan.length);
  ok('every size is exactly back where it started',
    JSON.stringify(sizesOf(deck)) === JSON.stringify(before), { before, now: sizesOf(deck) });
}

// ── C. start(), the guards and the undo record ───────────────────────────────
console.log('\nstart(), guards and the undo record');
{
  // Deck B carries 11.5pt, a size ONLY the cyber ladder knows. Under a floor
  // rule both courses map 12pt to 14, so the old discriminator (csp 12->14 vs
  // cyber 12->13.5) can no longer tell a merged table from a split one. This
  // one still can: run deck B through CSP's ladder and 11.5 is unknown, so the
  // deck is skipped untouched rather than bumped.
  const mk = (size) => makeDeck([slide('s1', [shapeEl('sh1', [{ text: 'x', size }])])]);
  const decks = { A: mk(12), B: mk(11.5) };
  const table = [['ap-csp', '1-1|1|teacher|cb', 'A'], ['ap-cybersecurity', '1-1|1|teacher', 'B']];
  const cfg = { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: false, COURSES: ['ap-csp', 'ap-cybersecurity'] };

  const h = loadGs(decks, { decks: table, config: cfg });
  h.ctx.start();

  // Deck A is CSP and deck B is cyber, and 12pt maps differently under each.
  // Asserting one shared value here would pass only if the ladders had been
  // merged, which is the bug this split exists to prevent.
  ok('each deck is bumped under ITS OWN course ladder (cyber knows 11.5, CSP does not)',
    sizesOf(decks.A)[0] === 14 && sizesOf(decks.B)[0] === 14,
    [sizesOf(decks.A), sizesOf(decks.B)]);
  ok('and that really is a discriminator: CSP would have skipped deck B',
    h.ctx.unknownSize_(11.5, 'ap-csp') && !h.ctx.unknownSize_(11.5, 'ap-cybersecurity'));
  ok('each deck was saved and closed', decks.A._closed() && decks.B._closed());
  ok('an undo file was written per deck', h.files.has('A.json') && h.files.has('B.json'));
  ok('the sheet recorded one OK row per deck',
    h.sheetRows.filter((r) => r[5] === 'OK').length === 2, h.sheetRows);

  const rec = JSON.parse(h.files.get('A.json'));
  ok('the undo file records the OLD size, not the new one',
    rec.changes[0][4] === 12 && rec.changes[0][5] === 14, rec.changes[0]);
  ok('the undo file records the ladder it was written under',
    rec.ladder && rec.ladder['12'] === 14, rec.ladder);
  const recB = JSON.parse(h.files.get('B.json'));
  // Both ladders now map 12 to 14, so the recorded VALUE cannot tell them
  // apart. The recorded vocabulary still can: 11.5 is cyber-only.
  ok('and a cyber deck records the CYBER ladder, not the CSP one',
    Object.prototype.hasOwnProperty.call(recB.ladder, '11.5')
      && !Object.prototype.hasOwnProperty.call(rec.ladder, '11.5'),
    { cyber: Object.keys(recB.ladder), csp: Object.keys(rec.ladder) });

  h.ctx.start();
  // Note this can no longer FAIL by a size moving, because the floor rule is
  // idempotent. The guard is what the next assertion checks: a recorded skip.
  ok('a second start() leaves the sizes alone (sheet guard)',
    sizesOf(decks.A)[0] === 14 && sizesOf(decks.B)[0] === 14,
    [sizesOf(decks.A), sizesOf(decks.B)]);

  const h2 = loadGs(decks, { decks: table, config: cfg });
  h2.files.set('A.json', h.files.get('A.json'));
  h2.files.set('B.json', h.files.get('B.json'));
  h2.ctx.start();
  ok('a lost sheet still does not double-bump, because the undo file is the second guard',
    sizesOf(decks.A)[0] === 14 && sizesOf(decks.B)[0] === 14,
    [sizesOf(decks.A), sizesOf(decks.B)]);
  ok('the skip is recorded rather than silent',
    h2.sheetRows.some((r) => String(r[5]).indexOf('SKIPPED') === 0));
}

// ── revert() end to end ──────────────────────────────────────────────────────
console.log('\nrevert() end to end');
{
  const deck = makeDeck([slide('s1', [
    shapeEl('sh1', [{ text: 'a', size: 10 }, { text: 'b', size: 14 }, { text: 'c', size: 32 }]),
  ])]);
  const before = sizesOf(deck);
  const h = loadGs({ A: deck }, {
    decks: [['ap-csp', '1-1|1|teacher|cb', 'A']],
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: false, COURSES: ['ap-csp'] },
  });
  h.ctx.start();
  ok('bumped before reverting', JSON.stringify(sizesOf(deck)) !== JSON.stringify(before));
  h.ctx.revert();
  ok('revert() restores every size from the undo file',
    JSON.stringify(sizesOf(deck)) === JSON.stringify(before), { before, now: sizesOf(deck) });
  ok('revert() trashes the undo file so the deck can be done again', !h.files.has('A.json'));
}

// ── DRY_RUN, DECK_LIMIT, COURSES, interleaving ───────────────────────────────
console.log('\nDRY_RUN, DECK_LIMIT, COURSES and interleaving');
{
  const mk = () => makeDeck([slide('s1', [shapeEl('sh1', [{ text: 'x', size: 11 }])])]);
  const decks = { A: mk(), B: mk(), C: mk() };
  const table = [['ap-csp', 'a', 'A'], ['ap-csp', 'b', 'B'], ['ap-csp', 'c', 'C']];
  const base = { DRY_RUN: false, FORCE: false, ALLOW_UNKNOWN: false, COURSES: ['ap-csp'] };

  const dry = loadGs(decks, { decks: table, config: { ...base, DECK_LIMIT: 0, DRY_RUN: true } });
  dry.ctx.start();
  ok('DRY_RUN changes nothing in any deck', Object.values(decks).every((d) => sizesOf(d)[0] === 11));
  ok('DRY_RUN writes no undo files', dry.files.size === 0);

  const decks2 = { A: mk(), B: mk(), C: mk() };
  const lim = loadGs(decks2, { decks: table, config: { ...base, DECK_LIMIT: 1 } });
  lim.ctx.start();
  ok('DECK_LIMIT 1 changes exactly one deck',
    Object.values(decks2).filter((d) => sizesOf(d)[0] !== 11).length === 1);

  const shipped = loadGs({}).ctx;
  ok('the shipped default of DECK_LIMIT is small, not "all of them"',
    shipped.DECK_LIMIT > 0 && shipped.DECK_LIMIT <= 5, shipped.DECK_LIMIT);
  ok('the shipped defaults of FORCE and ALLOW_UNKNOWN are both off',
    shipped.FORCE === false && shipped.ALLOW_UNKNOWN === false);

  const decks3 = { A: mk(), B: mk() };
  const h = loadGs(decks3, {
    decks: [['ap-csp', 'a', 'A'], ['ap-cybersecurity', 'b', 'B']],
    config: { ...base, DECK_LIMIT: 0, COURSES: ['ap-csp'] },
  });
  h.ctx.start();
  ok('narrowing COURSES leaves the other course alone',
    sizesOf(decks3.A)[0] === 14 && sizesOf(decks3.B)[0] === 11,
    [sizesOf(decks3.A), sizesOf(decks3.B)]);

  // The bias that made the first preview() report a one-course histogram while
  // looking like it described both.
  const { ctx } = loadGs({}, {
    decks: [...Array(20)].map((_, i) => ['ap-csp', 'c' + i, 'C' + i])
      .concat([...Array(5)].map((_, i) => ['ap-cybersecurity', 'y' + i, 'Y' + i])),
    config: { COURSES: ['ap-csp', 'ap-cybersecurity'] },
  });
  const order = ctx.decksInterleaved_();
  ok('interleaving keeps every deck exactly once', order.length === 25
    && new Set(order.map((d) => d[2])).size === 25);
  ok('a run that stops early still sees both courses',
    new Set(order.slice(0, 6).map((d) => d[0])).size === 2,
    order.slice(0, 6).map((d) => d[0]));
}

// ── E. the generated deck table ──────────────────────────────────────────────
console.log('\nthe generated deck table');
{
  const { ctx } = loadGs({});
  const table = ctx.DECKS;
  const cspM = require('../config/csp-slide-manifest');
  const cspE = require('../config/csp-slide-embeds');
  const cyM = require('../config/cyber-slide-manifest');
  const cyE = require('../config/cyber-slide-embeds');

  const expected = [];
  for (const l of cspM.LESSON_IDS)
    for (let d = 1; d <= cspM.dayCount(l); d++)
      for (const v of cspM.VARIANT_KEYS)
        for (const t of cspM.TRACK_KEYS) {
          const id = cspE.slideId(l, d, v, t);
          if (id) expected.push(['ap-csp', `${l}|${d}|${v}|${t}`, id]);
        }
  for (const l of cyM.LESSON_IDS)
    for (let d = 1; d <= cyM.dayCount(l); d++)
      for (const v of cyM.VARIANT_KEYS) {
        const id = cyE.slideId(l, d, v);
        if (id) expected.push(['ap-cybersecurity', `${l}|${d}|${v}`, id]);
      }

  ok('the table matches what the gate would serve, exactly',
    JSON.stringify(table) === JSON.stringify(expected),
    { table: table.length, expected: expected.length });
  ok('every file id in the table is unique',
    new Set(table.map((r) => r[2])).size === table.length);
  ok('the table covers both courses',
    table.some((r) => r[0] === 'ap-csp') && table.some((r) => r[0] === 'ap-cybersecurity'));
  ok('every row is [course, key, fileId] with a plausible Drive id',
    table.every((r) => r.length === 3 && /^[A-Za-z0-9_-]{20,}$/.test(r[2])));

  let checkOk = true;
  try {
    execFileSync('node', [path.join(__dirname, '..', 'scripts', 'build-slide-type-bump-gs.js'), '--check'],
      { stdio: 'pipe' });
  } catch (e) { checkOk = false; }
  ok('build-slide-type-bump-gs.js --check reports the file in sync', checkOk);
}

// ── what the script must never touch ─────────────────────────────────────────
console.log('\nwhat the script must never touch');
{
  const src = fs.readFileSync(GS, 'utf8');
  ok('the script never calls getNotesPage, so teacher notes are left alone',
    src.indexOf('getNotesPage') === -1);
  ok('the script never touches layouts or masters',
    src.indexOf('getLayouts') === -1 && src.indexOf('getMasters') === -1);
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
