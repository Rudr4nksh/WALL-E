"""
wall_e.py - WALL-E's Autonomous Decision Engine.
Implements the autonomous agent with state machine, battery management,
belief updates, path planning, and reasoning logs.
"""

from typing import Dict, Any, List, Tuple, Optional, Set
import math
from agent.belief_map import BeliefMap
from agent.pathfinder import find_path

class WallEAgent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.width: int = config.get("map", {}).get("width", 20)
        self.height: int = config.get("map", {}).get("height", 20)

        # Knowledge base of obstacles and solar spots
        self.obstacles: Set[Tuple[int, int]] = set()
        for obs in config.get("map", {}).get("obstacles", []):
            self.obstacles.add((obs["x"], obs["y"]))

        self.solar_spots: Set[Tuple[int, int]] = set()
        for spot in config.get("map", {}).get("solar_spots", []):
            self.solar_spots.add((spot["x"], spot["y"]))

        # Action costs
        budget = config.get("resource_budget", {})
        self.move_cost: float = float(budget.get("action_costs", {}).get("move", 2.0))
        self.scan_cost: float = float(budget.get("action_costs", {}).get("scan", 5.0))
        self.max_battery: float = float(budget.get("max_battery", 100.0))

        # Belief Tracker
        self.belief = BeliefMap(self.width, self.height)

        # Agent state
        self.current_pos: Tuple[int, int] = (
            config.get("agent_start", {}).get("x", 1),
            config.get("agent_start", {}).get("y", 1)
        )
        self.battery: float = float(budget.get("initial_battery", 100.0))
        self.state: str = "EXPLORING_SIGNAL"  # 'EXPLORING_SIGNAL', 'INVESTIGATING_CLUE', 'RECHARGING_SOLAR', 'PURSUING_TARGET'
        self.current_plan: List[Tuple[int, int]] = []
        self.discovered_clues: List[Dict[str, Any]] = []
        self.clue_waypoints: List[Tuple[int, int]] = []
        self.visited_cells: Set[Tuple[int, int]] = {self.current_pos}
        self.scanned_positions: Set[Tuple[int, int]] = set()
        self.steps_since_scan: int = 0
        self.action_history: List[Dict[str, Any]] = []

    def observe_and_update(self, obs: Dict[str, Any]):
        """Processes sensor observations from environment and updates belief map."""
        self.current_pos = (obs["position"]["x"], obs["position"]["y"])
        self.battery = obs["battery"]
        self.visited_cells.add(self.current_pos)

        # Record any scanned clues from radar
        for sc in obs.get("scanned_clues", []):
            pt = (sc["x"], sc["y"])
            if pt not in self.clue_waypoints and not any(c["id"] == sc["id"] for c in self.discovered_clues):
                self.clue_waypoints.append(pt)

        # 1. Update from signal strength & bearing
        sig = obs.get("signal", {})
        if sig:
            self.belief.update_from_signal(
                self.current_pos[0],
                self.current_pos[1],
                sig["strength"],
                sig["bearing"]
            )

        # 2. Update if clue discovered at current position
        clue_here = obs.get("clue_at_current_location")
        if clue_here:
            already = any(c["id"] == clue_here["id"] for c in self.discovered_clues)
            if not already:
                self.discovered_clues.append(clue_here)
                self.belief.update_from_clue(clue_here)
                if self.current_pos in self.clue_waypoints:
                    self.clue_waypoints.remove(self.current_pos)

    def decide_next_action(self, obs: Dict[str, Any]) -> Tuple[str, Optional[Tuple[int, int]], str]:
        """
        Main decision-making function.
        Returns: (action_name, target_coordinate, reasoning_explanation)
        """
        inferred_x, inferred_y, confidence = self.belief.get_most_likely_target()
        is_at_solar = (self.current_pos in self.solar_spots)
        self.steps_since_scan += 1

        # 1. Check if standing on an uncovered clue that needs investigation
        clue_here = obs.get("clue_at_current_location")
        if clue_here and not any(c["id"] == clue_here["id"] for c in self.discovered_clues):
            reason = f"Identified unscanned artifact on ground [{clue_here['id']}]. Running optical & spectral investigation."
            return "INVESTIGATE", None, reason

        # 2. Battery Safety: calculate nearest solar clearing
        nearest_solar, dist_to_solar = self._find_nearest_solar_spot()
        battery_needed_for_solar = (dist_to_solar * self.move_cost) + 8.0  # safety reserve margin

        # Opportunistic recharge: if at solar spot and battery < 85%, charge!
        if is_at_solar and self.battery < 85.0:
            self.state = "RECHARGING_SOLAR"
            reason = f"Sunlight beam overhead. Solar panels extended to replenish battery ({self.battery:.1f}% -> target 85%+)."
            return "SOLAR_CHARGE", None, reason

        # Emergency retreat: If battery is close to reserve, route to sun immediately!
        if self.battery <= battery_needed_for_solar or (self.battery < 36.0 and not is_at_solar):
            self.state = "RECHARGING_SOLAR"
            if nearest_solar:
                plan = find_path(self.current_pos, nearest_solar, self.width, self.height, self.obstacles)
                if plan:
                    next_step = plan[0]
                    reason = f"LOW BATTERY WARNING ({self.battery:.1f}%). Retreating to Solar Clearing at {nearest_solar} to recharge before battery depletes."
                    return "MOVE", next_step, reason
            return "IDLE", None, "Conserving power in standby mode."

        # 3. Investigate clue waypoints if queued
        if self.clue_waypoints:
            target_clue = self.clue_waypoints[0]
            if self.current_pos == target_clue:
                self.clue_waypoints.pop(0)
                return "INVESTIGATE", None, f"Reached clue sector {target_clue}. Analyzing physical residue."
            plan = find_path(self.current_pos, target_clue, self.width, self.height, self.obstacles)
            if plan:
                self.state = "INVESTIGATING_CLUE"
                reason = f"Navigating towards detected clue at {target_clue}."
                return "MOVE", plan[0], reason
            else:
                self.clue_waypoints.pop(0)

        # 4. Investigate nearby clue hint if sniffed, or periodic radar sweep (only once per position)
        hint = obs.get("nearby_clue_hint")
        can_scan = (self.current_pos not in self.scanned_positions) and (self.battery > (battery_needed_for_solar + self.scan_cost))
        if can_scan and (hint or self.steps_since_scan >= 8):
            self.scanned_positions.add(self.current_pos)
            self.steps_since_scan = 0
            self.state = "INVESTIGATING_CLUE" if hint else "EXPLORING_SIGNAL"
            reason = f"Sensors sniffed physical evidence ('{hint}'). Firing active radar scan." if hint else "Routine sector radar sweep to detect clues and probe signals."
            return "SCAN", None, reason

        # 5. Routine exploration / target pursuit towards highest belief zone
        self.state = "PURSUING_TARGET" if confidence >= 70.0 else "EXPLORING_SIGNAL"
        target_goal = (inferred_x, inferred_y)

        # Use cached plan if still valid towards same target
        if not self.current_plan or getattr(self, '_current_target_goal', None) != target_goal or self.current_pos not in self.visited_cells:
            self._current_target_goal = target_goal
            self.current_plan = find_path(self.current_pos, target_goal, self.width, self.height, self.obstacles) or []

        if self.current_plan:
            next_step = self.current_plan.pop(0)
            reason = f"Tracking beacon ping towards sector ({inferred_x}, {inferred_y}) [Confidence: {confidence}%]. Moving to ({next_step[0]}, {next_step[1]})."
            return "MOVE", next_step, reason
        else:
            # If target blocked by towers, explore an unvisited neighbor
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = self.current_pos[0] + dx, self.current_pos[1] + dy
                if 0 <= nx < self.width and 0 <= ny < self.height:
                    if (nx, ny) not in self.obstacles and (nx, ny) not in self.visited_cells:
                        reason = f"Direct route to ({inferred_x}, {inferred_y}) obstructed. Exploring unvisited sector ({nx}, {ny})."
                        return "MOVE", (nx, ny), reason

            return "SCAN", None, "Scouting area with radar scan for alternate paths."

    def _find_nearest_solar_spot(self) -> Tuple[Optional[Tuple[int, int]], float]:
        if not self.solar_spots:
            return None, 999.0
        best_spot = None
        min_dist = 999.0
        for spot in self.solar_spots:
            path = find_path(self.current_pos, spot, self.width, self.height, self.obstacles)
            if path is not None:
                dist = len(path)
                if dist < min_dist:
                    min_dist = dist
                    best_spot = spot
            else:
                # Direct manhattan distance estimate if blocked
                dist = abs(self.current_pos[0] - spot[0]) + abs(self.current_pos[1] - spot[1])
                if dist < min_dist:
                    min_dist = dist
                    best_spot = spot
        return best_spot, min_dist
