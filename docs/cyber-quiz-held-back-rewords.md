# The five stems holding back two quizzes

`scripts/extract-cyber-quizzes.js` refuses a question that puts a CED citation in
front of a student, and the refusal is all-or-nothing per quiz: seeding the rest
would leave a student taking a four-question instrument where the page gives five,
which changes the assessment while reporting success.

So two whole quizzes are held back over five stems. Every one is quoted below as
the parser reads it off the live page, with a proposed replacement. The quotes are
faithful to the wording; curly quotes and dashes have been normalised for reading,
so copy the replacement text rather than the quoted original when editing.
**This is a content decision and it is Tanner's.** Approve the wording and the two
quizzes migrate on the next extractor run with no code change; the extractor
re-derives from the live pages, so the fix is to the PAGE, not to a seed file.

The rule being enforced is the one in CLAUDE.md: the code is teacher knowledge.
Write "secure information, such as a one-time password", not "(1.1.C.2)". A code
earns its place in an explanation, which ships only after a teacher releases the
key, and these five are all in stems.

---

## 4.1 Device Vulnerabilities and Attacks

Four of six. Three are clean deletions that change nothing the question asks. The
fourth is not, and it is the reason this file exists rather than a patch.

### w3

> Each pairing below matches a device exploitation vector with a valid **CED**
> defense EXCEPT:

    Each pairing below matches a device exploitation vector with a valid defense EXCEPT:

The word does no work. The pairings are right or wrong on the security, not on
whether the CED lists them.

### w5

> Using the **CED** High/Moderate/Low device-risk framework, which assessment is
> MOST defensible?

    Using the High/Moderate/Low device-risk framework, which assessment is MOST defensible?

Same. The framework is taught in the lesson; naming its source is a citation.

### w2

> Which of the following statements about malware are TRUE **according to the AP
> CED**? I. A virus requires a user to execute or open a file to activate, whereas
> a worm spreads between computers without human interaction. II. Fileless malware
> hides its code inside files that are concealed from the operating system, which
> is why anti-malware cannot scan it. III. A rootkit embeds itself in the operating
> system and can make itself invisible to detection.

    Which of the following statements about malware are TRUE?

...with the three numbered statements unchanged. Each one is true or false on the
technical claim, and a student who cannot evaluate III is not helped by being told
where it came from.

### w6, and this one is a real edit

> Malware infects one machine on a hospital network and, with no further user
> action, copies itself to roughly 200 other machines within minutes, degrading
> network performance. Which malware type is this, and which CIA principle does
> **the CED** most directly associate with it?

Here the citation is load-bearing in a way the other three are not. "Which
principle does the CED associate with it" is a different question from "which
principle does this threaten": the first asks what the framework says, the second
asks the student to reason. Deleting the words silently converts one into the
other, which is exactly the substitution the refusal exists to prevent.

Two honest options, and they are not equivalent:

    a. ...and which CIA principle does it most directly threaten?
    b. ...and which CIA principle is most directly affected?

(a) is the better question and is what the rest of this quiz asks for. It may not
be what the existing answer key marks correct, so whoever makes this edit should
check the key against the four options rather than assume.

---

## 2.3 Protecting Physical Spaces

One of five.

### w4

> Xtensr's draft mitigation plan for Delmar ranks four recommendations. Exactly one
> row is ranked wrongly under **EK 2.3.B.8**, which prioritizes mitigations by the
> severity of the risk and the cost of the mitigation. ...

    ... Exactly one row is ranked wrongly: mitigations are prioritized by the
    severity of the risk and the cost of the mitigation. ...

The stem already states the rule in the same sentence, which is why this one is
safe. The code adds nothing a student can use and everything a student can search.

The four ranked rows and "Which correction is BEST?" are unchanged.

---

## Held back for a different reason: 3.5

`ap-cyber-unit-3-lesson-6-quiz` (CED topic 3.5, IDS/IPS/SIEM) carries **ten**
questions. Every web quiz measured on this site is five or six; the teacher bundle
instruments are 9 to 24. That size is the one cheap discriminator available,
because the .docx bundles are not in this repo and no diff against them is
possible, so the extractor refuses over six and asks.

It is also a fourth markup generation (`selectOpt(n,'A')` on `.opt` divs, with a
predict-gate), which no parser here reads yet.

Two questions for a human, in order:

1. Is that page a web quiz that grew, or a bundle instrument that got published?
   If the second, seeding it makes a gated assessment permanently public, and the
   right move is to re-author rather than migrate.
2. If it is a web quiz, is ten the intended length? The other twenty are five.
