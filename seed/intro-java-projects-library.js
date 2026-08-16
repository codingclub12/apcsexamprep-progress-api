'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE GREENFOOT PROJECT LIBRARY, RESCUED FROM A LIVE PAGE.
//
//  ── WHERE THIS CAME FROM AND WHY IT IS HERE ─────────────────────────────────
//  These eleven projects lived only in the Body HTML of the live Shopify page
//  `greenfoot-basics-beginner-greenfoot-projects-and-tutorials`, created
//  2025-09-15 and last updated 2026-04-02. The course hub is taking over that
//  handle to inherit its search authority, and a Matrixify import REPLACES a
//  body rather than merging into it.
//
//  Nine YouTube tutorials and eight Google Drive starter-file folders existed
//  in exactly one place: that page body. Replacing it without first copying
//  them here would have destroyed a year of work in a single import that
//  Matrixify would have reported as a success. So they are copied out first,
//  and the hub renders them from this file.
//
//  ── HOW THIS MAPS ONTO THE COURSE ───────────────────────────────────────────
//  Closely, which is what makes the merge worth doing rather than a compromise.
//  `unit` below is the unit whose material each project exercises, and it is
//  used to file the project under the right part of the hub. A project is a
//  BUILD, not a graded item: it never becomes a manifest row, for the same
//  reason the unit projects do not. A Greenfoot scenario runs on the desktop
//  and cannot report itself.
//
//  ── LINK ROT ────────────────────────────────────────────────────────────────
//  The Drive folders and YouTube videos are external and can rot without
//  anything here noticing. smoke/intro-java-content.js checks their SHAPE, not
//  that they resolve; a real check needs the network and belongs in the
//  artifact verifier.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// `files` is a Google Drive folder or file; `videos` is one or more YouTube
// tutorials. Either may be empty: several projects shipped video-only, and one
// shipped starter-files-only. `null` is not used, so callers never branch.
const PROJECTS = [
  {
    n: 1,
    title: 'The Hungry Bee',
    blurb: 'Movement, collision detection, and the simplest possible game loop.',
    unit: 'unit-1',
    files: 'https://drive.google.com/drive/folders/1mWnYNUOYOGmwK8pwzka5zyvFJuLJeDAO?usp=sharing',
    videos: [{ label: 'Tutorial', url: 'https://youtu.be/M3KHUqeFjyY' }],
  },
  {
    n: 2,
    title: 'Catch The Apple',
    blurb: 'Keyboard control, a score that goes up, and spawning objects at random.',
    unit: 'unit-2',
    files: 'https://drive.google.com/drive/folders/1d1UbYJP3e-Gtud9p6z45HEpeMQ1J46mb?usp=sharing',
    videos: [{ label: 'Tutorial', url: 'https://youtu.be/dUcS70rFH98' }],
  },
  {
    n: 3,
    title: 'Piano Project',
    blurb: 'Sound, mapping many keys to many actions, and building an instrument you can play.',
    unit: 'unit-2',
    files: 'https://drive.google.com/drive/folders/1uKZYSCFxWMsS9nIowAMBC8EaVlde7gDJ?usp=sharing',
    videos: [{ label: 'Tutorial', url: 'https://youtu.be/8BhcMXIUE5Y' }],
  },
  {
    n: 4,
    title: 'Movement Essentials',
    blurb: 'Four movement patterns in one sitting: sliding, move and rotate, steering, and gravity with a jump.',
    unit: 'unit-3',
    files: '',
    videos: [{ label: 'Tutorial', url: 'https://youtu.be/PSRUVhYON6Q' }],
  },
  {
    n: 5,
    title: 'Fire Projectile',
    blurb: 'Shooting on the spacebar, and point-click-shoot aiming.',
    unit: 'unit-3',
    files: 'https://drive.google.com/drive/folders/1jp62iIQfB4r1gU47BagEd4xdZH1nr5t_?usp=sharing',
    videos: [{ label: 'Tutorial', url: 'https://youtu.be/7UV7RBYJuug' }],
  },
  {
    n: 6,
    title: 'Changing Worlds',
    blurb: 'Moving between worlds on a collision while carrying the player data across.',
    unit: 'unit-3',
    files: 'https://drive.google.com/drive/folders/1ylu3W0dZhLmpq89ggPx3d4O99IVcX_R4?usp=sharing',
    videos: [{ label: 'Tutorial', url: 'https://www.youtube.com/watch?v=ZOlLNL4vCL0' }],
  },
  {
    n: 7,
    title: 'Endless Runner and Open World',
    blurb: 'Scrolling backgrounds, generating ground as you go, and an open world to explore.',
    unit: 'unit-4',
    files: 'https://drive.google.com/drive/folders/1HaHS8udEj08UNLJc9gEd-77Q423-PmwB?usp=sharing',
    videos: [{ label: 'Tutorial', url: 'https://youtu.be/kdBr38-kmuc' }],
  },
  {
    n: 8,
    title: 'Tower Defense',
    blurb: 'Enemies that follow a path, towers you place, and targeting that picks what to shoot.',
    unit: 'unit-4',
    files: '',
    videos: [
      { label: 'Part 1', url: 'https://youtu.be/QQor1191x_k' },
      { label: 'Part 2', url: 'https://youtu.be/aniROv5zvhw' },
    ],
  },
  {
    n: 9,
    title: 'Interactive Calendar',
    blurb: 'Switch statements, drawing images, and buttons that respond.',
    unit: 'unit-4',
    files: '',
    videos: [
      { label: 'Part 1', url: 'https://youtu.be/n2K3RU1L-lE' },
      { label: 'Part 2', url: 'https://youtu.be/dWXfQO2t2OU' },
    ],
  },
  {
    // The live page numbered this 10 and the next one 10 as well. Renumbered
    // rather than copied, since two projects with the same number is the kind of
    // thing a student reads as a broken page.
    n: 10,
    title: 'Array Racing',
    blurb: 'One array holding many cars, and what that buys you over ten separate variables.',
    unit: 'unit-5',
    files: '',
    videos: [],
    comingSoon: true,
  },
  {
    n: 11,
    title: 'Movie Theater',
    blurb: 'A 2D array of seats, booked and released. The clearest grid there is.',
    unit: 'unit-6',
    files: 'https://drive.google.com/file/d/1TzLZ5drYIMxU_KcVIuYgiEQUEcNDVnU6/view?usp=sharing',
    videos: [],
  },
];

/** Projects that exercise a given unit, in project order. */
function projectsForUnit(unit) {
  return PROJECTS.filter((p) => p.unit === unit);
}

/** Everything a student can actually open today. */
function availableProjects() {
  return PROJECTS.filter((p) => !p.comingSoon);
}

module.exports = { PROJECTS, projectsForUnit, availableProjects };
