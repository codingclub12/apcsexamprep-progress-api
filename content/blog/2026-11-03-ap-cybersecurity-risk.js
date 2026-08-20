'use strict';
// Weekly course post: AP Cybersecurity. Evergreen concept explainer, Unit 1.
// Teaches risk assessment as an actual decision framework: likelihood times
// impact, placed on a qualitative matrix, resolved into one of four response
// categories. Explicitly positions risk assessment as the step that happens
// BEFORE a control gets chosen, which is the resource-allocation reasoning
// the zero trust / defense in depth post gestures at without spelling out.
// Does not re-teach zero trust, defense in depth, or the control-to-layer
// mapping; both are linked rather than repeated.
const H = require('../../lib/blog-house');

const SECTIONS = [
  'Risk assessment as likelihood times impact',
  'The risk matrix: how likelihood and impact combine',
  'Four responses to an assessed risk: accept, mitigate, transfer, avoid',
  'A worked example: a lost staff laptop with student records',
  'Why risk assessment comes before choosing controls',
];

const meta = {
  title: 'Risk Assessment: Likelihood, Impact, and the Decision',
  handle: 'ap-cybersecurity-risk-likelihood-impact-decision',
  blogHandle: 'ap-cybersecurity',
  course: 'ap-cybersecurity',
  targetKeyword: 'risk assessment',
  publishOn: '2026-11-03',
  seoTitle: 'Risk Assessment: Likelihood, Impact, Decision',
  seoDescription: 'A risk assessment guide for AP Cybersecurity covering likelihood times impact, a risk matrix, and the accept, mitigate, transfer, avoid decision.',
  summary: 'Risk assessment gets taught as a vocabulary term when it is really a decision framework, and this guide treats it that way. It walks through risk as a function of two separate questions, how likely is this threat to actually happen and how bad would it be if it did, and shows how those two answers combine on a qualitative low, medium, high matrix into an overall priority. From there it covers the actual decision that follows an assessment: accept a risk that is small enough to live with, mitigate one by adding a control, transfer one to a third party such as an insurer, or avoid one by stopping the risky activity entirely. A worked example, a school deciding how to handle the risk of a lost staff laptop holding student records, applies all four responses to the same risk so the differences are concrete rather than definitional. The guide closes by connecting risk assessment to the resource allocation reasoning behind defense in depth: a team cannot apply every control everywhere, and risk assessment is the step that decides where the effort actually goes.',
  tags: ['AP Cybersecurity', 'Risk Assessment', 'Risk Management', 'Concept Guide', 'Unit 1'],
  allowedInlineNumbers: [],
};

const body = H.article([
  H.dek('Risk assessment is not a term to define and move past. It is the actual reasoning a security team runs before deciding what to do about a threat: how likely is this, how bad would it be, and given both answers, what is the right response. This guide teaches risk assessment as that decision, works through a qualitative matrix that turns likelihood and impact into a priority, and applies all four possible responses, accept, mitigate, transfer, and avoid, to a single worked scenario so the differences between them are concrete rather than abstract.'),
  H.byline({
    author: 'Tanner Crow', role: 'AP Computer Science Teacher',
    published: 'November 3, 2026', updated: 'November 3, 2026', readingMinutes: 12,
  }),
  H.toc(SECTIONS),

  H.h2(SECTIONS[0]),
  H.p('Ask a student what risk assessment means and the answer is often close to correct but too thin to use: figuring out how dangerous a threat is. That is true as far as it goes, but it hides the part that actually makes risk assessment useful, which is that danger is not one number. It is two separate questions, asked about the same threat, that only combine into a single answer at the very end.'),
  H.p('The first question is likelihood: how probable is it that this threat actually happens, given the realistic circumstances a system or an organization operates in. Not whether it is theoretically possible, since almost anything is theoretically possible, but whether it is plausible enough to plan around. A threat that is technically conceivable but wildly improbable in the actual environment does not deserve the same attention as one that shows up regularly.'),
  H.p('The second question is impact: if the threat did happen, how bad would the consequences actually be. Impact is not the same thing as how dramatic a threat sounds. A threat that sounds alarming but would cost almost nothing to recover from has low impact. A threat that sounds routine but would expose sensitive records, halt operations for days, or cost far more to fix than to prevent has high impact, even if nothing about the threat itself sounds unusual.'),
  H.p('Risk assessment is the discipline of answering both questions honestly and separately before combining them, because a threat\'s danger is a function of both, not either one alone. A rare threat with severe consequences and a routine threat with trivial consequences can end up occupying very different places in a risk assessment even though both are, in some loose sense, real. Keeping likelihood and impact as two separate judgments, rather than one gut feeling about how scary a threat sounds, is what turns risk assessment into something you can actually reason through on an exam question or in a real security decision, rather than something you guess at.'),
  H.box('key', 'The one sentence version', '<p>Risk assessment answers two separate questions about a threat, how likely is it and how bad would it be, and only combines them at the end into an overall priority that determines what response, if any, the threat is worth.</p>'),

  H.h2(SECTIONS[1]),
  H.p('Once likelihood and impact are judged separately, usually as low, medium, or high rather than as precise numbers that nobody actually has, they combine into an overall risk level. A simple qualitative matrix is the standard way to do this combination visibly, so the reasoning is inspectable rather than hidden inside a single confident label.'),
  H.table(
    ['Likelihood', 'Impact', 'Overall risk level', 'What that tier signals'],
    [
      ['Low', 'Low', 'Low', 'Worth noting, not worth spending effort on right now'],
      ['Low', 'Medium', 'Low-medium', 'Minor, revisit if the situation changes'],
      ['Low', 'High', 'Medium-high', 'Rare, but the consequence is severe enough to plan for anyway'],
      ['Medium', 'Low', 'Low-medium', 'Happens sometimes, but the cost of each occurrence is small'],
      ['Medium', 'Medium', 'Medium', 'Standard priority, address it in the ordinary course of work'],
      ['Medium', 'High', 'High', 'Frequent enough and costly enough to prioritize directly'],
      ['High', 'Low', 'Medium', 'Common, but individually minor, often tolerated or handled routinely'],
      ['High', 'Medium', 'High', 'Frequent and meaningfully costly, needs a deliberate response'],
      ['High', 'High', 'Critical', 'The highest priority a matrix can assign, address this first'],
    ],
  ),
  H.p('Two rows in that table are worth sitting with, because they show why the matrix earns its place instead of just being a formality. A low-likelihood, high-impact threat, something like a catastrophic but rare event, lands in the medium-high tier even though it almost never happens, because the severity of the consequence is enough on its own to justify planning for it. A high-likelihood, low-impact threat, something that happens constantly but barely matters each time it does, lands in a lower medium tier despite its frequency, because no single occurrence costs much. Those two threats can feel similarly urgent in conversation, one because it sounds catastrophic and the other because it happens all the time, but the matrix keeps them from being treated identically. It forces the two dimensions to be weighed separately rather than letting whichever one is more emotionally salient dominate the decision.'),
  H.p('The matrix is deliberately qualitative rather than a precise calculation, and that is a feature, not a shortcut taken for lack of better data. Security teams rarely have a reliable percentage for how likely a specific threat is in a specific environment, and inventing false precision would make the assessment look more rigorous than it actually is. Low, medium, and high, applied consistently and reasoned through explicitly, are honest about the level of certainty actually available while still being specific enough to drive a real decision.'),

  H.h2(SECTIONS[2]),
  H.p('An overall risk level is not the end of a risk assessment. It is the input to a decision, and that decision falls into one of four categories. Learning to name which of the four a given action represents, rather than just knowing that all four exist, is the actual skill a scenario question tests.'),
  H.ul([
    '<strong>Accept.</strong> The risk is judged low enough, whether because the likelihood is small, the impact is small, or both, that the organization simply lives with it rather than spending effort to change it. Accepting a risk is a deliberate decision to do nothing further about it, not the same thing as ignoring it or never having assessed it in the first place.',
    '<strong>Mitigate.</strong> A control is added that reduces the likelihood of the threat happening, its impact if it does happen, or both. Mitigation does not eliminate the underlying risk. It shrinks one or both of the two numbers that produced the overall risk level, moving the threat to a lower tier on the same matrix.',
    '<strong>Transfer.</strong> The consequences of the risk, usually the financial consequences, are shifted to a third party rather than absorbed directly, most commonly through insurance. Transferring a risk does not change how likely the threat is or how severe the underlying incident would be. It changes who ends up paying for it.',
    '<strong>Avoid.</strong> The organization stops doing the activity that creates the risk in the first place, removing the threat entirely rather than reducing it, insuring it, or living with it. Avoidance is the most drastic of the four responses, because it usually gives up whatever benefit the risky activity provided.',
  ]),
  H.box('warn', 'The mistake this framework is named against', '<p>Treating every assessed risk as automatically requiring a new control is a common error, and it is exactly what mitigate-only thinking produces. A low risk that gets an expensive new control anyway wastes effort that a genuinely high risk elsewhere needed instead. Naming which of the four responses actually fits, including accept, is part of doing risk assessment correctly, not a way of skipping it.</p>'),

  H.h2(SECTIONS[3]),
  H.p('A school district issues laptops to its teachers, and those laptops routinely hold local copies of student records: rosters, grades, accommodation notes. The district\'s security lead is asked to assess the risk that one of these laptops is lost or stolen, and to decide what, if anything, to do about it.'),
  H.p('Likelihood first. Staff laptops leave the building constantly, travel between home and school, and occasionally get left in a car or a bag on public transit. Losing a laptop is not a freak event for a mobile fleet of devices used by dozens of staff members every day. That pushes likelihood toward medium or high, depending on how large the fleet actually is and how consistently staff follow existing device policy.'),
  H.p('Impact next. If a lost laptop\'s drive is unencrypted and unlocked, whoever finds or takes it can simply open the files and read student records directly, which is a serious confidentiality failure involving minors\' data. That is a high-impact outcome. The combination of a plausible likelihood and a severe impact is exactly the kind of threat a risk matrix is built to surface rather than let slide past as background noise.'),
  H.p('With the risk assessed, the district has all four responses genuinely available, and walking through each one against this same scenario is what makes the differences concrete.'),
  H.h3('Accept'),
  H.p('If every district laptop already has full-disk encryption enabled and requires a login to unlock, the residual risk of a lost laptop, after that existing control, may already be low enough to accept. A thief gets a locked, encrypted box rather than readable student records. The district documents that the residual risk is acceptable and moves on, rather than layering additional controls onto a threat that a control already in place has already reduced enough.'),
  H.h3('Mitigate'),
  H.p('If laptops are not yet encrypted, or lack remote wipe capability, the district adds those controls specifically to reduce impact: encryption means a lost drive cannot simply be read, and remote wipe means a laptop reported missing can be rendered useless before anyone gets to the data on it. Neither control makes a laptop less likely to get lost. Both reduce how bad it is when one does.'),
  H.h3('Transfer'),
  H.p('The district carries a cyber liability insurance policy that covers the cost of a required breach notification process, credit monitoring for affected families, and legal fees if a lost laptop\'s contents are ever actually exposed. Buying that policy does not make a laptop less likely to be lost and does not make the incident itself less serious when it happens. It moves who absorbs the financial consequence from the district\'s own budget to the insurer.'),
  H.h3('Avoid'),
  H.p('The district decides that no student record will ever be stored locally on a staff laptop again. Teachers work through a browser-based system that keeps every record on a server and never writes it to a local drive, so a lost laptop, however likely that still is, no longer has any student data on it to lose in the first place. The underlying activity that created the risk, keeping local copies of sensitive records on mobile hardware, is eliminated rather than insured against or made less damaging.'),
  H.p('All four responses are defensible reactions to the same assessed risk, and a real district might combine several of them at once, encryption as mitigation plus insurance as transfer, for instance, rather than picking exactly one. What makes the four categories useful is that they name genuinely different kinds of decisions: do nothing further, reduce the numbers, shift who pays, or remove the activity, and a scenario question is usually testing whether you can tell which of those four a described action actually is.'),

  H.h2(SECTIONS[4]),
  H.p('It is tempting to treat risk assessment as a formality that happens before the real work, choosing and deploying controls, actually starts. The opposite is closer to true: risk assessment is what makes the choice of controls defensible at all, because no organization has the budget, staff time, or tolerance for friction to apply every possible control to every possible threat with equal force.'),
  H.p('This is the same resource allocation reasoning behind <a href="/blogs/ap-cybersecurity/ap-cybersecurity-zero-trust-defense-in-depth">defense in depth</a>: layering controls across identity, network, device, application, and the physical and human layer only makes sense if the effort behind each layer is proportional to what is actually at stake there. Defense in depth answers the structural question of how many layers stand behind a decision. Risk assessment answers the prior question of where those layers are worth building in the first place. A district that assessed its risk correctly would not spend the same effort hardening a rarely used guest printer as it spends hardening the server holding every student\'s records, because the assessed risk at each of those two points is not remotely the same.'),
  H.p('The same ordering applies to picking a specific control once the layer is known. The companion guide on <a href="/blogs/ap-cybersecurity/ap-cybersecurity-matching-controls-to-layers">matching security controls to the layer they defend</a> assumes you already know which layer an attack targets and walks through choosing the right control for it. Risk assessment is the step before that one: deciding which layers, and which specific threats within those layers, actually deserve a new control at all, versus which ones are already an acceptable risk that more spending would not meaningfully improve. Skipping straight to controls without assessing risk first tends to produce security theater, effort that is visible and feels productive but is not actually aimed at the threats most likely to cause real harm.'),
  H.p('Risk assessment also depends on already knowing what the realistic threats are, which is exactly the output of <a href="/blogs/ap-cybersecurity/ap-cybersecurity-threat-modeling-your-phone">threat modeling</a>. Threat modeling names the threats against a given asset. Risk assessment takes that list and ranks it, by likelihood and impact, into something an organization can actually act on in order rather than all at once. The two are companion steps in the same larger process: first find out what could go wrong, then figure out which of those things is actually worth doing something about, and what to do.'),

  H.h2('Two practice questions in the real format'),
  H.p('The first asks you to place a described threat on the likelihood and impact matrix. The second asks you to name which of the four response categories a described action represents.'),
  H.mcq({
    n: 1,
    stem: 'A high school\'s network administrator reviews two separate threats. Threat A is a lost or stolen employee keycard: it happens only rarely, since staff losing a physical keycard is uncommon, but if it happens, the card grants that holder\'s exact building access until it is deactivated, which includes the room housing student records. Threat B is a phishing email arriving in a staff member\'s inbox: these arrive constantly, several times a week, but the district\'s mail filter and staff training catch nearly every one before any real damage occurs. Based on likelihood and impact alone, which statement correctly places these two threats on a risk matrix?',
    options: [
      'Threat A is high likelihood and high impact, and Threat B is low likelihood and low impact',
      'Threat A is low likelihood and high impact, and Threat B is high likelihood and low impact',
      'Both threats are high likelihood and high impact, since any threat touching student records is automatically the highest priority',
      'Both threats should be treated identically, since likelihood and impact only matter after a threat has already caused damage',
    ],
    correct: 1,
    why: 'Threat A rarely happens but would be severe if it did, which is a low-likelihood, high-impact profile. Threat B happens constantly but is contained almost every time by existing controls, which is a high-likelihood, low-impact profile. The two threats can feel similarly urgent in conversation, but the matrix is built specifically to keep likelihood and impact from collapsing into one undifferentiated sense of danger. Naming the two dimensions separately, rather than assuming any threat involving student records is automatically maximum priority or that all threats deserve equal treatment, is the actual skill risk assessment tests.',
  }),
  H.mcq({
    n: 2,
    stem: 'After assessing the risk that a ransomware attack could encrypt its central student records database, a school district decides to purchase a cyber liability insurance policy that would cover recovery costs and any required family notifications if such an attack succeeds. The district does not change any of its existing technical controls as part of this decision. Which of the four risk response categories does purchasing the policy represent?',
    options: [
      'Accept, because the district is choosing to do nothing further about the underlying risk',
      'Mitigate, because the policy reduces the likelihood that a ransomware attack succeeds',
      'Transfer, because the district is shifting the financial consequences of the risk to a third party without changing its own likelihood or impact',
      'Avoid, because the district is eliminating the activity that creates the risk',
    ],
    correct: 2,
    why: 'The policy does not touch how likely a ransomware attack is or how severe the technical incident itself would be if one succeeded, which rules out mitigate and avoid. It is not accept either, since accept means taking no action at all, and purchasing a policy is a deliberate action. What the policy actually does is move who pays for the consequence, from the district\'s own budget to the insurer, which is precisely what defines transfer as a risk response.',
  }),

  H.h2('Frequently asked questions'),
  H.faq([
    { q: 'What is risk assessment in simple terms?', a: 'Risk assessment is the process of judging how likely a threat is to actually happen and how bad the consequences would be if it did, then combining those two separate judgments into an overall priority. That priority is what drives the decision to accept, mitigate, transfer, or avoid the risk, rather than treating every threat as equally urgent.' },
    { q: 'Is risk assessment the same thing as threat modeling?', a: 'They are closely related but not the same step. Threat modeling identifies what the realistic threats against a given asset actually are. Risk assessment takes that list of threats and ranks each one by likelihood and impact, which is what turns a list of possibilities into an ordered set of priorities an organization can actually act on.' },
    { q: 'Why would a low-likelihood threat ever be treated as high priority?', a: 'Because likelihood is only half of the assessment. A threat that is unlikely to happen but would be severe if it did, such as a catastrophic and rare event, can still land in a high priority tier on the matrix, since the impact side of the assessment is severe enough to justify planning for it even though it is expected to happen rarely.' },
    { q: 'Do organizations only ever pick one of the four risk responses per risk?', a: 'No. A single assessed risk often gets more than one response at once, such as mitigating a risk with a new control while also transferring the remaining financial exposure through insurance. The four categories name different kinds of decisions rather than four mutually exclusive options a risk can only ever receive one of.' },
  ]),

  H.p('The reasoning in this guide connects directly to two others on this blog: <a href="/blogs/ap-cybersecurity/ap-cybersecurity-threat-modeling-your-phone">threat modeling</a> for identifying what the realistic threats against an asset are in the first place, and <a href="/blogs/ap-cybersecurity/ap-cybersecurity-matching-controls-to-layers">matching security controls to the layer they defend</a> for choosing the right control once a risk has been judged worth mitigating. Read together, the three guides cover the full sequence a real security decision runs through: find the threats, assess which ones actually matter, then pick the control that defends the right layer.'),
  H.cta({
    heading: 'Practice assessing risk the way the exam scores it',
    body: 'Scenario questions on this material reward exactly this reasoning: naming likelihood and impact separately, placing a threat on the matrix, and identifying which of the four responses a described action actually represents.',
    links: [
      { href: '/pages/ap-cybersecurity-curriculum', text: 'Study the full curriculum' },
      { href: '/pages/ap-cybersecurity-practice-exam', text: 'Take a practice exam', alt: true },
    ],
  }),
  H.bio({
    name: 'Tanner Crow',
    credential: 'AP Computer Science Teacher, Blue Valley North High School',
    html: 'Tanner has taught AP Computer Science for over a decade and has logged more than 1,800 verified tutoring hours. He writes the course material at APCSExamPrep and builds the practice banks his own students use.',
  }),
  H.updatedNote('This guide is reviewed as College Board publishes further detail on the AP Cybersecurity exam format. Last reviewed November 3, 2026.'),
]);

module.exports = { meta, body };
