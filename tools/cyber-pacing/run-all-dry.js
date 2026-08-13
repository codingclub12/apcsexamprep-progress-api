'use strict';
// Every pacing-related dry run, in dependency order. Writes diffs/, writes
// nothing to Shopify. The Command Center diff is written last and is the
// combined result of the day-count fix and the pacing view.
const { execFileSync } = require('child_process');
const steps = ['run-dry-pacing-view.js', 'run-dry-hub-bundle.js'];
for (const s of steps) {
  console.log(`\n########## ${s} ##########`);
  execFileSync('node', [`${__dirname}/${s}`], { stdio: 'inherit', cwd: process.cwd() });
}
