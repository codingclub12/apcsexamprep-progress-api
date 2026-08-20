'use strict';
// Weekly course post: AP Cybersecurity. Evergreen concept explainer, Unit 2 (Securing Spaces).
const H = require('../../lib/blog-house');

const SECTIONS = [
  'The password security advice you learned is already outdated',
  'Why rotation and complexity rules backfired',
  'What actually strengthens a password: length, passphrases, and uniqueness',
  'MFA: the second lock that makes a stolen password mostly useless',
];

const meta = {
  title: 'Password Security, MFA, and Why the Advice Changed',
  handle: 'ap-cybersecurity-passwords-mfa-advice-changed',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'password security',
  publishOn: '2026-10-02',
  seoTitle: 'Password Security and MFA: The Advice Changed',
  seoDescription: 'Why NIST dropped forced password rotation and complexity rules, what actually strengthens a password now, and how MFA became the real second line of defense.',
  summary: 'The password security advice most students were taught, change it every ninety days and mix in a symbol, is no longer what the standards bodies recommend, and this guide explains exactly why. It walks through the behavioral research showing forced rotation and complexity rules made passwords weaker rather than stronger, lays out what current guidance recommends instead, length over complexity, a unique password per site through a password manager, and explains multi factor authentication conceptually as the control that actually blunts a stolen password, since a password alone is rarely enough to get in anymore.',
  tags: ['AP Cybersecurity', 'Password Security', 'MFA', 'Unit 2', 'Concept Guide'],
};

const SRC = {
  nist: {
    source: 'NIST Special Publication 800-63B-4, Digital Identity Guidelines: Authentication and Authenticator Management',
    url: 'https://pages.nist.gov/800-63-4/sp800-63b/',
    asOf: 'September 2024',
  },
};

const body = H.article([
  H.dek('If you were taught to change your password every few months and to always include a capital letter, a number, and a symbol, you were taught good password security by the standards of a decade ago, not by the standards of today. The organization that wrote those original rules has since reversed both of them, and the reasoning behind the reversal is exactly the kind of scenario reasoning the AP Cybersecurity exam expects you to be able to walk through. This guide covers what changed, why the old advice was quietly counterproductive, what actually makes a password strong now, and why multi factor authentication, not a stronger password alone, is the control doing most of the real work today.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'September 29, 2026', updated: 'September 29, 2026', readingMinutes: 13,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('For years, the standard password advice repeated in school computer labs, corporate onboarding, and password reset screens everywhere was some version of the same two rules. Change your password on a fixed schedule, often every ninety days. And make sure it includes a mix of uppercase letters, lowercase letters, a number, and a special character, because a more complicated looking password was assumed to be a harder one to guess.'),
  H.p('That advice traces back to guidance the National Institute of Standards and Technology, commonly called NIST, published for federal systems, guidance that plenty of schools, companies, and websites then adopted as a general best practice far beyond the government systems it was originally written for. NIST has since revised that guidance substantially, and the revision is not a minor tweak. It is a direct reversal of both of the two rules described above.'),
  H.sourceNote(SRC.nist.source, SRC.nist.url, SRC.nist.asOf),
  H.p('Under current NIST guidance, verifiers should not require a password to be changed on a routine schedule unless there is specific evidence that it has actually been compromised, and they should not impose composition rules that force a mix of character types. Instead, the guidance emphasizes length as the strongest lever a person actually controls, explicitly supports long passphrases, and calls for checking new passwords against lists of credentials already known to be breached rather than policing their punctuation.'),
  H.box('key', 'The definition that matters', '<p>Password security is not one setting or one rule. It is the combination of a hard to guess credential, a credential that is not reused anywhere else, and a second, independent way of confirming identity so that the credential alone is not enough to get in. The rotation and complexity rules were one attempt at the first piece, and they turned out to work against it.</p>'),

  H.h2(SECTIONS[1]),
  H.p('The intuition behind the old rules made sense on paper. A password with a symbol in it looks harder to guess than one without, and a password that changes regularly should, in theory, give an attacker a smaller window to use a stolen credential before it stops working. Neither assumption survived contact with how real people actually behave when a system forces those rules on them.'),
  H.p('Start with forced rotation. When a system requires a new password every few months, most people do not invent something completely new and unrelated to what came before. They take their existing password and make the smallest change that satisfies the requirement: Summer2025 becomes Summer2026, or Password1 becomes Password2. The new password is technically different, which satisfies the policy, but it is not meaningfully harder to guess than the one it replaced, and anyone who already knows the pattern, including an attacker who obtained an earlier version of that password in a previous breach, can often predict the next one without much effort. The rule was designed to shrink the usefulness of a stolen password over time. In practice, it mostly shrank how memorable passwords were, which pushed people toward smaller, more predictable increments instead of stronger ones.'),
  H.p('Complexity requirements backfired in a related way. Told to include a capital letter, a number, and a symbol, most people do not distribute that requirement randomly through an otherwise long, unpredictable phrase. They tack it onto the end of a short, familiar word in the same handful of predictable spots: a capital letter at the start because that is already a habit from normal writing, a number tacked onto the end, an exclamation point after that. Password1! satisfies every character requirement a typical policy demands, and it is still one of the first guesses an automated cracking tool tries, precisely because so many other people, facing the identical requirement, landed on the identical pattern.'),
  H.p('There is a second reason both rules mattered less than they seemed to, and it has nothing to do with how the password itself was constructed. A huge share of real world account compromises do not come from an attacker sitting down and guessing a password character by character. They come from credential stuffing, where an attacker takes a list of usernames and passwords already leaked from some other breach and tries that exact same combination against other sites, betting correctly that plenty of people reuse the same password in more than one place. They come from phishing, covered in depth in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-phishing-deep-dive">this guide on recognizing a phishing attempt</a>, where the victim simply types a perfectly strong, perfectly complex password directly into an attacker\'s fake login page. In both cases, the strength or the age of the password barely matters. A ninety day rotation schedule does nothing to stop a password from being typed into the wrong site today, and a required symbol does nothing to stop that same password from being copied straight out of a breached database somewhere else and reused against your account.'),
  H.box('warn', 'The mistake this guide is named for', '<p>Treating password rules as the whole solution is the trap. Rotation and complexity requirements were aimed at making a password harder to guess through brute force, but most real world compromises are not brute forced. They arrive through reuse and phishing, which a stronger looking password does not defend against on its own.</p>'),

  H.h2(SECTIONS[2]),
  H.p('Current guidance replaces those two rules with a smaller set of habits that actually track how passwords get broken in practice. The first is length over complexity. A long passphrase built from several unrelated words, something like correct horse battery staple rearranged into whatever order is memorable to you, is dramatically harder for an automated tool to guess than a short word with a symbol tacked on, precisely because there are so many more possible combinations to try as length increases. Length also happens to be easier for a person to actually remember than a string of substituted characters, which means a long passphrase is both more secure and more usable at the same time, rather than trading one for the other.'),
  H.p('The second habit is uniqueness: a different password for every account that matters, rather than one password reused across many sites. This directly targets credential stuffing. If a password is only ever used on one site, a breach of some unrelated service can never hand an attacker a working credential for this one, because the two were never the same string to begin with. The practical obstacle is obvious: nobody can memorize dozens of genuinely unique, sufficiently long passwords, which is exactly the problem a password manager exists to solve. A password manager generates and stores a long, unique credential for every single site, so the only thing a person actually has to remember is one strong master credential to unlock the manager itself.'),
  H.table(
    ['Old advice', 'Why it seemed reasonable', 'What current guidance recommends instead'],
    [
      ['Change your password every ninety days', 'Shrinks the window a stolen password stays useful', 'Only change a password after real evidence it was compromised, since forced rotation mostly produces small, predictable edits'],
      ['Require a mix of uppercase, numbers, and symbols', 'A more complicated looking string seems harder to guess', 'Prioritize overall length, including long passphrases, which resist guessing far better and are easier to remember'],
      ['One memorable password reused across sites', 'Simpler for a person to manage on their own', 'A unique password per site, generated and stored by a password manager, so one breach cannot unlock other accounts'],
    ],
  ),
  H.p('None of this means passwords stopped mattering. It means the specific rules that used to define a strong password were solving the wrong problem, optimizing for a guess resistant string instead of a genuinely hard to obtain and hard to reuse credential. Length, uniqueness, and a password manager address the actual failure modes, guessing and reuse, directly.'),

  H.h2(SECTIONS[3]),
  H.p('Even a long, unique passphrase can still be handed over the wrong way. It can be typed into a convincing fake login page during a phishing attempt, or leaked when a site an account holder trusted gets breached on its own end, through no mistake of the account holder\'s at all. This is exactly why the second real shift in password security guidance is not really about the password at all. It is about not relying on a password being the only thing standing between an attacker and an account.'),
  H.p('Multi factor authentication, usually shortened to MFA, works by requiring proof of identity from more than one independent category at once, rather than accepting a single secret as sufficient on its own. Security professionals generally describe these categories as something you know, something you have, and something you are. A password or a PIN is something you know. A phone that receives a one time code, or a physical security key plugged into a device, is something you have. A fingerprint or a face scan is something you are. MFA simply means combining at least two of those categories before granting access, rather than trusting just one.'),
  H.h3('Why combining categories defeats a stolen password'),
  H.p('The reason this specific combination is so effective comes down to what an attacker actually gains from a single successful theft. If an account is protected only by a password, and that password is phished, reused from a breached site, or guessed, the attacker has everything they need. Nothing else stands between them and the account. But if that same account also requires a one time code generated by the real account holder\'s own phone, a stolen password alone gets an attacker only halfway there. They have proven something you know, but they still lack something you have, and without that second, independent factor, the login does not complete. The attacker would need to separately compromise a physical device or a biometric trait, which is a fundamentally different and far more difficult problem than reusing a leaked string of characters found in some unrelated breach.'),
  H.p('This is also why MFA is considered the practical answer to the phishing and credential stuffing problems described earlier in this guide, rather than a stronger password policy. A rotation schedule and a symbol requirement never addressed either threat directly. MFA does, because it assumes a password might eventually be phished or leaked, given how common both have become, and builds a second, independent checkpoint on top of that assumption instead of trying to prevent it through password rules alone.'),
  H.box('key', 'Why technical only fixes are not the point here', '<p>On a scenario question describing a stolen or phished password, an answer choice proposing only a stronger password policy, more frequent rotation or a stricter complexity rule, is frequently a distractor. Neither rotation nor complexity addresses a credential that was already handed over voluntarily to a fake page or leaked from an unrelated breach. The control that actually closes that specific gap is a second, independent factor the attacker does not also possess, which is exactly what MFA provides.</p>'),
  H.p('It is worth being precise about what MFA does and does not guarantee, since the exam rewards that precision. MFA does not make an account unbreakable, and a sufficiently determined attacker who also gains access to a target\'s physical device, or who tricks a person into approving a fraudulent login notification in the moment, can still get through. What MFA reliably does is remove the single point of failure a password alone represents, which is why it defeats the overwhelming majority of password only attacks, the ones relying purely on a guessed, reused, or phished credential with nothing else backing it up. Access control decisions built around identity verification, the same authentication concept covered in <a href="/blogs/ap-cybersecurity/ap-cybersecurity-access-control-least-privilege">this guide on access control and least privilege</a>, only hold up if the authentication step itself is hard to defeat with a single stolen secret, and MFA is the mechanism that makes it hard.'),

  H.h2('Two practice questions in the real format'),
  H.p('Both are written the way the exam writes them: scenario first, decision second. Read the stem twice, and separate what actually changed in the guidance from what the older rule assumed.'),
  H.mcq({
    n: 1,
    stem: 'A school district\'s technology handbook, last revised several years ago, instructs students and staff to change their account password every ninety days and to include at least one uppercase letter, one number, and one special character in every password. A newly hired security consultant recommends removing the mandatory ninety day rotation requirement and instead encouraging long passphrases without a forced character mix. Which best explains the reasoning behind the consultant\'s recommendation?',
    options: [
      'Forced rotation and complexity rules make passwords too difficult for automated systems to check, so removing them is mainly a technical convenience',
      'Forced rotation tends to produce small, predictable edits to an existing password rather than genuinely new ones, and complexity rules push people toward short, predictable patterns, while a longer passphrase resists guessing more effectively and is easier to remember',
      'Passwords no longer matter at all once an account exists, so any policy governing them is effectively irrelevant',
      'The ninety day schedule was always arbitrary and has no connection to any documented security research on how people actually choose passwords',
    ],
    correct: 1,
    why: 'Current guidance from the National Institute of Standards and Technology moved away from mandatory rotation and forced complexity specifically because of documented user behavior: rotation schedules lead people to make small, predictable changes rather than genuinely new passwords, and complexity rules lead people toward short, familiar patterns dressed up with a predictable capital letter and symbol. A long passphrase avoids both failure modes, since it resists automated guessing through sheer length while remaining easier for a person to actually remember than a short string of substituted characters. The other options either invent a reason not actually behind the change or dismiss password policy as irrelevant, which the guidance does not do.',
  }),
  H.mcq({
    n: 2,
    stem: 'An attacker obtains a user\'s real password after that user is tricked into entering it on a convincing fake login page during a phishing attempt. The user\'s account requires a password plus a one time code sent to the user\'s own phone before any login is completed. When the attacker attempts to log in with the stolen password, the login does not complete. Which statement best explains why?',
    options: [
      'The stolen password must not have actually been correct, since a correct password alone should be sufficient to log in',
      'The account is protected by multi factor authentication, so the stolen password alone only satisfies one required factor, something the attacker knows, while the login still requires a second factor, something the legitimate user has, that the attacker does not possess',
      'Phishing attacks are only effective against usernames, never against passwords, so the password itself was never actually at risk',
      'The login failed because the password was too complex for the attacker to enter correctly on the fake page',
    ],
    correct: 1,
    why: 'The scenario is a textbook case of multi factor authentication doing exactly what it is designed to do. The password was genuinely stolen and is genuinely correct, which satisfies the something you know factor, but the account also requires something you have, a one time code delivered to the legitimate user\'s own phone, and the attacker has no way to produce that second factor just because they obtained the first one. That gap is precisely why MFA defeats most password only attacks: possessing a valid password no longer means possessing everything required to log in.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'Why did NIST stop recommending mandatory password rotation?', a: 'Because forced rotation did not make passwords meaningfully harder to guess in practice. When people are required to change a password on a fixed schedule, most make the smallest edit that satisfies the rule rather than choosing something genuinely new, which produces predictable patterns rather than stronger security. Current guidance recommends changing a password only when there is real evidence it has been compromised.' },
    { q: 'Are complexity requirements like requiring a symbol still recommended?', a: 'No. Requiring a specific mix of uppercase letters, numbers, and symbols tends to push people toward short, familiar words with a predictable character tacked on at the end, which automated cracking tools already expect. Current guidance prioritizes overall length, including long passphrases, over a required mix of character types.' },
    { q: 'What makes a password manager useful for password security?', a: 'A password manager generates and stores a long, unique password for every account, so a person only has to remember one strong master credential rather than dozens of individual passwords. This directly defeats credential stuffing, where an attacker tries a password stolen from one breached site against other accounts, since a unique password per site means no single leak can unlock anything else.' },
    { q: 'What is multi factor authentication in simple terms?', a: 'Multi factor authentication requires proof of identity from more than one independent category before granting access, typically something you know like a password, combined with something you have like a phone, or something you are like a fingerprint. Because an attacker who steals a password only satisfies one of those categories, MFA blocks the overwhelming majority of attacks that rely on a password alone.' },
    { q: 'Does using MFA mean password security no longer matters?', a: 'No. A weak or reused password still gives an attacker a head start, and a determined attacker with access to a person\'s physical device can sometimes defeat MFA as well. A long, unique password and MFA are complementary controls, not substitutes for each other, and current guidance recommends using both together.' },
  ]),

  H.p('The reasoning in this guide connects directly to the authentication and authorization concepts covered on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-access-control-least-privilege">the access control and least privilege guide</a>, and to the human side of credential theft covered on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-social-engineering">the social engineering guide</a>, since a stolen password almost always starts with a human decision rather than a technical break in.'),
  H.cta({
    heading: 'Practice reasoning through authentication scenarios',
    body: 'Unit 2 of the AP Cybersecurity curriculum covers password security and multi factor authentication as part of the broader authentication and authorization skill, and the practice exam mixes scenario questions in the real format.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study Unit 2' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed September 29, 2026.'),
]);

module.exports = { meta, body };
