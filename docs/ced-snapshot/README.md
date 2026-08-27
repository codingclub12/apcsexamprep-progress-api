# CED snapshot

Machine-written by `scripts/ced-watch.js`. **Do not hand-edit anything in this
directory**: the next weekly run overwrites it, and a hand edit would either be
silently reverted or reported as a College Board change that never happened.

## What is in here

- `index.json` - one entry per watched source: content hash, byte length, and
  the URL it came from.
- `<source-id>.txt` - the normalized visible text of each HTML source, so the
  weekly pull request shows a readable line diff instead of a hash that moved.

PDF sources store a hash only. Parsing them would mean a dependency, and the
only question worth asking of a CED PDF is "did it move, go read it".

## Why the text is committed rather than cached

`nightly-sweep.yml` keeps its baseline in the Actions cache, which is right for
a job that runs every night. This one runs weekly, and Actions evicts a cache
after seven days unused, so a cached baseline would sit exactly on the eviction
boundary and report "no baseline" at random. Committing also means git history
becomes the record of what College Board said and when, which is the thing you
actually want two years from now when a teacher asks why a topic page says what
it says.

## Empty until the first run

The first scheduled run on an Actions runner creates the baseline and opens the
first pull request.

### The 403 is gone, as of 2026-08-27

This section used to say `apcentral.collegeboard.org` was not on the agent
proxy's allowed-domains list, so a session could not seed this directory
because all sources returned 403. **That is no longer true.** Measured
2026-08-27 from a Claude Code session, every one of the 15 sources in
`config/ced-sources.json` returned 200 through `node fetch`, and the Cyber CED
PDF downloaded whole at 5,947,037 bytes through both `fetch` and curl.

Either the domain was added to the environment's Custom allowed domains, as the
old text suggested doing, or the proxy policy changed. The original observation
is kept here because it was true when written on 2026-08-24 and the workflow's
own header comment still describes it: a session reading College Board and
getting 403 today means something changed back, not that the tooling is broken.

The workflow still does not need session egress, and this directory is still
machine-written. A session being able to fetch the sources is not permission to
hand-seed the snapshot; let the scheduled run create the baseline.
