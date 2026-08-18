import greenfoot.*;

/**
 * Unit 6 project: the maze. A new scenario, and the only one in the course.
 *
 * This is the one place the course starts fresh instead of continuing the bee,
 * and that is deliberate. A tile map is not a feature you bolt onto a game that
 * already exists; it is a different way of describing a world, and bolting it
 * onto the bee would hide that.
 *
 * Everything this asks for is from Unit 6:
 *   declaring a 2D array             6.1
 *   row-major indexing               6.2
 *   nested for loops                 6.3
 *   grid to world coordinates        6.4
 *   rendering a tile map             6.5
 *
 * By the end you can design a level by editing numbers. That is the payoff for
 * the entire unit, and it is how real tile-based games are actually built.
 *
 * @author (your name)
 */
public class MazeWorld extends World
{
    // The legend goes directly above the map and stays there. Come back in a
    // week and `2` means nothing without it. Lesson 6.5 is blunt about this.
    //
    // 0 floor, 1 wall, 2 coin, 3 player start
    private int[][] map = {
        {1, 1, 1, 1, 1, 1, 1, 1},
        {1, 3, 0, 0, 2, 0, 0, 1},
        {1, 0, 1, 1, 1, 1, 0, 1},
        {1, 0, 0, 2, 0, 0, 0, 1},
        {1, 1, 1, 1, 1, 1, 1, 1}
    };

    /**
     * The world is sized FROM the map, so changing the map changes the window.
     *
     * map[0].length is the number of columns, which is the WIDTH.
     * map.length is the number of rows, which is the HEIGHT.
     * Getting these the wrong way round gives a world rotated a quarter turn,
     * which is lesson 6.4's whole warning.
     */
    public MazeWorld()
    {
        super(map[0].length, map.length, 48);
        buildMap();
    }

    /**
     * Turns the numbers into actors. Called from the CONSTRUCTOR, never act().
     */
    public void buildMap()
    {
        // TO DO (6.3): two nested for loops, row on the outside, col on the
        // inside. The inner bound is map[row].length, not map.length.
        //
        // TO DO (6.5): read int code = map[row][col], then an if / else if
        // chain:
        //     1 -> addObject(new Wall(),   col, row)
        //     2 -> addObject(new Coin(),   col, row)
        //     3 -> addObject(new Player(), col, row)
        //
        // COL FIRST, THEN ROW. addObject wants x then y, and x comes from the
        // column. This is lesson 6.4 and it is the single most common bug in
        // this unit. A square test map hides it, which is why the map above is
        // 8 wide and 5 tall.
        //
        // Write NO branch for 0. Floor adds nothing. A 30 by 20 map would put
        // 600 actors in a world that needs about 80.
    }

    /**
     * How many coins are left anywhere in the grid.
     */
    public int coinsRemaining()
    {
        // TO DO (6.7): count every cell equal to 2, across the whole grid.
        //
        // The accumulator goes OUTSIDE both loops, because the question is
        // about the whole grid rather than about each row. If you put it inside
        // the outer loop you get a per-row count, which is a different and also
        // useful thing. 6.7's point is that where it goes is a decision about
        // the question, not a rule.
        return 0;
    }
}
