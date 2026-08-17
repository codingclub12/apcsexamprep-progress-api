'use strict';
// Big Idea 4: Computer Systems and Networks. Exercise 2 banks, 3 topics.
// Applied challenge: network questions that require reasoning about a failure or
// a scaling limit, not recalling what a protocol is named.
// Pure ASCII, no em-dashes. Zero PII: author content only.

module.exports = [
  {
    slug: 'the-internet',
    title: 'The Internet',
    blurb: 'Six scenarios about packets, routing, and protocols under conditions that are not ideal.',
    brief: 'Everything here works when the network is healthy. These questions put something wrong with it and ask what the design does about it.',
    seo: 'Applied AP CSP 4.1 practice: six scenario questions on packet switching, routing, IP and TCP, and how internet protocols handle loss and scale.',
    questions: [
      {
        tag: 'Analyze',
        scenario: 'A file is split into packets and one packet takes a longer route, arriving after later packets.',
        stem: 'What happens at the destination?',
        options: [
          'The file is corrupted, since packets must arrive in order',
          'The packets are reassembled in the correct order using the sequencing information each packet carries',
          'The whole file is resent automatically',
          'The out of order packet is discarded',
        ],
        correct: 'B',
        why: {
          A: 'Out of order arrival is normal and expected on a packet switched network.',
          B: 'Each packet carries its position, so the receiver can reorder them regardless of arrival order. This is what allows independent routing in the first place.',
          C: 'A full resend would be an enormous waste for a routine event.',
          D: 'Discarding a correctly delivered packet would force an unnecessary retransmission.',
        },
      },
      {
        tag: 'Apply',
        stem: 'What is the main advantage of packet switching over sending a file as one continuous stream on a dedicated path?',
        options: [
          'Packets are compressed and therefore smaller',
          'Packets can take different routes and use whatever capacity is available, so the network degrades gracefully instead of failing when one path is busy or down',
          'Packet switching guarantees packets arrive in order',
          'Packet switching removes the need for protocols',
        ],
        correct: 'B',
        why: {
          A: 'Splitting data into packets does not compress it.',
          B: 'Independent routing per packet is what makes the network fault tolerant and lets it share capacity across many transfers.',
          C: 'Ordered arrival is exactly what packet switching does NOT guarantee, which is why sequencing exists.',
          D: 'Packet switching depends on protocols rather than replacing them.',
        },
      },
      {
        tag: 'Transfer',
        scenario: 'A cable between two regions is cut.',
        stem: 'Why does most traffic between them continue to flow?',
        options: [
          'Because the internet stores a copy of all data at every location',
          'Because redundancy means multiple paths exist between endpoints, and routing directs traffic around the failure',
          'Because packets travel faster when a route is shorter',
          'Because the protocol switches to a different internet',
        ],
        correct: 'B',
        why: {
          A: 'No such universal replication exists.',
          B: 'Redundant paths plus routing that adapts to available links is precisely the fault tolerance the internet was designed around.',
          C: 'Speed on remaining routes is not what preserves connectivity.',
          D: 'There is one internet. Traffic reroutes within it.',
        },
      },
      {
        tag: 'Analyze',
        stem: 'What does an IP address identify, and what identifies the data itself?',
        options: [
          'IP identifies the data, and the packet identifies the device',
          'IP identifies a device on the network, and the packet carries the data along with addressing and sequencing information',
          'IP identifies the user, and the protocol identifies the device',
          'IP identifies the physical location of a person',
        ],
        correct: 'B',
        why: {
          A: 'This reverses the two roles.',
          B: 'Addresses name endpoints so packets can be delivered, and the packet is the unit that carries payload plus the metadata needed to route and reassemble it.',
          C: 'An IP address identifies a device or interface, not a person.',
          D: 'An IP address may hint at a general region but does not identify a person or an exact location.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A student says a faster home connection guarantees faster loading for every website.',
        stem: 'What is the correct refinement?',
        options: [
          'Correct, since bandwidth determines total speed',
          'Bandwidth is one factor, and latency, the server\'s capacity, and congestion anywhere along the path also limit the result',
          'Incorrect, because bandwidth has no effect on loading time',
          'Correct, but only for large files',
        ],
        correct: 'B',
        why: {
          A: 'The slowest link on the path sets the pace, and it is often not the home connection.',
          B: 'End to end performance depends on the whole path plus the server, so improving one segment has limited effect once it is no longer the bottleneck.',
          C: 'Bandwidth clearly matters. It is simply not the only thing that does.',
          D: 'The qualification is real but incomplete, since the other factors apply at every size.',
        },
      },
      {
        tag: 'Apply',
        stem: 'Why does the internet use open protocol standards rather than one company\'s proprietary rules?',
        options: [
          'Open standards make data transfer faster',
          'Any device from any maker can communicate as long as it follows the standard, which is what allows the network to scale globally',
          'Open standards prevent all security problems',
          'Open standards remove the need for physical infrastructure',
        ],
        correct: 'B',
        why: {
          A: 'Openness is about interoperability rather than raw speed.',
          B: 'A shared, published standard means no central authority has to approve each device, which is what let the network grow without limit.',
          C: 'Open standards are not a security guarantee, and openness cuts both ways there.',
          D: 'Cables, routers, and radios are still required.',
        },
      },
    ],
  },

  {
    slug: 'fault-tolerance',
    title: 'Fault Tolerance',
    blurb: 'Six systems with a failure in them. Say whether the design survives it and why.',
    brief: 'Redundancy is only fault tolerance when the redundant part can actually take over. Several of these have redundancy that cannot.',
    seo: 'Applied AP CSP 4.2 practice: six scenario questions on fault tolerance, redundancy, single points of failure, and evaluating network reliability.',
    questions: [
      {
        tag: 'Analyze',
        scenario: 'A network has two routers, but both connect to the internet through the same single cable.',
        stem: 'Is this system fault tolerant against a cable failure?',
        options: [
          'Yes, because there are two routers',
          'No, because the shared cable is a single point of failure that both routers depend on',
          'Yes, because routers can reroute traffic automatically',
          'No, because two routers is never enough',
        ],
        correct: 'B',
        why: {
          A: 'Duplicating one component does not help when both copies depend on a component that is not duplicated.',
          B: 'Fault tolerance requires that no single failure takes the system down, and the shared cable fails that test regardless of router count.',
          C: 'Rerouting needs an alternate path, and there is none.',
          D: 'Two routers can be plenty. The cable is the actual problem.',
        },
      },
      {
        tag: 'Apply',
        stem: 'What does it mean for a system to be fault tolerant?',
        options: [
          'It never experiences failures',
          'It continues to operate, possibly at reduced capability, when part of it fails',
          'It repairs failed components automatically',
          'It fails completely rather than producing wrong results',
        ],
        correct: 'B',
        why: {
          A: 'No system is failure free. Tolerance is about what happens when failure occurs.',
          B: 'Continuing to function through a component failure is the definition, and reduced capability is an acceptable outcome.',
          C: 'Self repair is a stronger property that fault tolerance does not require.',
          D: 'That describes fail safe behavior, which is a different design goal.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A company backs up its servers to a second machine in the same building.',
        stem: 'Which risk remains unaddressed?',
        options: [
          'A single hard drive failure',
          'Any event affecting the whole building, such as a fire or a power loss, which takes both copies at once',
          'A software bug in the backup process',
          'A user deleting a file by accident',
        ],
        correct: 'B',
        why: {
          A: 'A single drive failure is exactly what this backup handles well.',
          B: 'Redundancy only helps against failures that do not hit both copies, and co-locating them leaves them exposed to the same site level event.',
          C: 'A backup bug is a real risk but is not what the physical placement determines.',
          D: 'Accidental deletion is covered by having a second copy.',
        },
      },
      {
        tag: 'Transfer',
        scenario: 'A routing path between two cities has six independent alternative routes.',
        stem: 'What does this provide?',
        options: [
          'Faster transmission on every route',
          'Redundancy, so traffic can continue if one or several routes fail',
          'Guaranteed packet ordering',
          'Compression of the data in transit',
        ],
        correct: 'B',
        why: {
          A: 'More paths do not make any individual path faster.',
          B: 'Multiple independent paths are the concrete form redundancy takes on a network, and it is what allows continued operation through failures.',
          C: 'Multiple routes make ordering less predictable, not more.',
          D: 'Routing does not compress anything.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A website is served from one very reliable machine with a 99.9 percent uptime record.',
        stem: 'What is the accurate assessment?',
        options: [
          'The system is fault tolerant because the machine is reliable',
          'The system is not fault tolerant, because a reliable single component is still a single point of failure',
          'The system is fault tolerant only during peak hours',
          'Uptime percentage determines fault tolerance',
        ],
        correct: 'B',
        why: {
          A: 'Reliability reduces how often failure happens. It does nothing about what happens when it does.',
          B: 'Fault tolerance is a structural property. One component whose loss stops the service means the system has no tolerance for that fault.',
          C: 'Time of day does not change the structure.',
          D: 'Uptime measures history, while fault tolerance describes design.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A team must choose between one large server and three smaller ones with the same total capacity.',
        stem: 'Which argument favors the three smaller servers?',
        options: [
          'Three servers will always be faster',
          'Losing one leaves two thirds of the capacity running, while losing the single server leaves nothing',
          'Three servers cost less to buy',
          'Three servers require less maintenance',
        ],
        correct: 'B',
        why: {
          A: 'Total capacity is the same by construction, so speed is not the difference.',
          B: 'Distributing capacity means a failure degrades service rather than ending it, which is graceful degradation.',
          C: 'Three machines generally cost more, not less.',
          D: 'More machines usually means more maintenance.',
        },
      },
    ],
  },

  {
    slug: 'parallel-distributed-computing',
    title: 'Parallel and Distributed Computing',
    blurb: 'Six speedup calculations and limits, including the part of a job that refuses to go parallel.',
    brief: 'Speedup is sequential time divided by parallel time. The distractors here are what you get by adding times instead of dividing, or by ignoring the sequential portion.',
    seo: 'Applied AP CSP 4.3 practice: six questions computing speedup, distinguishing parallel from distributed computing, and finding the limits of parallelization.',
    questions: [
      {
        tag: 'Apply',
        stem: 'A task takes 60 seconds sequentially and 15 seconds using a parallel solution. What is the speedup?',
        options: ['4', '45', '75', '0.25'],
        correct: 'A',
        why: {
          A: 'Speedup is the sequential time divided by the parallel time, and 60 divided by 15 is 4.',
          B: '45 is the time saved, not the speedup ratio.',
          C: '75 is the sum of the two times.',
          D: '0.25 inverts the ratio by dividing the parallel time by the sequential time, which reports a slowdown rather than a speedup.',
        },
      },
      {
        tag: 'Analyze',
        scenario: 'A job has a 20 second portion that cannot be parallelized and an 80 second portion that can be split perfectly.',
        stem: 'With unlimited processors, what is the shortest possible total time?',
        options: [
          '0 seconds',
          'Just over 20 seconds, because the sequential portion still has to run',
          '25 seconds',
          '80 seconds',
        ],
        correct: 'B',
        why: {
          A: 'A portion that cannot be split must still be executed by one processor.',
          B: 'The unparallelizable portion sets a floor that no number of processors can go below, which is the central limit on parallel speedup.',
          C: '25 does not follow from any specific processor count given here.',
          D: '80 is the parallelizable portion, which is the part that does shrink.',
        },
      },
      {
        tag: 'Apply',
        stem: 'What distinguishes parallel computing from distributed computing?',
        options: [
          'Parallel computing uses multiple computers, distributed uses one',
          'Parallel computing splits a task across processors that typically share one system, while distributed computing spreads it across multiple separate machines',
          'They are the same thing under different names',
          'Distributed computing cannot be used for large problems',
        ],
        correct: 'B',
        why: {
          A: 'This reverses the two definitions. Distributed computing is the one that spreads work across separate machines.',
          B: 'The distinction is where the work runs: multiple processing units within a system versus multiple independent machines coordinating over a network.',
          C: 'They overlap but are distinguished by the CED.',
          D: 'Large problems are exactly what distributed computing is used for.',
        },
      },
      {
        tag: 'Trace',
        stem: 'Four tasks take 8, 6, 10, and 4 seconds. Run in parallel on four processors, how long does the whole set take?',
        options: ['4 seconds', '7 seconds', '10 seconds', '28 seconds'],
        correct: 'C',
        why: {
          A: '4 is the shortest task, and the set is not finished until every task is.',
          B: '7 is the average, which nothing here measures.',
          C: 'With one processor per task, all run at once and the set finishes when the longest one does, at 10 seconds.',
          D: '28 is the sequential total.',
        },
      },
      {
        tag: 'Evaluate',
        scenario: 'A student says adding processors always reduces running time proportionally.',
        stem: 'What is the correct refinement?',
        options: [
          'Correct, since work divides evenly across processors',
          'Only the parallelizable portion divides, and coordination overhead grows with processor count, so returns diminish and eventually the sequential floor dominates',
          'Incorrect, because adding processors never helps',
          'Correct, but only up to four processors',
        ],
        correct: 'B',
        why: {
          A: 'Not all work divides, and the part that does not is unaffected by processor count.',
          B: 'Both limits are real: a fixed sequential portion and the cost of coordinating more workers, which is why speedup curves flatten.',
          C: 'Adding processors helps substantially on parallelizable work.',
          D: 'No fixed threshold applies. It depends on the job.',
        },
      },
      {
        tag: 'Transfer',
        scenario: 'A task must process each item in a list, and each item\'s result depends on the previous item\'s result.',
        stem: 'How well does this parallelize?',
        options: [
          'Perfectly, since each item is a separate piece of work',
          'Poorly, because the dependency forces the items to be processed in order',
          'Perfectly, as long as enough processors are available',
          'It cannot be computed at all',
        ],
        correct: 'B',
        why: {
          A: 'The pieces are not independent, which is what parallel splitting requires.',
          B: 'A chain of dependencies serializes the work regardless of how many processors are available.',
          C: 'Processor count cannot break a dependency chain.',
          D: 'It computes fine sequentially. Only the parallel speedup is unavailable.',
        },
      },
    ],
  },
];
