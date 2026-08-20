'use strict';
// Weekly course post: AP CSP. Evergreen concept guide, not news. Big Idea 5
// (Impact of Computing) asks students to reason precisely about cookies,
// metadata, and PII, and to know that "anonymized" is a claim that can fail,
// not a guarantee. This guide teaches that reasoning directly rather than
// gesturing at "data privacy matters," and links out to the CIA triad and
// data abstraction posts rather than re-teaching that adjacent ground here.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'AP CSP Data Privacy: What Big Idea 5 Actually Tests',
  'Cookies: How a Site Remembers You, and How That Becomes Tracking',
  'Metadata vs Content: Data About Data',
  'PII: What Counts, What Is Ambiguous, and What "Anonymized" Really Means',
  'Re-identification: When Anonymous Data Stops Being Anonymous',
  'Practice: Metadata vs Content, PII vs Not',
  'Frequently Asked Questions',
];

const meta = {
  title: 'AP CSP Data Privacy: Cookies, Metadata, and PII Without the Hand Waving',
  handle: 'ap-csp-cookies-metadata-pii-big-idea-5',
  blogHandle: 'ap-csp',
  course: 'ap-csp',
  targetKeyword: 'ap csp data privacy',
  publishOn: '2026-09-30',
  seoTitle: 'AP CSP Data Privacy: Cookies, Metadata, and PII Explained',
  seoDescription: 'AP CSP data privacy guide: what a cookie does, metadata versus content, PII, and a real re-identification example, with practice questions.',
  summary: 'AP CSP Big Idea 5 tests data privacy at a specific level of precision, not a vague sense that data collection is concerning. This guide defines what a cookie technically is and how the same mechanism that keeps you logged in also enables cross-site tracking, distinguishes metadata (data about data) from content, defines PII with concrete examples of what counts and what is ambiguous, and walks through a real, sourced re-identification case showing why anonymized data is not automatically safe. Two scenario-based practice questions test metadata versus content and PII versus not.',
  tags: ['AP CSP', 'Data Privacy', 'Big Idea 5', 'Impact of Computing', 'Study Guide'],
  allowedInlineNumbers: ['1997', '135,000'],
};

const body = H.article([
  H.dek('AP CSP data privacy content is not a lecture about being careful online. It is a set of precise distinctions the exam expects you to apply: what a cookie actually is and does, how metadata differs from content, what counts as PII and what does not, and why a dataset with names removed is not automatically safe to release. This guide teaches each distinction at the depth Big Idea 5 tests it, with a real, sourced case of anonymized data being re-identified.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Big Idea 5, Impact of Computing, is the part of AP CSP that steps back from writing algorithms and asks how computing affects people, including how their data is collected, used, and sometimes exposed. Data privacy is the piece of Big Idea 5 students tend to answer the least precisely, because "data privacy matters" is something every student already believes walking in. The exam does not give credit for that belief. It gives credit for being able to name the specific mechanism in a scenario: is this a cookie enabling tracking, is this metadata revealing something the content itself never stated, is this a piece of PII, and is an anonymized dataset actually safe given what other data exists to combine it with.'),
  H.box('key', 'The four ideas this guide covers', '<p>What a cookie is and does at a technical level, including how the same mechanism that keeps a shopping cart intact across pages also enables a site to recognize a visitor across other sites. The difference between metadata, meaning data about data, and content, meaning the data itself. What personally identifiable information is as a specific defined category, including cases that are clearly PII and cases that are genuinely ambiguous. Why a dataset described as anonymized is not automatically safe, because separate fields that each seem harmless can combine to identify a specific person.</p>'),
  H.p('Treat each section below as a definition you should be able to state precisely and then apply to a scenario you have never seen before, because that is the exact shape AP CSP multiple choice questions on this topic take.'),

  H.h2(SECTIONS[1]),
  H.p('A cookie is a small piece of data that a website asks your browser to store, and that your browser then sends back to that same site on later requests. That is the entire mechanism. A cookie is not a program, it does not run code, and by itself it cannot reach into your device and take anything. It is closer to a claim ticket: the site hands your browser a small tag, your browser holds onto it, and your browser presents that tag back to the site every time you return, so the site can recognize you as the same visitor rather than a stranger.'),
  H.p('That one mechanism is what makes ordinary, useful website behavior possible. A login session works because the site sets a cookie identifying you as logged in, so you are not asked to sign in again on every page. A shopping cart survives you browsing to another page because a cookie holds a reference to what you have added, not because the site somehow remembers you by magic. Without cookies, or something serving the same purpose, every page load would start from zero: logged out, cart empty, preferences forgotten.'),
  H.box('warn', 'The tracking mechanism is the same mechanism', '<p>The exam-relevant twist is that the identical technical mechanism that keeps you logged in also enables cross-site tracking. A third-party cookie, set by an advertising or analytics company whose code is embedded on many different websites rather than by the site you are actually visiting, gets sent back to that same third party every time you visit any site carrying its code. The third party cannot see what you typed or read on each site, but it can see that the same browser, carrying the same cookie, showed up on site after site, which is enough to build a profile of where that browser has been. It is the same claim-ticket idea, just handed to a company that shows up on many sites instead of one.</p>'),
  H.p('This is why a scenario question describing a site that "remembers" a user, or an ad that seems to follow a user from one unrelated site to another, is almost always testing whether you can identify cookies as the mechanism, and whether you can articulate that the useful, first-party version (staying logged in) and the tracking version (a profile built across sites) are the same technology used two different ways, not two different technologies.'),

  H.h2(SECTIONS[2]),
  H.p('Metadata is data about data, as opposed to the data itself, which is usually called content. That distinction sounds abstract until you apply it to something concrete. Take a photo: the content is the actual image, the pixels that make up the picture. The metadata is everything the file carries about that image without being the image: when it was taken, and often exactly where it was taken, down to the coordinates a phone recorded from GPS at the moment of capture. You can strip away the content entirely, delete the picture, and the metadata by itself already tells you a time and a location.'),
  H.p('Take an email as a second example, because the exam uses this one often. The content of an email is the message body, the actual words the sender wrote. The metadata is the sender address, the recipient address, the subject line, and the timestamp, all of which exist and can be read even by someone who never sees the body at all, because email systems route messages using exactly that metadata and log it as a matter of normal operation.'),
  H.box('key', 'Why metadata alone can reveal a lot', '<p>Metadata does not require reading a single word of content to be revealing. Knowing that a specific phone was at a specific location at a specific time, from photo metadata alone, can reveal a pattern of someone\'s daily movement without a single photo ever being viewed. Knowing who emailed whom, how often, and at what times, without reading one message, can reveal a relationship, a negotiation, or an investigation. This is exactly why intelligence and law enforcement agencies have historically valued metadata so highly: it is structured, machine-readable, and collected automatically as a byproduct of a system simply functioning, while content requires someone to actually read or view it.</p>'),
  H.p('The exam-relevant point to hold onto is that metadata is not a lesser, watered down version of content. It is a different category of data, generated automatically by the systems that create and move content, and it can be sensitive on its own even when the content it describes is never examined by anyone at all.'),

  H.h2(SECTIONS[3]),
  H.p('Personally identifiable information, PII, is data that can be used to identify a specific individual, either by itself or in combination with other data. That definition has two branches, and the exam expects you to reason about both, because they behave very differently.'),
  H.p('Some fields are unambiguous PII on their own. A full name paired with a home address identifies a specific person with very little room for doubt. A Social Security number, a passport number, a fingerprint, these identify one individual directly, and there is no meaningful case where combining them with other data is required before they count as identifying.'),
  H.p('Other fields are ambiguous by themselves and only become identifying in combination. A name alone, with nothing else attached, might belong to any of thousands of people who share it, so a bare first and last name in isolation is weak PII at best. A zip code alone identifies a region, not a person. A birth date alone is shared by roughly one in three hundred sixty five people born that year. None of those three fields, held separately, reliably points at one individual. Held together, as the case in the next section shows, they very often do.'),
  H.box('warn', 'The mistake the exam checks for directly', '<p>The mistake to avoid is treating "anonymized" as a synonym for "safe." Anonymized usually means a dataset has had obviously identifying fields, like name and Social Security number, removed or replaced. It does not mean the remaining fields are incapable of identifying someone once you consider what other data exists in the world to combine them with. A dataset can be honestly, carefully anonymized by the definition its creator used, and still be re-identifiable, because de-identification and permanent unlinkability are not the same guarantee.</p>'),

  H.h2(SECTIONS[4]),
  H.p('The clearest documented example of this exact failure mode is a study by computer scientist Latanya Sweeney, then a graduate student at MIT. In the late 1990s, the state of Massachusetts released what it considered anonymized medical insurance data for state employees, covering a large population, with obvious identifiers like name and Social Security number stripped out before release. What remained in the released data included each person\'s zip code, birth date, and sex, fields the state judged safe to keep because none of them, by itself, pointed at one specific person.'),
  H.p('Sweeney showed that judgment was wrong by combining that supposedly anonymized health data with a second, completely public dataset: voter registration records, which in Massachusetts at the time could be purchased and which list each registered voter\'s name alongside their zip code, birth date, and sex, the exact same three fields the health data retained. Where a person\'s zip code, birth date, and sex matched between the two datasets, Sweeney could link a specific voter\'s name back to what was supposed to be an anonymous medical record.'),
  H.box('key', 'The specific case', '<p>Sweeney used this method to re-identify the medical records of William Weld, the sitting governor of Massachusetts at the time, using only his publicly known zip code, birth date, and sex. Very few people in his zip code shared his exact birth date, and combined with his sex, the match narrowed to one person: the governor himself. Neither field individually was PII. Combined, and cross-referenced against a second public dataset, the three together identified one specific, named individual and exposed medical information that was supposed to have been anonymized.</p>'
    + H.sourceNote('Electronic Frontier Foundation, "What Information is Personally Identifiable?"', 'https://www.eff.org/deeplinks/2009/09/what-information-personally-identifiable', 'reviewed 2026')),
  H.p('That case is decades old, but the reasoning it demonstrates is exactly what current AP CSP exam questions test, and it generalizes far past medical records or zip codes. The pattern is always the same shape: a dataset has its obvious identifiers removed and gets labeled anonymized, a second, separate dataset exists that shares some of the remaining fields, and the combination of the two, field by field, narrows an "anonymous" record down to one identifiable person. The mistake was never in any single field. It was in assuming that removing a name is the same thing as making a record impossible to trace back to a person, when the other fields left behind were still, together, specific enough to do exactly that.'),
  H.p('For the exam, this means a question describing a dataset as anonymized is not automatically describing a dataset that is safe, and the correct response to that framing is to ask what other fields remain and whether any outside dataset could plausibly be combined with them, not to accept "anonymized" as the end of the analysis. This same tension between what a system can technically do with data and what it should be trusted to protect connects directly to Big Idea 5\'s security material; our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cia-triad-explained">guide to the CIA triad</a> covers the confidentiality side of that reasoning in more depth if the connection is useful to you.'),

  H.h2(SECTIONS[5]),
  H.p('Both practice questions below are written in the scenario style AP CSP actually uses on multiple choice: a short, unfamiliar situation, testing whether you can apply the metadata versus content distinction and the PII versus not distinction rather than recall a definition word for word.'),
  H.mcq({
    n: 1,
    stem: 'A user sends a text message to a friend. A phone company\'s system logs which phone number sent the message, which phone number received it, and the exact time it was sent, but the company\'s system never stores or has access to the actual words in the message. Which best describes what the phone company has collected?',
    options: [
      'Content, because a text message is inherently content regardless of what specific fields are stored',
      'Metadata, because the company stored data describing the message, the sender, receiver, and timestamp, without storing the message itself',
      'PII, because a phone number is always classified as content rather than metadata',
      'Neither metadata nor content, because no information was stored unless the actual message was recorded',
    ],
    correct: 1,
    why: 'This question isolates the metadata versus content distinction directly. The phone company stored data about the communication, who sent it, who received it, and when, without ever storing the communication itself, which is exactly the definition of metadata. The message text would be the content, and the scenario explicitly says that was never stored or accessible. Option A confuses the medium (a text message) with the specific data actually collected. Option C misapplies the term PII to the wrong category entirely, since the question is asking about metadata versus content, not about identifiability. Option D is incorrect because sender, receiver, and timestamp are themselves data, just not the content of the message.',
  }),
  H.mcq({
    n: 2,
    stem: 'A research team wants to release a dataset of hospital visit records to the public for study. They remove every patient\'s name, phone number, and Social Security number before release. The released dataset still includes each patient\'s exact date of birth, five digit zip code, and sex. A separate, publicly available dataset, such as voter registration records, also lists date of birth, zip code, and sex alongside each person\'s name. What is the strongest concern with the research team\'s approach?',
    options: [
      'There is no remaining concern, because removing name, phone number, and Social Security number fully anonymizes the dataset',
      'The remaining fields, date of birth, zip code, and sex, could be cross-referenced against the separate public dataset to re-identify specific patients, even though no single remaining field is PII by itself',
      'The dataset is only a privacy risk if it also contains the patient\'s medical diagnosis, since demographic fields alone are never sensitive',
      'The only meaningful privacy risk in this scenario is whether the dataset was stored using encryption',
    ],
    correct: 1,
    why: 'This question tests re-identification directly, and is structured after a real documented case where exactly this combination of fields, date of birth, zip code, and sex, was cross-referenced against public voter records to re-identify a specific named individual from data that had been labeled anonymized. Option A repeats the mistake the exam is testing for: removing obvious identifiers is not the same as making the remaining fields uncombinable with outside data. Option C is wrong because the concern exists regardless of whether a diagnosis is included, since re-identifying who a record belongs to is itself the privacy failure. Option D names a real security practice, but encryption of stored data does not address the re-identification risk created once the dataset is released and its fields can be combined with an outside source.',
  }),

  H.h2(SECTIONS[6]),
  H.faq([
    { q: 'Is a cookie itself a privacy violation?', a: 'No. A cookie is a small piece of data a browser stores and returns to a site, and by itself it is a neutral mechanism used for ordinary things like staying logged in or keeping a shopping cart intact. The privacy concern the exam tests is specifically about third-party cookies enabling cross-site tracking, which uses the exact same mechanism for a different purpose, not that cookies are inherently a violation.' },
    { q: 'If a piece of data is metadata rather than content, does that mean it is less sensitive?', a: 'No, and this is a common misreading the exam checks for. Metadata can be highly sensitive on its own, since who contacted whom, when, and from where can reveal a pattern or a relationship without a single word of content ever being read. Metadata being generated automatically by a system does not make it less revealing than content, only differently revealing.' },
    { q: 'Does removing a name from a dataset make it PII-free?', a: 'Not automatically. A name is unambiguous PII, but other fields left behind, such as date of birth, zip code, and sex, can together re-identify a specific person even with no name present, especially when a separate public dataset containing those same fields also lists names. "Anonymized" describes what was removed, not a guarantee about what the remaining fields can still reveal in combination.' },
    { q: 'Is a zip code by itself considered PII on the AP CSP exam?', a: 'On its own, a zip code identifies a region shared by many people, so it is not treated as identifying by itself. The exam-relevant nuance is that a zip code combined with other seemingly harmless fields, like birth date and sex, can narrow down to one specific individual, which is the core reasoning behind the re-identification concept this guide covers.' },
  ]),

  H.cta({
    heading: 'Keep building Big Idea 5 fluency',
    body: 'Data privacy is one piece of how AP CSP tests the impact of computing. Work through more of the material built to the current exam format.',
    links: [
      { href: '/pages/ap-computer-science-principles-resources', text: 'All CSP resources' },
      { href: '/pages/ap-csp-written-response-guide', text: 'Written response guide', alt: true },
    ],
  }),
  H.p('If the abstraction side of Big Idea 4 and 5 material is what you need next, our <a href="/blogs/ap-csp/ap-csp-abstraction-data-procedural">guide to AP CSP abstraction</a> covers procedural and data abstraction in the same applied reasoning style used here. And if you want the security side of how systems are supposed to protect the data this guide describes, see our <a href="/blogs/ap-cybersecurity/ap-cybersecurity-cia-triad-explained">CIA triad guide</a> for the confidentiality, integrity, and availability framework that sits right next to Big Idea 5 in how these exams reason about protecting information.'),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('Reflects AP CSP Big Idea 5 (Impact of Computing) as defined in the current College Board Course and Exam Description. Last reviewed September 29, 2026.'),
]);

module.exports = { meta, body };
