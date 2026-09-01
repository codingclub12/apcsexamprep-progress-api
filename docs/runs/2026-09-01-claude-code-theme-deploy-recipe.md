# Task 141 confirmed: the documented theme deploy would rewind the storefront

Third item in the `now` sweep. Task 137 was stale, task 130 was real, and this
one is real with a correction worth making precisely.

## What is true

Read from the GitHub API rather than a clone, because the question is branch
topology and nothing else:

```
theme main HEAD        4735f4a
connected branch HEAD  6664a8f   (claude/site-linking-audit-yhufjk)

4735f4a found on the connected branch at position 46
=> main is an ANCESTOR of the connected branch
=> connected branch is 46 commits AHEAD of main
```

The ticket says 40. It was 40 when written and is 46 now, which is itself the
point: the gap is growing, so whatever is publishing the theme is not `main`.

## The correction that matters

The ticket says the documented push "would rewind the live theme". Not quite,
and the difference changes what to worry about.

`git push origin origin/main:refs/heads/claude/site-linking-audit-yhufjk` moves
the published branch BACKWARD by 46 commits. Git refuses that as a
non-fast-forward. **The command fails safely.** That is the only reason this
entry has not already cost a storefront, because it has been sitting in
CLAUDE.md as an instruction the whole time.

The real hazard is one step further on. A rejected push invites `--force`, and
that is the natural thing to reach for when a documented command does not work.
Forcing it rewinds the live theme by 46 commits in one command.

So the defect is not a destructive instruction. It is a broken instruction whose
obvious workaround is destructive, which is worse, because the person running it
has already been told this is the right command.

## What changed

`CLAUDE.md` no longer gives the command. It names it as the thing not to run,
records the measured shas and the direction of the gap, and warns explicitly
against forcing it.

**No replacement recipe was written.** The correct path is not known: if the
connected branch is 46 ahead, theme work is reaching the storefront by some
route this file does not describe, and inventing a command that writes to a
published theme is exactly how this entry became wrong. That needs establishing
before anything is written down.

Repointing the theme at `main` in Shopify Admin remains the real fix and is a
human action, as the file already said.

## RESOLVED same day: where theme changes actually land

The section above said no replacement recipe was known. It is now, and this note
is updated rather than left to go stale.

The answer was not obtained by reading anybody's description of the process. PR
#91's body asserts it, but an agent report is not evidence in this repo, so the
claim was checked against the base branch of the 40 most recently merged theme
pull requests:

```
33 of 40 targeted claude/site-linking-audit-yhufjk
 7 of 40 targeted main, and all seven are older
last PR to target main:  #71, 2026-08-24T17:10:21Z
since then: 21 consecutive PRs, every one to the connected branch
most recent: #92, 2026-09-01T14:59:48Z
```

So the recipe is the ordinary one: open the pull request against
`claude/site-linking-audit-yhufjk` and merge it there. No push incantation is
needed, which is the part that matters, because the incantation is what was
wrong.

That also explains the topology rather than just describing it. The connected
branch runs ahead of `main` because everything merges into the connected branch
and nothing merges into `main`. The gap is not drift; it is the deploy path.

`CLAUDE.md` now carries this, along with the three consequences: merging deploys
immediately with no CI in the way, a branch opened against the wrong base shows
the branch gap rather than the change (PR #91 hit this and was retargeted), and
`main` is not dead but is not the deploy path either.

What it does not establish, and the doc says so: Shopify Admin is the only
authority on which branch is connected. The name is inferred from consistent
practice and could be changed there with no signal in this repo.

## Still open

- Task 141 stays open. It is a theme-surface task and the real fix, repointing
  the theme at `main` in Shopify Admin, is a human action. What changed here is
  that following the docs is no longer a hazard and the working path is written
  down.
