# Auto-fix risk: how dangerous would it be to fix this automatically?

Scores a crawl finding for whether an unattended agent could safely fix it.

**It scores only.** Nothing in this pass edits a file, opens a pull request, or
touches Shopify. The nightly crawl stays read-only. This exists so the decision
about what to automate can be made from a record of what WOULD have qualified,
rather than from an estimate.

- `lib/autofix-risk.js` is the gate.
- `smoke/autofix-risk.js` pins every rule offline, in both directions.
- `scripts/autofix-scan.js` scores a real crawl state file.

```bash
node scripts/autofix-scan.js /tmp/crawl-state-new.json
npm run smoke:autofixrisk
```

## It copies the gate you already have

`lib/command-router.js` answers this question for board tasks, and its shape is
the one worth reusing:

> **Capability** is recomputed on every read. **Consent** is stored, and is a
> human ticking a box.

Those are deliberately different things. Narrowing capability retires every stale
consent on the next run, with no migration and nothing to hunt down. So
`lib/autofix-risk.js` computes capability and never reads or writes a stored
flag. `smoke/autofix-risk.js` asserts that: the module contains no consent read,
no write call, and no shell.

## The insight that matters most: two surfaces, not one

Almost every crawl finding has a fix that lands in one place and a **deploy** that
has to happen somewhere else before a student sees any difference. The 2026-08-25
Big Idea 3 finding is the shape:

| | |
|---|---|
| **fix surface** | `lib/csp-exercise-pages.js`, two lines, CI-gated, one `git revert` |
| **deploy surface** | about 44 live Shopify pages, regenerated and imported through a Matrixify sheet a human reads first |

Scoring that "low risk, two lines" is true and useless. Scoring it "high risk, 44
pages" is true and would block a safe change. Both numbers are real, so both are
reported, and the verdict line says so out loud:

```
LOW  Fix lands in this repo ... Students see no change until it is deployed via shopify.
```

A finding is auto-fixable when its **fix** surface is safe. Whether students see
the fix is a separate question with a separate answer.

## The gate, in order

First refusal wins. The order is load-bearing for the same reason it is in
`command-router`: "touches pricing" is more useful to hear than "unknown kind".

1. **The never list.** Money, pricing, discounts. Deletes, unpublishes, handle
   renames. Schema migrations and backfills. Student data. Anything flagged "a
   human must check". Blunt on purpose: a false positive costs one manual fix, a
   false negative renames a handle, and **handles are gradebook keys**, so
   renaming one detaches every score recorded against it.
2. **The allow list.** A kind not listed is never eligible and says so, rather
   than falling through to a default. That silent-fallthrough failure is exactly
   what `lib/command-hazards.js` documents: a gate reading
   `course === 'csa' || course === 'all'` compiled an empty hazard list for every
   other course and never mentioned it.
3. **Surface.** Only `repo` is automatable at all. See the table below.
4. **Derivable, not authored.** The sharpest discriminator. "Point this link at
   the handle that exists" is computed. "Write a meta description" is authoring,
   and an agent writing student-facing copy unattended is a different product
   decision from an agent repairing a broken reference.
5. **Provable.** There must be an assertion that FAILS before the fix and PASSES
   after. If it cannot be named, the fix cannot be verified, and an unverifiable
   unattended change is the thing this whole system exists to avoid.
6. **Blast radius**, which caps the **diff**, not the pages affected. A two-line
   template edit that corrects a link on 44 pages is still two lines.

## Surfaces

| Surface | Auto? | Why |
|---|---|---|
| `repo` | **yes**, low | 113 offline suites gate every pull request, and a bad change is one `git revert`. |
| `shopify` | no, high | A live page body. Every page change ships as a Matrixify sheet a human reads before importing, because that is the one path that has not silently truncated a live body. |
| `theme` | no, high | The connected branch deploys to the storefront on push. `command-router` already refuses this surface: merging is deploying until the theme-repo CI task ships. |
| `unknown` | no, high | An untraced fix is not a known-small one. |

The per-kind surface is a **default**. An agent that has actually traced the
cause passes `fix_surface` to override it, because a dead link authored straight
into a page body is content, not code.

## What is scored today

| Kind | Fix surface | Derivable | Eligible |
|---|---|---|---|
| `broken-internal-link` | repo | yes | **yes** |
| `reporter-regressed` | theme | no | no |
| `reporter-missing` | theme | no | no |
| `mojibake` | shopify | **yes** | no |
| `liquid-leak` | shopify | no | no |

Two of these are worth reading twice.

**`mojibake` is derivable but not eligible.** The repair genuinely is
deterministic: `reverseOnce` in `lib/site-crawl.js` yields exactly one character
or refuses. What is not automatable is the delivery, which is a Matrixify import.
Those are different problems, and collapsing them would lose the half that could
be automated later, so the scorer records `derivable: true` alongside the refusal.

**`reporter-regressed` is the highest-value finding and the least automatable.**
It is silent grade loss, which is the failure this whole system was built after.
It is also a theme-repo asset, and `command-router` already refuses that surface
in writing. The honest answer is that the theme-repo CI task is the thing standing
between this finding and automation, not any property of the finding itself.

## What this tells you over a few weeks

The scan prints a **blocking breakdown**, and that is the output that actually
earns its keep:

```
What is blocking the rest:
- 3x Kind "meta-missing" is not on the auto-fix allow list
```

Run it nightly and the blockers accumulate into an argument about where to invest.
If most refusals are `fix lands on theme`, the theme CI task is worth more than
any amount of scorer tuning. If most are `not on the allow list`, the next kind to
add names itself.

## Before anything is actually automated

Three things this scorer does not do, and would need before it could:

1. **Write the failing assertion first.** The gate requires a `provable`
   assertion by name; automation requires it to exist and to be seen red, then
   green. A fix without a red-first test is a fix nobody proved was needed.
2. **Bound the diff at apply time.** `files_touched` is passed in today; an
   applier would have to compute it and refuse its own patch when it grows.
3. **Land behind a pull request, never a direct merge.** CLAUDE.md permits Claude
   Code to merge on green, but merging is a deploy, and an unattended nightly
   deploy is a strictly larger decision than an unattended nightly patch.
