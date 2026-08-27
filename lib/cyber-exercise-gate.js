'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CHECKS A GRADED EXERCISE PAGE NEEDS, ON TOP OF THE PAGE-LEVEL ONES.
//
//  ── WHY AN EXERCISE IS DIFFERENT ────────────────────────────────────────────
//  These pages grade in JavaScript. A <select> holds option VALUES and the
//  scoring code compares those values as strings. Nothing in the page connects
//  the two: they work because they happen to spell the same thing. So:
//
//   * A CREDITED VALUE THAT NAMES NO OPTION IS UNGETTABLE. The branch never
//     fires, the student cannot score that point however well they understand
//     it, and nothing throws. Every `x==='...'` is walked back to the select it
//     reads and checked against that select's options.
//
//   * A getElementById THAT LOST ITS ELEMENT throws at grade time and takes the
//     whole Check button with it. Renaming a select in the markup and not in the
//     script is exactly that.
//
//   * NO CREDITED ANSWER MAY NAME A LEGACY TERM. The one check that reads
//     meaning rather than structure, and the point of the realignment.
//
//  ── THE AMBIGUOUS-WORD PROBLEM, WHICH COST A FALSE POSITIVE ─────────────────
//  The Unit 2 tactics are ordinary English words. On Exercise 1 a credited
//  option literally read "Authority (impersonating a trusted figure in power)",
//  which is the tactic taught as vocabulary and is the defect. On Exercise 2 a
//  feedback string reads "Sarah M. is new CFO (authority source)", which is the
//  ordinary noun and is fine. A substring match cannot tell them apart, and the
//  first version of this check flagged the second.
//
//  So the ambiguous words match only in TERM POSITION: at the start of a label,
//  or immediately followed by a parenthesised gloss, which is how a vocabulary
//  list presents a word it is teaching. The unambiguous ones match anywhere,
//  because there is no innocent use of "vishing".
//
//  KNOWN GAP, stated rather than papered over: a mid-sentence teaching use with
//  no gloss ("the attacker exploited authority") reads as ordinary English to
//  this check and passes. Tightening it further trades one false negative for
//  false positives on prose that is fine, which is the worse failure here since
//  it drives edits to copy that was never broken. The human position audit,
//  reading WHERE each surviving term sits rather than counting them, is still
//  the measurement. This check is a backstop for the cases it can be sure of.
// ─────────────────────────────────────────────────────────────────────────────

//  No innocent use. Match anywhere.
const LEGACY_ALWAYS = ['spear phishing', 'spear-phishing', 'vishing', 'smishing',
  'whaling', 'baiting', 'quid pro quo', 'polymorphic'];

//  Unit 2 tactics that are also ordinary words. Match only where a page is
//  presenting them AS a term.
const LEGACY_AS_TERM = ['authority', 'consensus', 'scarcity', 'familiarity',
  'pretexting', 'tailgating'];

//  Returns the offending term, or null.
function namesLegacyTerm(text) {
  const t = String(text || '');
  const low = t.toLowerCase();
  for (const term of LEGACY_ALWAYS) {
    if (low.includes(term)) return term;
  }
  for (const term of LEGACY_AS_TERM) {
    //  term position: opens the string, or is followed by a gloss in parens
    const opensIt = new RegExp(`^\\s*${term}\\b`, 'i');
    const glossed = new RegExp(`\\b${term}\\s*\\(`, 'i');
    if (opensIt.test(t) || glossed.test(t)) return term;
  }
  return null;
}

const flat = (s) => s
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

//  { selectId: [{value, label}] }, placeholder options dropped.
function selects(html) {
  const out = {};
  for (const m of html.matchAll(/<select[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    out[m[1]] = [...m[2].matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)]
      .map((o) => ({ value: o[1], label: flat(o[2]).trim() }))
      .filter((o) => o.value !== '');
  }
  return out;
}

//  `var NAME=document.getElementById('SELECT').value`, so a comparison against
//  NAME can be traced to the select it actually reads.
function varToSelect(html) {
  const map = {};
  for (const m of html.matchAll(/(\w+)\s*=\s*document\.getElementById\('([^']+)'\)\.value/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function credited(html) {
  const vars = varToSelect(html);
  const out = [];
  for (const m of html.matchAll(/(\w+)\s*===?\s*'([^']+)'/g)) {
    if (vars[m[1]]) out.push({ varName: m[1], select: vars[m[1]], value: m[2] });
  }
  return out;
}

//  The keyword arrays free-text answers are scored against, so a change to one
//  is visible rather than silent.
function keywordLists(html) {
  const out = [];
  for (const m of html.matchAll(/\bt(?:Match|Count)\(\s*(\w+)\s*,\s*\[([^\]]*)\]/g)) {
    out.push({ varName: m[1], keys: m[2].split(',').map((k) => k.trim().replace(/^'|'$/g, '')) });
  }
  return out;
}

//  Everything an exercise page must satisfy. Returns {fail, note}.
function check(before, after) {
  const fail = [];
  const note = [];

  const sel = selects(after);
  const selBefore = selects(before);
  note.push(`selects: ${Object.keys(sel).length} (${Object.keys(sel).join(', ')})`);

  // ---- ids: only a REGRESSION is a failure ---------------------------------
  //  Not "every id exists": these pages legitimately reach for theme elements
  //  that live outside the body, apcyber-wrapper and MainContent among them.
  const idsBefore = new Set([...before.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const idsAfter = new Set([...after.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const external = [];
  for (const m of after.matchAll(/document\.getElementById\('([^']+)'\)/g)) {
    if (idsAfter.has(m[1])) continue;
    if (idsBefore.has(m[1])) fail.push(`getElementById('${m[1]}') lost its element in this edit`);
    else if (!external.includes(m[1])) external.push(m[1]);
  }
  if (external.length) note.push(`ids the theme provides, not this body: ${external.join(', ')}`);

  // ---- every credited value is actually gettable ---------------------------
  const keys = credited(after);
  note.push(`credited answers: ${keys.map((k) => `${k.select}=${k.value}`).join(' ')}`);
  for (const k of keys) {
    const opts = sel[k.select];
    if (!opts) { fail.push(`credited ${k.select}='${k.value}' but ${k.select} is not a select`); continue; }
    if (!opts.some((o) => o.value === k.value)) {
      fail.push(`credited ${k.select}='${k.value}' is UNGETTABLE: options are ${opts.map((o) => o.value).join(', ')}`);
    }
  }

  // ---- option hygiene ------------------------------------------------------
  for (const [id, opts] of Object.entries(sel)) {
    const seen = new Set();
    for (const o of opts) {
      if (seen.has(o.value)) fail.push(`${id} has two options with value ${JSON.stringify(o.value)}`);
      seen.add(o.value);
      if (!o.label) fail.push(`${id} option ${JSON.stringify(o.value)} has no label`);
    }
    if (selBefore[id] && selBefore[id].length !== opts.length) {
      fail.push(`${id} option count changed: ${selBefore[id].length} -> ${opts.length}`);
    }
  }
  //  A select whose id is NEW has no before to diff, so the count check above
  //  skips it and a dropped option rides through. Not hypothetical: p1a-tactic
  //  became p1a-defense on Exercise 1. Arity is therefore also checked against
  //  the page's own convention rather than a number picked here. Pages that
  //  genuinely mix arities (a yes/no beside a four-way) are exempted by taking
  //  the modal count and only flagging counts below it.
  const arity = Object.values(sel).map((o) => o.length);
  if (arity.length) {
    const mode = [...arity].sort((a, b) =>
      arity.filter((x) => x === a).length - arity.filter((x) => x === b).length).pop();
    for (const [id, opts] of Object.entries(sel)) {
      if (opts.length < mode && (!selBefore[id] || selBefore[id].length >= mode)) {
        fail.push(`${id} offers ${opts.length} options where this page's convention is ${mode}`);
      }
    }
    note.push(`options per select: ${mode} (range ${Math.min(...arity)}-${Math.max(...arity)})`);
  }
  const renamed = Object.keys(sel).filter((id) => !selBefore[id]);
  if (renamed.length) note.push(`selects new in this edit (no before to diff): ${renamed.join(', ')}`);

  // ---- options nothing credits: a note, so a human reads the list ----------
  const keyed = new Set(keys.map((k) => `${k.select} ${k.value}`));
  const orphan = [];
  for (const [id, opts] of Object.entries(sel)) {
    for (const o of opts) if (!keyed.has(`${id} ${o.value}`)) orphan.push(`${id}=${o.value}`);
  }
  note.push(`options no branch credits (distractors, read the list): ${orphan.join(' ')}`);

  // ---- THE POINT: no credited answer, and no scoring feedback, names one ----
  for (const k of keys) {
    const opt = (sel[k.select] || []).find((o) => o.value === k.value);
    if (!opt) continue;
    const t = namesLegacyTerm(opt.label);
    if (t) fail.push(`credited answer for ${k.select} names a legacy term (${t}): ${JSON.stringify(opt.label.slice(0, 90))}`);
  }
  for (const m of after.matchAll(/\+\d+ (?:&mdash;|—) (?:Correct|Partial)\.([^']*)/g)) {
    const t = namesLegacyTerm(m[1]);
    if (t) fail.push(`scoring feedback names a legacy term (${t}): ${JSON.stringify(m[1].trim().slice(0, 90))}`);
  }

  // ---- the points did not move ---------------------------------------------
  const pts = (b) => [...b.matchAll(/pts\s*\+=\s*(\d+)|pts\+\+/g)].map((m) => m[1] || '1').join(',');
  if (pts(before) !== pts(after)) fail.push(`point awards changed: ${pts(before)} -> ${pts(after)}`);
  const caps = (b) => [...b.matchAll(/Math\.min\(Math\.round\(pts\*([\d.]+)\),(\d+)\)/g)]
    .map((m) => `${m[1]}x cap${m[2]}`).join(' ');
  if (caps(before) !== caps(after)) fail.push(`score scaling changed: ${caps(before)} -> ${caps(after)}`);
  note.push(`point awards: ${pts(after)} | scaling: ${caps(after) || 'none'}`);

  // ---- free-text keyword lists: additive only, never shrink -----------------
  //  Removing an accepted keyword silently marks down a student who used it.
  const kb = keywordLists(before);
  const ka = keywordLists(after);
  if (kb.length !== ka.length) fail.push(`keyword list count changed: ${kb.length} -> ${ka.length}`);
  else {
    for (let i = 0; i < kb.length; i++) {
      const lost = kb[i].keys.filter((k) => !ka[i].keys.includes(k));
      if (lost.length) fail.push(`keyword list for ${kb[i].varName} dropped accepted answers: ${lost.join(', ')}`);
      const added = ka[i].keys.filter((k) => !kb[i].keys.includes(k));
      if (added.length) note.push(`keyword list for ${ka[i].varName} now also accepts: ${added.join(', ')}`);
    }
  }

  return { fail, note };
}

module.exports = {
  LEGACY_ALWAYS, LEGACY_AS_TERM, namesLegacyTerm,
  flat, selects, varToSelect, credited, keywordLists, check,
};
