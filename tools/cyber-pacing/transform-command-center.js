'use strict';
// Reconciles the UNITS array on /pages/cyber-command-center with the pacing
// workbook. Targets are derived from pacing.json, never hardcoded, so the
// workbook stays the single source of truth.
//
// Four edits:
//   1. each lesson's days: becomes the workbook's teaching days for that lesson
//   2. each unit's frqDays/labDays/testDays are set so unitDays() equals the
//      workbook's total for that unit
//   3. the unit chips skip a zero-day entry rather than rendering "0d"
//   4. planText accounts for every day of a multi-day lesson
//
// The page computes lessonDays(l) = l.days + l.act, and every lesson carries
// act:1. The workbook is built the same way ("each lesson = its teaching days
// plus one quiz day"), so the two models line up exactly.

const fs = require('fs');
const path = require('path');

const pacing = JSON.parse(fs.readFileSync(path.join(__dirname, 'pacing.json'), 'utf8'));

// The two renderer blocks this pass rewrites, kept at module scope so the dry
// run can prove they are the only changes outside the UNITS array.
const CHIPS = {
  old: `var wrap = '<div class="uwrap">'
        + '<span class="wp">📝 Free-response & review · '+(u.frqDays||0)+'d</span>'
        + '<span class="wp">🔧 Lab / project · '+(u.labDays||0)+'d</span>'
        + '<span class="wp">✅ Review & unit test · '+(u.testDays||0)+'d</span>'
        + '</div>';`,
  new: `var chip = function(ico, label, n){
        return n > 0 ? '<span class="wp">'+ico+' '+label+' · '+n+'d</span>' : '';
      };
      var wrap = '<div class="uwrap">'
        + chip('📝', 'Free-response & review', u.frqDays||0)
        + chip('🔧', 'Lab / project', u.labDays||0)
        + chip('✅', 'Review & unit test', u.testDays||0)
        + '</div>';`,
};

// The old three-or-more branch printed Day 1, Day 2 and then jumped to the last
// day, leaving the middle unaccounted for. That only ever hit two three-day
// lessons before; with real day counts it hits most of the course, so the middle
// is now expressed as a range.
const PLAN = {
  old: `    return '<b>Day 1:</b> Slide Deck and Guided Notes. <b>Day 2:</b> Worked examples from Supplements. <b>Day '+l.days+':</b> Review.'+act;`,
  new: `    if(l.days===3) return '<b>Day 1:</b> Slide Deck and Guided Notes. <b>Day 2:</b> Worked examples from Supplements. <b>Day 3:</b> Review.'+act;
    return '<b>Day 1:</b> Slide Deck and Guided Notes. <b>Days 2-'+(l.days-1)+':</b> Worked examples and Supplements. <b>Day '+l.days+':</b> Review.'+act;`,
};

// ---- derive targets from the workbook ----
function deriveTargets() {
  const teach = {};
  for (const r of pacing.traditional) {
    const m = /^(\d+\.\d+)\s+.*?\s+-\s+day \d+ of (\d+)$/.exec(r.content);
    if (m && r.type === 'Teach') teach[m[1]] = Number(m[2]);
  }
  const units = {};
  for (const u of pacing.units) {
    const t = u.byType;
    units[u.unit] = {
      total: u.days,
      quizLab: t.QuizLab || 0,
      // Project and standalone Lab days both render under the "Lab / project" chip.
      labDays: (t.Lab || 0) + (t.Project || 0),
      // A unit test, plus a semester final where the unit carries one.
      testDays: (t.Test || 0) + (t.Final || 0),
      // The workbook folds FRQ practice into the AP review block and assigns no
      // separate unit review day, so this is zero by design.
      frqDays: t.Review || 0,
    };
  }
  return { teach, units };
}

function matchingBracket(s, from, open, close) {
  let d = 0;
  for (let k = from; k < s.length; k++) {
    if (s[k] === open) d++;
    else if (s[k] === close) { d--; if (d === 0) return k; }
  }
  return -1;
}

function findUnitsArray(body) {
  const i = body.search(/(?:var|const|let)\s+UNITS\s*=\s*\[/);
  if (i < 0) throw new Error('UNITS array not found');
  const open = body.indexOf('[', i);
  const close = matchingBracket(body, open, '[', ']');
  if (close < 0) throw new Error('UNITS array not closed');
  return { start: open, end: close + 1, html: body.slice(open, close + 1) };
}

function transformCommandCenter(body, notes) {
  const { teach, units } = deriveTargets();
  const arr = findUnitsArray(body);
  let out = arr.html;

  // --- 1. per-lesson days, rewritten in place so key order and spacing survive ---
  out = out.replace(/(id:"(\d+\.\d+)",\s*title:"[^"]*",(?:\s*ced:"[^"]*",)?\s*days:)(\d+)/g,
    (full, head, id, cur) => {
      const want = teach[id];
      if (want == null) { notes.push(`WARN lesson ${id} absent from the workbook, left at ${cur}`); return full; }
      if (Number(cur) !== want) notes.push(`lesson ${id}: days ${cur} -> ${want}`);
      return head + want;
    });

  // --- 2. per-unit frq/lab/test days ---
  out = out.replace(/\{\s*n:\s*(\d+),\s*name:"([^"]*)",\s*frqDays:(\d+),\s*labDays:(\d+),\s*testDays:(\d+)/g,
    (full, n, name, frq, lab, test) => {
      const t = units[n];
      if (!t) { notes.push(`WARN unit ${n} absent from the workbook`); return full; }
      if (Number(frq) !== t.frqDays) notes.push(`unit ${n}: frqDays ${frq} -> ${t.frqDays}`);
      if (Number(lab) !== t.labDays) notes.push(`unit ${n}: labDays ${lab} -> ${t.labDays}`);
      if (Number(test) !== t.testDays) notes.push(`unit ${n}: testDays ${test} -> ${t.testDays}`);
      return `{ n:${n}, name:"${name}", frqDays:${t.frqDays}, labDays:${t.labDays}, testDays:${t.testDays}`;
    });

  let next = body.slice(0, arr.start) + out + body.slice(arr.end);

  // --- 3. chips skip zero-day entries ---
  if (next.indexOf(CHIPS.old) < 0) throw new Error('chip rendering block not found verbatim');
  next = next.replace(CHIPS.old, CHIPS.new);
  notes.push('chip renderer now skips zero-day entries');

  // --- 4. planText covers every day ---
  if (next.indexOf(PLAN.old) < 0) throw new Error('planText tail not found verbatim');
  next = next.replace(PLAN.old, PLAN.new);
  notes.push('planText now covers every day of a multi-day lesson');

  return next;
}

// Evaluates the UNITS array out of a page body, so the result is checked as real
// JS rather than by regex.
function evalUnits(body) {
  const arr = findUnitsArray(body).html;
  // eslint-disable-next-line no-new-func
  return new Function('D', 'P', 'Q', `return ${arr};`)('D:', 'P:', 'Q:');
}

// Pulls planText out of a page body so the dry run can execute the real renderer.
function evalPlanText(body) {
  const i = body.search(/function\s+planText\s*\(/);
  if (i < 0) throw new Error('planText not found');
  let d = 0; let started = false; let end = i;
  for (let k = i; k < body.length; k++) {
    if (body[k] === '{') { d++; started = true; } else if (body[k] === '}') { d--; if (started && d === 0) { end = k + 1; break; } }
  }
  // eslint-disable-next-line no-new-func
  return new Function(`${body.slice(i, end)}; return planText;`)();
}

module.exports = { transformCommandCenter, deriveTargets, findUnitsArray, evalUnits, evalPlanText, CHIPS, PLAN };
