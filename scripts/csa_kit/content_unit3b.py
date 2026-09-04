"""
AP CSA Unit 3 teacher-kit content, part 2: topics 3.5 - 3.9.

Same schema and rules as part 1. Break-it and misconception slides mirror
seed/csa-debug-unit3.js.

No em-dashes anywhere.
"""

TOPICS = [

# ── 3.5 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.5',
 'title': 'Methods: How to Write Them',
 'handle': 'ap-csa-lesson-3-5-methods-how-to-write-them',
 'subtitle': 'Parameters, return values, and where a return statement belongs in a loop',
 'vocab': [
   ('Parameter', 'A variable in a method declaration that receives an argument from the caller.'),
   ('Argument', 'The actual value passed in at the call site.'),
   ('Return type', 'The type of value a method hands back, or void when it hands back nothing.'),
   ('Early return', 'Returning from inside a loop, which ends the method immediately.'),
   ('Counting loop', 'A loop that must finish before its answer is known, so it returns afterwards.'),
   ('Searching loop', 'A loop that may return as soon as it finds what it is looking for.'),
 ],
 'quiz': [
   {'stem': 'A return statement inside a loop does what?',
    'options': ['Ends the iteration', 'Ends the method immediately', 'Skips to the next pass', 'Nothing'],
    'answer_index': 1,
    'why': 'return leaves the whole method, not just the loop.'},
   {'stem': 'A method that counts matching elements should return:',
    'options': ['Inside the loop', 'After the loop', 'In an else', 'Twice'],
    'answer_index': 1,
    'why': 'The count is not known until every element has been examined.'},
   {'stem': 'A method checking whether ALL elements pass should return false:',
    'options': ['After the loop', 'As soon as one fails', 'Only if the list is empty', 'Never'],
    'answer_index': 1,
    'why': 'One counterexample settles the question, so it can return early.'},
   {'stem': 'A method checking whether ALL elements pass should return true:',
    'options': ['As soon as one passes', 'After the loop survives every element', 'In the first iteration', 'Never'],
    'answer_index': 1,
    'why': 'No single example proves a claim about every element.'},
   {'stem': 'Changing a parameter inside a method changes the caller\'s variable when the type is:',
    'options': ['int', 'double', 'boolean', 'None of these'],
    'answer_index': 3,
    'why': 'Primitives are passed by value, so the method works on a copy.'},
   {'stem': 'countAbove returns after examining only the first element. The likely cause is:',
    'options': ['A wrong condition', 'The return is inside the loop', 'The loop bound is wrong', 'A missing else'],
    'answer_index': 1,
    'why': 'The first pass reaches the return and the method exits.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Parameters, return values, and passing by value',
   'schedule': [
     (6, 'Bell ringer: what the method can and cannot change'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Parameters and return values'),
     (10, 'Worked example: a method that computes and returns'),
     (13, 'Passing by value'),
     (5, 'Misconception check: the method changed my variable'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Passing by value is best taught with a trace of two boxes. Draw them.',
     'Connect to 1.10: ignoring a return value is the same mistake from the caller side.',
   ],
   'warmup': ('What the method can and cannot change',
     'On the board, where twice does n = n * 2. "What prints? Commit to an answer before we discuss."',
     'It prints 5. The method doubled its own copy. Getting a wrong answer committed in writing first is what makes the explanation land, so do not let anyone hedge.',
     'int x = 5;\ntwice(x);\nSystem.out.println(x);'),
   'objectives': [
     ('I can write a method with parameters and a return value.', 'LO 3.5.A'),
     ('I can explain why changing a primitive parameter does not affect the caller.', 'LO 3.5.B'),
     ('I can use a returned value at the call site.', 'LO 3.5.C'),
   ],
   'sections': [
     ('Parameters and return values', [
       'A parameter is declared in the method; an argument is the value the caller passes in.',
       'The return type says what the method hands back. void means it hands back nothing.',
       'A method with a return type must return a value on every path out of it.',
     ]),
     ('Passing by value', [
       'Java passes a COPY of a primitive, so changing the parameter cannot affect the caller\'s variable.',
       'The only way a computed answer reaches the caller is through the return value.',
       'That is why ignoring a return value throws the entire result away.',
     ]),
   ],
   'worked': {
     'heading': 'Compute, return, and use the answer',
     'code': 'public class Calc\n{\n    public static int twice(int n)\n    {\n        n = n * 2;\n        return n;\n    }\n\n    public static int clamp(int n, int max)\n    {\n        if (n > max)\n        {\n            return max;\n        }\n        return n;\n    }\n\n    public static void main(String[] args)\n    {\n        int x = 5;\n        twice(x);\n        System.out.println(x);\n\n        x = twice(x);\n        System.out.println(x);\n\n        x = clamp(x, 7);\n        System.out.println(x);\n    }\n}',
     'notice': [
       'twice(x); on its own - the answer is computed and discarded.',
       'x = twice(x); - the answer is captured, so x changes.',
       'clamp returns from two places, and both paths return an int.',
     ],
     'output': ['5', '10', '7'],
     'caption': 'Complete and runnable as shown. The first call changes nothing.',
     'note': 'Line 1 and line 2 are the same call with and without the assignment. That contrast is the whole '
             'slide, and it is the resolution of the warm-up.',
   },
   'break_it': {
     'change': 'Remove the assignment from x = clamp(x, 7); leaving just clamp(x, 7);',
     'happens': 'x stays at 10 even though clamp plainly computed 7. No warning, no error, and the clamping '
                'appears in the code.',
     'why': 'The method received a copy, computed the right answer, and returned it to nobody. A returned value '
            'that is not stored or printed is discarded immediately. This is the 1.10 debugging exercise, and it '
            'is the single most common way students lose work they have already correctly computed.',
     'note': 'Ask what the compiler could have done. Nothing: calling a method and ignoring its result is legal '
             'and sometimes correct, so it cannot warn.',
   },
   'misconception': {
     'heading': 'A method changes the variable you passed in',
     'think': 'twice(x) doubles x, because I passed x into it.',
     'truth': 'What was passed was a copy of the VALUE of x. The method has its own variable holding 5, doubles '
              'that to 10, and returns it. Your x was never reachable from inside the method at all. This is why '
              'every useful computation has to come back through the return value, and why x = twice(x) is the '
              'pattern rather than twice(x) on its own.',
     'note': 'Object references behave differently and that is 3.6 tomorrow. Flag it so nobody over-generalises.',
   },
   'discussion': [
     'Why can a method never change the value of an int variable belonging to its caller?',
     'What is the difference between twice(x); and x = twice(x);?',
   ],
   'learned': [
     'I can write a method with parameters and a return value.',
     'I can explain why changing a primitive parameter does not affect the caller.',
     'I can use a returned value at the call site.',
   ],
   'up_next': 'Day 2 puts loops inside methods and decides where the return statement belongs.',
   'extra': 'Write a method max(int a, int b) and call it three ways, storing the result each time.',
  },
  {
   'day': 2,
   'focus': 'Returning from inside a loop, and all-elements logic',
   'schedule': [
     (5, 'Bell ringer: retrieval on returns'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Where the return belongs'),
     (10, 'Worked walkthrough: count versus check, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'The counting versus searching distinction is the whole day. Put both shapes side by side on the board.',
     'The all-elements logic is genuinely hard. Do the truth reasoning explicitly, not by analogy.',
   ],
   'warmup': ('Retrieval on returns',
     'On the board, no notes: "1. What does return do inside a loop? 2. Where must a counting method return? '
     '3. What happens to a returned value nobody stores?"',
     'Ends the method; after the loop; discarded. Question 2 is the one that matters today, and the reason is '
     'that a count is not known until the loop is finished.'),
   'objectives': [
     ('I can decide whether a method should return inside or after its loop.', 'LO 3.5.A'),
     ('I can write a method that checks a property of every element.', 'LO 3.5.B'),
     ('I can explain why one counterexample settles an all-elements claim.', 'LO 3.5.C'),
   ],
   'sections': [
     ('Where the return belongs', [
       'A counting method returns AFTER the loop, because the count is not known until every element is examined.',
       'A searching method may return from INSIDE the loop, because finding one example settles the question.',
       'Ask which kind of method you are writing before deciding where the return goes.',
     ]),
     ('All-elements logic', [
       'To claim something is true of EVERY element, one counterexample is enough to say false.',
       'No single passing element is ever enough to say true, so true is returned only after the loop survives them all.',
       'The early return inside the loop must therefore be the false one. Getting this backwards is a classic error.',
     ]),
   ],
   'worked': {
     'heading': 'Count versus check, side by side',
     'code': 'public class Scores\n{\n    public static int countAbove(int[] values, int cutoff)\n    {\n        int count = 0;\n        for (int i = 0; i < values.length; i++)\n        {\n            if (values[i] > cutoff)\n            {\n                count++;\n            }\n        }\n        return count;\n    }\n\n    public static boolean allPassing(int[] values, int cutoff)\n    {\n        for (int i = 0; i < values.length; i++)\n        {\n            if (values[i] < cutoff)\n            {\n                return false;\n            }\n        }\n        return true;\n    }\n\n    public static void main(String[] args)\n    {\n        int[] v = {90, 65, 80, 72, 60};\n        System.out.println(countAbove(v, 70));\n        System.out.println(allPassing(v, 70));\n        System.out.println(allPassing(v, 50));\n    }\n}',
     'notice': [
       'countAbove returns after the loop - the count needs every element.',
       'allPassing returns false inside - one failure settles it.',
       'allPassing returns true after - surviving every element is the proof.',
     ],
     'output': ['3', 'false', 'true'],
     'caption': 'Complete and runnable as shown. Two methods, two different return positions.',
     'note': 'Both shapes on one screen. Ask which one could be rewritten with the other shape, and the honest '
             'answer is neither, without changing what it computes.',
   },
   'break_it': {
     'change': 'Move the return in countAbove inside the loop, and invert allPassing so it returns true on the '
               'first passing element.',
     'happens': 'countAbove reports 0 or 1 depending only on the first element. allPassing returns true for a '
                'list where only the first score passes and the rest fail.',
     'why': 'A count needs the whole loop; an all-elements claim needs a counterexample to be false and needs the '
            'whole loop to be true. Both bugs are the same misunderstanding of what a loop has finished proving. '
            'Tonight\'s graded debugging exercise plants both.',
     'note': 'Test allPassing with a list whose first element passes and second fails. That single case exposes '
             'the inverted logic instantly.',
   },
   'misconception': {
     'heading': 'Returning early is always more efficient',
     'think': 'Returning as soon as possible saves work, so I should return inside the loop whenever I can.',
     'truth': 'Early return is right only when the question is already settled. For a search it is, because one '
              'match is the answer. For a count it never is, because the answer depends on elements you have not '
              'looked at yet. Returning early from a count does not make it faster, it makes it wrong, and a '
              'wrong answer arriving sooner is not an optimisation.',
     'note': 'Efficiency instincts cause real bugs here. Naming the instinct is more useful than warning against it.',
   },
   'discussion': [
     'Why can allPassing return false early but not true early?',
     'What single test input would reveal an inverted allPassing?',
   ],
   'learned': [
     'I can decide whether a method should return inside or after its loop.',
     'I can write a method that checks a property of every element.',
     'I can explain why one counterexample settles an all-elements claim.',
   ],
   'up_next': 'Topic 3.6 passes objects rather than primitives, where copying works quite differently.',
   'extra': 'Complete the graded debugging exercise for 3.5. It plants a return inside a counting loop.',
  },
 ],
},

# ── 3.6 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.6',
 'title': 'Methods: Passing and Returning Object References',
 'handle': 'ap-csa-lesson-3-6-methods-passing-and-returning-object-references',
 'subtitle': 'Copying the arrow, not the object, and what that lets a caller reach',
 'vocab': [
   ('Reference', 'A value that points at an object rather than containing it.'),
   ('Aliasing', 'Two variables referring to the same object, so a change through one is visible through the other.'),
   ('Defensive copy', 'A copy made so a caller cannot reach the object\'s internal state.'),
   ('Privacy leak', 'Returning or storing a reference that lets outside code modify private data.'),
   ('Shallow copy', 'A copy of the reference, which still points at the same object.'),
   ('Deep copy', 'A new object with the contents copied across, independent of the original.'),
 ],
 'quiz': [
   {'stem': 'Assigning one array variable to another copies:',
    'options': ['The elements', 'The reference only', 'Nothing', 'The length'],
    'answer_index': 1,
    'why': 'Both variables then point at the same array.'},
   {'stem': 'Returning a private array field directly allows a caller to:',
    'options': ['Read it only', 'Modify the object\'s internal data', 'Nothing unusual', 'Delete the object'],
    'answer_index': 1,
    'why': 'The caller holds the same array the object is using.'},
   {'stem': 'A defensive copy of an int array is made by:',
    'options': ['Assigning it', 'Allocating a new array and copying each element',
                'Calling toString', 'Declaring it final'],
    'answer_index': 1,
    'why': 'A new array plus an element-by-element copy is the AP subset way.'},
   {'stem': 'A constructor that stores the array it was handed has:',
    'options': ['No problem', 'A leak, because the caller still holds a reference',
                'A compile error', 'A memory leak'],
    'answer_index': 1,
    'why': 'The caller can modify the array afterwards and change the object.'},
   {'stem': 'Changing an object through a parameter inside a method:',
    'options': ['Cannot affect the caller', 'Affects the caller, because both point at one object',
                'Only works for arrays', 'Requires a return'],
    'answer_index': 1,
    'why': 'The reference was copied, so both refer to the same object.'},
   {'stem': 'Which does NOT protect a private array?',
    'options': ['Returning a copy', 'Copying in the constructor', 'Declaring the field private', 'Both A and B'],
    'answer_index': 2,
    'why': 'private stops direct access to the field, not access through a reference you handed out.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'References, aliasing, and what private does not protect',
   'schedule': [
     (6, 'Bell ringer: two names, one thing'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'References and aliasing'),
     (10, 'Worked example: pass an array to a method'),
     (13, 'What private does and does not stop'),
     (5, 'Misconception check: private means safe'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Draw arrows. Every single time. Reference bugs are invisible in text and obvious in a diagram.',
     'The contrast with 3.5 is the lesson: primitives copy the value, objects copy the arrow.',
   ],
   'warmup': ('Two names, one thing',
     'On the board: "A shared document has a link. I send you the link and you edit the document. Did my copy '
     'change? Now: I send you a printout and you write on it. Did mine change?"',
     'Link is a reference; printout is a copy. Students already know the difference perfectly well in this '
     'context, and the whole topic is transferring that intuition to Java.'),
   'objectives': [
     ('I can explain what is copied when an object is passed to a method.', 'LO 3.6.A'),
     ('I can identify aliasing between two variables.', 'LO 3.6.B'),
     ('I can explain why private does not stop a caller holding a returned reference.', 'LO 3.6.C'),
   ],
   'sections': [
     ('References and aliasing', [
       'A variable of an object type holds a reference, which you can picture as an arrow pointing at the object.',
       'Assigning one object variable to another copies the arrow, not the object. Both now point at one thing.',
       'Passing an object to a method copies the arrow too, so the method can change the object the caller passed.',
       'This is the opposite of a primitive, where the value itself is copied and the caller is untouchable.',
     ]),
     ('What private protects', [
       'private stops other code naming the field directly. It does not stop code holding a reference you handed out.',
       'A getter that returns the array itself gives the caller the same array the object is using.',
       'A constructor that stores the array it was given leaves the caller holding a reference to the object\'s data.',
     ]),
   ],
   'worked': {
     'heading': 'Pass an array, watch it change',
     'code': 'public class Refs\n{\n    public static void doubleAll(int[] a)\n    {\n        for (int i = 0; i < a.length; i++)\n        {\n            a[i] = a[i] * 2;\n        }\n    }\n\n    public static void reassign(int[] a)\n    {\n        a = new int[] {99, 99, 99};\n    }\n\n    public static void main(String[] args)\n    {\n        int[] data = {1, 2, 3};\n\n        doubleAll(data);\n        System.out.println(data[0]);\n\n        reassign(data);\n        System.out.println(data[0]);\n    }\n}',
     'notice': [
       'doubleAll changes the elements - the caller sees it, because both point at one array.',
       'reassign points its own copy of the arrow somewhere new - the caller is unaffected.',
       'Changing the object works; changing the arrow does not.',
     ],
     'output': ['2', '2'],
     'caption': 'Complete and runnable as shown. One method changes the caller\'s data and one does not.',
     'note': 'This slide is the whole topic. Draw both cases as arrows before running. The second one surprises '
             'almost everybody.',
   },
   'break_it': {
     'change': 'Add a getValues() that returns the private array field directly, then have main modify what it '
               'returns.',
     'happens': 'The object\'s private data changes from outside, without any method of the class being involved. '
                'The field is still marked private.',
     'why': 'private controls who may NAME the field, not who may hold a reference to what it points at. Handing '
            'out the array hands out full access. Return a copy instead. This is tonight\'s graded debugging '
            'exercise, which leaks through both the getter and the constructor.',
     'note': 'Ask whether the field is still private. It is, and the data still leaked. That contradiction is what '
             'makes the idea stick.',
   },
   'misconception': {
     'heading': 'Marking a field private makes the data safe',
     'think': 'The array is private, so outside code cannot change it.',
     'truth': 'private is about NAMES, not about reachability. Nobody outside can write obj.values, and that is '
              'all it guarantees. The moment a method hands back the reference, the caller has the same array '
              'and can change every element of it without ever naming the field. Encapsulation needs private '
              'plus a copy on the way out, and a copy on the way in.',
     'note': 'This is the most sophisticated idea in the unit and it is genuinely examinable. Give it the time.',
   },
   'discussion': [
     'Why does doubleAll affect the caller when reassign does not?',
     'Is a field still private if a getter returns it? What does private actually guarantee?',
   ],
   'learned': [
     'I can explain what is copied when an object is passed to a method.',
     'I can identify aliasing between two variables.',
     'I can explain why private does not stop a caller holding a returned reference.',
   ],
   'up_next': 'Day 2 writes the defensive copies that close the leak in both directions.',
   'extra': 'Draw the arrows for int[] a = {1,2,3}; int[] b = a; b[0] = 9; What is a[0]? Why?',
  },
  {
   'day': 2,
   'focus': 'Defensive copies, in and out',
   'schedule': [
     (5, 'Bell ringer: retrieval on references'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Copying on the way in and on the way out'),
     (10, 'Worked walkthrough: close both leaks, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Both directions matter. Students close the getter and forget the constructor almost every time.',
     'A test that mutates both the passed-in array and the returned one is the proof. Write it with them.',
   ],
   'warmup': ('Retrieval on references',
     'On the board, no notes: "1. What is copied when you pass an object? 2. What does private guarantee? '
     '3. Name the two places a class can leak its array."',
     'The reference; that nobody can name the field; the getter and the constructor. If the third comes back '
     'with only one place, today\'s work is exactly what they need.'),
   'objectives': [
     ('I can write a defensive copy of an array in a getter.', 'LO 3.6.C'),
     ('I can write a defensive copy in a constructor.', 'LO 3.6.C'),
     ('I can write a test that proves the copies work.', 'LO 3.6.B'),
   ],
   'sections': [
     ('Copying both ways', [
       'A getter should return a new array with the same contents, so a caller modifying it cannot reach the field.',
       'A constructor should copy the array it is given, so the caller keeping a reference cannot reach the field either.',
       'Closing only one direction leaves the object open through the other, and it is the constructor that gets forgotten.',
     ]),
     ('Proving it works', [
       'Copying means allocating a new array of the same length and walking the elements across one at a time.',
       'A test should modify the array it passed in AND the array it got back, then check the object is unchanged.',
       'If either modification reaches the object, that direction is still leaking.',
     ]),
   ],
   'worked': {
     'heading': 'Both leaks closed, and tested',
     'code': 'public class Holder\n{\n    private int[] values;\n\n    public Holder(int[] values)\n    {\n        this.values = new int[values.length];\n        for (int i = 0; i < values.length; i++)\n        {\n            this.values[i] = values[i];\n        }\n    }\n\n    public int[] getValues()\n    {\n        int[] copy = new int[values.length];\n        for (int i = 0; i < values.length; i++)\n        {\n            copy[i] = values[i];\n        }\n        return copy;\n    }\n\n    public int getFirst()\n    {\n        return values[0];\n    }\n\n    public static void main(String[] args)\n    {\n        int[] source = {7, 2, 9};\n        Holder h = new Holder(source);\n        System.out.println(h.getFirst());\n\n        source[0] = 99;\n        System.out.println(h.getFirst());\n\n        int[] out = h.getValues();\n        out[0] = 55;\n        System.out.println(h.getFirst());\n    }\n}',
     'notice': [
       'Constructor copies - so changing source afterwards cannot reach the field.',
       'Getter copies - so changing what it returned cannot reach the field either.',
       'Three prints, all 7 - both leaks are closed.',
     ],
     'output': ['7', '7', '7'],
     'caption': 'Complete and runnable as shown. The caller attacks from both directions and fails.',
     'note': 'Three identical numbers is the proof. Remove either copy and one of them changes, which is a good '
             'thing to demonstrate live if there is time.',
   },
   'break_it': {
     'change': 'Remove the copy from the constructor, keeping the one in the getter.',
     'happens': 'The second printed line becomes 99. The getter is still perfectly defended and the object was '
                'compromised through the front door instead.',
     'why': 'Closing one direction is not closing the leak. The caller still holds the array it handed to the '
            'constructor, and the object is using that same array. Both directions need copies. This is '
            'tonight\'s graded debugging exercise, whose harness attacks both ways for exactly this reason.',
     'note': 'This is the half-fix students actually produce. Showing it is more useful than showing the fully '
             'broken version.',
   },
   'misconception': {
     'heading': 'One copy is enough',
     'think': 'I made the getter return a copy, so the class is safe now.',
     'truth': 'There are two doors. Data comes in through the constructor and goes out through the getter, and a '
              'reference handed through either one is a reference into the object. Copy on the way in and on the '
              'way out. The test that proves it modifies both the array you passed in and the array you got '
              'back, and expects the object to be unmoved by both.',
     'note': 'Give them the test shape explicitly. It is reusable on every class they write from here.',
   },
   'discussion': [
     'Why is copying in the constructor necessary when the getter already copies?',
     'What test would convince you a class has no privacy leak?',
   ],
   'learned': [
     'I can write a defensive copy of an array in a getter.',
     'I can write a defensive copy in a constructor.',
     'I can write a test that proves the copies work.',
   ],
   'up_next': 'Topic 3.7 asks which facts belong to one object and which belong to the class as a whole.',
   'extra': 'Complete the graded debugging exercise for 3.6. Its harness attacks through both the getter and the constructor.',
  },
 ],
},

# ── 3.7 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.7',
 'title': 'Class Variables and Methods',
 'handle': 'ap-csa-lesson-3-7-class-variables-and-methods',
 'subtitle': 'static: one copy shared by every object, and when that is the right answer',
 'vocab': [
   ('Class variable', 'A static field: one copy shared by every object of the class.'),
   ('Instance variable', 'A non-static field: every object has its own copy.'),
   ('Class method', 'A static method, called on the class rather than on an object.'),
   ('static', 'The keyword marking something as belonging to the class rather than to an instance.'),
   ('Shared state', 'Data that every object of a class sees and can change.'),
   ('Ownership', 'Whether a fact belongs to one object or to the class as a whole.'),
 ],
 'quiz': [
   {'stem': 'A static field is:',
    'options': ['Copied per object', 'Shared by every object', 'Constant', 'Private by default'],
    'answer_index': 1,
    'why': 'One copy exists for the class, whatever the number of objects.'},
   {'stem': 'A counter of how many objects have been created should be:',
    'options': ['An instance variable', 'A static variable', 'A local variable', 'A parameter'],
    'answer_index': 1,
    'why': 'The fact belongs to the class, not to any one object.'},
   {'stem': 'An instance counter increments in the constructor. What does each object report?',
    'options': ['The true total', '1', '0', 'The object index'],
    'answer_index': 1,
    'why': 'Each object counts only itself in its own private copy.'},
   {'stem': 'Widget.getCount() compiles only when getCount is:',
    'options': ['public', 'static', 'void', 'final'],
    'answer_index': 1,
    'why': 'Calling on the class rather than an object requires a static method.'},
   {'stem': 'A static method can directly access:',
    'options': ['Instance fields', 'Static fields', 'Both', 'Neither'],
    'answer_index': 1,
    'why': 'There is no particular object, so instance fields are unavailable.'},
   {'stem': 'An id unique to each object should be:',
    'options': ['static', 'An instance variable', 'A local', 'A parameter'],
    'answer_index': 1,
    'why': 'Each object needs its own, so it is per-instance.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Instance versus class, and the ownership question',
   'schedule': [
     (6, 'Bell ringer: yours or everyone\'s'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Instance and class variables'),
     (10, 'Worked example: a counter that counts'),
     (13, 'Static methods and what they can reach'),
     (5, 'Misconception check: static means constant'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The ownership question answers every static decision students will face. Drill the question, not the answers.',
     'Math.max is a static method they already use. Point at it.',
   ],
   'warmup': ('Yours or everyone\'s',
     'On the board: "For each of these, is it yours alone or shared by the whole class: your name, the room '
     'number, your score, the number of students, the teacher?"',
     'Sort them into two columns. That sorting IS the instance versus static decision, and every field they '
     'declare for the rest of the year answers the same question.'),
   'objectives': [
     ('I can decide whether a field should be an instance variable or a class variable.', 'LO 3.7.A'),
     ('I can write and call a static method.', 'LO 3.7.B'),
     ('I can explain why a static method cannot use instance fields.', 'LO 3.7.C'),
   ],
   'sections': [
     ('Instance and class variables', [
       'An instance variable gives every object its own copy. A static variable is one copy shared by all of them.',
       'Ask the ownership question: does this fact belong to one object, or to the class as a whole?',
       'A name or a score belongs to one object. A count of how many exist belongs to the class.',
       'A static field changed by one object is changed for every object, because there is only one of it.',
     ]),
     ('Static methods', [
       'A static method is called on the CLASS rather than on an object: Math.max, Integer.valueOf.',
       'It has no particular object, so it cannot use instance fields. It can use static fields.',
       'main is static, which is why it cannot touch instance fields without creating an object first.',
     ]),
   ],
   'worked': {
     'heading': 'A counter that actually counts',
     'code': 'public class Widget\n{\n    private static int count = 0;\n    private int id;\n\n    public Widget()\n    {\n        count++;\n        id = count;\n    }\n\n    public int getId()\n    {\n        return id;\n    }\n\n    public static int getCount()\n    {\n        return count;\n    }\n\n    public static void main(String[] args)\n    {\n        Widget a = new Widget();\n        Widget b = new Widget();\n        Widget c = new Widget();\n        System.out.println(a.getId());\n        System.out.println(c.getId());\n        System.out.println(Widget.getCount());\n    }\n}',
     'notice': [
       'count is static - one copy, so the increments accumulate across objects.',
       'id is an instance variable - each object keeps its own.',
       'Widget.getCount() - called on the class, which needs a static method.',
     ],
     'output': ['1', '3', '3'],
     'caption': 'Complete and runnable as shown. Three objects, ids 1 to 3, count 3.',
     'note': 'Two fields, two different answers to the ownership question, in one small class. Point at each and '
             'ask the question aloud.',
   },
   'break_it': {
     'change': 'Remove static from the count field.',
     'happens': 'Every object now reports an id of 1 and the count is 1. Three objects exist and the class insists '
                'there is one.',
     'why': 'Without static each object gets its own count, starts it at 0 and increments it to 1. A shared fact '
            'needs a shared variable. This is tonight\'s graded debugging exercise, which also requires making '
            'the accessor static so the class can be asked directly.',
     'note': 'Ask what the ids would be. All 1, which is a more obvious symptom than the count and worth '
             'predicting first.',
   },
   'misconception': {
     'heading': 'static means constant',
     'think': 'A static field cannot change, like a constant.',
     'truth': 'static is about HOW MANY copies exist, not about whether the value can change. There is exactly '
              'one copy shared by every object, and any of them can change it, which is the opposite of constant: '
              'it is the most changeable kind of field there is, because every object shares the consequences. '
              'The keyword for unchanging is final, and static final together is what makes a constant.',
     'note': 'The confusion comes from seeing static final constants in real code. Name that source directly.',
   },
   'discussion': [
     'Which fields of a BankAccount class should be static, and which should not?',
     'Why can a static method not read an instance field?',
   ],
   'learned': [
     'I can decide whether a field should be an instance variable or a class variable.',
     'I can write and call a static method.',
     'I can explain why a static method cannot use instance fields.',
   ],
   'up_next': 'Day 2 uses static for shared configuration and constants.',
   'extra': 'List five fields a Library class might have and sort them into instance and static.',
  },
  {
   'day': 2,
   'focus': 'Constants, shared configuration, and when static is wrong',
   'schedule': [
     (5, 'Bell ringer: retrieval on static'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'static final constants, and shared configuration'),
     (10, 'Worked walkthrough: a constant used everywhere, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'static final for a constant is the payoff of 3.1: one place for the rule, and it cannot be changed.',
     'Say clearly when static is WRONG. Over-application is the next mistake after under-application.',
   ],
   'warmup': ('Retrieval on static',
     'On the board, no notes: "1. How many copies of a static field exist? 2. What question decides whether a '
     'field should be static? 3. Does static mean it cannot change?"',
     'One; the ownership question; no, that is final. If anyone still says static means constant, re-run '
     'yesterday\'s misconception slide before continuing.'),
   'objectives': [
     ('I can declare a constant with static final and use it throughout a class.', 'LO 3.7.A'),
     ('I can explain when static is the wrong choice.', 'LO 3.7.C'),
     ('I can predict what happens when one object changes shared state.', 'LO 3.7.B'),
   ],
   'sections': [
     ('Constants and configuration', [
       'static final declares a constant: one copy, and it cannot be reassigned after initialization.',
       'A constant gives a name to a value and puts the value in exactly one place, which is 3.1 applied.',
       'Constants are conventionally written in capitals with underscores, such as MAX_SIZE.',
     ]),
     ('When static is wrong', [
       'Static is wrong whenever the fact genuinely belongs to one object, which is most facts.',
       'A static field changed by one object changes it for all of them, which is almost never what a per-object value wants.',
       'If two objects should be able to disagree about a value, it must not be static.',
     ]),
   ],
   'worked': {
     'heading': 'One constant, used everywhere',
     'code': 'public class Cart\n{\n    private static final int TAX_PERCENT = 8;\n    private static int cartsCreated = 0;\n\n    private int subtotal;\n\n    public Cart()\n    {\n        cartsCreated++;\n    }\n\n    public void add(int price)\n    {\n        subtotal = subtotal + price;\n    }\n\n    public int getTax()\n    {\n        return subtotal * TAX_PERCENT / 100;\n    }\n\n    public int getTotal()\n    {\n        return subtotal + getTax();\n    }\n\n    public static int getCartsCreated()\n    {\n        return cartsCreated;\n    }\n\n    public static void main(String[] args)\n    {\n        Cart a = new Cart();\n        a.add(1000);\n        Cart b = new Cart();\n        b.add(500);\n        System.out.println(a.getTotal());\n        System.out.println(b.getTotal());\n        System.out.println(Cart.getCartsCreated());\n    }\n}',
     'notice': [
       'TAX_PERCENT is static final - one copy, named, and unchangeable.',
       'subtotal is per object - a and b disagree, which is correct.',
       'cartsCreated is static - the two carts share one count.',
     ],
     'output': ['1080', '540', '2'],
     'caption': 'Complete and runnable as shown. Three fields, three different ownership decisions.',
     'note': 'One class showing all three cases at once: a constant, a shared counter and per-object data. Point '
             'at each and ask the ownership question.',
   },
   'break_it': {
     'change': 'Make subtotal static.',
     'happens': 'The two carts now share one subtotal. Adding 1000 to cart a and 500 to cart b gives both of them '
                'a total of 1500 plus tax. Each cart reports the other\'s items.',
     'why': 'A subtotal belongs to one cart, so sharing it is exactly wrong. Static is not a safety feature to '
            'sprinkle on; it is a statement that every object should see the same value. Ask the ownership '
            'question before typing the keyword.',
     'note': 'This is the over-application mistake, and it follows the under-application mistake within about a '
             'week. Showing both in one topic is deliberate.',
   },
   'misconception': {
     'heading': 'Static is a safe default',
     'think': 'Marking things static avoids problems, so I will use it when I am not sure.',
     'truth': 'Static means every object shares one value and any object can change it for all the others. That '
              'is the correct answer for a count of instances or a constant, and the wrong answer for nearly '
              'everything else. Applied by default it produces objects that cannot hold their own data, which is '
              'the opposite of what objects are for. Ask the ownership question every time.',
     'note': 'Close the unit\'s static thread here: under-applying gives a count of 1, over-applying gives carts '
             'that share a basket.',
   },
   'discussion': [
     'What goes wrong if a Student class makes its score field static?',
     'Why is static final a good way to express a tax rate?',
   ],
   'learned': [
     'I can declare a constant with static final and use it throughout a class.',
     'I can explain when static is the wrong choice.',
     'I can predict what happens when one object changes shared state.',
   ],
   'up_next': 'Topic 3.8 looks at scope: which names are visible where, and what shadows what.',
   'extra': 'Complete the graded debugging exercise for 3.7. It plants an instance counter that should be static.',
  },
 ],
},

# ── 3.8 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.8',
 'title': 'Scope and Access',
 'handle': 'ap-csa-lesson-3-8-scope-and-access',
 'subtitle': 'Which names are visible where, and the local that hides a field',
 'vocab': [
   ('Scope', 'The region of code in which a name is visible.'),
   ('Shadowing', 'A local variable hiding a field with the same name inside that method.'),
   ('public', 'Accessible from any class.'),
   ('private', 'Accessible only from inside the declaring class.'),
   ('Block scope', 'A variable declared inside braces, visible only until the matching closing brace.'),
   ('Lifetime', 'How long a variable exists: a field lives with the object, a local until its method returns.'),
 ],
 'quiz': [
   {'stem': 'A local variable with the same name as a field, inside a method, means the bare name refers to:',
    'options': ['The field', 'The local', 'Both', 'Neither, it will not compile'],
    'answer_index': 1,
    'why': 'The nearest declaration wins, which is the local.'},
   {'stem': 'A method declares int total = 0; then adds to total. The field total:',
    'options': ['Is updated', 'Stays at its default', 'Becomes null', 'Causes an error'],
    'answer_index': 1,
    'why': 'Only the local is touched, so the field keeps its default.'},
   {'stem': 'A variable declared inside a for loop body is visible:',
    'options': ['Anywhere in the method', 'Only inside that block', 'After the loop', 'In other methods'],
    'answer_index': 1,
    'why': 'Its scope ends at the closing brace of the block.'},
   {'stem': 'private means accessible:',
    'options': ['Anywhere', 'Only in the declaring class', 'Only in subclasses', 'Only in the same method'],
    'answer_index': 1,
    'why': 'That is the definition of private access.'},
   {'stem': 'A getAverage method divides by a local count that is 0. The symptom is:',
    'options': ['Zero returned', 'ArithmeticException', 'Null', 'The field is used instead'],
    'answer_index': 1,
    'why': 'Integer division by zero throws.'},
   {'stem': 'The safest cure for accidental shadowing is:',
    'options': ['Renaming every field', 'Not redeclaring a name that is already a field',
                'Making fields public', 'Using static'],
    'answer_index': 1,
    'why': 'Assign to the field rather than declaring a new local with its name.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Scope, lifetime, and shadowing',
   'schedule': [
     (6, 'Bell ringer: where can you see this name'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Scope and lifetime'),
     (10, 'Worked example: a field and a local side by side'),
     (13, 'Shadowing and its symptoms'),
     (5, 'Misconception check: same name means same variable'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Two symptoms to memorise: a field stuck at 0, and a divide by zero from a local count. Both are shadowing.',
     'Connect back to 3.3. This is the same bug, now named properly.',
   ],
   'warmup': ('Where can you see this name',
     'On the board, a class with a field total, a method with a local total, and a loop with a local i: '
     '"For each variable, write down the first and last line where it can be used."',
     'The field spans the whole class, the local spans its method, and i spans the loop. Three different '
     'lifetimes in twelve lines, which is the whole idea of scope made visible.'),
   'objectives': [
     ('I can state the scope and lifetime of a field, a local and a loop variable.', 'LO 3.8.A'),
     ('I can recognize shadowing and the symptoms it produces.', 'LO 3.8.B'),
     ('I can explain the difference between public and private access.', 'LO 3.8.C'),
   ],
   'sections': [
     ('Scope and lifetime', [
       'A field is declared in the class, visible to every method, and lives as long as the object does.',
       'A local is declared in a method, visible only in that method, and disappears when the method returns.',
       'A variable declared inside a block, such as a loop body, is visible only until the matching closing brace.',
       'public means any class may use the name; private means only the declaring class may.',
     ]),
     ('Shadowing', [
       'When a local has the same name as a field, the bare name means the local everywhere in that method.',
       'The field is still there, still holding its own value, and simply unreachable by that name.',
       'Two symptoms to recognize: a field that stays at its default, and a divide by zero from a count that was never accumulated.',
     ]),
   ],
   'worked': {
     'heading': 'A field and a local, side by side',
     'code': 'public class Tally\n{\n    private int total;\n    private int count;\n\n    public void add(int value)\n    {\n        total = total + value;\n        count++;\n    }\n\n    public int getTotal()\n    {\n        return total;\n    }\n\n    public int getCount()\n    {\n        return count;\n    }\n\n    public int getAverage()\n    {\n        return total / count;\n    }\n\n    public static void main(String[] args)\n    {\n        Tally t = new Tally();\n        t.add(10);\n        t.add(20);\n        t.add(30);\n        t.add(40);\n        System.out.println(t.getTotal());\n        System.out.println(t.getCount());\n        System.out.println(t.getAverage());\n    }\n}',
     'notice': [
       'add assigns the fields - no type in front, so no local is created.',
       'getAverage uses the field count - which add has been accumulating.',
       'No local anywhere shares a field name, so shadowing is impossible here.',
     ],
     'output': ['100', '4', '25'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Deliberately clean. The next slide breaks exactly one line of it, so the contrast is a single edit.',
   },
   'break_it': {
     'change': 'Add int total = 0; as the first line of add, and int count = 0; as the first line of getAverage.',
     'happens': 'getTotal returns 0 no matter how much was added, and getAverage throws ArithmeticException: '
                '/ by zero. The class compiles cleanly and the code looks right.',
     'why': 'Each added declaration creates a local that shadows the field for the rest of that method. The field '
            'is never written in one case and never read in the other. This is tonight\'s graded debugging '
            'exercise, and both symptoms appear in it together.',
     'note': 'Two different symptoms from one cause is the memorable part. Say explicitly that a stuck 0 and a '
             'divide by zero can both mean shadowing.',
   },
   'misconception': {
     'heading': 'Same name means same variable',
     'think': 'The method says total and the class says total, so they are the same thing.',
     'truth': 'A name is resolved to the nearest declaration in scope, and a local declared in the method is '
              'nearer than a field. They are two separate variables that happen to share a spelling, and the '
              'field remains untouched while the local absorbs everything. No warning appears at default '
              'settings, because declaring such a local is perfectly legal and occasionally intended.',
     'note': 'This is 3.3 again with the correct vocabulary attached. Repetition here is deliberate.',
   },
   'discussion': [
     'A class has a field total and a method that declares int total. Which does the method change?',
     'Why can a divide-by-zero in an average method be a scope bug rather than a data bug?',
   ],
   'learned': [
     'I can state the scope and lifetime of a field, a local and a loop variable.',
     'I can recognize shadowing and the symptoms it produces.',
     'I can explain the difference between public and private access.',
   ],
   'up_next': 'Day 2 uses access modifiers deliberately to control what callers can reach.',
   'extra': 'Take any class you wrote and check every method for a local that shares a field name.',
  },
  {
   'day': 2,
   'focus': 'Choosing access deliberately',
   'schedule': [
     (5, 'Bell ringer: retrieval on scope'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Choosing public and private deliberately'),
     (10, 'Worked walkthrough: tighten a leaky class, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Private fields, public behavior is the rule. State it once and apply it repeatedly.',
     'A public field is not just untidy; it removes the class\'s ability to enforce anything.',
   ],
   'warmup': ('Retrieval on scope',
     'On the board, no notes: "1. What does a bare name refer to when a local shares a field\'s name? '
     '2. Name the two symptoms of shadowing. 3. What does private guarantee?"',
     'The local; a field stuck at its default and a divide by zero; that only the declaring class can name the '
     'field. The third sets up today, and 3.6 already showed what it does NOT guarantee.'),
   'objectives': [
     ('I can choose public or private for each field and method deliberately.', 'LO 3.8.C'),
     ('I can explain why public fields remove a class\'s ability to enforce rules.', 'LO 3.8.C'),
     ('I can keep data private while exposing the behavior callers need.', 'LO 3.8.A'),
   ],
   'sections': [
     ('Choosing access', [
       'The default rule is private fields and public behavior: callers use methods, never the data directly.',
       'A public field can be set to anything by anyone, so the class can no longer enforce any rule about it.',
       'A private field with a mutator lets the class validate every change before accepting it.',
     ]),
     ('What private buys', [
       'Private fields let a class change how it stores things without breaking any caller.',
       'They also give one place to put validation, because there is one way in.',
       'Private does not protect what a method hands out by reference, which is the 3.6 rule and still applies.',
     ]),
   ],
   'worked': {
     'heading': 'Private data, validated changes',
     'code': 'public class Thermostat\n{\n    private int celsius;\n\n    public Thermostat(int celsius)\n    {\n        setCelsius(celsius);\n    }\n\n    public void setCelsius(int value)\n    {\n        if (value < 5) { value = 5; }\n        if (value > 30) { value = 30; }\n        this.celsius = value;\n    }\n\n    public int getCelsius()\n    {\n        return celsius;\n    }\n\n    public static void main(String[] args)\n    {\n        Thermostat t = new Thermostat(100);\n        System.out.println(t.getCelsius());\n        t.setCelsius(-40);\n        System.out.println(t.getCelsius());\n        t.setCelsius(21);\n        System.out.println(t.getCelsius());\n    }\n}',
     'notice': [
       'The field is private - the only way in is setCelsius.',
       'The constructor calls the setter - so construction is validated too.',
       'Out-of-range values are clamped, and the object is never invalid.',
     ],
     'output': ['30', '5', '21'],
     'caption': 'Complete and runnable as shown. Two illegal values clamped, one accepted.',
     'note': 'Ask what would happen if the field were public. Someone writes t.celsius = 500 and every rule in '
             'the class stops applying.',
   },
   'break_it': {
     'change': 'Make the celsius field public and set it directly from main.',
     'happens': 'The thermostat accepts 500 degrees. The validation code is still there, still correct, and no '
                'longer on the path anyone uses.',
     'why': 'A public field removes the class\'s only opportunity to check anything. Validation works because '
            'there is exactly one way in, and making the field public opens a second way that skips it. Private '
            'fields and public behavior is what makes the rule enforceable.',
     'note': 'The validation code being untouched is the point. Nothing was deleted and the guarantee still '
             'vanished.',
   },
   'misconception': {
     'heading': 'Access modifiers are about tidiness',
     'think': 'private is a style convention. It does not change what the program can do.',
     'truth': 'It changes what the class can GUARANTEE. With a private field and one mutator, the class can '
              'promise the temperature is always between 5 and 30, and that promise holds no matter who calls it. '
              'Make the field public and the promise is gone, because anyone can write any value without passing '
              'the check. Access control is how a class enforces its own rules.',
     'note': 'Pair with 3.6: private is necessary and not sufficient. Both halves are examinable.',
   },
   'discussion': [
     'What can a class guarantee about a private field that it cannot guarantee about a public one?',
     'Why does the constructor call setCelsius rather than assigning the field directly?',
   ],
   'learned': [
     'I can choose public or private for each field and method deliberately.',
     'I can explain why public fields remove a class\'s ability to enforce rules.',
     'I can keep data private while exposing the behavior callers need.',
   ],
   'up_next': 'Topic 3.9 introduces this, which names the field when a parameter shares its name.',
   'extra': 'Complete the graded debugging exercise for 3.8. It plants locals shadowing two different fields.',
  },
 ],
},

# ── 3.9 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.9',
 'title': 'this Keyword',
 'handle': 'ap-csa-lesson-3-9-this-keyword',
 'subtitle': 'Naming the current object explicitly, so a parameter cannot hide a field',
 'vocab': [
   ('this', 'A reference to the object whose method is currently running.'),
   ('this.field', 'An explicit reference to a field, used when a parameter shares its name.'),
   ('Self-assignment', 'Assigning a variable to itself, which compiles and does nothing.'),
   ('Parameter shadowing', 'A parameter hiding a field of the same name inside the method.'),
   ('Setter', 'A mutator that assigns a single field from its parameter.'),
   ('Implicit this', 'The this that Java assumes when you write a bare field name.'),
 ],
 'quiz': [
   {'stem': 'Inside setName(String name), the bare name refers to:',
    'options': ['The field', 'The parameter', 'Both', 'Neither'],
    'answer_index': 1,
    'why': 'The parameter is nearer, so it wins.'},
   {'stem': 'What does name = name; do inside that setter?',
    'options': ['Sets the field', 'Assigns the parameter to itself, changing nothing',
                'Fails to compile', 'Sets the field to null'],
    'answer_index': 1,
    'why': 'Both sides refer to the parameter.'},
   {'stem': 'Which correctly assigns the field?',
    'options': ['name = name;', 'this.name = name;', 'name = this.name;', 'this.name = this.name;'],
    'answer_index': 1,
    'why': 'Field on the left, parameter on the right.'},
   {'stem': 'age = this.age; inside setAge(int age) does what?',
    'options': ['Sets the field', 'Sets the parameter from the field, changing nothing that lasts',
                'Throws', 'Sets both'],
    'answer_index': 1,
    'why': 'It is backwards: the parameter is assigned and then discarded.'},
   {'stem': 'When is this required rather than optional?',
    'options': ['Always', 'When a parameter or local shares the field\'s name', 'In static methods', 'Never'],
    'answer_index': 1,
    'why': 'Otherwise the bare name already means the field.'},
   {'stem': 'this is available inside:',
    'options': ['Any method', 'Instance methods and constructors only', 'static methods only', 'main'],
    'answer_index': 1,
    'why': 'A static method has no current object, so there is no this.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'What this refers to, and when you need it',
   'schedule': [
     (6, 'Bell ringer: which one did you mean'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'this and the current object'),
     (10, 'Worked example: setters written correctly'),
     (13, 'Self-assignment and why it compiles'),
     (5, 'Misconception check: the compiler catches useless code'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'name = name; is the single most confusing line a beginner writes, because it looks obviously right.',
     'Read every assignment left to right: the LEFT is what changes. Drill that phrasing.',
   ],
   'warmup': ('Which one did you mean',
     'On the board, and the field is also called name. "What is the object\'s name after calling setName(\\"Ada\\")? Commit before we run it."',
     'Unchanged, and usually null. Most of the class will say Ada. That gap between what the line looks like and what it does is the entire topic, so collect the wrong answer in writing first.',
     'public void setName(String name) {\n    name = name;\n}'),
   'objectives': [
     ('I can explain what this refers to inside an instance method.', 'LO 3.9.A'),
     ('I can use this to assign a field when a parameter shares its name.', 'LO 3.9.B'),
     ('I can recognize a self-assignment that does nothing.', 'LO 3.9.C'),
   ],
   'sections': [
     ('this and the current object', [
       'this is a reference to the object whose method is currently running.',
       'A bare field name already means this.field, so this is usually optional.',
       'It becomes necessary when a parameter or local shares the field\'s name, because then the bare name means the parameter.',
       'A static method has no current object, so this does not exist there.',
     ]),
     ('Self-assignment', [
       'name = name; assigns the parameter to itself. It compiles, runs, and changes nothing.',
       'age = this.age; is the same mistake backwards: it assigns the parameter from the field and then discards it.',
       'Read every assignment left to right. The variable on the LEFT is the one being changed.',
     ]),
   ],
   'worked': {
     'heading': 'Setters written correctly',
     'code': 'public class Person\n{\n    private String name;\n    private int age;\n\n    public Person(String name, int age)\n    {\n        this.name = name;\n        this.age = age;\n    }\n\n    public String getName()\n    {\n        return name;\n    }\n\n    public int getAge()\n    {\n        return age;\n    }\n\n    public void setName(String name)\n    {\n        this.name = name;\n    }\n\n    public void setAge(int age)\n    {\n        this.age = age;\n    }\n\n    public static void main(String[] args)\n    {\n        Person p = new Person("Ada", 36);\n        System.out.println(p.getName());\n        p.setName("Grace");\n        p.setAge(45);\n        System.out.println(p.getName());\n        System.out.println(p.getAge());\n    }\n}',
     'notice': [
       'this.name on the LEFT - the field is what changes.',
       'name on the right - the parameter is what is read.',
       'getName needs no this - nothing there shares the name.',
     ],
     'output': ['Ada', 'Grace', '45'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Every correct line has the field on the left and the parameter on the right. Say that sentence and '
             'have them write it in the notes; it settles every version of this bug.',
   },
   'break_it': {
     'change': 'Change setName to name = name; and setAge to age = this.age;',
     'happens': 'setName leaves the name as Ada forever and setAge leaves the age at 36. Both setters compile, '
                'run, and do nothing at all.',
     'why': 'In the first, both sides are the parameter, so the parameter is assigned to itself. In the second '
            'the field is on the right, so it is only read, and the parameter it was copied into vanishes when '
            'the method returns. Field on the left, parameter on the right. This is tonight\'s graded debugging '
            'exercise.',
     'note': 'Show both broken forms. Students who only see the first one do not recognize the reversed version, '
             'which is just as common.',
   },
   'misconception': {
     'heading': 'The compiler warns about code that does nothing',
     'think': 'name = name; obviously does nothing, so Java would tell me.',
     'truth': 'It is a syntactically perfect assignment of a variable to itself, and assigning a variable to '
              'itself is legal. The compiler checks grammar and types, and both are fine here. It has no way to '
              'know you meant the field, because meaning is not its job. The only defense is reading the line '
              'and asking which variable each name refers to.',
     'note': 'Third time this unit that "it compiles" has proven nothing. That repetition is the point.',
   },
   'discussion': [
     'Why does name = name; compile without any warning?',
     'When is this optional, and when is it required?',
   ],
   'learned': [
     'I can explain what this refers to inside an instance method.',
     'I can use this to assign a field when a parameter shares its name.',
     'I can recognize a self-assignment that does nothing.',
   ],
   'up_next': 'Day 2 uses this to pass the current object and to chain constructors, closing the unit.',
   'extra': 'Write a Point class with setX and setY, using this in both. Test that both setters actually work.',
  },
  {
   'day': 2,
   'focus': 'Passing this, chaining constructors, and closing the unit',
   'schedule': [
     (5, 'Bell ringer: retrieval on this'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Passing the current object, and this(...) revisited'),
     (10, 'Worked walkthrough: a class using this three ways, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket and unit review preview'),
   ],
   'notes': [
     'Three uses of this in one lesson: name the field, chain a constructor, pass the object. Keep them distinct.',
     'Last topic of the unit. Leave five minutes to preview the unit test.',
   ],
   'warmup': ('Retrieval on this',
     'On the board, no notes: "1. What does this refer to? 2. When is it required? 3. Which side of an '
     'assignment changes?"',
     'The current object; when a parameter shares the field name; the left. All three are one sentence each and '
     'all three have been bugs this unit.'),
   'objectives': [
     ('I can pass the current object to another method using this.', 'LO 3.9.A'),
     ('I can use this(...) to chain constructors.', 'LO 3.9.B'),
     ('I can name the three distinct uses of this.', 'LO 3.9.C'),
   ],
   'sections': [
     ('Three uses of this', [
       'this.field names a field explicitly, which is needed when a parameter shares its name.',
       'this(...) as a constructor\'s first statement calls another constructor of the same class.',
       'this on its own is a reference to the current object, so it can be passed to another method.',
     ]),
     ('Closing the unit', [
       'Every bug in this unit compiled cleanly, which is what makes Unit 3 different from Units 1 and 2.',
       'The diagnostic questions are: are the fields actually assigned, does any name shadow another, and does any accessor change what it reports?',
       'Printing the object\'s state immediately after construction answers the first one in seconds.',
     ]),
   ],
   'worked': {
     'heading': 'this, three ways',
     'code': 'public class Node\n{\n    private int value;\n    private String label;\n\n    public Node(int value, String label)\n    {\n        this.value = value;\n        this.label = label;\n    }\n\n    public Node(int value)\n    {\n        this(value, "unlabelled");\n    }\n\n    public int getValue()\n    {\n        return value;\n    }\n\n    public String getLabel()\n    {\n        return label;\n    }\n\n    public boolean sameValueAs(Node other)\n    {\n        return this.value == other.getValue();\n    }\n\n    public static void main(String[] args)\n    {\n        Node a = new Node(5, "first");\n        Node b = new Node(5);\n        System.out.println(a.getLabel());\n        System.out.println(b.getLabel());\n        System.out.println(a.sameValueAs(b));\n    }\n}',
     'notice': [
       'this.value = value - naming the field past a parameter.',
       'this(value, "unlabelled") - chaining to the other constructor.',
       'this.value == other.getValue() - comparing the current object with another.',
     ],
     'output': ['first', 'unlabelled', 'true'],
     'caption': 'Complete and runnable as shown. All three uses of this in one class.',
     'note': 'Point at each use and name it. Students who can say which of the three they are looking at stop '
             'treating this as a magic word.',
   },
   'break_it': {
     'change': 'Change sameValueAs to compare this.value == other.value, then make value public so it compiles.',
     'happens': 'It works, and the class has just given up its encapsulation to save four characters. Any code '
                'anywhere can now read and write the value directly.',
     'why': 'Reaching into another object\'s field is possible inside the same class, and it makes the field '
            'public to everyone else too if you loosen the modifier to allow it. Calling the accessor costs '
            'nothing and keeps the guarantee. This closes the loop with 3.8: access is how a class enforces '
            'its rules.',
     'note': 'Note honestly that this.value == other.value compiles inside the same class even with private '
             'fields. The bug here is the modifier change, not the comparison.',
   },
   'misconception': {
     'heading': 'this is only for constructors',
     'think': 'You use this in constructors to set fields, and nowhere else.',
     'truth': 'It has three distinct jobs. Naming a field past a parameter is the one seen most often and it '
              'happens in setters as much as in constructors. Chaining constructors with this(...) is the second. '
              'Passing the current object to another method, as this on its own, is the third and the one that '
              'makes comparison and callback methods possible. All three refer to the same thing: the object '
              'whose method is running right now.',
     'note': 'Finish the unit by naming all three. It ties 3.4, 3.8 and 3.9 together.',
   },
   'discussion': [
     'What are the three uses of this, and what do they have in common?',
     'Every bug in this unit compiled cleanly. What three questions would you ask when a class misbehaves?',
   ],
   'learned': [
     'I can pass the current object to another method using this.',
     'I can use this(...) to chain constructors.',
     'I can name the three distinct uses of this.',
   ],
   'up_next': 'The Unit 3 test covers class design, constructors, methods, references, static and scope.',
   'extra': 'Complete the graded debugging exercise for 3.9. It plants both directions of the self-assignment.',
  },
 ],
},
]
