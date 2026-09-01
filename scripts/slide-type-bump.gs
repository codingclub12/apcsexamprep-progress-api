/**
 * AP CSP and AP CYBERSECURITY TEACHER BUNDLE: raise the small type in the
 * converted Google Slides decks.
 *
 * WHY THIS IS AN APPS SCRIPT AND NOT PART OF THE REPO'S NODE TOOLING.
 * The same reason scripts/cyber-slides-conversion.gs is one. These decks are
 * not in the repository and cannot be reached from a Claude session: they live
 * in Tanner's Drive, and this repo stores only their file ids so
 * routes/slides.js can gate them. Editing them needs Tanner's own Google
 * credentials. So the split is the established one: the agent does the parts
 * needing judgement (which decks, which sizes, the undo record, this script),
 * and the account holder runs it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A LADDER AND NOT ARITHMETIC
 *
 * The first version of this script added a fixed amount per range: +2.5 below
 * 11.5pt, +2 below 13, +1.5 up to 14. preview() then read 63,842 text runs out
 * of 136 real decks and showed that rule was wrong, in two ways that no amount
 * of care about the arithmetic would have caught:
 *
 *   COLLISIONS. 12.5 + 2 and 13 + 1.5 are both 14.5. So 12.5, 13 and the
 *   untouched 14.5 all ended up at 14.5: three distinct tiers flattened into
 *   one, across 7,900 runs.
 *
 *   INVERSIONS. 14 + 1.5 is 15.5, which is larger than the untouched 14.5 and
 *   15. Text that was SMALLER came out BIGGER. That alone was 11,638 runs, the
 *   single largest bucket in the corpus.
 *
 *   Together, 18,866 runs, 29% of all the text in the sample, came out with
 *   their size relationships broken.
 *
 * The cause is structural rather than a bad choice of constants. These decks
 * carry a dense size vocabulary in the band (10, 10.5, 11, 12, 12.5, 13, 14:
 * seven distinct sizes inside four points) and a sparse one just above it. A
 * rule that lifts the bottom more than the top COMPRESSES that ladder, so its
 * slope is below 1; and a slope below 1 on a ladder with half-point steps
 * always collides once the result is rounded back to half points. No taper
 * expressed as a function of the size can avoid it.
 *
 * So the map is a table over the sizes that actually exist, built once from
 * what preview() measured, and asserted strictly increasing. proposeLadder_()
 * below is the generator, so a course with a different vocabulary gets its own
 * ladder from its own preview() run rather than inheriting this one.
 *
 * A size inside the range with no ladder entry is REFUSED, not guessed at. See
 * ALLOW_UNKNOWN.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DOES NOT TOUCH
 *   Below LADDER_FLOOR. In the AP CSA decks, whose generator IS in this repo,
 *   that band held the College Board trademark line, which nobody reads from a
 *   projector and which steals room from the footer above it when it grows.
 *   In these decks 19% of runs sit under 10pt, at roughly 47 per deck for 9pt
 *   alone, which is the shape of per-slide furniture rather than body text.
 *   That is an inference from counts, not from looking: if any of it turns out
 *   to be body copy, it is the least readable text in the bundle and the floor
 *   is wrong. Opening one deck settles it; preview() cannot.
 *
 *   At or above LADDER_CEILING. Already readable, and it is what the lift is
 *   measured against.
 *
 *   Speaker notes. A teacher deck's notes carry answers, timing cues and
 *   misconception alerts, and they are read off a laptop at arm's length
 *   rather than projected. They are also the one surface here with no visible
 *   overflow, so growing them buys nothing and risks pushing content off the
 *   notes page.
 *
 *   Layouts and masters. Only shapes on the slides themselves are touched, so
 *   nothing changes globally in a way this script cannot record and undo.
 *
 * ---------------------------------------------------------------------------
 * THE RISK, STATED PLAINLY
 *
 * A Google Slides text box does not shrink its text to fit. Raising a size in
 * a box that is already full pushes the text out of the box, and unlike the
 * CSA decks there is no build step here that can measure a panel and refuse.
 * 56% of all text in these decks is inside the ladder's range, so this is most
 * of the deck rather than a few captions.
 *
 * Three things follow, and none of them is optional:
 *
 *   1. preview() writes nothing and reports what is actually in there,
 *      including a proposed ladder for whatever it finds. Run it per course.
 *   2. DECK_LIMIT exists so the first real run is two or three decks, opened
 *      and looked at, before the other 291.
 *   3. Every change is recorded to an undo file in Drive before it is made,
 *      and revert() puts it back. A deck that has an undo file is refused a
 *      second bump, so sizes cannot compound across re-runs.
 *
 * ---------------------------------------------------------------------------
 * SETUP
 *   1. script.google.com, new project, paste this file in.
 *   2. No advanced services needed. SlidesApp and DriveApp are both built in.
 *   3. Run preview() first and authorise when prompted.
 *
 * RUN ORDER
 *   preview()   Opens decks, reports the size histogram and a proposed ladder,
 *               writes NOTHING. Run it once per course: it samples both, but
 *               the 4.5 minute budget will not reach all 294 in one go.
 *   start()     Does the work, DECK_LIMIT decks at a time, resumable.
 *   report()    What the sheet currently holds.
 *   revert()    Puts every recorded change back, deck by deck.
 *   reset()     Removes the continuation trigger. Changes nothing else.
 *
 * SHARING AND THE FILE IDS. Same posture as the conversion script: these decks
 * are shared "anyone with the link can view" because a paying teacher is gated
 * on their APCSExamPrep token rather than on a Google account. Holding a file
 * id IS holding access. Do not paste the sheet or this script anywhere public.
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

// Sizes below the floor and at or above the ceiling are never touched.
var LADDER_FLOOR = 10;
var LADDER_CEILING = 18;

// The lift proposeLadder_() aims for at the floor, tapering to nothing at the
// ceiling. Only used to BUILD a ladder, never to apply one.
var MAX_LIFT = 2.5;

// The shipped ladder, built by proposeLadder_() from the 63,842 runs preview()
// read across 136 AP CSP decks on 2026-08-28. Strictly increasing by
// construction and asserted so by smoke/slide-type-bump.js.
//
// Note it moves 14.5, 15, 16 and 17, which sit above the 10 to 14 band the
// change was originally scoped to. That is forced, not scope creep: if nothing
// above 14 may move, then the whole band is capped just under 14.5, the 14pt
// bucket (11,638 runs, 18% of all text) can only reach 14.25, and the mean
// lift inside the band falls from 1.96pt to 0.88pt. Order preservation and a
// real lift at the top of the band are not both available unless the sizes
// immediately above the band move too.
//
// AP CYBERSECURITY IS NOT COVERED BY THIS LADDER. preview() ran out of time
// after 136 decks, and the deck table lists all 224 CSP decks before the first
// cyber one, so no cyber deck was ever opened. Run preview() with COURSES set
// to ['ap-cybersecurity'], read the proposed ladder it prints, and paste it in
// before bumping that course.
var SIZE_LADDER = {
  '10': 12.5,
  '10.5': 13,
  '11': 13.5,
  '12': 14,
  '12.5': 14.5,
  '13': 15,
  '14': 15.5,
  '14.5': 16,
  '15': 16.5,
  '16': 17,
  '17': 17.5
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// How many decks a single start() run may change. THE FIRST RUN SHOULD BE 2 OR
// 3: open them, look at them, and only then set this to 0. Left small on
// purpose, because the default of a script that edits 294 live decks should
// not be "all of them".
var DECK_LIMIT = 3;

// Which courses to walk. Narrow this to run one course at a time, which is
// also how you get preview() to reach cyber.
var COURSES = ['ap-csp', 'ap-cybersecurity'];

// Belt and braces. With this true, start() reports exactly what it would
// change and writes nothing, the same as preview() but per deck.
var DRY_RUN = false;

// What to do about a size inside the ladder's range that the ladder has no
// entry for. False, the default, SKIPS the whole deck and says which sizes:
// a deck the ladder does not describe is a deck this script does not
// understand, and bumping the sizes it does recognise would break the
// relationships with the ones it does not. True leaves the unknown sizes alone
// and bumps the rest, which is only sensible once you have looked at one.
var ALLOW_UNKNOWN = false;

// Re-bump a deck that already has an undo file. Almost always wrong: it
// compounds, so a 12 becomes 14 and then 15.5. Here so that a genuine re-run
// after a revert() is possible without editing the guard out.
var FORCE = false;

var SHEET_NAME = 'AP Slides Type Bump';
var UNDO_FOLDER_NAME = 'AP Slides Type Bump (undo)';
var HEADER = ['course', 'key', 'deckId', 'slides', 'runsChanged', 'status'];

// Apps Script kills a run at 6 minutes. Stop well before that and schedule a
// continuation, so a long run finishes on its own rather than dying mid-deck.
// A deck left half-bumped is the worst outcome available, so the budget is
// checked between decks and never inside one.
var TIME_BUDGET_MS = 4.5 * 60 * 1000;

// ---- BEGIN GENERATED DECK TABLE -------------------------------------------
// Regenerate with:  node scripts/build-slide-type-bump-gs.js
// Source of truth: config/csp-slide-embeds.js and config/cyber-slide-embeds.js
// enumerated through their manifests, so this is exactly the set of decks
// routes/slides.js can hand to an entitled teacher. Nothing else is touched.
//
// ap-csp: 224, ap-cybersecurity: 70, total 294.
//
// Each row is [course, key, fileId]. The key is only for the log and the
// sheet; the file id is what is opened.
var DECKS = [
  ['ap-csp', '1-1|1|teacher|cb', '19PAP9iWPvug0ske8BBqU-pVoXot85mhh5zFAUJzOiLs'],
  ['ap-csp', '1-1|1|teacher|deepDive', '1F2DSvBUhWhO3jJOQXrzcaePzc0iYr7UQ_5MO1Z6dZfU'],
  ['ap-csp', '1-1|1|student|cb', '1q8iSDsi5gC7WWjBq8L7wK2zGee3ULI_eIyXjAMbFaO0'],
  ['ap-csp', '1-1|1|student|deepDive', '15LYP677crzplYL9LSzSdE8gbPNENLGX0Ipc02lIIwvQ'],
  ['ap-csp', '1-2|1|teacher|cb', '1_q6Tlq0tPpsKwG8AI5c5l_7baNBr85EdyEr6mKIhOiw'],
  ['ap-csp', '1-2|1|teacher|deepDive', '1s0ZINranuMzE5hn8xiDAUGBDhVtxXyHsed88XUpCiqM'],
  ['ap-csp', '1-2|1|student|cb', '1VnOu5YFbxhMOKgDMS6190Imv5WJTBYR9QW0SMfXnhzI'],
  ['ap-csp', '1-2|1|student|deepDive', '1xbnbbRbZwQZEx2sKe2HcZgh-CVHXY9O_Fb0uqpUR2YQ'],
  ['ap-csp', '1-2|2|teacher|cb', '1YM7oA9p2gVzeRlTnlhUKh1zSG1V7htV0Qts6a3CSBTE'],
  ['ap-csp', '1-2|2|teacher|deepDive', '15N8uZxTfJ1i46xmLOHZS_YyjEsJGnS0OqP4E-HcFYlc'],
  ['ap-csp', '1-2|2|student|cb', '1Fm_Av1I00ckL10NbOLaZjpgfZEbnwp5sBYdVen1w2DM'],
  ['ap-csp', '1-2|2|student|deepDive', '1vpkeiXpBCY4l5u5uKSxtiCJNPxjbCBO1dHeb-xZcDY8'],
  ['ap-csp', '1-3|1|teacher|cb', '1gbmly23o4_E9NkUo8vmK2_BNTVA61kexUtgKQ0t30D8'],
  ['ap-csp', '1-3|1|teacher|deepDive', '1uLsoMVkfOFYNCiujv9jmCb8pIEpTFQTgYZL1WRpE2Uc'],
  ['ap-csp', '1-3|1|student|cb', '1TSTm2tOuBj8dX4acLGtNehpabR2RLDRAgKtaihDgakI'],
  ['ap-csp', '1-3|1|student|deepDive', '13SZubvU1cv-tClQFqHJuVig7tIZ22s5eZn7YHQsBaOM'],
  ['ap-csp', '1-3|2|teacher|cb', '1oHZB3ZdApsean0M8bLlI_hsbGuYWmbzK1qKLYGwngiI'],
  ['ap-csp', '1-3|2|teacher|deepDive', '1B2-VD4cGex-saWsvqIClhJOp50wWLy3WMN0Ov-hPHts'],
  ['ap-csp', '1-3|2|student|cb', '14Fhrw_aMvA_wlPclera57JXcgnEcMwjQzqxDp3M4eFM'],
  ['ap-csp', '1-3|2|student|deepDive', '1uX_h-oLIgX5I92nJ3RuTQsVOhxxldwR_19RsT2ZaDP4'],
  ['ap-csp', '1-4|1|teacher|cb', '15Nxw-T3-HaXzCNRgY-Bh6TcQ-f-f8zl9oFYY_qaePMg'],
  ['ap-csp', '1-4|1|teacher|deepDive', '1HaG7d9MN8klwxTKGUSBmOOGh70MQYsEgVTSbrT0D3a0'],
  ['ap-csp', '1-4|1|student|cb', '1-BrV9EffLShkpgJE_pneFqDAKw2YTVxl3UaJnhd-KYM'],
  ['ap-csp', '1-4|1|student|deepDive', '1McGkNKmXqLupPxZr5BoBpfYu78LvhJAO6MT4vGQ7hq8'],
  ['ap-csp', '1-4|2|teacher|cb', '1chimgYavYv84KHgJbZXx85FO3a9L3oKVYp9BzOYLgPE'],
  ['ap-csp', '1-4|2|teacher|deepDive', '1lXjy-HPJn9TcUlvGTKMfaGomG2XeKGty_Bov528KvCc'],
  ['ap-csp', '1-4|2|student|cb', '1SIi7wjSbr3d8PfbLU6Qz1tOrUcFXeY_o785wOh97IwU'],
  ['ap-csp', '1-4|2|student|deepDive', '1mjg4VlJWeqXINe2ej3dy2335BL3nmPwCHbfPEfKZ8wo'],
  ['ap-csp', '2-1|1|teacher|cb', '1uc6mC0IRNJqE0WEqlMk0UyYrxPI_B3mrVyXLJ6wLdF0'],
  ['ap-csp', '2-1|1|teacher|deepDive', '1SAXHEMTsNdt7pBXc4-bLd4QYZLj3DXAaTqUu4U8I530'],
  ['ap-csp', '2-1|1|student|cb', '18yM9D7idEDy-x_YgJTVNmcQZ42uVpqBQOMqm4jNJtyo'],
  ['ap-csp', '2-1|1|student|deepDive', '1unJhpnJUPKajDBQsHxeEG_uoRzD5SB04RQzZJ7U1OMg'],
  ['ap-csp', '2-1|2|teacher|cb', '1gVYGRCQ3M0v92ZuwrEQVR5PuZZjyauK64LOtoiySnYM'],
  ['ap-csp', '2-1|2|teacher|deepDive', '11w9tlTmiNLqlkXr_lF4F2n6ZLC-no4x8-1_NNr73EDY'],
  ['ap-csp', '2-1|2|student|cb', '18XuFvXxeWx1y_NpZryGEGE8KD2NCxsaHd7mwHP22Cc0'],
  ['ap-csp', '2-1|2|student|deepDive', '1BUm5ujIENuagrb44TI9RKVB1SDTixWQaUa3VkCXlefg'],
  ['ap-csp', '2-2|1|teacher|cb', '1hhn8RN8PI8uFe6Mh1PleFeIu1-Hru6cyjY1gKzOPk6g'],
  ['ap-csp', '2-2|1|teacher|deepDive', '1XRXrbiX6LugnF5GIQ5nfcMv-tX0AIEX2KRsf1lls5Z8'],
  ['ap-csp', '2-2|1|student|cb', '15ii-TODKk_ZlGa9hExlzeIucMfPYmILqD82eWcM8rNY'],
  ['ap-csp', '2-2|1|student|deepDive', '1WFfl4eoNTnMY_kQcGrKo9-xuKB4_Gp8dABS-Y-rAyXY'],
  ['ap-csp', '2-3|1|teacher|cb', '1FI3aT7AwL72tXrtskzT2LALOWrw48Ty8Wqx4qtPRdXU'],
  ['ap-csp', '2-3|1|teacher|deepDive', '1uOJV0KVceavTZiAlunW98dFuFCyr1HTvoCDiKBlshN0'],
  ['ap-csp', '2-3|1|student|cb', '1rxSUpplQYMGIkUQwI7aUtp0AoX3Kze4DZTk3yXsqL6Y'],
  ['ap-csp', '2-3|1|student|deepDive', '1tZ6-SxkymFNzPS4oK-2ZFjev7hTvY8k4EIPN0oTvJTU'],
  ['ap-csp', '2-3|2|teacher|cb', '1NgiK2N7Yq9CN8-_pLVOkUy5so-7x-IGlM2gC4PTzl5M'],
  ['ap-csp', '2-3|2|teacher|deepDive', '1vFSzXCgL6xNI70heFYHN_OXk9leRCuA1VwTgPsA_w6Y'],
  ['ap-csp', '2-3|2|student|cb', '1KDVrglPoWHT8pzcUxX68NAL8a0kfF0MZYuvHlh0OTwg'],
  ['ap-csp', '2-3|2|student|deepDive', '1tbrVCHT3hiZXn263wIn4KbU7FCZRGCRc4HDbvY-nVEI'],
  ['ap-csp', '2-4|1|teacher|cb', '1VPdlhT_ZIz4zULUUoOV9yrD2lZTJM73NHxXN7mjmP0o'],
  ['ap-csp', '2-4|1|teacher|deepDive', '1Jkt4NgIQHhGbislGvjOH2XY2_9sFzsQlkzUezYzanlA'],
  ['ap-csp', '2-4|1|student|cb', '1cNdt1DmPbdYNFZkXitQmuEknKP7GrDhXm19Uv7JSQ58'],
  ['ap-csp', '2-4|1|student|deepDive', '1ZfWIEaAkiNg9SxGd-kLzujaG9qF9b60eLU9pa8EMPMk'],
  ['ap-csp', '2-4|2|teacher|cb', '1THdUGPMB89tuLHC3j3wBqkQm034v32OBk_yu-vlMaM4'],
  ['ap-csp', '2-4|2|teacher|deepDive', '1QyG4RqfI46cZpJnnxeAmGp3zeU1cX-rqkAQRkVgK-MU'],
  ['ap-csp', '2-4|2|student|cb', '1T6ZOVValRvGC9vvv5bscGTFxr60yxFy8lBYoewAq6Ko'],
  ['ap-csp', '2-4|2|student|deepDive', '12Zdg48UxbKVdeWVLYL6wBDe_gi0mSQOiMTfgOveSc18'],
  ['ap-csp', '3-1|1|teacher|cb', '14WbSWfokrHAnqswptOO1kRs09hzJGl-bND3pA0TszHc'],
  ['ap-csp', '3-1|1|teacher|deepDive', '1WfnTQeswgLjpiwT6vkfUlu3cw6Es1Z4CgFwKVwwTtq0'],
  ['ap-csp', '3-1|1|student|cb', '1nJts6Mj2G_DeXOJMZcQn_lUzdzHtyF2DScy-bPHQBeE'],
  ['ap-csp', '3-1|1|student|deepDive', '18AyuPdGpq44N50xjyt5hRY5182Pyaq8-5C0r4FPIHPw'],
  ['ap-csp', '3-1|2|teacher|cb', '1tPh9sdc2raFAYg-DG1j_2_Su1w0AnuTWUdy_yKfqUJw'],
  ['ap-csp', '3-1|2|teacher|deepDive', '1M1FhHd4WlI0kdMBMCZd8BN_fX8dr3tJZk4mINdWTLQo'],
  ['ap-csp', '3-1|2|student|cb', '1ok-Whzo0kRwDnvJfYXjHs9gnvrs22bKr1DZ8sqOeCbg'],
  ['ap-csp', '3-1|2|student|deepDive', '1nL3tdZpQz24vlY7hzrDWV8vJzBMLTtlMvuGuk_mnv0o'],
  ['ap-csp', '3-2|1|teacher|cb', '1ZVi5KbHplQzulN69AgxLeI0kPU7FVRkgpgpP9ASoAnE'],
  ['ap-csp', '3-2|1|teacher|deepDive', '17f4J-5fFCcLMvZAPonItMZwFfBw0eUvNnnYodKyV3g4'],
  ['ap-csp', '3-2|1|student|cb', '1lt_pvHeS8oZVJEFU98ZOkFUOZJzhMLveCZURII1xmEM'],
  ['ap-csp', '3-2|1|student|deepDive', '1r4c2woNejW8x0n6VOBIwJRAPi4G0Icf6_LLKTHuMORM'],
  ['ap-csp', '3-2|2|teacher|cb', '1ZCkq7KeBtafJ24Qhzh3GWptryZtLE9UmeuB4kgtbipU'],
  ['ap-csp', '3-2|2|teacher|deepDive', '1y5ZD-S11iz8Y1uOOxg_GQl9rcA2lUV8_8nQ5S2siR6M'],
  ['ap-csp', '3-2|2|student|cb', '1sNRx64kPEjpvUHBw5TmMHBRWcshUvRQj992zT1rbJgg'],
  ['ap-csp', '3-2|2|student|deepDive', '18qIR6pOzWHXB8uuPUAxEdgovQSobVHQtI8WrvgOpEY0'],
  ['ap-csp', '3-3|1|teacher|cb', '1A78BtImchOVqemgIUKyPiTocmT8aBy4_iiHiWZUjyh4'],
  ['ap-csp', '3-3|1|teacher|deepDive', '1y42JS931a3l5jrv48BqTuz-gMbCYaz48Uo5iNY5E4Yk'],
  ['ap-csp', '3-3|1|student|cb', '1bfKSKwaDGcAovC5TrTLs-FFm0QiWK-ev6wPTtserTRY'],
  ['ap-csp', '3-3|1|student|deepDive', '1T4rqU9psEdkPbXjfkEi-IG0hIbC5E12K2vGjWnyDh_Q'],
  ['ap-csp', '3-3|2|teacher|cb', '1gNomfCzYecpRdZiZyNe-Vhepl1dV_SDMooPdA4Ufi0g'],
  ['ap-csp', '3-3|2|teacher|deepDive', '1HyVQqAdXC2c9CHV0DBuQ2xjRAkcFGdWlPQHfRJ1kuEM'],
  ['ap-csp', '3-3|2|student|cb', '1O-zbeym84Ko9Jl8fGXo82UP_APDkRNr6lxxwmF_8NEY'],
  ['ap-csp', '3-3|2|student|deepDive', '1yvFlNntQrezXAESR9oIrGBNke0JDzNR2SI3TZK6CDHI'],
  ['ap-csp', '3-4|1|teacher|cb', '1MQ8nX9suGJ9ptf_C2fP1JCbn6PVemr0VX5RbD1CPwM8'],
  ['ap-csp', '3-4|1|teacher|deepDive', '1auOceRMfSFG1RVhRCxdvRN8Iujp4Ua-eLs-CkGxo8Ys'],
  ['ap-csp', '3-4|1|student|cb', '1gatlxTT-yXHBtfvJ0MAhgJG9k9DauO_GNk_SSgSt6WU'],
  ['ap-csp', '3-4|1|student|deepDive', '1WNRmTQMQG5baZaIo0qSmsLvOUwSocZCvYqX0CswMmO4'],
  ['ap-csp', '3-5|1|teacher|cb', '12vAP-1_G7dmcli5k64D8MKtQJKYA4XhlbjSE8P9DfTk'],
  ['ap-csp', '3-5|1|teacher|deepDive', '1UAWdgpXluhAD5gsZemgfAmmSsb7LAH2iXGMd93HZPKg'],
  ['ap-csp', '3-5|1|student|cb', '1A6YiYWxF-6QK05jFWjQ2gLDKt6QXUaul0-oOGhR-oF4'],
  ['ap-csp', '3-5|1|student|deepDive', '1qd5lSu7MzJqt3mdhUKZJFQlHratItwqDodwfG4ikMw8'],
  ['ap-csp', '3-5|2|teacher|cb', '1LYZu3nlUXj-aNiGyhOdPehRTLZ9ge-IAiAl7IMicE-U'],
  ['ap-csp', '3-5|2|teacher|deepDive', '1zJQ4-pdiRV1NbtlPrFQbOI6Y8YTFVjQmFx4kHKmKcKk'],
  ['ap-csp', '3-5|2|student|cb', '1PZarAsrMAP6CE7E1yEjw0_X1bFvcO9UNpXPyMIfGIno'],
  ['ap-csp', '3-5|2|student|deepDive', '1hF4G-5eTrEH5sJs0aBLaCLwz0B_dTMiElSpnQ-ZS59Y'],
  ['ap-csp', '3-6|1|teacher|cb', '1gCJ3BxKJsTu30GK0Icc_ysWhHT7Sb0vdDEBEpZqtWwM'],
  ['ap-csp', '3-6|1|teacher|deepDive', '1fNkdhZZS99scq0S6LnLTbhvZFeR09oUZDtLSCnXiazw'],
  ['ap-csp', '3-6|1|student|cb', '1OIYh8rhm1WiliZ9qIi9jTQUA6-2j18KqPgqN-OVqcEA'],
  ['ap-csp', '3-6|1|student|deepDive', '1V1eTDriTttyNkOvUm745_uy9qjDGvQeme3qjgq4E5Rs'],
  ['ap-csp', '3-6|2|teacher|cb', '1i-Dj3Ki7z34iAqJqvJd8i9hauHvIhnv_l-VKcW3HMIM'],
  ['ap-csp', '3-6|2|teacher|deepDive', '1yEmsTLExT7yILd8Kjp1IxkikedleACJUhXQEsBnd47A'],
  ['ap-csp', '3-6|2|student|cb', '1Oc3dH1derJQ6eAajhR3IGsnW37P3i5ddXWk2uNRdO8Q'],
  ['ap-csp', '3-6|2|student|deepDive', '1NlhZWGRM1sy_DuGeO64FwFt8winq7y5U5lF6FUH1RMI'],
  ['ap-csp', '3-7|1|teacher|cb', '1cmBMsUFBbZaIJooj-ML8EAOAB5Qh4mnS8-QW-JgAAgs'],
  ['ap-csp', '3-7|1|teacher|deepDive', '1-LRWsbID-owAv4zk44a3P0YdPBvw_ZFQ6JfKhV2cjys'],
  ['ap-csp', '3-7|1|student|cb', '1PQK95liFOGBrbDNdHs2vg19h5UoWhtfABInyEOSBbVU'],
  ['ap-csp', '3-7|1|student|deepDive', '1OHLC0GLRJPJqH7W7v0WfPR8LgG8ivCBDA-QOPdYOoFI'],
  ['ap-csp', '3-8|1|teacher|cb', '11u8Zb2Y_cNTm5Idu9aynShlhqJ83TbxRHXSom0wbg_c'],
  ['ap-csp', '3-8|1|teacher|deepDive', '1snX92kBE7muD1u1RqP1MTUfhU0d8RNhpnTQGsynuoaE'],
  ['ap-csp', '3-8|1|student|cb', '1Ur5yWmdj8zE4-iASwYKkUviGTagR4DlIVSPIWXJoqlw'],
  ['ap-csp', '3-8|1|student|deepDive', '1Gv97ckV8UOpJla0iSFqkBxoftJjMmvr7wf7Nh-FkL3s'],
  ['ap-csp', '3-8|2|teacher|cb', '1drSX1nSxfjT4Q-u4zR_TyqhkYR9qLGNULy7FPypIlJs'],
  ['ap-csp', '3-8|2|teacher|deepDive', '10SsX76FSitD0rNg-wnXOmZRpKTl9fulHnghsiandq6Q'],
  ['ap-csp', '3-8|2|student|cb', '1wQHfHjfYQftxfPyzorQaOENNOaa0OQtpbXvSpZ8EHCY'],
  ['ap-csp', '3-8|2|student|deepDive', '13yVCDlWxiA1P5WoD-O3o8sIZwnJYyNrtetrdDmeHsn8'],
  ['ap-csp', '3-9|1|teacher|cb', '1co44UHeyW6IMLZZPJxjD_teJl0hxtds8ZJb7Xn5tuG4'],
  ['ap-csp', '3-9|1|teacher|deepDive', '18SFlGm8jFHaN2VWLP-A-dzT0WtLAvKLDXcNlNCwYKtg'],
  ['ap-csp', '3-9|1|student|cb', '19dLJUYiyu-hrj0jq24H0i4fI0B73s9wV-bHPlrcYG8M'],
  ['ap-csp', '3-9|1|student|deepDive', '1JlBv9VyMX-HAUWXZOJB5Q-TtSI40FWCLLbhKYcDy3YY'],
  ['ap-csp', '3-9|2|teacher|cb', '18uIxb4vctNjXxreCLOHxLlDJtwcZGsBrRa-6TDLsvsw'],
  ['ap-csp', '3-9|2|teacher|deepDive', '1gizM3pMIgPrqkEFZsxb5sVVdzEfDs5CHLPEciwoM78o'],
  ['ap-csp', '3-9|2|student|cb', '1Zg_pRmkLNZgi2SNXmjTHpnyJ6vkjM7P1ZXWSw5LoAQc'],
  ['ap-csp', '3-9|2|student|deepDive', '1lT70LhYzQseAZAoi-4q0m_PzAKjEMOrPSNIrLp3vqAM'],
  ['ap-csp', '3-10|1|teacher|cb', '15SNooBy1CEVn-09k7qra7bqA6IsCbiU96k7rjUd6yX4'],
  ['ap-csp', '3-10|1|teacher|deepDive', '1ekunfD70nwFTzaSXtnYNRLams2sC3FgE_SrmqDOA4aE'],
  ['ap-csp', '3-10|1|student|cb', '1rpkNZpukX7Y4wWMl7PdRSxBO7RvzrFY6NVddyAWd3pY'],
  ['ap-csp', '3-10|1|student|deepDive', '1t-Dcenio_jHPb7ihp4JZnY502OCnOZvgGnydi2Qbebw'],
  ['ap-csp', '3-10|2|teacher|cb', '18nX_2Wo8EkcT8R5ki9Aiiig_ACOcKWG0v5pmft1H8S4'],
  ['ap-csp', '3-10|2|teacher|deepDive', '1jRK0Tw-DQf4G3BeuDxSK9o5B5OOKlr8TBy_SN1IDp1A'],
  ['ap-csp', '3-10|2|student|cb', '1B1cycYfSvZKvV_XTqqmT2s4zKsoBag1v88teKnrADUc'],
  ['ap-csp', '3-10|2|student|deepDive', '18PJU_XchPxv-eJttecw0E6FUtzLtpWz4fpds5ci0lzs'],
  ['ap-csp', '3-11|1|teacher|cb', '1XuEHYtPjd_JSUG63AaMKG4wqnpHpLcTCMZV9rZLtxQo'],
  ['ap-csp', '3-11|1|teacher|deepDive', '1--LeYJTor2bdvKcp4w6PNMcdHL_55Lqc356aVaazy70'],
  ['ap-csp', '3-11|1|student|cb', '1T05oPo2NBi6GIEDulIHBBOHc-jz8KiC4xWKVu1Stt6Q'],
  ['ap-csp', '3-11|1|student|deepDive', '1iH9SEFn3OYqorCUFzwFSw2RssDam22ovXj_lk8KDIJs'],
  ['ap-csp', '3-12|1|teacher|cb', '18sH_LHlBO1Oec60AESVKcJZuYRyc1najYNI70b8QWyY'],
  ['ap-csp', '3-12|1|teacher|deepDive', '1F1nJk7ezPNZCUh7iYkzamqb8H2lqiyCQQqzrobkpuyY'],
  ['ap-csp', '3-12|1|student|cb', '1bpyQ_JCN__rqL8xlGuimQCGOs4g0nEBGXHsPNrcAV7I'],
  ['ap-csp', '3-12|1|student|deepDive', '1UCCYWq5Imq5e3gsDFTemHLuTQ526OVk0TYwqjL6Xrq0'],
  ['ap-csp', '3-12|2|teacher|cb', '126TxsLh6e6nMMpz2qLbqAzp7U6_sVV0Uf4fE5TIWjv8'],
  ['ap-csp', '3-12|2|teacher|deepDive', '1y3t_qrnYh330kryzP6t4SuIWsnvMGPAADiIG176m_Sw'],
  ['ap-csp', '3-12|2|student|cb', '1Yp7MAEozvbrDBgYrPDqKe3AjaHQFiAkllEj1Kf5Zj-Y'],
  ['ap-csp', '3-12|2|student|deepDive', '16nposxFLBOfXgUXiIBio-C56x4AUm9YXE0qn4um00KU'],
  ['ap-csp', '3-13|1|teacher|cb', '1XTEO1sZPCwS7VXAHQNd8HE3H_lf6RVXOFdi5NFM7ePE'],
  ['ap-csp', '3-13|1|teacher|deepDive', '1TRM-X6RV5f2xlo2CPRM2-A45GehAoZIofV65fIppuko'],
  ['ap-csp', '3-13|1|student|cb', '14lZ_5G-jCSFUErK0YcVh17kLrI1mHzq6gpnmPsc6WOU'],
  ['ap-csp', '3-13|1|student|deepDive', '1XTimu5AuRy3KaoDGtbwfayknZrUIOXA3jzjhFmtqH0w'],
  ['ap-csp', '3-13|2|teacher|cb', '1RacgN8SyknjK5VKAsQRyL6kw6ijQW8klK38eTpcql2c'],
  ['ap-csp', '3-13|2|teacher|deepDive', '1sxRISi91uCziIty7iVl5VyrvyUNWIRCikxvb_7sm7gs'],
  ['ap-csp', '3-13|2|student|cb', '1nB9qbKm_JhiRT5o8ErsDS-nlVTUBPiL9yxVRqsOi3B4'],
  ['ap-csp', '3-13|2|student|deepDive', '1a3ASTaJzgRNxmGgX4Vk_dIJPJuMbdF3q2bqCqNaTItI'],
  ['ap-csp', '3-14|1|teacher|cb', '1U7Y24wWTKCYrzvB8FINaKlcSV0wUVSLcnQcvL9emO_M'],
  ['ap-csp', '3-14|1|teacher|deepDive', '1OiJZq-zXZiwxsUL97b_QwI3I7bblCTquZ1ZU97rjxXw'],
  ['ap-csp', '3-14|1|student|cb', '13vJ5u4uMdmJhGCqHG-ixkQlUtmy-G8xVcejyvJGTB2M'],
  ['ap-csp', '3-14|1|student|deepDive', '1mT-Riat8C9_iD3mCh9abxPsXg1oR8tkbgXwlQbsf8nM'],
  ['ap-csp', '3-15|1|teacher|cb', '1qlvb-HIjK7JP6JVk6wGsJ73FA1thXtsEWesJTSpZJpw'],
  ['ap-csp', '3-15|1|teacher|deepDive', '1upt3mMfJTxpnKyvCmjWJGU_du8y5LY9HNZhG1vWtn10'],
  ['ap-csp', '3-15|1|student|cb', '1fcvUgd3XL0nV-HZdZ65HYJ4c1Un7GU-Jc4rYx5daZO4'],
  ['ap-csp', '3-15|1|student|deepDive', '1EjGydML1XSRgUQLVfkVEvUsZod-fEknlJxtS_eh71iw'],
  ['ap-csp', '3-16|1|teacher|cb', '1GBWFGLs4kK0lRzmc3Xou1u-eVccUldj59KuJdi4N6tg'],
  ['ap-csp', '3-16|1|teacher|deepDive', '12mHI48HcDxQidvbly4aT90HnjukPJhkAQIriMiHh03s'],
  ['ap-csp', '3-16|1|student|cb', '1WVMmBK70v8t3vxZ9uWYuTGQhJeJhKYhkssABILG6qFo'],
  ['ap-csp', '3-16|1|student|deepDive', '1Bx0p1-jRIlBmkk3W_6MuulPw43EcxOadhlg54JM0Dlg'],
  ['ap-csp', '3-16|2|teacher|cb', '1Bqeu_pkg2awwILYF-oQydGFPyj8TLPqYVQNkfevRAqE'],
  ['ap-csp', '3-16|2|teacher|deepDive', '1BgaTxcGxOMYfW0LLf11v1E0YZN1V0q_qqtHOLuNOuZc'],
  ['ap-csp', '3-16|2|student|cb', '1qFV7EqUU7ZTGChs86gbLoPQP1SgE0We1XMm2tITg2O0'],
  ['ap-csp', '3-16|2|student|deepDive', '1PlVdjI1VesC8ox5xKKIGStE6UriCgwTZ_EVuY8BA2e8'],
  ['ap-csp', '3-17|1|teacher|cb', '1b08XG-t2v-gDHV8zUiouAoU5L81BfrRtGUMciSY3iH8'],
  ['ap-csp', '3-17|1|teacher|deepDive', '1k5r5SAWs5TdGvGKJqc24PMClu_CvxW10T9zMXNAaeVc'],
  ['ap-csp', '3-17|1|student|cb', '1qeSiYLywh3-bfSYaY63lTb2pX2lswutN_QhfKpAzzBE'],
  ['ap-csp', '3-17|1|student|deepDive', '1gR_kijJmDSADTH0feRVQ5GQJY3Q0yHSR1a6sjsEDj9g'],
  ['ap-csp', '3-17|2|teacher|cb', '1wYKZc4DDei7d9MiHa4PpY7h0KQOQDKpjyN27kGJqPxI'],
  ['ap-csp', '3-17|2|teacher|deepDive', '1bvV6HutdZ0KrGVrB9PLa-vwHQnJYUr_ONKaIhSo1Bgg'],
  ['ap-csp', '3-17|2|student|cb', '1tVhOV2GaW8UKutDw93tVe0IA85w3-1sSLUsUC2jXoZw'],
  ['ap-csp', '3-17|2|student|deepDive', '1Bw0hgTMnsO3pHzaGpt7N65rBygGRZ8GngELHDWJgQF0'],
  ['ap-csp', '3-18|1|teacher|cb', '1GGF_0ka3gAS8wdOqaRIfVbzDFEE8Q6TNkgxOIkfF3ME'],
  ['ap-csp', '3-18|1|teacher|deepDive', '1wRTmHBxjq7ooEwF6jTtqjG35ox8LhCoP1tXPKGTxMYA'],
  ['ap-csp', '3-18|1|student|cb', '1p-Ch_eynFG5tqbw_9S-XyJMjEZTEXmVWt2hMTG8Mn9Y'],
  ['ap-csp', '3-18|1|student|deepDive', '1dp8f977O3GwZgLXVNGu8TWspAZZDdqDLup8V9QW61cw'],
  ['ap-csp', '4-1|1|teacher|cb', '1n1bItc_aiCMLcVt-FbdKhymfz5W14AQ8-8CXumeUIgk'],
  ['ap-csp', '4-1|1|teacher|deepDive', '1jlMaxZd3ODR5opcj6EWdrJHSKl4EWudQcKyaZuxFW7k'],
  ['ap-csp', '4-1|1|student|cb', '1GurWC7cE44auz36TMu18cWtR0rwDHg-jpPuasFYYMtE'],
  ['ap-csp', '4-1|1|student|deepDive', '1G8HwBmLPx8gRUtzeN2Y5GIdPb8EbUnGK836_-zMWMUo'],
  ['ap-csp', '4-1|2|teacher|cb', '185S-RETUmJfi4c27m-qQ0KZ51tmHZZQ54Gn5-LuLmgE'],
  ['ap-csp', '4-1|2|teacher|deepDive', '1o3SbTpIB3OQHYPPcoZJUbqpWp0_3AAxnbJIPGdMWcEw'],
  ['ap-csp', '4-1|2|student|cb', '11gHhqL0LLsQHFZh6QubiZmCF3R5f-bN3rl5HdWmFCtE'],
  ['ap-csp', '4-1|2|student|deepDive', '1tf9SW-j3yXJ9yCrpo9jHTYJzZLohtAOHzgo8VEKLQU8'],
  ['ap-csp', '4-2|1|teacher|cb', '1fKwUENpecLRNPAq1JMBB0F8roVTzAmri29yPlZ93fFU'],
  ['ap-csp', '4-2|1|teacher|deepDive', '15RwaGlwSAzYVCTKFziub2mi9HAXlgLFuEEnyDN8d6Ts'],
  ['ap-csp', '4-2|1|student|cb', '1O-aSOO2bgtK0-DVVF901jw7rux_DoB3F06VZ8oDQStw'],
  ['ap-csp', '4-2|1|student|deepDive', '1vdLEZVmSGyZsdZWT5Ln_m85790CBKhi5bUJhM-_8pdc'],
  ['ap-csp', '4-3|1|teacher|cb', '1XwWSb2_spkQ3Uxa_W6aHMsNFdsxEWNYEwmxaC9OUdto'],
  ['ap-csp', '4-3|1|teacher|deepDive', '12vdwnN7zNthd1HbkmjXfRw-kM4fNBPWyHrDBCkHrN-g'],
  ['ap-csp', '4-3|1|student|cb', '14kaPnuEwk4X6VcIPFCSm7kiE1fbYtV2bNVKPE4MH5Q4'],
  ['ap-csp', '4-3|1|student|deepDive', '1NNDZtuw06H4394rZlEzipHNiQZmZdJedTGOC5n3VG9s'],
  ['ap-csp', '5-1|1|teacher|cb', '1IeoceB4R3j6loMuh0Ivis9FrkQQ2iuHqewEu27epoCM'],
  ['ap-csp', '5-1|1|teacher|deepDive', '1pxh07MDIjLzadOUY0BVij8li1edjesoR9-s3Iw4156g'],
  ['ap-csp', '5-1|1|student|cb', '1-uimLhWPjY5OvZ83-nXHM8C4VdO9smwP2ZRFKqV5G0I'],
  ['ap-csp', '5-1|1|student|deepDive', '13u9sSDbPIj7IatrRAqPYveLlz55K0-3yqUBi21bh8e8'],
  ['ap-csp', '5-1|2|teacher|cb', '125bOX2VcYAY8oUAH5MMrSAX6MVI0HtdFZcmzkOTI5W8'],
  ['ap-csp', '5-1|2|teacher|deepDive', '1rEhUpzS6bgyGU5cwxT81yp63K2W9pNLiK5MsMu1hOT8'],
  ['ap-csp', '5-1|2|student|cb', '1fjhAQRcqBf-lxBb7gQMJXwncD2wKNIUT2YdlRPMx2wk'],
  ['ap-csp', '5-1|2|student|deepDive', '18uWTC4TYeokmEswp6kSQw32lxxlVrn0D9pnrxx4HO2o'],
  ['ap-csp', '5-2|1|teacher|cb', '18lBsuNu2-NF1cIgEYmxz_oQOBqEJdAbcHxkMsa4sRNk'],
  ['ap-csp', '5-2|1|teacher|deepDive', '1IYO0Jdn_GKqSCKaun1orFtMZe8T-j6CWlvGxlTsXf-s'],
  ['ap-csp', '5-2|1|student|cb', '1IEyXmlWC4UavI5PjfyJb1twA3hLhzNDRnHPfO4sefr4'],
  ['ap-csp', '5-2|1|student|deepDive', '1FrpfS0Z04Kj1mWH0lKFrX4HGg0K3CdgPwg3BP-zIMAI'],
  ['ap-csp', '5-3|1|teacher|cb', '1sSfuY1Kt5GFofRbDuUzsF0w1bg7AmjBkDQm54mhae1Y'],
  ['ap-csp', '5-3|1|teacher|deepDive', '1JsmWzZOPc81NvNgxP9AV7oSLVS4nKJiwSnLa1Bl-gP4'],
  ['ap-csp', '5-3|1|student|cb', '116sv447IvTaF5Ji13U4rVXedN59-CyPPJki7VjtN8v0'],
  ['ap-csp', '5-3|1|student|deepDive', '1aWe-M5-gcqtWeInONeI9yllLmIV0HvG4Y85_gCFHPE4'],
  ['ap-csp', '5-4|1|teacher|cb', '1kSDzCHHW63hAF0miyv0astRXtBDbhTJ2tgyY4N2Hfbs'],
  ['ap-csp', '5-4|1|teacher|deepDive', '1hxO3p5KvaHyc77SXRHVldpg0y8kTo_zX-KVYNvXf-ZQ'],
  ['ap-csp', '5-4|1|student|cb', '1RbQHvu8WR8U_av1fwKMesOtkz85HhwwsMf1qs0XtYAU'],
  ['ap-csp', '5-4|1|student|deepDive', '1c8RiLgdn2DmIHfRR7qEe87qs4nEU7wgOBL_-1J7u6lY'],
  ['ap-csp', '5-5|1|teacher|cb', '1CVSt9pIAXIb_rX2LYrBygAne8sls7DRCh-zDz2M13bs'],
  ['ap-csp', '5-5|1|teacher|deepDive', '1H1lsHS4atmsLRMehNigv5Dt3vJkdnGPHrf2oJQ09Fwg'],
  ['ap-csp', '5-5|1|student|cb', '1FRbM3EUMoPoI9R8n-ngRjZJOwewMwKIDEUn4V800laE'],
  ['ap-csp', '5-5|1|student|deepDive', '1MfoJqeEO8HBrbs6YSL_djQGI48fnh7NbEbGJPo-1jV4'],
  ['ap-csp', '5-6|1|teacher|cb', '1WchpUKNP1Nvh3Zf7lEt3coz_-355pOsvkq_Mz1gezTQ'],
  ['ap-csp', '5-6|1|teacher|deepDive', '1aM0OVuBj71gZ2uUPI4tlfpcQ6h783XNpRWwECTEqFRc'],
  ['ap-csp', '5-6|1|student|cb', '1nkWbBhJ4zxc-txFwPCMn66d-SIwFpwFRd249umgYjuM'],
  ['ap-csp', '5-6|1|student|deepDive', '1B9CRfVxTTQdlysklZdXDVYlken4Cu0NbQjLghgDiVbo'],
  ['ap-csp', '5-6|2|teacher|cb', '1uRJBZRoWDFAn6qb2kp3B-SMpQ_knjYWCGKzcezQgIN4'],
  ['ap-csp', '5-6|2|teacher|deepDive', '110Hs-74qHy793cZ0j2sYGyf6nFKZmNObDndlg4VyB0U'],
  ['ap-csp', '5-6|2|student|cb', '1s6eWMr_MxhMDJM0TnU-VnrZfJf3CcwhIwY0Xdbu2e4E'],
  ['ap-csp', '5-6|2|student|deepDive', '1Lh3EtXWYyZYXHQ18fpdPtbs8jsk8jGvqn40MCB8n5bU'],
  ['ap-cybersecurity', '1-1|1|teacher', '18DOf5jxS6o-p6ZN-uh5gMihXvb2PXgIVB-t4Buel7So'],
  ['ap-cybersecurity', '1-1|1|student', '1UPiOXdqGnnDRwMAMi9BTLAarB1r0A8kc21TLSutIEwI'],
  ['ap-cybersecurity', '1-1|2|teacher', '17kgzSTPECZByjfKmoq4dnQfx8AQ91REER8OQuizj6hk'],
  ['ap-cybersecurity', '1-1|2|student', '1FIXWRaE5tYpWCa5RbqfHOJ_3V6KMZWeBivd8Rzt3YMU'],
  ['ap-cybersecurity', '1-2|1|teacher', '12NRg-oYj3t4ncGl9Qj0pZirj8xWKbc2boJmJ7kTrEMw'],
  ['ap-cybersecurity', '1-2|1|student', '1sFWNZ3uWlQv4SFGKhCNDEe5ETENgtH9iJKvBiSB0um0'],
  ['ap-cybersecurity', '1-2|2|teacher', '1xmM43Ho6J12AViAxVaYxXARI0BGt7iTZxlcIbSBUJNY'],
  ['ap-cybersecurity', '1-2|2|student', '1KyOBHEqmtgbxT4EhKQ7jb5ndFSQiHmdvGMnGsPM-jcc'],
  ['ap-cybersecurity', '1-2|3|teacher', '11NITPtdIueiU451bnTa44f2cjJ3VOTI5vlxbp-mu2_c'],
  ['ap-cybersecurity', '1-2|3|student', '1_IWySQ-bNqa9UPsKYgdrYMlGd6hLRwgNNA0-snUpCFU'],
  ['ap-cybersecurity', '1-2|4|teacher', '1K6_3ELhnGhEhDBSZfWjQhOGrOEuxWLfwo61f2K2XMJ8'],
  ['ap-cybersecurity', '1-2|4|student', '1_bgU3Mqq8b4RhqaffHgk78m0osY8QLZ6yRAgbK6AKF0'],
  ['ap-cybersecurity', '1-3|1|teacher', '1F3qh0TJWYy6tDNJkcjrtF3i6vaQOmZL0Xam-9rspP4o'],
  ['ap-cybersecurity', '1-3|1|student', '1geJDWVBfnT9Qj55v-sIGltbQ9kyi2KnVJ8h28Z_aTWQ'],
  ['ap-cybersecurity', '1-3|2|teacher', '15jzyJg4U6SBSYKFoMwi0nIs63uNfLGiSq5JJzKo1S9E'],
  ['ap-cybersecurity', '1-3|2|student', '140sxN5Co0nKVAskZrkIlP4c6MlsD43jvlnx-54ZxB6o'],
  ['ap-cybersecurity', '1-3|3|teacher', '1K2yZUr2RxQrIM34gEeWZopJzR7kbf7OfJM_fySeT8r8'],
  ['ap-cybersecurity', '1-3|3|student', '1e_REM5lM8UCLsGdOCal8evMqOamSyvMv276yixf1ipE'],
  ['ap-cybersecurity', '1-3|4|teacher', '1nLs0vkIUiEtVxPEyg8kI9pjtEzKrD5BoxxLdAfeJEDI'],
  ['ap-cybersecurity', '1-3|4|student', '1NJhNV7tv1fZ9dGzgPI3dhReF28s7TrtWmlj6UrEI3KA'],
  ['ap-cybersecurity', '1-4|1|teacher', '1FQdjdBoI6rhlRKg5Pj4MDCk8JyKRB5rKFDLUHpXXuYo'],
  ['ap-cybersecurity', '1-4|1|student', '1HveKbejnq8rp6gRa_MrX1hR2K1oFwRWUovnm_o9_5QA'],
  ['ap-cybersecurity', '1-4|2|teacher', '1RV6K9gz30shgh0TQmTs-3iwREB0err-15g2Mm1nbIKE'],
  ['ap-cybersecurity', '1-4|2|student', '179Y6cDAMup2jq2qw-K_yjzB78jMOAivn-SC_jYCz57c'],
  ['ap-cybersecurity', '1-5|1|teacher', '1A0L2SBSvglhrvJ37ubpKJIHtt-2lAV1F4RDAusgADFU'],
  ['ap-cybersecurity', '1-5|1|student', '1JRtjsII4nCRl09bfJdoCFFW439iRcH17pebZ2w9ncoY'],
  ['ap-cybersecurity', '1-5|2|teacher', '1CHD2hrRTbO_psHxXwEbd-MhtQCC8bOnm9VB_f2qNNKc'],
  ['ap-cybersecurity', '1-5|2|student', '1Qnk55DBWVI3qc1fDbXs2AesL5CHrwrBJRQiWVp481ds'],
  ['ap-cybersecurity', '2-1|1|teacher', '133-iR56x_v8C2bdtzdbUSF-9Wtn2tZCdCWCNI1BS68U'],
  ['ap-cybersecurity', '2-1|1|student', '1Uhu0SLp6vKXqMuRN_YCpmfT8yQCoASGWnPlmfKuizLE'],
  ['ap-cybersecurity', '2-1|2|teacher', '1FTKWPnyWRg8K0JfwPOcsX-2W9x65ISeXdr0P6I_u8cU'],
  ['ap-cybersecurity', '2-1|2|student', '1N0ZRtWP3a12fyGQsDf2vwxPvKXWAfsUtawXuKZ5fsmY'],
  ['ap-cybersecurity', '2-1|3|teacher', '1Nf9BwnyS5wIYX7zo0caeoaZGJWyZzjbXa2m1bfO90gk'],
  ['ap-cybersecurity', '2-1|3|student', '1uqHGypiydbsGeF983eoLfHxQuGbc3zJavS5-8fbToCk'],
  ['ap-cybersecurity', '2-1|4|teacher', '12MnOArF62QxL9VZslZFVRQA4Pdfo9gdoJsbtJGCANWU'],
  ['ap-cybersecurity', '2-1|4|student', '10_EYUMuzK0Vlv3K7e0WAs5fxCbLMetlXQQNqahsXNNw'],
  ['ap-cybersecurity', '2-1|5|teacher', '18J-mxHuUl54s8FqnH3tFZDMzz8po87u1sWVu6X5_AkY'],
  ['ap-cybersecurity', '2-1|5|student', '1hhBkNqfPJetGI68BWUL0lwZYWZ957o4U2MT3OuXyHrU'],
  ['ap-cybersecurity', '2-1|6|teacher', '1Nco1HvFtipHiZ6NSaw7oXrUiWoN7itGlafADxbIRYVI'],
  ['ap-cybersecurity', '2-1|6|student', '1iGEvKrZ5Wn9OHsAsrmQU5AEPfdQppRuTXARHPZ5e3us'],
  ['ap-cybersecurity', '2-1|7|teacher', '18C4spyxRQssUMIiPO0U7jgdVDGWPdj4slctjYs_CJ_E'],
  ['ap-cybersecurity', '2-1|7|student', '1yOjBWIpXYjW79eZzsaBEeRtv0Y1CNOoWVZMRKfX7aks'],
  ['ap-cybersecurity', '2-1|8|teacher', '1Ir5h2065yzmckiDjdq5uklBTOHDWyrugLm5BItZO6ps'],
  ['ap-cybersecurity', '2-1|8|student', '1o3HFBcxa6KhqI0qlde_2NPeIUL7UuhXtPY0csz6TYH0'],
  ['ap-cybersecurity', '2-2|1|teacher', '1mFvM1iRwxCz21H4cWIw2Ebx2j5f5mpBVSLWmrpoPct4'],
  ['ap-cybersecurity', '2-2|1|student', '1m354_vVbcNCGHSm8saHwP67feHJTWho0h4XTL1XD9dM'],
  ['ap-cybersecurity', '2-2|2|teacher', '1haScAh5VcU_-GND6uzlrPGCXPaR6tPKliKdD4hTOqNI'],
  ['ap-cybersecurity', '2-2|2|student', '1RJKr-lCWy_w5dAjiYM24BUpEiYHd0z6ND5uY7pEfYEE'],
  ['ap-cybersecurity', '2-2|3|teacher', '1kYMf6OkoP1JgFjCJPjFHbJCmOgEapICNqP6iQ6RhGrk'],
  ['ap-cybersecurity', '2-2|3|student', '1x_Z6hUNVV0F9kgb7Necd_pRxfQ8wthCYMz2dSfRWefg'],
  ['ap-cybersecurity', '2-2|4|teacher', '1scbjGCqxwOOXUn35GuEwzTBbsXXqVIe0m9e2FHeqWZg'],
  ['ap-cybersecurity', '2-2|4|student', '1kPCofh-itC3W8uuhYSmyMq1_Ezm5cJJ9YskPOFIvvDI'],
  ['ap-cybersecurity', '2-2|5|teacher', '1lXpyvj1w0l-gkoTPaGQmda_MExbokBuK4BkZP47qjh0'],
  ['ap-cybersecurity', '2-2|5|student', '1PG0sQyJbUc-g-8WZ7iyURGIE0eyB09wSZD_y4DxY6gQ'],
  ['ap-cybersecurity', '2-3|1|teacher', '1KNarPOx6QnaUgGDtg-eAUTeX57SWP44qFRGQcRXmuuo'],
  ['ap-cybersecurity', '2-3|1|student', '1Cw4OgGl_UZZq5nx69iTNgi0D9BNJVwzEdnwKeXxgKwo'],
  ['ap-cybersecurity', '2-3|2|teacher', '12rY48PTHZwaVpkLtY8peOLGYIGG-KuOxN9YebSGSM8k'],
  ['ap-cybersecurity', '2-3|2|student', '1__9tHOKeJgX-jhc23sikS94B-bYngC0htrt4CBf_IDM'],
  ['ap-cybersecurity', '2-3|3|teacher', '185u18uqAWaYRynNylqz7p8Iz36BLhCpJaZ-jZlmQnuw'],
  ['ap-cybersecurity', '2-3|3|student', '1CQ3DKrthlVOUlvvCFSLf0gD-Tc4Q3Dy78xhlfyBts3Y'],
  ['ap-cybersecurity', '2-3|4|teacher', '1rjoUGmzz1n9DgUzAwUIT8XtzjdkoJx_-cD7-1aeA6AM'],
  ['ap-cybersecurity', '2-3|4|student', '15A7fXG_WqtvQT7WUDi1HqWuvLoKIDY5E76oQDuxe_l4'],
  ['ap-cybersecurity', '2-4|1|teacher', '1N4fKGjSFjxqApbubOU6gu4Qg6iJzVNsIulkpUOQe0n8'],
  ['ap-cybersecurity', '2-4|1|student', '1Eyz6t3_mFhSGvQZpOUsUmw29NqpJWX9oPeD3uqz3Q7U'],
  ['ap-cybersecurity', '2-4|2|teacher', '1V-KFAwEOUxg_G1YKeti0R-z7_GeAMHFGv4NKceITRJA'],
  ['ap-cybersecurity', '2-4|2|student', '1fOsWVeKJjOQv8zalgA2Vq0d71dbtqjs5lsvq4zxqyEw'],
  ['ap-cybersecurity', '2-4|3|teacher', '1nB5p8LP6qD14QpnX7xMOs757wKTK21uPDfZ3lCp_QTA'],
  ['ap-cybersecurity', '2-4|3|student', '16DdiaZg6uihoITpu1sjOVw98Ppus-8cNVF4D13Zofvw'],
  ['ap-cybersecurity', '2-4|4|teacher', '1WZizo2eoX94je3AiRxXSeNXQ4pjjOK1C09mZ1ykRPFc'],
  ['ap-cybersecurity', '2-4|4|student', '1X2YT8WpoQKzkUcA5TjnSHtouGpaRuWtCdKntFHd89iM'],
];
var DECKS_GENERATED_AT = '2026-08-28';
// ---- END GENERATED DECK TABLE ---------------------------------------------
// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/** A ladder key, guarded against float noise coming back from Slides. */
function sizeKey_(s) {
  return String(Math.round(s * 100) / 100);
}

/**
 * The new size for a run, or null to leave it alone.
 *
 * Null means "outside the ladder's range, by design". A size INSIDE the range
 * with no ladder entry is a different thing entirely, and unknownSize_ is what
 * asks about that: the caller has to decide, because guessing is how the
 * arithmetic version broke the hierarchy in the first place.
 */
function bumpedSize_(s) {
  if (s === null || s === undefined) return null;
  if (s < LADDER_FLOOR || s >= LADDER_CEILING) return null;
  var k = sizeKey_(s);
  return Object.prototype.hasOwnProperty.call(SIZE_LADDER, k) ? SIZE_LADDER[k] : null;
}

/** True for a size the ladder should describe and does not. */
function unknownSize_(s) {
  if (s === null || s === undefined) return false;
  if (s < LADDER_FLOOR || s >= LADDER_CEILING) return false;
  return !Object.prototype.hasOwnProperty.call(SIZE_LADDER, sizeKey_(s));
}

/**
 * One attempt at a ladder, at a given lift. Null if that lift does not fit.
 *
 * The lift tapers from `lift` at the floor to nothing at the ceiling, and then
 * the result is walked upward and pushed apart wherever rounding to half
 * points would have collapsed two sizes onto one. That second pass is the
 * whole point: the taper alone has a slope below 1 and therefore collides, and
 * it was those collisions that made the arithmetic version unusable.
 *
 * The push-apart can cascade, and on a dense enough vocabulary it runs the top
 * of the ladder into the ceiling. There is no local repair for that: mapping
 * the saturated size to itself puts it BELOW the size beneath it, which is the
 * inversion the whole exercise exists to avoid. So this returns null and lets
 * the caller try a smaller lift instead.
 */
function buildLadder_(sizes, lift) {
  var out = [], prev = null;
  for (var i = 0; i < sizes.length; i++) {
    var s = sizes[i];
    var raw = s + lift * (LADDER_CEILING - s) / (LADDER_CEILING - LADDER_FLOOR);
    var t = Math.round(raw * 2) / 2;
    if (t < s) t = s;
    if (prev !== null && t <= prev) t = prev + 0.5;
    if (t >= LADDER_CEILING) return null;
    out.push([s, t]);
    prev = t;
  }
  return out;
}

/**
 * Build a strictly increasing ladder from the sizes a corpus actually uses.
 *
 * Tries the full MAX_LIFT first and backs off a quarter point at a time until
 * the ladder fits under the ceiling. That is what makes this safe to point at
 * a course nobody has measured yet: a vocabulary denser than AP CSP's simply
 * gets a gentler lift rather than a broken hierarchy. The search always
 * terminates, because a lift of zero maps every size to itself and the sources
 * are already distinct and sorted.
 */
function proposeLadder_(sizes) {
  var inRange = sizes
    .filter(function (s) { return s >= LADDER_FLOOR && s < LADDER_CEILING; })
    .sort(function (a, b) { return a - b; });
  for (var k = Math.round(MAX_LIFT * 4); k >= 0; k--) {
    var out = buildLadder_(inRange, k / 4);
    if (out) return out;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Walking a deck
// ---------------------------------------------------------------------------

/**
 * Every text range on a slide, including inside tables and nested groups.
 *
 * Dispatching on getPageElementType() rather than calling getShapes() and
 * getTables() separately, because a deck converted in bulk from .pptx puts
 * things in groups, and a group's children are invisible to both of those.
 */
function textRangesOnSlide_(slide) {
  var out = [];
  collectFrom_(slide.getPageElements(), out);
  return out;
}

function collectFrom_(elements, out) {
  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var type = el.getPageElementType();
    if (type === SlidesApp.PageElementType.SHAPE) {
      out.push({ id: el.getObjectId(), text: el.asShape().getText() });
    } else if (type === SlidesApp.PageElementType.TABLE) {
      var t = el.asTable();
      for (var r = 0; r < t.getNumRows(); r++) {
        for (var c = 0; c < t.getNumColumns(); c++) {
          out.push({ id: el.getObjectId() + '!' + r + ',' + c, text: t.getCell(r, c).getText() });
        }
      }
    } else if (type === SlidesApp.PageElementType.GROUP) {
      collectFrom_(el.asGroup().getChildren(), out);
    }
  }
}

/**
 * What this deck would change, and what it could not describe. Reads only.
 *
 * A change is [slideObjectId, shapeRef, startIndex, endIndex, oldSize, newSize].
 * The text itself is never edited, so those indices stay valid, which is what
 * makes the undo file usable later.
 */
function planForDeck_(pres) {
  var plan = [], unknown = {};
  var slides = pres.getSlides();
  for (var i = 0; i < slides.length; i++) {
    var slideId = slides[i].getObjectId();
    var ranges = textRangesOnSlide_(slides[i]);
    for (var j = 0; j < ranges.length; j++) {
      var tr = ranges[j].text;
      if (!tr) continue;
      var runs = tr.getRuns();
      for (var k = 0; k < runs.length; k++) {
        var run = runs[k];
        var size = null;
        try {
          size = run.getTextStyle().getFontSize();
        } catch (e) {
          continue; // a run with no resolvable style is one to leave alone
        }
        if (unknownSize_(size)) { unknown[sizeKey_(size)] = true; continue; }
        var next = bumpedSize_(size);
        if (next === null) continue;
        plan.push([slideId, ranges[j].id, run.getStartIndex(), run.getEndIndex(), size, next]);
      }
    }
  }
  return { plan: plan, unknown: Object.keys(unknown).sort(function (a, b) { return a - b; }) };
}

/** Apply a plan. Returns how many runs were changed. */
function applyPlan_(pres, plan) {
  var byShape = {};
  var slides = pres.getSlides();
  for (var i = 0; i < slides.length; i++) {
    var ranges = textRangesOnSlide_(slides[i]);
    for (var j = 0; j < ranges.length; j++) {
      byShape[slides[i].getObjectId() + '/' + ranges[j].id] = ranges[j].text;
    }
  }
  var changed = 0;
  for (var p = 0; p < plan.length; p++) {
    var rec = plan[p];
    var tr = byShape[rec[0] + '/' + rec[1]];
    if (!tr) continue;
    tr.getRange(rec[2], rec[3]).getTextStyle().setFontSize(rec[5]);
    changed++;
  }
  return changed;
}

// ---------------------------------------------------------------------------
// The undo record
// ---------------------------------------------------------------------------

function undoFolder_() {
  var it = DriveApp.getFoldersByName(UNDO_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(UNDO_FOLDER_NAME);
}

function undoFileFor_(deckId) {
  var it = undoFolder_().getFilesByName(deckId + '.json');
  return it.hasNext() ? it.next() : null;
}

/**
 * Written BEFORE the deck is touched, not after.
 *
 * A run that dies between changing a deck and recording what it changed leaves
 * a deck nobody can put back. Writing first can at worst leave an undo file
 * describing changes that were never made, and replaying that is a no-op
 * because it sets sizes to what they already are.
 */
function writeUndo_(deckId, course, key, plan) {
  var payload = JSON.stringify({
    deckId: deckId, course: course, key: key,
    writtenAt: new Date().toISOString(),
    ladder: SIZE_LADDER,
    changes: plan
  });
  var existing = undoFileFor_(deckId);
  if (existing) existing.setTrashed(true);
  undoFolder_().createFile(deckId + '.json', payload, MimeType.PLAIN_TEXT);
}

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

function sheet_() {
  var files = DriveApp.getFilesByName(SHEET_NAME);
  var ss = files.hasNext()
    ? SpreadsheetApp.open(files.next())
    : SpreadsheetApp.create(SHEET_NAME);
  var sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);
  return sh;
}

function alreadyDone_(sh) {
  var last = sh.getLastRow();
  var done = {};
  if (last < 2) return done;
  var rows = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
  rows.forEach(function (r) {
    if (String(r[5]).trim() === 'OK') done[String(r[2])] = true;
  });
  return done;
}

function decksInScope_() {
  return DECKS.filter(function (d) { return COURSES.indexOf(d[0]) !== -1; });
}

/**
 * The decks in scope, round-robined by course.
 *
 * The table lists all 224 CSP decks before the first cyber one, so the first
 * preview() spent its whole 4.5 minute budget inside CSP and reported a size
 * histogram for one course while looking like it described both. Interleaving
 * means a run that stops early stops with a sample of everything it was
 * pointed at.
 */
function decksInterleaved_() {
  var byCourse = {}, order = [];
  decksInScope_().forEach(function (d) {
    if (!byCourse[d[0]]) { byCourse[d[0]] = []; order.push(d[0]); }
    byCourse[d[0]].push(d);
  });
  var out = [], i = 0, more = true;
  while (more) {
    more = false;
    for (var c = 0; c < order.length; c++) {
      var list = byCourse[order[c]];
      if (i < list.length) { out.push(list[i]); more = true; }
    }
    i++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// preview
// ---------------------------------------------------------------------------

/**
 * Opens decks and reports what is in them. Writes NOTHING.
 *
 * This is the step that replaces guessing, and it has already earned its
 * keep once: the arithmetic rule this script shipped with looked reasonable
 * and was breaking the size hierarchy of 29% of the text. Nothing short of
 * reading the real sizes would have shown that.
 */
function preview() {
  if (!DECKS.length) {
    throw new Error('The deck table is empty. Regenerate it with:\n' +
      '  node scripts/build-slide-type-bump-gs.js\n' +
      'and paste this file in again.');
  }
  var began = new Date().getTime();
  var scope = decksInterleaved_();
  Logger.log('preview: ' + scope.length + ' deck(s) in scope, generated ' + DECKS_GENERATED_AT);
  Logger.log('NOTHING WILL BE WRITTEN BY THIS FUNCTION.');

  var hist = {}, inRange = 0, total = 0, failed = 0;
  var openedBy = {}, scopeBy = {};
  scope.forEach(function (d) { scopeBy[d[0]] = (scopeBy[d[0]] || 0) + 1; });

  for (var i = 0; i < scope.length; i++) {
    if (new Date().getTime() - began > TIME_BUDGET_MS) {
      Logger.log('time budget reached. The sample below is partial; see the');
      Logger.log('per-course coverage. Narrow COURSES and run again for the rest.');
      break;
    }
    try {
      var pres = SlidesApp.openById(scope[i][2]);
      var slides = pres.getSlides();
      for (var s = 0; s < slides.length; s++) {
        var ranges = textRangesOnSlide_(slides[s]);
        for (var j = 0; j < ranges.length; j++) {
          if (!ranges[j].text) continue;
          var runs = ranges[j].text.getRuns();
          for (var k = 0; k < runs.length; k++) {
            var size;
            try { size = runs[k].getTextStyle().getFontSize(); } catch (e) { continue; }
            if (size === null || size === undefined) continue;
            total++;
            hist[sizeKey_(size)] = (hist[sizeKey_(size)] || 0) + 1;
            if (size >= LADDER_FLOOR && size < LADDER_CEILING) inRange++;
          }
        }
      }
      pres.saveAndClose();
      openedBy[scope[i][0]] = (openedBy[scope[i][0]] || 0) + 1;
    } catch (e) {
      failed++;
      Logger.log('could not open ' + scope[i][0] + ' ' + scope[i][1] + ': ' + e);
    }
  }

  var opened = 0;
  Logger.log('');
  Logger.log('per-course coverage:');
  Object.keys(scopeBy).sort().forEach(function (c) {
    var n = openedBy[c] || 0;
    opened += n;
    Logger.log('  ' + c + ': opened ' + n + ' of ' + scopeBy[c]
      + (n === 0 ? '   <-- NOTHING SEEN, this course is not described below' : ''));
  });
  Logger.log('  ' + failed + ' failed to open');

  var sizes = Object.keys(hist).map(Number).sort(function (a, b) { return a - b; });
  Logger.log('');
  Logger.log('text runs seen: ' + total);
  Logger.log('runs in the ' + LADDER_FLOOR + ' to ' + LADDER_CEILING + 'pt range: ' + inRange
    + (total ? '  (' + Math.round(inRange * 100 / total) + '%)' : ''));
  Logger.log('');
  Logger.log('size histogram (pt: runs, per deck), smallest first:');
  sizes.forEach(function (sz) {
    var n = hist[sizeKey_(sz)];
    var to = bumpedSize_(sz);
    var mark = to !== null ? '  -> ' + to : (unknownSize_(sz) ? '  <-- NO LADDER ENTRY' : '');
    Logger.log('  ' + sz + ': ' + n + '   ' + (opened ? (n / opened).toFixed(1) : '?') + '/deck' + mark);
  });

  var missing = sizes.filter(unknownSize_);
  if (missing.length) {
    Logger.log('');
    Logger.log(missing.length + ' size(s) in range have no ladder entry: ' + missing.join(', '));
    Logger.log('start() will SKIP every deck containing one of those.');
  }

  Logger.log('');
  Logger.log('proposed ladder for what was seen, paste over SIZE_LADDER:');
  Logger.log('var SIZE_LADDER = {');
  proposeLadder_(sizes).forEach(function (pair) {
    Logger.log("  '" + pair[0] + "': " + pair[1] + ',');
  });
  Logger.log('};');
  Logger.log('');
  Logger.log('This is a read of the decks, not a promise about how they look.');
  Logger.log('A Slides text box does not shrink text to fit, so the only way to');
  Logger.log('know a bump is safe is to run start() with DECK_LIMIT small and');
  Logger.log('open the result.');
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

function start() {
  if (!DECKS.length) {
    throw new Error('The deck table is empty. Regenerate it with:\n' +
      '  node scripts/build-slide-type-bump-gs.js');
  }
  var began = new Date().getTime();
  var sh = sheet_();
  var scope = decksInterleaved_();
  var done = alreadyDone_(sh);

  var todo = scope.filter(function (d) { return !done[d[2]]; });

  // The work list first, always. A log that says "changed 294" with no work
  // list above it is not checkable, which the CSP conversion learned the hard
  // way.
  Logger.log('work list: ' + todo.length + ' deck(s) to bump, '
    + Object.keys(done).length + ' already done, ' + scope.length + ' in scope');
  if (DRY_RUN) Logger.log('DRY_RUN is on. Nothing will be written.');
  if (DECK_LIMIT) Logger.log('DECK_LIMIT is ' + DECK_LIMIT
    + '. Set it to 0 once you have opened the first few and they look right.');

  if (!todo.length) {
    removeTriggers_();
    Logger.log('nothing left to do.');
    return;
  }

  var bumped = 0, failed = 0, skipped = 0, runsTotal = 0;
  for (var i = 0; i < todo.length; i++) {
    if (DECK_LIMIT && bumped >= DECK_LIMIT) {
      Logger.log('DECK_LIMIT reached after ' + bumped + ' deck(s). '
        + (todo.length - i) + ' left. Open them, then re-run.');
      removeTriggers_();
      return;
    }
    // Checked between decks and never inside one: a half-bumped deck is worse
    // than a slow run.
    if (new Date().getTime() - began > TIME_BUDGET_MS) {
      scheduleContinue_();
      Logger.log('time budget reached after ' + bumped + ' deck(s). '
        + 'A continuation trigger will pick up the remaining ' + (todo.length - i) + '.');
      return;
    }

    var d = todo[i];      // [course, key, deckId]
    try {
      if (!FORCE && undoFileFor_(d[2])) {
        // Already bumped in an earlier run whose sheet row is gone. Bumping
        // again would compound: a 12 became 14, and would now become 15.5.
        sh.appendRow([d[0], d[1], d[2], '', 0, 'SKIPPED: undo file already exists']);
        skipped++;
        continue;
      }
      var pres = SlidesApp.openById(d[2]);
      var res = planForDeck_(pres);
      var slideCount = pres.getSlides().length;

      if (res.unknown.length && !ALLOW_UNKNOWN) {
        // A deck the ladder does not describe. Bumping only the sizes it does
        // recognise would break their relationship with the ones it does not,
        // which is exactly the failure the ladder replaced.
        pres.saveAndClose();
        sh.appendRow([d[0], d[1], d[2], slideCount, 0,
          'SKIPPED: no ladder entry for ' + res.unknown.join(', ') + 'pt']);
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        pres.saveAndClose();
        Logger.log('would change ' + res.plan.length + ' run(s) in ' + d[0] + ' ' + d[1]);
        bumped++;
        continue;
      }
      if (!res.plan.length) {
        pres.saveAndClose();
        sh.appendRow([d[0], d[1], d[2], slideCount, 0, 'OK']);
        bumped++;
        continue;
      }

      writeUndo_(d[2], d[0], d[1], res.plan);       // before, not after
      var changed = applyPlan_(pres, res.plan);
      pres.saveAndClose();

      sh.appendRow([d[0], d[1], d[2], slideCount, changed, 'OK']);
      runsTotal += changed;
      bumped++;
    } catch (e) {
      // Recorded rather than thrown: one bad deck must not abandon the rest.
      sh.appendRow([d[0], d[1], d[2], '', 0, 'FAILED: ' + e]);
      failed++;
    }
  }

  removeTriggers_();
  Logger.log('run complete. bumped ' + bumped + ', skipped ' + skipped
    + ', failed ' + failed + ', ' + runsTotal + ' run(s) changed.');
  if (skipped) Logger.log('Skipped decks are listed in the sheet with the reason.');
  Logger.log('Open two or three of them before running the rest.');
}

// ---------------------------------------------------------------------------
// revert
// ---------------------------------------------------------------------------

/**
 * Put every recorded change back, using the undo files rather than arithmetic.
 *
 * Arithmetic would not be safe even with a strictly increasing ladder: a deck
 * bumped under one ladder and then read under a newer one would be unmapped
 * with the wrong table. The undo file carries the ladder it was written under
 * and the old size of every run it touched, so it does not need to infer
 * anything.
 */
function revert() {
  var began = new Date().getTime();
  var files = undoFolder_().getFiles();
  var restored = 0, failed = 0, runs = 0;

  while (files.hasNext()) {
    if (new Date().getTime() - began > TIME_BUDGET_MS) {
      Logger.log('time budget reached after ' + restored + ' deck(s). Run revert() again.');
      return;
    }
    var f = files.next();
    try {
      var rec = JSON.parse(f.getBlob().getDataAsString());
      var pres = SlidesApp.openById(rec.deckId);
      var back = rec.changes.map(function (c) {
        return [c[0], c[1], c[2], c[3], c[5], c[4]];   // new -> old
      });
      runs += applyPlan_(pres, back);
      pres.saveAndClose();
      f.setTrashed(true);      // so start() will consider the deck again
      restored++;
    } catch (e) {
      failed++;
      Logger.log('could not revert ' + f.getName() + ': ' + e);
    }
  }
  Logger.log('reverted ' + restored + ' deck(s), ' + runs + ' run(s), ' + failed + ' failed.');
  Logger.log('Undo files for reverted decks are trashed, so start() will see them as');
  Logger.log('un-bumped again. The sheet still holds their old OK rows: clear those');
  Logger.log('rows too if you want start() to redo them.');
}

// ---------------------------------------------------------------------------
// Continuation and housekeeping
// ---------------------------------------------------------------------------

function scheduleContinue_() {
  removeTriggers_();
  ScriptApp.newTrigger('start').timeBased().after(60 * 1000).create();
}

function removeTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'start') ScriptApp.deleteTrigger(t);
  });
}

/** What the sheet currently holds. Not a substitute for opening a deck. */
function report() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) { Logger.log('sheet is empty.'); return; }

  var rows = sh.getRange(2, 1, last - 1, HEADER.length).getValues();
  var ok = rows.filter(function (r) { return String(r[5]).trim() === 'OK'; });
  var runs = 0;
  ok.forEach(function (r) { runs += Number(r[4]) || 0; });
  var skipped = rows.filter(function (r) { return String(r[5]).indexOf('SKIPPED') === 0; });

  Logger.log('rows        : ' + rows.length);
  Logger.log('OK          : ' + ok.length + ' of ' + decksInScope_().length + ' in scope');
  Logger.log('skipped     : ' + skipped.length);
  Logger.log('failed      : ' + (rows.length - ok.length - skipped.length));
  Logger.log('runs changed: ' + runs);
  if (skipped.length) {
    Logger.log('');
    Logger.log('skipped, with reasons:');
    skipped.slice(0, 20).forEach(function (r) {
      Logger.log('  ' + r[0] + ' ' + r[1] + ': ' + r[5]);
    });
    if (skipped.length > 20) Logger.log('  ... and ' + (skipped.length - 20) + ' more');
  }
  Logger.log('');
  Logger.log('This is the script reporting on itself. It is not evidence.');
  Logger.log('Open a deck. A box whose text now overflows still reads as OK here.');
}

function reset() {
  removeTriggers_();
  Logger.log('continuation triggers removed. Decks, the sheet and the undo files');
  Logger.log('are all untouched. start() will still skip what is already OK.');
}
