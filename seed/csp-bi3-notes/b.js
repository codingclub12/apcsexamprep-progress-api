'use strict';
// Big Idea 3 guided notes, topics 3.10 to 3.18.
// Same structure and conventions as ./a.js. Objectives are plain language
// rather than CED letter codes, for the reason stated at the top of that file.
// Pure ASCII, no em-dashes. Zero PII: author content only.

module.exports = [
  {
    slug: 'lists',
    title: 'Lists',
    seo: 'Printable AP CSP Topic 3.10 guided notes on list indexing from 1, APPEND, INSERT, REMOVE, LENGTH, and traversing a list with a loop.',
    objectives: [
      'Use list operations to add, remove, and access elements',
      'Determine the result of a sequence of list procedures',
      'Traverse a list with a loop without running past either end',
    ],
    bellRinger: 'Number the people in your row starting from 1. Now the first person leaves. What number does the second person have? Write down what happened to everyone else.',
    vocab: ['List', 'Index', 'Element', 'Traversal'],
    sections: [
      {
        heading: 'AP Pseudocode Indexes From 1',
        blocks: [
          { type: 'text', text: 'This is the single most important fact in the topic. The first element is at index 1, and the index of the last element is the same as the length of the list.' },
          { type: 'code', src: 'nums <- [10, 20, 30, 40]' },
          {
            type: 'table',
            head: ['Expression', 'Value'],
            rows: [
              ['nums[1]', '10'],
              ['nums[3]', null],
              ['LENGTH(nums)', null],
              ['nums[LENGTH(nums)]', null],
            ],
          },
          { type: 'warn', label: 'Common mistake', text: 'Using index 0. Many programming languages start at 0, and AP pseudocode does not. On the exam, always count from 1.' },
        ],
      },
      {
        heading: 'The Four Operations',
        blocks: [
          {
            type: 'table',
            head: ['Operation', 'What it does', 'Effect on length'],
            rows: [
              ['APPEND(list, value)', 'Adds the value at the end', 'Increases by 1'],
              ['INSERT(list, i, value)', 'Places the value at index i and shifts the rest right', null],
              ['REMOVE(list, i)', 'Takes out the element at index i and shifts the rest left', null],
              ['LENGTH(list)', 'Reports how many elements there are', null],
            ],
          },
          { type: 'code', src: 'L <- [1, 2, 3]\nAPPEND(L, 4)\nINSERT(L, 1, 0)' },
          { type: 'write', prompt: 'What does L hold after each line? Write all three states.', lines: 3 },
        ],
      },
      {
        heading: 'Everything Shifts',
        blocks: [
          { type: 'text', text: 'Removing an element does not leave a gap. Every later element slides down one position, which is why removing while looping by index skips elements.' },
          { type: 'write', prompt: 'A loop runs i from 1 upward and removes matching elements as it goes. Explain, using the shifting rule, why some matches are missed.', lines: 4 },
          { type: 'dd', label: 'Exam tip', text: 'A loop bound of LENGTH(list) + 1 accesses past the end and is a runtime error. A bound of LENGTH(list) - 1 silently skips the last element. Both appear as distractors.' },
        ],
      },
    ],
    exitTicket: 'Write the expression that accesses the last element of a list named L, whatever its length.',
  },

  {
    slug: 'binary-search',
    title: 'Binary Search',
    seo: 'Printable AP CSP Topic 3.11 guided notes on binary search, the sorted list prerequisite, halving, and comparison with sequential search.',
    objectives: [
      'Explain the conditions under which binary search can be applied',
      'Trace a binary search through a sorted list',
      'Compare the growth of binary search with sequential search',
    ],
    bellRinger: 'I am thinking of a number from 1 to 100. You get yes or no questions only. What is your first question, and how many questions do you expect to need? Write both down.',
    vocab: ['Binary search', 'Sequential search', 'Sorted list'],
    sections: [
      {
        heading: 'The One Prerequisite',
        blocks: [
          { type: 'text', text: 'Binary search works by discarding half the list at every step. That is only valid if the order guarantees the target cannot be in the discarded half. Without sorting, there is no such guarantee and the result is simply wrong.' },
          { type: 'warn', label: 'Check this first, every time', text: 'If an exam question applies binary search to an unsorted list, the list being unsorted IS the answer. Look at the list before you trace anything.' },
        ],
      },
      {
        heading: 'Tracing a Search',
        blocks: [
          { type: 'code', src: '[2, 5, 8, 12, 16, 23, 38]   searching for 23' },
          {
            type: 'table',
            head: ['Step', 'Range examined', 'Middle value', 'Half discarded'],
            rows: [
              ['1', 'all 7 elements', '12', 'the left half'],
              ['2', null, null, null],
              ['3', null, null, null],
            ],
          },
          { type: 'write', prompt: 'How many comparisons did you need? How many would sequential search need in the worst case?', lines: 2 },
        ],
      },
      {
        heading: 'How the Cost Grows',
        blocks: [
          { type: 'text', text: 'Each comparison halves what is left. This is why the numbers stay small even when the list does not.' },
          {
            type: 'table',
            head: ['List size', 'Sequential search, worst case', 'Binary search, worst case'],
            rows: [
              ['100', '100', 'about 7'],
              ['1,000', null, 'about 10'],
              ['1,000,000', null, null],
            ],
          },
          { type: 'dd', label: 'The insight', text: 'Doubling the list adds about ONE comparison to a binary search, and doubles the work of a sequential search. That gap is the entire point of sorting the data first.' },
        ],
      },
      {
        heading: 'When Sequential Search Is Correct',
        blocks: [
          { type: 'text', text: 'Sorting is not free. If a short list will be searched once, scanning it costs less than sorting it and then searching. Binary search pays off when the same sorted list is searched many times.' },
          { type: 'write', prompt: 'Give one situation from your own experience where sequential search is the sensible choice.', lines: 2 },
        ],
      },
    ],
    exitTicket: 'A list has 1,024 sorted elements. What is the maximum number of comparisons binary search needs, and how did you get that number?',
  },

  {
    slug: 'calling-procedures',
    title: 'Calling Procedures',
    seo: 'Printable AP CSP Topic 3.12 guided notes on calling procedures, argument order, return values, and variable scope for AP CSP students.',
    objectives: [
      'Call a procedure with the correct arguments in the correct order',
      'Determine the result of a procedure call and use the returned value',
      'Explain why a variable declared inside a procedure is not visible outside it',
    ],
    bellRinger: 'Write down three things you use every day without knowing how they work internally. For each, write what you DO need to know in order to use it.',
    vocab: ['Procedure', 'Parameter', 'Argument', 'Return value', 'Scope'],
    sections: [
      {
        heading: 'Parameters and Arguments',
        blocks: [
          { type: 'text', text: 'A parameter is the name in the definition. An argument is the value supplied at the call. They bind in ORDER, first to first, second to second, and nothing about the names makes that binding happen.' },
          { type: 'code', src: 'PROCEDURE divide(a, b)\n{\n  RETURN a / b\n}\n\nDISPLAY divide(20, 4)' },
          { type: 'write', prompt: 'What is displayed? Now what would divide(4, 20) display?', lines: 2 },
        ],
      },
      {
        heading: 'RETURN Does Not Display',
        blocks: [
          { type: 'text', text: 'RETURN hands a value back to whoever called the procedure. If the caller does nothing with it, the value is discarded and nothing appears on screen.' },
          { type: 'code', src: 'PROCEDURE doubleIt(n)\n{\n  RETURN n * 2\n}\n\ndoubleIt(5)' },
          { type: 'write', prompt: 'Why does this display nothing? Write the corrected call.', lines: 2 },
          { type: 'warn', label: 'Common mistake', text: 'Adding a DISPLAY inside the procedure to fix this. It works once and then the procedure can only ever print, so no caller can use the value in a calculation.' },
        ],
      },
      {
        heading: 'Scope',
        blocks: [
          { type: 'text', text: 'A variable declared inside a procedure exists only while that procedure runs and only within it. This is a feature: it means two procedures can use the same variable name without interfering with each other.' },
          { type: 'write', prompt: 'Write down what happens if the caller tries to display a variable that was declared inside a procedure, and why that is a good design rather than a limitation.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'List the three things you need to know to USE a procedure someone else wrote, and the one thing you do not need to know.',
  },

  {
    slug: 'developing-procedures',
    title: 'Developing Procedures',
    seo: 'Printable AP CSP Topic 3.13 guided notes on writing procedures, choosing parameters, procedural abstraction, and the Create Task requirement.',
    objectives: [
      'Write a procedure with parameters that change what it does',
      'Explain how procedural abstraction manages complexity',
      'Decide where the boundary of a procedure should be',
    ],
    bellRinger: 'Find twelve lines in a program you have written that appear more than once. If you cannot find any, write down twelve lines you would not want to change in four separate places.',
    vocab: ['Procedural abstraction', 'Interface', 'Reuse'],
    sections: [
      {
        heading: 'What Goes In a Procedure',
        blocks: [
          { type: 'text', text: 'A good procedure does one job, takes what it needs as parameters, and returns its result. That combination is what makes it reusable somewhere the author never anticipated.' },
          {
            type: 'table',
            head: ['Design', 'Reusable?', 'Why'],
            rows: [
              ['Takes a rate as a parameter', 'Yes', 'Works with any rate'],
              ['Reads a rate from an outside variable', null, null],
              ['Does four unrelated jobs', null, null],
            ],
          },
        ],
      },
      {
        heading: 'The Interface Is the Contract',
        blocks: [
          { type: 'text', text: 'Whoever calls a procedure needs its name, its parameters, and what it returns. They do not need the implementation. Hiding the implementation behind that contract IS procedural abstraction.' },
          { type: 'write', prompt: 'Write the interface, not the code, for a procedure that converts a letter grade to grade points.', lines: 3 },
        ],
      },
      {
        heading: 'The Create Task Requirement',
        blocks: [
          { type: 'text', text: 'The student developed procedure must take a parameter that affects what the procedure does. A procedure with no parameter, or with a parameter it never uses, does not demonstrate the abstraction the rubric is looking for.' },
          {
            type: 'list',
            items: [
              'It must be a procedure you wrote, not one taken from a library or a forum',
              'It must have at least one parameter that changes its behavior',
              'It must include sequencing, selection, and iteration',
              'It must be called somewhere in the program',
            ],
          },
          { type: 'write', prompt: 'Sketch the procedure you plan to submit. Name the parameter and say how it changes the result.', lines: 4 },
        ],
      },
    ],
    exitTicket: 'Explain in one sentence why passing a value as a parameter is usually better than reading it from an outside variable.',
  },

  {
    slug: 'libraries',
    title: 'Libraries',
    seo: 'Printable AP CSP Topic 3.14 guided notes on libraries and APIs, reading documentation, and attributing borrowed code correctly.',
    objectives: [
      'Explain what a library and an API provide to a developer',
      'Use documentation to determine how to call an unfamiliar procedure',
      'Attribute code written by someone else correctly',
    ],
    bellRinger: 'You need to sort a list. Write down how long you think it would take you to write a correct, fully tested sort. Now write down how long it takes to call one that already exists.',
    vocab: ['Library', 'API', 'Documentation', 'Attribution'],
    sections: [
      {
        heading: 'Why Reuse',
        blocks: [
          { type: 'text', text: 'A library gives you both an implementation and everything that has been learned from other people using it. The tested edge cases are usually worth more than the code itself.' },
          {
            type: 'list',
            items: [
              'You skip work that is already done',
              'You inherit testing against cases you have not thought of yet',
              'You still own understanding what the procedure promises',
            ],
          },
        ],
      },
      {
        heading: 'Reading an API',
        blocks: [
          { type: 'text', text: 'An API tells you the name, what goes in, and what comes out. That is the same relationship you have with any procedure, applied to code you did not write and may never see.' },
          { type: 'write', prompt: 'Pick any library procedure you have used. Write its name, its inputs, and its output, without looking at its implementation.', lines: 3 },
          { type: 'dd', label: 'When it behaves unexpectedly', text: 'Read the documentation before assuming the library is broken. Most surprises turn out to be a caller expecting something the contract never promised.' },
        ],
      },
      {
        heading: 'Attribution',
        blocks: [
          { type: 'text', text: 'Using existing code is expected and allowed. Presenting it as your own is not, and it cannot satisfy a requirement that asks for work you wrote yourself.' },
          {
            type: 'table',
            head: ['Situation', 'Allowed?', 'What is required'],
            rows: [
              ['Using an attributed library for supporting work', 'Yes', 'Cite it in the program code'],
              ['Copying a procedure and submitting it as your student developed procedure', null, null],
              ['Copying a whole program and renaming the variables', null, null],
            ],
          },
        ],
      },
    ],
    exitTicket: 'Write one sentence explaining the difference between using a library and copying someone else\'s work.',
  },

  {
    slug: 'random-values',
    title: 'Random Values',
    seo: 'Printable AP CSP Topic 3.15 guided notes on the RANDOM procedure, inclusive ranges, generating values in a pattern, and testing randomized programs.',
    objectives: [
      'Generate a random value within a specified range',
      'Determine which values a call to RANDOM can produce',
      'Explain how to test a program whose output changes every run',
    ],
    bellRinger: 'Roll a die six times and record the results. Did each face appear exactly once? Write down what you expected and what actually happened.',
    vocab: ['RANDOM', 'Inclusive range', 'Probability'],
    sections: [
      {
        heading: 'The Range Includes Both Ends',
        blocks: [
          { type: 'text', text: 'RANDOM(a, b) can return a, can return b, and can return anything in between. Every value in the range is equally likely on each call.' },
          {
            type: 'table',
            head: ['Call', 'Possible values', 'How many'],
            rows: [
              ['RANDOM(1, 6)', '1, 2, 3, 4, 5, 6', '6'],
              ['RANDOM(0, 9)', null, null],
              ['RANDOM(5, 5)', null, null],
            ],
          },
          { type: 'warn', label: 'Common mistake', text: 'Assuming the upper bound is excluded. That is the rule in several real languages and is NOT the rule in AP pseudocode.' },
        ],
      },
      {
        heading: 'Shaping the Output',
        blocks: [
          { type: 'text', text: 'To produce values in a pattern, generate a simple range and then transform it. Doubling, adding an offset, or both will cover most exam questions.' },
          {
            type: 'table',
            head: ['Wanted', 'Expression'],
            rows: [
              ['Even numbers 2 through 10', 'RANDOM(1, 5) * 2'],
              ['Values 10 through 20', null],
              ['A fair coin', null],
            ],
          },
        ],
      },
      {
        heading: 'Testing Randomness',
        blocks: [
          { type: 'text', text: 'You cannot test a randomized program against one expected output. Test the properties that must hold on every run, and run it many times.' },
          {
            type: 'list',
            items: [
              'Does every result fall inside the expected range?',
              'Over many runs, does every possible value eventually appear?',
              'Does the program behave correctly at both ends of the range?',
            ],
          },
          { type: 'write', prompt: 'A dice simulation returns 4 every single run. What is wrong, and how would you confirm it?', lines: 3 },
        ],
      },
    ],
    exitTicket: 'How many distinct values can RANDOM(3, 12) return? Show how you counted.',
  },

  {
    slug: 'simulations',
    title: 'Simulations',
    seo: 'Printable AP CSP Topic 3.16 guided notes on simulations, choosing what to model, the role of abstraction, and the limits of simulated results.',
    objectives: [
      'Explain why a simulation is used instead of a real experiment',
      'Identify what a model leaves out and what that costs',
      'Explain why a single run of a randomized simulation proves little',
    ],
    bellRinger: 'Name something you could never test in the real world because it would be too slow, too expensive, or too dangerous. Write down what you would want to learn from it anyway.',
    vocab: ['Simulation', 'Model', 'Abstraction'],
    sections: [
      {
        heading: 'Why Simulate',
        blocks: [
          { type: 'text', text: 'A simulation is never more accurate than reality. Its advantages are entirely practical, and naming the right one is what earns the point.' },
          {
            type: 'list',
            items: [
              'Cost: trying a hundred variations costs almost nothing',
              'Time: a year of change can run in seconds',
              'Safety: nobody is harmed by a failed run',
              'Repeatability: the same scenario can be run again exactly',
            ],
          },
          { type: 'warn', label: 'Never say this', text: 'A simulation is more accurate than the real world. It is a model of the real world, and it is always a simplification of it.' },
        ],
      },
      {
        heading: 'What the Model Leaves Out',
        blocks: [
          { type: 'text', text: 'Every model abstracts. Choosing what to leave out is what makes it buildable, and it also fixes the boundary of what the results can be trusted to say.' },
          {
            type: 'table',
            head: ['Simulation', 'Deliberately omitted', 'Where results stop applying'],
            rows: [
              ['Forest fire spread', 'wind', 'Any windy day'],
              ['Traffic light timing', null, null],
              ['Disease spread', null, null],
            ],
          },
        ],
      },
      {
        heading: 'Reading the Results',
        blocks: [
          { type: 'text', text: 'A simulation containing randomness produces a different answer every run. One run is a single sample, so conclusions come from aggregating many runs.' },
          { type: 'write', prompt: 'A simulation run once reports a 60 percent success rate. Write down two reasons that number should not be reported as the real rate.', lines: 3 },
        ],
      },
    ],
    exitTicket: 'Name one thing your own simulation idea would leave out, and one conclusion it therefore could not support.',
  },

  {
    slug: 'algorithmic-efficiency',
    title: 'Algorithmic Efficiency',
    seo: 'Printable AP CSP Topic 3.17 guided notes on reasonable running time, comparing linear and exponential growth, and using heuristics on hard problems.',
    objectives: [
      'Compare how the work of two algorithms grows with input size',
      'Distinguish reasonable from unreasonable running time',
      'Explain when a heuristic is the right choice',
    ],
    bellRinger: 'A task takes 2 seconds on 1,000 items. Predict how long it takes on 2,000 items if the algorithm looks at each item once. Now predict it if the algorithm compares every pair.',
    vocab: ['Efficiency', 'Reasonable time', 'Heuristic'],
    sections: [
      {
        heading: 'Growth, Not Stopwatch Time',
        blocks: [
          { type: 'text', text: 'Efficiency in this course is about how the work GROWS as the input grows, not how many seconds one run takes on one machine.' },
          {
            type: 'table',
            head: ['Algorithm shape', 'Work on n items', 'Doubling n does what'],
            rows: [
              ['Look at each item once', 'about n', 'Doubles the work'],
              ['Compare every pair', 'about n times n', null],
              ['Halve the range each step', 'about log n', null],
              ['Try every subset', 'about 2 to the n', null],
            ],
          },
        ],
      },
      {
        heading: 'The Reasonable Line',
        blocks: [
          { type: 'text', text: 'Polynomial growth, including linear and squared, counts as reasonable time. Exponential and factorial growth do not, and no faster computer changes which side of the line an algorithm is on.' },
          { type: 'write', prompt: 'Why does buying a machine ten times faster not rescue an exponential algorithm? Answer in terms of what happens when n grows by 1.', lines: 3 },
        ],
      },
      {
        heading: 'Heuristics',
        blocks: [
          { type: 'text', text: 'When an exact answer cannot be computed in reasonable time, a heuristic finds a good answer quickly and gives up the guarantee that it is the best one. That is a deliberate trade, not a failure.' },
          { type: 'dd', label: 'The standard example', text: 'Finding the guaranteed shortest route through many cities is computationally expensive. Route planners use heuristics and return a short route immediately, which is worth far more than an optimal route that never arrives.' },
          { type: 'write', prompt: 'Describe a situation where a good answer now beats the best answer later.', lines: 2 },
        ],
      },
    ],
    exitTicket: 'An algorithm takes 2 seconds on 1,000 items and 4 seconds on 2,000. What growth is that, and what would exponential growth have looked like instead?',
  },

  {
    slug: 'undecidable-problems',
    title: 'Undecidable Problems',
    seo: 'Printable AP CSP Topic 3.18 guided notes distinguishing undecidable problems from computationally expensive ones, using the halting problem.',
    objectives: [
      'Explain what makes a problem undecidable',
      'Distinguish an undecidable problem from one that is merely expensive to solve',
      'Explain why faster hardware does not make an undecidable problem solvable',
    ],
    bellRinger: 'Write down a question you believe no computer will ever be able to answer. Keep it. We will sort your question into hard or impossible by the end of the period.',
    vocab: ['Decidable', 'Undecidable', 'Halting problem'],
    sections: [
      {
        heading: 'Hard Is Not Impossible',
        blocks: [
          { type: 'text', text: 'This is the entire topic in one distinction, and nearly every wrong exam answer collapses it.' },
          {
            type: 'table',
            head: ['Category', 'Does an algorithm exist?', 'Example'],
            rows: [
              ['Decidable and cheap', 'Yes, and it runs fast', 'Sorting a list'],
              ['Decidable and expensive', 'Yes, but it takes impractically long at scale', 'Guaranteed shortest route through 40 cities'],
              ['Undecidable', 'No, and this has been proven', null],
            ],
          },
          { type: 'warn', label: 'Common mistake', text: 'Calling the traveling salesman problem undecidable. Checking every route is a correct algorithm, so the problem is decidable. It is only expensive.' },
        ],
      },
      {
        heading: 'The Halting Problem',
        blocks: [
          { type: 'text', text: 'Given any program and any input, decide whether that program eventually stops. No algorithm can answer this correctly for every case. This is proven, not merely unsolved.' },
          { type: 'write', prompt: 'Why can you not settle it by running the program and waiting? Write the specific case that defeats waiting.', lines: 3 },
        ],
      },
      {
        heading: 'What This Means in Practice',
        blocks: [
          { type: 'text', text: 'Undecidability does not stop useful tools from existing. It stops them from being complete.' },
          { type: 'write', prompt: 'A tool claims to detect every infinite loop in any program. What can you conclude, and what is the tool probably doing instead?', lines: 3 },
          { type: 'dd', label: 'The closing point', text: 'Undecidability is a mathematical limit rather than a physical one. Faster hardware speeds up algorithms that exist, and here there is no algorithm to speed up.' },
        ],
      },
    ],
    exitTicket: 'Take the question you wrote in the bell ringer. Is it hard or is it impossible? Say how you decided.',
  },
];
