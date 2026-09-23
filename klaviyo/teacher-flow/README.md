# Teacher welcome flow: what to change in Klaviyo

Flow: **Added to Teacher List** (`WGDekt`), draft. Trigger: the Teachers list
(`Uc2DR2`), which is where the live Re-Ask flow puts anyone who clicks
"I'm a teacher". Nothing about the trigger needs changing.

The four emails are ready as saved templates. Klaviyo's API can read a flow's
own templates but cannot edit them, and cannot edit a flow at all, so the swap
is done in the flow editor. For each email: open it, choose to change the
template, pick the saved template below, then set the subject and preview.

| # | Wait before | Saved template | Subject | Preview text |
|---|---|---|---|---|
| 1 | none | Teacher Flow 2026-09 - Email 1 - Free dashboard (`Umu2p3`) | A free dashboard for your AP CS class | Create a class, share one code, and see every student lesson by lesson. |
| 2 | 2 days | Teacher Flow 2026-09 - Email 2 - Free for students (`Uq6gzU`) | What your students can use for free | Full courses for AP CSA, CSP and Cybersecurity, and where to find them. |
| 3 | 4 days | Teacher Flow 2026-09 - Email 3 - Teacher bundles (`UsGwLM`) | The materials I teach from | Slides, notes, keys, tests and pacing guides, with a free unit to try first. |
| 4 | 4 days | Teacher Flow 2026-09 - Email 4 - One question (`YaMNk2`) | One question about your class | What would make this more useful for you this year? |

The waits already in the flow are 2, 4 and 4 days, so they stay as they are.
Also set Reply-To on all four to tanner@apcsexamprep.com (it is blank today),
because emails 1 and 4 ask for a reply.

Then set each email to Live and the flow to Live.

**People already on the Teachers list.** A list-triggered flow only picks up
people added after it goes live. When Klaviyo offers to add past profiles, say
yes if you want the three teachers who clicked this month, including the one
who reported the 404, to get the series.

Source of record: `klaviyo/teacher-flow/email-N.html`, built by
`node scripts/build-teacher-flow-emails.js`, checked by `npm run smoke:teacherflow`.
If you edit an email in Klaviyo, the file here is stale; copy it back.
