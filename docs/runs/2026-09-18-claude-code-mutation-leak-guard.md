# A mutation reached a commit, so now the suite looks for one

2026-09-18, Claude Code, board 369. Branch `claude/loving-wright-8yixh5`.

## What happened

Commit 7d6ed5c was about a countdown attribute on a Shopify page. It also
carried this, in a file the change had nothing to do with:

    - headers['In-Reply-To']       = head.thread_message_id;
    + headers['X-Not-In-Reply-To'] = head.thread_message_id;

That is the sabotage `smoke/assistant-report-routing-mutation.js` writes into
`lib/assistant/report.js` to prove its own guard is not hollow. The session had
the full 267 suite run going in the background and ran `git add -A` two minutes
later. The harnesses write into `lib/` and put the file back on exit, so staging
the whole tree stages whatever is mid-flight.

Nothing shipped, because the commit was never pushed. Had it merged, every
follow-up report mail would have quoted a header no client honours and each one
would have started its own thread instead of joining the first. A second one,
`lib/assistant/morning.js` tier `needs_tanner` to `auto_fix`, landed in the tree
afterwards and was restored rather than committed.

A mutation is BUILT to be a defect the suite catches. Main is the one place it
must never reach.

## Why this is a check and not a line in CLAUDE.md

"Do not run `git add -A` while a suite is running" is a rule a tired session has
to remember at the moment it is least likely to. This repo has written that
lesson down before, about claiming files, and it took a hook to make it true.

`smoke:mutationleak` runs with the suite, the suite list is derived from
`package.json`, and `Offline smoke suites` is a required check on `main`. A
committed mutation now cannot reach production without somebody disabling a
ruleset.

## How a leak is recognised

Every harness declares `{ find, repl }` pairs and names the files it writes to,
as `path.join(ROOT, 'lib', 'x.js')` or `path.join(__dirname, '..', 'lib', ...)`.
Both are read out of the source. A target is carrying a live mutation when it
holds the `repl` and not the `find`.

Both halves matter, and scoping matters more than it looks:

- **`repl` alone is not enough.** Some repl strings are ordinary code.
  `    return next();` and `  res.set('Cache-Control', 'public, max-age=...` both
  appear in routes that have nothing to do with the harness declaring them.
- **Scoping each harness's pairs to its own targets is correctness, not speed.**
  A harness cannot write anywhere else. Scanning all 1720 tracked text files
  produced 19 false positives; scanning the 29 real targets produces none, in
  26ms.

Three shapes of target declaration already exist, which is why the module reads
them rather than knowing them: a `FILES` map in eight harnesses, one `FILE`
constant in `dashboard-assign`, and `css-vars`, which never writes to disk at all
and loads a patched copy from a temp file.

## The three kinds of declaration, and the two that need a different rule

Measured across ten harnesses, 153 pairs:

    checkable      141   substitution, both literals match file text
    interpolated     3   a BACKTICK literal holding ${...}
    deletion         9   repl is the empty string

Neither of the last two is quietly skipped.

A **deletion** mutation removes its find from the target, so the second finding
catches it: a find that appears in none of its own harness's targets. That also
catches a DEAD harness, one whose source moved on so it now mutates nothing while
still asserting the suite goes RED. Measured 0 on a clean tree, so it costs
nothing to keep.

The three **interpolated** ones cannot be matched literally at all. The count is
returned and the suite prints it, rather than the check silently covering less
than it appears to.

## The mistake worth reading, because it passed a damaged tree

The first draft classified any literal containing `${` as interpolated. That is
wrong in the direction that matters. In a single or double quoted literal,
`"${issueType}"` is plain text, and the file it must match is a template literal
whose SOURCE reads `${issueType}` too. Only a backtick literal evaluates its own.

The cost was measured rather than reasoned about. The SECOND mutation loose in
the tree that day, `morning.js` tier `needs_tanner` to `auto_fix`, is declared in
a double quoted literal carrying `${issueType}`. The first draft called it
interpolated, skipped it, and reported the damaged tree clean. Fixing the rule to
look at the quote moved 14 pairs from unchecked to checked, 127 to 141.

## The self-check, which is the part that matters

Literals are read with a scanner rather than a parser, because acorn is not in
this repo's dependency tree, only in the globally installed eslint, and CI runs
`npm ci` against the lockfile. A scanner that quietly matched nothing would
report every tree clean forever, which is the failure this repo keeps finding in
its own validators.

So the count is derived twice and the two must agree: a line count of the
declaration sites, which any editor could reproduce, against the literals the
scanner actually read. One apart and it throws and names the file. A harness
yielding no pair, or no target, throws for the same reason.

There is also a floor: if fewer than half the pairs come back checkable, the scan
refuses rather than passing. The real number is 141 of 153.

## Evidence

**The two real incidents, replayed.** Both in memory, because a suite that writes
a mutation to disk to test itself is an excellent way to cause the thing it
exists to prevent. Both are caught, and the first names the harness that declares
it.

**Mutation, 11 against the guard, none hollow.** Each required to go red for the
case that names it rather than red in aggregate. The list is in the run's
scratch harness and every rule is covered: the leak rule firing at all, its
"find is absent" half, the orphan rule, the interpolated skip, the quote-aware
classifier, the count comparison, the no-pair throw, the no-target throw, the
floor, the target regex refusing a sibling suite path, and the unreadable-literal
refusal.

Two of my own test cases were hollow first time and the harness caught both:

- Every fixture in the self-check section put `find` and `repl` on one line, so
  all of them failed the pair check before reaching the rule under test. They
  were red, which reads like success, for the wrong reason. A `saying()` helper
  now asserts on the message so a case cannot pass by throwing elsewhere.
- The count-mismatch fixture used an unterminated single quoted literal, which
  throws at the read rather than at the count. It takes a TEMPLATE literal to
  produce a genuine mismatch: it parses cleanly and runs over the two declaration
  lines below it, so the line count sees four sites and the scanner reads two.

**The clean tree.** 10 harnesses, 29 targets, 153 pairs, 0 leaks, 0 orphans, 0
missing targets, 26ms. `smoke:mutationleak` is 42 assertions.

## Still open

- **The harness declarations are read, not asked for.** If somebody writes an
  eleventh harness in a shape this cannot read, it throws and names the file,
  which is right. The better end state is that harnesses export their own
  declarations and nothing has to scrape source, and that is a change across ten
  files rather than one.
- **This catches a commit, not a staging command.** A pre-commit hook would stop
  it a step earlier, but `core.hooksPath` is unset in this repo, so a hook needs
  a person to wire it up on every machine. Riding the required check is the path
  that needs nobody.
- **`git add -A` is still the hazard.** The guard closes the consequence, not the
  habit. Stage explicit paths.

## What this cost and what it is worth

The line that got committed was seven characters different from the right one and
sat in a 2,235 line diff about a countdown timer. Nobody reading that PR would
have looked for it. The suite that owns that line was green the whole time,
because by then the harness had put the file back and was testing the restored
copy.

A guard's blind spot is never visible from inside the guard. This one is visible
from one directory over.
