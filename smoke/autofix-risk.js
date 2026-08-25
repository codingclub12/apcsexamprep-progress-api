'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-FIX RISK RULES, PINNED OFFLINE.
//
//  Every rule asserted in BOTH directions: it refuses what it must refuse, and
//  it allows what it should allow. A gate that only has the first half drifts
//  into refusing everything and quietly stops being read; a gate that only has
//  the second half is how a robot renames a handle.
//
//  Run: npm run smoke:autofixrisk
// ─────────────────────────────────────────────────────────────────────────────
const R = require('../lib/autofix-risk');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

const f = (kind, over = {}) => ({ kind, url: 'https://x/pages/a', detail: 'd', evidence: 'e', ...over });

console.log('\n  The never list outranks everything\n');
//  Order is load-bearing: "touches pricing" is more important to say than
//  "unknown kind", the same way command-router checks NEVER_AUTO before size.
for (const [label, detail] of [
  ['pricing', 'the discount code on the pricing page is wrong'],
  ['handle rename', 'this needs a handle rename to match the manifest'],
  ['deletion', 'delete the orphaned page'],
  ['migration', 'needs a schema change and a backfill'],
  ['student data', 'requires a pin reset for the roster'],
  ['flagged', 'a human must check this one'],
]) {
  const a = R.assess(f('broken-internal-link', { detail }));
  ok(`${label} is refused outright`, a.risk === 'never' && !a.eligible, a.reason);
}
ok('a never-listed finding is refused even on the safest kind',
  R.assess(f('broken-internal-link', { detail: 'rename the handle' })).risk === 'never');

console.log('\n  Only allow-listed kinds are scored at all\n');
ok('an unknown kind is never eligible', !R.assess(f('some-new-check')).eligible);
ok('an unknown kind says WHY rather than falling through',
  /not on the auto-fix allow list/.test(R.assess(f('some-new-check')).reason));
ok('a finding with no kind is not eligible', !R.assess(f('')).eligible);
ok('meta-missing is not on the list, because writing copy is authoring',
  !R.assess(f('meta-missing')).eligible);

console.log('\n  Surface decides, and the repo is the only automatable one\n');
const link = R.assess(f('broken-internal-link'));
ok('a repo-surface generator bug IS eligible', link.eligible === true, link);
ok('and is scored low risk', link.risk === 'low');

for (const kind of ['reporter-regressed', 'reporter-missing']) {
  const a = R.assess(f(kind));
  ok(`${kind} is refused: it lands in the theme`, !a.eligible && a.fix_surface === 'theme');
  ok(`${kind} cites the deploy-is-merging rule`, /merging is deploying|storefront/.test(a.reason));
}

const moji = R.assess(f('mojibake'));
ok('mojibake is refused: the fix lands on a live page body', !moji.eligible && moji.fix_surface === 'shopify');
ok('mojibake cites the Matrixify rule', /Matrixify/.test(moji.reason));
ok('but mojibake is still recorded as DERIVABLE', moji.derivable === true);
//  That distinction is the useful half of the answer: the repair is computable,
//  the delivery is not automatable. Those are different problems with different
//  fixes, and collapsing them loses the one that could be automated later.

const liquid = R.assess(f('liquid-leak'));
ok('a Liquid leak is not derivable: what it meant to print is a judgment call',
  liquid.derivable === false && !liquid.eligible);

console.log('\n  Two surfaces, not one\n');
//  The Big Idea 3 finding: two lines in this repo, about 44 live pages that keep
//  the bad link until they are regenerated and imported.
ok('a link bug fixes in the repo but deploys through Shopify',
  link.fix_surface === 'repo' && link.deploy_surface === 'shopify');
ok('the verdict line says students see nothing until it is deployed',
  /Students see no change until/.test(R.verdict(link)), R.verdict(link));
ok('a same-surface finding does not add that clause',
  !/Students see no change until/.test(R.verdict(R.assess(f('reporter-regressed')))));

console.log('\n  A caller that traced the cause can override the surface\n');
//  The per-kind surface is a default. A dead link authored directly into a page
//  body is content, not code, and the agent that traced it says so.
const authored = R.assess(f('broken-internal-link'), { fix_surface: 'shopify' });
ok('a link bug traced to a page body is refused', !authored.eligible);
ok('an untraceable surface is refused rather than assumed safe',
  !R.assess(f('broken-internal-link'), { fix_surface: 'unknown' }).eligible);

console.log('\n  Blast radius caps the DIFF, not the pages affected\n');
ok('a two-line fix across 44 pages is still eligible',
  R.assess({ ...f('broken-internal-link'), blast: 44 }, { files_touched: 2 }).eligible);
ok('a fix touching more files than the ceiling is refused',
  !R.assess(f('broken-internal-link'), { files_touched: 9 }).eligible);
ok('the file ceiling is configurable',
  R.assess(f('broken-internal-link'), { files_touched: 9, max_files: 10 }).eligible);

console.log('\n  Capability is computed, never consent\n');
//  CLAUDE.md: consent is stored, capability is recomputed on every read. This
//  module must never read or write a stored flag, so narrowing it here retires
//  every stale tick on the next run with no migration.
const src = require('fs').readFileSync(require.resolve('../lib/autofix-risk.js'), 'utf8');
ok('the module reads no stored consent flag', !/auto_dispatch|consent\s*=|\.consent\b/.test(src));
//  Assert on CALL SYNTAX, not on prose. The first version of this line tested
//  for `git ` and matched the words "one git revert" inside a comment. That is
//  the third time in this project a blunt substring test has matched English
//  rather than code, after /captcha/i on every Shopify page and \bcheck-btn\b
//  inside sp-check-btn. The lesson has a shape: match the syntax, not the word.
ok('the module performs no writes and runs no commands',
  !/\b(?:writeFileSync|writeFile|appendFileSync|execSync|spawnSync|exec|spawn)\s*\(/.test(src)
  && !/\bfetch\s*\(/.test(src)
  && !/require\(['"]child_process['"]\)/.test(src));
ok('every allow-listed kind declares both surfaces',
  Object.values(R.KINDS).every((k) => k.fix_surface && k.deploy_surface));
ok('every allow-listed kind names a provable assertion',
  Object.values(R.KINDS).every((k) => typeof k.provable === 'string' && k.provable.length > 10));
ok('every surface says why it carries the risk it does',
  Object.values(R.SURFACES).every((s) => s.why && s.why.length > 20));

console.log('\n  Summarising a whole run\n');
const s = R.summarise([f('broken-internal-link'), f('mojibake'), f('meta-missing'), f('reporter-regressed')]);
ok('counts every finding', s.total === 4);
ok('exactly one of tonight\'s shapes is auto-fixable', s.eligible === 1, s.rows.map((r) => r.assessment.eligible));

console.log('\n' + (fail ? ('  ' + fail + ' FAILED, ' + pass + ' passed') : ('  OK - all ' + pass + ' checks passed')) + '\n');
process.exit(fail ? 1 : 0);
