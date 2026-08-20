'use strict';
// Topic 3.17, Algorithmic Efficiency (AAP-4.A).
//
// The through-line is counting. A student who can count the operations an
// algorithm performs can compare two algorithms without any formal notation,
// which is exactly what the CED asks for, and it makes "reasonable time" a
// measurement rather than a vibe.
//
// `solution` is NEVER rendered onto the page. It exists so the build can run it
// and derive `expected` instead of trusting a number typed by hand.

module.exports = {
  topic: '3.17',
  slug: 'algorithmic-efficiency',
  title: 'Algorithmic Efficiency',
  heading: 'Algorithmic Efficiency - Count It Yourself',
  sub: 'Count the operations an algorithm actually performs, then watch what happens to that count as the input grows.',
  flow: 'You compared growth by eye in Big-O Race. Now count the operations for real. Every problem here is the same question asked louder: how many steps, and what happens to that number when the input gets bigger? Predict the count before you run, then let the computer settle it. The last one is the difference between an algorithm you can ship and one nobody will ever wait for.',
  problems: [
    {
      prompt: 'A linear search checks list items one at a time from the front until it finds the target. The list is <code>4, 8, 15, 16, 23, 42, 7, 9</code> and the target is <code>9</code>, which sits at the very end. Count how many items the search has to look at, and print that count.',
      pseudo: [
        'data <- [4, 8, 15, 16, 23, 42, 7, 9]',
        'target <- 9',
        'count <- 0',
        'FOR EACH item IN data',
        '{',
        '  count <- count + 1',
        '  IF(item = target)',
        '  {',
        '    DISPLAY(count)',
        '  }',
        '}',
      ],
      hint: 'The target is the last item, which is the worst case for a linear search: it has to look at every single element before it finds one. That is why linear search is described as taking n steps on a list of n items.',
      starter: {
        python: 'data = [4, 8, 15, 16, 23, 42, 7, 9]\ntarget = 9\ncount = 0\n# Walk the list, counting each item you look at.\n# Stop and print the count when you find the target.\n',
        javascript: 'let data = [4, 8, 15, 16, 23, 42, 7, 9];\nlet target = 9;\nlet count = 0;\n// Walk the list, counting each item you look at.\n// Stop and print the count when you find the target.\n',
      },
      solution: {
        python: 'data = [4, 8, 15, 16, 23, 42, 7, 9]\ntarget = 9\ncount = 0\nfor item in data:\n    count += 1\n    if item == target:\n        print(count)\n        break\n',
        javascript: 'let data = [4, 8, 15, 16, 23, 42, 7, 9];\nlet target = 9;\nlet count = 0;\nfor (const item of data) {\n  count++;\n  if (item === target) {\n    console.log(count);\n    break;\n  }\n}\n',
      },
    },
    {
      prompt: 'Now a nested loop. For a list of <code>6</code> items, an algorithm compares every item against every item, including itself. Count how many comparisons that is in total, and print the count.',
      pseudo: [
        'n <- 6',
        'count <- 0',
        'FOR EACH i IN [1..n]',
        '{',
        '  FOR EACH j IN [1..n]',
        '  {',
        '    count <- count + 1',
        '  }',
        '}',
        'DISPLAY(count)',
      ],
      hint: 'The inner loop runs a full 6 times for each single pass of the outer loop, so the counts multiply rather than add. Six outer passes times six inner passes is the answer, and that multiplying is what makes nested loops quadratic.',
      starter: {
        python: 'n = 6\ncount = 0\n# One loop inside another.\n# Count once for every (i, j) pair.\n',
        javascript: 'let n = 6;\nlet count = 0;\n// One loop inside another.\n// Count once for every (i, j) pair.\n',
      },
      solution: {
        python: 'n = 6\ncount = 0\nfor i in range(n):\n    for j in range(n):\n        count += 1\nprint(count)\n',
        javascript: 'let n = 6;\nlet count = 0;\nfor (let i = 0; i < n; i++) {\n  for (let j = 0; j < n; j++) {\n    count++;\n  }\n}\nconsole.log(count);\n',
      },
    },
    {
      prompt: 'Compare the two directly. For <code>n = 10</code> and then <code>n = 100</code>, print the number of steps a single loop takes and the number a nested loop takes. Print one line per size, in exactly this format: <code>n=10 linear=10 quadratic=100</code>',
      pseudo: [
        'FOR EACH n IN [10, 100]',
        '{',
        '  linear <- n',
        '  quadratic <- n * n',
        '  DISPLAY("n=" + n + " linear=" + linear + " quadratic=" + quadratic)',
        '}',
      ],
      hint: 'You do not need to actually run the loops to count their steps: a single loop over n items takes n steps and a nested pair takes n times n. Look at what happens between the two lines. The input got ten times bigger and the linear count did too, but the quadratic count got a hundred times bigger.',
      starter: {
        python: 'for n in [10, 100]:\n    # linear steps = n\n    # quadratic steps = n * n\n    # print the line in the exact format shown\n    pass\n',
        javascript: 'for (const n of [10, 100]) {\n  // linear steps = n\n  // quadratic steps = n * n\n  // print the line in the exact format shown\n}\n',
      },
      solution: {
        python: 'for n in [10, 100]:\n    print("n=" + str(n) + " linear=" + str(n) + " quadratic=" + str(n * n))\n',
        javascript: 'for (const n of [10, 100]) {\n  console.log("n=" + n + " linear=" + n + " quadratic=" + (n * n));\n}\n',
      },
    },
    {
      prompt: 'Write from scratch. Some algorithms have to try every possible subset of their input, which takes <code>2</code> to the power of <code>n</code> steps. For <code>n = 20</code>, print the step count for a quadratic algorithm and for a subset algorithm, then print which of the two is unreasonable. Use exactly this format:<br><code>quadratic 400</code><br><code>subsets 1048576</code><br><code>subsets is unreasonable</code>',
      pseudo: [
        'n <- 20',
        'quadratic <- n * n',
        'subsets <- 2 ^ n',
        'DISPLAY("quadratic " + quadratic)',
        'DISPLAY("subsets " + subsets)',
        'DISPLAY("subsets is unreasonable")',
      ],
      hint: 'In Python 2 to the power of n is 2 ** n; in JavaScript it is 2 ** n as well. The gap is the whole point: at n = 20 the quadratic algorithm does 400 steps and the subset one does over a million. Push n to 60 and the subset algorithm outlasts a human lifetime, which is what "unreasonable time" means.',
      starter: {
        python: 'n = 20\n# quadratic steps = n * n\n# subset steps = 2 ** n\n# print all three lines in the exact format shown\n',
        javascript: 'let n = 20;\n// quadratic steps = n * n\n// subset steps = 2 ** n\n// print all three lines in the exact format shown\n',
      },
      solution: {
        python: 'n = 20\nprint("quadratic " + str(n * n))\nprint("subsets " + str(2 ** n))\nprint("subsets is unreasonable")\n',
        javascript: 'let n = 20;\nconsole.log("quadratic " + (n * n));\nconsole.log("subsets " + (2 ** n));\nconsole.log("subsets is unreasonable");\n',
      },
    },
  ],
};
