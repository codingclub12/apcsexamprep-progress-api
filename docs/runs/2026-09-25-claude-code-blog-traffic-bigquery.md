# The course blogs, measured: 72 posts, 50 Google clicks in 25 days

Board 427. Tanner asked whether the four weekly course blogs get any traffic at
all, and whether they are a risk of Google treating the site as AI-generated.
Short answer: they get a little, almost none of it goes anywhere, and the risk
is in the volume rather than in who wrote them.

## Where the data lives, which was the missing piece

The 2026-09-24 weekly review said the BigQuery project id "is written down
nowhere in this repo" and called that the biggest gap in the SEO picture. It is:

    project    ap-cs-exam-prep-1773378352139
    datasets   analytics_516510863   GA4 daily export, events_YYYYMMDD
               searchconsole         Search Console bulk export
               Data_Set              empty

Found in a Google Cloud billing notice (App Optimize API, 2026-09-23), which
lists the project by id. A project id is an identifier, not a credential;
reading it needs an account with access.

Both exports START on 2026-08-30. On 2026-09-25 GA4 runs through
`events_20260923` with no intraday tables, and `searchdata_url_impression` runs
2026-08-30 to 2026-09-23. The blog engine launched 2026-08-17, so BigQuery holds
no pre-launch baseline at all. Search Console's own UI keeps 16 months and is
the only place a before/after can come from.

Average position in `searchdata_url_impression` is
`SUM(sum_position) / SUM(impressions) + 1`; the stored position is zero-based.

Ahrefs could not supplement this: the account is a trial with 0 API units.

## What "the blogs" means

`/blogs/` holds three different things and only one is the engine:

- the four course blogs, `ap-csa`, `ap-csp`, `ap-cybersecurity`,
  `ap-networking`: the 72 engine posts from `content/blog`, plus five older
  hand-written posts in `ap-cybersecurity`
- three daily practice blogs, `*-daily-practice`
- `news`, the older hand-written posts

Everything below about "engine posts" is joined by handle against
`node scripts/blog.js list`, so the five older cyber posts are excluded.

## The numbers, 2026-08-30 to 2026-09-23

    engine posts                  CSA    CSP  Cyber   Netw     all
    posts live by 2026-09-25       18     18     18     18      72
    live 2+ days in the window     16     16     16     16      64
    ever shown in Google           11     12     11     11      45
    Google impressions          1,394  1,572  1,400  1,573   5,939
    Google clicks                  23      9     17      1      50
    GA4 pageviews                  55     48     56     19     178
    GA4 organic landings           30     16     29      5      80

17 of the 72 have ever been clicked. Networking has 18 posts and one click.

Against the whole site over the same window, 112,525 GA4 pageviews and 7,772
Google web clicks, the engine is 0.16% of pageviews and 0.64% of clicks.

Two older `news` posts outdraw all 72:
`5-ap-csp-create-performance-task-project-ideas-with-rubric-alignment` (177
pageviews, 110 organic landings) and `ap-csp-pseudocode-complete-guide-2026`
(125, 87). That is 197 organic landings between two pages against 80 for the
whole engine. The second is the page board 425 is correcting right now.

The best engine post is `ap-cybersecurity-unit-1-vocabulary-ranked`: 13 clicks
from 172 impressions at position 5.4. Then `ap-csa-vs-ap-csp-college-recognition`
(9 clicks) and `ap-csa-2025-redesign-what-changed` (7).

Visitors who land on a course blog post leave. Sessions by landing page (the
course blog row includes the five older cyber posts):

    landed on           sessions  pages/sess  engaged  reached a     signup form  purchase
                                                       non-blog page  started      sessions
    course blogs             176        1.11    39.2%        5.1%            0          0
    news blog                334        1.25    52.1%        5.7%            7          0
    daily practice           604        1.74    53.3%        8.6%           57          0
    rest of site          31,377        3.53    67.5%           -        1,281         21

The first 24 posts (published Aug 17 to 28) are climbing in rank but not in
clicks. By week:

    week of      impressions/day  clicks/day  avg position
    Aug 24*                  363        2.0          19.0
    Aug 31                   337        2.6          12.6
    Sep 7                     39        0.4          12.4
    Sep 14                    92        1.4           6.4
    Sep 21*                  158        1.7           6.0
    * partial week: Aug 30 only, and Sep 21 to 23

The early impression peak was mostly `ap-networking-ip-address-explained`
sitting on page three for "what is an ip address" (730 impressions at 27.4,
no clicks), which fell away.

## Three findings worth carrying forward

**1. Fifteen of the sixteen posts dated Aug 31 to Sep 7 have never been shown
in Google once.** Posts on both sides of that week have been. The one exception
is `ap-csa-vs-ap-csp-college-recognition`. All 72 posts were checked live on
2026-09-25 through `lib/storefront-fetch.js`: every one answers 200, carries a
self-referencing canonical and no robots meta, and is listed in
`sitemap_blogs_1.xml` with a lastmod on its publish date. Nothing on the page
blocks indexing. So either Google has not indexed that batch, or it has and they
rank for nothing anyone searched. The bulk export carries no index status; URL
Inspection in Search Console tells the two apart in a minute and is the next
check.

**2. The engine competes with the site's own pages.** Same query, two of our
URLs:

    query                        engine post (impr @ pos)                    existing page (impr @ pos)
    ap networking                ap-networking-four-units-topics  260 @ 9.6  /pages/ap-networking           1,315 @ 7.7
    ap csp vs ap csa             ap-csa-vs-ap-csp-college-recog.   43 @ 7.3  /pages/ap-csa-vs-ap-csp           34 @ 8.3
    ap csa score distribution    ap-csa-score-distribution-2026    23 @ 5.0  /pages/ap-csa-score-calculator   127 @ 6.1
    ap cybersecurity exam date   ap-cybersecurity-launch-2026-27   24 @ 6.6  /pages/ap-cybersecurity-curriculum 34 @ 8.5
    ap networking exam           ap-networking-2026-27-pilot-year  13 @ 9.8  /pages/ap-networking-exam-format  56 @ 6.9

"ap csp vs ap csa" has a third contender, `ap-csp-or-ap-csa-first`. And the
engine re-covered two topics the `news` blog already wins: its pseudocode guide
has 5 organic landings against the old one's 87, and
`ap-csp-create-task-project-ideas` has never been shown at all against the old
Create task ideas post's 110 landings.

**3. The cadence is 12 posts a week, not 4.** The chat-side answer this question
arrived with said "4 posts/week across 4 blogs". The calendar publishes four
posts every Monday, Wednesday and Friday: 72 live now, 144 scheduled through
2026-11-06. That matters for the risk question, because volume is what Google's
scaled-content policy is about.

## The Google question

There is no "AI site" flag to trip. Google's published position is that it ranks
content on quality regardless of how it was produced, and that its spam policy
on scaled content abuse targets many pages made mainly to rank rather than to
help anyone, however they were made. It also says its core ranking uses
site-wide signals alongside page-level ones, so a large mass of pages nobody
finds useful can weigh on the rest of a site.

Measured against that:

- No visible harm yet. Google clicks to non-blog pages rose every full week in
  the window, 274 a day (week of Aug 31), 298, then 311 (week of Sep 14). The
  window starts two weeks after launch and back-to-school lifts everything, so
  this cannot rule harm out. It says nothing is visibly wrong, which is all it
  can say.
- No real benefit yet. 50 clicks in 25 days, visitors leave after one page, and
  not one signup or sale began on these posts.
- 19 of the 64 posts old enough to judge have never been shown once.

So the engine is not dangerous at 72 pages. At 12 a week it adds about 50 pages
a month that almost nobody finds, and that pattern held for months is what the
scaled-content policy describes. The risk is the cadence, not the authorship.

## Recommendation, which is Tanner's call and was not acted on

- Cut the cadence to one or two posts a week, and only on topics no existing
  page covers. This is a change to `content/blog` publish dates and the routine.
- Fold the duplicates into the pages that already win: the pseudocode guide, the
  Create task ideas post, and the three "which course" posts. That means
  redirects, which is a handle change and therefore NEVER_AUTO.
- Run URL Inspection on two or three of the Aug 31 to Sep 7 posts.
- Re-measure around 2026-11-17, three months after launch. Anything still at
  zero impressions then gets merged or noindexed.

## How it was checked

    traffic      BigQuery, the queries below, one pass each
    live pages   lib/storefront-fetch.js page() on all 72: status, robots, canonical
    sitemap      sitemap.xml to sitemap_blogs_1.xml, 638 URLs, all 72 present
    calendar     node scripts/blog.js list
    byline       content/blog source: "Tanner Crow, AP Computer Science Teacher"

No files changed outside this note. No post, date or handle was touched.

## Open

- Index status of the Aug 31 to Sep 7 batch. A human in Search Console.
- Cadence and consolidation. Tanner.
- A pre-launch baseline exists only in Search Console's UI.

## Queries

Engine totals. The `posts` CTE is one STRUCT per line of `node scripts/blog.js
list` with `publishOn <= 2026-09-25`: `STRUCT("<handle>" AS h, "<course>" AS
course, DATE "<publishOn>" AS pub)`.

```sql
WITH posts AS (SELECT * FROM UNNEST([ /* 72 STRUCTs */ ])),
gsc AS (
  SELECT REGEXP_EXTRACT(url, r'/blogs/(?:ap-csa|ap-csp|ap-cybersecurity|ap-networking)/([^/?#]+)') AS h,
    SUM(impressions) AS impr, SUM(clicks) AS clicks
  FROM `ap-cs-exam-prep-1773378352139.searchconsole.searchdata_url_impression`
  WHERE search_type = 'WEB'
    AND REGEXP_CONTAINS(url, r'/blogs/(ap-csa|ap-csp|ap-cybersecurity|ap-networking)/')
  GROUP BY h),
ga AS (
  SELECT RTRIM(REGEXP_EXTRACT(LOWER((SELECT value.string_value FROM UNNEST(event_params)
      WHERE key = 'page_location')), r'/blogs/(?:ap-csa|ap-csp|ap-cybersecurity|ap-networking)/([^/?#]+)'), '/') AS h,
    COUNT(*) AS pv,
    COUNTIF((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'entrances') = 1
      AND session_traffic_source_last_click.cross_channel_campaign.default_channel_group = 'Organic Search') AS org
  FROM `ap-cs-exam-prep-1773378352139.analytics_516510863.events_*`
  WHERE event_name = 'page_view'
  GROUP BY h)
SELECT IFNULL(course, 'ALL') AS course, COUNT(*) AS posts,
  COUNTIF(pub <= DATE '2026-09-21') AS live_2plus_days,
  COUNTIF(pub <= DATE '2026-09-21' AND IFNULL(g.impr, 0) > 0) AS ever_shown,
  SUM(IFNULL(g.impr, 0)) AS impressions, SUM(IFNULL(g.clicks, 0)) AS clicks,
  SUM(IFNULL(a.pv, 0)) AS pageviews, SUM(IFNULL(a.org, 0)) AS organic_landings
FROM posts p LEFT JOIN gsc g USING (h) LEFT JOIN ga a USING (h)
GROUP BY ROLLUP(course) ORDER BY course;
```

Landing behaviour: first `page_view` with `entrances = 1` per
`(user_pseudo_id, ga_session_id)` classifies the session; the session's own
events give page count, `session_engaged`, `form_start`, and `purchase`.
Competing URLs: per non-anonymized query, the engine URL against the
highest-impression other URL on the site for the same query.
