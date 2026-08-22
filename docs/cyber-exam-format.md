# The AP Cybersecurity exam, from the CED

Read 2026-08-21 from `ap-cybersecurity-course-and-exam-description.pdf`, the file
`config/ced-sources.json` already watches as `cyber-ced-pdf`. Page 147, "How
Student Learning Is Assessed on the AP Exam".

Recorded here because the site had been publishing a different exam shape, and
because the next person to author cyber practice content will otherwise infer
the format from our own pages, which is how the error propagated the first time.

## Section I: Multiple-Choice

**60 questions.** All five units are assessed. Organised around course skills:

| Skill category | Approximate weighting |
|---|---|
| 1. Analyze Risk | 25 to 40% |
| 2. Mitigate Risk | 25 to 40% |
| 3. Detect Attacks | 25 to 40% |

## Section II: Free-Response

**One question**, titled **Device Security Analysis**. Suggested time **50
minutes**. **Skill Categories 2 and 3** only.

It provides several simulated sources about a single digital device. In the
CED's own sample there are six:

1. Device firewall settings, as a numbered rule table (action, source,
   destination, direction, port, protocol)
2. An application log (`sudo tail -n 30 /var/log/app/network_app.log`)
3. An authorization log (`sudo tail -n 30 /var/log/auth.log`), carrying a
   password attack in rows 3 to 12
4. Further device sources
5. A file listing with permissions (`ls -l` style, owner, group, mode)
6. An acceptable use policy, split into required, permitted and prohibited

The question then asks parts A to E, with subparts labelled i, ii, iii:

- **A** the policy: how one part protects the device, how one rule could be
  modified to improve it
- **B** the authorization log: describe the evidence of a password attack,
  identify the adversary's IP
- **C** permissions: explain what one file's mode grants owner, group and
  others; describe a change that restricts access; **write the `chmod`
  command** that sets it
- **D** the firewall: explain how one connection attempt was blocked, describe
  a rule modification that would allow it, describe one side effect of that
  modification on traffic
- **E** a second attack: determine its type, describe the log evidence, describe
  how an automated system could halt it in real time, and identify a
  countermeasure other than an automated system

Students are expected to **cite evidence from the sources** and explain their
reasoning.

## Task verbs

- **Identify** provide information about concepts or evidence from the sources
- **Explain** give reasons that support a solution or account for an outcome,
  using specific evidence
- **Describe** provide information about a process or outcome
- **Determine** apply criteria or reasoning to the sources to reach a result
- **Write** express in print form a proper command that has the indicated effect

## Why this matters beyond the practice exam page

**The exam asks students to write shell commands.** Part C (iii) of the CED's
own sample is `chmod`. The terminal labs in `config/labs/` are not a nice extra
next to this exam, they are practice for a graded part of it. A lab that has a
student read `ls -l` output, reason about who can read a file, and then fix it
with a command is rehearsing Part C almost exactly.

## What was wrong on the site

`ap-cybersecurity-practice-exam` claimed **40 MCQ + 3 FRQ** as the exam's shape,
in the hero, the intro, two JSON-LD blocks and an Article headline, and called
itself full-length. Corrected by `scripts/cyber-practice-exam-truth.js`; the
page keeps its own 40 questions and 3 free-response practice sets, and now
states the real format instead of implying its own is it.

Its SEO description also said "Free AP CSA practice exam" on a Cybersecurity
page. Also corrected.

Still open: nothing on the site yet practises the real Device Security Analysis
shape, six sources from one device with parts A to E.
