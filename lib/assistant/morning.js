'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE MORNING VERIFY AND FIX ROUTINE  (handoff section 6)
//
//  Every morning, yesterday's reports are reproduced against the live site and
//  a small whitelist of them is fixed. This module is the part that decides
//  WHAT MAY BE TOUCHED. The script beside it does the touching.
//
//  THE NEVER TOUCH TIER IS THE WHOLE POINT OF THIS FILE, so it is first in the
//  code and first in this comment. An automated fixer loose on a live storefront
//  is a bad afternoon waiting to happen, and the difference between a useful one
//  and a catastrophic one is entirely in what it refuses. Access codes,
//  entitlements, gradebook data, pricing, deletes, handle renames, graded quiz
//  and test content: none of it is ever written by this routine in any mode,
//  and a report that so much as MENTIONS one of them is routed to a human
//  without a fix being proposed.
//
//  THE ORDER OF THE THREE TIERS IS NOT COSMETIC. classify() checks Never Touch
//  FIRST and returns immediately. A report that is both "a broken internal link"
//  and "students can see the unit test" is the second thing, and a classifier
//  that checked the auto-fix list first would file it as a redirect. Every rule
//  below is written so that the SAFER answer wins ties, and the suite asserts
//  that ordering directly rather than trusting it.
//
//  DRY RUN IS THE DEFAULT AND STAYS THE DEFAULT. MORNING_FIX_MODE must be set to
//  the literal string 'live' before anything is written, and handoff 6.4 puts a
//  fourteen day dry run in front of that decision. In dry run the morning email
//  lists what it WOULD have done and how, Tanner grades them, and a fix type
//  moves to live only when he says so.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// ── TIER 3: NEVER TOUCH (handoff 6.3) ────────────────────────────────────────
//
//  Matched on the report's CATEGORY and on its text. Both, because either alone
//  has a hole: a category is a dropdown somebody may have picked wrongly, and
//  text is absent for every student report by construction.
//
//  Deliberately broad. A false Never Touch costs one email to a human who was
//  going to read the morning report anyway. A false auto-fix costs a live page.

const NEVER_TOUCH_CATEGORIES = [
  // Any report that an assessment is in front of the wrong eyes. Handoff 6.3:
  // "Any report of students seeing assessments: email Tanner, do nothing else."
  'assessment_visibility',
  // Entitlements and access. Whether somebody should have a course is a
  // commercial question with money behind it.
  'access_not_showing',
  // Gradebook and score data. A student's record is not something a routine
  // edits at 7am.
  'gradebook_missing_scores',
  // Procurement and presale are money.
  'procurement',
  'presale',
  // The server-raised leak tripwire.
  'key_leak_blocked',
];

const NEVER_TOUCH_PHRASES = [
  // Assessments in front of students.
  'answer key', 'answers key', 'answer sheet', 'the answers', 'unit test',
  'students can see', 'student can see', 'kids can see', 'class can see',
  'see the test', 'see the quiz', 'teacher material', 'teacher materials',
  'teacher guide', 'marking scheme', 'mark scheme', 'solutions file',
  // Money.
  'price', 'pricing', 'discount', 'coupon', 'refund', 'invoice', 'purchase order',
  'charged', 'billing', 'subscription cost',
  // Identity and entitlement.
  'access code', 'class code', 'entitlement', 'licence', 'license key',
  'redeem code', 'seat count',
  // Grades.
  'gradebook', 'grade book', 'their grade', 'his grade', 'her grade',
  'score was wrong', 'scores are wrong', 'marked wrong',
  // Destructive shapes. A handle is a gradebook key; renaming one is a silent
  // data loss, which is why it is named here rather than left to judgement.
  'delete the page', 'unpublish', 'rename the handle', 'change the url',
  'remove the page',
];

// ── TIER 1: AUTO-FIX, after the dry run (handoff 6.3) ───────────────────────
//
//  Four issue types, and each one is narrow on purpose. "Broken internal link"
//  means a link that 404s and has an obvious target; it does not mean "a link
//  somebody does not like".
const AUTO_FIX_TYPES = {
  broken_internal_link: {
    label: 'Broken internal link',
    action: 'Add a Shopify redirect from the dead path to the live one.',
  },
  mojibake: {
    label: 'Mojibake in page text',
    // Detected through lib/mojibake.js, never a pasted pattern. CLAUDE.md is
    // explicit about that and about why: a pattern list cannot tell you it has
    // stopped working.
    action: 'Replace the corrupted run with the correct character, via a Matrixify MERGE sheet.',
  },
  dead_nav_link: {
    label: 'Dead navigation link',
    action: 'Repoint or remove the nav entry.',
  },
  qotd_key_mismatch: {
    label: 'QOTD key contradicts the runner',
    // The narrow case ONLY: the Java runner output matches exactly one option
    // and the key names a different one. Anything less certain is tier 2.
    action: 'Correct the answer key to the option the runner output matches.',
  },
};

// ── TIER 2: PROPOSE ONLY ────────────────────────────────────────────────────
const PROPOSE_TYPES = {
  qotd_no_matching_option: {
    label: 'QOTD output matches no option',
    action: 'Needs a rewrite. Draft a Matrixify sheet and leave it for review.',
  },
  wrong_explanation: {
    label: 'Explanation text is wrong',
    action: 'Draft the corrected text and leave it for review.',
  },
  lesson_content_error: {
    label: 'Lesson content error',
    action: 'Draft the correction and leave it for review.',
  },
  theme_change: {
    label: 'Theme repository change',
    // Handoff 6.3 puts ANY theme change here, and the reason is in both
    // CLAUDE.md files: merging a theme PR is the deploy, with nothing between
    // the click and a student's page.
    action: 'Open a draft PR against the connected branch. Never merge it.',
  },
};

function mentionsAny(text, phrases) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return phrases.some((p) => t.includes(p));
}

// Which phrase matched, for the report. A verdict nobody can audit is a verdict
// nobody should trust, and "this was refused" with no reason is exactly that.
function firstMatch(text, phrases) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  for (const p of phrases) if (t.includes(p)) return p;
  return null;
}

// ── THE CLASSIFIER ───────────────────────────────────────────────────────────
//
//  Returns { tier, type, reason, action }.
//    tier: 'never_touch' | 'auto_fix' | 'propose' | 'needs_tanner'
//
//  'needs_tanner' is the DEFAULT, not a fallback for errors. A report this
//  routine cannot confidently place is a report for a human, and the whole
//  design rests on that being the boring common case rather than a failure.
//
//  `issueType` is what the reproduce step concluded, which is the only thing
//  that can put a report in tier 1 at all. A report nobody has reproduced has
//  no issue type and therefore cannot be auto-fixed, whatever it says.
function classify(report, issueType) {
  const r = report || {};
  const text = r.bodies_retained ? (r.summary || '') : '';
  const category = String(r.category || '');

  // ── TIER 3 FIRST, ALWAYS. ──
  // A report that is both a broken link and an answer-key leak is an answer-key
  // leak. Checking the auto-fix list first would file it as a redirect, and
  // that is the failure this ordering exists to prevent.
  if (NEVER_TOUCH_CATEGORIES.includes(category)) {
    return {
      tier: 'never_touch',
      type: null,
      reason: `category ${category} is in the Never Touch tier`,
      action: 'Email Tanner. Do nothing else.',
    };
  }
  const phrase = firstMatch(text, NEVER_TOUCH_PHRASES);
  if (phrase) {
    return {
      tier: 'never_touch',
      type: null,
      reason: `the report mentions "${phrase}"`,
      action: 'Email Tanner. Do nothing else.',
    };
  }

  // Nothing reproduced it, so there is nothing to fix even in principle.
  if (!issueType) {
    return {
      tier: 'needs_tanner',
      type: null,
      reason: 'not reproduced to a known issue type',
      action: 'A human decides.',
    };
  }

  if (AUTO_FIX_TYPES[issueType]) {
    return {
      tier: 'auto_fix',
      type: issueType,
      reason: AUTO_FIX_TYPES[issueType].label,
      action: AUTO_FIX_TYPES[issueType].action,
    };
  }
  if (PROPOSE_TYPES[issueType]) {
    return {
      tier: 'propose',
      type: issueType,
      reason: PROPOSE_TYPES[issueType].label,
      action: PROPOSE_TYPES[issueType].action,
    };
  }

  return {
    tier: 'needs_tanner',
    type: issueType,
    reason: `issue type "${issueType}" is on no tier list`,
    action: 'A human decides.',
  };
}

// ── GUARDRAILS (handoff 6.4) ────────────────────────────────────────────────

// MORNING_FIX_MODE=dry_run|live, default dry_run. Anything that is not exactly
// 'live' is a dry run, so a typo fails safe rather than shipping.
function fixMode() {
  return String(process.env.MORNING_FIX_MODE || 'dry_run').trim().toLowerCase() === 'live'
    ? 'live'
    : 'dry_run';
}

// The kill switch. MORNING_FIX_ENABLED=false skips the fix step entirely and
// still sends the verify email, which is the shape that matters: switching off
// the fixing must not switch off the reporting, or nobody notices it is off.
function fixEnabled() {
  const raw = process.env.MORNING_FIX_ENABLED;
  if (raw === undefined || raw === null || String(raw).trim() === '') return true;
  const v = String(raw).trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
}

// At most ten writes per morning. Anything past that goes to "Needs you".
const MAX_WRITES = 10;
function maxWrites() {
  const n = Number(process.env.MORNING_MAX_WRITES);
  return Number.isFinite(n) && n >= 0 && n <= 50 ? Math.floor(n) : MAX_WRITES;
}

// May this particular item actually be written right now? Every gate in one
// place, so no caller can satisfy three of four and proceed.
//
// Returns { write: boolean, why }.
function writeDecision(verdict, writesSoFar) {
  if (!verdict || verdict.tier !== 'auto_fix') {
    return { write: false, why: 'not an auto-fix tier item' };
  }
  if (!fixEnabled()) {
    return { write: false, why: 'MORNING_FIX_ENABLED is off' };
  }
  if (fixMode() !== 'live') {
    return { write: false, why: 'MORNING_FIX_MODE is dry_run' };
  }
  if (writesSoFar >= maxWrites()) {
    return { write: false, why: `the ${maxWrites()} write cap for this morning is spent` };
  }
  return { write: true, why: null };
}

// Handoff 6.4: a JS or widget fix can look unfixed for up to four hours because
// Cloudflare serves API JS with a long TTL whatever the route asks (TODO #241).
// Those are marked fixed_pending_cache and re-checked the next morning rather
// than retried, because retrying writes the same bytes again and proves nothing.
const CACHE_DELAYED_TYPES = new Set(['dead_nav_link']);
function cacheDelayed(issueType, pagePath) {
  if (CACHE_DELAYED_TYPES.has(issueType)) return true;
  return /\.js(\?|$)/.test(String(pagePath || ''));
}

// The statuses the PATCH endpoint accepts, from handoff 6.1, plus the two this
// routine adds for its own bookkeeping.
const STATUSES = [
  'open', 'confirmed', 'cannot_reproduce', 'needs_tanner', 'fixed', 'dismissed',
  'fixed_pending_cache', 'duplicate',
];
const STATUS_SET = new Set(STATUSES);

// ── THE MORNING EMAIL (handoff 6.2 step 5) ──────────────────────────────────
//
//  Subject: [APCS Morning] <date>: <n> fixed, <n> need you
//
//  DELIBERATELY NOT one of the three inbound rule prefixes. Tanner's Outlook
//  rules move [APCS Bug] and [APCS Suggestion] out of the Inbox; this one has to
//  stay in it, and the handoff says so explicitly.
const PREFIX_MORNING = '[APCS Morning]';

function morningSubject(date, fixedCount, needsCount) {
  const d = String(date || new Date().toISOString().slice(0, 10));
  return `${PREFIX_MORNING} ${d}: ${fixedCount} fixed, ${needsCount} need you`
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 200);
}

// Sections in the handoff's order: Fixed, Needs you, Couldn't reproduce, Junk.
function morningBody(r) {
  const o = r || {};
  const fixed = o.fixed || [];
  const needs = o.needs || [];
  const cannot = o.cannot || [];
  const lines = [];

  lines.push(`Mode: ${fixMode()}${fixEnabled() ? '' : '  (fixing is switched OFF)'}`);
  lines.push(`Reports reviewed: ${o.reviewed || 0}`);
  lines.push('');

  if (fixMode() !== 'live') {
    lines.push('DRY RUN. Nothing below was written to the site. The "Fixed" section');
    lines.push('is what this routine WOULD have done, for you to grade.');
    lines.push('');
  }

  lines.push(`FIXED (${fixed.length})`);
  if (!fixed.length) lines.push('  nothing');
  for (const f of fixed) {
    lines.push(`  ${f.page || '(no page)'}  [${f.type || 'unknown'}]`);
    lines.push(`    ${f.action || ''}`);
    if (f.before) lines.push(`    before: ${String(f.before).slice(0, 160)}`);
    if (f.after) lines.push(`    after:  ${String(f.after).slice(0, 160)}`);
    if (f.revert) lines.push(`    revert: ${f.revert}`);
    lines.push(`    report: ${f.id}`);
  }
  lines.push('');

  lines.push(`NEEDS YOU (${needs.length})`);
  if (!needs.length) lines.push('  nothing');
  for (const n of needs) {
    lines.push(`  ${n.page || '(no page)'}  [${n.tier || ''}]`);
    lines.push(`    ${n.reason || ''}`);
    if (n.action) lines.push(`    ${n.action}`);
    lines.push(`    report: ${n.id}`);
  }
  lines.push('');

  lines.push(`COULD NOT REPRODUCE (${cannot.length})`);
  if (!cannot.length) lines.push('  nothing');
  for (const c of cannot) lines.push(`  ${c.page || '(no page)'}  report: ${c.id}`);
  lines.push('');

  // Count only. Handoff 6.2: "Junk dismissed (count only)". The point of the
  // number is that a filter nobody can audit is a filter nobody should trust,
  // and the point of it being only a number is that nobody wants the spam.
  lines.push(`JUNK DISMISSED: ${o.dismissed || 0}`);

  return lines.join('\n');
}

module.exports = {
  classify, writeDecision, morningSubject, morningBody,
  fixMode, fixEnabled, maxWrites, cacheDelayed, mentionsAny, firstMatch,
  NEVER_TOUCH_CATEGORIES, NEVER_TOUCH_PHRASES, AUTO_FIX_TYPES, PROPOSE_TYPES,
  STATUSES, STATUS_SET, MAX_WRITES, PREFIX_MORNING, CACHE_DELAYED_TYPES,
};
