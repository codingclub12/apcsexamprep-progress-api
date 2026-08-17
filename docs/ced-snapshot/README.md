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

`apcentral.collegeboard.org` is not on the agent proxy's allowed-domains list,
so a Claude Code session cannot seed this directory: all sixteen sources return
403. The first scheduled run on an Actions runner creates the baseline and
opens the first pull request.

If you want a session to be able to read College Board directly, add
`apcentral.collegeboard.org` to the environment's Custom allowed domains. The
workflow does not need it.
