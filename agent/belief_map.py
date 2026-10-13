"""
belief_map.py - Probabilistic Belief State Tracker for EVE's location.
Maintains a 2D probability distribution over the entire wasteland map.
Updates beliefs as WALL-E observes signal strengths, bearings, and discovers physical clues.
"""

from typing import Dict, Any, List, Tuple, Optional
import math
from simulation.clues import compute_bearing

class BeliefMap:
    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        # Initialize uniform prior probability across all grid cells
        total_cells = width * height
        self.grid: List[List[float]] = [[1.0 / total_cells for _ in range(height)] for _ in range(width)]
        self.known_clues: List[Dict[str, Any]] = []

    def update_from_signal(self, agent_x: int, agent_y: int, strength: float, bearing: str):
        """
        Updates grid probabilities using signal strength and directional bearing.
        """
        # Convert strength back to expected distance
        # strength in [0..100], higher = closer
        expected_distance = max(1.0, 6.0 * (((100.0 / max(5.0, strength)) - 1.0) ** (1.0 / 1.8)))

        for x in range(self.width):
            for y in range(self.height):
                if x == agent_x and y == agent_y:
                    self.grid[x][y] *= 0.01  # EVE is not standing directly on top of WALL-E unless located
                    continue

                dist = math.hypot(x - agent_x, y - agent_y)
                cell_bearing = compute_bearing(agent_x, agent_y, x, y)

                # Distance likelihood: gaussian-like penalty around expected distance
                dist_diff = abs(dist - expected_distance)
                dist_likelihood = math.exp(-0.5 * ((dist_diff / 4.0) ** 2))

                # Bearing likelihood: matching direction gets bonus, opposing gets penalty
                if cell_bearing == bearing:
                    bearing_likelihood = 2.5
                elif bearing in cell_bearing or cell_bearing in bearing:
                    bearing_likelihood = 1.4  # adjacent direction (e.g. NORTH vs NORTHEAST)
                else:
                    bearing_likelihood = 0.2

                self.grid[x][y] *= (dist_likelihood * bearing_likelihood)

        self._normalize()

    def update_from_clue(self, clue_dict: Dict[str, Any]):
        """
        Applies sharp evidence update when a physical clue is uncovered.
        """
        cx, cy = clue_dict["x"], clue_dict["y"]
        bearing_hint = clue_dict.get("eve_bearing_hint")
        est_dist = clue_dict.get("estimated_distance")
        self.known_clues.append(clue_dict)

        for x in range(self.width):
            for y in range(self.height):
                cell_dist = math.hypot(x - cx, y - cy)
                cell_bearing = compute_bearing(cx, cy, x, y)

                factor = 1.0
                if bearing_hint:
                    if cell_bearing == bearing_hint:
                        factor *= 3.0
                    elif bearing_hint in cell_bearing or cell_bearing in bearing_hint:
                        factor *= 1.5
                    else:
                        factor *= 0.1

                if est_dist is not None:
                    dist_err = abs(cell_dist - est_dist)
                    factor *= math.exp(-0.5 * ((dist_err / 2.5) ** 2))

                self.grid[x][y] *= factor

        self._normalize()

    def _normalize(self):
        total = sum(sum(row) for row in self.grid)
        total_cells = self.width * self.height
        uniform = 1.0 / total_cells
        alpha = 0.035  # Process noise / diffusion to adapt dynamically to new telemetry
        if total > 0:
            for x in range(self.width):
                for y in range(self.height):
                    norm = self.grid[x][y] / total
                    self.grid[x][y] = (1.0 - alpha) * norm + alpha * uniform
        else:
            self.grid = [[uniform for _ in range(self.height)] for _ in range(self.width)]

    def get_most_likely_target(self) -> Tuple[int, int, float]:
        """
        Returns (best_x, best_y, confidence_percentage).
        """
        best_val = -1.0
        best_coord = (self.width // 2, self.height // 2)

        for x in range(self.width):
            for y in range(self.height):
                if self.grid[x][y] > best_val:
                    best_val = self.grid[x][y]
                    best_coord = (x, y)

        # Confidence: compare top cell and its immediate neighborhood vs uniform probability
        # A uniform cell is 1 / (W*H). If top cell has 0.15 in a 400-cell grid, that's huge!
        uniform = 1.0 / (self.width * self.height)
        confidence = min(99.0, max(10.0, (best_val / (uniform * 10.0)) * 50.0 + len(self.known_clues) * 12.0))
        return best_coord[0], best_coord[1], round(confidence, 1)

    def to_heatmap(self) -> List[List[float]]:
        """Returns 2D normalized array (0.0 to 1.0) for visualizer rendering."""
        max_v = max(max(row) for row in self.grid)
        if max_v <= 0:
            return [[0.0 for _ in range(self.height)] for _ in range(self.width)]
        return [[round(self.grid[x][y] / max_v, 3) for y in range(self.height)] for x in range(self.width)]
