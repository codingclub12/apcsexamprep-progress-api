'use strict';
// -----------------------------------------------------------------------------
//  Reformat one-line bodies on live pages this repo does not own.
//
//  ── WHY THIS EXISTS SEPARATELY ──────────────────────────────────────────────
//  Most coding pages on the site are generated from seed/, so fixing the style
//  there and regenerating is the whole job. Four are not: three Big Idea 3
//  coding pages and one guided-notes page were authored outside this repo, so
//  there is no seed to correct and the only copy of their content is the live
//  page body.
//
//  ── WHAT IT TOUCHES, AND WHAT IT REFUSES TO ─────────────────────────────────
//  Only code a STUDENT READS: the `var STARTERS` blob the coding pages embed,
//  and the AP pseudocode inside <pre class="ps">. It does not touch the page's
//  own runner, because nobody learns to program from the code that posts to
//  Judge0, and rewriting working machinery to satisfy a teaching rule is how a
//  live page breaks for no gain.
//
//  It refuses:
//    - a body that is not the page it claims to be
//    - a body with no snapshot on disk, because a Matrixify import of a live
//      page is not undoable and Matrixify reports it as a success either way
//    - a run that changes no one-liners, which means the input was already
//      clean or the selectors stopped matching, and those look identical here
//    - a STARTERS blob that stops parsing as JSON after the edit
//    - any change to the body outside the regions named above
//
//  Run: node scripts/beginner-style-patch.js <body.html> <handle> <title> <out.csv>
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { findOneLiners } = require('../lib/beginner-style');

const PUBLISHED_AT = '2026-03-01 12:00:00';
const SNAP_DIR = path.join(__dirname, '..', 'shopify', 'page-snapshots');

// Brace-language reformat, K&R, matching the coding pages' own JavaScript.
function expandBrace(line) {
  const indent = (line.match(/^\s*/) || [''])[0];
  const t = line.slice(indent.length);
  let m = t.match(/^((?:\}\s*)?(?:else\s+if|if|for|while)\s*\(.*?\)|(?:\}\s*)?else)\s*\{(.*)\}\s*$/);
  if (m) return [indent + m[1].trim() + ' {', ...splitStatements(m[2]).map((s) => indent + '  ' + s), indent + '}'];
  m = t.match(/^(function\s+\w+\s*\(.*?\))\s*\{(.*)\}\s*$/);
  if (m) return [indent + m[1] + ' {', ...splitStatements(m[2]).map((s) => indent + '  ' + s), indent + '}'];
  m = t.match(/^((?:\}\s*)?(?:else\s+if|if)\s*\(.*?\))\s+([^{].*;)\s*$/);
  if (m) return [indent + m[1].trim() + ' {', indent + '  ' + m[2].trim(), indent + '}'];
  return null;
}

// AP pseudocode, braces on their own lines the way the reference sheet writes
// them. The entity-encoded arrow is left exactly as it is.
function expandPseudo(line) {
  const indent = (line.match(/^\s*/) || [''])[0];
  const t = line.slice(indent.length);
  let m = t.match(/^(IF\s*\(.*?\))\s*\{(.*?)\}\s*ELSE\s*\{(.*?)\}\s*$/);
  if (m) {
    return [indent + m[1], indent + '{', indent + '  ' + m[2].trim(), indent + '}',
      indent + 'ELSE', indent + '{', indent + '  ' + m[3].trim(), indent + '}'];
  }
  m = t.match(/^(IF\s*\(.*?\)|ELSE|REPEAT[^{]*|FOR EACH[^{]*)\s*\{(.*?)\}\s*$/);
  if (m) return [indent + m[1].trim(), indent + '{', indent + '  ' + m[2].trim(), indent + '}'];
  m = t.match(/^\{(.+?)\}\s*$/);
  if (m) return [indent + '{', indent + '  ' + m[1].trim(), indent + '}'];
  return null;
}

function splitStatements(body) {
  const out = [];
  let depth = 0, cur = '', str = null;
  for (const ch of body) {
    if (str) { cur += ch; if (ch === str) str = null; continue; }
    if (ch === '"' || ch === "'") { str = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    cur += ch;
    if ((ch === ';' || ch === '}') && depth === 0) { out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

function reformat(code, lang) {
  const expand = lang === 'pseudo' ? expandPseudo : expandBrace;
  let n = 0, refused = 0;
  let lines = code.split('\n');
  for (let pass = 0; pass < 6; pass++) {
    const out = [];
    let did = 0;
    refused = 0;
    for (const line of lines) {
      if (findOneLiners(line, lang).length) {
        const rep = expand(line);
        if (rep) { out.push(...rep); did++; continue; }
        refused++;
      }
      out.push(line);
    }
    lines = out;
    n += did;
    if (!did) break;
  }
  return { text: lines.join('\n'), n, refused };
}

function patch(body) {
  let out = body;
  let starters = 0, pseudo = 0, refused = 0;

  // 1. The embedded starter code, which is JSON inside the script block.
  out = out.replace(/(var STARTERS = )(\[[\s\S]*?\])(;\n)/, (m, head, json, tail) => {
    const arr = JSON.parse(json.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>'));
    const next = arr.map((o) => {
      const copy = {};
      for (const lang of Object.keys(o)) {
        const r = reformat(o[lang], lang);
        starters += r.n; refused += r.refused;
        copy[lang] = r.text;
      }
      return copy;
    });
    // Re-encode the way these pages already do it: angle brackets escaped so no
    // starter comment can close the script block early, and every non-ASCII
    // character as \uXXXX. The em-dash in the GradeKit banner arrived as \u2014
    // and has to leave as \u2014, or a page that was pure ASCII stops being so
    // for a change that was supposed to be about indentation.
    const encoded = JSON.stringify(next)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x20-\x7E]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    return head + encoded + tail;
  });

  // 2. The AP pseudocode reference blocks.
  out = out.replace(/<pre class="([^"]*\bps\b[^"]*)">([\s\S]*?)<\/pre>/g, (m, cls, inner) => {
    const r = reformat(inner, 'pseudo');
    pseudo += r.n; refused += r.refused;
    return '<pre class="' + cls + '">' + r.text + '</pre>';
  });

  return { body: out, starters, pseudo, refused };
}

function main(argv) {
  const [src, handle, title, out] = argv;
  if (!src || !handle || !title || !out) {
    console.error('usage: node scripts/beginner-style-patch.js <body.html> <handle> <title> <out.csv>');
    process.exit(2);
  }
  const body = fs.readFileSync(src, 'utf8');
  const problems = [];

  const snap = path.join(SNAP_DIR, handle + '.before-beginner-style.html');
  if (!fs.existsSync(snap)) {
    problems.push(`no snapshot at shopify/page-snapshots/${handle}.before-beginner-style.html;`
      + ' a Matrixify import of a live page is not undoable');
  } else if (fs.readFileSync(snap, 'utf8') !== body) {
    problems.push('the snapshot on disk is not this body, so a rollback would restore something else');
  }

  const r = patch(body);
  if (!r.starters && !r.pseudo) problems.push('nothing changed; either the body was already clean or the selectors stopped matching');
  if (r.refused) problems.push(`${r.refused} one-liner(s) not understood well enough to rewrite`);
  if (findOneLiners(r.body, 'javascript').length > countRunnerOneLiners(body)) {
    problems.push('the rewrite introduced one-liners somewhere it should not have');
  }
  const starters = r.body.match(/var STARTERS = (\[[\s\S]*?\]);\n/);
  if (starters) {
    try { JSON.parse(starters[1].replace(/\\u003c/g, '<').replace(/\\u003e/g, '>')); }
    catch (e) { problems.push('the starter blob no longer parses as JSON: ' + e.message); }
  }
  // Everything outside the two regions has to be untouched.
  if (strip(body) !== strip(r.body)) problems.push('the body changed outside the starter blob and the pseudocode blocks');

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((p) => console.error('    ' + p));
    console.error('');
    process.exit(1);
  }

  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const header = ['Handle', 'Command', 'Title', 'Body HTML', 'Published', 'Published At'];
  const lines = [header.map(cell).join(',')];
  lines.push([handle, 'MERGE', title, r.body, 'TRUE', PUBLISHED_AT].map(cell).join(','));
  fs.writeFileSync(out, '\ufeff' + lines.join('\r\n') + '\r\n');
  console.log(`    ${handle}  ${r.starters} starter, ${r.pseudo} pseudocode  ->  ${(Buffer.byteLength(r.body) / 1024).toFixed(0)} KB`);
  console.log(`\n  wrote ${out}\n`);
}

// The runner's own one-liners are left alone on purpose, so they are counted
// rather than treated as a regression.
function countRunnerOneLiners(body) {
  const script = (body.match(/<script>[\s\S]*?<\/script>/) || [''])[0];
  return findOneLiners(script.replace(/var STARTERS = \[[\s\S]*?\];\n/, ''), 'javascript').length;
}

// Blank the two regions this is allowed to touch, so everything else can be
// compared for byte equality.
function strip(b) {
  return b.replace(/var STARTERS = \[[\s\S]*?\];\n/, 'STARTERS')
    .replace(/<pre class="[^"]*\bps\b[^"]*">[\s\S]*?<\/pre>/g, 'PS');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { patch, reformat, expandBrace, expandPseudo };
