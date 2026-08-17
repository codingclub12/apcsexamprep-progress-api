import greenfoot.*;

/**
 * Unit 1 project: the world the crab lives in.
 *
 * You are not asked to change this file in Unit 1. It is here so the scenario
 * opens with something in it, and so lesson 1.1 has a real World subclass to
 * point at when it says "your world class extends World".
 *
 * You will write a world of your own in Unit 3, and this file is roughly what
 * yours will look like by 3.7.
 *
 * @author APCSExamPrep
 */
public class CrabWorld extends World
{
    /**
     * A world 600 by 400 pixels, one pixel per cell.
     */
    public CrabWorld()
    {
        super(600, 400, 1);
        addObject(new Crab(), 300, 200);
    }
}
