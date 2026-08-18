import greenfoot.*;

/**
 * Unit 5 project: the bee gets levels, and the levels are data.
 *
 * Start from YOUR Unit 4 scenario. The bee already flies, eats and scores.
 * Nothing about the Bee class changes in this unit. The work is in the WORLD,
 * because placing things and deciding how hard a level is are both jobs the
 * world owns, which is the point lesson 4.7 ends on.
 *
 * Everything this asks for is from Unit 5:
 *   declaring an array               5.1
 *   index and length                 5.2
 *   traversing with for              5.3
 *   arrays that drive a game         5.6
 *
 * THE IDEA WORTH TAKING FROM THIS UNIT
 * Right now, adding a flower means writing a line of code. After this, adding a
 * flower means adding a number. That is the whole difference between a game you
 * edit and a game you design, and it is why 5.6 exists.
 *
 * @author (your name)
 */
public class BeeWorld extends World
{
    // TO DO (5.1): declare an int array called flowerX holding the x positions
    // you want flowers at. Six or so numbers between 20 and 580.
    //
    //     private int[] flowerX = {60, 140, 220, 300, 380, 460};
    //
    // Read it the way 5.6 says: the INDEX is which flower, the VALUE is where
    // it goes.

    // TO DO (5.6): declare a second array called flowersPerLevel, holding how
    // many flowers each level should place. Start with something like
    // {3, 4, 6, 8}. This is a SCHEDULE: index is the level, value is the
    // difficulty.

    // TO DO (3.8): declare a private int called level, starting at 0.

    public BeeWorld()
    {
        super(600, 400, 1);
        addObject(new Bee(), 300, 200);
        placeFlowers();
    }

    /**
     * Places this level's flowers by reading the arrays.
     */
    public void placeFlowers()
    {
        // TO DO (5.2 and 5.6): how many flowers does THIS level want? Read it
        // out of flowersPerLevel using level as the index.
        //
        // TO DO (5.3): loop from 0 up to that count and addObject a new Flower
        // at flowerX[i], with whatever y you like.
        //
        // WATCH THE TWO ARRAYS. flowersPerLevel is indexed by LEVEL. flowerX is
        // indexed by WHICH FLOWER. Using i on both is the mistake this project
        // is built to make you notice.
    }

    /**
     * Moves to the next level and rebuilds.
     */
    public void nextLevel()
    {
        // TO DO: add one to level.
        //
        // TO DO (5.6, and this is the interesting part): decide what happens
        // when level runs past the end of flowersPerLevel. The lesson says to
        // decide rather than to let it throw. Three reasonable answers:
        //   - stop the game, because the player finished it
        //   - stay on the last level forever
        //   - wrap back to 0
        // Pick one on purpose and write a comment saying which and why.
        //
        // TO DO: call placeFlowers() again.
    }
}
