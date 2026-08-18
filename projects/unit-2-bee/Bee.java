import greenfoot.*;

/**
 * Unit 2 project: make the bee fly, and make it eat.
 *
 * This is the first file you fill in, and it is also the file you KEEP. The bee
 * gets tidied up in Unit 3, learns to keep score in Unit 3, and becomes the
 * Hungry Bee capstone in Unit 4. What you write here is the start of the
 * finished game, not a throwaway exercise.
 *
 * Everything this asks for is from Unit 2:
 *   a local variable                2.1
 *   arithmetic                      2.2
 *   comparison and &&               2.3
 *   if statements                   2.4
 *   an else if chain                2.5
 *   Greenfoot.getRandomNumber       2.6
 *   Greenfoot.isKeyDown             2.7
 *
 * ONE THING IS EARLY, AND YOU SHOULD KNOW THAT IT IS.
 * `isTouching` and `removeTouching` are taught properly in 4.4. They appear
 * here because a game where nothing can touch anything is not a game, it is a
 * screensaver. They are ordinary method calls with one argument, exactly like
 * `move(2)` from lesson 1.4, so there is no new idea in them. Unit 4 explains
 * what is really going on.
 *
 * @author (your name)
 */
public class Bee extends Actor
{
    /**
     * Runs every frame. For now the whole game lives in here, which is fine.
     * Unit 3 is about what to do when that stops being fine.
     */
    public void act()
    {
        checkKeyPress();
        checkFlower();
    }

    /**
     * Moves the bee while an arrow key is held.
     */
    public void checkKeyPress()
    {
        // TO DO (2.1): declare a local int called step and set it to 5.
        // This is how far the bee moves per frame.

        // TO DO (2.4 and 2.7): four SEPARATE if statements, one per direction.
        //
        //     if (Greenfoot.isKeyDown("up"))
        //     {
        //         setLocation(getX(), getY() - step);
        //     }
        //
        // "up" SUBTRACTS from y, because y grows downward. That rule from 1.4
        // finally matters here.
        //
        // Use four separate ifs, NOT an else if chain. Lesson 2.5 explains why:
        // a chain stops at the first true condition, so holding up and left
        // together would only ever move you one way. Try it as a chain once on
        // purpose, feel the diagonal fail, then change it back.

        // TO DO (2.3, optional): add a guard so the bee cannot leave the world.
        //
        //     if (Greenfoot.isKeyDown("right") && getX() < getWorld().getWidth() - 20)
        //
        // Greenfoot already clamps actors inside the world, so this changes
        // nothing you can see. Write it anyway: it is the clearest use of &&
        // you will meet, and Unit 4 needs you to recognise it.
    }

    /**
     * Eats a flower the bee is touching.
     */
    public void checkFlower()
    {
        // TO DO: if the bee isTouching(Flower.class), then
        //   1. removeTouching(Flower.class) to eat it, and
        //   2. Greenfoot.playSound("eat.wav") so it feels like something.
        //
        // Note the argument is Flower.class, not new Flower() and not
        // "Flower". You are naming the KIND of thing, not making one.
    }

    /**
     * Points the bee wherever it is heading. Pure decoration, and worth having.
     *
     * Call it from checkKeyPress() if you want it, or leave it alone.
     *
     * @param degrees 0 is right, 90 is down, 180 is left, 270 is up
     */
    public void face(int degrees)
    {
        setRotation(degrees);
    }

    /**
     * WHY THIS METHOD DOES NOT WORK, AND WHY THAT IS THE POINT.
     *
     * Fill it in exactly as written. Compile. Eat three flowers in a row and
     * watch the number on screen.
     *
     * It says 1 every time.
     *
     * The variable is declared INSIDE the method, so it is born when the method
     * starts and dies when the method ends. Every frame it comes back as 0,
     * gets one added, prints 1, and vanishes. Nothing here is broken and you
     * have not made a mistake: a local variable cannot remember anything
     * between frames, and remembering is exactly what a score has to do.
     *
     * Lesson 3.8 is the fix, and it is one line in a different place. Leave
     * this method here, wrong, until you get there. Seeing it fail once is
     * worth more than being told.
     */
    public void brokenScore()
    {
        // TO DO (2.1 and 2.2): declare a local int called score set to 0,
        // then add 1 to it, then show it:
        //
        //     getWorld().showText("Score: " + score, 60, 20);
    }
}
