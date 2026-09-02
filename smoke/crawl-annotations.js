'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the audit says WHY it is red.
//
//  The bug this pins is not in any code. site-crawl.js exits 1 when it finds a
//  P0, when it aborts on throttling, and when it runs out of clock, and the
//  Actions list shows one red X for all three. The audit "failed" four nights
//  running (2026-08-29 to 09-01) and nobody opened a report, because a red X
//  reads as a broken job.
//
//  It was not broken. The complete-picture step passed on all four, so aborted
//  and truncated were both null: four healthy crawls reporting real findings.
//
//  So the property under test is a DISTINCTION, not a format: a broken crawl and
//  a crawl that found things must never produce the same annotation.
//
//  Run: npm run smoke:crawlnotes
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const { verdict, annotate, render } = require('../scripts/crawl-annotations');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const crawl = (over) => Object.assign({
  crawled: 318, sitemap_total: 2071, shard: '1/7', aborted: null, truncated: null, findings: [],
}, over || {});
const finds = (n, tier) => Array.from({ length: n }, () => ({ tier }));

console.log('\n1. THE DISTINCTION: broken and productive must not look alike');
{
  const healthy = verdict(crawl({ findings: finds(3, 'P0') }), 1);
  const aborted = verdict(crawl({ aborted: '429 from the storefront, 3 strikes' }), 1);
  ok('  a crawl that found P0s is NOT broken', healthy.broken === false, healthy);
  ok('  a crawl that gave up IS broken', aborted.broken === true, aborted);
  ok('  and their titles do not read alike',
    healthy.title !== aborted.title && !/BROKEN/.test(healthy.title) && /BROKEN/.test(aborted.title),
    { healthy: healthy.title, aborted: aborted.title });
  ok('  the healthy one says outright that red means findings',
    /FOUND things, not because it failed/.test(healthy.message), healthy.message);
  ok('  the broken one says nothing was audited',
    /Nothing was audited|collected nothing|Coverage is partial/.test(aborted.message), aborted.message);
}

console.log('\n2. Every way the crawl can be broken is reported as broken');
{
  ok('  no crawl file at all', verdict(null, 1).broken === true);
  ok('  aborted', verdict(crawl({ aborted: 'throttled' }), 1).broken === true);
  ok('  truncated', verdict(crawl({ truncated: 'max-minutes' }), 1).broken === true);
  ok('  a truncated run warns that an absent finding proves nothing',
    /absent finding does not mean/.test(verdict(crawl({ truncated: 'x' }), 1).message));
  //  Order matters: an aborted run is also incomplete, and "aborted" is the more
  //  useful word, so it must win.
  const both = verdict(crawl({ aborted: 'throttled', truncated: 'max-minutes' }), 1);
  ok('  a run that both aborted and truncated is reported as aborted',
    /aborted/.test(both.title), both.title);
}

console.log('\n3. The counts are real, and they come from the findings');
{
  const v = verdict(crawl({ findings: [...finds(2, 'P0'), ...finds(46, 'P1'), ...finds(266, 'P2')] }), 1);
  ok('  P0 count is exact', v.counts.P0 === 2, v.counts);
  ok('  and every tier is carried', v.counts.P1 === 46 && v.counts.P2 === 266 && v.counts.P3 === 0, v.counts);
  ok('  the title leads with the P0 count, because that is the one that is red for',
    /^2 P0 found/.test(v.title), v.title);
  ok('  an unknown tier is not silently counted as something else',
    verdict(crawl({ findings: [{ tier: 'P9' }] }), 0).counts.P0 === 0);
}

console.log('\n4. A clean run is a notice, not an error');
{
  const clean = verdict(crawl({ findings: finds(46, 'P1') }), 0);
  ok('  no P0 and a zero exit is a notice', clean.level === 'notice' && !clean.broken, clean);
  ok('  and it still reports what it found', /46 P1/.test(clean.title), clean.title);
  ok('  a P0 run is an error annotation',
    verdict(crawl({ findings: finds(1, 'P0') }), 1).level === 'error');
  //  The case that should never happen and therefore must be visible: exit 1
  //  with nothing to justify it means the crawler's own contract slipped.
  const odd = verdict(crawl({ findings: finds(5, 'P1') }), 1);
  ok('  nonzero exit with no P0 and no abort is flagged rather than swallowed',
    odd.level === 'warning' && /exited 1/.test(odd.message), odd);
}

console.log('\n5. The annotation is one line, whatever the input contains');
{
  const line = annotate('error', 'a\nb::c', 'x\r\ny::z');
  ok('  newlines never break out of the annotation', !/[\r\n]/.test(line), line);
  ok('  and a literal :: in the text cannot terminate it early',
    line.split('::').length === 3, line);
  const r = render(crawl({ findings: finds(1, 'P0') }), 1);
  ok('  render emits exactly one annotation line', r.lines.length === 1, r.lines);
  ok('  starting with the GitHub annotation prefix', /^::(error|warning|notice) title=/.test(r.lines[0]), r.lines[0]);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
