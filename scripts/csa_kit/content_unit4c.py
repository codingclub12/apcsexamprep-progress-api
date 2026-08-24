"""
AP CSA Unit 4 teacher-kit content, part 3: topics 4.7 - 4.12.

Wrapper classes, ArrayList, and the move into two dimensions. Break-it and
misconception slides mirror seed/csa-debug-unit4.js.

No em-dashes anywhere.
"""

TOPICS = [

# ── 4.7 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.7',
 'title': 'Wrapper Classes',
 'handle': 'ap-csa-lesson-4-7-wrapper-classes',
 'subtitle': 'Integer and Double as objects, and the comparison that works at 127 and fails at 128',
 'vocab': [
   ('Wrapper class', 'A class holding a primitive as an object: Integer, Double, Boolean.'),
   ('Autoboxing', 'Java converting a primitive to its wrapper automatically.'),
   ('Unboxing', 'Java converting a wrapper back to its primitive automatically.'),
   ('Integer cache', 'A pool of shared Integer objects for values from -128 to 127.'),
   ('Identity comparison', 'Using == on objects, which asks whether they are the same object.'),
   ('Value comparison', 'Using equals, which asks whether the contents match.'),
 ],
 'quiz': [
   {'stem': 'Integer a = 128, b = 128. What does a == b print?',
    'options': ['true', 'false', 'It does not compile', 'Random'],
    'answer_index': 1,
    'why': 'Values outside the cache get separate objects, so the references differ.'},
   {'stem': 'Integer a = 127, b = 127. What does a == b print?',
    'options': ['true', 'false', 'It does not compile', 'Random'],
    'answer_index': 0,
    'why': 'The cache hands out one shared object for -128 to 127.'},
   {'stem': 'Which comparison is correct for two Integers?',
    'options': ['a == b', 'a.equals(b)', 'a = b', 'a != b'],
    'answer_index': 1,
    'why': 'equals compares the values held.'},
   {'stem': 'Why is a bug that works below 128 worse than one that always fails?',
    'options': ['It is slower', 'It survives testing with small values',
                'It uses more memory', 'It is harder to type'],
    'answer_index': 1,
    'why': 'Passing tests hide it until real data arrives.'},
   {'stem': 'An ArrayList of ints must be declared as:',
    'options': ['ArrayList<int>', 'ArrayList<Integer>', 'ArrayList[int]', 'ArrayList'],
    'answer_index': 1,
    'why': 'Collections hold objects, so the wrapper type is required.'},
   {'stem': 'Autoboxing means:',
    'options': ['Java converts a primitive to its wrapper automatically', 'Objects are compressed',
                'Arrays are resized', 'Casting is skipped'],
    'answer_index': 0,
    'why': 'The conversion is inserted by the compiler.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Wrappers, boxing, and why collections need them',
   'schedule': [
     (6, 'Bell ringer: why not just int'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Wrapper classes and boxing'),
     (10, 'Worked example: boxing and unboxing'),
     (13, 'Why ArrayList needs Integer'),
     (5, 'Misconception check: Integer and int are interchangeable'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'This topic exists mainly to make ArrayList possible in 4.8. Say that; it gives the lesson a purpose.',
     'Save the == demonstration for tomorrow. Today is what wrappers ARE.',
   ],
   'warmup': ('Why not just int',
     'On the board: "An ArrayList can hold objects but not primitives. Given that, how would you store a list '
     'of scores? What would Java need to provide?"',
     'Something object-shaped that holds an int. That is exactly what Integer is, and inventing the need first '
     'makes the class feel obvious rather than arbitrary.'),
   'objectives': [
     ('I can name the wrapper class for a primitive type.', 'LO 4.7.A'),
     ('I can explain autoboxing and unboxing.', 'LO 4.7.B'),
     ('I can explain why a collection cannot hold primitives directly.', 'LO 4.7.C'),
   ],
   'sections': [
     ('Wrapper classes', [
       'A wrapper class holds a primitive as an object: Integer for int, Double for double, Boolean for boolean.',
       'Collections such as ArrayList store objects, so they need the wrapper rather than the primitive.',
       'Autoboxing converts a primitive to its wrapper automatically, and unboxing converts it back.',
       'That automatic conversion is why wrapper code usually looks exactly like primitive code.',
     ]),
     ('Where the conversions happen', [
       'Adding an int to an ArrayList<Integer> autoboxes it on the way in.',
       'Assigning an element to an int variable unboxes it on the way out.',
       'Arithmetic on wrappers unboxes both operands, does int arithmetic, and reboxes if needed.',
     ]),
   ],
   'worked': {
     'heading': 'Boxing and unboxing, visibly',
     'code': 'public class Boxing\n{\n    public static void main(String[] args)\n    {\n        int raw = 42;\n\n        Integer boxed = raw;\n        int unboxed = boxed;\n\n        System.out.println(boxed);\n        System.out.println(unboxed);\n        System.out.println(boxed + 8);\n\n        Integer explicit = Integer.valueOf(7);\n        System.out.println(explicit.intValue());\n        System.out.println(Integer.MAX_VALUE);\n    }\n}',
     'notice': [
       'Integer boxed = raw - autoboxing, no cast needed.',
       'boxed + 8 - unboxes, adds as ints, prints 50.',
       'Integer.MAX_VALUE - a useful constant the wrapper provides.',
     ],
     'output': ['42', '42', '50', '7', '2147483647'],
     'caption': 'Complete and runnable as shown. Boxing and unboxing are invisible in the source.',
     'note': 'Point out that only one line looks unusual. The conversions are inserted by the compiler, which is '
             'why the trap tomorrow is so well hidden.',
   },
   'break_it': {
     'change': 'Declare the list as ArrayList<int> instead of ArrayList<Integer>.',
     'happens': 'It does not compile. Java says unexpected type, and the error names int specifically.',
     'why': 'Generic types hold objects, and int is not an object. This is one of the few Unit 4 errors the '
            'compiler catches for you, which makes it a good one to meet early: the fix is always the wrapper '
            'type. The dangerous wrapper bug is the one it does NOT catch, which is tomorrow.',
     'note': 'A rare compile error in a unit full of silent bugs. Worth naming as the easy case.',
   },
   'misconception': {
     'heading': 'Integer and int are the same thing',
     'think': 'Java converts between them automatically, so they behave identically.',
     'truth': 'They behave identically for arithmetic, which is exactly why the difference is easy to forget. '
              'They do not behave identically for comparison, for null, or for storage: an Integer is an object '
              'with an identity and can be null, and an int is a value that cannot. Autoboxing hides the '
              'difference right up until == or a null appears, and then it matters enormously.',
     'note': 'Deliberate cliffhanger for day 2. Do not resolve it today.',
   },
   'discussion': [
     'Why can an ArrayList not hold int directly?',
     'What does boxed + 8 actually do, step by step?',
   ],
   'learned': [
     'I can name the wrapper class for a primitive type.',
     'I can explain autoboxing and unboxing.',
     'I can explain why a collection cannot hold primitives directly.',
   ],
   'up_next': 'Day 2 is the comparison that works for small numbers and fails for large ones.',
   'extra': 'Write the wrapper class for int, double, boolean and char. Note which one is not simply capitalised.',
  },
  {
   'day': 2,
   'focus': 'The Integer cache, and why == is never the right question',
   'schedule': [
     (5, 'Bell ringer: predict both'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Identity versus value, again'),
     (10, 'Worked walkthrough: 127 and 128, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'This is the most memorable demonstration in the unit. Do it live, both values, in that order.',
     'The transferable idea is bigger than Integer: a bug that passes small tests is worse than one that always fails.',
   ],
   'warmup': ('Predict both',
     'On the board: "Integer a = 127, b = 127; print a == b. Then Integer a = 128, b = 128; print a == b. '
     'Write both predictions before we run anything."',
     'Almost everyone predicts the same answer twice. Getting both predictions in writing is what makes the '
     'split result land, so do not run anything until they are written down.'),
   'objectives': [
     ('I can explain why == on Integers is unreliable.', 'LO 4.7.B'),
     ('I can use equals to compare wrapper values.', 'LO 4.7.C'),
     ('I can explain why a bug that passes small tests is especially dangerous.', 'LO 4.7.A'),
   ],
   'sections': [
     ('Identity versus value, again', [
       'An Integer is an object, so == compares references and asks whether they are the same object.',
       'Java keeps a cache of Integer objects for the values -128 to 127 and hands out the same object for those.',
       'Inside that range == accidentally gives the right answer. Outside it, two separate objects are created and == is false.',
       'equals compares the values held, and is correct across the whole range.',
     ]),
     ('Why this one is dangerous', [
       'A bug that always fails is found on the first test. A bug that works for small values survives testing.',
       'Test data is usually small and hand-typed, which is precisely the range where the cache hides the problem.',
       'Use equals on every wrapper without checking the range first, and the question never arises.',
     ]),
   ],
   'worked': {
     'heading': '127 and 128, side by side',
     'code': 'public class Cache\n{\n    public static void main(String[] args)\n    {\n        Integer small1 = 127;\n        Integer small2 = 127;\n        Integer big1 = 128;\n        Integer big2 = 128;\n\n        System.out.println(small1 == small2);\n        System.out.println(big1 == big2);\n\n        System.out.println(small1.equals(small2));\n        System.out.println(big1.equals(big2));\n    }\n}',
     'notice': [
       '== on 127 prints true - the cache handed out one shared object.',
       '== on 128 prints false - two separate objects hold the same value.',
       'equals prints true for both - it asks the right question.',
     ],
     'output': ['true', 'false', 'true', 'true'],
     'caption': 'Complete and runnable as shown. One character apart in value, opposite answers from ==.',
     'note': 'Four lines, and the first two are the whole lesson. Ask what changed between them: only the value, '
             'and nothing about the code.',
   },
   'break_it': {
     'change': 'Use == throughout and test only with values under 128.',
     'happens': 'Every test passes. The code appears completely correct and will fail the first time a real score '
                'above 127 appears.',
     'why': 'The cache makes == correct in exactly the range people test in. That is worse than a bug that always '
            'fails, because passing tests actively convince you the code is right. Tonight\'s graded debugging '
            'exercise runs the same comparison at 127 and 128 so the split is visible in the output.',
     'note': 'Ask what test would have caught it. A value above 127, which nobody picks unless they know.',
   },
   'misconception': {
     'heading': 'It works, so the comparison must be correct',
     'think': 'I tested Integer == Integer and it printed true, so == compares wrapper values.',
     'truth': 'It printed true because both variables pointed at the same cached object, which is an '
              'implementation detail of the JVM and not a rule about ==. The comparison was always asking about '
              'identity; the cache just made identity and equality coincide for small numbers. This is the same '
              'false positive as == on pooled String literals in 2.6, and the same fix: use equals, always.',
     'note': 'Naming the 2.6 parallel is worth thirty seconds. Two different types, one identical trap.',
   },
   'discussion': [
     'Why is a bug that only appears above 127 harder to find than one that always appears?',
     'How is this the same trap as == on String literals?',
   ],
   'learned': [
     'I can explain why == on Integers is unreliable.',
     'I can use equals to compare wrapper values.',
     'I can explain why a bug that passes small tests is especially dangerous.',
   ],
   'up_next': 'Topic 4.8 uses those wrappers in an ArrayList, which can grow.',
   'extra': 'Complete the graded debugging exercise for 4.7. It compares Integers with == at 127 and 128.',
  },
 ],
},

# ── 4.8 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.8',
 'title': 'ArrayList Methods',
 'handle': 'ap-csa-lesson-4-8-arraylist-methods',
 'subtitle': 'A list that grows, and what happens to the indexes when it shrinks',
 'vocab': [
   ('ArrayList', 'A resizable list of objects, indexed like an array.'),
   ('add', 'Appends to the end, or inserts at an index and shifts everything after it up.'),
   ('remove', 'Removes at an index and shifts everything after it down.'),
   ('size', 'A method returning how many elements the list currently holds.'),
   ('Shifting', 'The movement of later elements when one is inserted or removed.'),
   ('Stale bound', 'A size captured before a loop that no longer matches a changing list.'),
 ],
 'quiz': [
   {'stem': 'How many elements does an ArrayList hold at first?',
    'options': ['10', '0', 'null', 'Unlimited'],
    'answer_index': 1,
    'why': 'A new ArrayList is empty until something is added.'},
   {'stem': 'Removing at index 0 does what to the other elements?',
    'options': ['Nothing', 'Shifts them down by one', 'Shifts them up by one', 'Reverses them'],
    'answer_index': 1,
    'why': 'Everything after the removed element moves down to close the gap.'},
   {'stem': 'Removing while looping forward with i++ causes:',
    'options': ['A crash always', 'Skipped elements', 'Duplicates', 'Nothing unusual'],
    'answer_index': 1,
    'why': 'The element that shifts into the removed slot is stepped over.'},
   {'stem': 'The cleanest fix for that is:',
    'options': ['Loop backwards', 'Use a bigger bound', 'Remove twice', 'Copy the list first'],
    'answer_index': 0,
    'why': 'Removing at i only shifts elements after i, which a backward loop has already visited.'},
   {'stem': 'Capturing size() into a variable before a loop that removes is:',
    'options': ['Faster and correct', 'A stale bound that outruns the list', 'Required', 'Equivalent'],
    'answer_index': 1,
    'why': 'The list shrinks and the captured bound does not.'},
   {'stem': 'Which is correct for an ArrayList?',
    'options': ['list.length', 'list.size()', 'list.length()', 'list.count'],
    'answer_index': 1,
    'why': 'size() is a method on the list; length is an array field.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Creating, adding, and reading a list',
   'schedule': [
     (6, 'Bell ringer: what an array could not do'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'ArrayList basics and the methods'),
     (10, 'Worked example: build and read a list'),
     (13, 'size, get, set and the three name traps'),
     (5, 'Misconception check: size is a valid index'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Open with the array limitation from 4.3 day 2. ArrayList lands much better as a solution to a known problem.',
     'The three names (length, length(), size()) trip everyone. Put all three on the board together.',
   ],
   'warmup': ('What an array could not do',
     'On the board: "You have an array of 5 and a sixth value arrives. Write the steps you would have to take. '
     'How many lines is that?"',
     'Allocate a new array, copy five elements, add the sixth, repoint the variable. Four steps and a loop, every '
     'time. ArrayList does that for you, and framing it as the answer to their own annoyance sells the whole class.'),
   'objectives': [
     ('I can create an ArrayList and add elements to it.', 'LO 4.8.A'),
     ('I can read and replace elements with get and set.', 'LO 4.8.B'),
     ('I can use size correctly as a count rather than an index.', 'LO 4.8.C'),
   ],
   'sections': [
     ('ArrayList basics', [
       'An ArrayList grows as needed, so the size does not have to be known when it is created.',
       'It holds objects, so a list of ints is declared ArrayList<Integer>, using the wrapper from 4.7.',
       'A new list is empty: size() is 0 until something is added.',
       'add appends to the end; add with an index inserts and shifts everything after it up.',
     ]),
     ('Reading and replacing', [
       'get(i) reads the element at index i. set(i, value) replaces it and returns the old one.',
       'size() is a method with parentheses. Arrays use a length field without them, and Strings use length().',
       'Valid indexes run from 0 to size() - 1, exactly as with arrays.',
     ]),
   ],
   'worked': {
     'heading': 'Build a list, then read it',
     'code': 'import java.util.ArrayList;\n\npublic class Build\n{\n    public static void main(String[] args)\n    {\n        ArrayList<Integer> list = new ArrayList<Integer>();\n        System.out.println(list.size());\n\n        list.add(10);\n        list.add(20);\n        list.add(30);\n        System.out.println(list.size());\n\n        System.out.println(list.get(0));\n        System.out.println(list.get(list.size() - 1));\n\n        list.set(1, 99);\n        System.out.println(list.get(1));\n\n        list.add(1, 55);\n        System.out.println(list.get(1));\n        System.out.println(list.get(2));\n        System.out.println(list.size());\n    }\n}',
     'notice': [
       'size() is 0 before anything is added.',
       'set replaces in place; add with an index INSERTS and shifts.',
       'After the insert, the old element at index 1 is now at index 2.',
     ],
     'output': ['0', '3', '10', '30', '99', '55', '99', '4'],
     'caption': 'Complete and runnable as shown. Note where 99 ends up after the insert.',
     'note': 'The insert is the interesting line. Ask where 99 went before revealing it: shifting is what makes '
             'tomorrow\'s removal bug possible.',
   },
   'break_it': {
     'change': 'Read the last element with list.get(list.size()).',
     'happens': 'It throws IndexOutOfBoundsException: Index 4 out of bounds for length 4. The message names both '
                'numbers, exactly like the array version.',
     'why': 'size() is a count, and the last valid index is size() - 1. This is the same rule as array length, '
            'with a different method name and a different exception name, which is precisely why students meet '
            'it twice and are surprised twice.',
     'note': 'Put length, length() and size() on the board side by side and label which type each belongs to.',
   },
   'misconception': {
     'heading': 'size() is the last index',
     'think': 'The list has size 4, so get(4) returns the last element.',
     'truth': 'size() counts elements and indexes start at 0, so the last valid index is size() - 1. This is '
              'identical to array length and to String length(), and the only thing that changes between them is '
              'the spelling. One rule, three names: arrays use the length field, Strings use the length() method, '
              'and lists use size().',
     'note': 'Framing it as one rule with three spellings is much stickier than three separate facts.',
   },
   'discussion': [
     'What is the difference between set(1, 55) and add(1, 55)?',
     'Why do arrays, Strings and ArrayLists use three different names for the same idea?',
   ],
   'learned': [
     'I can create an ArrayList and add elements to it.',
     'I can read and replace elements with get and set.',
     'I can use size correctly as a count rather than an index.',
   ],
   'up_next': 'Day 2 removes elements, where the indexes move underneath the loop.',
   'extra': 'Write the last-element expression for an array, a String and an ArrayList. Note what changes.',
  },
  {
   'day': 2,
   'focus': 'Removing safely, and why forward removal skips',
   'schedule': [
     (5, 'Bell ringer: retrieval on size'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Removing, shifting, and skipping'),
     (10, 'Worked walkthrough: trace a removal, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Trace 4, 4, 7 by hand on the board. The skip is invisible in code and obvious in a trace.',
     'Backward removal is the fix worth memorising. Explain WHY it works, not just that it does.',
   ],
   'warmup': ('Retrieval on size',
     'On the board, no notes: "1. Last valid index of a list of size 6? 2. What does add(2, x) do to the element '
     'currently at index 2? 3. Field or method: list size?"',
     'Five; shifts it to index 3; a method with parentheses. Question 2 is the setup for today, so make sure the '
     'word "shifts" is said out loud.'),
   'objectives': [
     ('I can remove elements from a list without skipping any.', 'LO 4.8.B'),
     ('I can explain why a forward removal loop skips elements.', 'LO 4.8.C'),
     ('I can avoid a stale size bound.', 'LO 4.8.A'),
   ],
   'sections': [
     ('Removing and shifting', [
       'remove(i) deletes the element at index i and shifts everything after it down by one to close the gap.',
       'A forward loop then increments i, so the element that just moved into position i is stepped straight over.',
       'Two matching values in a row is enough to expose this, and the list never complains.',
     ]),
     ('Two fixes', [
       'Looping backwards works because removing at i only shifts elements AFTER i, which a backward loop has already visited.',
       'Alternatively, do not increment i when a removal happens, so the shifted element is examined next.',
       'A size captured before the loop is a snapshot of a list that is about to shrink, and it will outrun the list.',
     ]),
   ],
   'worked': {
     'heading': 'Remove backwards and nothing is skipped',
     'code': 'import java.util.ArrayList;\n\npublic class Remove\n{\n    public static void main(String[] args)\n    {\n        ArrayList<Integer> list = new ArrayList<Integer>();\n        list.add(4);\n        list.add(4);\n        list.add(7);\n        list.add(4);\n\n        for (int i = list.size() - 1; i >= 0; i--)\n        {\n            if (list.get(i) == 4)\n            {\n                list.remove(i);\n            }\n        }\n\n        for (int value : list)\n        {\n            System.out.println(value);\n        }\n        System.out.println(list.size());\n    }\n}',
     'notice': [
       'Backward loop - removing at i only shifts elements after i.',
       'Every 4 is removed, including the two that were adjacent.',
       'list.size() read fresh at the start, never captured into a stale variable.',
     ],
     'output': ['7', '1'],
     'caption': 'Complete and runnable as shown. All three 4s removed, leaving only 7.',
     'note': 'Trace the forward version on the board first and get the wrong answer deliberately, then show this. '
             'The contrast is the lesson.',
   },
   'break_it': {
     'change': 'Loop forwards with i++ and capture int size = list.size() before the loop.',
     'happens': 'One 4 survives, because the second 4 shifted into a slot the loop had already passed. The '
                'captured bound also outruns the shrinking list and throws IndexOutOfBoundsException.',
     'why': 'Two bugs at once, and both come from the list changing underneath the loop. Removing at i shifts the '
            'next element into position i, and i++ then skips it. The captured size describes a list that no '
            'longer exists. Tonight\'s graded debugging exercise plants exactly this pair.',
     'note': 'Trace 4, 4, 7 by hand: at i = 0 the first 4 goes and the list becomes 4, 7. i becomes 1, which is '
             'the 7. The second 4 was never examined.',
   },
   'misconception': {
     'heading': 'Removing an element leaves the others where they were',
     'think': 'I removed index 0, so index 1 is still the same element it was.',
     'truth': 'A list has no gaps, so removing an element pulls everything after it down by one. The element that '
              'was at index 1 is now at index 0, and the index you are about to move to holds something you have '
              'already seen. This is why forward removal skips, and why looping backwards or not advancing after '
              'a removal are the only two correct approaches.',
     'note': 'Physical demo: line up students, remove one, and ask everyone after them to step across.',
   },
   'discussion': [
     'Why does removing while looping backwards not skip anything?',
     'Why is a captured size bound wrong when the loop removes elements?',
   ],
   'learned': [
     'I can remove elements from a list without skipping any.',
     'I can explain why a forward removal loop skips elements.',
     'I can avoid a stale size bound.',
   ],
   'up_next': 'Topic 4.9 traverses lists with the same care arrays needed.',
   'extra': 'Complete the graded debugging exercise for 4.8. It plants a forward removal and a stale size bound.',
  },
 ],
},

# ── 4.9 ──────────────────────────────────────────────────────────────────────
{
 'topic': '4.9',
 'title': 'Traversing ArrayLists',
 'handle': 'ap-csa-lesson-4-9-traversing-arraylists',
 'subtitle': 'The same traversals as arrays, with size() in place of length',
 'vocab': [
   ('List traversal', 'Visiting every element of a list exactly once.'),
   ('Enhanced for over a list', 'Reading every element without an index, exactly as with arrays.'),
   ('Accumulator seeding', 'Choosing a starting value: a constant for sums, the first element for extremes.'),
   ('Double counting', 'Adding an element twice by seeding from it and then including it in the loop.'),
   ('Bound', 'The condition deciding which indexes a list traversal visits.'),
   ('IndexOutOfBoundsException', 'Thrown when a list index outside 0 to size minus 1 is used.'),
 ],
 'quiz': [
   {'stem': 'A correct indexed list traversal uses:',
    'options': ['i <= list.size()', 'i < list.size()', 'i < list.size() - 1', 'i <= size'],
    'answer_index': 1,
    'why': 'It visits 0 through size minus 1.'},
   {'stem': 'Seeding a total with list.get(0) and then looping from index 0:',
    'options': ['Is correct', 'Counts the first element twice', 'Skips the first element', 'Throws'],
    'answer_index': 1,
    'why': 'The seed already included it and the loop adds it again.'},
   {'stem': 'A maximum seeded with list.get(0) should loop from:',
    'options': ['0', '1', 'size - 1', 'size'],
    'answer_index': 1,
    'why': 'Element 0 is already accounted for by the seed.'},
   {'stem': 'A sum accumulator should start at:',
    'options': ['list.get(0)', '0', '1', 'size'],
    'answer_index': 1,
    'why': 'Zero is neutral for addition, so no seeding from data is needed.'},
   {'stem': 'Which traversal form cannot report a position?',
    'options': ['Indexed for', 'Enhanced for', 'while', 'Both A and C'],
    'answer_index': 1,
    'why': 'The enhanced for loop hides the index deliberately.'},
   {'stem': 'A list traversal crashing on the final pass suggests:',
    'options': ['A wrong seed', 'A bound of <= size()', 'An empty list', 'A wrapper problem'],
    'answer_index': 1,
    'why': 'The last pass asks for index size, which does not exist.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Traversing lists, and matching the seed to the bound',
   'schedule': [
     (6, 'Bell ringer: translate the array loop'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Indexed and enhanced traversal of a list'),
     (10, 'Worked example: sum and maximum together'),
     (13, 'Seeding and double counting'),
     (5, 'Misconception check: seed then loop from zero'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The seed-and-bound pairing is the real content. Sum starts at 0 and loops from 0; max seeds from element 0 and loops from 1.',
     'Put both loops side by side so the difference is structural rather than remembered.',
   ],
   'warmup': ('Translate the array loop',
     'On the board, an array traversal: "for (int i = 0; i < data.length; i++) { total += data[i]; } '
     'Rewrite it for an ArrayList<Integer>. What changes?"',
     'length becomes size(), and data[i] becomes list.get(i). Two substitutions and nothing else, which is worth '
     'saying plainly: this topic is the array topic with different spelling.'),
   'objectives': [
     ('I can traverse an ArrayList by index and with an enhanced for loop.', 'LO 4.9.A'),
     ('I can pair an accumulator seed with the correct starting index.', 'LO 4.9.B'),
     ('I can avoid counting the first element twice.', 'LO 4.9.C'),
   ],
   'sections': [
     ('Traversing a list', [
       'An indexed traversal uses i < list.size() and list.get(i), exactly mirroring the array version.',
       'An enhanced for loop reads every element without an index and is the better choice when only reading.',
       'Valid indexes run from 0 to size() - 1, so size() itself always throws.',
     ]),
     ('Seeding and bounds', [
       'A sum starts at 0 and loops from index 0, because 0 is neutral and no element is pre-counted.',
       'A maximum seeds from element 0 and loops from index 1, because element 0 has already been accounted for.',
       'Seeding from element 0 and then looping from 0 counts that element twice.',
       'The rule: if you seeded from the data, start the loop one further along.',
     ]),
   ],
   'worked': {
     'heading': 'Sum and maximum, each seeded correctly',
     'code': 'import java.util.ArrayList;\n\npublic class Stats\n{\n    public static void main(String[] args)\n    {\n        ArrayList<Integer> list = new ArrayList<Integer>();\n        list.add(3);\n        list.add(9);\n        list.add(4);\n\n        int total = 0;\n        for (int i = 0; i < list.size(); i++)\n        {\n            total = total + list.get(i);\n        }\n        System.out.println(total);\n\n        int max = list.get(0);\n        for (int i = 1; i < list.size(); i++)\n        {\n            if (list.get(i) > max)\n            {\n                max = list.get(i);\n            }\n        }\n        System.out.println(max);\n\n        for (int value : list)\n        {\n            System.out.println(value);\n        }\n    }\n}',
     'notice': [
       'total starts at 0 and loops from 0 - nothing pre-counted.',
       'max seeds from element 0 and loops from 1 - no double count.',
       'The enhanced for loop reads only, which is what it is for.',
     ],
     'output': ['16', '9', '3', '9', '4'],
     'caption': 'Complete and runnable as shown. Two accumulators, two different starting indexes.',
     'note': 'The two loops differ in exactly two places: the seed and the start index. They change together, '
             'always, and that pairing is the whole slide.',
   },
   'break_it': {
     'change': 'Seed total with list.get(0) while leaving the loop starting at index 0.',
     'happens': 'The total becomes 19 instead of 16. The first element has been added twice and nothing indicates '
                'it.',
     'why': 'Seeding from the data and looping from 0 counts element 0 twice. The seed and the start index must '
            'agree: seed from a constant and start at 0, or seed from element 0 and start at 1. Tonight\'s graded '
            'debugging exercise plants this together with a bound of <= size().',
     'note': 'The wrong answer is close to the right one, which is what makes it survive a glance. Ask them to '
             'compute 16 and 19 by hand before running.',
   },
   'misconception': {
     'heading': 'Seeding from the first element is always safer',
     'think': 'Starting the accumulator from real data avoids the all-negative maximum bug, so I will do it everywhere.',
     'truth': 'It is right for a maximum or minimum, which have no neutral value, and wrong for a sum, which has '
              'one. Worse, seeding without also moving the loop start to 1 double counts the first element. The '
              'two decisions are a pair: constant seed with a loop from 0, data seed with a loop from 1. Changing '
              'one without the other is the bug.',
     'note': 'Connects 2.9 (why seed at all) with this topic (what seeding obliges you to change).',
   },
   'discussion': [
     'Why does a sum start at 0 while a maximum starts at element 0?',
     'What is the total for {3, 9, 4} if the first element is counted twice? How would you spot that?',
   ],
   'learned': [
     'I can traverse an ArrayList by index and with an enhanced for loop.',
     'I can pair an accumulator seed with the correct starting index.',
     'I can avoid counting the first element twice.',
   ],
   'up_next': 'Topic 4.10 builds new lists from old ones.',
   'extra': 'Write a sum and a maximum over the same list. Check the seed and start index of each against the rule.',
  },
  {
   'day': 2,
   'focus': 'Bounds, empty lists, and choosing the traversal form',
   'schedule': [
     (5, 'Bell ringer: retrieval on seeding'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Empty lists and the seeding assumption'),
     (10, 'Worked walkthrough: guard the empty case, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Seeding from element 0 assumes an element 0 exists. Empty input breaks it, and students never test empty.',
     'Same guard rule as 4.6 and 4.10. Name the pattern each time.',
   ],
   'warmup': ('Retrieval on seeding',
     'On the board, no notes: "1. Sum: what seed, what start index? 2. Maximum: what seed, what start index? '
     '3. What happens if you seed from data and start at 0?"',
     '0 and 0; element 0 and 1; the first element is counted twice. If the pairing comes back cleanly, move '
     'straight to the empty case.'),
   'objectives': [
     ('I can state the valid index range of a list.', 'LO 4.9.A'),
     ('I can handle an empty list without crashing.', 'LO 4.9.C'),
     ('I can choose between indexed and enhanced traversal from the task.', 'LO 4.9.B'),
   ],
   'sections': [
     ('Empty lists', [
       'Seeding from list.get(0) assumes at least one element exists, and an empty list throws immediately.',
       'Guard the empty case before any code that seeds from the data.',
       'A sum over an empty list is legitimately 0. A maximum over an empty list has no answer at all.',
     ]),
     ('Choosing the form', [
       'Reading only: enhanced for, which cannot go out of bounds or use a wrong index.',
       'Changing elements or needing positions: indexed, because get and set need the index.',
       'Removing elements: indexed and backwards, which is 4.8.',
     ]),
   ],
   'worked': {
     'heading': 'Guard the empty list',
     'code': 'import java.util.ArrayList;\n\npublic class Empty\n{\n    public static void main(String[] args)\n    {\n        ArrayList<Integer> full = new ArrayList<Integer>();\n        full.add(5);\n        full.add(2);\n        ArrayList<Integer> empty = new ArrayList<Integer>();\n\n        report(full);\n        report(empty);\n    }\n\n    public static void report(ArrayList<Integer> list)\n    {\n        int total = 0;\n        for (int value : list)\n        {\n            total = total + value;\n        }\n        System.out.println(total);\n\n        if (list.size() == 0)\n        {\n            System.out.println("NO MAX");\n        }\n        else\n        {\n            int max = list.get(0);\n            for (int i = 1; i < list.size(); i++)\n            {\n                if (list.get(i) > max)\n                {\n                    max = list.get(i);\n                }\n            }\n            System.out.println(max);\n        }\n    }\n}',
     'notice': [
       'The sum needs no guard - an empty sum is genuinely 0.',
       'The maximum needs one - there is no largest element of nothing.',
       'The guard comes BEFORE the seed, not after it.',
     ],
     'output': ['7', '5', '0', 'NO MAX'],
     'caption': 'Complete and runnable as shown. The same method on a full list and an empty one.',
     'note': 'One method, two lists, and only one of the two statistics needs protecting. Ask why before '
             'explaining it.',
   },
   'break_it': {
     'change': 'Remove the size() == 0 guard and seed the maximum unconditionally.',
     'happens': 'The full list still works perfectly. The empty list throws IndexOutOfBoundsException: Index 0 '
                'out of bounds for length 0.',
     'why': 'Seeding from element 0 asserts that element 0 exists, and an empty list makes that assertion false. '
            'The guard must come before the seed, because checking afterwards means the crash has already '
            'happened. Same rule as 4.6 empty input and 4.10 empty filter.',
     'note': 'Third appearance of the guard rule and the slide says so. Ask the class to name the other two.',
   },
   'misconception': {
     'heading': 'An empty collection is an error condition',
     'think': 'If the list is empty something has gone wrong upstream, so I do not need to handle it.',
     'truth': 'Empty is a perfectly ordinary state: a filter that matched nothing, a file with no records, a '
              'class with no students enrolled yet. The correct behaviour is usually to report something '
              'sensible rather than to crash. A sum of nothing is 0; a maximum of nothing has no answer and must '
              'say so. Deciding what empty MEANS is part of the specification, not an afterthought.',
     'note': 'Same idea as 2.7 day 2, where a loop legitimately runs zero times.',
   },
   'discussion': [
     'Why does a sum need no empty guard while a maximum does?',
     'Name two situations where an empty list is completely normal.',
   ],
   'learned': [
     'I can state the valid index range of a list.',
     'I can handle an empty list without crashing.',
     'I can choose between indexed and enhanced traversal from the task.',
   ],
   'up_next': 'Topic 4.10 builds a new list from an old one and reports on the right one.',
   'extra': 'Complete the graded debugging exercise for 4.9. It plants a <= size() bound and a double-counted first element.',
  },
 ],
},
]
