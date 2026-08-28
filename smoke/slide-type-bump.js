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
//  It is plain ES5, so it can be loaded into a vm context with the six Google
//  globals stubbed and exercised for real. That is what this does. The stubs
//  are deliberately literal about the one thing that matters: a text range is
//  a list of runs with sizes, and setting a size on a range sets it on the
//  runs inside it.
//
//  WHAT IS ACTUALLY UNDER TEST, in the order it would hurt:
//
//  A. THE ROUND TRIP. revert() must put every size back exactly. The bump maps
//     10 to 12.5 and 12.5 to 14.5, so the transform is NOT invertible by
//     arithmetic: a deck holding both sizes afterwards cannot be unmapped
//     without knowing which run was which. Only the undo file knows. If the
//     round trip is wrong, the undo is a fiction and 294 decks are one bad run
//     away from being unrecoverable.
//
//  B. THE COMPOUNDING GUARD. Running start() twice must not turn a 12 into a
//     14 and then a 16. The sheet is the first guard and the undo file is the
//     second, because a deleted sheet must not be enough to double-bump.
//
//  C. THE BAND. Nothing under 10pt or over 14pt may move. Under 10 is the
//     College Board trademark line; over 14 is already readable.
//
//  D. THE DECK TABLE. It must still match what routes/slides.js would serve.
//     A stale table means editing a deck the gate no longer hands out, or
//     missing one it does.
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

// ── stubs ────────────────────────────────────────────────────────────────────
// A text range is a window over a shared run list. Setting a size on the
// window sets it on every run the window covers, which is what the real
// service does and the only behaviour the script depends on.

function makeText(runs) {
  // runs: [{ text, size }] -> internal [{ start, end, size }]
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
        return sizes.size === 1 ? covered[0].size : null;   // mixed -> null
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

/** Every size currently in a deck, in a stable order, for comparison. */
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
  const files = new Map();          // undo folder: name -> contents
  const sheetRows = [];
  const logs = [];
  const triggers = [];

  const folder = {
    getFilesByName: (n) => {
      const has = files.has(n);
      let served = false;
      return {
        hasNext: () => has && !served,
        next: () => { served = true; return fileHandle(n); },
      };
    },
    getFiles: () => {
      const names = [...files.keys()];
      let i = 0;
      return { hasNext: () => i < names.length, next: () => fileHandle(names[i++]) };
    },
    createFile: (n, body) => { files.set(n, body); return fileHandle(n); },
  };
  const fileHandle = (n) => ({
    getName: () => n,
    setTrashed: () => { files.delete(n); },
    getBlob: () => ({ getDataAsString: () => files.get(n) }),
  });

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
  // Row 1 is the header the real sheet_() writes.
  sheetRows.push(['course', 'key', 'deckId', 'slides', 'runsChanged', 'status']);

  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);
  if (opts.decks) ctx.DECKS = opts.decks;
  Object.assign(ctx, opts.config || {});
  return { ctx, files, sheetRows, logs, triggers };
}

console.log('\nslide-type-bump smoke\n');

// ── C. the band ──────────────────────────────────────────────────────────────
console.log('band rule');
{
  const { ctx } = loadGs({});
  const b = ctx.bumpedSize_;
  ok('under the band is untouched (7.5, 9, 9.9)',
    b(7.5) === null && b(9) === null && b(9.9) === null,
    [b(7.5), b(9), b(9.9)]);
  ok('over the band is untouched (14.1, 18, 40)',
    b(14.1) === null && b(18) === null && b(40) === null,
    [b(14.1), b(18), b(40)]);
  ok('null and undefined are untouched', b(null) === null && b(undefined) === null);
  ok('10 -> 12.5, 11 -> 13.5', b(10) === 12.5 && b(11) === 13.5, [b(10), b(11)]);
  ok('11.5 -> 13.5, 12 -> 14', b(11.5) === 13.5 && b(12) === 14, [b(11.5), b(12)]);
  ok('13 -> 14.5, 14 -> 15.5', b(13) === 14.5 && b(14) === 15.5, [b(13), b(14)]);

  // The smallest text gets the most lift, which is where the readability
  // problem is. Checked as a property rather than trusting the table above.
  ok('every bump is an increase',
    [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14].every((s) => b(s) > s));
  ok('no bump exceeds 2.5pt, so nothing jumps a whole hierarchy level',
    [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14].every((s) => b(s) - s <= 2.5));
  ok('the rule is monotonic, so hierarchy is preserved',
    [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14]
      .every((s, i, a) => i === 0 || b(s) >= b(a[i - 1])));
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
  const plan = ctx.planForDeck_(deck);
  ok('plan covers shape, table cell and grouped shape, and nothing else',
    plan.length === 3, plan.map((p) => [p[1], p[4], p[5]]));
  ok('a shape nested in a group is found', plan.some((p) => p[1] === 'nested'), plan.map((p) => p[1]));
  ok('a table cell is found and keyed by row,col', plan.some((p) => p[1] === 'tb1!0,0'));
  ok('the 30pt run is left out of the plan', !plan.some((p) => p[4] === 30));
  ok('the 9pt run is left out of the plan', !plan.some((p) => p[4] === 9));
  ok('an image contributes nothing and does not throw', plan.every((p) => p[1] !== 'img1'));
}

// ── A. the round trip ────────────────────────────────────────────────────────
console.log('\napply and revert round trip');
{
  const build = () => makeDeck([
    slide('s1', [
      // 10 and 12.5 together: 10 bumps TO 12.5, so after the bump this deck
      // holds two runs at 12.5 whose originals differ. Arithmetic cannot undo
      // that. This is the case the undo file exists for.
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

  const plan = ctx.planForDeck_(deck);
  const changed = ctx.applyPlan_(deck, plan);
  const after = sizesOf(deck);

  ok('every in-band run was changed and nothing else was',
    changed === plan.length && plan.length === 7, [changed, plan.length]);
  ok('the 7.5pt run is untouched after the bump', after[2] === 7.5, after);
  ok('the 24pt run is untouched after the bump', after[4] === 24, after);
  ok('the deck really did change', JSON.stringify(before) !== JSON.stringify(after));

  // Two runs now share 12.5 with different origins. This is the assertion that
  // proves arithmetic reversal would be wrong.
  ok('the bump is genuinely not invertible by size alone',
    after[0] === 12.5 && before[0] === 10 && before[1] === 12.5 && after[1] === 14.5,
    { before: before.slice(0, 2), after: after.slice(0, 2) });

  const back = plan.map((c) => [c[0], c[1], c[2], c[3], c[5], c[4]]);
  const restored = ctx.applyPlan_(deck, back);
  ok('revert touches the same number of runs', restored === plan.length);
  ok('every size is exactly back where it started',
    JSON.stringify(sizesOf(deck)) === JSON.stringify(before),
    { before, now: sizesOf(deck) });
}

// ── B. start(), the guard, and the undo file ─────────────────────────────────
console.log('\nstart(), guards and the undo record');
{
  const mk = () => makeDeck([slide('s1', [shapeEl('sh1', [{ text: 'x', size: 12 }])])]);
  const decks = { A: mk(), B: mk() };
  const table = [['ap-csp', '1-1|1|teacher|cb', 'A'], ['ap-cybersecurity', '1-1|1|teacher', 'B']];

  const h = loadGs(decks, {
    decks: table,
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, COURSES: ['ap-csp', 'ap-cybersecurity'] },
  });
  h.ctx.start();

  ok('both decks bumped 12 -> 14', sizesOf(decks.A)[0] === 14 && sizesOf(decks.B)[0] === 14,
    [sizesOf(decks.A), sizesOf(decks.B)]);
  ok('each deck was saved and closed', decks.A._closed() && decks.B._closed());
  ok('an undo file was written per deck', h.files.has('A.json') && h.files.has('B.json'),
    [...h.files.keys()]);
  ok('the sheet recorded one OK row per deck',
    h.sheetRows.filter((r) => r[5] === 'OK').length === 2, h.sheetRows);

  const rec = JSON.parse(h.files.get('A.json'));
  ok('the undo file records the OLD size, not the new one',
    rec.changes[0][4] === 12 && rec.changes[0][5] === 14, rec.changes[0]);
  ok('the undo file records the band it was written under',
    rec.band[0] === 10 && rec.band[1] === 14, rec.band);

  // Re-running must not compound. This is the whole reason the guard exists.
  h.ctx.start();
  ok('a second start() leaves the sizes alone (sheet guard)',
    sizesOf(decks.A)[0] === 14 && sizesOf(decks.B)[0] === 14,
    [sizesOf(decks.A), sizesOf(decks.B)]);

  // Now the harder case: the sheet is gone but the decks were already done.
  const h2 = loadGs(decks, {
    decks: table,
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, COURSES: ['ap-csp', 'ap-cybersecurity'] },
  });
  h2.files.set('A.json', h.files.get('A.json'));
  h2.files.set('B.json', h.files.get('B.json'));
  h2.ctx.start();
  ok('a lost sheet still does not double-bump, because the undo file is the second guard',
    sizesOf(decks.A)[0] === 14 && sizesOf(decks.B)[0] === 14,
    [sizesOf(decks.A), sizesOf(decks.B)]);
  ok('the skip is recorded rather than silent',
    h2.sheetRows.some((r) => String(r[5]).indexOf('SKIPPED') === 0), h2.sheetRows);
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
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, COURSES: ['ap-csp'] },
  });
  h.ctx.start();
  ok('bumped before reverting', JSON.stringify(sizesOf(deck)) !== JSON.stringify(before));

  h.ctx.revert();
  ok('revert() restores every size from the undo file',
    JSON.stringify(sizesOf(deck)) === JSON.stringify(before), { before, now: sizesOf(deck) });
  ok('revert() trashes the undo file so the deck can be done again',
    !h.files.has('A.json'), [...h.files.keys()]);
}

// ── DRY_RUN and DECK_LIMIT ───────────────────────────────────────────────────
console.log('\nDRY_RUN and DECK_LIMIT');
{
  const mk = () => makeDeck([slide('s1', [shapeEl('sh1', [{ text: 'x', size: 11 }])])]);
  const decks = { A: mk(), B: mk(), C: mk() };
  const table = [['ap-csp', 'a', 'A'], ['ap-csp', 'b', 'B'], ['ap-csp', 'c', 'C']];

  const dry = loadGs(decks, { decks: table, config: { DECK_LIMIT: 0, DRY_RUN: true, FORCE: false, COURSES: ['ap-csp'] } });
  dry.ctx.start();
  ok('DRY_RUN changes nothing in any deck',
    Object.values(decks).every((d) => sizesOf(d)[0] === 11));
  ok('DRY_RUN writes no undo files', dry.files.size === 0, [...dry.files.keys()]);

  const decks2 = { A: mk(), B: mk(), C: mk() };
  const lim = loadGs(decks2, { decks: table, config: { DECK_LIMIT: 1, DRY_RUN: false, FORCE: false, COURSES: ['ap-csp'] } });
  lim.ctx.start();
  const touched = Object.values(decks2).filter((d) => sizesOf(d)[0] !== 11).length;
  ok('DECK_LIMIT 1 changes exactly one deck', touched === 1, touched);
  ok('the shipped default of DECK_LIMIT is small, not "all of them"',
    loadGs({}).ctx.DECK_LIMIT > 0 && loadGs({}).ctx.DECK_LIMIT <= 5, loadGs({}).ctx.DECK_LIMIT);
  ok('the shipped default of FORCE is off', loadGs({}).ctx.FORCE === false);
}

// ── COURSES filter ───────────────────────────────────────────────────────────
console.log('\nCOURSES filter');
{
  const mk = () => makeDeck([slide('s1', [shapeEl('sh1', [{ text: 'x', size: 11 }])])]);
  const decks = { A: mk(), B: mk() };
  const h = loadGs(decks, {
    decks: [['ap-csp', 'a', 'A'], ['ap-cybersecurity', 'b', 'B']],
    config: { DECK_LIMIT: 0, DRY_RUN: false, FORCE: false, COURSES: ['ap-csp'] },
  });
  h.ctx.start();
  ok('narrowing COURSES leaves the other course alone',
    sizesOf(decks.A)[0] === 13.5 && sizesOf(decks.B)[0] === 11,
    [sizesOf(decks.A), sizesOf(decks.B)]);
}

// ── D. the generated deck table ──────────────────────────────────────────────
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

  // The generator must be idempotent, or "regenerate and diff" is not a check
  // anyone can run.
  let checkOk = true;
  try {
    execFileSync('node', [path.join(__dirname, '..', 'scripts', 'build-slide-type-bump-gs.js'), '--check'],
      { stdio: 'pipe' });
  } catch (e) { checkOk = false; }
  ok('build-slide-type-bump-gs.js --check reports the file in sync', checkOk);
}

// ── the script never touches speaker notes ───────────────────────────────────
console.log('\nspeaker notes');
{
  const src = fs.readFileSync(GS, 'utf8');
  ok('the script never calls getNotesPage, so teacher notes are left alone',
    src.indexOf('getNotesPage') === -1);
  ok('the script never touches layouts or masters',
    src.indexOf('getLayouts') === -1 && src.indexOf('getMasters') === -1);
}

console.log('\n  ' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
