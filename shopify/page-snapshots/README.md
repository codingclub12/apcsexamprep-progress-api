# Shopify page snapshots

Point-in-time copies of the Body HTML of live Shopify pages, captured immediately
before and after an agent-applied edit. Shopify keeps no usable version history for
page bodies, so these files are the rollback path.

These are reference copies, not a source of truth. The live page always wins. Never
edit a snapshot expecting it to reach the storefront.

## Files

- `ap-cyber-unit-1-exam.before-rebalance.html` - Body HTML of
  `gid://shopify/Page/132079550679` (`/pages/ap-cyber-unit-1-exam`) as of
  `updatedAt` 2026-06-05T19:18:34Z, captured before the answer-letter rebalance.
- `ap-cyber-unit-1-exam.after-rebalance.html` - the same body after the rebalance,
  byte-identical to what was published.

## Rolling back the Unit 1 exam rebalance

Publish `ap-cyber-unit-1-exam.before-rebalance.html` back over the page body with
`pageUpdate` on page id `gid://shopify/Page/132079550679`. Confirm first that the
live body still matches the `after` snapshot, so a rollback cannot silently discard
somebody else's later edit.

## Known defect, still live: Q8 is mis-keyed

`scripts/one-off/verify-cyber-unit-1-exam-key.js` reports one failure against both
snapshots, so it predates the rebalance and the rebalance did not touch it.

Q8 asks which measures reduce phishing risk. Statement I is domain-check training,
II is email filtering, III is longer passwords. The stored key is `A` (`I only`),
but the explanation argues I and II are both effective, and the distractor note on
`(A)` reads "Incomplete - email filtering (II) is also an effective anti-phishing
control." Every piece of feedback on the page says the answer is `B` (`I and II
only`); only the key disagrees.

A student who reasons correctly and picks B is marked wrong and then shown feedback
telling them the option they did not pick was incomplete. The fix is a content
decision, not a mechanical one, because flipping e8 to `B` moves the distribution
off 5/5/5/5 to A:4 B:6 and a further reorder would be needed to restore it. Left
as-is pending that call.

## Regenerating the patch

`scripts/one-off/rebalance-cyber-unit-1-exam-answers.js` takes the before file and
writes the after file. It reorders existing option markup rather than substituting
new copy, and it aborts unless every invariant holds: option text is a pure
permutation, the new key letter still carries the old correct answer text, the
distribution is 5/5/5/5, no distractor lands on a correct answer, and no
same-letter run exceeds two.

```
node scripts/one-off/rebalance-cyber-unit-1-exam-answers.js \
  shopify/page-snapshots/ap-cyber-unit-1-exam.before-rebalance.html /tmp/out.html
```
