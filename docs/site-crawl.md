# Site crawl contract

What the nightly crawl checks, what each finding costs, and why the checks that
are missing are missing.

- `lib/site-crawl.js` is the rules: the finding kinds, the severity model, the
  parser, the ranking. Everything in it is pinned offline by `smoke/site-crawl.js`.
- `scripts/site-crawl.js` is the network half: which URLs, how fast, when to stop.
- `docs/nightly-crawl-playbook.md` is what the agent does with the output.

The crawl reads. It sends no credential to the storefront, writes nothing to the
ledger, and touches only public and deliberately-unauthenticated paths on the
progress API.

## Coverage

The sitemap advertises about 2,005 URLs: 1,290 pages, 654 blog URLs, 51 products,
10 collections. The sitemap is the authority. Building URLs from handle patterns
would invent pages that do not exist and miss ones that do.

Each night crawls two things:

**The hot set**, every night, no exceptions:

- the storefront root
- one reporter-bearing page per course, imported from `scripts/grade-path-audit.js`
  so the two lists cannot drift apart
- every course hub and command center, because every lesson path runs through one
- **every URL that produced a P0 or P1 last night**

That last one is what makes the delta honest. A finding that only gets looked at
again in six days cannot be reported as resolved, and a P0 nobody rechecks is not
being monitored.

**One shard of everything else**, rotated daily. Seven shards, assigned by FNV-1a
over the URL so a page stays in the same shard across runs. Full coverage every
week, about 350 requests a night, roughly twelve minutes.

## Why it is not a full crawl every night

Three separate records in this repo say the same thing:

- Board task 79: `46 pages returned 429 during crawl - re-verify single-threaded`.
- `.github/workflows/smoke.yml`: rapid runs tripped bot protection and the
  storefront started serving empty pages.
- `scripts/grade-path-audit.js`: chose ten requests over a 250-page crawl, in as
  many words.

A measured probe of 20 live pages at one request per second returned 20 clean
200s averaging 0.24 seconds, so 1,000ms spacing is comfortable rather than merely
tolerated. The crawler still doubles its delay on any 429, 503 or challenge, eases
back after ten clean responses, and **stops after five throttled responses**
rather than pushing through. An aborted run is reported as aborted. It is never
retried the same night with a bigger budget: the cost of pushing through is the
storefront serving challenges to real students on shared school IPs.

## The severity model

Tier is a property of the finding kind, declared once in `lib/site-crawl.js`, so
two mornings cannot rank the same facts differently.

| Tier | Means |
|------|-------|
| **P0** | Students are blocked, or graded work is silently not recording. |
| **P1** | A student will hit this and it is wrong. |
| **P2** | Drift and discoverability. Nobody is blocked. It compounds. |
| **P3** | Hygiene. |

Within a tier, findings sort by **blast radius**: how many pages carry the same
finding. One dead link is a nit; the same dead link on ninety lesson pages is a
navigation element that broke, and those must not sort next to each other.
Identical findings across pages collapse into one row with a count and a few
examples, because ninety rows of the same problem is the report burying itself.

## The checks

### P0

| Kind | Fires when |
|------|-----------|
| `dead-page` | A sitemap URL returns 4xx, 5xx, or nothing. |
| `reporter-missing` | A page has graded widgets and its course's score reporter is not loaded. |
| `reporter-asset-dead` | A referenced reporter asset does not serve. |
| `api-down` | `/api/health` is unreachable, or a gated admin route serves app markup to an anonymous request. |
| `challenge-served` | Bot protection answered instead of the page, or the crawl aborted. |

`reporter-missing` is the check this job exists for. It is the shape of the
2026-08-21 teacher report: three defects, nothing threw, nothing logged, and the
only thing that surfaced it was an email.

**Graded means any of three widget systems**, measured against the live
storefront one page per course:

| Course | Signal | Score reporter |
|--------|--------|----------------|
| AP CSA | `data-item-id`, `apcs-ex` | `apcs-reporter.js` |
| AP CSP | `apcs-ex` only, no `data-item-id` | `ap-csp-reporter.js` |
| AP Cybersecurity | `check-btn` only, no `data-item-id` | `apcs-score-reporter.js` |
| AP Networking | `data-item-id` | `ap-networking-reporter.js` |
| Intro to Java | `data-item-id` | `intro-java-reporter.js` |
| Course hubs | none of the three | none, correctly |

The first version of this check counted `data-item-id` alone. That made it blind
to CSP and cyber entirely, so it read every cyber exercise page as ungraded and
could never have caught the failure it was written for. `apcs-tracker.js` is the
visit tracker, not a score reporter, and is deliberately excluded: it loads on
plenty of pages that grade nothing.

The `api-down` gate check is the inverse of an uptime check. An anonymous request
to `/admin/dashboard` must receive the **login** page. If it ever returns
dashboard markup, the fail-closed posture this repo is built on has regressed.

### P1

| Kind | Fires when |
|------|-----------|
| `broken-internal-link` | An on-site link on a crawled page returns 4xx or 5xx. |
| `truncated-body` | Under 20,000 bytes. Real pages here run 350KB to 750KB. |
| `mojibake` | Double-encoded text in the visible body. |
| `liquid-leak` | Unrendered `{{ }}` or `{% %}` in the visible body. |
| `placeholder-text` | Draft scaffolding shipped to production. |
| `reporter-orphaned` | A score reporter is loaded and there is no graded widget for it to read. |

`truncated-body` is the shape a half-landed Matrixify import leaves. The page
renders, so nothing else catches it.

### P2 and P3

`title-missing`, `meta-missing`, `duplicate-title`, `redirect-chain`,
`mixed-content`, `oversized`, `slow`. Reported as counts and patterns, not
verified one by one.

Duplicate titles are **slice-scoped and labelled as such**. Claiming site-wide
uniqueness from a seventh of the site would be a finding the evidence does not
support.

## False positives are the failure mode

`board-delta.js` states the rule this file inherits: a job that reprints the same
fourteen items every morning is wallpaper inside a week. A crawl fails the same
way faster, because one noisy check buries the real finding underneath it.

Three checks were changed after the first live run flagged correct pages, and all
three are pinned in `smoke/site-crawl.js` in the **silent** direction:

1. **The challenge detector must not fire on a real page.** A `/captcha/i` test
   matched all 20 pages in the first probe: Shopify's own bundled JS ships
   `recaptcha-v3-token` and `h-captcha-response` on every render. That check
   would have aborted the crawl every night. Size plus shape is the honest
   signal, because a real page here is 350KB+ and an interstitial is a few KB.

2. **"coming soon" is not a placeholder on this site.** `/pages/ap-csa-course`
   marks unshipped topics COMING SOON deliberately and explains the convention in
   the paragraph above the list. `TBD` came off for the same reason. `TODO` was
   never on the list: it appears in legitimate lesson copy about writing code.

3. **Course hubs owe no reporter.** Keying "should this page grade" on the handle
   looking like a lesson flagged every hub. It is keyed on graded widgets being
   present instead, which is positive evidence rather than an inference.

`mojibake` here also does cp1252, which `smoke/encoding-guard.js` deliberately
does not. That file scans repository source, where latin-1 covers every byte
value. This one reads live HTML, where the common form is cp1252: U+2019 becomes
three characters whose last two are above 0xFF, so a latin-1-only reversal
correctly rejects them and the detector is blind to the case that actually
appears on a web page.

## Not checked, on purpose

- **External links.** Real, but checking them means hammering third parties
  nightly, which is somebody else's rate limit to blow.
- **Rendered JavaScript.** The crawl reads served HTML. `smoke/` drives a real
  browser where that is needed; doing it for 350 pages a night is a different
  cost class.
- **Anything behind student or teacher auth.** The crawl carries no credential.
  `smoke/auth-enrollment.js` and `smoke/teacher-dashboard.js` own those paths.
- **The grade-path contract itself.** `scripts/grade-path-audit.js` already checks
  which `window.*` writers the deployed assets call but never define, in about ten
  requests, and `.github/workflows/nightly-sweep.yml` runs it nightly. The crawl
  imports its sample list rather than duplicating the check.

## Running it

```bash
node scripts/site-crawl.js                        # tonight's shard
node scripts/site-crawl.js --full --budget 0      # everything, no cap
node scripts/site-crawl.js --budget 50 --json     # a quick look
node scripts/site-crawl.js --previous docs/runs/crawl-state.json \
                           --out docs/runs/crawl-state.json.new

npm run smoke:sitecrawl                           # the rules, offline, no network
```

| Flag | Default | Notes |
|------|---------|-------|
| `--budget N` | 400 | Hard cap on storefront requests. 0 means no cap. |
| `--shards N` | 7 | Nights for full coverage. |
| `--shard N` | day of year % shards | Force a specific slice. |
| `--full` | off | Ignore sharding. |
| `--delay MS` | 1000 | Floor spacing. Backoff can only raise it. |
| `--link-budget N` | 250 | HEAD requests for link checking. |
| `--include` | all | `pages,articles,products,collections` |
| `--no-api` | off | Skip the progress API half. |

Exit code is for CI: non-zero on any P0 or an aborted run. It is not a verdict on
the night, and the agent reads the findings rather than the exit code.
