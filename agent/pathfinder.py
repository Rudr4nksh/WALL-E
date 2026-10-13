"""
pathfinder.py - A* Search Algorithm for WALL-E navigation.
Finds the shortest, battery-efficient path between grid cells, avoiding scrap towers.
"""

from typing import List, Tuple, Set, Optional, Dict
import heapq

def heuristic(a: Tuple[int, int], b: Tuple[int, int]) -> float:
    """Manhattan distance heuristic."""
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def get_neighbors(pos: Tuple[int, int], width: int, height: int, obstacles: Set[Tuple[int, int]]) -> List[Tuple[int, int]]:
    x, y = pos
    neighbors = []
    for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            if (nx, ny) not in obstacles:
                neighbors.append((nx, ny))
    return neighbors

def find_path(
    start: Tuple[int, int],
    goal: Tuple[int, int],
    width: int,
    height: int,
    obstacles: Set[Tuple[int, int]]
) -> Optional[List[Tuple[int, int]]]:
    """
    A* search returning list of coordinates from start to goal (inclusive of goal, exclusive of start).
    Returns None if no path exists.
    """
    if start == goal:
        return []

    if goal in obstacles:
        return None

    frontier: List[Tuple[float, Tuple[int, int]]] = []
    heapq.heappush(frontier, (0.0, start))
    
    came_from: Dict[Tuple[int, int], Optional[Tuple[int, int]]] = {start: None}
    cost_so_far: Dict[Tuple[int, int], float] = {start: 0.0}

    while frontier:
        _, current = heapq.heappop(frontier)

        if current == goal:
            break

        for next_pos in get_neighbors(current, width, height, obstacles):
            new_cost = cost_so_far[current] + 1.0
            if next_pos not in cost_so_far or new_cost < cost_so_far[next_pos]:
                cost_so_far[next_pos] = new_cost
                priority = new_cost + heuristic(goal, next_pos)
                heapq.heappush(frontier, (priority, next_pos))
                came_from[next_pos] = current

    if goal not in came_from:
        return None

    # Reconstruct path
    path = []
    curr = goal
    while curr != start and curr is not None:
        path.append(curr)
        curr = came_from.get(curr)
    path.reverse()
    return path
