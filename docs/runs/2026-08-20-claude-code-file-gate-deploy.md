# The file gate is live, verified against production

Date: 2026-08-20
Agent: Claude Code
Merged: PR #231, merge commit `1f6d356`

## What was merged

Eighteen commits, 57 files, +11,618 / -133. The Create Task bridge, the
one-liner reformatting across seeds and live pages, the Keep going block for the
eighteen Big Idea 3 lesson pages, and the teacher file gate.

Merging is a deploy here, so the boot was checked rather than assumed. Railway
served the pre-merge commit `3b832aa` for about a minute and then came up on
`1f6d356`, status ok. No stall.

## The gate, tested anonymously against the live service

`/api/files` is up. Every case below was run against
`progress.apcsexamprep.com` with no credentials at all, which is the posture an
attacker has.

| Request | Result |
|---|---|
| Paid Big Idea 2 exam key | `403`, no Location header |
| Same, `?as=json` | `403` |
| An id that does not exist | `403`, byte-identical body |
| A malformed id | `403` |
| A free Big Idea 1 file | `302` to the real file |
| `GET /api/files?course=ap-csp` | 53 files, all free tier, **no URL anywhere in the response** |

The identical body on a real-but-forbidden id and a nonexistent one is the
property that stops the endpoint being used to enumerate the bundle, and it
holds in production, not just in the suite.

## What is still open, stated precisely

The API half is live. The page half is not, and until it is, nothing has
actually changed for an attacker:

- `ap-csp-teacher-resources` **still publishes** `AP-CSP_BigIdea2_Exam_KEY`.
  Checked just now: the string is still in the public HTML.
- A direct fetch of that CDN URL **still returns 200**. It always will.
  Shopify CDN files are public by construction.

So the sequence still has two steps left and they are in order:

1. **Import PACK-3.** This is now unblocked; it was waiting on exactly this
   deploy. It removes 222 answer-key URLs from two public pages.
2. **Rotate the file suffix.** Re-upload the bundle files under a new obscurity
   token. This is the only thing that kills a URL somebody already copied, and
   it must come after step 1 and after a real teacher download is confirmed
   working, or every link on a live teacher's page breaks.

Until step 2, anyone who scraped either page before today keeps what they took.
That is not something this repo can fix.

## What was learned

Verifying a security fix against the live service is a different act from
verifying it in a suite, and both were worth doing. The suite proved the logic;
production proved the route is mounted, the manifest shipped, the entitlement
lookup reaches a real database, and the refusal really is indistinguishable over
the wire. None of those are things a smoke test on a synthetic server can show.
