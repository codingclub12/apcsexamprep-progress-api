'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AUTO-GRADED CHECKS: Topic 1.2, Program Function and Purpose.
//
//  Same contract as 1-1.js. The handout's own items are constructed response and
//  are mirrored verbatim on the page, unscored, never transmitted. These MCQs
//  are the auto-graded half, and each one is DERIVED from a specific sentence in
//  the teacher answer KEY, quoted in `keyCite` so the claim is checkable rather
//  than trusted. scripts/verify-csp-exercise-checks.js confirms every quotation
//  really appears in the KEY document it names, so an invented "correct" answer
//  fails the build instead of reaching a student.
//
//  COUNTS ARE AUTHORED TO CONTENT, NOT TO A TEMPLATE.
//  Topic 1.1 carries five checks per exercise. This topic carries six and seven,
//  because it teaches more distinct testable ideas: input form, input source,
//  the event/trigger distinction, prior state, the program vs code segment vs
//  behavior vocabulary, and the event loop. Nothing in the renderer, the
//  denominator seed or the page copy assumes a fixed number; every one of them
//  reads the length of this array. A topic that deserves four checks should have
//  four.
//
//  Pure ASCII, no em-dashes. Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  'ap-csp-topic-1-2-exercise-1': {
    keyDoc: 'AP-CSP_1-2_Exercise1_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-2.C.5',
        keyCite: 'in event-driven programming, program statements are executed when TRIGGERED rather than through the sequential flow of control',
        stem: 'LunchDash sat idle for twenty minutes and then answered an 11:00 tap instantly. A classmate says it must have been "stuck on line 200" waiting to continue. What does the CED say is actually going on?',
        options: [
          'The program is event-driven: statements execute when triggered, not through the sequential flow of control',
          'The program was paused by the operating system and resumed at 11:00',
          'The program was running lines 1 through 199 very slowly for twenty minutes',
          'The program is sequential but skips ahead when a user is waiting',
        ],
        correct: 'A',
        why: {
          A: 'This is the CED distinction exactly. The order-handling code has no place "in line" that the program works toward; it ran because the tap event fired.',
          B: 'Nothing in the log describes the operating system suspending anything, and the CED explains the behaviour without needing it.',
          C: 'Twenty minutes of invisible work is the sequential picture the case is designed to rule out.',
          D: 'Sequential flow has no mechanism for skipping ahead on demand. The instant response is the signature of event-driven execution.',
        },
      },
      {
        ek: 'CRD-2.C.6',
        keyCite: 'input can come from a user OR other programs',
        stem: 'At 10:30 the cafeteria inventory software transmitted "pizza: 0 remaining" and the tile turned gray. No human touched the app. Was that input?',
        options: [
          'No, because input requires a user action',
          'No, because nothing was typed or tapped',
          'Yes: input can come from a user or from other programs, and this came from the inventory software',
          'Yes, but only because a person configured the inventory software earlier',
        ],
        correct: 'C',
        why: {
          A: 'The humans-only assumption is exactly what this row exists to break. The CED allows other programs as an input source.',
          B: 'Typing and tapping are two input forms among several. The form does not decide whether something counts as input.',
          C: 'Software-to-software input is completely normal. Data was sent to the computer for processing by the program, which is the CED definition of input.',
          D: 'The earlier configuration is not the input. The transmitted data is, and it arrived from another program.',
        },
      },
      {
        ek: 'CRD-2.D.2',
        keyCite: "program output is usually based on a program's input OR PRIOR STATE (e.g., internal values)",
        stem: 'Two students tapped the same "Surprise me" button seconds apart and were offered different meals. One files a bug report saying the program is broken. What is the correct ruling?',
        options: [
          'Accept the report: identical inputs must produce identical outputs',
          'Reject the report: output is based on the input or on prior state, such as remembered order history',
          'Accept the report: the program is using randomness, which is not allowed',
          'Reject the report: the two taps were milliseconds apart, so they were not really identical',
        ],
        correct: 'B',
        why: {
          A: 'That rule would be true only if input were the only thing output could depend on. The CED explicitly allows prior state as well.',
          B: 'The inputs matched, but each student\'s remembered internal values differed, so the same tap legitimately computes a different offer.',
          C: 'Calling it random without naming prior state is the incomplete answer. Nothing here violates a rule the CED states.',
          D: 'Timing is not the difference that matters. Two identical taps would still differ in outcome because the stored state differs.',
        },
      },
      {
        ek: 'CRD-2.B.2',
        keyCite: 'a collection of program statements that is PART of a program',
        stem: 'The nine lines inside LunchDash that gray out a sold-out tile: what is the precise CED term for them?',
        options: [
          'A program, because they perform a specific task',
          'A code segment, because they are a collection of statements that is part of a program',
          'A behavior, because they describe what the user sees',
          'An event, because they run when the inventory data arrives',
        ],
        correct: 'B',
        why: {
          A: 'A program is the whole collection that performs a task when run. These nine lines cannot stand alone.',
          B: 'The part versus whole distinction is the entire point of the term. A code segment is part of a program.',
          C: 'Behavior is how the program functions during execution, described from the user side, not the lines themselves.',
          D: 'The arriving data is the event. The lines that respond to it are code.',
        },
      },
      {
        ek: 'CRD-2.D.1',
        keyCite: 'the on-screen confirmation, VISUAL form sent to the display, and the buzz, TACTILE form sent to the vibration motor',
        stem: 'One tap on the pizza tile produced a confirmation on screen and a buzz. How many outputs is that, and in what forms?',
        options: [
          'One output, visual, because the buzz is feedback rather than output',
          'Two outputs: visual to the display and tactile to the vibration motor',
          'One output, tactile, because the buzz is what the user actually notices',
          'Two outputs, both visual, because the phone screen produced both',
        ],
        correct: 'B',
        why: {
          A: 'Output is any data sent from a program to a device. The buzz qualifies, so this undercounts.',
          B: 'One input can legitimately produce several outputs, and here they arrive in two different forms on two different devices.',
          C: 'This drops the confirmation, which is just as much an output as the buzz.',
          D: 'The vibration motor is a different device from the display, and a buzz is tactile rather than visual.',
        },
      },
      {
        ek: 'CRD-2.C.5',
        keyCite: 'Idle = empty queue, spinning loop; frozen = full queue, blocked loop.',
        stem: 'ENRICHMENT: during the quiet twenty minutes LunchDash looked like it was running no code at all, yet it answered instantly. What distinguishes an idle app from a frozen one?',
        options: [
          'Idle means an empty queue with the loop still spinning; frozen means a full queue with the loop blocked',
          'Idle means the program has exited; frozen means it is still loaded but unresponsive',
          'Idle and frozen are the same state, described from the user side and the developer side',
          'Idle means no events have ever arrived; frozen means too many arrived at once',
        ],
        correct: 'A',
        why: {
          A: 'The event loop never stopped during the idle window, which is exactly why the tap was dispatched on its very next pass.',
          B: 'An exited program cannot answer a tap instantly twenty minutes later.',
          C: 'They are opposite failures. One is healthy waiting, the other is a handler hogging the loop and never returning control.',
          D: 'Volume is not the distinction. A frozen app is blocked by a handler that will not return, whatever the queue depth.',
        },
      },
    ],
  },

  'ap-csp-topic-1-2-exercise-2': {
    keyDoc: 'AP-CSP_1-2_Exercise2_KEY_k7q2m9.docx',
    questions: [
      {
        ek: 'CRD-2.C.1 / CRD-2.C.2',
        keyCite: 'The button press is TACTILE input from a USER',
        stem: 'Trace 1: a pedestrian presses the metal crosswalk button. Name the input precisely.',
        options: [
          'Visual input from another program',
          'Tactile input from a user',
          'Audio input from a user, because the chirp follows it',
          'Text input from the traffic controller',
        ],
        correct: 'B',
        why: {
          A: 'Nothing is seen by the program here, and no other program supplied the press.',
          B: 'A press is a physical action by a person, and it is an event: a defined action that supplies input data to the program.',
          C: 'The chirp is an output the press causes. It is not the input.',
          D: 'The controller is the program receiving the input, not a source sending text to itself.',
        },
      },
      {
        ek: 'CRD-2.D.1',
        keyCite: 'The outputs are the WALK symbol, VISUAL form sent to the signal display, and the chirp, AUDIO form sent to the speaker',
        stem: 'Trace 1: one press lights the WALK symbol and plays a chirp. Count and classify the outputs.',
        options: [
          'One output in one form, since both come from the same press',
          'Two outputs: visual to the signal display and audio to the speaker',
          'Two outputs, both visual, since the chirp only accompanies the symbol',
          'No outputs, because the traffic cycle was already running',
        ],
        correct: 'B',
        why: {
          A: 'The count follows the data sent to devices, not the number of inputs that caused it.',
          B: 'One input, two outputs, two forms, two devices. That pairing is what the trace has to name.',
          C: 'A chirp is audio and reaches a speaker, which is a different device from the display.',
          D: 'The background cycle is separate. The press produced new data sent to devices.',
        },
      },
      {
        ek: 'CRD-2.C.5',
        keyCite: 'the background light cycle steps through its phases in order, but the pedestrian feature only ever runs when triggered',
        stem: 'Trace 1: is the crosswalk controller sequential or event-driven?',
        options: [
          'Purely sequential, because the light cycle runs in a fixed order',
          'Purely event-driven, because a button press starts everything',
          'A hybrid: the light cycle steps through phases in order, while the pedestrian feature runs only when triggered',
          'Neither, because traffic controllers are hardware rather than programs',
        ],
        correct: 'C',
        why: {
          A: 'That describes the background cycle and misses the pedestrian feature entirely.',
          B: 'The cycle keeps running between presses, so not everything waits on the button.',
          C: 'Naming the hybrid is what a complete ruling requires. Both models are present and they govern different parts.',
          D: 'The controller runs a program, which is what makes the execution-model question meaningful.',
        },
      },
      {
        ek: 'CRD-2.D.1',
        keyCite: "'Nothing appeared on a screen' does not mean no output: output is any data sent to a device, and email leaving the program qualifies.",
        stem: 'Trace 2: at 2:00 a.m. the portal emails summaries to families. Nothing appears on any screen and nobody is awake. Did the program produce output?',
        options: [
          'No, because output requires something a person can see at the time',
          'No, because email is a message rather than program output',
          'Yes: output is any data sent to a device, and the email leaving the program qualifies',
          'Yes, but only once a family opens the email',
        ],
        correct: 'C',
        why: {
          A: 'Nobody needs to be watching. The definition turns on data leaving the program for a device.',
          B: 'The delivery mechanism does not change what it is. Data went from the program to mail servers and on to devices.',
          C: 'This is the trap the trace is built around, and the rule settles it cleanly.',
          D: 'The output happened when the program sent it. A recipient opening it later is not what makes it output.',
        },
      },
      {
        ek: 'CRD-2.C.6',
        keyCite: 'input can come from a user or other programs',
        stem: 'Trace 2: the district gradebook software transmits grades to the portal with no person involved. What is the input source?',
        options: [
          'Another program, which the CED allows as an input source alongside users',
          'A user, indirectly, because teachers entered the grades earlier',
          'There is no input; the portal reads its own database',
          'The mail server, because that is where the data ends up',
        ],
        correct: 'A',
        why: {
          A: 'Software-to-software input is ordinary, and naming it is what the trace requires.',
          B: 'Earlier human data entry is not the input to this program at this moment. The transmission is.',
          C: 'Data crossed the program boundary inbound, which is what makes it input rather than a self-contained read.',
          D: 'The mail server is an output destination, not the source of the incoming data.',
        },
      },
      {
        ek: 'CRD-2.D.2',
        keyCite: 'The spotlight difference is not a second kind of input; it is remembered state consulted at trigger time.',
        stem: 'Trace 3: the same raccoon triggers the doorbell at 2 a.m. and at 2 p.m., but only the night visit turns on the spotlight. What explains the difference?',
        options: [
          'The camera supplies a second input at night that it does not supply in daylight',
          'The motion event is a different kind of event after dark',
          'The program stored a night-mode value earlier, and consults that remembered state when the event fires',
          'The program is nondeterministic, so identical motion can produce different outputs',
        ],
        correct: 'C',
        why: {
          A: 'Treating the setting as an input is the tempting misread. It was not supplied by the event.',
          B: 'The event is the same motion detection either way. What differs is what the program remembers.',
          C: 'A setting chosen hours earlier is invisible in the moment and decisive for the output, which is the textbook internal value.',
          D: 'Nothing random is involved. The behaviour is fully explained by input plus stored state.',
        },
      },
      {
        ek: 'CRD-2.D.2',
        keyCite: 'the combo multiplier is state that the program itself wrote earlier in the SAME run, while the streak bonus is state persisted from a PREVIOUS run',
        stem: 'Trace 4: two rhythm-game players tap identical patterns and finish with different scores. One had a streak bonus from yesterday; both built combo multipliers during play. How do those two remembered values differ?',
        options: [
          'The combo multiplier is input while the streak bonus is prior state',
          'Both are inputs supplied by the streaming server with the song data',
          'The combo multiplier is written during the same run; the streak bonus persists from a previous run',
          'Neither is prior state, because the scores were computed from taps',
        ],
        correct: 'C',
        why: {
          A: 'The multiplier is not supplied from outside the program. The program itself wrote it.',
          B: 'The server delivered song data. Neither remembered value arrived with it.',
          C: 'Same rule, two different lifetimes, and distinguishing them is what a complete challenge-level answer shows.',
          D: 'The taps alone cannot explain different scores from identical patterns. Stored values are doing the work.',
        },
      },
    ],
  },
};
