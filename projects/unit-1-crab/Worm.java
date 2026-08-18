import greenfoot.*;

/**
 * Unit 1 project: a worm.
 *
 * This class does nothing at all, and that is the point of it.
 *
 * Lesson 1.3 is about the difference between a class and an object. There is
 * ONE Worm class in the class diagram, and TWO worms in the world. Right-click
 * each one separately and notice that they answer differently when you ask
 * where they are. Same class, different objects.
 *
 * @author APCSExamPrep
 */
public class Worm extends Actor
{
    /**
     * Says where this particular worm is sitting.
     *
     * Call it on one worm, then on the other. Two answers, one class. That is
     * lesson 1.3 in one menu click.
     *
     * @return the distance across, in cells
     */
    public int whereAmI()
    {
        return getX();
    }
}
