'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SAY WHY THE AUDIT IS RED, IN THE ONE PLACE SOMEBODY LOOKS
//
//  site-crawl.js exits 1 for three different reasons: it found a P0, it aborted
//  on throttling, or it ran out of wall clock. Only the last two mean the job is
//  broken; the first means the job WORKED. The Actions list shows the same red X
//  for all three, so the audit failed four nights running (2026-08-29 through
//  09-01) and nobody opened one, because a red X reads as a broken job.
//
//  It was not broken. The "did the crawl collect a complete picture" step
//  succeeded on all four, which means aborted and truncated were both null, so
//  every one of those runs was a healthy crawl reporting real findings.
//
//  The full report already goes to the job summary, so nothing is missing. What
//  is missing is a reason on the outside of the box. This emits GitHub
//  annotations, which is the only text that shows up next to the red X itself.
//
//  Run: node scripts/crawl-annotations.js current-crawl.json <crawler-exit-code>
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');

const TIERS = ['P0', 'P1', 'P2', 'P3'];

//  One line, GitHub's annotation syntax. Kept separate from the deciding so the
//  decision can be tested without capturing stdout formatting.
function annotate(level, title, message) {
  const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/::/g, ':');
  return `::${level} title=${clean(title)}::${clean(message)}`;
}

//  THE WHOLE POINT: separate "the crawl broke" from "the crawl found things".
//  A caller that cannot tell those apart stops reading, which is what happened.
function verdict(crawl, exitCode) {
  if (!crawl) {
    return { broken: true, level: 'error', title: 'AUDIT BROKEN: no crawl file',
      message: 'current-crawl.json was never written or would not parse, so this run '
        + 'collected nothing and tomorrow has no baseline.' };
  }
  if (crawl.aborted) {
    return { broken: true, level: 'error', title: 'AUDIT BROKEN: crawl aborted',
      message: `The crawl gave up: ${crawl.aborted}. This is throttling or a dead host, `
        + 'not a finding. Nothing was audited.' };
  }
  if (crawl.truncated) {
    return { broken: true, level: 'error', title: 'AUDIT BROKEN: crawl truncated',
      message: `The crawl ran out of time: ${crawl.truncated}. Coverage is partial, `
        + 'so an absent finding does not mean the problem is absent.' };
  }

  const counts = {};
  for (const t of TIERS) counts[t] = 0;
  for (const f of crawl.findings || []) {
    if (counts[f.tier] !== undefined) counts[f.tier] += 1;
  }
  const summary = TIERS.map((t) => `${counts[t]} ${t}`).join(', ');
  const scope = `${crawl.crawled} of ${crawl.sitemap_total} URLs, shard ${crawl.shard || '?'}`;

  //  A P0 keeps the run red, and it should: a student hitting a P0 is the thing
  //  this job exists to catch. The annotation is what stops the red X being
  //  mistaken for a broken job.
  if (counts.P0 > 0) {
    return { broken: false, level: 'error', counts,
      title: `${counts.P0} P0 found, audit healthy`,
      message: `${summary}. ${scope}. The crawl completed normally: this run is red because it `
        + 'FOUND things, not because it failed. Full report in the job summary.' };
  }
  if (exitCode && Number(exitCode) !== 0) {
    return { broken: false, level: 'warning', counts,
      title: 'Audit healthy, crawler exited nonzero with no P0',
      message: `${summary}. ${scope}. Worth a look at scripts/site-crawl.js: it exited `
        + `${exitCode} without an abort, a truncation, or a P0.` };
  }
  return { broken: false, level: 'notice', counts,
    title: `Audit clean: ${summary}`,
    message: `${scope}. No P0. Full report in the job summary.` };
}

function render(crawl, exitCode) {
  const v = verdict(crawl, exitCode);
  return { lines: [annotate(v.level, v.title, v.message)], verdict: v };
}

if (require.main === module) {
  const [file, code] = process.argv.slice(2);
  let crawl = null;
  try { crawl = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { crawl = null; }
  const { lines, verdict: v } = render(crawl, code);
  lines.forEach((l) => console.log(l));
  //  Never fails the step. The crawler's own exit code already decides the run;
  //  this only explains it, and an explainer that can fail the build is a new
  //  way for the audit to look broken.
  console.log(v.broken ? 'AUDIT BROKEN' : 'AUDIT HEALTHY');
}

module.exports = { verdict, annotate, render, TIERS };
