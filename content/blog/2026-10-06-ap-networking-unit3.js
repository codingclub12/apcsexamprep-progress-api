'use strict';
// Weekly course post: AP Networking. Drill piece scoped specifically to Unit 3,
// Managing Many Connections: a segmented LAN with multiple subnets, multiple
// DHCP scopes, and multiple devices that can fail in ways a single flat
// network never can. Complementary to the Unit 1 drill post, which stays at
// the level of one device on one network, and to the subnetting, DHCP, and
// router/switch/access point explainers, which this post assumes and builds
// on rather than re-teaching. None of the ten scenarios below reuses a
// specific device combination, symptom, or root cause already used as an MCQ
// or worked example anywhere else on this blog's AP Networking posts,
// including the segmentation questions in the units-map post and the
// staff/visitor network split in the four-skills post.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'What AP Networking Unit 3 actually adds to Units 1 and 2',
  'Why segment at all: two questions before any fault appears',
  'Subnetting a network built from more than one segment',
  'DHCP once there is more than one segment',
  'Troubleshooting when segments interact',
];

const meta = {
  title: 'AP Networking Unit 3: Ten Segmented LAN Questions, Hardest Last',
  handle: 'ap-networking-unit-3-segmented-lan-questions',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'ap networking unit 3',
  publishOn: '2026-10-06',
  seoTitle: 'AP Networking Unit 3: Ten Segmented LAN Questions',
  seoDescription: 'Ten AP Networking Unit 3 practice scenarios on segmentation, subnetting, DHCP across segments, and multi-device troubleshooting, easiest to hardest.',
  summary: 'Ten scenario-style practice questions scoped specifically to AP Networking Unit 3, Managing Many Connections: why a LAN gets segmented at all, subnetting a network built from more than one segment, DHCP once there is more than one segment to serve, and troubleshooting the harder failures that only show up once segments start interacting. Ordered easiest to hardest, with three presented as interactive practice questions and the rest as worked walkthroughs.',
  tags: ['AP Networking', 'Unit 3', 'Practice Questions', 'Segmented LAN', 'Course Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('AP Networking Unit 3, Managing Many Connections, is where a single shared network becomes several smaller ones on purpose. Here are ten scenario-style practice questions scoped specifically to that shift, covering why a LAN gets segmented at all, subnetting across more than one segment, DHCP once there is more than one segment to serve, and the multi-device failures that only show up once segments start interacting, ordered easiest to hardest and grouped by which of those four things the scenario is actually about.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'October 6, 2026', updated: 'October 6, 2026', readingMinutes: 14,
  }),
  H.toc(SECTIONS),

  H.p('Most of the AP Networking practice on this blog so far has either stayed at the level of one device on one network, the territory our <a href="/blogs/ap-networking/ap-networking-unit-1-single-device-questions">Unit 1 practice post</a> covers, or explained a single mechanism, subnetting, DHCP, or a router versus a switch, on its own. AP Networking Unit 3 asks something different. It is the unit where a network stops being one flat space and becomes several smaller networks stitched together on purpose, and the ten scenarios below are scoped specifically to that shift: not one device failing, and not one concept explained in isolation, but the reasoning that only shows up once more than one segment is actually in the picture.'),
  H.p('That distinction matters more than it sounds like it should. A device with a bad address behaves the same way whether it sits on a flat network or a segmented one, which is why the earlier Unit 1 post never needed more than one subnet to make its point. Unit 3 content is different specifically because segmentation introduces new places for a failure to hide: a rule at the boundary between two segments, a DHCP scope that only covers three of a network\'s four segments, a device that got physically moved from one segment to another and kept configuration that belonged to the old one. None of that exists on a single flat network, which is exactly why it gets its own unit and its own set of questions here.'),

  H.h2(SECTIONS[0]),
  H.p('Unit 1 taught the vocabulary of a single device: an address, a connection, a lookup. Unit 2 applied that same vocabulary to one shared network with several devices on it, still one broadcast domain, still one address range, still one place for a router to sit at the edge. Unit 3 is where the network itself gets divided, and every skill from the first two units has to be reapplied with the added wrinkle of "which segment." A subnet mask still does the same job it did in <a href="/blogs/ap-networking/ap-networking-subnetting-without-tears">the earlier piece on subnetting</a>, but now there are several of them in play at once, each defining a different group. DHCP still hands out addresses automatically, but now there has to be a plan for which pool of addresses belongs to which segment, a topic our <a href="/blogs/ap-networking/ap-networking-dhcp-address-assignment">DHCP explainer</a> did not need to cover because it assumed one flat network with one pool.'),
  H.p('The practical result is that a Unit 3 scenario almost always names more than one segment, department, or VLAN even when the actual fault turns out to be narrow, and reading a scenario correctly means noticing which segment or segments are actually affected before reaching for a cause. A symptom that touches every device on one segment and nothing on any other segment points somewhere very different than a symptom that touches one specific device regardless of which segment it happens to sit on. Keep that distinction in mind through all ten scenarios below, since several of them lean on exactly that difference to eliminate an option.'),

  H.h2(SECTIONS[1]),
  H.p('Before any single scenario breaks, it is worth being able to reason about why a network gets divided into segments in the first place, and what actually changes once it has been. The two questions below are not fault scenarios in the usual sense. They are reasoning questions about the value segmentation adds and the failure mode it is specifically built to contain.'),

  H.h3('The library kiosk that could reach the staff catalog'),
  H.p('A public library runs its staff catalog terminals, which hold patron borrowing history and staff notes, and its public patron internet kiosks on the same physical switch, with every device handed an address out of the same single pool. A patron using one of the kiosks discovers, entirely by accident while poking around the browser\'s network settings, that the kiosk can reach the staff catalog terminal\'s login page directly. Nothing was hacked and no password was guessed. The kiosk simply had a normal, working path to a device it was never supposed to be able to reach at all.'),
  H.mcq({
    n: 1,
    stem: 'What change would most directly prevent a patron kiosk from being able to reach the staff catalog terminal at all, while still letting both groups of devices reach the internet through the library\'s one connection?',
    options: [
      'Give every kiosk and every staff terminal a stronger individual login password',
      'Place the kiosks and the staff terminals on separate segments, with the boundary between them able to block traffic that has no reason to cross it',
      'Replace the shared switch with a faster one so both groups of devices perform better',
      'Turn off the patron kiosks whenever staff are actively using the catalog terminals',
    ],
    correct: 1,
    why: 'A stronger password protects the login screen but does nothing about the fact that a kiosk can reach that login screen in the first place, which is the actual exposure here. A faster switch changes performance, not reachability. Turning kiosks off during certain hours is not a real fix, since the kiosks are meant to be usable whenever the library is open. What actually removes the exposure is separating the two groups of devices onto different segments with a boundary between them, the defining move of Unit 3, so that a kiosk has no ordinary path to the staff terminal at all, while both segments can still be allowed through to the one shared internet connection at that same boundary. That boundary is precisely where a rule can allow internet traffic out while blocking kiosk-to-staff traffic entirely.',
  }),

  H.h3('The rogue laptop that slowed down the machines on the shop floor'),
  H.p('A small manufacturing shop runs its networked production equipment, sensors and controllers that keep an assembly line synchronized, on the same flat network as the general office wifi, since the shop has always been small enough that nobody saw a reason to divide it. An employee brings in a personal laptop with a misbehaving network driver that starts flooding the network with broadcast traffic, the kind of message every device on a flat network receives whether it is relevant to them or not. Within minutes, the production equipment starts missing timing signals it depends on, and the assembly line has to be paused, even though nothing about the production equipment itself changed or malfunctioned.'),
  H.p('The production equipment was never the problem here, and understanding why is the entire point of this scenario. Broadcast traffic on a flat network reaches every device sharing that network by design, which is exactly what one laptop with a broken driver just demonstrated at the worst possible time. Had the production equipment been on its own segment, separate from the general office devices where a personal laptop is far more likely to show up, that same broadcast storm would have stayed contained to the office segment and the boundary between segments would have kept it from ever reaching the production equipment at all. This is the other half of why Unit 3 content exists alongside the security reasoning in the scenario above: segmentation is not only about keeping one group of devices from reaching another on purpose, it is about keeping one segment\'s bad behavior, even accidental bad behavior from a single misbehaving device, from spilling over into a segment that has nothing to do with it.'),

  H.h2(SECTIONS[2]),
  H.p('Once a network is actually divided into segments, subnetting stops being an abstract exercise and becomes a planning problem with real consequences if it is done carelessly. The three scenarios below are about the planning side of Unit 3: sizing a segment correctly, keeping segments from overlapping, and understanding what a segment boundary is actually allowed to do to traffic crossing it.'),

  H.h3('The fourth department that ran out of room'),
  H.p('A growing nonprofit starts with three departments, each given its own small segment when the network was first built out, sized to comfortably fit each department\'s device count at the time with a little room to spare. A fourth department gets created a year later, and rather than planning a new segment sized for where that department is headed, whoever set it up simply carved out a segment the same small size as the original three, since that size had always been enough before. Over the following months the new department hires steadily, and new laptops keep joining. For the first few weeks, everything works fine. Then, with no configuration changes made by anyone, new laptops joining that one department\'s segment start failing to get a usable address at all, while every laptop already on the segment keeps working normally and every other department\'s segment is entirely unaffected.'),
  H.mcq({
    n: 2,
    stem: 'Given that only new laptops joining the fourth department\'s segment are affected, while existing laptops on that same segment and every device on the other three segments keep working normally, what is the most likely cause?',
    options: [
      'The DHCP server itself has stopped responding to any request on the whole network',
      'The fourth department\'s segment was sized too small for its device count, so its pool of available addresses has run out',
      'A firewall rule was recently added that blocks new devices specifically',
      'The fourth department\'s switch has a hardware fault',
    ],
    correct: 1,
    why: 'A DHCP server that stopped responding entirely, a new firewall rule targeting new devices, and a switch hardware fault would all be expected to affect more than just brand new laptops on one specific segment, and none of them explain why devices already holding a lease on that same segment keep working fine while only new arrivals fail. What actually fits every detail is a segment sized too small for how much it grew: a small pool of addresses that was comfortably enough for the department at launch is now fully handed out to the devices already there, so a new laptop asking for an address finds nothing left in the pool to offer, while a laptop that already holds a lease from before the pool filled up never has to ask again until that lease is due for renewal. This is a planning failure specific to a segmented network, since a single flat network sized for the whole organization at once would not have hit this ceiling nearly as fast.',
  }),

  H.h3('The two segments that were quietly handed the same addresses'),
  H.p('A mid-sized company expands from two office floors to three, and a technician sets up a new segment for the third floor by copying the address range from an existing template rather than checking what ranges the other two floors already use, assuming the template was unique because it had always worked before. It was not: the new third-floor segment ends up using the exact same range of addresses as the first-floor segment. For a while nothing seems wrong, since traffic mostly stays within each floor\'s own segment. Then employees start reporting strange, inconsistent problems: some file requests from the third floor land on a first-floor printer instead of the intended device, and some devices on the first floor briefly lose contact with each other for no obvious reason, with no pattern anyone can pin down to a specific time of day or a specific device.'),
  H.p('The inconsistency itself is the clue here, and it is worth sitting with why. Two segments that legitimately share no address range at all fail in a clean, predictable way when something goes wrong: a boundary either allows traffic through or it does not, and the failure looks the same every time. Two segments that have accidentally been given the identical range of addresses do not fail cleanly, because the network genuinely cannot always tell which physical segment a given address is supposed to belong to, so which device actually receives a given piece of traffic can depend on timing and which segment happened to respond first. That is exactly the kind of intermittent, hard-to-reproduce symptom described above, and it is a category of fault that simple same-subnet or cross-subnet troubleshooting does not anticipate, because it assumes every subnet used across a network is unique in the first place. The fix is not a firewall rule or a cable check. It is renumbering one of the two segments so their address ranges no longer collide.'),

  H.h3('The one giant segment that never actually solved anything'),
  H.p('A school district, after finally deciding to segment its network by building, decides to make the segment for its largest building deliberately huge, sized to hold every possible device the building could ever need for the next decade, reasoning that a bigger segment now means never having to resize it later. Years pass and the building fills with far more devices than any other building on the district\'s network, all sharing that one oversized segment. Students and staff in that one building start reporting the same kind of general slowdown that a flat, unsegmented network produces, even though the district technically finished its segmentation project years ago and every other, more modestly sized building segment performs fine.'),
  H.p('This is the scenario worth remembering precisely because it looks like segmentation failed when what actually failed was sizing. A subnet, however it is drawn, is still one broadcast domain on its own, the same broadcast domain problem covered in the piece on <a href="/blogs/ap-networking/ap-networking-subnetting-without-tears">what subnetting is actually for</a>. Making one segment enormous so it never has to be resized does technically satisfy "the network is segmented," but it recreates the exact broadcast traffic problem segmentation was supposed to solve, just at the scale of one oversized segment instead of the whole district. The other buildings, sized reasonably for what they actually needed, never hit that ceiling. The fix here is not undoing segmentation, it is dividing that one oversized building segment into a few properly sized ones, the same reasoning that justified segmenting the district in the first place, just applied a second time at a smaller scale.'),

  H.h2(SECTIONS[3]),
  H.p('DHCP still does the same job on a segmented network that it does on a flat one, handing a device a usable address the moment it joins, but a segmented network needs a real plan for which pool of addresses serves which segment, and that plan can fail in ways a single flat network with one DHCP pool never has to worry about.'),

  H.h3('The new segment nobody told the DHCP server about'),
  H.p('A company stands up a brand new segment for a temporary project team, wires up a switch for it, and connects it into the rest of the network correctly. What nobody remembers to do is add a matching address pool for that new segment on the company\'s central DHCP server, which already serves every other existing segment without any trouble. Every single device that joins the new project team\'s segment, laptops, a shared printer, a conference room display, ends up with a self-assigned placeholder address and effectively no usable network access, while every device on every other, already-configured segment keeps working exactly as it always has.'),
  H.p('The scale of what fails is the detail that separates this from a single-device DHCP problem. A single device failing to get an address, the kind of failure our piece on <a href="/blogs/ap-networking/ap-networking-dhcp-address-assignment">how DHCP actually works</a> walks through, usually points at something specific to that one device or its one request. Here, every device on one entire segment fails the same way at once, while every other segment is completely unaffected, which points instead at the segment itself never having been given anything to draw addresses from in the first place. The DHCP server is not broken. It is doing exactly what it was configured to do, serving every segment it was told about, and this new segment was simply never added to that list. The fix is adding a properly sized address pool for the new segment on the DHCP server, not troubleshooting any individual device on it.'),

  H.h3('The satellite wing where every laptop shows the same placeholder address'),
  H.p('A school adds a new wing to its building, connected back to the main network through a router rather than sitting directly on the same switch as everything else, since the wing is physically separate enough to warrant its own segment. The school\'s one central DHCP server, which has served every other segment in the main building for years without issue, sits several hops away from this new wing. Every laptop that connects in the new wing gets a self-assigned placeholder address and no real connectivity, while every device in the main building, served by the exact same DHCP server, keeps working normally.'),
  H.p('This looks at first like a repeat of the missing-pool scenario above, and the surface symptom is nearly identical: an entire segment fails at once while every other segment is fine. The underlying cause here is different, though, and it is worth telling the two apart. A DHCP request starts life as a broadcast, the same way it does on a single flat network, but a broadcast does not cross a router boundary on its own the way it travels freely within one segment. On a single-segment network this never comes up, since the DHCP server and every device asking it for an address share the same segment by definition. Once a DHCP server sits on a different segment than the devices it is meant to serve, something at the router between them has to be configured to forward those broadcast requests along to the server, and that configuration is exactly what is missing in this wing. The pool for this segment might be sized correctly and might already exist on the server. The requests asking for an address from it are simply never making the trip across the router boundary to reach it, which is why setting up the relay at that boundary, not resizing anything on the DHCP server itself, is what actually fixes this one.'),

  H.h2(SECTIONS[4]),
  H.p('The hardest Unit 3 scenarios are the ones where the fault sits specifically in how segments interact with each other rather than in any one segment on its own, and where the evidence has to be read carefully to tell a rule problem apart from a configuration problem apart from a genuinely misrouted device.'),

  H.h3('The allow rule that never actually took effect'),
  H.p('A company\'s network is segmented into a staff segment and a security camera segment, with a firewall sitting at the boundary between them. For months, an existing rule at that boundary has denied all traffic attempting to cross from the staff segment into the camera segment, a deliberate security decision. Facilities now needs staff on a specific team to be able to view live camera feeds directly from their desks, so an administrator adds a new rule explicitly allowing that specific traffic, saves the change, and confirms the rule is present in the firewall\'s configuration. Staff on that team still cannot reach the cameras at all, exactly as before the new rule was added.'),
  H.mcq({
    n: 3,
    stem: 'The new allow rule is confirmed to be present in the firewall\'s configuration, and it correctly describes the traffic that should now be permitted. Staff still cannot reach the cameras. What is the most likely explanation?',
    options: [
      'The firewall itself has stopped enforcing any rules at all',
      'The staff segment\'s DHCP pool has run out of addresses',
      'The new allow rule was added after the existing broad deny rule in the list the firewall evaluates in order, so the deny rule matches the traffic first and the allow rule is never reached',
      'The camera segment\'s switch has a hardware fault',
    ],
    correct: 2,
    why: 'A firewall that stopped enforcing rules entirely would be expected to let traffic through rather than continue blocking it, which is the opposite of what is happening. A DHCP pool running out of addresses on the staff segment would prevent devices from getting an address at all, not selectively block one kind of already-connected traffic, and a switch hardware fault on the camera segment would be expected to affect every device trying to reach that segment, not just this one specific case in a way that matches the old behavior exactly. Firewall rules are generally evaluated in order, and the first rule that matches a given piece of traffic is the one that gets applied, with rules listed after it never even being consulted for that traffic. An existing broad rule denying all staff-to-camera traffic, sitting earlier in that evaluated order than a newly added specific allow rule, matches first every time and the new rule underneath it never gets a chance to apply, even though it is correctly written and genuinely present in the configuration. The fix is moving the new allow rule above the broad deny rule, not rewriting either one.',
  }),

  H.h3('The desk move that left one laptop pointed at the wrong gateway'),
  H.p('An employee\'s desk moves from the engineering wing to the marketing wing as part of an office reshuffle, and their laptop gets physically plugged into a new wall jack that belongs to the marketing segment instead of the engineering segment it used to sit on. The laptop, however, still has a manually entered static configuration left over from engineering, including a default gateway address that belonged to the engineering segment\'s router interface, not the marketing segment\'s. The laptop can reach every other device on the marketing segment it now physically sits on without any trouble, but it cannot reach any other segment, including the internet, at all.'),
  H.p('This is a variation on a default gateway failure, but the segmented setting changes what the evidence actually means. On a single flat network, a broken gateway setting usually means everything outside the local network fails while everything local still works, and that pattern alone is often enough to point at the gateway directly. Here, the same pattern shows up, local traffic on the marketing segment succeeds while everything beyond it fails, but the deeper explanation is specific to a multi-segment network: the laptop is physically and correctly a member of the marketing segment now, its address and subnet mask are almost certainly still fine for reaching devices on that same segment directly, but its gateway address is pointed at a router interface that belongs to an entirely different segment and simply is not reachable from where the laptop now physically sits. Every attempt to leave the marketing segment gets sent toward a gateway address that does not exist on this segment at all, which fails in exactly the same way a missing gateway would, even though a gateway address is technically present in the configuration. The fix is updating the laptop\'s configuration to use the marketing segment\'s own gateway address, or simply switching it back to automatic configuration so DHCP supplies the correct one for wherever it happens to be plugged in.'),

  H.h3('The device that ended up on the wrong segment entirely'),
  H.p('A company adds a new desk in what is supposed to be the finance segment, and a technician runs a new cable from that desk to an available port on the nearest switch. What the technician does not check is which segment that specific switch port has been assigned to, and it turns out the port was left configured for the general staff segment from an earlier office layout rather than being reassigned to finance. The new desktop plugged into it gets a normal-looking address with no errors of any kind, reaches the internet fine, and reaches the shared printer fine. It cannot reach the finance department\'s internal server at all, and unlike a finance department machine, it can reach several general staff resources that finance devices are specifically not supposed to be able to see.'),
  H.p('Nothing about this desktop\'s own configuration is wrong, which is exactly what makes it the hardest of the ten. Its address, its subnet mask, and its gateway are all internally consistent and all correct for the segment it is actually on. The mistake happened one layer below anything the desktop itself can see or report: the switch port physically connects that desk to the staff segment rather than the finance segment, so the desktop received a perfectly valid address from the staff segment\'s own DHCP pool and is, in every functional sense, a genuine member of the staff segment, regardless of which department\'s desk it happens to be sitting on or which team it was intended for. It can reach what staff-segment devices can reach and cannot reach what only finance-segment devices can reach, because that is which segment it actually landed in, and no setting on the desktop itself could ever have caused or fixed that. The fix lives entirely on the switch: reassigning that specific port to the finance segment, after which the desktop, still without a single setting changed on the desktop itself, would pick up a new address from the correct pool and gain exactly the access a finance department machine is supposed to have.'),

  H.h2('Keeping the ten scenarios straight'),
  H.p('Laid out next to each other, the pattern that separates a single-device fault from a genuinely segment-level one is easier to hold onto than any one scenario on its own.'),
  H.table(
    ['Scope of the symptom', 'What that scope tends to rule out', 'What it tends to point toward'],
    [
      ['One device, one segment, everything else on that segment fine', 'The segment as a whole, the DHCP pool for that segment, and the boundary between segments', 'Something local to that one device: its own address, mask, gateway, or a stale leftover setting'],
      ['Every device on one segment, every other segment fine', 'A problem with any single device, and a problem with the DHCP server serving other segments correctly', 'Something specific to that whole segment: a missing DHCP pool, a missing relay across a router boundary, or a segment sized too small for its own growth'],
      ['A specific kind of cross-segment traffic fails while other cross-segment traffic on the same path succeeds', 'A dead link between the segments and a DHCP problem on either side', 'A rule at the boundary, most often one that is present but never actually gets evaluated because something broader matches first'],
      ['A device behaves as though it belongs to the wrong segment entirely, despite normal-looking settings', 'Anything about that device\'s own configuration', 'Where the device actually landed at the switch or cabling level, one layer below anything the device itself can report'],
    ]
  ),
  H.box('key', 'The one habit worth building from this post', '<p>Before reasoning about a Unit 3 scenario at all, decide how many segments the symptom actually touches: one device, one whole segment, or the boundary between two segments. That single question does most of the elimination work before you ever look at an answer choice, the same way deciding which of the three Unit 1 buckets a symptom belonged to did on a single-device network.</p>'),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What does AP Networking Unit 3 actually cover?', a: 'Unit 3, Managing Many Connections, covers planning and building a segmented LAN, switching and topologies, verifying access across segments, segmentation security, firewalls and filtering, and diagnosing a network once it is divided into more than one segment. It is the first unit that requires reasoning about several segments at once rather than one device or one flat shared network.' },
    { q: 'How is a Unit 3 scenario different from a Unit 1 scenario?', a: 'A Unit 1 scenario stays within one device on one network. A Unit 3 scenario introduces multiple segments, so the same underlying mechanisms, addressing, DHCP, a default gateway, now have to be reasoned about in terms of which specific segment is affected, which is often the detail that separates the right answer from a technically plausible but wrong one.' },
    { q: 'Why does the same symptom, like a missing gateway, mean something different on a segmented network?', a: 'On a single flat network, a broken gateway usually just means local traffic works and everything else fails. On a segmented network, that same pattern can also mean a device is correctly configured for a segment it no longer physically sits on, or is pointed at a gateway address that belongs to an entirely different segment, which is a distinct root cause that only exists once more than one segment is in play.' },
    { q: 'Do I need to memorize firewall rule syntax for Unit 3 questions?', a: 'No. What matters is the reasoning behind rule order, such as a broad rule matching before a more specific one gets evaluated, and behind DHCP planning across segments, not memorizing the exact configuration syntax any particular vendor uses.' },
  ]),

  H.cta({
    heading: 'Build the full Unit 3 skill set, not just ten questions',
    body: 'Managing Many Connections builds from planning a segmented LAN through firewalls, filtering, and multi-segment diagnosis, one topic at a time, to the College Board framework.',
    links: [
      { href: '/pages/ap-networking', text: 'Explore the course' },
      { href: '/pages/ap-networking-exam', text: 'See the exam format', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the AP Networking course framework current in October 2026. Last reviewed October 6, 2026.'),
]);

module.exports = { meta, body };
