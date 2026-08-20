'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHAT EACH GREENFOOT PROJECT ACTUALLY ASKS A STUDENT TO USE.
//
//  ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
//  seed/intro-java-projects-library.js carries the eleven projects as they were
//  rescued from the live page: title, blurb, unit, Drive folder, YouTube links.
//  What it does not carry is the only thing a student actually needs before
//  starting one, which is WHICH METHODS THE PROJECT WANTS and whether the
//  course has taught them yet.
//
//  ── HOW THESE LISTS WERE PRODUCED, AND WHY THAT MATTERS ─────────────────────
//  On 2026-08-18 the eight shared Drive folders were opened and read. Every
//  entry below carries a `source`, because the difference between "read the
//  code" and "read the one-line blurb" is the difference between a fact and a
//  guess, and this file is about to be rendered onto a public page.
//
//    'code'   the project's own .java files were decoded and scanned
//    'doc'    the project's assignment document was read
//    'blurb'  neither exists in Drive; taken from Tanner's own one-line
//             description on the library page. Coarser, and still his words.
//
//  ── THE FINDING THAT CAME OUT OF DOING THIS ─────────────────────────────────
//  Five of the eight audited projects were filed in an earlier unit than their
//  own contents allow, and NONE was filed too late. Three of those five are
//  blocked by exactly one lesson, 4.4, `isTouching`. Collision detection is
//  what makes a game a game, and it lands three quarters of the way through the
//  course. That is the real reason a Unit 1 or Unit 2 game feels thin, and it
//  is worth knowing before anyone reorders arrays again.
//
//  `needs` is the LAST lesson a student must have finished. It is not the unit
//  the project is filed under; see the audit note above for why those differ.
//
//  `untaught` is the honest part. These are calls the project needs that the
//  course never teaches anywhere. Naming them on the page is better than a
//  student hitting them alone at 11pm.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const METHODS = {
  1: {
    slug: 'the-hungry-bee',
    needs: '4.4',
    source: 'doc',
    uses: [
      { call: 'Greenfoot.isKeyDown("up")', at: '2.7', why: 'true while a key is held' },
      { call: 'setLocation(getX(), getY() - 5)', at: '1.4', why: 'up is a SMALLER y' },
      { call: 'isTouching(Flower.class)', at: '4.4', why: 'am I overlapping a flower' },
      { call: 'removeTouching(Flower.class)', at: '4.4', why: 'eat it' },
      { call: 'private int score', at: '3.8', why: 'a number that survives between frames' },
      { call: 'public void checkKeyPress()', at: '3.2', why: 'act() calls three named methods' },
      { call: 'getWorld().showText("Score: " + score, 50, 50)', at: '6.7', why: 'one line, used early on purpose' },
    ],
    untaught: [],
  },
  2: {
    slug: 'catch-the-apple',
    needs: '4.4',
    source: 'doc',
    uses: [
      { call: 'Greenfoot.isKeyDown("left")', at: '2.7', why: 'move the basket' },
      { call: 'setLocation(getX(), getY() + 2)', at: '1.4', why: 'make things fall' },
      { call: 'getWorld().removeObject(this)', at: '3.7', why: 'an actor deletes itself' },
      { call: 'isTouching(Apple.class)', at: '4.4', why: 'caught it' },
      { call: 'removeTouching(Bomb.class)', at: '4.4', why: 'and the bad ones' },
      { call: 'Greenfoot.getRandomNumber(600)', at: '2.6', why: 'spawn somewhere unpredictable' },
      { call: 'private int score, lives, time', at: '3.8', why: 'three things to remember at once' },
      { call: 'showText("Score: " + score, 100, 20)', at: '6.7', why: 'show all three' },
    ],
    untaught: [],
  },
  3: {
    slug: 'piano',
    needs: '5.3',
    source: 'code',
    uses: [
      { call: 'private String[] whiteKeys = { "A", "S", ... }', at: '5.1', why: 'four arrays drive the whole instrument' },
      { call: 'whiteKeys.length', at: '5.2', why: 'how many keys to build' },
      { call: 'for (int i = 0; i < whiteKeys.length; i++)', at: '5.3', why: 'build them all in one loop' },
      { call: 'whiteKeys[i]', at: '5.2', why: 'the index is which key, the value is which letter' },
      { call: 'new Key(letter, sound, up, down)', at: '3.9', why: 'an actor constructor with four arguments' },
      { call: 'addObject(key, 54 + (i * 63), 140)', at: '3.7', why: 'the counter spaces them out' },
      { call: 'super(800, 340, 1)', at: '3.5', why: 'a wide, short world' },
    ],
    untaught: [
      { call: 'blackKeys[i].equals("")', why: 'comparing two Strings. == does not work on them, and the course never covers this.' },
      { call: 'getBackground().drawString(...)', why: 'drawing text onto the world image rather than showText.' },
      { call: 'setColor(Color.WHITE)', why: 'needs import java.awt.Color at the top of the file.' },
    ],
  },
  4: {
    slug: 'movement-essentials',
    needs: '3.8',
    source: 'blurb',
    uses: [
      { call: 'move(int)', at: '1.4', why: 'sliding' },
      { call: 'turn(int)', at: '1.4', why: 'move and rotate' },
      { call: 'setLocation(getX(), getY() + speed)', at: '1.4', why: 'gravity is just a y that keeps growing' },
      { call: 'private int speed', at: '3.8', why: 'velocity has to be remembered between frames' },
      { call: 'if (Greenfoot.isKeyDown("space"))', at: '2.7', why: 'jump' },
    ],
    untaught: [
      { call: 'setRotation(int)', why: 'pointing an actor without moving it.' },
      { call: 'turnTowards(int x, int y)', why: 'steering toward a point.' },
    ],
  },
  5: {
    slug: 'fire-projectile',
    needs: '3.9',
    source: 'code',
    uses: [
      { call: 'if (Greenfoot.isKeyDown("space"))', at: '2.7', why: 'fire' },
      { call: 'getWorld().addObject(new Projectile(), getX(), getY())', at: '3.7', why: 'make a bullet where the player is' },
      { call: 'public Projectile()', at: '3.9', why: 'the bullet builds its own image in its constructor' },
      { call: 'super(1000, 800, 1)', at: '3.5', why: 'a big world' },
      { call: 'private void prepare()', at: '3.7', why: 'the world places the player' },
      { call: 'if (isAtEdge())\n{\n    getWorld().removeObject(this);\n}', at: '1.6', why: 'bullets that never die will fill the world' },
    ],
    untaught: [
      { call: 'new GreenfootImage(15, 5) and fillRect(...)', why: 'drawing an image in code instead of loading a file. It is given to you in the starter.' },
      { call: 'Greenfoot.getMouseInfo()', why: 'point-click-shoot aiming needs the mouse, which the course does not cover.' },
      { call: 'turnTowards(int x, int y)', why: 'aiming the shot at where you clicked.' },
    ],
  },
  6: {
    slug: 'changing-worlds',
    needs: '4.4',
    source: 'doc',
    uses: [
      { call: 'if (isTouching(Target.class))', at: '4.4', why: 'the player reaches the door' },
      { call: 'removeTouching(Target.class)', at: '4.4', why: 'stop it firing twice' },
      { call: 'public NextWorld(int score)', at: '3.6', why: 'carry the score across, optional but the interesting part' },
      { call: 'this.score = score', at: '3.8', why: 'store what was handed in' },
      { call: 'Greenfoot.playSound("whoosh.wav")', at: '2.6', why: 'a transition that feels like one' },
    ],
    untaught: [
      { call: 'Greenfoot.setWorld(new NextWorld())', why: 'switching worlds. This is the whole project and the course never teaches it.' },
    ],
  },
  7: {
    slug: 'endless-runner',
    needs: '6.1',
    source: 'code',
    uses: [
      { call: 'int[][] ground', at: '6.1', why: 'the level is a grid' },
      { call: 'for (int row = 0; row < map.length; row++)', at: '6.3', why: 'walk the grid' },
      { call: 'addObject(new Ground(), col, row)', at: '3.7', why: 'column first, then row' },
      { call: 'private void generate()', at: '3.1', why: 'ground made as you go' },
      { call: 'super(width, height, 1)', at: '3.5', why: 'the world' },
    ],
    untaught: [
      { call: 'setBackground(GreenfootImage)', why: 'scrolling backgrounds.' },
      { call: 'getBackground()', why: 'reading the current background to shift it.' },
    ],
  },
  8: {
    slug: 'tower-defense',
    needs: '4.5',
    source: 'blurb',
    uses: [
      { call: 'getObjects(Enemy.class)', at: '4.5', why: 'every enemy currently alive' },
      { call: 'for (Enemy e : enemies)', at: '4.6', why: 'check them all' },
      { call: 'private int health', at: '3.8', why: 'towers and enemies both remember things' },
      { call: 'removeObject(e)', at: '3.7', why: 'kill one' },
    ],
    untaught: [
      { call: 'getObjectsInRange(int radius, Class)', why: 'a tower picking a target it can actually reach.' },
      { call: 'Greenfoot.mouseClicked(null)', why: 'placing a tower where you click.' },
      { call: 'turnTowards(int x, int y)', why: 'a turret facing what it shoots.' },
    ],
  },
  9: {
    slug: 'interactive-calendar',
    needs: '3.9',
    source: 'blurb',
    uses: [
      { call: 'private int month', at: '3.8', why: 'which month is showing' },
      { call: 'public Button(String label)', at: '3.9', why: 'buttons built from a constructor' },
      { call: 'addObject(...)', at: '3.7', why: 'lay the buttons out' },
    ],
    untaught: [
      { call: 'switch (month) { case 1: ... }', why: 'the course teaches else if chains in 2.5 and never covers switch. An else if chain does the same job.' },
      { call: 'Greenfoot.mouseClicked(this)', why: 'buttons that respond to a click.' },
      { call: 'getImage().drawString(...)', why: 'drawing the dates onto the image.' },
    ],
  },
  11: {
    slug: 'movie-theater',
    needs: '6.3',
    source: 'code',
    uses: [
      { call: 'int[][] seats', at: '6.1', why: 'a grid of seats is the clearest 2D array there is' },
      { call: 'seats[row][col]', at: '6.2', why: 'row first, always' },
      { call: 'nested for loops', at: '6.3', why: 'draw the whole theater' },
      { call: 'addObject(new Ticket(), col, row)', at: '6.4', why: 'column becomes x, row becomes y' },
      { call: 'public Ticket(int row, int col)', at: '3.9', why: 'each seat knows where it is' },
    ],
    untaught: [
      { call: 'setImage(String)', why: 'swapping a seat between free and booked.' },
    ],
  },
};

module.exports = { METHODS };
