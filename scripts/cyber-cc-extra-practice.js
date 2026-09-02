// ─────────────────────────────────────────────────────────────────────────────
//  THE PACING STRIP STOPS BUDGETING DAYS AND STARTS SAYING WHAT EXISTS.
//
//  ── THE HISTORY, SO THIS IS NOT UNDONE BY ACCIDENT ─────────────────────────
//  Third change to the same six lines, and each one was right for its moment:
//
//    cyber-cc-clarity.js    stripped the chip styling, because the chips looked
//                           like buttons and navigated nowhere. Teachers
//                           reported them as the biggest confusion on the page.
//    cyber-cc-pill-links.js made two of the three links, because the FRQ and
//                           Labs hubs finally existed. The third stayed a plain
//                           span: the unit tests have no honest destination.
//    this one               drops the day counts, because they promise a budget
//                           the course does not yet have material for.
//
//  ── WHAT CHANGES, AND THE ONE NUMBER THAT DOES NOT ──────────────────────────
//  Live today, per unit:
//
//    Days set aside in this unit
//    Free-response & review 2d | Lab / project 3d | Review & unit test 2d
//
//  After:
//
//    Extra practice
//    Free response (adding more) | Terminal labs (adding more)
//
//  "(adding more)" rather than "(in progress)" because the hub itself already
//  says "2 labs", so a teacher can see the shape of what is there; the phrase
//  only has to say that the shape is still growing. Both readings were offered
//  and either would do, so this is a choice rather than a deduction.
//
//  "Terminal labs" and not "Lab / project" because that is what the destination
//  calls itself: /pages/ap-cybersecurity-labs heads itself "AP Cybersecurity
//  Terminal Labs". A link should say where it goes.
//
//  The third row goes entirely. It never had a destination, and a review-and-test
//  budget is exactly the kind of promise this change exists to stop making.
//
//  ── THE NUMBER THAT DOES NOT CHANGE, AND WHY THAT IS A DECISION ─────────────
//  unitDays() sums frqDays + labDays + testDays into each unit's day span, and
//  that span drives the running day numbers down the whole page. This edit
//  touches the DISPLAY only, so those days stay in the arithmetic: 37 of them
//  across the five units, 7 or 8 per unit.
//
//  So after this change a unit still spans the same days, and the page no longer
//  says where 7 of them go. That is a real loose end and it is deliberate: taking
//  them out of unitDays() would move every day number on the page, and a teacher
//  may already be planning against those. Which of the two is right is Tanner's
//  call, and this script does not make it.
//
//  Run: node scripts/cyber-cc-extra-practice.js <command-center.html> <out.csv>
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const fs = require('fs');
const cp = require('child_process');
const { extract } = require('./extract-live-body');

const HANDLE = 'cyber-command-center';
const FRQ = '/pages/ap-cybersecurity-frq-practice';
const LABS = '/pages/ap-cybersecurity-labs';

//  Matched as one block, verbatim from the live body. Anything less exact and a
//  future edit to one of these six lines silently stops being found, and this
//  reports a clean run having changed nothing.
const BEFORE = [
  "        + '<span class=\"wplbl\">Days set aside in this unit</span>'",
  "        + '<a class=\"wpl\" href=\"" + FRQ + "\">\u{1F4DD} Free-response & review \u{00B7} '+(u.frqDays||0)+'d</a>'",
  "        + '<span class=\"wpsep\">|</span>'",
  "        + '<a class=\"wpl\" href=\"" + LABS + "\">\u{1F527} Lab / project \u{00B7} '+(u.labDays||0)+'d</a>'",
  "        + '<span class=\"wpsep\">|</span>'",
  "        + '<span class=\"wp\">\u{2705} Review & unit test \u{00B7} '+(u.testDays||0)+'d</span>'",
].join('\n');

//  The two emoji that survive are the two already on the page. Introducing a new
//  codepoint here would be a change nobody asked for, on a page that has to stay
//  pure in a script block.
const AFTER = [
  "        + '<span class=\"wplbl\">Extra practice</span>'",
  "        + '<a class=\"wpl\" href=\"" + FRQ + "\">\u{1F4DD} Free response (adding more)</a>'",
  "        + '<span class=\"wpsep\">|</span>'",
  "        + '<a class=\"wpl\" href=\"" + LABS + "\">\u{1F527} Terminal labs (adding more)</a>'",
].join('\n');

const status = (path) => cp.execSync(
  'curl -sS -o /dev/null -w "%{http_code}" --max-time 30 '
  + JSON.stringify('https://www.apcsexamprep.com' + path), { encoding: 'utf8' }).trim();

function repair(body, opts) {
  const problems = [];
  const n = body.split(BEFORE).length - 1;
  if (n === 0) {
    problems.push('the pacing strip was not found verbatim. Someone has edited those six lines '
      + 'since this was written, so read the live body before changing this pattern.');
    return { problems };
  }
  if (n > 1) problems.push('the pacing strip appears ' + n + ' times; this program expects exactly one');

  const after = body.replace(BEFORE, AFTER);

  //  There is deliberately NO "nothing outside the strip moved" check here.
  //  One was written, and mutation testing proved it hollow: with a single
  //  replace(BEFORE, AFTER) and more-than-one already refused above, text
  //  outside the strip cannot change, so the guard could never fail. A check
  //  that cannot fail reads as safety and provides none. The property is still
  //  asserted, against the real body, in smoke/cyber-cc-extra-practice.js
  //  section 4, where it is a fact about the output rather than a branch that
  //  never runs. If repair() ever grows past a single substitution, the guard
  //  comes back and a mutation has to prove it.

  //  No day budget may survive anywhere in the strip's vocabulary.
  if (/Days set aside/.test(after)) problems.push('"Days set aside" still present after the edit');
  for (const f of ['frqDays', 'labDays', 'testDays']) {
    if (after.includes("+(u." + f + "||0)+'d")) problems.push(f + ' is still rendered as a day count');
  }
  //  ...but the DATA has to survive, because unitDays() still sums it.
  if (!/function unitDays/.test(after)) problems.push('unitDays() went missing');
  for (const f of ['frqDays', 'labDays', 'testDays']) {
    if (!after.includes('u.' + f)) problems.push(f + ' no longer feeds unitDays(), which would move every day number');
  }

  //  A link that does not answer the click is the exact problem this strip has
  //  already been through twice.
  if (!opts || opts.checkLive !== false) {
    for (const t of [FRQ, LABS]) {
      const code = status(t);
      if (code !== '200') problems.push(t + ' answers ' + code + ', so this must not link it');
    }
  }

  return { problems, after, changed: after !== body };
}

const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
const BOM = '\u{FEFF}';

function sheet(handle, body) {
  const head = ['Handle', 'Command', 'Body HTML'].map(cell).join(',');
  return BOM + [head, [handle, 'MERGE', body].map(cell).join(',')].join('\r\n') + '\r\n';
}

module.exports = { BEFORE, AFTER, repair, sheet, HANDLE, FRQ, LABS };

if (require.main === module) {
  const [src, out] = process.argv.slice(2);
  if (!src) {
    console.error('usage: node scripts/cyber-cc-extra-practice.js <command-center.html> [out.csv]');
    process.exit(2);
  }
  const raw = fs.readFileSync(src, 'utf8');
  const body = raw.includes('<main') ? extract(raw) : raw;
  const r = repair(body);
  console.log('\nCYBER COMMAND CENTER: THE PACING STRIP\n');
  if (r.problems && r.problems.length) {
    console.error('  ' + r.problems.length + ' refused. No file written.\n');
    r.problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  console.log('  before:');
  BEFORE.split('\n').forEach((l) => console.log('    ' + l.trim()));
  console.log('\n  after:');
  AFTER.split('\n').forEach((l) => console.log('    ' + l.trim()));
  console.log('\n  the day values stay in unitDays(), so no day number on the page moves.');
  if (out) {
    fs.writeFileSync(out, sheet(HANDLE, r.after));
    console.log('\n  wrote ' + out + '  (1 row, Body HTML)\n');
  }
}
