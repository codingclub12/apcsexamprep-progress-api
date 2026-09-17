# cyber-bundle-ced-voice

Takes the course framework out of the AP Cybersecurity Teacher Bundle's student
instruments, and leaves it in the teacher's answer key.

Built 2026-09-11 after Tanner reported that the quizzes, tests, exercises and
discussions were full of "according to CED" and "pick the 4 CB types", language
about the curriculum document rather than about security.

## What counts as framework voice

Not just the EK code. `lib/cyber-ek-density.js` already finds `1.1.C.2` in live
page HTML. The wider defect is the framework named as the AUTHORITY in a stem:

    According to the CED, which statement BEST describes a server computer?
    Name the CB malware type, and quote the two behaviors from the log.
    Everything maps to CB Learning Objectives 4.1.A, 4.1.B, and 4.1.C.

A stem can carry no code at all and still be pure teacher voice. None of those
three questions is improved for a student by naming where the answer came from,
and the first two are harder to read because of it.

## What is deliberately LEFT ALONE

A `*_KEY.docx` is two documents interleaved: the student's instrument reprinted
verbatim, and the teacher's answer key under it.

    3. A connected tractor contains a small, low-cost computer ...   <- student's
    C. An embedded computer that is also an IoT device ✓             <- student's
    Why C: EK 4.1.A.5 defines an embedded computer as ...            <- teacher's
    CED: EK 4.1.A.5                                                  <- teacher's

CLAUDE.md names a teacher-facing answer key as a placement where a code EARNS its
place, so the rationales keep every citation: 4531 of them. Stripping those would
read as a cleaner result and would destroy what the teacher paid for.

Which half a paragraph belongs to is decided STRUCTURALLY, not by a prefix list:
a KEY paragraph is student-visible exactly when the STUDENT twin also contains it
(`pairing.py`). The first version matched `Why A:` and `CED:` by prefix and missed
`KEY: Case 1 is a virus (EK 4.1.B.2)` and `Q1 [EK 4.1.B.2] (6 pts)`, which would
have stripped 2377 teacher annotations. Same failure as the one recorded at the
top of `lib/cyber-ek-density.js`: the proxy was wrong in a way that looked right.

## The rule that shaped the whole design: do not delete, rewrite

Someone has already run a naive strip over some of these files, and it is still
shipping. In the live Drive bundle today:

    7. ... Which statement(s) correctly reflect?        (verb, no object)
    9. Lists the common ways an asset can be compromised.   (no subject)
    8. According to, a vulnerability is best defined as which of the following?
    D. — logging in successfully from a known device

`tools/bundle-quiz-relabel/README.md` records the same damage in the 2.2 student
copy and answers it with a table of hand-written sentences. So every rule here
rewrites to a whole sentence, `rules.introduces_damage()` REFUSES the tool's own
output if it introduces a dangling tail, and `voice.DANGLING` hunts the wreckage
the earlier pass left.

Repairs authored here landed on the same wording `plan.py` chose independently
for the same items, which is a reassuring accident rather than a shared source.

## Parts

| file | what it does |
|---|---|
| `voice.py` | the detector: what framework voice is, and which placements are protected |
| `pairing.py` | which paragraphs of a KEY a student actually reads |
| `scope.py` | which files are in scope |
| `rules.py` | the mechanical rewrites, plus the damage gate that refuses its own bad output |
| `repairs_author.py` | the hand-written phrase table for everything the rules refuse |
| `analyze.py` | plans every edit; REFUSES rather than guessing, and syncs KEY to STUDENT |
| `docxedit.py` | applies edits at run level, so formatting and the ✓ survive |
| `run.py` | writes the repaired tree |
| `verify.py` | package, voice, loss, sync, intact |
| `mutate.py` | breaks each check on purpose; a green run here is a FAILED check |
| `rederive.py` | a second implementation, different parser, different method |

## Running it

```
python3 repairs_author.py <bundle-root>          # writes repairs.json
python3 analyze.py        <bundle-root>          # plan only; must show residue 0
python3 run.py            <bundle-root> <out>
python3 verify.py         <bundle-root> <out>
python3 rederive.py       <bundle-root> <out>    # needs python-docx
python3 mutate.py         <bundle-root> <out>
```

`repairs.json` and `worklist.json` are generated and gitignored. They hold whole
paragraphs of a paid product and this repository is public; `repairs_author.py`
rebuilds them from the bundle in one command.

Get a bundle root with the credential-free walker described in
`scripts/drive-watch.js`: both bundles are shared anyone-with-the-link, so this
reads them exactly as a customer does.

## What it cannot do

**There is no content-write path back into Drive.** The Google Drive connector
exposes `update_file` for title and parent only, confirmed again 2026-09-11 and
the same finding as `docs/cyber-teacher-guide-audit.md` on 2026-08-20. So this
writes repaired copies and a human uploads them. Until that upload happens the
bundle is unchanged, which is the 2026-09-08 lesson in `config/drive-bundles.json`:
a bundle repaired in a zip is not a bundle that has been fixed.
