import greenfoot.*;

/**
 * Unit 1 project: the crab.
 *
 * THERE ARE NO BLANKS IN THIS FILE UNTIL LESSON 1.6, ON PURPOSE.
 *
 * Unit 1 is about learning your way around Greenfoot: what a world is, what an
 * actor is, how to make one, how to call its methods from the right-click menu,
 * and how to read the documentation. Almost none of that is typing.
 *
 * Everything below act() already works. You are meant to CALL these from the
 * right-click menu in lessons 1.4 and 1.5, watch what happens, and read their
 * signatures. None of them is a new idea: every one is a method call with
 * arguments, which is lesson 1.4, and a return value, which is lesson 1.5.
 *
 * @author APCSExamPrep
 */
public class Crab extends Actor
{
    /**
     * act() is called by Greenfoot about sixty times a second while the
     * scenario is running. Whatever is in here happens every frame.
     *
     * Lesson 1.6 asks you to fill this in. It is the only typing in the unit.
     */
    public void act()
    {
        // Lesson 1.6 step 2: make the crab walk.
        //
        //     move(2);
        //
        // Lesson 1.6 step 4: make it patrol, turning at the edge.
        //
        //     if (isAtEdge())
        //     {
        //         turn(180);
        //     }
    }

    /**
     * Points the crab at a spot and takes one step toward it.
     *
     * Call this from the right-click menu in lesson 1.4 and type in two
     * numbers. This is the clearest thing in the scenario for seeing that
     * arguments are values YOU choose.
     *
     * @param x how far across, in cells
     * @param y how far down, in cells
     */
    public void stepToward(int x, int y)
    {
        turnTowards(x, y);
        move(4);
    }

    /**
     * Makes the crab a different size.
     *
     * Try 120 by 120, then 40 by 40. This is the first method here that takes
     * TWO arguments, and the order matters: width first, then height. Try
     * 200 by 30 and you get a very flat crab, which is the point.
     *
     * @param width how wide, in pixels
     * @param height how tall, in pixels
     */
    public void resize(int width, int height)
    {
        GreenfootImage picture = new GreenfootImage("crab.png");
        picture.scale(width, height);
        setImage(picture);
    }

    /**
     * Fades the crab out, or brings it back.
     *
     * @param howSolid 255 is fully solid, 0 is invisible
     */
    public void fade(int howSolid)
    {
        getImage().setTransparency(howSolid);
    }

    /**
     * Says how far the crab is from the left wall.
     *
     * Call this in lesson 1.5. It takes NOTHING and HANDS BACK a number, which
     * is the other half of a method signature. Greenfoot will show you the
     * answer in a little box, and that box is the return value.
     *
     * @return the distance in cells
     */
    public int distanceFromLeftWall()
    {
        return getX();
    }

    /**
     * True when the crab is touching the edge of the world.
     *
     * Another return value, this time true or false instead of a number.
     * Lesson 1.6 uses it, so try it from the menu first and watch the answer
     * change as you drag the crab around.
     *
     * @return whether the crab is at the edge
     */
    public boolean atTheEdge()
    {
        return isAtEdge();
    }
}
