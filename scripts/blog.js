#!/usr/bin/env node
'use strict';
// CLI for the weekly course blog. Read-only by default: `publish` is the only
// subcommand that writes, and it refuses unless the whole batch validates.
//
//   node scripts/blog.js validate            # gate every post in content/blog
//   node scripts/blog.js list                # what is queued, and for when
//   node scripts/blog.js preview <handle>    # write the rendered HTML to /tmp
//   node scripts/blog.js due [YYYY-MM-DD]    # posts whose publishOn has arrived
//   node scripts/blog.js publish [--dry-run] [--on YYYY-MM-DD]

const fs = require('fs');
const path = require('path');
const { validateBatch, words } = require('../lib/blog-validate');

const DIR = path.join(__dirname, '..', 'content', 'blog');

function loadAll() {
  if (!fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).sort()
    .map((f) => {
      const mod = require(path.join(DIR, f));
      return { file: f, meta: mod.meta, body: mod.body };
    });
}

const today = () => new Date().toISOString().slice(0, 10);

function cmdValidate(posts) {
  const problems = validateBatch(posts);
  if (!problems.length) {
    console.log(`${posts.length} posts, all pass.`);
    for (const p of posts) console.log(`  ${p.meta.handle}  ${words(p.body)} words  ${p.meta.course}`);
    return 0;
  }
  console.error(`${problems.length} problems across ${posts.length} posts:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  return 1;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const posts = loadAll();

  if (!cmd || cmd === 'validate') return process.exit(cmdValidate(posts));

  if (cmd === 'list') {
    for (const p of posts) {
      console.log(`${p.meta.publishOn}  ${p.meta.course.padEnd(17)}  ${p.meta.handle}`);
    }
    return;
  }

  if (cmd === 'due') {
    const on = rest[0] || today();
    const due = posts.filter((p) => p.meta.publishOn <= on);
    console.log(due.length ? due.map((p) => p.meta.handle).join('\n') : '(nothing due)');
    return;
  }

  if (cmd === 'preview') {
    const post = posts.find((p) => p.meta.handle === rest[0]);
    if (!post) { console.error(`no post with handle "${rest[0]}"`); process.exit(1); }
    const out = path.join('/tmp', `${post.meta.handle}.html`);
    fs.writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>${post.meta.seoTitle}</title>${post.body}`);
    console.log(out);
    return;
  }

  if (cmd === 'publish') {
    const { publish } = require('../lib/blog-publish');
    const result = await publish({
      posts,
      dryRun: rest.includes('--dry-run'),
      on: (rest.includes('--on') ? rest[rest.indexOf('--on') + 1] : null) || today(),
    });
    console.log(JSON.stringify(result, null, 2));
    return process.exit(result.ok ? 0 : 1);
  }

  console.error(`unknown command "${cmd}"`);
  process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
