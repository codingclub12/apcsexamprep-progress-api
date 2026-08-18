import greenfoot.*;

/**
 * Unit 4 project: the bee eats. This is the capstone.
 *
 * Start from YOUR Unit 3 file, not from a blank one. By now the bee already
 * flies, act() is already a list of names instead of a wall of ifs, and score
 * already exists as an instance variable. None of that is rewritten here.
 *
 * This is the assignment that used to be called "Greenfoot Basics #1" and used
 * to come first. It was never too hard; it was in the wrong place. Its four
 * tasks need instance variables (3.8), methods you write yourself (3.1 and
 * 3.2), if statements (2.4), keyboard input (2.7) and touching another actor
 * (4.4). The last of those is why it lives here, at the end of Unit 4, with
 * every prerequisite behind it rather than ahead of it.
 *
 * Everything new in this file is from Unit 4:
 *   isTouching and removeTouching   4.4
 *
 * One thing is not, and is used anyway: getWorld().showText(...) in
 * displayScore(). It appears in the lesson text in 6.7. It is one line, it
 * teaches nothing past lesson 1.4's "a method call can take arguments", and a
 * game that cannot show its own score is a worse thing to hand you than a
 * slightly early library call.
 *
 * @author (your name)
 */
public class Bee extends Actor
{
    // From Unit 3. Already yours, already working. Do not redeclare it.
    private int score = 0;

    /**
     * Still a list of names. Adding a feature to this game should mean adding
     * one line here and one method below, and nothing else.
     */
    public void act()
    {
        checkKeyPress();

        // TO DO: call checkCollisionWithFlower();
        // TO DO: call displayScore();
    }

    /**
     * Moves the bee while an arrow key is held. Written in Unit 2, given a name
     * in Unit 3, unchanged here.
     */
    public void checkKeyPress()
    {
        // Your Unit 3 code. Leave it alone.
    }

    /**
     * Eats a flower the bee is touching, and counts it.
     */
    public void checkCollisionWithFlower()
    {
        // TO DO (4.4): if the bee isTouching(Flower.class), then
        //   1. removeTouching(Flower.class) to eat it, and
        //   2. add one to score.
        //
        // The order does not matter here, but do BOTH. Removing without
        // counting gives a game that eats and never scores, which looks broken
        // and is the most common way this method goes wrong.
        //
        // Note the argument is Flower.class, not new Flower() and not
        // "Flower". You are naming the KIND of actor, not making one.
    }

    /**
     * Draws the score in the world.
     */
    public void displayScore()
    {
        // TO DO: getWorld().showText("Score: " + score, 70, 20);
        //
        // The two numbers are x and y in cells. Move them if the text lands
        // somewhere silly in your world.
    }
}
