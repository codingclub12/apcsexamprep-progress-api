# Internal links that go nowhere, measured 2026-09-02

Every `/pages/`, `/products/`, `/collections/` and `/blogs/` href in the stored
body of all 1,311 readable Shopify pages and all 50 product descriptions,
checked against the handles the sitemaps advertise. This is authored content,
never theme chrome.

Three things this deliberately does not count, each of which it got wrong once:

- a href inside a `<script>` or `<style>`. The storefront builds its prev and
  next buttons at runtime, so 14 practice-test pages carry
  `href="/pages/'+prev.handle+'"` in their source. That is JavaScript.
- a link deeper than one segment, such as `/blogs/<blog>/<article>`. The article
  list exists here for one blog of seven, so those are counted as unchecked.
- a link resolved in a section it does not name. `/pages/ap-csa` and
  `/blogs/ap-csa` are different things and moving between them is a content
  decision, not a repair.

```
node scripts/dead-internal-link-repair.js --bodies bodies/ \
  --handles smoke/fixtures/live-page-handles.txt \
  --products smoke/fixtures/live-product-handles.txt \
  --collections smoke/fixtures/live-collection-handles.txt \
  --blogs smoke/fixtures/live-blog-handles.txt
```

150 links have been repaired and imported across two rounds; 358 remain, across
142 targets, and are listed below. They are NOT repaired: each one needs a
person to say where it was meant to go.

| round | pages | links | what |
|---|---|---|---|
| 1 | 45 | 141 | `/pages/` only: 2 typos, 26 by hand, 113 unique-extension |
| 2 | 7 | 9 | the other three sections: a free-preview product and a blog |

Findings decay. Re-run the command rather than trusting the table.

## The 142 targets that were left alone

- `/pages/tutoring` linked from 28: 2d-array-neighbors-ap-csa, ap-csa-api-quick-reference, ap-csa-boolean-expression-equivalence ...
- `/pages/ap-computer-science-tutor` linked from 25: ap-csa-2018-frq-1-frogsimulation, ap-csa-2018-frq-2-wordpairlist, ap-csa-2018-frq-4-arraytester ...
- `/pages/ap-computer-science-a` linked from 20: ap-csa-2d-array-cheat-sheet, ap-csa-2d-array-mistakes, ap-csa-2d-array-trace-problems ...
- `/pages/ap-csa-qotd-hub` linked from 14: ap-csa-4-week-cram-kit, ap-csa-exam-format, ap-csa-frq-archive ...
- `/pages/ap-cyber-unit-1-lesson-1` linked from 14: ap-cybersecurity-complete-course-guide, ap-cybersecurity-curriculum-units-guide, ap-cybersecurity-curriculum ...
- `/pages/ap-cybersecurity-unit-1-exam` linked from 11: ap-cyber-unit-3-lesson-1, ap-cyber-unit-3-lesson-2, ap-cyber-unit-3-lesson-4 ...
- `/pages/ap-cybersecurity-unit-1-project` linked from 10: ap-cyber-unit-3-lesson-1, ap-cyber-unit-3-lesson-2, ap-cyber-unit-3-lesson-4 ...
- `/pages/tutoring-packages` linked from 5: ap-computer-science-principles-resources, ap-csa-exam-prep-hub, ap-csa-exam-prep-hub ...
- `/pages/ap-csp-qotd-hub` linked from 5: ap-csp-create-task-ultimate-guide, ap-csp-data-analysis-practice, ap-csp-practice-tests-by-topic ...
- `/pages/ap-cybersecurity-unit-1-wireless-security-exercise-1` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-wireless-security-exercise-2` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-wireless-security-lab` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-wireless-security-quiz` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-ai-cyber-defense-exercise-1` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-ai-cyber-defense-exercise-2` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-ai-cyber-defense-lab` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-cybersecurity-unit-1-ai-cyber-defense-quiz` linked from 5: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-lesson-2-quiz ...
- `/pages/ap-csp-full-practice-exam-70-mcq` linked from 4: ap-computer-science-principles-resources, ap-computer-science-principles-resources, ap-csp-question-of-the-day ...
- `/pages/ap-csa-unit-1-study-guide` linked from 4: ap-csa-2004-frq-3, ap-csa-2004-frq-3, ap-csa-2005-frq-3 ...
- `/pages/ap-csa-2d-array-traversal` linked from 4: ap-csa-2d-array-cheat-sheet, ap-csa-2d-array-mistakes, ap-csa-2d-array-trace-problems ...
- `/products/computer-science-tutoring-lesson` linked from 4: ap-csa-study-games-hub, ap-csp-question-of-the-day, ap-cybersecurity-question-of-the-day ...
- `/pages/ap-cybersecurity-unit-1-password-attacks-quiz` linked from 4: ap-cyber-unit-1-lesson-1-exercise-2, ap-cyber-unit-1-lesson-2-exercise-1, ap-cyber-unit-1-project ...
- `/pages/ap-csa-frq-all-years` linked from 3: ap-csa-4-week-cram-kit, ap-csa-ced-explained, ap-csa-cram-sheet
- `/pages/ap-csa-arraylist-methods-explained` linked from 3: ap-csa-array-methods-cheat-sheet, ap-csa-array-vs-arraylist, ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-array-filter-pattern` linked from 3: ap-csa-arraylist-frq-patterns, ap-csa-arraylist-traps, ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-concurrent-modification` linked from 3: ap-csa-arraylist-trace-problems, ap-csa-arraylist-traps, ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-lesson-4-13-searching-and-sorting` linked from 3: ap-csa-lesson-4-12-traversing-2d-arrays, ap-csa-lesson-4-12-traversing-2d-arrays, ap-csa-unit-4-data-collections-study-guide
- `/pages/ap-cybersecurity-study-guides` linked from 3: ap-csa-study-guides, ap-csp-study-guides, ap-cybersecurity-complete-course-guide
- `/pages/codehs-ap-csp-ap-csa-practice-hub` linked from 3: ap-csp-codehs-javascript-practice-page, ap-csp-codehs-javascript-practice-page, ap-csp-codehs-javascript-practice-page
- `/products/ap-csp-big-idea-1-superpack-free` linked from 3: ap-csp-teacher-superpack, ap-csp-teacher-superpack, ap-csp-teacher-superpack
- `/pages/ap-networking-network-securing` linked from 3: ap-networking-defending-many-connections, ap-networking-managing-many-connections, ap-networking-security-fundamentals
- `/pages/ap-csp-codehs-js` linked from 3: codehs-ap-csp-practice-material-javascript-and-python, codehs-ap-csp-practice-material-javascript-and-python, codehs-ap-csp-practice-material-javascript-and-python
- `/pages/ap-csp-codehs-python` linked from 3: codehs-ap-csp-practice-material-javascript-and-python, codehs-ap-csp-practice-material-javascript-and-python, codehs-ap-csp-practice-material-javascript-and-python
- `/pages/ap-csa-codehs-practice` linked from 3: codehs-ap-csp-practice-material-javascript-and-python, codehs-ap-csp-practice-material-javascript-and-python, codehs-ap-csp-practice-material-javascript-and-python
- `/pages/ap-csa-2d-array-neighbors` linked from 2: ap-csa-2d-array-patterns, ap-csa-2d-arrays
- `/pages/ap-csa-array-accumulator-pattern` linked from 2: ap-csa-array-frq-patterns, ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-index-out-of-bounds` linked from 2: ap-csa-arrays-arraylist-exam-guide, ap-csa-off-by-one-errors
- `/pages/ap-csa-enhanced-for-loop-traps` linked from 2: ap-csa-arrays-arraylist-exam-guide, ap-csa-off-by-one-errors
- `/pages/ap-csa-unit-1-textbook` linked from 2: ap-csa-free-textbook, ap-csa-free-textbook
- `/pages/ap-csa-study-games` linked from 2: ap-csa-free-textbook, ap-csa-recursion-tracing
- `/pages/ap-csa-frq-2024-question-1` linked from 2: ap-csa-frq-archive, ap-csa-frqs-by-topic
- `/pages/ap-csa-frq-2024-question-2` linked from 2: ap-csa-frq-archive, ap-csa-frqs-by-topic
- `/pages/ap-csa-frq-2024-question-3` linked from 2: ap-csa-frq-archive, ap-csa-frqs-by-topic
- `/pages/ap-csa-2025-frq-4-sumorssamegame` linked from 2: ap-csa-frq-archive, ap-csa-frqs-by-topic
- `/pages/ap-csa-frq-2024-question-4` linked from 2: ap-csa-frq-archive, ap-csa-frqs-by-topic
- `/pages/ap-csa-writing-a-class` linked from 2: ap-csa-helper-private-methods, ap-csa-scope-local-vs-instance
- `/pages/ap-csa-lesson-4-6-arrays-as-parameters-and-return-values` linked from 2: ap-csa-lesson-4-5-algorithms-with-arrays, ap-csa-lesson-4-5-algorithms-with-arrays
- `/pages/ap-csa-lesson-4-7-arraylist-introduction` linked from 2: ap-csa-lesson-4-8-arraylist-methods, ap-csa-lesson-4-8-arraylist-methods
- `/pages/ap-csa-full-practice-exam` linked from 2: ap-csa-practice-exam-2, ap-csa-unit-2-exam-selection-iteration
- `/pages/ap-csp-big-idea-3-algorithms-and-programming` linked from 2: ap-csp-ced-explained, ap-csp-ced-explained
- `/pages/ap-computer-science` linked from 2: ap-csp-codehs-javascript-practice-page, codehs-ap-csp-practice-material-javascript-and-python
- `/pages/ap-csp-practice-exam` linked from 2: ap-csp-codehs-javascript-practice-page, ap-csp-codehs-javascript-practice-page
- `/pages/ap-csp-codehs-js-midterm` linked from 2: ap-csp-codehs-javascript-practice-page, ap-csp-codehs-javascript-practice-page
- `/pages/ap-networking-dns-dhcp` linked from 2: ap-networking-addressing-dns-at-scale, ap-networking-ip-addressing-subnetting
- `/pages/ap-networking-device-troubleshooting` linked from 2: ap-networking-command-line, ap-networking-troubleshooting-loop
- `/pages/ap-networking-osi-tcp-ip-models` linked from 2: ap-networking-data-travels-globally, ap-networking-ip-addressing-subnetting
- `/pages/ap-csa-array-traversal-patterns` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-array-algorithms` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-arraylist-algorithms` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-array-swap-pattern` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-array-string-combo` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-array-mcq-practice` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-arraylist-mcq-practice` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-null-pointer-arrays` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-array-initialization-pitfalls` linked from 1: ap-csa-arrays-arraylist-exam-guide
- `/pages/ap-csa-linear-search` linked from 1: ap-csa-arrays-exam-guide
- `/pages/ap-computer-science-a-exam` linked from 1: ap-csa-boolean-expressions
- `/pages/ap-csa-unit-1` linked from 1: ap-csa-exam-review
- `/pages/ap-csa-unit-2` linked from 1: ap-csa-exam-review
- `/pages/ap-csa-unit-3` linked from 1: ap-csa-exam-review
- `/pages/ap-csa-unit-4` linked from 1: ap-csa-exam-review
- `/pages/ap-csa-unit-2-textbook` linked from 1: ap-csa-free-textbook
- `/pages/ap-csa-unit-3-textbook` linked from 1: ap-csa-free-textbook
- `/pages/ap-csa-unit-4-textbook` linked from 1: ap-csa-free-textbook
- `/pages/ap-csa-frq-2026` linked from 1: ap-csa-frq-2025
- `/pages/ap-csa-question-of-the-day` linked from 1: ap-csa-frq-strategy-guide
- `/pages/ap-csa-frq-2025-question-1-dog-walker-problem` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2012-frq-2-graybug` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2011-frq-1-sound` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2010-frq-1-cookieorder` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2009-frq-1-numbercube` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2008-frq-1-flightlist` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2007-frq-1-selfdivisor` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2006-frq-1-dailyschedule` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2005-frq-1-hotel` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2004-frq-1-wordlist` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2025-frq2-signedtext` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2017-frq-2-multiplayergame` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2013-frq-2-tokenpass` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2013-frq-1-download` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2012-frq-1-climbing` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2010-frq-2-apline` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2018-frq-2-wordpair` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2014-frq-1-stringformatter` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2012-frq-3-horsebarn` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2011-frq-3-fueldepot` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2010-frq-3-trail` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2009-frq-3-batterycharger` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2008-frq-2-stringcoder` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2007-frq-3-pixelpicture` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2006-frq-3-taxableitem` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2017-frq-4-successors` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2016-frq-3-crosswordpuzzle` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2013-frq-4-skyview` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2012-frq-4-grayimage` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2011-frq-4-bitmatrix` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2009-frq-4-tile` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2005-frq-4-studentanswersheet` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-2004-frq-4-voyage` linked from 1: ap-csa-frqs-by-topic
- `/pages/how-to-study-for-ap-csa` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-unit-4-complete-study-guide` linked from 1: ap-csa-frqs-by-topic
- `/pages/ap-csa-lesson-4-15-using-data-sets-with-arrays-and-arraylists` linked from 1: ap-csa-lesson-4-16-recursion
- `/pages/ap-csa-lesson-4-17-informal-code-analysis` linked from 1: ap-csa-lesson-4-16-recursion
- `/pages/ap-computer-science-a-hub` linked from 1: ap-csa-practice-exam-2
- `/pages/ap-csa-practice-exam` linked from 1: ap-csa-practice-exam-section-2-free-response
- `/pages/ap-csa-tutoring` linked from 1: ap-csa-unit-2-exam-selection-iteration
- `/pages/ap-csa-lesson-arrays-as-parameters` linked from 1: ap-csa-unit-4-data-collections-study-guide
- `/pages/ap-csa-lesson-arraylist-introduction` linked from 1: ap-csa-unit-4-data-collections-study-guide
- `/pages/ap-csa-lesson-using-data-sets-arrays-arraylists` linked from 1: ap-csa-unit-4-data-collections-study-guide
- `/pages/ap-csa-lesson-informal-code-analysis` linked from 1: ap-csa-unit-4-data-collections-study-guide
- `/pages/ap-csa-bug-hunt` linked from 1: ap-csa-wordle
- `/pages/ap-csp-codehs-js-topics` linked from 1: ap-csp-codehs-javascript-practice-page
- `/pages/ap-csp-course-big-idea-4-networks` linked from 1: ap-csp-course-big-idea-2-data
- `/pages/ap-csp-exam-prep-hub` linked from 1: ap-csp-course-big-idea-5-impact
- `/pages/ap-csp-create-task-guide` linked from 1: ap-csp-written-response-archive
- `/pages/ap-cybersecurity-unit-3-network-attacks` linked from 1: ap-cyber-unit-3-lesson-2-exercise-1
- `/pages/ap-cybersecurity-unit-3-secure-protocols` linked from 1: ap-cyber-unit-3-lesson-3-exercise-1
- `/pages/ap-cybersecurity-unit-3-segmentation` linked from 1: ap-cyber-unit-3-lesson-4-exercise-1
- `/pages/ap-cybersecurity-unit-3-firewalls` linked from 1: ap-cyber-unit-3-lesson-5-exercise-1
- `/pages/ap-cybersecurity-device-attacks` linked from 1: ap-cybersecurity-siem
- `/pages/ap-cybersecurity-unit-3-network-security` linked from 1: ap-cybersecurity-unit-2-detecting-physical-attacks
- `/pages/ap-networking-device-connecting-optimizing` linked from 1: ap-networking-ip-addressing-subnetting
- `/pages/ap-networking-device-security-needs` linked from 1: ap-networking-security-fundamentals
- `/pages/ap-networking-device-securing` linked from 1: ap-networking-security-fundamentals
- `/pages/ap-networking-network-advanced-features` linked from 1: ap-networking-switching-vlans
- `/pages/ap-networking-soho-troubleshooting` linked from 1: ap-networking-troubleshooting-loop
- `/pages/ap-csa-teacher-resources` linked from 1: csa-teacher-dashboard
- `/pages/java-errors-arithmeticexception-ap-csa` linked from 1: java-errors-numberformatexception-ap-csa
- `/pages/java-errors-inputmismatchexception-ap-csa` linked from 1: java-errors-numberformatexception-ap-csa
- `/pages/java-errors-arrayindexoutofboundsexception-ap-csa` linked from 1: java-errors-stringindexoutofboundsexception-ap-csa
- `/pages/java-errors-nullpointerexception-ap-csa` linked from 1: java-errors-stringindexoutofboundsexception-ap-csa
- `/pages/ap-csa-unit-4-data-collection-complete-study-guide-2025` linked from 1: what-is-ap-csa


## And in the 50 product descriptions

- `/pages/tutoring-packages` linked from 1: ap-cs-tutoring-single-session
- `/products/ap-csp-full-practice-exam` linked from 1: ap-csp-4-week-cram-kit
- `/products/ap-csp-quick-reference-guide` linked from 1: ap-csp-4-week-cram-kit

