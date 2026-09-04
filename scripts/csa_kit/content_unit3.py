"""
AP CSA Unit 3 teacher-kit content: Class Creation, topics 3.1 - 3.9.

Same schema and same rules as Unit 2. The break-it and misconception slides
mirror the graded debugging exercises in seed/csa-debug-unit3.js.

WHAT MAKES UNIT 3 DIFFERENT TO TEACH
Units 1 and 2 fail loudly: wrong output, a crash, an off-by-one you can see.
Unit 3 fails silently. The class compiles, looks textbook-correct, and every
getter returns 0 or every count returns 1. A student whose only debugging
technique is reading the error message has nothing to read. Every day in this
unit therefore spends its break-it slide on a bug that produces no message at
all, and the misconception slides name the reasoning error underneath it.

No em-dashes anywhere.
"""

TOPICS = [

# ── 3.1 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.1',
 'title': 'Abstraction and Program Design',
 'handle': 'ap-csa-lesson-3-1-abstraction-and-program-design',
 'subtitle': 'Hiding detail behind a name, and writing each rule exactly once',
 'vocab': [
   ('Abstraction', 'Hiding detail behind a name so a caller can use something without knowing how it works.'),
   ('Encapsulation', 'Keeping data and the methods that operate on it together, with the data private.'),
   ('Procedural abstraction', 'Naming a piece of work as a method so callers use the name rather than the steps.'),
   ('Duplication', 'The same rule written in more than one place, where copies can fall out of step.'),
   ('Delegation', 'One method calling another rather than recomputing what it already knows.'),
   ('Single source of truth', 'One place where a fact or rule lives, so it cannot disagree with itself.'),
 ],
 'quiz': [
   {'stem': 'What is the main risk of writing the same rule in two methods?',
    'options': ['It runs slower', 'A later edit updates one copy and not the other',
                'It uses more memory', 'It will not compile'],
    'answer_index': 1,
    'why': 'Duplication is a correctness risk, not a performance one. The copies drift.'},
   {'stem': 'A method that calls another method of the same object writes it as:',
    'options': ['this.getSubtotal()', 'getSubtotal()', 'Both A and B work', 'Object.getSubtotal()'],
    'answer_index': 2,
    'why': 'Both are legal; the bare call is the common form and this. is explicit.'},
   {'stem': 'Abstraction lets a caller:',
    'options': ['See the implementation', 'Use a name without knowing the steps',
                'Change private fields', 'Skip the constructor'],
    'answer_index': 1,
    'why': 'That is what hiding detail behind a name means.'},
   {'stem': 'How many times should a tax rate appear in a correct class?',
    'options': ['Once', 'Once per method that needs it', 'Twice for safety', 'It does not matter'],
    'answer_index': 0,
    'why': 'Every extra copy is a place a future edit can be forgotten.'},
   {'stem': 'getTotal recomputes the subtotal by hand instead of calling getSubtotal. This is:',
    'options': ['Faster', 'Duplication that can drift from the real rule', 'Required', 'Encapsulation'],
    'answer_index': 1,
    'why': 'The two now express the same rule twice and can disagree.'},
   {'stem': 'Which best describes encapsulation?',
    'options': ['Writing short methods', 'Keeping data private and exposing behavior',
                'Using many classes', 'Avoiding constructors'],
    'answer_index': 1,
    'why': 'Data is hidden; the methods define what callers may do with it.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'What abstraction buys, and why a rule belongs in one place',
   'schedule': [
     (6, 'Bell ringer: the thing you use without understanding'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Abstraction and encapsulation'),
     (10, 'Worked example: one rule, one method'),
     (13, 'Duplication and how it drifts'),
     (5, 'Misconception check: copy and paste is harmless'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'Keep this concrete. Abstraction taught in the abstract is the reason students find Unit 3 vague.',
     'The drifted-copy story is the hook. Everyone has edited one of two copies at some point.',
   ],
   'warmup': ('The thing you use without understanding',
     'On the board: "Name three things you used this morning without knowing how they work internally. '
     'For each one, what do you actually need to know to use it?"',
     'Steer toward: you need the interface, not the mechanism. A light switch, a car, Math.sqrt. That gap '
     'between what you must know and what you may ignore IS abstraction, and they already rely on it constantly.'),
   'objectives': [
     ('I can explain what abstraction hides and what it exposes.', 'LO 3.1.A'),
     ('I can identify duplicated logic in a class.', 'LO 3.1.B'),
     ('I can refactor duplicated logic into a single method that others call.', 'LO 3.1.B'),
   ],
   'sections': [
     ('Abstraction and encapsulation', [
       'Abstraction hides detail behind a name, so a caller can use something without knowing how it works.',
       'Encapsulation keeps the data private and exposes behavior, so the class controls how its data can change.',
       'A well-named method IS an abstraction: getSubtotal says what you get without saying how it is computed.',
     ]),
     ('Duplication and drift', [
       'When the same rule is written twice, the two copies are correct only until somebody edits one of them.',
       'A rule should appear exactly once. Every other place that needs it calls the one that has it.',
       'A method calling another method of the same object needs no dot and no object name in front of it.',
     ]),
   ],
   'worked': {
     'heading': 'One rule, one method',
     'code': 'public class Receipt\n{\n    private int unitPrice;\n    private int quantity;\n\n    public Receipt(int unitPrice, int quantity)\n    {\n        this.unitPrice = unitPrice;\n        this.quantity = quantity;\n    }\n\n    public int getSubtotal()\n    {\n        return unitPrice * quantity;\n    }\n\n    public int getTax()\n    {\n        return getSubtotal() * 8 / 100;\n    }\n\n    public int getTotal()\n    {\n        return getSubtotal() + getTax();\n    }\n\n    public static void main(String[] args)\n    {\n        Receipt r = new Receipt(250, 4);\n        System.out.println(r.getSubtotal());\n        System.out.println(r.getTax());\n        System.out.println(r.getTotal());\n    }\n}',
     'notice': [
       'getSubtotal() called, not recomputed - the rule lives in one place.',
       'The number 8 appears exactly once in the whole class.',
       'getTotal delegates to both - it knows nothing about prices or rates.',
     ],
     'output': ['1000', '80', '1080'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Ask how many places you would edit to change the tax rate. One. Then ask the same question about '
             'the broken version on the next slide.',
   },
   'break_it': {
     'change': 'Write the tax calculation out by hand a second time inside getTotal, then change the rate in only '
               'one of the two places.',
     'happens': 'getTax and getTotal now disagree, and which answer you get depends on which method you happened '
                'to call. Both compile and both look reasonable.',
     'why': 'Two copies of one rule are correct only until someone edits one of them, and that edit is invisible '
            'at the other copy. This is the whole argument for abstraction, and it is tonight\'s graded debugging '
            'exercise: the starter already has the two copies out of step.',
     'note': 'Do the edit live and deliberately forget the second copy. Watching it happen is more convincing '
             'than being warned about it.',
   },
   'misconception': {
     'heading': 'Copy and paste is harmless if the code is correct',
     'think': 'The copied lines work, so having two of them cannot cause a bug.',
     'truth': 'Both copies are correct on the day you paste them. The bug arrives later, when a requirement '
              'changes and you update the copy you are looking at. Nothing links the two, nothing warns you, and '
              'the class now answers the same question two different ways depending on which method the caller '
              'used. Duplication is not a style problem; it is a correctness problem with a delay on it.',
     'note': 'The delay is the point. That is why it survives code review and shows up in production.',
   },
   'discussion': [
     'How many places would you edit to change the tax rate in a well-designed class? In a duplicated one?',
     'Name a method you have used this year whose implementation you have never seen. What did you need to know?',
   ],
   'learned': [
     'I can explain what abstraction hides and what it exposes.',
     'I can identify duplicated logic in a class.',
     'I can refactor duplicated logic into a single method that others call.',
   ],
   'up_next': 'Day 2 looks at how design decisions change what a class can safely be asked to do.',
   'extra': 'Find any two methods in your own code that compute the same thing. Make one call the other.',
  },
  {
   'day': 2,
   'focus': 'Design decisions and their consequences',
   'schedule': [
     (5, 'Bell ringer: retrieval on duplication'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Naming, and designing what a class exposes'),
     (10, 'Worked walkthrough: refactor a duplicated class, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Refactor live, in front of them, in small steps. The habit is what transfers, not the finished class.',
     'Naming is genuinely part of design. Give it real time rather than treating it as a nicety.',
   ],
   'warmup': ('Retrieval on duplication',
     'On the board, no notes: "1. How many times should one rule appear in a class? 2. What goes wrong with two '
     'copies, and when? 3. How does one method call another on the same object?"',
     'Once; they drift when one is edited later; just the method name with no dot. The "and when" in question 2 '
     'is what separates understanding from repetition.'),
   'objectives': [
     ('I can choose method names that describe what a caller gets.', 'LO 3.1.A'),
     ('I can refactor a class so each rule appears exactly once.', 'LO 3.1.B'),
     ('I can explain how a design decision affects what callers can do.', 'LO 3.1.C'),
   ],
   'sections': [
     ('Naming and design', [
       'A method name should say what the caller gets, not how it is produced. getSubtotal, not multiplyPriceByQty.',
       'Names are the interface. A caller reads the name and never the body, so a misleading name is a broken abstraction.',
       'Deciding what a class exposes is a design decision, and it decides what callers are able to do wrong.',
     ]),
     ('Refactoring safely', [
       'Refactoring changes the structure without changing the behavior, so the outputs before and after must match.',
       'Work in small steps and re-run after each one. A large refactor that fails gives you no information about where.',
       'When two methods compute the same thing, keep the clearer one and make the other call it.',
     ]),
   ],
   'worked': {
     'heading': 'The same class, after refactoring',
     'code': 'public class Order\n{\n    private int itemTotal;\n    private int shipping;\n\n    public Order(int shipping)\n    {\n        this.shipping = shipping;\n        this.itemTotal = 0;\n    }\n\n    public void addItem(int price)\n    {\n        itemTotal = itemTotal + price;\n    }\n\n    public int getItemTotal()\n    {\n        return itemTotal;\n    }\n\n    public int getTotal()\n    {\n        return getItemTotal() + shipping;\n    }\n\n    public static void main(String[] args)\n    {\n        Order o = new Order(500);\n        o.addItem(100);\n        o.addItem(200);\n        System.out.println(o.getItemTotal());\n        System.out.println(o.getTotal());\n        System.out.println(o.getTotal());\n    }\n}',
     'notice': [
       'getTotal calls getItemTotal - no second copy of the sum.',
       'getTotal printed twice - and gives the same answer both times.',
       'addItem is the only method that changes anything.',
     ],
     'output': ['300', '800', '800'],
     'caption': 'Complete and runnable as shown. The total is asked for twice and does not move.',
     'note': 'The repeated getTotal is deliberate. It is the test for tomorrow\'s topic, planted a day early.',
   },
   'break_it': {
     'change': 'Have getTotal add the shipping into the itemTotal field before returning it.',
     'happens': 'The first call returns 800 and the second returns 1300. Asking the same question twice gives two '
                'different answers, and nothing in the code looks unusual.',
     'why': 'A method that reports should not change what it reports on. Storing into the field means every call '
            'compounds the last one. This is topic 3.2 and it is tonight\'s graded debugging exercise.',
     'note': 'Print it three times and let them watch it climb: 800, 1300, 1800. The pattern is the diagnosis.',
   },
   'misconception': {
     'heading': 'A refactor is finished when it compiles',
     'think': 'I restructured the class and it compiles, so the refactor worked.',
     'truth': 'Refactoring means changing the structure WITHOUT changing the behavior, so compiling proves only '
              'half of it. The other half is that the outputs match what they were before. Run the same inputs '
              'through the old and new versions and compare. If you did not check the outputs, you did not '
              'refactor; you rewrote and hoped.',
     'note': 'Connects straight back to 1.1: compiling proves valid Java, never correct behavior.',
   },
   'discussion': [
     'Why is a misleading method name a broken abstraction rather than just untidy?',
     'What would you run to convince yourself a refactor changed nothing?',
   ],
   'learned': [
     'I can choose method names that describe what a caller gets.',
     'I can refactor a class so each rule appears exactly once.',
     'I can explain how a design decision affects what callers can do.',
   ],
   'up_next': 'Topic 3.2 looks at what happens when a method quietly changes the object it was only meant to report on.',
   'extra': 'Complete the graded debugging exercise for 3.1. It plants a duplicated rate already out of step.',
  },
 ],
},

# ── 3.2 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.2',
 'title': 'Impact of Program Design',
 'handle': 'ap-csa-lesson-3-2-impact-of-program-design',
 'subtitle': 'Accessors, mutators, and methods that must not change what they report',
 'vocab': [
   ('Accessor', 'A method that reports a value without changing the object. Usually named get something.'),
   ('Mutator', 'A method that changes the state of the object. Usually named set, add or update something.'),
   ('Side effect', 'A change made by a method beyond returning its value.'),
   ('State', 'The current values of an object\'s fields.'),
   ('Idempotent', 'Giving the same result however many times it is called.'),
   ('Contract', 'What a caller is entitled to assume about a method\'s behavior.'),
 ],
 'quiz': [
   {'stem': 'An accessor should:',
    'options': ['Change and report', 'Report without changing', 'Change without reporting', 'Call the constructor'],
    'answer_index': 1,
    'why': 'Reporting without changing is exactly what makes it an accessor.'},
   {'stem': 'getTotal returns 800 then 1300 then 1800 on three calls. The cause is:',
    'options': ['An overflow', 'A side effect storing into a field', 'A rounding error', 'A missing constructor'],
    'answer_index': 1,
    'why': 'Each call is adding to the stored state, so the calls compound.'},
   {'stem': 'Why is a side effect in a getter hard to debug?',
    'options': ['It crashes randomly', 'Investigating it changes the result',
                'It only happens in production', 'The compiler hides it'],
    'answer_index': 1,
    'why': 'Calling the getter to inspect the object also mutates the object.'},
   {'stem': 'Which method name suggests a mutator?',
    'options': ['getCount', 'isEmpty', 'addItem', 'size'],
    'answer_index': 2,
    'why': 'add changes the object; the others report.'},
   {'stem': 'The safest way to make getTotal correct is to:',
    'options': ['Store the result in a field', 'Compute and return without assigning',
                'Reset the field first', 'Make it static'],
    'answer_index': 1,
    'why': 'Computing in the return statement leaves the state untouched.'},
   {'stem': 'Which field should addItem change?',
    'options': ['Only the total', 'Only the count', 'Both, by the right amounts', 'Neither'],
    'answer_index': 2,
    'why': 'It is the mutator for both, and each must move by the correct amount.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'Accessors, mutators, and the cost of a side effect',
   'schedule': [
     (6, 'Bell ringer: the measurement that changes the thing'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Accessors and mutators'),
     (10, 'Worked example: call the getter three times'),
     (13, 'Side effects and why they hide'),
     (5, 'Misconception check: a getter can tidy up while it is there'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The three-calls test is the diagnostic tool of the day. Make every student use it.',
     'Name the categories explicitly. Accessor and mutator are the vocabulary the exam uses.',
   ],
   'warmup': ('The measurement that changes the thing',
     'On the board: "Name a measurement that changes what it measures. Checking tyre pressure lets a little air '
     'out. Two more, thirty seconds each."',
     'Once they have two, ask what that would mean for a program: you could never trust a reading, because '
     'reading it moved it. That is exactly what a getter with a side effect does.'),
   'objectives': [
     ('I can distinguish an accessor from a mutator.', 'LO 3.2.A'),
     ('I can identify a side effect in a method that should not have one.', 'LO 3.2.B'),
     ('I can test for a side effect by calling a method more than once.', 'LO 3.2.C'),
   ],
   'sections': [
     ('Accessors and mutators', [
       'An accessor reports a value and leaves the object exactly as it found it.',
       'A mutator changes the state of the object. Names like add, set and update signal one.',
       'Mixing the two makes an object impossible to reason about, because reading it also changes it.',
     ]),
     ('Finding side effects', [
       'Call the method three times in a row with nothing in between. A correct accessor gives the same answer each time.',
       'A climbing sequence such as 800, 1300, 1800 means the method is adding to stored state on every call.',
       'Compute in the return statement rather than assigning to a field, and the side effect cannot exist.',
     ]),
   ],
   'worked': {
     'heading': 'Call the getter three times',
     'code': 'public class Order\n{\n    private int itemTotal;\n    private int shipping;\n    private int count;\n\n    public Order(int shipping)\n    {\n        this.shipping = shipping;\n    }\n\n    public void addItem(int price)\n    {\n        itemTotal = itemTotal + price;\n        count = count + 1;\n    }\n\n    public int getCount()\n    {\n        return count;\n    }\n\n    public int getTotal()\n    {\n        return itemTotal + shipping;\n    }\n\n    public static void main(String[] args)\n    {\n        Order o = new Order(500);\n        o.addItem(100);\n        o.addItem(200);\n        o.addItem(300);\n        System.out.println(o.getCount());\n        System.out.println(o.getTotal());\n        System.out.println(o.getTotal());\n        System.out.println(o.getTotal());\n    }\n}',
     'notice': [
       'getTotal computes in the return - no field is written.',
       'Called three times - and the answer does not move.',
       'addItem is the only mutator, and it changes both fields.',
     ],
     'output': ['3', '1100', '1100', '1100'],
     'caption': 'Complete and runnable as shown. Three identical totals.',
     'note': 'Three identical numbers is not padding. It is the test, and students should copy the habit into '
             'their own testing.',
   },
   'break_it': {
     'change': 'Change getTotal to store its result: itemTotal = itemTotal + shipping; return itemTotal;',
     'happens': 'The three totals become 1100, 1600, 2100. Nothing was added between the calls and the object '
                'grew anyway.',
     'why': 'The getter is now a mutator wearing a getter\'s name. Every call compounds the last, so the value '
            'depends on how many times anyone has looked at it. This is tonight\'s graded debugging exercise, '
            'along with a counter that moves by two instead of one.',
     'note': 'Ask what this would do to a debugging session. Every println you add to investigate makes it worse, '
             'which is the cruellest property a bug can have.',
   },
   'misconception': {
     'heading': 'A getter may as well do a little work while it is there',
     'think': 'getTotal is already computing the total, so it might as well store it and save doing it again.',
     'truth': 'Storing it turns reporting into changing. The next caller gets a different answer, and so does the '
              'one after that, and the object no longer has a single true total. Caching a computed value is a '
              'real technique, and it requires the cache to be invalidated whenever the inputs change, which is '
              'considerably more work than the multiplication you were trying to avoid.',
     'note': 'Acknowledge that caching is legitimate. Students should hear that the instinct is fine and the '
             'execution here is not.',
   },
   'discussion': [
     'How would you detect a side effect in a getter without reading its code?',
     'Why does a side effect in an accessor make debugging harder rather than just producing a wrong number?',
   ],
   'learned': [
     'I can distinguish an accessor from a mutator.',
     'I can identify a side effect in a method that should not have one.',
     'I can test for a side effect by calling a method more than once.',
   ],
   'up_next': 'Day 2 designs a class from a specification, deciding which methods report and which change.',
   'extra': 'Take any class you have written and call each getter twice. Do any of them disagree with themselves?',
  },
  {
   'day': 2,
   'focus': 'Designing a class from a specification',
   'schedule': [
     (5, 'Bell ringer: retrieval on accessors'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Turning a specification into fields and methods'),
     (10, 'Worked walkthrough: design a class live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Fields first, then mutators, then accessors. That order stops students inventing methods they do not need.',
     'A field that no method ever reads is a design smell worth naming.',
   ],
   'warmup': ('Retrieval on accessors',
     'On the board, no notes: "1. What must an accessor not do? 2. How do you test for a side effect? '
     '3. What does a climbing sequence of returns tell you?"',
     'Not change the object; call it repeatedly; that the method is writing to state. All three should be fast '
     'after yesterday.'),
   'objectives': [
     ('I can decide what fields a class needs from its specification.', 'LO 3.2.A'),
     ('I can decide which methods report and which change state.', 'LO 3.2.B'),
     ('I can justify each field by naming the method that uses it.', 'LO 3.2.C'),
   ],
   'sections': [
     ('From specification to class', [
       'List the facts the object must remember. Those become the fields.',
       'List the things that happen to it. Those become the mutators.',
       'List the questions callers will ask. Those become the accessors.',
       'A field that no method reads is either dead or a missing method.',
     ]),
     ('Keeping the roles separate', [
       'Give each method one job: either it changes the object or it reports on it, never both.',
       'Mutators usually return void. Accessors always return something and change nothing.',
       'When a method wants to do both, that is usually two methods.',
     ]),
   ],
   'worked': {
     'heading': 'A class designed from three sentences',
     'code': 'public class Locker\n{\n    private int capacity;\n    private int used;\n\n    public Locker(int capacity)\n    {\n        this.capacity = capacity;\n        this.used = 0;\n    }\n\n    public void store(int units)\n    {\n        used = used + units;\n    }\n\n    public int getUsed()\n    {\n        return used;\n    }\n\n    public int getFree()\n    {\n        return capacity - used;\n    }\n\n    public boolean isFull()\n    {\n        return used >= capacity;\n    }\n\n    public static void main(String[] args)\n    {\n        Locker l = new Locker(10);\n        l.store(4);\n        System.out.println(l.getUsed());\n        System.out.println(l.getFree());\n        System.out.println(l.isFull());\n        l.store(6);\n        System.out.println(l.getFree());\n        System.out.println(l.isFull());\n    }\n}',
     'notice': [
       'Two fields - capacity is remembered, used is tracked.',
       'store is the only mutator - everything else reports.',
       'getFree computes - it is derived, so it is not a field.',
     ],
     'output': ['4', '6', 'false', '0', 'true'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Ask why free is not a field. Because it is always capacity minus used, and storing it would create '
             'a second place for the truth to live. That is 3.1, applied.',
   },
   'break_it': {
     'change': 'Add a free field, set it in the constructor, and forget to update it inside store.',
     'happens': 'getFree keeps reporting the original capacity no matter how much is stored. isFull still works, '
                'so half the class is right.',
     'why': 'A derived value stored as a field has to be maintained everywhere the inputs change, and the '
            'maintenance is easy to forget. Computing it on demand cannot go stale. Storing what you can derive '
            'is the same duplication problem as 3.1 wearing different clothes.',
     'note': 'Point out that isFull still works. Partially correct classes are much harder to diagnose than '
             'completely broken ones.',
   },
   'misconception': {
     'heading': 'Every value a class reports should be a field',
     'think': 'The class reports the free space, so it needs a free field to hold it.',
     'truth': 'Fields hold what must be REMEMBERED. Anything that can be worked out from what is already stored '
              'should be computed when asked. A stored derived value has to be updated everywhere its inputs '
              'change, and the day someone adds a new mutator and forgets, the class starts reporting a number '
              'that was true earlier and is not true now.',
     'note': 'Same underlying rule as 3.1: one place for each fact.',
   },
   'discussion': [
     'Which values in a bank account class should be fields, and which should be computed?',
     'What does it tell you if a class has a field that no method ever reads?',
   ],
   'learned': [
     'I can decide what fields a class needs from its specification.',
     'I can decide which methods report and which change state.',
     'I can justify each field by naming the method that uses it.',
   ],
   'up_next': 'Topic 3.3 opens up the class itself: fields, constructors and methods, and how they fit together.',
   'extra': 'Complete the graded debugging exercise for 3.2. It plants a getter with a side effect.',
  },
 ],
},

# ── 3.3 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.3',
 'title': 'Anatomy of a Class',
 'handle': 'ap-csa-lesson-3-3-anatomy-of-a-class',
 'subtitle': 'Fields, constructors and methods, and the difference between declaring and assigning',
 'vocab': [
   ('Field', 'A variable declared in the class and belonging to each object.'),
   ('Instance variable', 'Another name for a field: each object gets its own copy.'),
   ('Local variable', 'A variable declared inside a method, which disappears when the method returns.'),
   ('Declaration', 'A statement with a type in front of a name, which creates something new.'),
   ('Assignment', 'A statement without a type, which changes something that already exists.'),
   ('Default value', 'The value a field holds before it is assigned: 0 for numbers, null for objects.'),
 ],
 'quiz': [
   {'stem': 'What is the default value of an int field before assignment?',
    'options': ['null', '0', 'Undefined', 'A compile error'],
    'answer_index': 1,
    'why': 'Numeric fields default to 0; object fields default to null.'},
   {'stem': 'int width = w; inside a constructor does what?',
    'options': ['Assigns the field', 'Declares a new local variable', 'Fails to compile', 'Assigns then discards'],
    'answer_index': 1,
    'why': 'A type in front of the name is a declaration, so it creates a local that dies at the closing brace.'},
   {'stem': 'Every getter in a class returns 0. The most likely cause is:',
    'options': ['A bad constructor call', 'The fields were never assigned',
                'Integer overflow', 'A missing return'],
    'answer_index': 1,
    'why': 'Zero from every getter is the signature of untouched fields.'},
   {'stem': 'Where do fields belong?',
    'options': ['Inside the constructor', 'Inside main', 'In the class body, outside every method', 'In a method'],
    'answer_index': 2,
    'why': 'They are declared in the class so every method can see them.'},
   {'stem': 'What is the difference between a declaration and an assignment?',
    'options': ['None', 'A declaration has a type and creates something new',
                'Assignment is faster', 'Declarations only work in methods'],
    'answer_index': 1,
    'why': 'The type is what makes it a declaration.'},
   {'stem': 'A local variable declared in a method exists:',
    'options': ['For the life of the object', 'Until the method returns', 'Until reassigned', 'Forever'],
    'answer_index': 1,
    'why': 'Its scope is the method, so it disappears at the closing brace.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'The parts of a class, and where variables live',
   'schedule': [
     (6, 'Bell ringer: label the parts'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Fields, constructors and methods'),
     (10, 'Worked example: a complete small class'),
     (13, 'Declaration versus assignment'),
     (5, 'Misconception check: every getter returns zero'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The zero-from-every-getter signature is the single most useful diagnostic in this unit. Say it twice.',
     'Have students point at the type keyword. That one word is the whole declaration-versus-assignment lesson.',
   ],
   'warmup': ('Label the parts',
     'On the board, a small class with no labels: "Point at the fields. Point at the constructor. Point at a '
     'method. How did you tell the constructor apart from the methods?"',
     'The constructor has the class name and no return type. That is the identifying feature, and it comes back '
     'as a real bug in 3.4, so make sure everyone can state it today.'),
   'objectives': [
     ('I can identify the fields, constructor and methods of a class.', 'LO 3.3.A'),
     ('I can explain the difference between a declaration and an assignment.', 'LO 3.3.B'),
     ('I can recognize the symptom of fields that were never assigned.', 'LO 3.3.C'),
   ],
   'sections': [
     ('The parts of a class', [
       'Fields are declared in the class body, outside every method, and each object gets its own copy.',
       'The constructor has the same name as the class and no return type at all. Its job is to set the fields up.',
       'Methods define what the object can do. They can all see the fields because the fields belong to the object.',
       'Fields have default values before assignment: 0 for numbers, false for boolean, null for objects.',
     ]),
     ('Declaration versus assignment', [
       'A type in front of a name is a DECLARATION and it creates something new.',
       'Without the type it is an ASSIGNMENT to something that already exists.',
       'Writing int width = w; inside a constructor creates a second, temporary width, and the field stays at 0.',
       'The compiler accepts this happily, because declaring a local with the same name as a field is legal.',
     ]),
   ],
   'worked': {
     'heading': 'A complete small class',
     'code': 'public class Box\n{\n    private int width;\n    private int height;\n\n    public Box(int w, int h)\n    {\n        width = w;\n        height = h;\n    }\n\n    public int getWidth()\n    {\n        return width;\n    }\n\n    public int getHeight()\n    {\n        return height;\n    }\n\n    public int getArea()\n    {\n        return width * height;\n    }\n\n    public static void main(String[] args)\n    {\n        Box b = new Box(3, 4);\n        System.out.println(b.getWidth());\n        System.out.println(b.getHeight());\n        System.out.println(b.getArea());\n    }\n}',
     'notice': [
       'width = w - assignment, no type, so it reaches the field.',
       'Fields declared once, at the top, outside every method.',
       'getArea computes from the fields rather than storing a third one.',
     ],
     'output': ['3', '4', '12'],
     'caption': 'Complete and runnable as shown.',
     'note': 'Point at the constructor body and ask what would change if the word int appeared in front of width. '
             'Everything, and nothing visible.',
   },
   'break_it': {
     'change': 'Put int in front of both assignments in the constructor: int width = w; int height = h;',
     'happens': 'Every getter now returns 0 and getArea returns 0. The constructor plainly assigns the values and '
                'the object plainly does not have them.',
     'why': 'The type turns each line into a declaration, creating brand new local variables that vanish at the '
            'closing brace. The fields are never touched and keep their default 0. Nothing warns you, because '
            'declaring a local that shadows a field is perfectly legal. Tonight\'s graded debugging exercise '
            'plants exactly this.',
     'note': 'Zero from every getter is a signature worth memorising. Say out loud: "all zeros means the fields '
             'were never assigned", and have them write it in the notes.',
   },
   'misconception': {
     'heading': 'A variable is a variable, wherever you write it',
     'think': 'I wrote width = something in the constructor, so the object has that width.',
     'truth': 'Where a variable is declared decides how long it lives and who can see it. A field lives as long '
              'as the object and every method can reach it. A local lives until its method returns and nothing '
              'else can see it at all. Adding a type inside a method silently creates the second kind, and the '
              'field you meant to set keeps its default value.',
     'note': 'The word "silently" is doing the work. Emphasize that no warning appears at default settings.',
   },
   'discussion': [
     'Every getter in a class returns 0. What are the two most likely causes, and how would you tell them apart?',
     'Why does the compiler allow a local variable with the same name as a field?',
   ],
   'learned': [
     'I can identify the fields, constructor and methods of a class.',
     'I can explain the difference between a declaration and an assignment.',
     'I can recognize the symptom of fields that were never assigned.',
   ],
   'up_next': 'Day 2 writes a class from scratch and tests each part as it is added.',
   'extra': 'Write a Rectangle class with two fields, a constructor and three getters. Test every getter.',
  },
  {
   'day': 2,
   'focus': 'Writing a class from scratch, and testing each part',
   'schedule': [
     (5, 'Bell ringer: retrieval on fields'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Building a class one part at a time'),
     (10, 'Worked walkthrough: add and test incrementally, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Build it live in four steps, running after each. The habit of testing as you go is the transferable skill.',
     'Resist writing the whole class then running it. That is what students do and why they cannot locate bugs.',
   ],
   'warmup': ('Retrieval on fields',
     'On the board, no notes: "1. What is the default value of an int field? 2. What does a type in front of a '
     'name mean? 3. What does it mean when every getter returns 0?"',
     'Zero; a declaration; the fields were never assigned. The third answer is the diagnostic, and if it comes '
     'back instantly the class can debug this unit on their own.'),
   'objectives': [
     ('I can write a class with fields, a constructor and accessors from a specification.', 'LO 3.3.A'),
     ('I can test each part of a class as I add it rather than at the end.', 'LO 3.3.C'),
     ('I can trace which variable an assignment actually reaches.', 'LO 3.3.B'),
   ],
   'sections': [
     ('Building one part at a time', [
       'Write the fields, then the constructor, then one accessor, and run it. Four lines of output beat forty lines of guessing.',
       'Adding one method at a time means a new failure has exactly one possible cause.',
       'Print the object\'s state right after construction. If the values are wrong there, nothing after it can be right.',
     ]),
     ('Tracing an assignment', [
       'For each assignment, ask which variable the name on the left refers to at that point in the code.',
       'A local declared in the same method wins over a field with the same name, every time.',
       'When in doubt, rename the parameter. If the bug disappears, it was shadowing.',
     ]),
   ],
   'worked': {
     'heading': 'Built in four steps, tested at each one',
     'code': 'public class Student\n{\n    private String name;\n    private int score;\n\n    public Student(String n, int s)\n    {\n        name = n;\n        score = s;\n    }\n\n    public String getName()\n    {\n        return name;\n    }\n\n    public int getScore()\n    {\n        return score;\n    }\n\n    public boolean isPassing()\n    {\n        return score >= 60;\n    }\n\n    public static void main(String[] args)\n    {\n        Student a = new Student("Ada", 91);\n        Student b = new Student("Bo", 45);\n        System.out.println(a.getName());\n        System.out.println(a.getScore());\n        System.out.println(a.isPassing());\n        System.out.println(b.isPassing());\n    }\n}',
     'notice': [
       'Two objects - each with its own name and score.',
       'Parameters named n and s - no shadowing is even possible.',
       'isPassing derives from the field rather than storing a flag.',
     ],
     'output': ['Ada', '91', 'true', 'false'],
     'caption': 'Complete and runnable as shown. Two independent objects.',
     'note': 'Naming the parameters n and s sidesteps shadowing entirely. Mention that 3.9 shows the other '
             'solution, which is this.name, and that both are used in real code.',
   },
   'break_it': {
     'change': 'Rename the parameters to name and score, matching the fields, and leave the assignments as bare '
               'name = name; score = score;',
     'happens': 'Both objects report an empty name and a score of 0. The constructor looks completely correct.',
     'why': 'With the parameter and field sharing a name, the bare name refers to the parameter, so each line '
            'assigns the parameter to itself and the field is never touched. Either rename the parameter, as '
            'here, or write this.name. This is the 3.9 debugging exercise, previewed.',
     'note': 'Two solutions exist and both are used professionally. Say so, or students think the this. version '
             'is the only correct answer.',
   },
   'misconception': {
     'heading': 'Test the class once it is finished',
     'think': 'I will write the whole class and then run it to see if it works.',
     'truth': 'A class written all at once and then run has as many possible causes of failure as it has lines. '
              'Adding one method and running gives a failure with exactly one plausible source, which is the '
              'difference between debugging and guessing. Print the state immediately after construction, before '
              'anything else, because if the fields are wrong there then nothing downstream can be right.',
     'note': 'This is the habit that makes Units 3 and 4 survivable. It is worth more than any single fact here.',
   },
   'discussion': [
     'Why does renaming a constructor parameter sometimes make a bug disappear?',
     'What is the first thing you would print when a new class misbehaves?',
   ],
   'learned': [
     'I can write a class with fields, a constructor and accessors from a specification.',
     'I can test each part of a class as I add it rather than at the end.',
     'I can trace which variable an assignment actually reaches.',
   ],
   'up_next': 'Topic 3.4 goes deeper into constructors, including the one that is secretly a method.',
   'extra': 'Complete the graded debugging exercise for 3.3. It plants locals shadowing the fields.',
  },
 ],
},

# ── 3.4 ──────────────────────────────────────────────────────────────────────
{
 'topic': '3.4',
 'title': 'Constructors',
 'handle': 'ap-csa-lesson-3-4-constructors',
 'subtitle': 'Building an object, overloading, and the constructor that is quietly a method',
 'vocab': [
   ('Constructor', 'A special method with the class name and no return type, run when an object is created.'),
   ('Default constructor', 'The no-argument constructor Java supplies when a class declares none.'),
   ('Overloading', 'Providing several constructors or methods with the same name and different parameters.'),
   ('Constructor chaining', 'One constructor calling another with this(...) as its first statement.'),
   ('new', 'The keyword that allocates an object and runs its constructor.'),
   ('Signature', 'The name and the parameter types, which is what distinguishes overloads.'),
 ],
 'quiz': [
   {'stem': 'What distinguishes a constructor from a method?',
    'options': ['It is public', 'It has the class name and no return type',
                'It returns void', 'It is called first'],
    'answer_index': 1,
    'why': 'No return type at all, not even void.'},
   {'stem': 'public void Rect(int w, int h) inside class Rect is:',
    'options': ['A constructor', 'An ordinary method', 'A compile error', 'The default constructor'],
    'answer_index': 1,
    'why': 'The return type makes it a method that merely shares the class name.'},
   {'stem': 'If a class declares no constructor at all, Java:',
    'options': ['Refuses to compile', 'Supplies a no-argument default constructor',
                'Leaves fields uninitialised', 'Requires new to take arguments'],
    'answer_index': 1,
    'why': 'The default constructor exists only when you declare none of your own.'},
   {'stem': 'Constructor chaining is written as:',
    'options': ['super(...)', 'this(...) as the first statement', 'new Rect(...)', 'Rect(...)'],
    'answer_index': 1,
    'why': 'this(...) calls another constructor and must come first.'},
   {'stem': 'Two constructors can coexist when they differ in:',
    'options': ['Their bodies', 'Their parameter lists', 'Their return types', 'Their names'],
    'answer_index': 1,
    'why': 'Overloads are distinguished by the signature, which is name plus parameter types.'},
   {'stem': 'Every field is 0 after new Rect(3, 4). A likely cause is:',
    'options': ['The fields are final', 'The intended constructor has a return type so a default ran',
                'new was omitted', 'The getters are wrong'],
    'answer_index': 1,
    'why': 'Java used the default constructor, so nothing was assigned.'},
 ],
 'days': [
  {
   'day': 1,
   'focus': 'What a constructor is, and what happens when it is not one',
   'schedule': [
     (6, 'Bell ringer: spot the constructor'),
     (3, 'Objectives and guided-notes preview'),
     (15, 'Constructors and the default constructor'),
     (10, 'Worked example: two constructors, one class'),
     (13, 'Overloading and chaining'),
     (5, 'Misconception check: void makes it clearer'),
     (8, 'Stop and think, then assign homework'),
   ],
   'notes': [
     'The void Rect bug is the best bug in the unit. Give it the full five minutes.',
     'Chaining with this(...) is examinable and students rarely see it written down. Model it.',
   ],
   'warmup': ('Spot the constructor',
     'On the board, three declarations from inside class Rect. "Which one is the constructor? How do you know? What are the other two?"',
     'Only the first. The second is a method that happens to be called Rect, which is legal and almost never intended. Getting them to say "no return type" out loud now pays off in ten minutes.',
     'public Rect(int w)\npublic void Rect(int w)\npublic int getWidth()'),
   'objectives': [
     ('I can write a constructor that initializes every field.', 'LO 3.4.A'),
     ('I can explain when Java supplies a default constructor.', 'LO 3.4.B'),
     ('I can recognize a constructor accidentally written as a method.', 'LO 3.4.C'),
   ],
   'sections': [
     ('Constructors and the default', [
       'A constructor has the same name as the class and no return type at all, not even void.',
       'It runs once, when new creates the object, and its job is to leave every field in a sensible state.',
       'If a class declares no constructor, Java supplies a no-argument default that leaves fields at their defaults.',
       'The moment you declare any constructor, the default disappears.',
     ]),
     ('Overloading and chaining', [
       'A class can have several constructors as long as their parameter lists differ.',
       'One constructor can call another with this(...), which must be its very first statement.',
       'Chaining keeps the field assignments in exactly one place, which is 3.1 applied to constructors.',
     ]),
   ],
   'worked': {
     'heading': 'Two constructors, one place for the assignments',
     'code': 'public class Rect\n{\n    private int width;\n    private int height;\n\n    public Rect(int w, int h)\n    {\n        width = w;\n        height = h;\n    }\n\n    public Rect(int side)\n    {\n        this(side, side);\n    }\n\n    public int getWidth()\n    {\n        return width;\n    }\n\n    public int getArea()\n    {\n        return width * height;\n    }\n\n    public static void main(String[] args)\n    {\n        Rect r = new Rect(3, 4);\n        Rect s = new Rect(5);\n        System.out.println(r.getWidth());\n        System.out.println(r.getArea());\n        System.out.println(s.getWidth());\n        System.out.println(s.getArea());\n    }\n}',
     'notice': [
       'No return type on either constructor - that is what makes them constructors.',
       'this(side, side) - the square delegates rather than repeating the assignments.',
       'One place assigns the fields, so there is one place to get it wrong.',
     ],
     'output': ['3', '12', '5', '25'],
     'caption': 'Complete and runnable as shown. A rectangle and a square.',
     'note': 'Ask what would happen if the square constructor assigned the fields itself. It would work, and it '
             'would be a second copy of the rule. 3.1 again.',
   },
   'break_it': {
     'change': 'Add void in front of the two-argument constructor: public void Rect(int w, int h).',
     'happens': 'new Rect(3, 4) no longer compiles, or if a no-argument constructor exists, every field comes out '
                '0. The declaration still reads like a constructor and Java treats it as an ordinary method.',
     'why': 'A constructor is identified by having NO return type. Adding void makes it a method that shares the '
            'class name, so Java falls back to the default constructor and nothing is assigned. This is '
            'tonight\'s graded debugging exercise, together with a square that never sets its height.',
     'note': 'This is the highest-value five minutes in Unit 3. Every student will make this mistake once, and '
             'the ones who saw it here will recognize it in seconds.',
   },
   'misconception': {
     'heading': 'Adding void makes the declaration clearer',
     'think': 'The constructor does not return anything, so writing void in front of it is more explicit.',
     'truth': 'It is not more explicit, it is a different thing entirely. void means "a method that returns '
              'nothing", and a method is not a constructor no matter what it is called. Java then supplies the '
              'default constructor, your object is built by that instead, and every field sits at its default '
              'value while the code that was supposed to set them sits there looking correct.',
     'note': 'The instinct behind the mistake is reasonable, which is exactly why it needs naming rather than mocking.',
   },
   'discussion': [
     'When does Java supply a default constructor, and when does it stop?',
     'Why must this(...) be the first statement of a constructor?',
   ],
   'learned': [
     'I can write a constructor that initializes every field.',
     'I can explain when Java supplies a default constructor.',
     'I can recognize a constructor accidentally written as a method.',
   ],
   'up_next': 'Day 2 writes overloaded constructors from a specification and chains them.',
   'extra': 'Write a Time class with constructors taking (h, m, s), (h, m) and (). Chain them all to the first.',
  },
  {
   'day': 2,
   'focus': 'Overloading from a specification, and validating constructor arguments',
   'schedule': [
     (5, 'Bell ringer: retrieval on constructors'),
     (3, 'Objectives and guided-notes preview'),
     (16, 'Designing a set of overloaded constructors'),
     (10, 'Worked walkthrough: chain three constructors, live'),
     (12, 'Guided practice on the live lesson page'),
     (9, 'Independent practice: the debugging exercise'),
     (5, 'Exit ticket'),
   ],
   'notes': [
     'Chain everything to the most general constructor. One place assigns, the rest supply defaults.',
     'Validation in the constructor is worth mentioning: an object should never be born invalid.',
   ],
   'warmup': ('Retrieval on constructors',
     'On the board, no notes: "1. How do you tell a constructor from a method? 2. What happens if you declare no '
     'constructor? 3. What does this(...) do and where must it go?"',
     'No return type; Java supplies a default; calls another constructor, first statement only. If number one is '
     'shaky, put yesterday\'s void bug back on the screen.'),
   'objectives': [
     ('I can write a set of overloaded constructors with different parameter lists.', 'LO 3.4.B'),
     ('I can chain constructors so the field assignments live in one place.', 'LO 3.4.A'),
     ('I can validate constructor arguments so an object is never created invalid.', 'LO 3.4.C'),
   ],
   'sections': [
     ('Designing overloads', [
       'Each overload differs in its parameter list, and each one exists because a caller genuinely needs it.',
       'Pick the most general constructor as the one that assigns the fields, and chain all the others to it.',
       'A no-argument constructor supplies sensible defaults rather than leaving the object empty.',
     ]),
     ('Validating arguments', [
       'An object should never be born in an invalid state, because every method afterwards has to cope with it.',
       'Clamping a bad argument to a legal value inside the constructor keeps the rest of the class simple.',
       'Validation in one constructor protects every overload, provided they all chain to it.',
     ]),
   ],
   'worked': {
     'heading': 'Three constructors, one that does the work',
     'code': 'public class Timer\n{\n    private int minutes;\n    private int seconds;\n\n    public Timer(int minutes, int seconds)\n    {\n        if (seconds < 0) { seconds = 0; }\n        if (seconds > 59) { seconds = 59; }\n        this.minutes = minutes;\n        this.seconds = seconds;\n    }\n\n    public Timer(int minutes)\n    {\n        this(minutes, 0);\n    }\n\n    public Timer()\n    {\n        this(0, 0);\n    }\n\n    public int getTotalSeconds()\n    {\n        return minutes * 60 + seconds;\n    }\n\n    public static void main(String[] args)\n    {\n        System.out.println(new Timer(2, 30).getTotalSeconds());\n        System.out.println(new Timer(3).getTotalSeconds());\n        System.out.println(new Timer().getTotalSeconds());\n        System.out.println(new Timer(1, 99).getTotalSeconds());\n    }\n}',
     'notice': [
       'Only the two-argument constructor assigns - the others chain to it.',
       'Validation sits in that one constructor and therefore protects all three.',
       'new Timer(1, 99) clamps to 59, so the object is never invalid.',
     ],
     'output': ['150', '180', '0', '119'],
     'caption': 'Complete and runnable as shown. The last line clamps 99 seconds to 59.',
     'note': 'Ask where you would add a new validation rule. One place, and all three constructors inherit it. '
             'That is the payoff for chaining.',
   },
   'break_it': {
     'change': 'Have the one-argument constructor assign the fields itself instead of chaining, then add a new '
               'validation rule to the two-argument constructor only.',
     'happens': 'new Timer(3) skips the validation entirely. Two of the three constructors are protected and one '
                'is not, and which one you used decides whether the object is valid.',
     'why': 'A constructor that assigns fields directly is a second copy of the setup rule, and new rules added '
            'to the original never reach it. Chaining means there is one door into the object and everything '
            'goes through it.',
     'note': 'Same shape as the duplicated tax rate in 3.1. Naming the repeat explicitly helps the unit cohere.',
   },
   'misconception': {
     'heading': 'More constructors means more flexibility',
     'think': 'Adding constructors for every combination of arguments makes the class easier to use.',
     'truth': 'Every constructor that assigns fields directly is another place the setup rule lives and another '
              'place a future rule can be forgotten. Overloads are for the convenience of CALLERS, and there '
              'should be exactly one that does the work. The rest supply defaults and chain to it. Flexibility '
              'comes from the parameter lists, not from duplicated bodies.',
     'note': 'Ties the whole unit together: 3.1, 3.2 and 3.4 are the same rule in three costumes.',
   },
   'discussion': [
     'Why should validation live in the constructor rather than in every method?',
     'What is the advantage of chaining over each constructor assigning its own fields?',
   ],
   'learned': [
     'I can write a set of overloaded constructors with different parameter lists.',
     'I can chain constructors so the field assignments live in one place.',
     'I can validate constructor arguments so an object is never created invalid.',
   ],
   'up_next': 'Topic 3.5 turns to writing the methods themselves, and where a return statement belongs.',
   'extra': 'Complete the graded debugging exercise for 3.4. It plants a void constructor and an unchained square.',
  },
 ],
},
]
