'use strict';
// -----------------------------------------------------------------------------
//  The Create Task bridge: four problems that ramp by REQUIREMENT COUNT.
//
//  ── WHY THIS PAGE EXISTS ────────────────────────────────────────────────────
//  Big Idea 3 already carries 72 coding problems, four on each of the eighteen
//  topic pages. Every one of them is a single-construct exercise with hardcoded
//  values and a fixed expected output, which is correct practice for the topic
//  it belongs to and no practice at all for the thing the Create Task actually
//  asks: one program carrying six requirements at once.
//
//  Two gaps fall out of that, and one is measurable. The topic-page runner posts
//  to the Judge0 proxy with no stdin field at all (lib/csp-code-pages.js), so no
//  problem on any of the eighteen pages can involve input. Requirement 1 of the
//  6 scored program requirements has zero practice anywhere in the course. The
//  second gap is combination: nothing asks for a procedure that takes a list and
//  loops inside it, which is the scored shape itself.
//
//  ── WHY ONE SCENARIO ACROSS ALL FOUR ────────────────────────────────────────
//  The same step log runs through problems 1 to 3, and the requirements accrete
//  onto it: 2 of 6, then 4 of 6, then 6 of 6. The student is never asked to
//  learn a new domain at the same moment they are asked to add a requirement, so
//  the only thing that changes between problems is the thing being taught.
//
//  Problem 4 drops the scenario and the expected output. It is the student's own
//  idea, checked by requirement detection rather than by string match, which is
//  the handoff into /pages/ap-csp-course-create-task.
//
//  ── BOUNDARY VALUES ARE DELIBERATE ──────────────────────────────────────────
//  The goal 8000 appears in the list as an exact 8000. "Over goal" is strictly
//  greater, so that day does not count, and a student who writes >= gets 4
//  instead of 3 and has to work out why. That is the single most common silent
//  error in a Create Task algorithm and it is cheaper to meet here.
//
//  `solution` is never rendered. The build runs it, in both languages, with the
//  problem's stdin, and the agreed stdout becomes `expected`. Nothing on this
//  page is an expected value somebody typed.
// -----------------------------------------------------------------------------

// The four scored program requirements this page names, in College Board order.
// The renderer draws these as chips and the problem-4 checker detects them.
// Problem 4 targets all six; the earlier three target a growing subset.
const REQS = ['input', 'list', 'procedure', 'algorithm', 'call', 'output'];

// Every JavaScript starter opens with these four lines. Node has no prompt(),
// so reading stdin is boilerplate, and the boilerplate is shown rather than
// injected: the code a student runs is the code a student sees. readFileSync(0
// is also exactly what the Create Task Builder's own JavaScript input detector
// matches, so a habit formed here still reads as "input" over there.
const JS_INPUT_PRELUDE = [
  "// Read the input the page sends. Node has no prompt(), so this is the way.",
  "const LINES = require('fs').readFileSync(0, 'utf8').split('\\n');",
  "let _i = 0;",
  "function INPUT() {",
  "  return LINES[_i++].trim();",
  "}",
  "",
].join('\n');

const STEPS_PY = 'steps = [6200, 9100, 7450, 12030, 8000, 5300, 10400]';
const STEPS_JS = 'const steps = [6200, 9100, 7450, 12030, 8000, 5300, 10400];';

module.exports = {
  slug: 'create-task-bridge',
  handle: 'ap-csp-create-task-practice',
  title: 'Create Task Practice',
  heading: 'Create Task Practice - Six Requirements, One Program',
  sub: 'You have written 72 pieces of a program. The Create Task wants one program that holds six things at once. These four problems add them one at a time.',
  flow: 'Every coding page in Big Idea 3 gave you one idea with a known answer. None of them gave you input, and none of them asked for a procedure that loops over a list. Those are two of the six things the Create Task scores. Problems 1 to 3 build the same step log up from two requirements to all six. Problem 4 is your own program, on your own topic, checked the way the Create Task Builder checks it.',
  reqs: REQS,
  builderUrl: '/pages/ap-csp-course-create-task',
  problems: [
    {
      // 2 of 6. Input and output alone, so the only new idea is that a program
      // can be told something it did not already know.
      targets: ['input', 'output'],
      prompt: 'Your program is being sent two lines: a name, then a step goal. Read both, then print exactly <code>Ada is aiming for 8000 steps a day.</code> Do not type the name or the number into your code. Read them, or this problem has taught you nothing.',
      stdin: 'Ada\n8000\n',
      pseudo: [
        'name <- INPUT()',
        'goal <- INPUT()',
        'DISPLAY(name + " is aiming for " + goal + " steps a day.")',
      ],
      hint: 'In Python, <code>input()</code> returns one line as a string, already without its newline. In JavaScript the four starter lines do the same job: call <code>INPUT()</code> once per line. Both give you a string, so you can join them straight onto the sentence without converting anything.',
      starter: {
        python: '# Read the name, then the goal, then print the sentence.\n# name = input()\n\n',
        javascript: JS_INPUT_PRELUDE + '// Read the name, then the goal, then print the sentence.\n// const name = INPUT();\n\n',
      },
      solution: {
        python: 'name = input()\ngoal = input()\nprint(name + " is aiming for " + goal + " steps a day.")\n',
        javascript: JS_INPUT_PRELUDE + 'const name = INPUT();\nconst goal = INPUT();\nconsole.log(name + " is aiming for " + goal + " steps a day.");\n',
      },
    },
    {
      // 4 of 6. The list and the algorithm arrive together, because an algorithm
      // with iteration in it needs something to iterate over.
      targets: ['input', 'list', 'algorithm', 'output'],
      prompt: 'A week of step counts is already in your starter code. Your program is being sent one line: the goal. Read it, then go through the list and work out two things, how many days went <b>over</b> the goal and which day was the highest. Print exactly two lines: <code>Days over goal: N</code> then <code>Best day: N</code>. Read the goal as a number, not a string.',
      stdin: '8000\n',
      pseudo: [
        'goal <- INPUT()',
        'steps <- [6200, 9100, 7450, 12030, 8000, 5300, 10400]',
        'over <- 0',
        'best <- 0',
        'FOR EACH day IN steps',
        '{',
        '  IF(day > goal)',
        '  {',
        '    over <- over + 1',
        '  }',
        '  IF(day > best)',
        '  {',
        '    best <- day',
        '  }',
        '}',
        'DISPLAY("Days over goal: " + over)',
        'DISPLAY("Best day: " + best)',
      ],
      hint: 'Input arrives as text, so <code>"8000"</code> compares as a string until you convert it. Use <code>int(...)</code> in Python or <code>Number(...)</code> in JavaScript. Then watch the boundary: one day in the list is exactly 8000, and 8000 is not over 8000. If you get 4 instead of 3, you wrote <code>&gt;=</code> where the prompt said over.',
      starter: {
        python: STEPS_PY + '\n\n# goal = int(input())\n# count the days over the goal, and find the highest day\n\n',
        javascript: JS_INPUT_PRELUDE + STEPS_JS + '\n\n// const goal = Number(INPUT());\n// count the days over the goal, and find the highest day\n\n',
      },
      solution: {
        python: STEPS_PY + '\ngoal = int(input())\nover = 0\nbest = 0\nfor day in steps:\n    if day > goal:\n        over = over + 1\n    if day > best:\n        best = day\nprint("Days over goal: " + str(over))\nprint("Best day: " + str(best))\n',
        javascript: JS_INPUT_PRELUDE + STEPS_JS + '\nconst goal = Number(INPUT());\nlet over = 0;\nlet best = 0;\nfor (let d = 0; d < steps.length; d++) {\n  if (steps[d] > goal) {\n    over = over + 1;\n  }\n  if (steps[d] > best) {\n    best = steps[d];\n  }\n}\nconsole.log("Days over goal: " + over);\nconsole.log("Best day: " + best);\n',
      },
    },
    {
      // 6 of 6. This is the scored shape, exactly: a student-developed procedure
      // with parameters, containing sequencing, selection and iteration, called
      // more than once. Calling it twice is not decoration. A procedure called
      // once can be a block of code with a name on it; a procedure called twice
      // with different arguments is the reason parameters exist.
      targets: ['input', 'list', 'procedure', 'algorithm', 'call', 'output'],
      prompt: 'Same list, same week. Now write a procedure <code>daysOverGoal(dayList, goal)</code> that takes the list and a goal as parameters, loops through the list, counts the days over that goal, and <b>returns</b> the count. Read one goal from input, then call your procedure twice: once with the goal you were sent, once with <code>10000</code>. Print <code>Days over 8000: N</code> then <code>Days over 10000: N</code>, using the goal you read rather than a typed 8000.',
      stdin: '8000\n',
      pseudo: [
        'PROCEDURE daysOverGoal(dayList, goal)',
        '{',
        '  over <- 0',
        '  FOR EACH day IN dayList',
        '  {',
        '    IF(day > goal)',
        '    {',
        '      over <- over + 1',
        '    }',
        '  }',
        '  RETURN(over)',
        '}',
        'goal <- INPUT()',
        'steps <- [6200, 9100, 7450, 12030, 8000, 5300, 10400]',
        'DISPLAY("Days over " + goal + ": " + daysOverGoal(steps, goal))',
        'DISPLAY("Days over 10000: " + daysOverGoal(steps, 10000))',
      ],
      hint: 'The loop and the <code>if</code> both move <b>inside</b> the procedure. That is the whole point: the scored requirement is an algorithm with selection and iteration living inside a procedure you wrote, not next to it. The procedure returns a number and prints nothing, so both printed lines happen outside it. If your two lines show the same count, you probably ignored the <code>goal</code> parameter and used the input variable inside the procedure instead.',
      starter: {
        python: STEPS_PY + '\n\n# def daysOverGoal(dayList, goal):\n#     loop, count, return the count\n\n# goal = int(input())\n# call it twice and print both lines\n\n',
        javascript: JS_INPUT_PRELUDE + STEPS_JS + '\n\n// function daysOverGoal(dayList, goal) {\n//   loop, count, return the count\n// }\n\n// const goal = Number(INPUT());\n// call it twice and print both lines\n\n',
      },
      solution: {
        python: 'def daysOverGoal(dayList, goal):\n    over = 0\n    for day in dayList:\n        if day > goal:\n            over = over + 1\n    return over\n\n' + STEPS_PY + '\ngoal = int(input())\nprint("Days over " + str(goal) + ": " + str(daysOverGoal(steps, goal)))\nprint("Days over 10000: " + str(daysOverGoal(steps, 10000)))\n',
        javascript: JS_INPUT_PRELUDE + 'function daysOverGoal(dayList, goal) {\n  let over = 0;\n  for (let d = 0; d < dayList.length; d++) {\n    if (dayList[d] > goal) {\n      over = over + 1;\n    }\n  }\n  return over;\n}\n\n' + STEPS_JS + '\nconst goal = Number(INPUT());\nconsole.log("Days over " + goal + ": " + daysOverGoal(steps, goal));\nconsole.log("Days over 10000: " + daysOverGoal(steps, 10000));\n',
      },
    },
    {
      // No expected output, on purpose. There is no correct answer to "write your
      // own program", so this problem is checked by requirement detection rather
      // than by string match. The detection is the same logic the Create Task
      // Builder runs, so a program that satisfies this box satisfies that one.
      targets: REQS,
      check: 'six',
      prompt: 'Now your own program, on your own topic, and nothing here is checked against a right answer because there is not one. Write something small that does all six: takes <b>input</b>, stores something in a <b>list</b>, has a <b>procedure with a parameter</b> that contains both an <code>if</code> and a loop, <b>calls</b> that procedure, and prints <b>output</b>. Edit the input box below to whatever your program should be sent. When you run it you get your real output plus a reading on all six requirements.',
      stdin: '5\n',
      editableStdin: true,
      pseudo: [
        'PROCEDURE yourProcedure(aList, aValue)',
        '{',
        '  FOR EACH item IN aList',
        '  {',
        '    IF(some test)',
        '    {',
        '      do something',
        '    }',
        '  }',
        '  RETURN(result)',
        '}',
        'thing <- INPUT()',
        'aList <- [ your data ]',
        'DISPLAY(yourProcedure(aList, thing))',
      ],
      hint: 'Small is correct here. A list of five things, a procedure that counts or filters them, one line of output. The Create Task is scored on whether the six elements are present and whether you can explain them, not on how ambitious the program is. If a requirement stays unlit, the usual causes are a procedure with no parameter, a procedure you defined but never called, or a loop that is next to the procedure rather than inside it.',
      starter: {
        python: '# Your program. All six requirements, your own topic.\n# 1 input   2 list   3 procedure with a parameter\n# 4 algorithm (if + loop inside it)   5 call it   6 output\n\n',
        javascript: JS_INPUT_PRELUDE + '// Your program. All six requirements, your own topic.\n// 1 input   2 list   3 procedure with a parameter\n// 4 algorithm (if + loop inside it)   5 call it   6 output\n\n',
      },
      // Runnable and requirement-complete, so the verifier can prove the checker
      // lights all six on a real program rather than on a fixture.
      solution: {
        python: 'def aboveCutoff(scores, cutoff):\n    n = 0\n    for s in scores:\n        if s > cutoff:\n            n = n + 1\n    return n\n\ncutoff = int(input())\nscores = [3, 7, 2, 9, 5]\nprint("Above cutoff: " + str(aboveCutoff(scores, cutoff)))\n',
        javascript: JS_INPUT_PRELUDE + 'function aboveCutoff(scores, cutoff) {\n  let n = 0;\n  for (let i = 0; i < scores.length; i++) {\n    if (scores[i] > cutoff) {\n      n = n + 1;\n    }\n  }\n  return n;\n}\n\nconst cutoff = Number(INPUT());\nconst scores = [3, 7, 2, 9, 5];\nconsole.log("Above cutoff: " + aboveCutoff(scores, cutoff));\n',
      },
    },
  ],
};
