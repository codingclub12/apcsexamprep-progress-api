'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE AP CYBER UNIT 1 IN-LESSON NAVIGATOR, AND THE TWO WAYS IT LIES.
//
//  Every Unit 1 page carries a rail listing all five topics and, under each,
//  the five things a student does there: Lesson, Ex 1, Ex 2, Lab, Quiz. That
//  is 25 destinations, and the rail is the only navigation a student has once
//  they are inside a lesson. The practice hub links all 25 correctly; the rail
//  is what they actually use.
//
//  Measured against the live storefront on 2026-09-08, 28 pages carry the rail
//  and 10 of them are wrong, in two separate ways.
//
//  ── DEFECT 1: 1.3 AND 1.4 POINT AT EACH OTHER ──────────────────────────────
//  On those 10 pages the rail reads:
//
//      1.3  title="Best Practices for Public Networks"  ->  ai-driven-threats
//      1.4  title="AI-Based Cybersecurity Attacks"      ->  wireless-security
//
//  The titles are the CED's own, and they are RIGHT. The hrefs are crossed. So
//  a teacher assigning "1.3 Best Practices for Public Networks" sends the class
//  to the AI attacks lesson, and the tooltip agrees with them the whole way.
//  This is the same class of defect CLAUDE.md records at site 3.3 and 3.4, and
//  the reason config/cyber-topics.json exists.
//
//  ── DEFECT 2: LIVE PAGES RENDERED AS UNBUILT ───────────────────────────────
//  26 steps across 2 pages are greyed out and unclickable:
//
//      ap-cyber-unit-1-exam          14   1.2 Lab and Quiz, then all of 1.3-1.5
//      ap-cyber-unit-1-lesson-2-lab  12   all of 1.3, 1.4 and 1.5
//
//  All 26 target pages answer 200 with 32KB to 75KB of real content. They were
//  built; the rail on those two pages was frozen before they were, and nothing
//  ever went back. A student sitting on the Unit 1 exam cannot reach three
//  fifths of the unit.
//
//  The two share a page set, which is why they share a repair: the same 10
//  pages carry defect 1, and 2 of those 10 also carry defect 2.
//
//  ── WHERE THE RIGHT ANSWER COMES FROM ──────────────────────────────────────
//  Not from this file. TABLE is built by the caller from two sources that were
//  written independently of each other and agree on all 25 rows:
//
//    config/cyber-topics.json   the CED taxonomy, parsed from the CED text
//    the 18 correct live pages  every (lesson, label) pair they already serve
//
//  A retyped handle is how the 3.3/3.4 swap happened in the first place, so
//  nothing here retypes one.
//
//  ── WHY THE REWRITE IS NARROW ──────────────────────────────────────────────
//  The 10 bad pages carry an OLDER rail generation: <span class="ucn-steps">
//  containers, a non-link <span class="ucn-step current"> for the page itself,
//  no onclick on the lesson anchor. The 18 good pages carry a newer one. It is
//  tempting to replace the whole rail with the new generation and be done.
//
//  This does not do that, and the restraint is the point. Rewriting 10 live
//  bodies to a generation they have never served changes markup nobody has
//  measured, on pages that are otherwise fine, to fix two things that are each
//  a href. So repair() touches exactly three kinds of byte: the href on a
//  lesson anchor, the href on a step anchor, and a disabled step span becoming
//  an anchor. Everything else, the rail included, comes out byte-identical, and
//  verify() proves it rather than promising it.
//
//  Zero PII: public page markup only. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  The five step labels, in the order the rail renders them under every topic.
const LABELS = ['Lesson', 'Ex 1', 'Ex 2', 'Lab', 'Quiz'];
const LESSONS = [1, 2, 3, 4, 5];

//  A step node is an <a> or a <span> whose class is exactly one of these two.
//  The containers are class="ucn-steps" and class="ucn-steps open"; matching
//  those as steps is the bug that made the first census of this defect read 14
//  disabled steps on one page when the true answer is 26 across two, so the
//  class is pinned rather than prefix-matched.
const STEP_NODE = /<(a|span)\b([^>]*?)\bclass="(ucn-step|ucn-step current)"([^>]*?)>([\s\S]*?)<\/\1>/g;
const LESSON_ANCHOR = /<a\b([^>]*?)\bclass="ucn-lesson[^"]*"([^>]*?)>\s*(\d)\.(\d)/g;

//  A step is disabled when it is a span carrying the inline opacity rule. Two
//  spellings are live, with and without spaces after the colons, and a check
//  written against one of them reports the other page clean. Both were found
//  on 2026-09-08; the whitespace is tolerated deliberately.
const DISABLED = /opacity:\s*0\.4/;


class NavShape extends Error {
  constructor(msg) { super(msg); this.name = 'NavShape'; }
}

//  ---------------------------------------------------------------------------
//  Nesting-aware extraction of the rail. A non-greedy match to the first
//  </div> stops inside the first lesson group and returns a fragment that
//  parses as a rail with two topics in it, which is worse than not matching.
function extractRail(body) {
  const start = body.search(/<div class="ucn-rail"/);
  if (start === -1) return null;
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(body))) {
    depth += m[1] === '/' ? -1 : 1;
    if (depth === 0) return { start, end: m.index + m[0].length, html: body.slice(start, m.index + m[0].length) };
  }
  throw new NavShape('the ucn-rail div never closes');
}

//  ---------------------------------------------------------------------------
//  Split a rail into its five lesson groups. Each group runs from one lesson
//  anchor to the next, so the steps that follow an anchor belong to it.
function groups(rail) {
  const marks = [];
  const re = /<a\b[^>]*\bid="ucn-l(\d)"[^>]*>/g;
  let m;
  while ((m = re.exec(rail))) marks.push({ n: Number(m[1]), at: m.index });
  if (marks.length !== 5) throw new NavShape(`expected 5 lesson groups, found ${marks.length}`);
  return marks.map((mk, i) => ({
    n: mk.n,
    at: mk.at,
    html: rail.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at : rail.length),
  }));
}

function stepsIn(segment) {
  STEP_NODE.lastIndex = 0;
  const out = [];
  let m;
  while ((m = STEP_NODE.exec(segment))) {
    const attrs = m[2] + m[4];
    out.push({
      tag: m[1],
      attrs,
      cls: m[3],
      label: m[5].replace(/<[^>]*>/g, '').trim(),
      href: (attrs.match(/href="([^"]*)"/) || [])[1] || null,
      current: m[3] === 'ucn-step current',
      disabled: m[1] === 'span' && DISABLED.test(attrs),
      raw: m[0],
      at: m.index,
    });
  }
  return out;
}

//  ---------------------------------------------------------------------------
//  What the rail on this page actually says, as data. parse() is deliberately
//  free of any opinion about what is correct; audit() holds that.
function parse(body) {
  const rail = extractRail(body);
  if (!rail) throw new NavShape('no ucn-rail on this page');
  const gs = groups(rail.html).map((g) => ({
    n: g.n,
    at: g.at,
    html: g.html,
    lessonHref: (g.html.match(/<a\b[^>]*\bhref="([^"]*)"[^>]*\bclass="ucn-lesson/)
      || g.html.match(/<a\b[^>]*\bclass="ucn-lesson[^"]*"[^>]*\bhref="([^"]*)"/) || [])[1] || null,
    title: (g.html.match(/\btitle="([^"]*)"/) || [])[1] || null,
    steps: stepsIn(g.html),
  }));
  for (const g of gs) {
    const got = g.steps.map((s) => s.label).join('|');
    if (got !== LABELS.join('|')) {
      throw new NavShape(`lesson ${g.n} steps read ${JSON.stringify(got)}, expected ${JSON.stringify(LABELS.join('|'))}`);
    }
  }
  return { rail, groups: gs };
}

//  ---------------------------------------------------------------------------
//  Everything wrong with this rail, against TABLE. Returns a list of problems
//  rather than a boolean so that a caller can say WHICH page is wrong and how.
//  TABLE is { '3|Lab': '/pages/...', ... } plus { lesson3: '/pages/...' }.
function audit(parsed, table) {
  const problems = [];
  for (const g of parsed.groups) {
    const want = table[`lesson${g.n}`];
    if (want && g.lessonHref !== want) {
      problems.push({ kind: 'lesson-href', lesson: g.n, got: g.lessonHref, want });
    }
    for (const s of g.steps) {
      const target = table[`${g.n}|${s.label}`];
      if (!target) { problems.push({ kind: 'no-target', lesson: g.n, label: s.label }); continue; }
      if (s.disabled) {
        problems.push({ kind: 'disabled', lesson: g.n, label: s.label, want: target });
      } else if (s.tag === 'a' && s.href !== target) {
        problems.push({ kind: 'step-href', lesson: g.n, label: s.label, got: s.href, want: target });
      }
      //  A current-page span has no href and is correct as it stands.
    }
  }
  return problems;
}

//  ---------------------------------------------------------------------------
//  The rewrite. Three kinds of byte change and nothing else.
function repair(body, table) {
  const parsed = parse(body);
  const { rail } = parsed;
  let out = rail.html;
  const changes = [];

  //  Work right to left so that earlier offsets stay valid.
  const edits = [];

  for (const g of parsed.groups) {
    const wantLesson = table[`lesson${g.n}`];
    //  The lesson anchor sits at the head of its own group segment.
    const anchorRe = /<a\b[^>]*\bid="ucn-l\d"[^>]*>/;
    const am = g.html.match(anchorRe);
    if (am && wantLesson) {
      const got = (am[0].match(/href="([^"]*)"/) || [])[1];
      if (got !== wantLesson) {
        const fixed = am[0].replace(/href="[^"]*"/, `href="${wantLesson}"`);
        edits.push({ at: g.at + am.index, len: am[0].length, text: fixed });
        changes.push({ kind: 'lesson-href', lesson: g.n, from: got, to: wantLesson });
      }
    }

    for (const s of g.steps) {
      const target = table[`${g.n}|${s.label}`];
      if (!target) throw new NavShape(`no target for lesson ${g.n} step ${s.label}`);
      if (s.current && s.tag === 'span') continue;

      if (s.disabled) {
        const text = `<a href="${target}" class="ucn-step">${s.label}</a>`;
        edits.push({ at: g.at + s.at, len: s.raw.length, text });
        changes.push({ kind: 'revive', lesson: g.n, label: s.label, to: target });
      } else if (s.tag === 'a' && s.href !== target) {
        const text = s.raw.replace(/href="[^"]*"/, `href="${target}"`);
        edits.push({ at: g.at + s.at, len: s.raw.length, text });
        changes.push({ kind: 'step-href', lesson: g.n, label: s.label, from: s.href, to: target });
      }
    }
  }

  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) out = out.slice(0, e.at) + e.text + out.slice(e.at + e.len);

  const body2 = body.slice(0, rail.start) + out + body.slice(rail.end);
  return { out: body2, changes, rail: { before: rail.html, after: out } };
}

//  ---------------------------------------------------------------------------
//  Prove the rewrite rather than trust it. Re-parses the OUTPUT from scratch,
//  which is the only way to catch a rewriter that reported a change it did not
//  make, or made one it did not report.
function verify(before, after, table) {
  const fails = [];

  //  1. Nothing outside the rail moved.
  const rb = extractRail(before);
  const ra = extractRail(after);
  if (!ra) { fails.push('the repaired body has no rail'); return fails; }
  if (before.slice(0, rb.start) !== after.slice(0, ra.start)) fails.push('bytes before the rail changed');
  if (before.slice(rb.end) !== after.slice(ra.end)) fails.push('bytes after the rail changed');

  //  2. The repaired rail has no problems left.
  const parsed = parse(after);
  const left = audit(parsed, table);
  if (left.length) fails.push(`${left.length} problems remain: ${JSON.stringify(left.slice(0, 4))}`);

  //  3. Structure is preserved: same 5 groups, same labels in the same order,
  //     same count of step nodes, and the current marker still exactly where it
  //     was. A rewrite that dropped a step would satisfy check 2 vacuously.
  const pb = parse(before);
  if (pb.groups.length !== parsed.groups.length) fails.push('lesson group count changed');
  for (let i = 0; i < pb.groups.length; i++) {
    const a = pb.groups[i];
    const b = parsed.groups[i];
    if (a.n !== b.n) fails.push(`group ${i} renumbered ${a.n} to ${b.n}`);
    if (a.title !== b.title) fails.push(`lesson ${a.n} title changed`);
    if (a.steps.length !== b.steps.length) fails.push(`lesson ${a.n} step count changed`);
    for (let j = 0; j < a.steps.length; j++) {
      if (a.steps[j].label !== b.steps[j].label) fails.push(`lesson ${a.n} step ${j} label changed`);
      if (a.steps[j].current !== b.steps[j].current) fails.push(`lesson ${a.n} step ${j} current flag changed`);
    }
  }

  //  4. No step is left disabled, anywhere.
  const stillDead = parsed.groups.flatMap((g) => g.steps.filter((s) => s.disabled));
  if (stillDead.length) fails.push(`${stillDead.length} steps are still disabled`);

  //  5. Every step that is not the current page is a link.
  const notLinked = parsed.groups.flatMap((g) => g.steps.filter((s) => !s.current && s.tag !== 'a'));
  if (notLinked.length) fails.push(`${notLinked.length} steps are not links`);

  return fails;
}

module.exports = {
  LABELS, LESSONS, STEP_NODE, DISABLED, NavShape,
  extractRail, groups, stepsIn, parse, audit, repair, verify,
};
