'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  REBUILD THE 1.1 LAB PAGE BODY AS A MOUNT POINT.
//
//  The page keeps everything that is prose: its intro, its styles, its scoring
//  rubric table and its nav footer. What it stops carrying is the activity, the
//  answer key and the grader, because those are what a lock has to be able to
//  withhold and a page body cannot be withheld.
//
//  THE ONLY CHANGE IS THE REGION BETWEEN TWO MARKERS.
//  Everything before the running-score bar and everything from the nav footer
//  onward is copied byte for byte, and the script that held the answers is
//  removed. main() diffs the result against the input outside that region and
//  refuses on ANY difference, because "I only meant to touch the middle" is not
//  evidence that only the middle was touched.
//
//  Run: node scripts/analysis-page-body.js <out.html>   (--check to not write)
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const boot = require('../lib/page-bootstrap');
const specs = require('../lib/analysis-spec');

const SRC = path.join(__dirname, '..', 'smoke', 'fixtures', 'ap-cyber-unit-1-lesson-1-lab.admin-body.html');
const API = 'https://progress.apcsexamprep.com';
const MOUNT = 'apcs-analysis-1-1-lab';
const die = (m) => { console.error('page build failed: ' + m); process.exit(1); };

function build() {
  const spec = specs.get('ap-cybersecurity', '1.1-lab');
  if (!spec) die('the 1.1 analysis spec did not load');
  const src = fs.readFileSync(SRC, 'utf8');

  //  THE CUT STARTS AT THE FIRST SPECIMEN, not at the score bar.
  //
  //  It started at the score bar in the first draft, and the rubric table sits
  //  BETWEEN the two, so that cut silently deleted the scoring rubric a student
  //  reads before they begin. The refusal below did not catch it, because
  //  comparing `head` against `out.slice(0, head.length)` is true by
  //  construction: it compared the output to itself. KEEP_MARKERS is the check
  //  that would have caught it, and it exists because that one did not.
  //
  //  The page therefore keeps its own progress bar and rubric, which are prose
  //  and chrome, and the player writes the numbers into the ids that are already
  //  there. That also leaves the storefront's score reporter reading exactly the
  //  elements it has always read.
  const startMark = '<div class="lab-section" id="email1-section">';
  const navMark = '  <!-- NAV FOOTER -->';
  const start = src.indexOf(startMark);
  const nav = src.indexOf(navMark);
  if (start < 0) die('no first specimen found, so the activity start is unknown');
  if (nav < 0) die('no nav footer found, so the activity end is unknown');
  if (nav < start) die('the nav footer is before the first specimen, which cannot be right');

  //  The grader script: the <script> block after the activity that defines the
  //  answers. Located by its content, not its position.
  const scriptStart = src.indexOf('<script>', nav);
  if (scriptStart < 0) die('no script block after the nav footer');
  const scriptEnd = src.indexOf('</script>', scriptStart);
  if (scriptEnd < 0) die('the grader script is not closed');
  const graderBlock = src.slice(scriptStart, scriptEnd + '</script>'.length);
  if (!graderBlock.includes('var answers')) die('the block after the nav footer is not the grader');

  const head = src.slice(0, start);
  const between = src.slice(nav, scriptStart);          // the nav footer and its wrapper close
  const tail = src.slice(scriptEnd + '</script>'.length);

  const mount = [
    boot.mountPoint(MOUNT, 'Loading the analysis activity...'),
    '<script>window.APCS_ANALYSIS={base:' + JSON.stringify(API) + ','
      + 'getToken:function(){try{return localStorage.getItem("apcs_student_token")||"";}catch(e){return "";}}};</' + 'script>',
    boot.bootstrapScript({
      mountId: MOUNT,
      globalName: 'APCSAnalysis',
      course: spec.course,
      itemId: spec.item_id,
      noun: 'activity',
      hubHandle: 'ap-cybersecurity-complete-course-guide',
      hubText: 'go back to the course guide',
      //  This activity DOES send what a student types, to be graded and thrown
      //  away. The default sentence would tell them otherwise.
      privacyLine: 'Your answers are graded and then discarded. Nothing you type is stored, '
        + 'and nothing you have written so far is affected.',
    }),
    boot.playerTag(API + '/analysis-player.js', MOUNT),
    boot.goTag(MOUNT),
  ].join('\n');

  const out = head + mount + '\n\n' + between + tail;

  //  ── the refusal that makes this safe ─────────────────────────────────────
  //
  //  Not "does the output start with head", which is true however wrong head is.
  //  These are the things a student reads that this script must never remove,
  //  named individually and COUNTED where a count is what would change. The
  //  rubric row count is here because deleting the rubric is the exact mistake
  //  the first draft made and shipped past a green check.
  const KEEP_MARKERS = [
    ['the scoring rubric heading', 'Scoring Rubric'],
    ['the rubric table', '<table class="rubric-table">'],
    ['the lab badges', 'class="lab-badge"'],
    ['the progress bar', 'id="completedCount"'],
    ['the running total', 'id="totalScore"'],
    ['the nav footer', 'class="bottom-nav"'],
    ['the activity nav', 'APCYBER-ACTIVITY-NAV-START'],
  ];
  const checks = [];
  for (const [what, marker] of KEEP_MARKERS) {
    if (!out.includes(marker)) checks.push(`the rebuilt body lost ${what} (${marker})`);
  }
  const rowsIn = (src.match(/<tr>/g) || []).length;
  const rowsOut = (out.match(/<tr>/g) || []).length;
  if (rowsIn !== rowsOut) checks.push(`table rows went from ${rowsIn} to ${rowsOut}, so a table was cut`);
  if (!out.endsWith(between + tail)) checks.push('the content BELOW the activity changed');

  const must = ['APCSPageFallback', 'analysis-player.js', 'APCSAnalysis', MOUNT, boot.sentinelId(MOUNT)];
  for (const m of must) if (!out.includes(m)) checks.push(`the rebuilt body is missing ${m}`);
  //  What must be GONE is the whole point.
  const gone = ['var answers', 'senderKey', 'impactKey', 'actionKey', 'elementsKey',
    'tacticWhy', 'typeWhy', 'checkEmail', 'Email Specimen #1'];
  for (const g of gone) if (out.includes(g)) checks.push(`the rebuilt body still contains ${g}`);
  //  The no-em-dash rule governs text WE author, and the head and tail here are
  //  existing approved prose copied byte for byte. Re-flattening them would be a
  //  corruption and would also trip the two refusals above. So the rule is
  //  applied to the block this script generates, which is the only text it is
  //  responsible for.
  if (mount.includes('—')) checks.push('the generated mount block contains an em-dash');
  if (checks.length) die(checks.join('\n  '));

  return { out, src, removed: src.length - out.length };
}

//  Handle and title are NOT guessed. Both are read from the sheet that was
//  actually imported for this page on 2026-09-03, scripts/fix-cyber-lab11-palette.js
//  and imports/2026-09-03/pages-cyber-lab11-palette.csv, because a guessed handle
//  creates a new page and a guessed title renames a real one.
const HANDLE = 'ap-cyber-unit-1-lesson-1-lab';
const TITLE = 'AP Cybersecurity 1.1 Lab: Tactic and Impact Analysis';
const COMMAND = 'MERGE';

const csvCell = (v) => '"' + String(v).replace(/"/g, '""') + '"';

function sheet(body) {
  //  BOM, because Excel mangles UTF-8 without one and this body carries curly
  //  quotes and an em-dash in prose that predates us.
  return '\ufeff' + ['Handle', 'Command', 'Title', 'Body HTML'].map(csvCell).join(',') + '\n'
    + [HANDLE, COMMAND, TITLE, body].map(csvCell).join(',') + '\n';
}

function main(argv) {
  const { out, src, removed } = build();
  const dest = argv.find((a) => !a.startsWith('--'));
  console.log(`  page body: ${src.length} bytes in, ${out.length} out (${removed} removed)`);
  console.log('  the activity, the answer key and the grader are no longer in the page');
  if (argv.includes('--check') || !dest) return;

  if (dest.endsWith('.csv')) {
    const csv = sheet(out);
    fs.writeFileSync(dest, csv);
    //  PARSE IT BACK. Generation is not evidence that generation worked, and a
    //  sheet that loses bytes on the way out is the defect this repo has already
    //  paid for once, at 90 bytes a page.
    const rows = csv.replace(/^\ufeff/, '').split('\n');
    const cells = [];
    let cur = ''; let q = false;
    for (const ch of rows.slice(1).join('\n')) {
      if (ch === '"') { q = !q; cur += ch; continue; }
      if (ch === ',' && !q) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    const back = cells[3].replace(/^"|"\n?$/g, '').replace(/""/g, '"');
    if (back !== out) die(`the sheet does not parse back to the body it was built from (${back.length} vs ${out.length})`);
    console.log(`  wrote ${dest}`);
    console.log(`  parsed back and diffed: identical, ${out.length} bytes`);
    return;
  }
  fs.writeFileSync(dest, out);
  console.log(`  wrote ${dest}`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { build, MOUNT };
