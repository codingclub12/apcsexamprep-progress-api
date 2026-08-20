'use strict';
// Topic 3.18, Undecidable Problems (AAP-4.B).
//
// You cannot run an undecidable problem, so these exercises do not try. They
// make the BOUNDARY runnable instead, which is the part a student can actually
// get wrong on the exam:
//
//   1. a bounded question is decidable, and here is the code that decides it
//   2. the SAME program and input with a smaller budget gives a different
//      answer, so the budget decided, not the truth
//   3. "no counterexample found" is not "no counterexample exists"
//   4. write the bounded decider yourself
//
// The undecidable case is named in the prompts and the closing note, never
// simulated, because simulating it would teach the opposite of the lesson.
//
// `solution` is never rendered; the build runs it to derive `expected`.

module.exports = {
  topic: '3.18',
  slug: 'undecidable-problems',
  title: 'Undecidable Problems',
  heading: 'Undecidable Problems - Find the Boundary Yourself',
  sub: 'No program can tell you whether every program halts. Plenty of programs can tell you whether one halts within a budget you set. That gap is the whole topic.',
  flow: 'You sorted problems into answerable and not in Halt or Not. Now write the code that sits on the line. Nothing here simulates an undecidable problem, because nothing can. What you can run is the bounded version, and running it shows you exactly what a bound buys and what it costs: an answer every time, about a question slightly smaller than the one you asked.',
  problems: [
    {
      prompt: 'The hailstone sequence: if a number is even, halve it; if it is odd, triple it and add one. Starting at <code>27</code>, run the sequence until it reaches <code>1</code>, giving up after <code>200</code> steps. Print <code>halted after N steps</code> with the real step count.',
      pseudo: [
        'x <- 27',
        'steps <- 0',
        'REPEAT UNTIL(x = 1 OR steps >= 200)',
        '{',
        '  IF(x MOD 2 = 0)',
        '  {',
        '    x <- x / 2',
        '  }',
        '  ELSE',
        '  {',
        '    x <- 3 * x + 1',
        '  }',
        '  steps <- steps + 1',
        '}',
        'DISPLAY("halted after " + steps + " steps")',
      ],
      hint: 'Count one step per change to x, and stop the moment x reaches 1. Note that the sequence climbs well above 27 before it comes down. Nobody has ever proved this sequence reaches 1 for every starting number, so the step cap is not decoration.',
      starter: {
        python: 'x = 27\nsteps = 0\n# while x is not 1 and steps < 200:\n#   even -> halve it, odd -> 3x + 1\n#   count the step\n# print "halted after N steps"\n',
        javascript: 'let x = 27;\nlet steps = 0;\n// while x is not 1 and steps < 200:\n//   even -> halve it, odd -> 3x + 1\n//   count the step\n// print "halted after N steps"\n',
      },
      solution: {
        python: 'x = 27\nsteps = 0\nwhile x != 1 and steps < 200:\n    if x % 2 == 0:\n        x = x // 2\n    else:\n        x = 3 * x + 1\n    steps += 1\nprint("halted after " + str(steps) + " steps")\n',
        javascript: 'let x = 27;\nlet steps = 0;\nwhile (x !== 1 && steps < 200) {\n  if (x % 2 === 0) {\n    x = x / 2;\n  } else {\n    x = 3 * x + 1;\n  }\n  steps++;\n}\nconsole.log("halted after " + steps + " steps");\n',
      },
    },
    {
      prompt: 'Exactly the same sequence from exactly the same number, but now you are only willing to wait <code>50</code> steps. If it reaches <code>1</code> print <code>halted after N steps</code>; if it does not, print <code>no answer within 50 steps</code>. Predict which one you will get before you run it.',
      pseudo: [
        'x <- 27',
        'steps <- 0',
        'REPEAT UNTIL(x = 1 OR steps >= 50)',
        '{',
        '  IF(x MOD 2 = 0)',
        '  {',
        '    x <- x / 2',
        '  }',
        '  ELSE',
        '  {',
        '    x <- 3 * x + 1',
        '  }',
        '  steps <- steps + 1',
        '}',
        'IF(x = 1)',
        '{',
        '  DISPLAY("halted after " + steps + " steps")',
        '}',
        'ELSE',
        '{',
        '  DISPLAY("no answer within 50 steps")',
        '}',
      ],
      hint: 'Same program, same input, smaller budget, different answer. That is the point. The sequence from 27 does eventually reach 1, so "no answer within 50 steps" is not a claim that it never halts. It is a statement about your patience, not about the program.',
      starter: {
        python: 'x = 27\nsteps = 0\n# Same loop as before, but the cap is 50.\n# Afterwards, check WHY the loop ended:\n#   x reached 1  -> "halted after N steps"\n#   ran out      -> "no answer within 50 steps"\n',
        javascript: 'let x = 27;\nlet steps = 0;\n// Same loop as before, but the cap is 50.\n// Afterwards, check WHY the loop ended:\n//   x reached 1  -> "halted after N steps"\n//   ran out      -> "no answer within 50 steps"\n',
      },
      solution: {
        python: 'x = 27\nsteps = 0\nwhile x != 1 and steps < 50:\n    if x % 2 == 0:\n        x = x // 2\n    else:\n        x = 3 * x + 1\n    steps += 1\nif x == 1:\n    print("halted after " + str(steps) + " steps")\nelse:\n    print("no answer within 50 steps")\n',
        javascript: 'let x = 27;\nlet steps = 0;\nwhile (x !== 1 && steps < 50) {\n  if (x % 2 === 0) {\n    x = x / 2;\n  } else {\n    x = 3 * x + 1;\n  }\n  steps++;\n}\nif (x === 1) {\n  console.log("halted after " + steps + " steps");\n} else {\n  console.log("no answer within 50 steps");\n}\n',
      },
    },
    {
      prompt: 'Search for something that might not be there. Every even number above <code>2</code> is believed to be the sum of two primes, but nobody has proved it. Check every even number from <code>4</code> to <code>1000</code>. If you find one that is not the sum of two primes, print it; if you check them all and find none, print <code>no counterexample found up to 1000</code>.',
      pseudo: [
        'FOR EACH n IN [4, 6, 8, ..., 1000]',
        '{',
        '  found <- false',
        '  FOR EACH a IN [2..n]',
        '  {',
        '    IF(isPrime(a) AND isPrime(n - a))',
        '    {',
        '      found <- true',
        '    }',
        '  }',
        '  IF(NOT found)',
        '  {',
        '    DISPLAY(n)',
        '  }',
        '}',
        'DISPLAY("no counterexample found up to 1000")',
      ],
      hint: 'You will need a small prime test: a number is prime if nothing from 2 up to its square root divides it. The result is the lesson. Checking a thousand numbers and finding nothing is evidence, not proof, and no matter how high you raise the limit it never becomes proof.',
      starter: {
        python: 'def is_prime(k):\n    if k < 2:\n        return False\n    d = 2\n    while d * d <= k:\n        if k % d == 0:\n            return False\n        d += 1\n    return True\n\n# For each even n from 4 to 1000, look for primes a and n - a.\n# Print any n that has none, then print the closing message.\n',
        javascript: 'function isPrime(k) {\n  if (k < 2) {\n    return false;\n  }\n  for (let d = 2; d * d <= k; d++) {\n    if (k % d === 0) {\n      return false;\n    }\n  }\n  return true;\n}\n\n// For each even n from 4 to 1000, look for primes a and n - a.\n// Print any n that has none, then print the closing message.\n',
      },
      solution: {
        python: 'def is_prime(k):\n    if k < 2:\n        return False\n    d = 2\n    while d * d <= k:\n        if k % d == 0:\n            return False\n        d += 1\n    return True\n\nn = 4\nwhile n <= 1000:\n    found = False\n    a = 2\n    while a <= n // 2:\n        if is_prime(a) and is_prime(n - a):\n            found = True\n            break\n        a += 1\n    if not found:\n        print(n)\n    n += 2\nprint("no counterexample found up to 1000")\n',
        javascript: 'function isPrime(k) {\n  if (k < 2) {\n    return false;\n  }\n  for (let d = 2; d * d <= k; d++) {\n    if (k % d === 0) {\n      return false;\n    }\n  }\n  return true;\n}\n\nfor (let n = 4; n <= 1000; n += 2) {\n  let found = false;\n  for (let a = 2; a <= n / 2; a++) {\n    if (isPrime(a) && isPrime(n - a)) {\n      found = true;\n      break;\n    }\n  }\n  if (!found) {\n  console.log(n);\n}\n}\nconsole.log("no counterexample found up to 1000");\n',
      },
    },
    {
      prompt: 'Write from scratch. Build a bounded halting decider. The program under test starts at <code>x = 1</code> and doubles until <code>x</code> is greater than <code>500</code>. Decide whether it stops within <code>100</code> steps, and print either <code>yes, it halts in N steps</code> or <code>no, still running after 100 steps</code>.',
      pseudo: [
        'x <- 1',
        'steps <- 0',
        'REPEAT UNTIL(x > 500 OR steps >= 100)',
        '{',
        '  x <- x * 2',
        '  steps <- steps + 1',
        '}',
        'IF(x > 500)',
        '{',
        '  DISPLAY("yes, it halts in " + steps + " steps")',
        '}',
        'ELSE',
        '{',
        '  DISPLAY("no, still running after 100 steps")',
        '}',
      ],
      hint: 'This decider always answers, on any program you hand it, because it can only ever run 100 steps before giving up. That is what makes the bounded question decidable. Drop the bound and ask "does it halt at all" and no such decider can exist, for any language, ever. Not undiscovered, proved impossible.',
      starter: {
        python: 'x = 1\nsteps = 0\n# Run the doubling loop, but never more than 100 steps.\n# Then report WHY it stopped:\n#   x > 500     -> "yes, it halts in N steps"\n#   out of steps -> "no, still running after 100 steps"\n',
        javascript: 'let x = 1;\nlet steps = 0;\n// Run the doubling loop, but never more than 100 steps.\n// Then report WHY it stopped:\n//   x > 500      -> "yes, it halts in N steps"\n//   out of steps -> "no, still running after 100 steps"\n',
      },
      solution: {
        python: 'x = 1\nsteps = 0\nwhile x <= 500 and steps < 100:\n    x = x * 2\n    steps += 1\nif x > 500:\n    print("yes, it halts in " + str(steps) + " steps")\nelse:\n    print("no, still running after 100 steps")\n',
        javascript: 'let x = 1;\nlet steps = 0;\nwhile (x <= 500 && steps < 100) {\n  x = x * 2;\n  steps++;\n}\nif (x > 500) {\n  console.log("yes, it halts in " + steps + " steps");\n} else {\n  console.log("no, still running after 100 steps");\n}\n',
      },
    },
  ],
};
