"""
The hand-written half of the rewrite.

Everything rules.py refused lands here. Each entry is a phrase a person read and
replaced, in the style tools/bundle-quiz-relabel/plan.py established for the 2.2
quiz: the stem is REWRITTEN into a whole sentence, never trimmed until the
citation falls out.

Two shapes recur and both are judgement calls a regex should not make:

  the framework as SUBJECT   "Where does the CED say motion sensors should be
                             placed?" needs "Where should motion sensors be
                             placed?", which is do-support, not a deletion.

  wreckage already in Drive  "9. Lists the common ways an asset can be
                             compromised." lost its subject to an earlier strip.
                             The repair restores the question, and it matches the
                             one plan.py already authored for the same item.

Run:  python3 repairs_author.py <bundle-root>   writes repairs.json
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import analyze, voice, pairing  # noqa: E402

# (find, replace) applied to the text rules.py produced. Ordered: a longer phrase
# that contains a shorter one must come first.
PHRASES = [
    # ── the framework as the subject of a verb ──────────────────────────────
    ("Why does the CED treat this setup as especially dangerous?",
     "Why is this setup especially dangerous?"),
    ("How does the CED classify the computers inside these machines?",
     "How are the computers inside these machines classified?"),
    ("How does the CED classify this adversary?", "How is this adversary classified?"),
    ("How does the CED classify this attack, and", "How is this attack classified, and"),
    ("the factors the CED uses to evaluate impact", "the factors used to evaluate impact"),
    ("Which attack does the CED say this specifically helps prevent?",
     "Which attack does this specifically help prevent?"),
    ("How does the College Board rate this?", "How should this be rated?"),
    ("Which of the following does the CED list as part of a typical ACL rule?",
     "Which of the following are part of a typical ACL rule?"),
    ("The CED notes that adversaries can use", "Adversaries can use"),
    ("How does the CED say signature-based anti-malware software detects malicious files?",
     "How does signature-based anti-malware software detect malicious files?"),
    ("Which pair of algorithms does the CED identify as common",
     "Which pair of algorithms are common"),
    ("as the College Board frames it for physical attacks", "as it applies to physical attacks"),
    ("What does the CED say should happen before these are put into production?",
     "What should happen before these are put into production?"),
    ("Where does the CED say motion sensors should be placed?",
     "Where should motion sensors be placed?"),
    ("Which finding is one the CED lists as a network-based IoC?",
     "Which finding is a network-based IoC?"),
    ("requirements the CED says workstation policies often include",
     "requirements that workstation policies often include"),
    ("Which of the following does the CED list as behavior-based IoCs",
     "Which of the following are behavior-based IoCs"),
    ("Which of the following does the CED list as the three design principles",
     "Which of the following are the three design principles"),
    ("What does the CED say this enables?", "What does this enable?"),
    ("Which of the following does the CED say a typical ACL rule includes?",
     "Which of the following does a typical ACL rule include?"),
    ("a common underlying technique the College Board emphasizes about physical attacks",
     "a common underlying technique used in physical attacks"),
    ("What does the CED say is needed for log analysis", "What is needed for log analysis"),
    ("the knowledgeable human the CED says must review",
     "the knowledgeable human who must review"),
    ("The College Board says threats to physical security include more than human attackers.",
     "Threats to physical security include more than human attackers."),
    ("Which single control does the CED recommend enabling for this purpose?",
     "Which single control should be enabled for this purpose?"),
    ("The CED describes a moderate risk from device vulnerabilities. Which example fits that category?",
     "Which example fits a moderate risk from device vulnerabilities?"),
    ("The CED describes a location factor for authentication. Which example matches that factor?",
     "Which example matches a location factor for authentication?"),
    ("what does EK 1.5.B.2 say the tool is able to do quickly?",
     "what is the tool able to do quickly?"),
    ("The framework notes that most internet protocols are encrypted, yet still advises individuals to weigh",
     "Most internet protocols are encrypted, yet individuals should still weigh"),
    ("What example of vulnerable data does the CED give?",
     "Which example of vulnerable data best fits?"),
    ("the term the CED gives to a small update", "the term for a small update"),
    ("the EK says the feed should be recorded AND monitored",
     "the feed should be recorded AND monitored"),
    ("which the CED calls a knowledge challenge", "which is a knowledge challenge"),
    ("The CED notes a key constraint about protecting data in this state. ", ""),

    # ── the framework as the source of a requirement ────────────────────────
    ("the exact human reviewer the CED specifies", "the exact human reviewer required"),
    ("the specific human reviewer the CED requires", "the specific human reviewer required"),
    ("the named expert the CED requires before these rules go live",
     "the named expert required before these rules go live"),
    ("Give a concrete value where the CED suggests one.",
     "Give a concrete value where one is recommended."),
    ("the three behaviors the CED says this training targets",
     "the three behaviors this training targets"),
    ("Why does the CED treat secure by default as living INSIDE secure by design",
     "Why is secure by default treated as living INSIDE secure by design"),
    ("the one thing the CED says MALWARE does that anti-malware does not",
     "the one thing MALWARE does that anti-malware does not"),
    ("Name all four channels the CED specifies for social engineering.",
     "Name all four channels used for social engineering."),
    ("the role the super user plays per the CED", "the role the super user plays"),
    ("what makes this use of AI 'especially concerning' per the CED",
     "what makes this use of AI 'especially concerning'"),
    ("‘especially concerning’ per the CED", "‘especially concerning’"),
    ("yet the CED treats them as distinct attacks", "yet they are distinct attacks"),
    ("citing both EKs", "citing the evidence for each"),
    ("The CED calls acceptable use, password, and software installation policies",
     "Acceptable use, password, and software installation policies are called"),
    ("The CED says a firewall is SOFTWARE", "A firewall is SOFTWARE"),
    ("The CED says any computer can be a server", "Any computer can be a server"),
    ("but the CED says the same vulnerability can be HIGH on another device",
     "but the same vulnerability can be HIGH on another device"),
    ("The CED lists four channels: In person, email, text message, and social media.",
     "There are four channels: in person, email, text message, and social media."),
    ("the CED gives three criteria — cost (C.B.1), sensitivity/criticality, and classification",
     "there are three criteria — cost, sensitivity/criticality, and classification"),
    ("Per the CED, which managerial control", "Which managerial control"),

    # ── wreckage left by the earlier strip ──────────────────────────────────
    ("EK 1.2.B.1 lists the common patterns people use when creating passwords. "
     "Which choice is NOT one of those CED-listed patterns?",
     "Which choice is NOT one of the common patterns people use when creating passwords?"),
    ("Lists the common patterns people use when creating passwords. "
     "Which choice is NOT one of those CED-listed patterns?",
     "Which choice is NOT one of the common patterns people use when creating passwords?"),
    ("EK 2.2.B.2 lists the common ways an asset can be compromised. Which of the "
     "following is NOT one of the compromises the College Board names?",
     "Which of the following is NOT one of the common ways an asset can be compromised?"),
    ("Lists the common ways an asset can be compromised. Which of the following "
     "is NOT one of the compromises the College Board names?",
     "Which of the following is NOT one of the common ways an asset can be compromised?"),
    ("EK 2.2.B.4 describes what an adversary can do after reaching an area that holds "
     "sensitive information. Which action best fits that essential knowledge?",
     "Which action best describes what an adversary can do after reaching an area "
     "that holds sensitive information?"),
    ("Describes what an adversary can do after reaching an area that holds sensitive "
     "information. Which action best fits that essential knowledge?",
     "Which action best describes what an adversary can do after reaching an area "
     "that holds sensitive information?"),
    ("Which of the following are techniques the names for segmenting a network under LO 3.3.A?",
     "Which of the following are techniques for segmenting a network?"),
    ("Question 2. The splits the topic into managerial controls (3.2.A, the written rules) "
     "and configuring wireless features (3.2.B, the actions).",
     "Question 2. This topic splits into managerial controls (the written rules) and "
     "configuring wireless features (the actions)."),
    ("— signature, signature database, scan, and quarantine — part.",
     "— signature, signature database, scan, and quarantine."),
    ("Name the control + cite the matching–D + tie it", "Name the control + tie it"),
    ("The named tactics in–A.8 are what you must identify",
     "The named tactics above are what you must identify"),
    ("D. EK 2.4.A.4 detection only works", "D. Employee-awareness detection only works"),
    ("(screened subnet/DMZ, subnetting, VLAN, or port security) or 3.3.B number.",
     "(screened subnet/DMZ, subnetting, VLAN, or port security)."),

    # ── codes used as labels a student reads ────────────────────────────────
    ("a password that follows EK 1.2.C.1 and EK 1.2.C.2",
     "a password that follows both password-creation guidelines from this lesson"),
    ("a password that follows 1.2.C.2",
     "a password that follows both password-creation guidelines from this lesson"),
    ("Which password most directly reflects the EK 1.2.B.1 pattern",
     "Which password most directly reflects the common pattern"),
    ("Which attack and EK is this?", "Which attack is this?"),
    ("name the specific policy (3.2.A.1–A.4) or configuration (3.2.B.1–B.4) it represents",
     "name the specific policy or configuration it represents"),
    ("Control (4.3.A / B / C / D):", "Control:"),
    ("the impact category (1.1.C.1, 1.1.C.2, or 1.1.C.3)", "the impact category"),
    ("NOT a separate CED list", "NOT a separate list"),
    ("Connect this lesson forward to LO 2.1.B.", "Connect this lesson forward to adversary types."),
    ("the same features that get configured in 3.2.B",
     "the same features that get configured as wireless settings"),
    ("Sign check (named attack(s) 2.2.A/B):", "Sign check (named attack(s)):"),
    ("Sign check (which attack(s) 3.5.E):", "Sign check (which attack(s)):"),
    ("Cite the symmetry between 1.5.A.2, the scale advantage",
     "Cite the symmetry between the two sides' use of AI, the scale advantage"),
    ("Task B - which idea is hardest to get right? [LO 3.4.A–D] —",
     "Task B - Which idea is hardest to get right? —"),
    ("Task B - Which technique is hardest to live with? [LO 3.3.A] —",
     "Task B - Which technique is hardest to live with? —"),
    ("Which statements are consistent with EK 3.5.D.1, and D.4?",
     "Which statements are correct?"),

    # ── the last eight, found by running this file against the worklist ──────
    (" — and cite the exact.", "."),
    ("name the control + cite the matching–D + tie it", "name the control + tie it"),
    ("the CB segmentation technique", "the segmentation technique"),
    ("Question 2. the splits the topic into managerial controls (3.2.A, the written rules) "
     "and configuring wireless features (3.2.B, the actions).",
     "Question 2. This topic splits into managerial controls (the written rules) and "
     "configuring wireless features (the actions)."),
    ("Which CED description correctly matches", "Which description correctly matches"),
    ("Match each EK 1.5.A use of AI", "Match each use of AI"),
    ("The CB framework notes that most internet protocols are encrypted, yet still advises "
     "individuals to weigh",
     "Most internet protocols are encrypted, yet individuals should still weigh"),
    ("The CED lists four channels: in person, email, text message, and social media.",
     "There are four channels: in person, email, text message, and social media."),

    # ── the last three, found by the bare-code-tail detector ────────────────
    ("how do–C.4 justify giving the three findings DIFFERENT risk levels",
     "what justifies giving the three findings DIFFERENT risk levels"),
    ("Which statements are consistent with, and D.4?", "Which statements are correct?"),
    ("(A.1 deepfake, A.2 phishing, A.3 extraction, A.4 poisoning, A.5 recon, A.6 coding)",
     "(deepfake, phishing, extraction, poisoning, recon, coding)"),
]

CLEANUPS = [(re.compile(r'[ \t]{2,}'), ' '), (re.compile(r'\s+([,.;:?!])'), r'\1')]


def apply_phrases(text):
    out = text
    for find, repl in PHRASES:
        if find in out:
            out = out.replace(find, repl)
    for rx, r in CLEANUPS:
        out = rx.sub(r, out)
    return out.strip()


if __name__ == '__main__':
    # Author against a plan computed with NO repairs loaded, so this file always
    # sees the full residue and rewriting it is idempotent. Reading worklist.json
    # instead made the second run author only what the first had not yet fixed,
    # and overwrite the rest away.
    base = sys.argv[1]
    _, residue = analyze.plan(base, repairs={})
    repairs, unresolved = {}, []
    seen = set()
    for r in residue:
        key = pairing.norm(r['text'])
        if key in seen:
            continue
        seen.add(key)
        fixed = apply_phrases(r['after_rules'])
        ann_ok = (r['kind'] == 'key')
        if voice.is_clean(fixed, annotations_ok=ann_ok):
            repairs[key] = fixed
        else:
            unresolved.append((fixed, sorted({d['kind'] for d in
                                              voice.find(fixed, annotations_ok=ann_ok)})))
    with open(os.path.join(HERE, 'repairs.json'), 'w') as f:
        json.dump(repairs, f, indent=1, ensure_ascii=False)
    print(f"residue paragraphs : {len(seen)}")
    print(f"repairs authored   : {len(repairs)}")
    print(f"still unresolved   : {len(unresolved)}")
    for fx, k in unresolved:
        print(f"\n  [{','.join(k)}] {re.sub(chr(92) + 's+', ' ', fx)[:210]}")
