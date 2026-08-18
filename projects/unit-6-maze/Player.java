import greenfoot.*;

/**
 * Unit 6 project: the thing that walks the maze.
 *
 * Everything this asks for is from Unit 6:
 *   bounds and neighbors             6.6
 *
 * WHY THIS IS NOT isTouching
 * In Unit 4 you handled collisions by asking "am I overlapping a wall". In a
 * tile map you ask a better question BEFORE you move: "is the cell I am about
 * to step into a wall". Checking the destination instead of detecting the
 * overlap is what 6.6 means by grid collision, and it is why the player never
 * ends up half inside a wall.
 *
 * @author (your name)
 */
public class Player extends Actor
{
    public void act()
    {
        // TO DO (2.7): if the up arrow is down, tryMove(0, -1).
        // Up is row MINUS one. Rows count downward, which never stops feeling
        // wrong and is worth saying out loud once.
        //
        // TO DO: the other three. down is (0, 1), left is (-1, 0),
        // right is (1, 0).
    }

    /**
     * Steps by one cell, but only if the destination is a cell that exists and
     * is not a wall.
     *
     * @param dx how far to move across, in cells
     * @param dy how far to move down, in cells
     */
    public void tryMove(int dx, int dy)
    {
        int newCol = getX() + dx;
        int newRow = getY() + dy;

        // TO DO (6.6): if the destination is open, setLocation(newCol, newRow).
        // If it is not, do nothing at all. Not moving IS the collision.
    }

    /**
     * True when a cell exists and is walkable.
     */
    public boolean isOpen(int col, int row)
    {
        // TO DO (6.6): all four bounds tests first, then the lookup:
        //
        //     row >= 0 && row < map.length &&
        //     col >= 0 && col < map[row].length &&
        //     map[row][col] != 1
        //
        // THE ORDER IS NOT A STYLE CHOICE. && stops as soon as something is
        // false, so the bounds tests protect the lookup. Put the lookup first
        // and it throws on the very case the check exists for, which is the
        // player walking off the edge.
        return false;
    }
}
