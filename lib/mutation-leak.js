'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  A MUTATION THAT GOT COMMITTED, AND THE TWO SECONDS THAT TAKES.
//
//  ── THE INCIDENT, 2026-09-18 ───────────────────────────────────────────────
//  Commit 7d6ed5c was about a countdown on a Shopify page. It also carried:
//
//      - headers['In-Reply-To']       = head.thread_message_id;
//      + headers['X-Not-In-Reply-To'] = head.thread_message_id;
//
//  in lib/assistant/report.js, which is the exact sabotage
//  smoke/assistant-report-routing-mutation.js writes in to prove its own guard
//  is not hollow. The session had the full 267 suite run going in the
//  background and ran `git add -A` two minutes later. The harnesses write into
//  lib/ and put the file back when they exit, so staging the whole tree stages
//  whatever is mid-flight.
//
//  Nothing shipped, because the commit was never pushed. Had it merged, every
//  follow-up report mail would have quoted a header no client honours and each
//  one would have started its own thread. A mutation is BUILT to be a defect
//  the suite catches, so main is the one place it must never reach.
//
//  ── WHY A CHECK RATHER THAN A LINE IN CLAUDE.md ────────────────────────────
//  "Do not run git add -A while a suite is running" is a rule a tired session
//  has to remember at the moment it is least likely to. This repo wrote that
//  same lesson down about claiming files and it took a hook to make it true. So
//  this runs with the suite, the suite list is derived from package.json, and
//  `Offline smoke suites` is a required check on main. A committed mutation
//  cannot reach production without somebody disabling a ruleset.
//
//  ── WHAT IT LOOKS AT ───────────────────────────────────────────────────────
//  Every harness declares { find, repl } pairs and names the files it writes to,
//  as path.join(ROOT, 'lib', 'x.js') or path.join(__dirname, '..', 'lib', ...).
//  Both are read out of the source here. Scoping each harness's pairs to that
//  harness's OWN targets is not a convenience, it is correctness: a harness
//  cannot write anywhere else, so a wider scan only invents false positives. It
//  invented 19 before this was scoped, on lines as ordinary as
//  `    return next();`.
//
//  A target file is carrying a live mutation when it holds the repl and not the
//  find. Both halves are needed. Some repl strings are short and unremarkable,
//  and `  res.set('Cache-Control', 'public, max-age=...` appears in four routes
//  that have nothing to do with the harness that declares it.
//
//  ── THREE KINDS OF DECLARATION, AND ONLY ONE IS CHECKED THIS WAY ───────────
//  Measured across the ten harnesses, 153 pairs:
//
//      checkable       141   substitution, both literals match file text
//      interpolated      3   a BACKTICK literal holding ${...}, so the text in
//                            the file is whatever that evaluates to, not this
//      deletion          9   repl is the empty string. "Contains the repl" is
//                            true of every file ever written
//
//  The 3 and the 9 are NOT quietly skipped, because a check that drops part of
//  its input and says nothing is the kind this repo keeps finding hollow. A
//  deletion leak removes its find from the target, so the second finding below
//  catches it. The three interpolated ones cannot be caught by literal matching
//  at all, and the count is returned so a caller can print it.
//
//  ── THE SECOND FINDING, WHICH ALSO CATCHES A DEAD HARNESS ──────────────────
//  A find that appears in none of its harness's targets means one of two
//  things, and both want a person: a deletion mutation is live, or the source
//  moved on and the harness now mutates nothing while still asserting that the
//  suite goes RED. Measured 0 on a clean tree, so it costs nothing to keep.
//
//  ── THE SELF-CHECK, WHICH IS THE PART THAT MATTERS ─────────────────────────
//  String literals are read here with a scanner, not a parser, because acorn is
//  not in this repo's dependency tree, only in the globally installed eslint,
//  and CI runs `npm ci` against the lockfile. A scanner that quietly matched
//  nothing would report every tree clean forever.
//
//  So the count is derived TWICE and the two must agree: a line count of the
//  declaration sites, which any editor could reproduce, against the literals
//  the scanner actually read. One apart and this throws and names the file. A
//  harness yielding no pair, or no target, throws for the same reason: a
//  harness contributing nothing reads exactly like one this has stopped
//  understanding.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

//  A declaration site. The line count uses this, and so does the scanner, which
//  starts reading a literal immediately after each match.
const DECL = /^[ \t]*(find|repl|replace)[ \t]*:[ \t]*/gm;

//  A target file. Both bases the harnesses use, then only string segments, so a
//  computed path is not silently turned into a wrong one.
//
//  The __dirname form must start with '..'. Harnesses also build sibling paths
//  like path.join(__dirname, 'analysis-gate.js'), which are the SUITES they run
//  to see the mutation caught, not files they write to. Counting those produced
//  22 targets that do not exist and buried the real reading under them.
const TARGET = /path\.join\(\s*(?:(ROOT)|(__dirname)\s*,\s*'\.\.')\s*((?:,\s*'[^']*'\s*)+)\)/g;

//  ── READING ONE JAVASCRIPT STRING LITERAL ──────────────────────────────────
//  Single, double and template quotes all appear, template literals among them
//  running over several lines with escaped backticks inside.
function readLiteral(src, i) {
  const q = src[i];
  if (q !== '"' && q !== "'" && q !== '`') return null;
  let out = '';
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === '\\') {
      const n = src[j + 1];
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === 'r') out += '\r';
      else if (n === '0') out += '\0';
      else if (n === 'u' && src[j + 2] === '{') {
        const close = src.indexOf('}', j + 3);
        if (close === -1) return null;
        out += String.fromCodePoint(parseInt(src.slice(j + 3, close), 16));
        j = close;
        continue;
      } else if (n === 'u') {
        out += String.fromCharCode(parseInt(src.substr(j + 2, 4), 16));
        j += 5;
        continue;
      } else if (n === 'x') {
        out += String.fromCharCode(parseInt(src.substr(j + 2, 2), 16));
        j += 3;
        continue;
      } else if (n === '\n') {
        //  A line continuation inside a quoted string contributes nothing.
        j += 1;
        continue;
      } else out += n;
      j += 1;
      continue;
    }
    if (c === q) return { value: out, end: j, quote: q };
    //  An unescaped newline ends a single or double quoted literal in real
    //  JavaScript, so hitting one means this is not the literal it looked like.
    if ((q === '"' || q === "'") && c === '\n') return null;
    out += c;
  }
  return null;
}

//  ── ${...} IS ONLY INTERPOLATION INSIDE A TEMPLATE LITERAL ─────────────────
//  The first draft called any literal containing "${" interpolated, and that was
//  wrong in the direction that matters: it excluded 14 pairs that match their
//  file exactly. In a single or double quoted literal "${issueType}" is plain
//  text, and the file it has to match is a template literal whose SOURCE reads
//  ${issueType} too. Only a backtick literal here evaluates its own.
//
//  The cost of getting this wrong was measured, not guessed. The second
//  mutation loose in the tree on 2026-09-18, morning.js tier needs_tanner to
//  auto_fix, is declared in a double quoted literal carrying ${issueType}. The
//  first draft classified it interpolated, skipped it, and reported the damaged
//  tree clean.
const interpolated = (lit) => lit.quote === '`' && lit.value.includes('${');

function classify(find, repl) {
  if (interpolated(find) || interpolated(repl)) return 'interpolated';
  if (!repl.value.length) return 'deletion';
  return 'checkable';
}

//  ── ONE HARNESS ────────────────────────────────────────────────────────────
function readHarness(file) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');

  DECL.lastIndex = 0;
  const sites = src.match(DECL) || [];
  DECL.lastIndex = 0;

  const parsed = [];
  let m;
  while ((m = DECL.exec(src)) !== null) {
    const at = m.index + m[0].length;
    const lit = readLiteral(src, at);
    if (!lit) {
      throw new Error(`${rel}: could not read the literal after "${m[1]}:" at offset ${at}. `
        + 'This refuses to call a tree clean on a harness it cannot read.');
    }
    parsed.push({ key: m[1] === 'replace' ? 'repl' : m[1], value: lit.value, quote: lit.quote });
    DECL.lastIndex = lit.end + 1;
  }
  if (parsed.length !== sites.length) {
    throw new Error(`${rel}: ${sites.length} declaration site(s) but ${parsed.length} literal(s) `
      + 'read. The two derivations must agree or this check is not evidence of anything.');
  }

  //  find and repl are written adjacently inside one object. Anything else is a
  //  shape this does not know, and saying so beats guessing.
  const pairs = [];
  for (let k = 0; k < parsed.length - 1; k++) {
    if (parsed[k].key === 'find' && parsed[k + 1].key === 'repl') {
      const kind = classify(parsed[k], parsed[k + 1]);
      pairs.push({ find: parsed[k].value, repl: parsed[k + 1].value, kind, harness: rel });
    }
  }
  if (!pairs.length) {
    throw new Error(`${rel}: no find/repl pair found. A harness contributing nothing reads `
      + 'exactly like one this has stopped understanding.');
  }

  TARGET.lastIndex = 0;
  const targets = [];
  let t;
  while ((t = TARGET.exec(src)) !== null) {
    const segs = t[3].match(/'([^']*)'/g).map((s) => s.slice(1, -1));
    const p = path.posix.join(...segs);
    if (!targets.includes(p)) targets.push(p);
  }
  if (!targets.length) {
    throw new Error(`${rel}: no target file found. Every harness names the files it writes to `
      + 'as path.join(ROOT, ...) or path.join(__dirname, ...); a harness naming none is one '
      + 'this cannot scope, and an unscoped scan reports ordinary code as a leak.');
  }

  return { harness: rel, pairs, targets };
}

function harnessFiles() {
  const dir = path.join(ROOT, 'smoke');
  return fs.readdirSync(dir).filter((f) => /-mutation\.js$/.test(f)).sort()
    .map((f) => path.join(dir, f));
}

function readAll() {
  const files = harnessFiles();
  if (!files.length) {
    throw new Error('no smoke/*-mutation.js found. Either they were renamed or this is looking '
      + 'in the wrong place, and either way a clean report would be a lie.');
  }
  return files.map(readHarness);
}

//  ── THE SCAN ───────────────────────────────────────────────────────────────
function scan(opts) {
  const injected = !!(opts && opts.harnesses);
  const harnesses = injected ? opts.harnesses : readAll();
  //  The floor below is about the REAL corpus degrading. A caller passing its
  //  own one-pair fixture is not evidence of that, so it is off for injected
  //  harnesses unless the caller asks for it, which is how the suite tests it.
  const floor = opts && opts.floor !== undefined ? opts.floor : !injected;
  const read = (opts && opts.read)
    || ((p) => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch (e) { return null; } });

  const leaks = [];
  const orphans = [];
  const counts = { checkable: 0, interpolated: 0, deletion: 0, pairs: 0, targets: 0, missing: [] };

  for (const h of harnesses) {
    const bodies = new Map();
    for (const t of h.targets) {
      const body = read(t);
      if (body === null) counts.missing.push(`${h.harness} -> ${t}`);
      else bodies.set(t, body);
    }
    counts.targets += bodies.size;

    for (const m of h.pairs) {
      counts.pairs++;
      counts[m.kind]++;
      if (m.kind === 'interpolated') continue;

      if (m.kind === 'checkable') {
        for (const [t, body] of bodies) {
          if (body.includes(m.repl) && !body.includes(m.find)) {
            leaks.push({ file: t, harness: h.harness, find: m.find, repl: m.repl });
          }
        }
      }
      //  Both kinds get the orphan test. For a deletion it is the only signal
      //  there is; for a substitution it is a free read on whether the harness
      //  still mutates anything at all.
      let seen = false;
      for (const body of bodies.values()) if (body.includes(m.find)) { seen = true; break; }
      if (!seen) orphans.push({ harness: h.harness, kind: m.kind, find: m.find, targets: h.targets });
    }
  }

  //  A scan that degraded to almost nothing must say so rather than pass. Half
  //  is a floor, not a target: the real number is 141 of 153 today.
  if (floor && counts.pairs && counts.checkable * 2 < counts.pairs) {
    throw new Error(`only ${counts.checkable} of ${counts.pairs} pair(s) are checkable by literal `
      + 'match. That is low enough to mean the scanner has stopped reading these files properly, '
      + 'and a clean report would not be evidence.');
  }

  return { leaks, orphans, counts, harnesses: harnesses.length };
}

module.exports = {
  ROOT, DECL, TARGET, readLiteral, classify, readHarness, harnessFiles, readAll, scan,
};
