# 2026-08-19 - The gap is mostly a citing job

Agent: Claude Code. Branch: `claude/course-networking-strategy-8chhni`, off `main`.

## The finding

118 uncited Essential Knowledge statements reads as 118 things to write. It is not.

The 22 topic pages are structurally near-identical: 10 to 13 h2 headings, 222 to
237 list items, 385 to 405 KB, whether the topic sits at 33 percent coverage or
100 percent. Completeness is not a structural property of these pages, so it
cannot be fixed structurally and "write more" is the wrong instinct.

Banding each uncited statement by how much of its vocabulary already appears on
its own page:

| Band | Count |
|------|------:|
| Already on the page, just uncited | 24 |
| Mostly present, check and cite | 58 |
| Partly present, needs a paragraph | 33 |
| Genuinely absent | 3 |

About 69 percent is annotation rather than authoring.

The three genuinely absent statements are a coherent gap rather than scattered
noise: 2.2.D.6, 2.3.A.3 and 2.3.A.4 are all about endpoint device categories.
One afternoon of real writing, in one place.

## And the two complete topics do it two different ways

3.6 and 4.5 are both at 100 percent, and neither is a template for the other.

- 4.5 cites in prose, `(EK 4.5.A.1)` inline beside the sentence that teaches it,
  18 times.
- 3.6 cites in its widget data: each troubleshooting scenario carries `ek`,
  `fixek` and `docek`, so one interactive item covers symptom, fix and
  documentation at once. Zero prose citations.

1.4, at 33 percent, does neither at density: one `ek` per widget item and nothing
in prose. The lever is citation density and placement, not volume.

## What the measure is not

Term overlap is a proxy for conceptual coverage, not proof. A page can share
vocabulary without teaching the idea, and can teach an idea in words the
framework did not use. `scripts/networking-gap-triage.js` reports bands rather
than a score so it reads as a queue rather than a verdict, and the caveat is
printed in its own output rather than left in a doc nobody opens.

## A dead end worth recording

I tried to deepen the certification crosswalk to sub-objective level now that
egress is open. It did not work and was abandoned rather than fudged:

- `comptia.org` returns 200 to curl but serves its objectives from a JavaScript
  application; the raw HTML contains none of the domain names.
- `cisco.com` returns 403 to automated clients. `learningnetwork.cisco.com`
  answers but is a Salesforce app that renders to 71 characters of "Loading".
- Headless Chromium is installed, but rendering these pages fails with
  ERR_CERT_AUTHORITY_INVALID through the egress proxy, and working around that
  means disabling TLS verification, which is not worth a crosswalk.

So the crosswalk stays at domain level and the audit says why. Publishing
sub-objective identifiers from third-party summaries would be the same failure
the hazard rules already forbid.

## Also worth knowing about this environment

Open egress is not uniform. `curl` reaches apcentral.collegeboard.org and
comptia.org; Node's `fetch` and WebFetch are still proxied and get
"Host not in allowlist". Anything that must fetch from a session should use curl
until that is reconciled. This is also why the CED watcher, which uses Node
`fetch`, still returns 16 of 16 403s from here.

## Still open

- The annotation pass itself, which lands in Shopify page bodies via Matrixify.
- Whether the CED watcher works on an Actions runner. Zero runs; first scheduled
  2026-08-24 09:30 UTC.
- CCST and Network+ sub-objectives, blocked as above.
