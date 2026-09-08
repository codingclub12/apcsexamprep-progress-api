#!/usr/bin/env python3
# -----------------------------------------------------------------------------
#  REDERIVE: does the DEPLOYED player resolve on a locked lab, read a second way?
#
#  smoke/labs.js and scripts/verify-lab-lock-live.js both reach that conclusion
#  by EXECUTING the player under a DOM stub that lives in this repo. The stub is
#  twenty lines and it was written here, so a conclusion drawn only through it is
#  the repo agreeing with itself, and a branch that depended on something the
#  stub models wrongly would satisfy both.
#
#  This reads the raw artifact instead, in another language, and never runs it.
#  It fetches the bytes a student's browser actually gets and asks a structural
#  question of the source: inside the spec handler, does the locked branch end in
#  a return, or in a throw?
#
#  WHY THAT QUESTION AND NOT "is the message there"
#  The message being there is what scripts/verify-lab-player-live.sh already
#  checks, and it is not the half that breaks. The lab pages attach their offline
#  fallback to .catch and replace the container wholesale, so a locked card drawn
#  on a REJECTED promise is drawn and then painted over, and the student reads a
#  service outage about a lab a teacher closed on purpose. Message present,
#  behaviour wrong, grep green.
#
#  It is deliberately not a full parser. It finds the locked branch, walks its
#  braces to find where it ends, and reads the statements in between. A parser
#  would be a third thing to maintain and the property is this small.
#
#  Zero PII: one public asset.
#  No em-dashes, per repo convention.
#  Run: python3 scripts/rederive-lab-lock.py
# -----------------------------------------------------------------------------
import os
import re
import subprocess
import sys

API = "https://progress.apcsexamprep.com"


def fetch(path):
    #  LAB_PLAYER_FILE reads a local copy instead. It exists so this rule can be
    #  MUTATION TESTED: a check on deployed bytes cannot be broken on purpose
    #  without a way to hand it broken bytes, and a rule nobody has seen go red
    #  is a rule nobody has seen work. It is read only here, only for this asset,
    #  and nothing in the running service consults it.
    if os.environ.get("LAB_PLAYER_FILE") and path == "/lab-player.js":
        with open(os.environ["LAB_PLAYER_FILE"], encoding="utf-8") as fh:
            return "200", fh.read()
    #  No User-Agent, same rule as every other fetch in this repo. This is the
    #  progress API rather than the storefront, so it is not behind the bot
    #  management that rule was written for, but there is no reason to differ.
    out = subprocess.run(
        ["curl", "-sS", "--max-time", "45", "--compressed", "-w", "\n%{http_code}", API + path],
        capture_output=True, text=True, check=True).stdout
    body, _, code = out.rpartition("\n")
    return code.strip(), body


def brace_block(src, open_idx):
    """Slice from the '{' at open_idx to its matching '}'."""
    depth = 0
    for i in range(open_idx, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[open_idx:i + 1]
    raise ValueError("unbalanced braces from index %d" % open_idx)


def strip_comments(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    return re.sub(r"^[ \t]*//.*$", "", s, flags=re.M)


def report(checks):
    p = f = 0
    for good, label, detail in checks:
        if good:
            p += 1
            print("  PASS  " + label)
        else:
            f += 1
            print("  FAIL  " + label + ("\n        " + detail if detail else ""))
    print("\n%d passed, %d failed" % (p, f))
    if not f:
        print("RE-DERIVED OK")
    return 1 if f else 0


def main():
    code, src = fetch("/lab-player.js")
    checks = []

    def ok(cond, label, detail=""):
        checks.append((bool(cond), label, detail))

    ok(code == "200", "the deployed player answers 200", "HTTP " + code)
    if code != "200":
        return report(checks)
    print("  deployed lab-player.js: %d bytes" % len(src))

    clean = strip_comments(src)

    #  The branch, found by its CONDITION rather than by its message, so a
    #  reworded card does not read as a missing branch.
    m = re.search(r"if\s*\(\s*spec\s*&&\s*spec\.locked\s*\)\s*", clean)
    ok(m is not None, "the deployed player has a branch on spec.locked")
    if not m:
        return report(checks)

    rest = clean[m.end():]
    if rest.lstrip().startswith("{"):
        body = brace_block(rest, rest.index("{"))
    else:
        #  A single-statement branch with no braces is legal and is the easiest
        #  way to write the returning form, so it has to be readable here too.
        body = rest[:rest.index(";") + 1] if ";" in rest else rest

    stmts = [x.strip() for x in body.strip("{} \n").split(";") if x.strip()]
    ok(len(stmts) > 0, "the locked branch is not empty", body[:120])

    #  THE PROPERTY. A branch that throws or rejects hands the page's .catch the
    #  container, and the offline card wins.
    throws = [s for s in stmts if re.search(r"\bthrow\b|\bPromise\.reject\b|\breject\s*\(", s)]
    ok(not throws, "the locked branch does not throw or reject", "; ".join(throws)[:160])

    returns = [s for s in stmts if re.match(r"^return\b", s)]
    ok(len(returns) == 1, "it ends in exactly one return, so the promise resolves",
       "found %d: %s" % (len(returns), "; ".join(returns)[:120]))
    if returns:
        ok(not re.search(r"\bmount\s*\(", returns[0]),
           "and does not return mount(), which would render a lab it was told is locked",
           returns[0][:120])

    #  Something has to be put in front of the student, or the fix is a blank box.
    ok(any(re.search(r"textContent\s*=|appendChild\s*\(|innerHTML\s*=", s) for s in stmts),
       "the branch writes something into the container")

    #  And nothing of the spec may go into it. The spec is null when locked, so a
    #  reference here is a leak waiting for the day the server sends one.
    leaks = [s for s in stmts if re.search(r"spec\.(?!locked\b|reason\b)[A-Za-z_]", s)]
    ok(not leaks, "and puts no spec field on the page", "; ".join(leaks)[:160])

    #  The real-error path has to survive, or real outages go quiet. The handler
    #  is a PROMISE .catch, not a try/catch statement, and the first cut of this
    #  rule looked for the statement form and went red against a correct build.
    #  Left in as a note because it is the same failure this whole file is about:
    #  a check that cannot see its subject reports on something else.
    catch_body = re.search(r"\.catch\s*\(\s*function\s*\(\s*e\s*\)\s*", clean)
    rethrows = False
    if catch_body:
        after = clean[catch_body.end():]
        if after.lstrip().startswith("{"):
            rethrows = re.search(r"\bthrow\s+e\b", brace_block(after, after.index("{"))) is not None
    ok(rethrows,
       "the catch handler still rethrows, so a real failure still reaches the page fallback",
       "no .catch(function (e) { ... throw e }) in the deployed bytes")

    return report(checks)


if __name__ == "__main__":
    sys.exit(main())
