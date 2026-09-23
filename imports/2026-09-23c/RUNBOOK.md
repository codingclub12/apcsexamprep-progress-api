# 2026-09-23c: typed scores on the AP Cyber teacher dashboard

One sheet, one page: `cyber-dashboard`. Command UPDATE, the same as every
earlier sheet for this page, and built by `scripts/page-body-csv.js`, which
checked it against the live body for lost content.

**Order matters.** Import this only AFTER the API change has deployed.
`/api/health` must report the merge commit of the pull request that added
`PUT /api/teacher/classes/:code/cells`. If the page ships first, the Save button
answers 404.

| Step | Do | Expected |
|---|---|---|
| 0 | `curl -s https://progress.apcsexamprep.com/api/health` | `commit` is the merge commit of that pull request, or a later one |
| 1 | Import `cyber-dashboard-typed-score-pages.csv` | 1 page updated |
| 2 | Open the dashboard, click a priced exercise cell | a score box, "/ N", and Save score. An unpriced column still says a score cannot be typed |
| 3 | Type a score and Save, then reload | the cell shows the typed number, with a "typed" flag in the popover |

What teachers get: they can type a score into any priced cell. It replaces the
student's own attempts on that assignment until the teacher clears it or uses
Reset.
