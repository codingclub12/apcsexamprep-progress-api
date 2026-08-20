'use strict';
// Weekly course post: AP CSP. Policy deep dive on the College Board AI policy
// as it applies specifically to the Create performance task. The format-change
// post (2026-08-18-ap-csp-create-task-change.js) already states the core rule
// in one section; this post goes past that summary into the nuance a student
// actually needs at decision time: learn vs. produce, how attribution works
// mechanically, what enforcement looks like, and why the new written-response
// format makes doing the work genuinely a practical necessity, not only an
// integrity one.
const H = require('../../lib/blog-house');

const SRC = {
  guidance: { source: 'College Board, Guidance for Artificial Intelligence Tools and Other Services', url: 'https://apcentral.collegeboard.org/exam-administration-ordering-scores/administering-exams/exam-policies/artificial-intelligence-tools', asOf: 'August 2026' },
  acceptable: { source: 'College Board, What is the acceptable use of AI?', url: 'https://apcentral.collegeboard.org/help-center/what-acceptable-use-ai', asOf: 'August 2026' },
  plagiarism: { source: 'College Board, AP CSP Questions About Plagiarism and AI', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course/frequently-asked-questions/questions-about-plagiarism-and-ai', asOf: 'August 2026' },
  collab: { source: 'College Board, Who can a student collaborate with on the Create performance task?', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course/faq/eligible-collaborators-performance-tasks', asOf: 'August 2026' },
  attest: { source: 'College Board, What must students attest to?', url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course/faq/students-attestation', asOf: 'August 2026' },
};

const SECTIONS = [
  'The rule fits in one sentence. Applying it does not.',
  'Learning from AI versus having AI produce your work',
  'The AP CSP AI policy, in practice: how attribution actually works',
  'What happens if you do not attribute it',
  'Quick decision guide: is this okay?',
  'Why the new exam format makes this a practical problem too',
];

const meta = {
  title: 'AP CSP AI Policy: What College Board Actually Permits on the Create Task',
  handle: 'ap-csp-ai-policy-create-task-nuance',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp ai policy',
  publishOn: '2026-09-07',
  seoTitle: "AP CSP AI Policy: What's Actually Permitted",
  seoDescription: "College Board's actual AP CSP AI policy allows AI for learning and debugging but not for producing your submitted work. Here's the practical nuance.",
  summary: 'The AP CSP AI policy is not just don\'t use AI to cheat. It draws a specific line between using AI to learn and using AI to produce the work you submit, and it requires attribution documented a specific way. This guide walks the nuance with concrete scenarios, explains what attribution actually looks like in the AP Digital Portfolio, and connects the policy to why the new written-response exam format makes doing your own work a practical necessity as well as an integrity one.',
  tags: ['AP CSP', 'AI Policy', 'Create Performance Task', 'Academic Integrity', 'Written Response'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('College Board\'s actual AP CSP AI policy is more specific than "don\'t use AI to cheat," and the gap between what students assume it says and what it actually says is where good students lose points they never needed to lose. Our guide to the exam format change touches the core rule in a few sentences. This one is the whole rule, worked through the situations where it actually gets tested.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 8, 2026', updated: 'September 8, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.p('If you read our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">guide to the Create performance task format change</a>, you already know the headline: the written responses moved out of the take-home submission and into a proctored exam, and College Board has been direct that this was done partly because of generative AI. That post states the core AI rule in a couple of sentences, because it is a post about the format change, not the policy itself. This post is the policy itself, and the policy has more moving parts than a two-sentence summary can hold.'),
  H.p('Most of what goes wrong here is not students deliberately cheating. It is students genuinely unsure where a permitted use ends and a violation begins, guessing, and guessing wrong in a direction that costs them a zero on a performance task worth a meaningful share of their AP score. This guide exists to remove the guessing.'),

  H.h2(SECTIONS[0]),
  H.p('Stated plainly, the AP CSP AI policy says this: you may use generative AI tools as supplementary resources for understanding coding principles, developing code, and debugging, but you may not use AI to write or create the assignment for you, and any generative AI assistance that did shape your submitted work must be properly attributed under College Board\'s plagiarism policy.'),
  H.p(`${H.stat('supplementary resources for understanding coding principles, assisting in code development, and debugging', SRC.acceptable)} is the phrase College Board actually uses, and it is worth reading slowly, because the word doing the real work in that sentence is "supplementary." AI is allowed to sit alongside your own thinking. It is not allowed to replace it. That distinction sounds clean in the abstract and gets blurry fast in an actual homework session at eleven at night, which is exactly why the rest of this guide exists.`),
  H.p('One more detail changes how you should think about this. College Board has said that responsible AI use on the Create task should align with the same guidelines that already govern collaborating with another student on your code.'),
  H.sourceNote(SRC.plagiarism.source, SRC.plagiarism.url, SRC.plagiarism.asOf),
  H.p('That framing matters because AP CSP students already have years of practice knowing what collaboration rules look like: you can talk through a problem with a classmate, but code segments you did not write yourself get cited, not silently absorbed into your submission. Generative AI gets treated the same way. It is not a magic loophole and it is not a unique threat either. It is a collaborator whose contributions have to be documented like any other collaborator\'s would be.'),

  H.h2(SECTIONS[1]),
  H.p('The single most useful mental model for this policy is the difference between asking AI to help you understand something and asking AI to produce something you then submit as your own. Almost every gray area collapses once you sort the specific thing you are about to do into one of those two buckets.'),
  H.h3('Using AI to learn: generally fine'),
  H.ul([
    'Asking AI to explain why a list index starts at a specific number in your pseudocode dialect, or why <code>LENGTH(myList)</code> behaves differently after an <code>APPEND</code> than before it.',
    'Pasting an error message you do not understand and asking what it means in plain language, then going back to your own code to find and fix the actual cause yourself.',
    'Asking AI to explain the difference between procedural and data abstraction using an example that is not your project, so you can then apply the idea to your own code.',
    'Asking AI general questions about what makes a good Create task project idea, as a brainstorming starting point, before you design and build your own specific version of anything.',
    'Asking AI to explain what a specific built-in function does, the way you might look it up in documentation or ask a teacher, without having it write the line of code that calls that function for your project.',
  ]),
  H.h3('Using AI to produce: not fine without attribution, and often not fine at all'),
  H.ul([
    'Asking AI to write the procedure or the list-handling code that ends up in your submitted program, even if you tweak variable names afterward.',
    'Asking AI to write your written response answers, or to draft an explanation of your own code that you then submit close to verbatim, since the written responses are now answered live in a proctored room from memory anyway, this one is close to self-defeating on top of being a policy violation.',
    'Pasting your broken code and asking AI to fix it, then submitting the fixed version without understanding what changed or being able to explain why the fix works.',
    'Asking AI to design your whole project structure and then filling in details around a skeleton you did not conceive.',
    'Using AI-generated code for the two screenshots that make up your Personalized Project Reference, even if the rest of your program is genuinely your own.',
  ]),
  H.box('key', 'The test to run on yourself', '<p>Before you use an AI response, ask: did this change what I understand, or did it change what I typed? If a conversation left you able to explain the concept to someone else without the AI in front of you, that is learning. If a conversation produced text or code that is now sitting in your submission roughly as AI wrote it, that is production, and production requires either a rewrite in your own words and your own code, or an attribution.</p>'),
  H.p('Notice that the line is not about which tool you opened. The exact same AI conversation can land on either side depending on what you do with the output afterward. Asking AI to explain a bug is learning. Copying the fixed code AI gives you directly into your submission is production, even though the prompt you typed might have looked identical either way.'),

  H.h2(SECTIONS[2]),
  H.p('Knowing the rule exists is not the same as knowing what to do about it, and this is the part most guides skip. College Board has actually published a specific, mechanical answer for how a student documents outside help on the Create task, and it applies directly to AI.'),
  H.p(`${H.stat('comments or acknowledgments for any part of the submitted program code that has been written by someone other than you', SRC.collab)} is the standard, and the preferred place to put that acknowledgment is directly in the code as a comment. If your programming environment does not support comments, the guidance allows documenting the same thing in a separate document editor at the point you capture your code for submission. Either way, the attribution has to exist somewhere a reader of your final submission can find it.`),
  H.p('In practice, that means a comment like this next to any AI-assisted segment that actually made it into your program, written honestly rather than vaguely:'),
  H.code('# The error-handling logic in this procedure was suggested by an AI\n# assistant after I described the crash I was seeing. I reviewed it,\n# understand how it works, and rewrote the variable names to match\n# the rest of my program.\nPROCEDURE safeDivide(numerator, denominator)\n{\n  IF (denominator == 0)\n  {\n    RETURN (0)\n  }\n  RETURN (numerator / denominator)\n}'),
  H.p('There is a second, quieter piece of this rule that trips up more students than the comment requirement does: whatever code you use AI to help produce should not become one of your two Personalized Project Reference screenshots. The reference is supposed to show a list segment and a procedure segment that are yours in the fullest sense, because those two screenshots are what you will be asked to explain from memory later. Building your whole program with some AI-assisted sections is not automatically a violation as long as it is attributed, but choosing an AI-assisted segment as one of your two reference screenshots defeats the entire point of the reference and leaves you unable to defend it convincingly on exam day regardless of what the plagiarism policy technically allows.'),
  H.p('Finally, attribution is not only a code comment. Before final submission, the AP Digital Portfolio requires an attestation.'),
  H.sourceNote(SRC.attest.source, SRC.attest.url, SRC.attest.asOf),
  H.p('You attest that the submitted work is your own original work, and that anything developed with a peer or a generative AI tool is properly attributed, and that you have read and understood the plagiarism policy. That attestation is a formal step, not a formality. It is the moment the documentation you did or did not do in your code comments becomes something you are personally signing off on.'),

  H.h2(SECTIONS[3]),
  H.p('This is the part of the policy that deserves to be read carefully, because the consequence is not a warning or a grade deduction. Using code, media, data, or program logic that someone else, including a generative AI tool, created without proper attribution is defined as plagiarism, and the penalty for a plagiarism finding on the Create task is a score of zero. Not a lower score. Zero, and that zero extends to your written response answers on the exam as well, since the two pieces are scored as one performance task.'),
  H.sourceNote(SRC.plagiarism.source, SRC.plagiarism.url, SRC.plagiarism.asOf),
  H.box('warn', 'The mistake that costs the most', '<p>Assuming that because AI use is broadly permitted, any AI use is automatically fine as long as nobody asks about it. The policy does not work on an honor system where silence equals permission. It works on an attribution system where silence on unattributed AI-produced work equals a plagiarism finding if it is later reviewed, and College Board has said outright that it may decline to score, or cancel the score of, a submission where this happens.</p>'),
  H.p('There is also a practical layer underneath the formal penalty. Even a submission that was never flagged, never reviewed, and never technically caught still has to survive the written response exam, which brings us to the part of this that matters even for a student who is confident nobody will ever check.'),

  H.h2(SECTIONS[4]),
  H.p('Use this as a fast reference the next time you are mid-assignment and unsure whether what you are about to do crosses the line.'),
  H.table(
    ['Scenario', 'Verdict', 'Why'],
    [
      ['Ask AI to explain a concept, like why a parameter changes a procedure\'s output', 'Yes', 'This is learning. Nothing you submit came from the AI; only your understanding did.'],
      ['Ask AI to help debug one specific error message in your own code', 'Depends', 'Fine if you use the explanation to find and fix the bug yourself. Not fine if you paste AI\'s fixed code straight into your submission without attributing it.'],
      ['Ask AI to write a whole procedure for your project', 'No, unless attributed', 'This is production, not learning. It must be documented with a comment in your code if it appears in your submission, and it must never be one of your two Personalized Project Reference screenshots.'],
      ['Ask AI to suggest general project ideas before you design your own specific version', 'Yes', 'Brainstorming a starting point is not the same as having AI design or build your actual project. The design and the code still have to be yours.'],
    ]
  ),
  H.p('When a situation genuinely does not fit neatly into this table, use the test from earlier: did the AI change what you understand, or what you typed. If you cannot answer that question about a specific piece of your own code, that is itself a sign the code should not be one of your two reference screenshots, attribution or not.'),

  H.h2(SECTIONS[5]),
  H.p('Here is the reason this policy is worth taking seriously even if you think the odds of a plagiarism review are low. The written responses are no longer written at home over weeks with your code open in another window. They are answered in a proctored room, from memory, using only your printed Personalized Project Reference. Our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">guide to that format change</a> covers the mechanics in full, but the short version is enough to make the point here: you will be asked specific questions about a specific procedure and a specific list in your own program, and you will have nothing in front of you except two screenshots you chose months earlier.'),
  H.p('Code you did not really write is much harder to explain convincingly under those conditions than code you built yourself, line by line, understanding every decision as you made it. This is true independent of the plagiarism rule. Even in a world with no attribution requirement at all, an AI-produced procedure is a bad choice for your Personalized Project Reference, because the exam is going to ask you why it works the way it does, what happens at its edge cases, and why you chose to structure it that way, and those are questions that are trivial to answer about code you actually wrote and genuinely difficult to answer convincingly about code you copied and adapted.'),
  H.box('key', 'The practical argument, separate from the ethical one', '<p>Even if AI-assisted code somehow passed unnoticed through submission, it still has to survive a proctored conversation about itself seven months later, with no code in front of you and no way to look anything up. That is the strongest reason to do the Create task genuinely, and it applies whether or not you ever get asked about attribution at all.</p>'),
  H.p('Put the two halves of this together and the policy stops looking like an arbitrary rule and starts looking like it is protecting you from a specific, predictable failure mode: a student who outsourced part of their project in September discovering in the exam room that they cannot explain, in their own words, code they never really owned.'),

  H.h2('Practice: two questions unrelated to the AI policy'),
  H.p('The AI policy governs how you build your project. These two questions are about the kind of content that actually gets tested once your project exists, unrelated to anything above. Draft an answer before checking each one.'),
  H.mcq({
    n: 1,
    stem: 'A student writes an algorithm to check whether the values in a list are arranged in increasing order. It uses a boolean variable <code>isSorted</code>, which starts as <code>true</code>, and compares each element to the one before it, setting <code>isSorted</code> to <code>false</code> the moment it finds a pair where the later value is smaller than the earlier one. Trace this algorithm for the list <code>[4, 9, 15, 12, 20, 33]</code>. What is the value of <code>isSorted</code> once the algorithm finishes checking the whole list?',
    options: [
      'true, because most of the list is in increasing order',
      'false, because the pair 15 and 12 breaks the increasing order condition',
      'true, because the list ends on 33, the largest value in the list',
      'false, because the list has more than five elements',
    ],
    correct: 1,
    why: 'The algorithm has to examine every consecutive pair, not stop at the first one it likes. Walking through the list: 4 to 9 is increasing, 9 to 15 is increasing, but 15 to 12 is a decrease, so isSorted becomes false at that point. Nothing later in the algorithm sets it back to true, so it stays false through the rest of the trace, including the later increasing pairs 12 to 20 and 20 to 33. Option A and C both describe the list in general terms rather than tracing the specific boolean logic, and option D describes a condition the algorithm never actually checks.',
  }),
  H.mcq({
    n: 2,
    stem: 'Trace the procedure below for the list <code>[3, 7, 3, 8, 3, 5]</code> called as <code>countMatches(scores, 3)</code>. What value does it return?',
    codeText: 'PROCEDURE countMatches(numbers, target)\n{\n  matchCount <- 0\n  FOR EACH num IN numbers\n  {\n    IF (num == target)\n    {\n      matchCount <- matchCount + 1\n    }\n  }\n  RETURN (matchCount)\n}',
    options: [
      '1, because the procedure stops after the first match it finds',
      '3, because that is the value being searched for',
      '6, because the procedure returns the length of the entire list',
      'The procedure returns 3, counting each of the three times the value 3 appears in the list',
    ],
    correct: 3,
    why: 'The loop examines every element in the list exactly once and increments matchCount only when an element equals the target value, 3. The value 3 appears at index one, three, and five, so matchCount ends at three and that is what gets returned. Option A confuses this procedure with one that exits early on the first match, which this one does not do since it has no early return inside the loop. Option B confuses the target value itself with the count of how many times it appears. Option C describes the length of the list, not the count of matching elements, which is a different quantity entirely.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Can I use AI to help brainstorm my AP CSP Create task project idea?', a: 'Yes. Using AI as a starting point for general project ideas is treated as a supplementary learning use. The design and the actual code of your specific project still need to be yours, and generic brainstorming is a long way from having AI design or build the project for you.' },
    { q: 'Do I need to attribute AI help even if I only used it to fix one bug?', a: 'It depends on what you did with the fix. If you used the explanation to find and fix the bug yourself in your own words, no attribution is needed because nothing AI wrote ended up in your submission. If you pasted AI\'s corrected code directly into your program, that segment needs a comment attributing it, the same as any other outside code would.' },
    { q: 'What happens if I forget to attribute AI assistance that was otherwise permitted?', a: 'Unattributed use of code, data, or content created by someone else, including a generative AI tool, is defined as plagiarism under the AP CSP policy, and a plagiarism finding results in a score of zero on the Create performance task, including the written responses on the exam. Attribution is not optional paperwork; it is the mechanism that keeps a permitted use from becoming a violation.' },
    { q: 'Can AI-assisted code be one of my two Personalized Project Reference screenshots?', a: 'It should not be, even if it is properly attributed. The reference is meant to capture code you can explain from memory in a proctored room seven months later, and code you did not fully originate is a much harder thing to defend under those conditions, independent of whether the attribution itself satisfies the plagiarism policy.' },
    { q: 'Is asking AI to explain an error message the same as asking it to fix my code?', a: 'No, and the difference matters. Asking AI what an error message means and why it might be happening is learning, the same as asking a teacher or searching documentation. Asking AI to produce the corrected code and submitting that code without attribution or rewriting is production, and it falls under the same rule as any other unattributed outside code.' },
  ]),

  H.cta({
    heading: 'Build a project you can actually explain',
    body: 'Our guide to the format change covers what the proctored written responses now ask for, and the full CSP resource hub has everything else for the course.',
    links: [
      { href: '/blogs/ap-csp/ap-csp-create-performance-task-what-changed', text: 'Create task format change guide' },
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects College Board\'s published guidance on artificial intelligence tools and the AP CSP plagiarism policy for the current exam cycle. Last reviewed August 2026.'),
]);

module.exports = { meta, body };
