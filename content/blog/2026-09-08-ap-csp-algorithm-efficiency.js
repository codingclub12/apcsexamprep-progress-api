'use strict';
// Weekly course post: AP CSP. Evergreen concept guide, not news. Big Idea 3
// (Algorithms and Programming) asks students to judge algorithm efficiency
// without formal Big-O notation. The skill that actually separates scores is
// a practical intuition for how work scales with input size, not a
// vocabulary of complexity classes. That intuition is what this guide builds.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'You Do Not Need a CS Degree for This Topic',
  'What "Reasonable Time" Means for AP CSP Algorithms',
  'Reasonable Time, Taught With Two Concrete Examples',
  'Unreasonable Time: When the Work Explodes Instead of Grows',
  'Seeing the Explosion: A Doubling Comparison',
  'Why This Matters Outside the Exam',
  'Practice Classifying Algorithms',
  'Frequently Asked Questions',
];

const meta = {
  title: 'AP CSP Algorithms: Reasonable and Unreasonable Time, Without a CS Degree',
  handle: 'ap-csp-algorithm-efficiency-reasonable-time',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp algorithms',
  publishOn: '2026-09-09',
  seoTitle: 'AP CSP Algorithms: Reasonable vs Unreasonable Time',
  seoDescription: 'A conceptual guide to AP CSP algorithm efficiency: how to tell reasonable time algorithms from unreasonable ones without Big-O notation or a CS degree.',
  summary: 'AP CSP asks students to judge whether an algorithm runs in a reasonable or unreasonable amount of time, and it does this without ever requiring formal Big-O notation. That framing trips students up in both directions: some panic and try to learn complexity theory that was never being tested, others dismiss the topic as not real content and lose points on it anyway. This guide teaches the actual skill being tested, a practical sense of how work scales as input grows, with concrete examples, a doubling comparison table, and two worked practice questions in the description-based style the exam actually uses.',
  tags: ['AP CSP', 'Algorithms', 'Big Idea 3', 'Efficiency', 'Study Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP CSP algorithms questions about efficiency are some of the most misunderstood items on the exam, not because the underlying idea is hard, but because students walk in expecting the wrong kind of question. There is no Big-O notation on this exam, no proof-writing, and no complexity theory course hiding behind the vocabulary. What is actually being tested is an intuition you can build in an afternoon: as the amount of data an algorithm has to work with grows, does the work grow along with it in a straightforward way, or does it explode. This guide builds that intuition from the ground up.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 8, 2026', updated: 'September 8, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Here is the reaction this topic tends to produce, and it splits students into two camps that both end up in the same place: missing points. The first camp hears "algorithm efficiency" and assumes they are about to be tested on something out of a college data structures course, so they either shut down or go find a video explaining Big-O notation, which is not on this exam and never has been. The second camp hears the same phrase, decides it sounds like filler rather than real content, skims past it, and then loses points on a question that turns out to have a clean, learnable answer they never bothered to learn.'),
  H.p('Both reactions miss what is actually being asked. AP CSP algorithms questions about efficiency want you to reason about a description of an approach and decide, in plain terms, whether the amount of work that approach requires stays manageable as the input grows, or whether it spirals out of control. That is it. No formulas to memorize, no notation to decode, just a specific way of thinking about growth that this guide is going to teach you directly.'),
  H.box('key', 'The one question underneath every version of this topic', '<p>As the size of the input grows, does the amount of work an algorithm has to do grow along with it in a direct, proportional way, or does it grow explosively, multiplying out of control with every small increase in input? The first kind is what the exam calls reasonable time. The second is unreasonable time. Everything else in this guide is detail in service of that one distinction.</p>'),
  H.p('The rest of this guide walks through both categories with concrete, non-code examples, because that is how AP CSP actually presents this material: a short description of an approach, not a program to trace. Then it puts a doubling comparison in front of you so the explosive category stops being an abstract warning and starts being something you can feel. Then it connects the idea to why real software so often settles for a good-enough answer instead of a guaranteed-best one. By the end, classifying an algorithm as reasonable or unreasonable from a plain description should feel like a habit, not a guess.'),

  H.h2(SECTIONS[1]),
  H.p('Start with what "the amount of work" even means here, because that phrase is doing a lot of lifting. It does not mean how long a specific computer takes in seconds, because a faster computer would just make that number smaller without changing anything about the algorithm itself. What matters instead is how the number of steps an algorithm performs changes as the input gets bigger. If doubling the amount of data roughly doubles the number of steps, that is one kind of relationship. If doubling the amount of data multiplies the number of steps by some enormous factor instead, that is a completely different kind of relationship, even though both algorithms are, in some sense, "doing more work" as the input grows.'),
  H.p('Reasonable time covers algorithms where the work grows in a controlled, proportional way as input size increases, so that even a large input stays within reach of an actual computer running for an actual reasonable stretch of time. Unreasonable time covers algorithms where the work grows so explosively that even a modest increase in input size pushes the problem out of reach of any computer, no matter how fast, running for any amount of time you would actually wait around for. That last part matters: unreasonable is not about how slow the hardware available today happens to be. It is about the shape of the growth itself, which no future hardware improvement can fix, because the number of steps required keeps multiplying faster than any speed increase could keep up with.'),
  H.box('tip', 'A test you can run in your head', '<p>Picture doubling the input size in your head and ask what happens to the work. If the work roughly doubles too, or grows by some fixed multiple, you are almost certainly looking at reasonable time. If doubling the input makes you multiply the work by itself, or by a number that keeps growing with the input rather than staying fixed, you are looking at unreasonable time. That mental doubling test is the entire method, and it works from a plain-English description just as well as it would from actual code.</p>'),

  H.h2(SECTIONS[2]),
  H.p('The clearest reasonable time example is also the simplest one: checking every item in a list exactly once. Imagine searching through an unsorted list of names to see whether a particular name appears anywhere in it, by looking at the first name, then the second, then the third, and so on until either you find a match or you run out of names. If the list has more names in it, you do more checking, but the relationship is direct and predictable. A list with twice as many names takes roughly twice as many checks. There is no hidden multiplication happening anywhere in that process, just one look at each item, so the total work scales exactly the way the input does.'),
  H.p('This kind of algorithm shows up constantly in AP CSP algorithms scenarios: scanning a list to find a maximum value, counting how many items in a collection meet some condition, adding up every value in a dataset. In every one of these, the algorithm touches each piece of data a fixed, small number of times, and that is what keeps the growth reasonable no matter how large the dataset gets.'),
  H.p('The second reasonable time example is a little more interesting, because it is reasonable in a stronger sense: it actually gets more efficient, relative to the size of the problem, as the data grows. Picture a sorted list of names and a search that works by checking the middle entry, deciding whether the name you want comes before or after it alphabetically, and then throwing away the half of the list that could not possibly contain it. Repeat that process on whatever half remains, over and over, and each repetition eliminates half of what is still left to search.'),
  H.p('That halving-each-step approach is doing something checking-every-item never does: it lets a huge list be searched with only a small number of comparisons, because each comparison does the work of ruling out half of everything remaining rather than ruling out just one item. A list that is far larger than the one before it still only needs a few more comparisons than the smaller list did, since each additional comparison doubles how much of the list a single step can rule out. That is why organized, sorted-data search is treated as reasonable time in the strongest sense on this exam: not just proportional growth, but growth that stays almost flat even as the input gets dramatically bigger.'),
  H.box('key', 'What both reasonable examples have in common', '<p>Neither approach ever has to consider every possible arrangement or grouping of the data. One looks at each item a single time. The other throws away large chunks of the remaining possibilities with each step. Both keep the total amount of work tied closely to the size of the input, which is exactly the property that makes an algorithm reasonable.</p>'),

  H.h2(SECTIONS[3]),
  H.p('Unreasonable time algorithms share a specific shape, and once you can recognize that shape, you can spot it in a plain-English description without needing to see any code at all. The shape is this: instead of looking at each item once, or eliminating chunks of the problem with each step, the algorithm has to check every possible combination or every possible ordering of the items involved before it can be sure it has found the answer it is looking for.'),
  H.p('The classic AP CSP algorithms example, and a genuinely useful one to keep in your head, is planning a route that visits a set of cities and finds the one true shortest possible path, guaranteed, by checking every possible order the cities could be visited in. With just a handful of cities, that sounds doable: try this order, try that order, compare the total distances, pick the shortest. The trouble is how fast the number of possible orderings grows as more cities get added to the trip. Adding just one more city to the route does not add one more ordering to check. It multiplies the number of orderings you already had to check by roughly the new total number of cities, because that new city could be inserted into any position within every ordering that already existed.'),
  H.p('That multiplying effect is what separates unreasonable time from reasonable time. A reasonable algorithm handling one more item does one more unit of work. This kind of algorithm handling one more item multiplies the entire existing workload. Do that a handful of times in a row and the number of orderings to check stops being a number you could describe casually and becomes a number so large that no computer, run for any length of time you would ever actually wait for, could finish checking them all.'),
  H.box('warn', 'The trap: this is not about the computer being too slow', '<p>It is tempting to think a faster computer solves an unreasonable time problem eventually. It does not, and this is the detail that separates a strong answer from a weak one on this topic. A faster machine shrinks the time each individual check takes, but it does nothing to shrink how many checks there are, and the number of checks is what is exploding. Multiply an astronomically large number of orderings by a faster processor and you still get an astronomically large number of orderings, just completed marginally sooner. The growth itself is the problem, not the hardware running it.</p>'),

  H.h2(SECTIONS[4]),
  H.p('Numbers make this explosion easier to feel than a description alone can manage, so here is a small, illustrative comparison between the two approaches this guide has already walked through: checking each item once, and checking every possible combination of items. These are small, illustrative figures meant to show the shape of the growth, not a measurement of any real system.'),
  H.table(
    ['Number of items', 'Checking each item once', 'Checking every possible combination'],
    [
      ['5', '5 steps', '32 combinations'],
      ['10', '10 steps', '1,024 combinations'],
      ['15', '15 steps', '32,768 combinations'],
      ['20', '20 steps', 'over 1,000,000 combinations'],
      ['25', '25 steps', 'over 33,000,000 combinations'],
    ]
  ),
  H.p('Read across each row rather than down a single column, and the point of the whole table jumps out. The middle column grows exactly the way the number of items grows: five items is five steps, twenty five items is twenty five steps, nothing surprising anywhere in that pattern. The right column does something entirely different. Every time the item count climbs by five, the combination count does not just climb along with it, it multiplies by another large factor on top of whatever it already was. Doubling how many items you have does not double the combination count. It squares it, or worse, depending on exactly what is being combined.'),
  H.p('This is the gap that makes the terms reasonable and unreasonable feel less like arbitrary labels and more like accurate descriptions. A student reading a scenario that clearly falls into the left-hand pattern can be confident it stays reasonable no matter how large the real input gets. A student reading a scenario that clearly falls into the right-hand pattern should recognize, from the shape of the growth alone, that it becomes unreasonable quickly, often well before the input reaches a size anyone would call large in everyday terms.'),

  H.h2(SECTIONS[5]),
  H.p('This distinction is not just an exam abstraction. It explains a real design choice that shows up constantly in actual software, including the kind of software this exam is built to introduce you to conceptually. Plenty of real-world problems have exactly the same shape as the route-planning example: scheduling deliveries across a large number of stops, assigning workers to shifts so that every constraint is satisfied, routing data through a large network. A guaranteed-perfect solution to any of these, found by checking every possible arrangement, is unreasonable time on any input size that resembles the real world.'),
  H.p('Faced with that, real software very often does not even attempt to guarantee the perfect answer. Instead, it uses an approximate or heuristic approach: a method that finds a solution that is good, often very good, without promising it is mathematically the absolute best one possible. That trade-off is not a shortcut engineers take out of laziness. It is the direct, practical consequence of the same reasoning this guide has been building the whole way through: a guaranteed-perfect approach to a combination-exploding problem is not slow, it is unreasonable, and unreasonable stays unreasonable no matter how much better computers get. A good-enough answer delivered quickly beats a perfect answer that never finishes.'),
  H.p('This same reasonable-versus-unreasonable lens shows up again once you move from multiple choice questions into the Create performance task, where the algorithm you design has to actually run on real input rather than just be described in the abstract. If you want more on how that section of the course has shifted, our <a href="/blogs/ap-csp/ap-csp-create-performance-task-what-changed">guide to the current Create performance task</a> covers what changed and what graders are actually looking for.'),

  H.h2(SECTIONS[6]),
  H.p('Both practice questions below are written the way AP CSP actually presents this material: a short description of an approach, with no code involved, asking you to classify it and explain the reasoning. Work through each one before checking the answer.'),
  H.mcq({
    n: 1,
    stem: 'A program needs to find the name that appears most often in a large, unsorted list of customer orders. It does this by looking at each order in the list exactly once, keeping a running count of how many times each name has appeared so far, and reporting whichever name ended up with the highest count. As the list of orders grows larger, how should this algorithm be classified?',
    options: [
      'Unreasonable time, because the algorithm has to compare every name to every other name',
      'Reasonable time, because the algorithm looks at each order once and the work grows directly with the size of the list',
      'Unreasonable time, because counting requires checking every possible grouping of orders',
      'Reasonable time, but only if the list is already sorted before the algorithm runs',
    ],
    correct: 1,
    why: 'This algorithm looks at each order exactly once and updates a running count, so a list with twice as many orders requires roughly twice as many steps. That direct, proportional relationship between input size and work is exactly what defines reasonable time. Nothing about this approach requires checking combinations, orderings, or groupings of the data, and nothing about it requires the list to be sorted first, since it never eliminates portions of the list the way an organized search would. It simply passes through the data once.',
  }),
  H.mcq({
    n: 2,
    stem: 'A small business wants to assign each of its delivery drivers to one stop each day so that the total distance driven by all drivers, combined, is the smallest possible amount. A program guarantees the absolute best assignment by checking every possible way the drivers could be matched to the stops and comparing the total distance for each one. As the number of drivers and stops grows, how should this algorithm be classified?',
    options: [
      'Reasonable time, because assigning drivers to stops only requires one comparison per driver',
      'Unreasonable time, because the number of possible ways to match drivers to stops multiplies explosively as more drivers and stops are added',
      'Reasonable time, as long as the business does not add more than a handful of new drivers',
      'Unreasonable time, but only because the business does not have a fast enough computer',
    ],
    correct: 1,
    why: 'Checking every possible way to match a growing set of drivers to a growing set of stops means checking every possible pairing, which is exactly the combination-and-ordering shape that defines unreasonable time. Adding one more driver does not add one more thing to check, it multiplies the number of possible full assignments that already existed, the same way adding one more city multiplied the number of possible routes in the earlier routing example. A faster computer does not fix this, since the number of assignments to check is what is exploding, not the speed of checking each one. A business facing this problem in practice would use an approximate or heuristic method rather than wait for a guaranteed-perfect one.',
  }),

  H.h2(SECTIONS[7]),
  H.faq([
    { q: 'Do I need to know Big-O notation for AP CSP algorithms questions?', a: 'No. AP CSP tests this topic at a conceptual level, using terms like reasonable and unreasonable time rather than formal complexity notation. You are expected to reason about how the amount of work an algorithm performs changes as input size grows, described in plain language, not to write or interpret Big-O expressions.' },
    { q: 'Is checking every item in a list always reasonable time?', a: 'Checking each item a fixed number of times, such as once or twice, is reasonable time because the work stays directly proportional to the input size. What pushes an algorithm into unreasonable time is checking every combination or every possible ordering of the items, rather than checking each item on its own a limited number of times.' },
    { q: 'Why is a guaranteed-shortest route considered unreasonable but everyday map apps still work fine?', a: 'Everyday routing tools generally do not guarantee the mathematically perfect shortest route across every possible combination of paths. They use approximate or heuristic methods that find a very good route quickly, trading a guarantee of absolute perfection for an answer that actually finishes in a reasonable amount of time. That trade-off is precisely the practical lesson this topic is meant to teach.' },
    { q: 'Can a fast enough computer eventually make an unreasonable time algorithm practical?', a: 'No, and this is one of the most commonly missed points on this topic. Unreasonable time describes how the number of steps grows as input size increases, not how long each individual step takes. A faster computer reduces the time per step, but it does nothing to slow down the explosive growth in the number of steps required, so the algorithm remains unreasonable regardless of hardware.' },
    { q: 'How will this actually be asked on the exam?', a: 'Expect a short, plain-English description of an approach to a problem, with no code shown, followed by a question asking you to classify the approach as running in a reasonable or unreasonable amount of time and to explain why. Practicing with descriptions rather than code, the way the two questions in this guide are written, matches that format directly.' },
  ]),

  H.cta({
    heading: 'Keep building Big Idea 3 fluency',
    body: 'Algorithm efficiency shows up across the multiple choice section and inside how the Create performance task gets evaluated. Work through more of the material built to the current exam format.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects AP CSP Big Idea 3 (Algorithms and Programming) as defined in the current College Board Course and Exam Description. Last reviewed September 8, 2026.'),
]);

module.exports = { meta, body };
