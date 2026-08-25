'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  HOW DANGEROUS WOULD IT BE TO FIX THIS AUTOMATICALLY?
//
//  Scores a crawl finding for auto-fix risk. It SCORES ONLY. Nothing here edits
//  a file, opens a pull request, or touches Shopify, and the nightly crawl stays
//  read-only. The point of this pass is to answer the question with evidence
//  before anything is automated, rather than to start automating.
//
//  ── IT COPIES lib/command-router.js ON PURPOSE ──────────────────────────────
//  That file already answers the same question for board tasks, and its shape is
//  the one worth reusing:
//
//    CAPABILITY is recomputed on every read, from the finding and the repo.
//    CONSENT is stored, and is a human ticking a box.
//
//  Those are deliberately not the same thing. Narrowing what is capable here
//  retires every stale consent on the next run, with no migration and nothing to
//  hunt down. So this file computes capability and never reads or writes
//  consent, exactly as `routeSurface` does.
//
//  ── THE INSIGHT THAT MATTERS MOST: TWO SURFACES, NOT ONE ────────────────────
//  A crawl finding usually has a fix that lands in one place and a DEPLOY that
//  has to happen somewhere else before a student sees any difference. The 2026-08-25
//  Big Idea 3 finding is the shape:
//
//    fix_surface     lib/csp-exercise-pages.js, two lines, CI-gated, revertible
//    deploy_surface  about 44 live Shopify pages, regenerated and imported
//                    through a Matrixify sheet a human reads first
//
//  Scoring that finding as "low risk, two lines" would be true and useless, and
//  scoring it "high risk, 44 pages" would be true and would stop a safe change.
//  Both numbers are real, so both are reported. A finding is auto-fixable only
//  when the FIX surface is safe; whether students actually see the fix is a
//  separate question with a separate answer.
//
//  Run: node scripts/autofix-scan.js [--json]
// ─────────────────────────────────────────────────────────────────────────────

// ── THE NEVER LIST ───────────────────────────────────────────────────────────
//  Same posture as NEVER_AUTO in lib/command-router.js, and deliberately as
//  blunt: a false positive costs one manual fix, a false negative costs a
//  renamed handle. Handles are gradebook keys, so a robot renaming one detaches
//  every score already recorded against it.
const NEVER_AUTOFIX = [
  { re: /\b(money|pricing|price|discount|coupon|refund|payout|billing|invoice)\b/i,
    why: 'touches money, pricing, or discounts' },
  { re: /\b(delete|deletes|deleting|unpublish|unpublishes|drop table|handle rename|rename the handle|renames? handles?)\b/i,
    why: 'deletes, unpublishes, or renames a handle, and handles are gradebook keys' },
  { re: /\b(migration|migrations|migrate|backfill|backfills|schema change|alter table)\b/i,
    why: 'is a schema migration or a data backfill' },
  { re: /\b(student data|student rows|pin reset|reset pins?|roster write|student pii)\b/i,
    why: 'writes student data' },
  { re: /a human must check/i, why: 'is flagged "a human must check"' },
];

// ── WHERE A FIX LANDS, AND WHAT THAT COSTS ───────────────────────────────────
//  `auto` is whether a change to that surface can be made by an unattended agent
//  at all. It is a property of the surface, not of the finding.
const SURFACES = {
  repo: {
    auto: true,
    risk: 'low',
    why: 'This repo. 111 offline suites gate every pull request, and a bad change is one git revert.',
  },
  shopify: {
    auto: false,
    risk: 'high',
    why: 'A live page body. CLAUDE.md: every page change ships as a Matrixify sheet a human reads before importing, because that is the one path that has not silently truncated a live body.',
  },
  theme: {
    auto: false,
    risk: 'high',
    why: 'The theme repo, whose connected branch deploys to the storefront on push. lib/command-router.js already refuses this surface: merging is deploying until the theme-repo CI task ships.',
  },
  unknown: {
    auto: false,
    risk: 'high',
    why: 'The fix could not be traced to a surface, and an untraced fix is not a known-small one.',
  },
};

// ── THE ALLOW LIST ───────────────────────────────────────────────────────────
//  A finding kind is scored only if it appears here. An unrecognised kind is
//  never eligible, and it says so rather than falling through to a default. This
//  is the same failure lib/command-hazards.js documents: a gate that reads
//  `course === 'csa' || course === 'all'` compiled an empty hazard list for
//  every other course and was silent about it.
//
//  derivable  the fix is COMPUTED from evidence plus the repo, never authored.
//             This is the single sharpest discriminator. "Point this link at the
//             handle that exists" is derivable. "Write a meta description" is
//             authoring, and an agent authoring copy unattended is a different
//             product decision than an agent repairing a broken reference.
//  provable   there is an assertion that FAILS before the fix and PASSES after.
//             If it cannot be named, the fix cannot be verified, and an
//             unverifiable unattended change is the thing this whole system
//             exists to avoid.
const KINDS = {
  'broken-internal-link': {
    fix_surface: 'repo',
    deploy_surface: 'shopify',
    derivable: true,
    provable: 'a smoke assertion that every /pages/ handle a builder emits is a handle the repo knows exists',
    note: 'Only when the emitting template is in this repo. A dead link authored directly into a page body is content, not code.',
  },
  'reporter-regressed': {
    fix_surface: 'theme',
    deploy_surface: 'theme',
    derivable: false,
    provable: 'scripts/grade-path-audit.js already asserts the cross-file contract',
    note: 'The asset lives in APCSExamPrep-theme. Restoring it is a storefront deploy, which command-router refuses until theme CI exists.',
  },
  'reporter-missing': {
    fix_surface: 'theme',
    deploy_surface: 'theme',
    derivable: false,
    provable: 'scripts/grade-path-audit.js',
    note: 'Same surface as reporter-regressed.',
  },
  mojibake: {
    fix_surface: 'shopify',
    deploy_surface: 'shopify',
    derivable: true,
    provable: 'lib/site-crawl.js detectMojibake returns zero hits on the repaired body',
    note: 'The repair IS deterministic: reverseOnce yields exactly one character or refuses. But the delivery is a Matrixify import, so the safe automation here is generating the sheet, not applying it.',
  },
  'liquid-leak': {
    fix_surface: 'shopify',
    deploy_surface: 'shopify',
    derivable: false,
    provable: 'lib/site-crawl.js liquid check on the repaired body',
    note: 'Unrendered Liquid means a template did not run. What it was MEANT to print is a judgment call, not a computation.',
  },
};

const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();

// ── THE GATE ─────────────────────────────────────────────────────────────────
//  First refusal wins, and the ORDER is load-bearing for the same reason it is
//  in command-router: "touches pricing" is a more important thing to tell
//  someone than "unknown kind".
//
//  `opts.fix_surface` lets a caller that has actually traced the cause override
//  the per-kind default. The nightly agent does that tracing; this file cannot.
function assess(finding, opts = {}) {
  const kind = norm(finding && finding.kind);
  const text = `${(finding && finding.detail) || ''} ${(finding && finding.evidence) || ''} ${(finding && finding.url) || ''}`;

  const out = (o) => ({
    kind: kind || '(unset)',
    eligible: false,
    risk: 'high',
    fix_surface: null,
    deploy_surface: null,
    derivable: false,
    provable: null,
    blast: (finding && finding.blast) || 1,
    ...o,
  });

  for (const rule of NEVER_AUTOFIX) {
    if (rule.re.test(text)) {
      return out({ risk: 'never', reason: `On the never-autofix list: ${rule.why}.` });
    }
  }

  const spec = KINDS[kind];
  if (!spec) {
    return out({ reason: `Kind "${kind || '(unset)'}" is not on the auto-fix allow list, so it is not known to be safe.` });
  }

  const fixSurface = norm(opts.fix_surface) || spec.fix_surface;
  const surface = SURFACES[fixSurface] || SURFACES.unknown;
  const base = {
    fix_surface: fixSurface,
    deploy_surface: spec.deploy_surface,
    derivable: spec.derivable,
    provable: spec.provable,
    note: spec.note,
  };

  if (!surface.auto) {
    return out({ ...base, risk: surface.risk, reason: `Fix lands on ${fixSurface}. ${surface.why}` });
  }
  if (!spec.derivable) {
    return out({ ...base, risk: 'medium', reason: 'The fix has to be authored rather than computed, and authoring unattended is a different decision than repairing.' });
  }
  if (!spec.provable) {
    return out({ ...base, risk: 'medium', reason: 'No assertion can be named that fails before and passes after, so the fix could not be verified.' });
  }

  // Blast radius is a CEILING on the code change, not on the pages affected. A
  // two-line template edit that corrects a link on 44 pages is still two lines.
  const files = Number(opts.files_touched || 0);
  const maxFiles = Number(opts.max_files || 3);
  if (files > maxFiles) {
    return out({ ...base, risk: 'medium', reason: `Fix touches ${files} files, over the ${maxFiles} file ceiling for an unattended change.` });
  }

  return out({
    ...base,
    eligible: true,
    risk: surface.risk,
    reason: `Fix lands in this repo, is computed rather than authored, and is provable by ${spec.provable}.`,
  });
}

// A one-line verdict for the report. Deliberately says what a human still has to
// do, because "eligible" on its own reads as "handled" and it is not.
function verdict(a) {
  if (a.risk === 'never') return `NEVER  ${a.reason}`;
  if (!a.eligible) return `NO     ${a.reason}`;
  const deploy = a.deploy_surface && a.deploy_surface !== a.fix_surface
    ? ` Students see no change until it is deployed via ${a.deploy_surface}.`
    : '';
  return `LOW    ${a.reason}${deploy}`;
}

function summarise(findings, opts = {}) {
  const rows = (findings || []).map((f) => ({ finding: f, assessment: assess(f, opts[f && f.kind] || {}) }));
  return {
    total: rows.length,
    eligible: rows.filter((r) => r.assessment.eligible).length,
    rows,
  };
}

module.exports = { NEVER_AUTOFIX, SURFACES, KINDS, assess, verdict, summarise };
