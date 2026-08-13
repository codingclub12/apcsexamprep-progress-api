'use strict';
// Single entry point for the dry run. Reads originals from backup/,
// writes diffs/<handle>.diff, writes nothing to Shopify.
require('child_process').execFileSync('node', [__dirname + '/run-dry.js'], { stdio: 'inherit', cwd: process.cwd() });
require('child_process').execFileSync('node', [__dirname + '/run-dry-exam.js'], { stdio: 'inherit', cwd: process.cwd() });
