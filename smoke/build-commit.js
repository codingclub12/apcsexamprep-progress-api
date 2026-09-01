'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: which build is serving.
//
//  Exists because the failure it guards was invisible from the outside and
//  broke the thing meant to detect it. On 2026-09-01 the first real
//  railway-deploy.yml run served `commit: unknown`, its own confirm step polled
//  ten minutes for a sha that could never appear, and it failed a deploy that
//  had landed. deploy-drift.yml would have gone permanently red for the same
//  reason.
//
//  The two assertions that matter most are the last two, and neither is about
//  JavaScript: gitignoring build-commit.txt would drop it from the `railway up`
//  upload and silently restore the bug, and committing it would pin a stale sha
//  into every local run.
//
//  Run: npm run smoke:buildcommit
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { resolveBuildCommit } = require('../lib/build-commit');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildcommit-'));
const shaFile = path.join(tmp, 'build-commit.txt');
const write = (v) => { fs.writeFileSync(shaFile, v); return shaFile; };

console.log('\n1. Nothing to go on');
ok('1.1 no env and no file reports unknown, never an empty string',
  resolveBuildCommit({ env: {}, file: null }) === 'unknown');
ok('1.2 a file that does not exist is not a throw',
  resolveBuildCommit({ env: {}, file: path.join(tmp, 'nope.txt') }) === 'unknown');

console.log('\n2. Precedence, in the documented order');
ok('2.1 BUILD_COMMIT wins over both other sources',
  resolveBuildCommit({
    env: { BUILD_COMMIT: 'aaaaaaa1', RAILWAY_GIT_COMMIT_SHA: 'ccccccc3' },
    file: write('bbbbbbb2'),
  }) === 'aaaaaaa');
ok('2.2 the file wins over RAILWAY_GIT_COMMIT_SHA',
  resolveBuildCommit({
    env: { RAILWAY_GIT_COMMIT_SHA: 'ccccccc3' },
    file: write('bbbbbbb2'),
  }) === 'bbbbbbb');
ok('2.3 RAILWAY_GIT_COMMIT_SHA still works, so the integration path is not broken',
  resolveBuildCommit({ env: { RAILWAY_GIT_COMMIT_SHA: 'ccccccc3def' }, file: null }) === 'ccccccc');

console.log('\n3. Shapes the real pipeline actually produces');
ok('3.1 a full 40-char sha is cut to 7, matching the confirm step comparison',
  resolveBuildCommit({ env: {}, file: write('2768fcb5aa0980b28df1fe39a241cf7f19e38cec') }) === '2768fcb');
ok('3.2 the trailing newline that `echo` writes is trimmed',
  resolveBuildCommit({ env: {}, file: write('2768fcb5aa0980b28df1fe39a241cf7f19e38cec\n') }) === '2768fcb');
ok('3.3 an empty file falls through instead of returning an empty commit',
  resolveBuildCommit({ env: {}, file: write('   \n') , }) === 'unknown');
ok('3.4 an empty BUILD_COMMIT variable falls through rather than blanking it',
  resolveBuildCommit({ env: { BUILD_COMMIT: '', RAILWAY_GIT_COMMIT_SHA: 'ccccccc3' }, file: null }) === 'ccccccc');

console.log('\n4. The two traps that would silently restore the bug');
const repoRoot = path.join(__dirname, '..');
const git = (args) => {
  try {
    execFileSync('git', args, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] });
    return 0;
  } catch (e) {
    return typeof e.status === 'number' ? e.status : -1;
  }
};

let gitUsable = true;
try { execFileSync('git', ['rev-parse', '--git-dir'], { cwd: repoRoot, stdio: 'ignore' }); }
catch (e) { gitUsable = false; }

if (!gitUsable) {
  console.log('  [SKIP] no usable git checkout here, so the two repo-state checks cannot run');
} else {
  // `railway up` honours .gitignore. Ignoring this file would drop it from the
  // upload it exists to label, which is exactly the bug, silently.
  ok('4.1 build-commit.txt is NOT gitignored, so `railway up` still uploads it',
    git(['check-ignore', '-q', 'build-commit.txt']) !== 0);

  // Written per deploy in CI. A committed copy would pin a stale sha.
  ok('4.2 build-commit.txt is NOT committed, so no stale sha ships in the tree',
    git(['ls-files', '--error-unmatch', 'build-commit.txt']) !== 0);
}

console.log('\n5. The workflow still writes the file it promises');
const wf = fs.readFileSync(path.join(repoRoot, '.github/workflows/railway-deploy.yml'), 'utf8');
const WRITE_RE = /echo\s+"\$GITHUB_SHA"\s*>\s*build-commit\.txt/;
const writesFile = WRITE_RE.test(wf);
// The literal `railway up` also appears in prose in this file's header, so match
// the COMMAND: start of line, not inside a `#` comment. Matching the first
// mention instead compares against a comment and fails a correct workflow, which
// is what the first version of this assertion did.
const upIdx = wf.search(/^[^\S\n]*railway up\b/m);
const writeIdx = wf.search(WRITE_RE);
ok('5.1 railway-deploy.yml writes build-commit.txt', writesFile);
ok('5.2 and writes it BEFORE `railway up`, or the upload goes out unlabelled',
  writesFile && upIdx > -1 && writeIdx > -1 && writeIdx < upIdx);

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
