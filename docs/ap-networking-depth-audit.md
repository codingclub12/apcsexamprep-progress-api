# AP Networking depth audit

Measured 2026-08-17 against the 22 live topic pages on apcsexamprep.com.

## What this is and what it is not

This measures the published AP Networking pages against the structure and the
Essential Knowledge codes they themselves cite. It answers "where is the depth
thin", not "does the content match the framework line by line".

**It has one hard limit, stated up front.** `apcentral.collegeboard.org` is not
on the agent proxy's allowed-domains list, so the course framework PDF could not
be read: all sixteen first-party sources returned HTTP 403 from this session.
Every number below is therefore derived from the pages themselves. Where a gap
is *inferred* from a break in a cited sequence it says so, and the true uncited
count is higher than the inferred one, never lower. Add the domain and this
audit can be redone against real denominators.

## The structure is already right

Four units, 22 topics, 4 / 6 / 6 / 6. That matches the published framework, whose
units are Managing My Connections, Managing My Shared Connections, Managing Many
Connections, and Managing Our Global Connections. Topic titles track College
Board's own ("Fixing What's Slowing Me Down: Troubleshooting Issues on My
Device" is topic 1.1).

So the question "should we publish more pages in case they match" is already
answered by the pages that exist. There is no coverage gap at the topic level.
Every finding below is about depth inside topics that are already there.

## Measurements

Unique content words exclude the 444 lines of navigation and footer boilerplate
shared across 20 or more of the 22 pages. EK counts are distinct Essential
Knowledge codes cited on the page for its own topic; a cross-reference to
another topic's code is not counted as coverage.

| Topic | Content words | EK codes cited | EK groups reached |
|-------|--------------:|---------------:|-------------------|
| 1.1 | 2091 | 9 | B, C |
| 1.2 | 1757 | 3 | B |
| 1.3 | 1448 | 4 | B |
| 1.4 | 1479 | 5 | A, B, C |
| 2.1 | 2001 | 3 | A, B |
| 2.2 | 2005 | 10 | A, B, C, D |
| 2.3 | 2004 | 8 | A, B, C |
| 2.4 | 2045 | 5 | A, B |
| 2.5 | 2020 | 8 | A, B |
| 2.6 | 2014 | 4 | A, B |
| 3.1 | 1999 | 9 | A, B |
| 3.2 | 2041 | 9 | A, B, C |
| 3.3 | 2023 | 9 | A, B, C, D |
| 3.4 | 2018 | 11 | A, B, C |
| 3.5 | 2036 | 6 | A, B, C |
| 3.6 | 2031 | 17 | A, B, C |
| 4.1 | 2022 | 4 | A, B |
| 4.2 | 2019 | 7 | A, B, C |
| 4.3 | 2017 | 7 | A, B |
| 4.4 | 2004 | 6 | A, B, C |
| 4.5 | 2008 | 16 | A, B, C, D |
| 4.6 | 2015 | 6 | A, B |

166 distinct EK codes cited across the course. By unit: 21, 38, 61, 46.

## Finding 1: depth is allocated by template, not by topic

Eighteen of the 22 pages land between 1,999 and 2,045 content words. That is a
spread of 46 words across eighteen topics that range from "what is a MAC
address" to "IPv6, reliability and growth". Uniform length across topics of
very unequal difficulty is a template signature, and it means the hard topics
are getting the same room as the easy ones.

The EK counts say the same thing from the other direction, and they disagree
with the word counts: 3.6 cites 17 codes and 4.5 cites 16, while 1.2 and 2.1
cite 3, all in about 2,000 words. The pages carrying the most framework content
are not longer, so that content is being covered faster and thinner.

## Finding 2: Unit 1 is the weakest unit, and it is the shop window

Two independent measures agree, which is why this is the top priority.

- Unit 1 cites 21 EK codes. Units 2, 3 and 4 cite 38, 61 and 46.
- The three thinnest pages in the course are 1.3 (1,448 words), 1.4 (1,479) and
  1.2 (1,757). Every other page in the course is above 1,999.

Unit 1 is the unit a teacher opens first when evaluating a course, and the unit
a pilot class actually reaches. It is currently the least developed.

## Finding 3: topics 1.1, 1.2 and 1.3 cite no A-group Essential Knowledge

Every other topic in the course reaches its A group. These three do not: 1.1
reaches B and C, 1.2 and 1.3 reach only B.

This matters more than a missing letter normally would, because the framework's
stated learning objective for those topics is the A objective. Published
framework text gives LO 1.1.A as explaining how to troubleshoot common device
and network issues, and LO 1.2.A as configuring a device for secure wireless
connectivity. The first three topics of the course are the three that skip the
objective College Board leads with.

## Finding 4: half of all cited EK groups skip their first item

Of 56 EK groups cited anywhere in the course, 28 begin at `.2` or later. That is
not a random distribution; something systematic drops the first item of a group.

Fifty-three uncited EK codes can be inferred from breaks in cited sequences
alone. This is a floor, not a total: it cannot see codes above the highest one
cited in a group, and it cannot see a group never cited at all.

Concentrations worth looking at first:

- **3.3** (Configuring and Verifying Access): C.1, C.2, C.3, C.5, C.6 and
  D.1 through D.4 are uncited. At least ten gaps in one topic, the worst in the
  course.
- **2.6**: A.1, B.2, B.3, B.4.
- **2.2**: A.1, B.1, B.2, B.3.
- **4.1**: A.1, A.2, B.1.

Full inferred list:

```
1.1.B.1 1.2.B.1 1.3.B.1 1.4.B.1 1.4.B.3 1.4.B.4 1.4.C.1 2.1.A.1 2.1.A.3
2.2.A.1 2.2.B.1 2.2.B.2 2.2.B.3 2.3.B.1 2.4.A.1 2.5.B.1 2.6.A.1 2.6.B.2
2.6.B.3 2.6.B.4 3.1.A.1 3.1.B.1 3.2.A.1 3.3.A.1 3.3.A.3 3.3.B.1 3.3.B.2
3.3.C.1 3.3.C.2 3.3.C.3 3.3.C.5 3.3.C.6 3.3.D.1 3.3.D.2 3.3.D.3 3.3.D.4
3.4.B.1 3.4.C.1 3.4.C.2 3.4.C.3 3.5.B.1 4.1.A.1 4.1.A.2 4.1.B.1 4.2.A.1
4.2.B.1 4.2.B.2 4.3.A.1 4.3.A.3 4.3.B.2 4.3.B.4 4.4.B.2 4.4.C.1
```

## Finding 5: the certification crosswalk does not exist

Zero of the 22 pages mention CompTIA Network+, Cisco CCNA, or Cisco CCST
Networking. Not once.

This is the largest missed opportunity in the audit, and it is the only one with
no revision risk attached. College Board's own framing for the course is that it
was developed with industry partners including Cisco and aligns with those three
credentials. Those objective lists are public, stable, and will not be rewritten
by a pilot revision, which is exactly what makes them safe to build against now
while the CED itself can still move.

It is also the argument a teacher takes to an administrator. "Aligned to AP" is
one sentence. "Aligned to AP and maps to Network+ and CCST" is a budget line.

## Priorities

1. **Unit 1 backfill.** Thinnest content, fewest EK citations, missing the
   A-group objectives on 1.1 through 1.3, and the first thing anyone evaluating
   the course reads.
2. **The 53 inferred EK gaps**, starting with 3.3, which has at least ten.
3. **A certification crosswalk**, per topic. Zero coverage today, zero risk of
   being invalidated, and it is the adoption argument rather than the study
   argument.

Deliberately not on this list: publishing more topic pages. The topic structure
already matches the framework, so a new page would have to be speculative, and
that is the one move the framework's existence makes unnecessary.

## Redo this properly once the domain is allowlisted

Every gap above is inferred from the pages. With
`apcentral.collegeboard.org` reachable, the framework PDF gives real
denominators: exact EK counts per topic, so coverage becomes a percentage rather
than a floor, and a topic that cites nothing from a group that exists becomes
visible instead of invisible.

`.github/workflows/ced-watch.yml` already watches that PDF for revisions. It
does not need the allowlist, because Actions runners do not use the agent proxy.
