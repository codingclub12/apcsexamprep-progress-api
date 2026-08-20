'use strict';
// Weekly course post: AP Networking. A study habit post, not a real-time
// reasoning post. The troubleshooting-method post (2026-08-18) teaches the
// elimination method for a problem in front of you right now. The
// diagram-first post (2026-09-08) teaches a visualization habit for that same
// in-the-moment reasoning. Neither one is about what happens after the fault
// is fixed. This post is: keep a running written record of real faults over
// weeks, so pattern recognition across many actual faults replaces memorizing
// one abstract method the week before the exam. Both earlier posts are
// referenced as techniques to apply while logging, not re-taught here.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Why a Fault Log Beats Cramming Scenario Questions the Week Before',
  'What Belongs in Every Fault Log Entry',
  'A Worked Fault Log Entry, Start to Finish',
  'What Reviewing Your Own Fault Log Reveals Over Time',
];

const meta = {
  title: 'The Fault Log That Becomes Your Revision Guide',
  handle: 'ap-networking-fault-log-revision-guide',
  blogHandle: 'ap-networking',
  course: 'ap-networking',
  targetKeyword: 'fault log',
  publishOn: '2026-10-02',
  seoTitle: 'Fault Log: Turn Real Faults Into a Revision Guide',
  seoDescription: 'Keep a fault log while you practice AP Networking scenarios, and turn weeks of real faults into a revision guide that beats cramming the week before the exam.',
  summary: 'How to keep a running fault log during AP Networking practice, so weeks of real logged faults become a self-built revision guide by exam time, with a worked log entry and two practice questions on what a strong entry captures.',
  tags: ['AP Networking', 'Fault Log', 'Study Skills', 'Troubleshooting', 'Course Guide'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('A fault log is a running written record of every real network fault you work through, kept from the first week of practice, not assembled the night before the exam. Keep one long enough and it stops being homework. It becomes the revision guide you actually study from.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 10,
  }),
  H.toc(SECTIONS),

  H.p('Two earlier posts on this blog teach you how to reason about a network fault while you are standing in front of it. One teaches the elimination method: use what still works to rule out causes instead of guessing. Another teaches a quick diagram that makes the gaps in your evidence visible instead of buried in your head. Both are real-time skills. You reach for them the moment a symptom shows up, and once the fault is fixed, the reasoning that solved it is done its job and you move on to the next problem.'),
  H.p('This post is about what happens after that. A fault log is the habit of writing down every fault you actually work through, in a consistent short format, the day it happens, so that by the time the exam arrives you have built a personal collection of real fault patterns and their resolutions instead of trying to hold a single abstract method in your head under pressure. It is a study habit, not a diagnostic method, and it is the difference between having practiced networking and having a record of having practiced it.'),

  H.h2(SECTIONS[0]),
  H.p('The standard way most students prepare for scenario questions is to leave it for the last week and grind through as many practice scenarios as they can fit in, back to back, hoping volume alone builds the pattern recognition the exam rewards. That approach is not wrong exactly, it is just late, and it throws away the best evidence a student has: the faults they already worked through correctly weeks earlier, which nobody wrote down and which memory has already smoothed into a vague blur by review week.'),
  H.p('A fault log fixes that by capturing the fault the moment it is resolved, not the week before the test. Every lab exercise, every practice scenario, every fault you actually track down and fix becomes a dated entry with the real symptom, the real steps, and the real cause, sitting in one place you can reopen later. Cramming scenario questions the week before the exam teaches you one method, once, under artificial time pressure. A fault log built over weeks teaches you the same method applied to a dozen different real situations, spread out, at a pace where the pattern actually has time to sink in.'),
  H.box('key', 'The core claim', '<p>Pattern recognition across many real faults beats memorizing one method abstractly. A method you can recite is not the same thing as a method you have already applied a dozen times to a dozen different symptoms, and a fault log is what turns the second one into something you can actually review.</p>'),
  H.p('There is a second, quieter benefit. A fault you solved three weeks ago and never wrote down is gone by exam week in every way that matters, even if you technically remember that you solved something. A fault you logged the day it happened is still there, in your own words, with the actual evidence that led to the actual cause. Reviewing five real logged faults the week before the exam is a far better use of that week than working five brand new scenarios cold, because the logged faults already come with your own reasoning attached, ready to be studied rather than solved from scratch again.'),

  H.h2(SECTIONS[1]),
  H.p('A fault log entry only needs five fields, always in the same order, because that order mirrors the elimination method itself: what you observed, what you checked and in what sequence, what each check ruled out, what the fault actually turned out to be, and what fixed it.'),
  H.ol([
    'Symptom observed: the specific, concrete thing that was wrong, stated the way you actually saw it, not a summary. "Could not load any website" is weaker than "browser showed a blank page on every site, but the printer and file share on the same network worked fine."',
    'What was checked, in order: the actual sequence of checks you ran, in the order you ran them. This is the part most students skip, and it is the part that matters most, because the order is the elimination method in action.',
    'What was eliminated at each step: what each check ruled out, and why. A check that does not eliminate anything is not doing diagnostic work, it is just an action.',
    'Root cause: what the fault actually turned out to be, stated specifically, not the category it belongs to. "Wrong default gateway" is a root cause. "A network setting" is not.',
    'What fixed it: the specific change that resolved the fault, and how you confirmed it actually worked afterward rather than just assuming it did.',
  ]),
  H.p('Notice that the log is not asking for a diary entry about how frustrating the fault was, or a general lesson learned. It is closer to a lab notebook than a journal: terse, specific, and useful to you months later when the details of this particular fault would otherwise have faded into every other fault you have ever seen.'),
  H.box('tip', 'Log it the same day, not review week', '<p>The elimination method from our earlier <a href="/blogs/ap-networking/ap-networking-troubleshooting-method">troubleshooting method post</a> tells you what to check and in what order while you are solving the fault. The moment it is solved, that same sequence is the fault log entry, almost word for word. Waiting until review week to write it up means reconstructing that sequence from memory, and memory rounds off exactly the details that made the fault worth logging in the first place.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Here is a full entry, built the way it would actually get written the day the fault happened. The scenario: a laptop connects to home wifi and is assigned what looks like a completely normal address in the correct range. It can reach the printer and a shared network drive on the same local network without any trouble. It cannot load a single website, whether typed as a domain name or as a raw numeric address.'),
  H.p('Applying the elimination method from the earlier post on this blog, the fault gets worked through a step at a time rather than guessed at. A second laptop on the same wifi network loads every site normally, which rules out the router and the internet connection as a whole, since a router-wide or provider-wide failure would affect both laptops, not just one. The failing laptop reaching the printer and the shared drive rules out the wifi link itself being down, since a dead wireless connection would not reach anything local either. What is left is something specific to that one laptop\'s path out of the local network. A quick sketch in the style of the earlier <a href="/blogs/ap-networking/ap-networking-network-diagram-first">diagram-first post</a> would have shown this immediately: every line inside the local network labeled working, and only the line leaving the network toward the internet left unlabeled, which is exactly where the fault turned out to live.'),
  H.p('Pinging the router by its own local address succeeds, confirming the local link is genuinely fine and not just appearing fine. Trying to reach an external address by its raw number, rather than a name, also fails, which is the detail that rules out a DNS problem specifically, since a DNS fault would still let a raw numeric address through. Checking the laptop\'s network settings shows a manually entered default gateway address left over from an earlier setup, one digit different from the router\'s actual address, which explains everything: local traffic worked because it never needed to leave the network, and anything bound for the wider internet was being sent to an address that does not exist.'),
  H.table(
    ['Field', 'What was actually logged'],
    [
      ['Symptom observed', 'Laptop had a normal-looking IP address, reached the printer and the shared drive fine, but could not load any website by name or by raw numeric address.'],
      ['What was checked, in order', '1. A second laptop on the same wifi, which loaded every site normally. 2. The failing laptop reaching the printer and shared drive locally, which it did. 3. Pinging the router itself by its local address, which succeeded. 4. Reaching an external site by raw numeric address instead of a name, which still failed.'],
      ['What was eliminated at each step', 'Step 1 ruled out the router and the internet connection as a whole. Step 2 ruled out the wifi link itself. Step 3 confirmed the local link was genuinely healthy. Step 4 ruled out DNS specifically, since a raw address does not depend on name resolution.'],
      ['Root cause', 'A manually entered default gateway address, left over from an earlier network setup, that was one digit off from the router\'s actual address, so nothing bound for outside the local network had a valid path out.'],
      ['What fixed it', 'Switched the laptop\'s IP configuration back to automatic instead of manual, so it picked up the correct gateway address from the router directly, and confirmed the fix by loading three unrelated sites by name right after reconnecting.'],
    ],
  ),
  H.p('That table is the whole entry. It took a few minutes to write immediately after the fix worked, and every field is something that would already be forgotten in the specific way that matters by the time review week arrives. This is the target: an entry short enough to write without breaking your flow, specific enough that reading it again in April tells you something a vague memory of "had a wifi problem once" never could.'),

  H.h2(SECTIONS[3]),
  H.p('A single fault log entry is useful on its own, mostly as evidence you can transcribe into a written answer. A fault log with a dozen entries is useful in a completely different way, because it lets you see across faults rather than just within one, and that is where the real payoff of keeping the log over weeks instead of assembling it in a rush shows up.'),
  H.p('Read five or six entries side by side and a pattern usually emerges that no single entry could show on its own. A student who logs faithfully for a few weeks will often notice something like: most of my faults turn out to be a misconfigured setting, a wrong gateway, a stale DNS entry, a leftover manual configuration, rather than anything physical. The cable was never actually the problem. The wifi signal was never actually weak. Almost every fault, once traced all the way to its root cause field, turned out to live in a setting somewhere rather than in a wire or a radio signal.'),
  H.p('That pattern is worth knowing on its own terms, because it tells you where to spend your attention first on a new, unfamiliar scenario. But it is also close to a fact about how AP Networking scenario questions are actually written, and noticing it yourself from your own real faults sticks far better than being told it in a single sentence like this one. A student who has logged a dozen faults and watched most of them resolve to a configuration issue rather than a physical one walks into a new scenario already leaning the right direction before reading a single answer choice.'),
  H.box('warn', 'What a fault log is not', '<p>It is not a replacement for the elimination method or for a diagram while you are actually solving a fault. It is what you do after, so the reasoning you already did leaves a trace you can review later. Skipping the elimination method and just writing down a guess defeats the entire purpose, because the log is only as useful as the reasoning it records.</p>'),
  H.p('Reviewing entries together also surfaces the opposite pattern just as usefully: the faults that do not fit the trend. If nine of your ten logged faults were configuration issues and the tenth was a genuinely dead cable, that tenth entry is worth rereading specifically because it is the exception, and the exam is just as likely to test the version of the scenario where the boring, common explanation is wrong and the physical layer really is the problem. A fault log built over weeks gives you both the pattern and its exceptions, in your own words, which a single week of last-minute practice scenarios never has time to build.'),

  H.h2('Two questions in the exam style'),
  H.p('The first question checks what a strong fault log entry actually captures. The second is a fresh diagnostic scenario, worked the way a fault log entry above was: reason from what still works before opening either answer.'),
  H.mcq({
    n: 1,
    stem: 'Four students each log an entry after fixing a network fault during practice. Which entry is structured the way a fault log entry should be, so it is actually useful when reread weeks later?',
    codeText: 'A. "Wifi was being weird today. Restarted the router twice and it started working again eventually."\nB. "Symptom: desktop had full local network access but no internet. Checked: second desktop on same switch, worked fine, ruling out the ISP link; pinged the router locally, succeeded, ruling out the switch port; checked IP config, found DNS server field pointed at an address that no longer existed. Root cause: stale manual DNS entry. Fix: reset to automatic DNS, confirmed by loading two sites by name."\nC. "Networking problems happen sometimes. The important thing is staying calm and trying different things until one of them works."\nD. "Fixed a connectivity issue on a laptop today. It works now."',
    options: [
      'Entry A, because restarting equipment is always the correct first troubleshooting step',
      'Entry B, because it states the symptom, the checks in order, what each check eliminated, the specific root cause, and the specific fix',
      'Entry C, because it reflects on the general experience of troubleshooting rather than getting lost in technical detail',
      'Entry D, because it is the shortest and a fault log entry should always be as brief as possible',
    ],
    correct: 1,
    why: 'Entry B is the only one with all five fields a strong entry needs: a concrete symptom, an ordered sequence of checks, what each check ruled out, a specific root cause rather than a vague category, and a specific fix with confirmation. Entry A names an action with no diagnosis behind it and no explanation of why it worked. Entry C is a generic reflection that could describe any fault ever fixed and names no actual cause. Entry D reports that something was fixed without saying what, how it was found, or how it was confirmed, which gives a later reader nothing to learn from. Brevity is good, as the worked table entry in this post shows, but only once all five fields are present, not instead of them.',
  }),
  H.mcq({
    n: 2,
    stem: 'A classroom desktop is plugged directly into a wall jack and shows a valid IP address in the same range as every other wired device in the room. It can print to the classroom printer, which is also wired, without any issue, but it cannot load any website, by name or by raw numeric address. A laptop on the same wired jack, swapped in to test, loads every site normally. What does this evidence, worked through the way a fault log entry should be, point to as the most likely root cause?',
    options: [
      'The classroom\'s internet connection or the school\'s wider network is down',
      'The wall jack or its cable is faulty',
      'A setting specific to the original desktop, most likely in its own network configuration, is misdirecting or blocking its outbound traffic',
      'The classroom printer has failed and is unrelated to the internet problem',
    ],
    correct: 2,
    why: 'A laptop swapped into the exact same wall jack loading every site normally rules out the wall jack, the cable, and the classroom\'s internet connection as the cause, since all three of those are shared by both machines and a fault in any of them would affect the laptop too. The desktop reaching the classroom printer over the same physical link rules out the jack and cable a second, independent way. What is left, once the jack, the cable, and the wider connection are all eliminated by the swap test, is something specific to the original desktop itself, most plausibly a misconfigured network setting such as a wrong gateway or DNS entry sending its outbound traffic nowhere useful, the same category of cause the worked fault log entry in this post walks through in full.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is a fault log, exactly?', a: 'A running written record of the real network faults you work through during practice, with one short entry per fault covering the symptom, what was checked and in what order, what each check eliminated, the actual root cause, and what fixed it. It is written the day the fault is resolved, not reconstructed later from memory.' },
    { q: 'How is a fault log different from the elimination method taught in the earlier troubleshooting post?', a: 'The elimination method is how you reason through a fault while you are in front of it. A fault log is what you write down afterward, so that reasoning leaves a record you can review weeks or months later. They work together: a fault log entry is largely a transcription of the elimination method you already applied while solving the fault.' },
    { q: 'How many fault log entries do I actually need before the exam?', a: 'A dozen honest, specific entries reviewed together is worth far more than fifty rushed one-line entries. What matters is enough entries to start noticing a pattern across them, such as most faults resolving to a configuration issue rather than a physical one, which is exactly what a handful of specific entries reveals and a single entry cannot.' },
    { q: 'Should I use a diagram in my fault log entries?', a: 'It helps but is not required for every entry. The elimination checks and their order matter most for what the log needs to capture. For a fault with several devices in play, sketching it the way the earlier diagram-first post describes, then logging the labeled diagram alongside the entry, makes the entry faster to write and faster to review later.' },
    { q: 'What if most of my logged faults turn out to have boring, similar causes?', a: 'That is exactly the pattern worth noticing, not a sign your practice is repetitive. Seeing that most of your real faults resolve to a configuration issue rather than a physical one tells you where to look first on an unfamiliar scenario, and noticing that from your own logged faults sticks far better than being told it once.' },
  ]),

  H.cta({
    heading: 'Build the habit that becomes your revision guide',
    body: 'The elimination method and the diagram habit are what you use while solving a fault. A fault log is what makes solving it worth something weeks later. Start one alongside your next practice scenario.',
    links: [
      { href: '/blogs/ap-networking/ap-networking-troubleshooting-method', text: 'Read the troubleshooting method' },
      { href: '/pages/ap-networking', text: 'Start the course guide', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reviewed against the AP Networking course framework current in September 2026. Last reviewed September 29, 2026.'),
]);

module.exports = { meta, body };
