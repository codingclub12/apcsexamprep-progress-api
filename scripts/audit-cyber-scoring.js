'use strict';
// -----------------------------------------------------------------------------
//  CYBER SCORING AUDIT: can each graded page actually report a correct score?
//
//  WHY THIS EXISTS
//  Auditing one page by hand found three separate defects on AP Cyber lesson 1.2
//  alone: a tracker denominator hardcoded to 10 against 9 real CFU blocks, block
//  numbering that starts at 2 with no cfu-1, and a duplicated #cfu-score-num id.
//  There are 124 graded cyber pages. Hand-auditing them is not a plan, and every
//  page edit invalidates whatever was audited before it.
//
//  So this is the audit as a script: run it, edit pages, run it again.
//
//  WHAT IT CHECKS, AND WHY EACH ONE COSTS A GRADE
//   - denominator vs block count. The page engine writes "score / N" into the
//     tracker and apcs-grade-reporter SCRAPES that text. If N is hardcoded and
//     the block count is not N, every grade on the page is wrong by that ratio
//     and a perfect student cannot reach 100%.
//   - blockDone reachability. The reporter auto-reports only when EVERY block
//     looks answered, and it decides that from #cfu-{n}-feedback, #cfu-{n}-btn,
//     or option classes. A block carrying none of those can never be counted, so
//     the whole page silently never auto-reports for anyone.
//   - numbering gaps. A missing cfu-1 usually means a question was removed and
//     the denominator was not.
//   - duplicate ids. getElementById returns the FIRST, so a student can watch a
//     tracker that never moves while the reporter reads a different one.
//   - wiring. No window.APCS_PAGE means the tracker and the reporter both do
//     nothing at all, and the page records neither a visit nor a grade.
//
//  REGEX, NOT A DOM. Deliberate: a real parser means a dependency, and this repo
//  keeps heavy dependencies out of the root tree so the Railway deploy stays
//  small (same reason Playwright lives in smoke/). The markers checked here are
//  machine-generated and well formed, which is the case regex handles honestly.
//  It reads the page as DELIVERED, which is exactly what the reporter's autoOk
//  decision is made against, so nothing is lost by not executing scripts.
//
//  THROTTLING IS A STOP, NOT A RETRY. Pushing the storefront makes it serve
//  challenges to real students on shared school IPs. On repeated 429/503 this
//  stops and says how far it got, per docs/nightly-crawl-playbook.md.
//
//  Read only. Fetches public pages. Stores nothing, and no student data is ever
//  touched.
//
//  Run: node scripts/audit-cyber-scoring.js [--unit 1] [--delay 1200] [--json]
// -----------------------------------------------------------------------------
const { COURSES } = require('../utils');

const STORE = (process.env.STORE_ORIGIN || 'https://www.apcsexamprep.com').replace(/\/+$/, '');
const UA = 'apcs-cyber-scoring-audit/1.0 (+https://apcsexamprep.com)';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const UNIT = String(arg('--unit', '1'));
const DELAY = Number(arg('--delay', '1200'));
const JSON_OUT = argv.includes('--json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- WHICH PAGES -----------------------------------------------------
// Two naming families, both real and both wired by quiz-tracker-wiring.liquid:
//   ap-cyber-unit-N-lesson-L[-activity]   numbered activity and lesson pages
//   ap-cybersecurity-unit-N-<slug>        named lesson landings
// The numbered family is derivable; the named landings are not, so they are
// discovered from whatever the numbered lesson pages and the hub link to.
function candidateHandles(unit) {
  const cfg = COURSES['ap-cybersecurity'];
  const u = cfg && cfg.units && cfg.units['unit-' + unit];
  if (!u) return [];
  const out = [];
  for (const lesson of u.lessons) {
    const l = String(lesson).split('.')[1];
    out.push(`ap-cyber-unit-${unit}-lesson-${l}`);
    for (const act of ['exercise-1', 'exercise-2', 'lab', 'quiz']) {
      out.push(`ap-cyber-unit-${unit}-lesson-${l}-${act}`);
    }
  }
  if (u.exam) out.push(`ap-cyber-unit-${unit}-exam`);
  return out;
}

async function fetchPage(handle) {
  const url = `${STORE}/pages/${handle}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
    return { status: r.status, html: r.status === 200 ? await r.text() : '', url };
  } catch (e) {
    return { status: 0, html: '', url, error: String(e.message || e) };
  }
}

// --- THE CHECKS ------------------------------------------------------
function auditPage(handle, html) {
  const f = [];   // findings

  // Blocks, in document order, with their data-num.
  const blocks = [];
  const tagRe = /<[a-z]+[^>]*class="[^"]*\bcfu-block\b[^"]*"[^>]*>/gi;
  let m;
  while ((m = tagRe.exec(html))) {
    const num = /data-num="([^"]+)"/.exec(m[0]);
    if (num) blocks.push(num[1]);
  }
  const nums = blocks.map(Number).filter((n) => Number.isFinite(n));

  // WHERE THE DENOMINATOR COMES FROM, in the reporter's own precedence.
  //
  // lessonPct() prefers window.cfuState and only falls back to scraping the
  // tracker text. Two page generations are live and the difference matters:
  //
  //   new shell: assigns cfuState = { score: 0, total: N, ... }. The reporter
  //              reads the number directly, so there is nothing to misread and
  //              the total tracks the real question count.
  //   old shell: no cfuState, and the engine writes a hardcoded "score / N"
  //              into the tracker for the reporter to SCRAPE. That N drifts
  //              from the block count the moment a question is added or cut.
  //
  // Checking only the scraped form reports every new-shell page as broken, so
  // both are read and the winning one is named in the output.
  const stateM = /cfuState\s*=\s*\{[^}]*?\btotal\s*:\s*(\d+)/.exec(html);
  const written = /state\.score\s*\+\s*['"]\s*\/\s*(\d+)['"]/.exec(html);
  const shipped = /id="cfu-score-num"[^>]*>\s*\d+(?:\.\d+)?\s*\/\s*(\d+)/.exec(html);
  const scraped = written ? Number(written[1]) : (shipped ? Number(shipped[1]) : null);
  const stateTotal = stateM ? Number(stateM[1]) : null;
  const denom = stateTotal != null ? stateTotal : scraped;
  const source = stateTotal != null ? 'cfuState' : (scraped != null ? 'scraped' : null);

  if (blocks.length && denom != null && denom !== blocks.length) {
    f.push({ sev: 'P0', code: 'denominator-mismatch',
      msg: `denominator is ${denom} (from ${source}) but the page has ${blocks.length} CFU blocks. `
         + `Max achievable is ${Math.round(blocks.length / denom * 100)}%, and every grade is scaled wrong.` });
  }
  if (blocks.length && denom == null) {
    f.push({ sev: 'P0', code: 'denominator-unreadable',
      msg: `${blocks.length} CFU blocks but neither a cfuState.total nor a readable "score / N". `
         + `lessonPct() returns null, so this page can never record a lesson grade by any path.` });
  }
  // Both mechanisms present and disagreeing: the reporter takes cfuState, the
  // student watches the scraped text. They must not say different things.
  if (stateTotal != null && scraped != null && stateTotal !== scraped) {
    f.push({ sev: 'P1', code: 'denominator-split',
      msg: `cfuState.total is ${stateTotal} but the tracker text says ${scraped}. `
         + `The reporter grades on ${stateTotal} while the student is shown ${scraped}.` });
  }

  // Numbering gaps: a removed question whose denominator stayed behind.
  if (nums.length) {
    const lo = Math.min(...nums), hi = Math.max(...nums);
    const missing = [];
    for (let i = 1; i <= hi; i++) if (!nums.includes(i)) missing.push(i);
    if (missing.length) {
      f.push({ sev: 'P2', code: 'numbering-gap',
        msg: `data-num runs ${lo}-${hi}; missing ${missing.join(', ')}. A removed question, or numbering that starts late.` });
    }
  }

  // Can blockDone() EVER fire for each block? Needs a feedback div or a button.
  const unreachable = blocks.filter((n) =>
    !html.includes(`id="cfu-${n}-feedback"`) &&
    !html.includes(`id="cfu-fb-${n}"`) &&
    !html.includes(`id="cfu-${n}-btn"`));
  if (unreachable.length) {
    f.push({ sev: 'P0', code: 'blockdone-unreachable',
      msg: `block(s) ${unreachable.join(', ')} carry no feedback div and no submit button, so blockDone() can never `
         + `return true. complete() therefore never becomes true and the page NEVER auto-reports, for any student.` });
  }

  // Duplicate ids the reporter or the engine reads by getElementById.
  for (const id of ['cfu-score-num', 'cfu-score-tracker', 'score-display', 'score-num']) {
    const n = (html.match(new RegExp(`id="${id}"`, 'g')) || []).length;
    if (n > 1) {
      f.push({ sev: 'P2', code: 'duplicate-id',
        msg: `#${id} appears ${n} times. getElementById reads the first, so a student may watch one that never updates.` });
    }
  }

  // Wiring. Without APCS_PAGE neither the tracker nor the reporter does anything.
  const wired = /window\.APCS_PAGE\s*=\s*p/.test(html);
  if (!wired) {
    f.push({ sev: 'P0', code: 'no-wiring',
      msg: 'window.APCS_PAGE is never set, so the tracker and reporter both no-op. No visit and no grade is recorded.' });
  }
  if (!html.includes('apcs-tracker.js')) {
    f.push({ sev: 'P0', code: 'no-tracker', msg: 'apcs-tracker.js is not loaded; nothing can write a score.' });
  }
  // Graded activity pages need the score reporter; quizzes use their own wiring.
  const isGraded = /-(exercise-1|exercise-2|lab)$/.test(handle);
  if (isGraded && !html.includes('apcs-score-reporter.js')) {
    f.push({ sev: 'P1', code: 'no-score-reporter',
      msg: 'a graded activity page without apcs-score-reporter.js: its score is never handed to the writer.' });
  }
  if (/-quiz$/.test(handle) && !html.includes('apcs-quiz-wiring.js')) {
    f.push({ sev: 'P1', code: 'no-quiz-wiring', msg: 'a quiz page without apcs-quiz-wiring.js.' });
  }
  // Something for the reporter to read on graded activity pages.
  if (isGraded) {
    const ids = ['score-display', 'r-score', 'score-num', 'finalScore', 'totalScore', 'labTotal', 'foundCount', 'score-val'];
    if (!ids.some((id) => html.includes(`id="${id}"`))) {
      f.push({ sev: 'P1', code: 'no-score-element',
        msg: `no element the score reporter knows how to read (${ids.slice(0, 4).join(', ')}, ...).` });
    }
  }

  return { handle, blocks: blocks.length, denom, source, nums, findings: f };
}

// --- RUN -------------------------------------------------------------
(async () => {
  const handles = candidateHandles(UNIT);
  if (!handles.length) { console.error(`No unit-${UNIT} in the ap-cybersecurity config.`); process.exit(2); }

  const pages = [];
  let strikes = 0, aborted = null;
  for (const h of handles) {
    const res = await fetchPage(h);
    if (res.status === 429 || res.status === 503) {
      strikes++;
      if (strikes >= 3) { aborted = `stopped after ${strikes} throttled responses; the storefront serves challenges to real students when pushed`; break; }
    }
    if (res.status === 200) pages.push(auditPage(h, res.html));
    else if (res.status !== 404) pages.push({ handle: h, blocks: 0, denom: null, nums: [], findings: [{ sev: 'P1', code: 'fetch', msg: `HTTP ${res.status}${res.error ? ' ' + res.error : ''}` }] });
    await sleep(DELAY);
  }

  if (JSON_OUT) { console.log(JSON.stringify({ unit: UNIT, aborted, pages }, null, 2)); return; }

  console.log(`\nCYBER SCORING AUDIT  unit-${UNIT}  ${new Date().toISOString()}`);
  console.log(`${pages.length} page(s) reachable of ${handles.length} candidate handles\n`);

  const all = [];
  for (const p of pages) {
    const tag = p.findings.length ? p.findings.map((x) => x.sev).sort()[0] : 'ok';
    console.log(`  [${tag.padEnd(2)}] ${p.handle}`
      + (p.blocks ? `   blocks=${p.blocks} denom=${p.denom == null ? '?' : p.denom}`
        + ` src=${p.source || 'none'}` : ''));
    for (const f of p.findings) { console.log(`         ${f.sev} ${f.code}: ${f.msg}`); all.push(f); }
  }

  const by = (s) => all.filter((f) => f.sev === s).length;
  console.log(`\n  P0 ${by('P0')}   P1 ${by('P1')}   P2 ${by('P2')}   across ${pages.length} pages`);
  if (aborted) console.log(`\n  ABORTED: ${aborted}`);
  console.log('');
  process.exit(by('P0') ? 1 : 0);
})();
