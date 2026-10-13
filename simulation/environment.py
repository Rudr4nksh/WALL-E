"""
environment.py - Earth Wasteland Simulation Environment.
Simulates grid terrain, scrap towers, solar beams, clue discoveries,
battery consumption, and sensor observations for WALL-E.
"""

from typing import Dict, Any, List, Tuple, Optional
import json
import math
import random
from simulation.clues import Clue, compute_bearing, calculate_signal_strength

class EarthEnvironment:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.width: int = config.get("map", {}).get("width", 20)
        self.height: int = config.get("map", {}).get("height", 20)
        self.seed: Optional[int] = config.get("map", {}).get("seed", 42)
        
        if self.seed is not None:
            random.seed(self.seed)

        # Budget & costs
        budget = config.get("resource_budget", {})
        self.max_battery: float = float(budget.get("max_battery", 100.0))
        self.battery: float = float(budget.get("initial_battery", 100.0))
        self.max_time: int = int(budget.get("max_time_steps", 150))
        self.time_step: int = 0
        
        costs = budget.get("action_costs", {})
        self.cost_move: float = float(costs.get("move", 2.0))
        self.cost_scan: float = float(costs.get("scan", 5.0))
        self.cost_investigate: float = float(costs.get("investigate", 3.0))
        self.cost_idle: float = float(costs.get("idle", 0.5))
        self.recharge_rate: float = float(budget.get("solar_recharge_rate", 15.0))

        # WALL-E starting position
        start_pos = config.get("agent_start", {"x": 1, "y": 1})
        self.wall_e_x: int = start_pos["x"]
        self.wall_e_y: int = start_pos["y"]

        # EVE secret true position
        eve_cfg = config.get("eve_target", {"x": 16, "y": 17, "status": "DORMANT_PROBE_WAITING"})
        self.eve_x: int = eve_cfg["x"]
        self.eve_y: int = eve_cfg["y"]
        self.eve_status: str = eve_cfg.get("status", "DORMANT_PROBE_WAITING")

        # Obstacles (Scrap towers)
        self.obstacles: set[Tuple[int, int]] = set()
        for obs in config.get("map", {}).get("obstacles", []):
            self.obstacles.add((obs["x"], obs["y"]))

        # Solar spots (Clearings with sunbeams)
        self.solar_spots: set[Tuple[int, int]] = set()
        for spot in config.get("map", {}).get("solar_spots", []):
            self.solar_spots.add((spot["x"], spot["y"]))

        # Hidden Clues (WALL-E does NOT know these beforehand!)
        self.hidden_clues: Dict[Tuple[int, int], Clue] = {}
        for c in config.get("clues", []):
            clue = Clue(
                id=c["id"],
                x=c["x"],
                y=c["y"],
                clue_type=c["type"],
                description=c["description"],
                eve_bearing_hint=c.get("bearing_hint", compute_bearing(c["x"], c["y"], self.eve_x, self.eve_y)),
                estimated_distance=c.get("estimated_distance", round(math.hypot(self.eve_x - c["x"], self.eve_y - c["y"]), 1)),
                confidence_boost=c.get("confidence_boost", 0.25)
            )
            self.hidden_clues[(c["x"], c["y"])] = clue

        # Discovered clues
        self.discovered_clues: Dict[str, Clue] = {}
        
        # Sensor noise settings
        self.sensor_noise_sigma: float = float(config.get("sensor_noise_sigma", 0.0))
        self.is_terminated: bool = False
        self.termination_reason: str = ""
        self._last_scanned_clues: List[Dict[str, Any]] = []

    def get_initial_observation(self) -> Dict[str, Any]:
        """Provides the opening observation at tick 0 as specified in prompt."""
        dist = math.hypot(self.eve_x - self.wall_e_x, self.eve_y - self.wall_e_y)
        initial_strength = calculate_signal_strength(dist, noise=random.gauss(0, self.sensor_noise_sigma))
        initial_bearing = compute_bearing(self.wall_e_x, self.wall_e_y, self.eve_x, self.eve_y)
        
        return {
            "time_step": self.time_step,
            "position": {"x": self.wall_e_x, "y": self.wall_e_y},
            "battery": round(self.battery, 1),
            "is_solar_spot": (self.wall_e_x, self.wall_e_y) in self.solar_spots,
            "signal": {
                "strength": initial_strength,
                "bearing": initial_bearing,
                "timestamp": self.time_step
            },
            "nearby_clue_hint": self._check_adjacent_clue_hint(),
            "immediate_hazards": self._get_adjacent_obstacles(),
            "status": "OPERATIONAL"
        }

    def step(self, action: str, target: Optional[Tuple[int, int]] = None) -> Tuple[Dict[str, Any], float, bool, Dict[str, Any]]:
        """
        Executes an action in the wasteland environment.
        Actions:
          - 'MOVE': target must be adjacent coordinate (dx, dy in [-1, 0, 1])
          - 'SCAN': pulse directional radar
          - 'INVESTIGATE': look for clues at current coordinate
          - 'SOLAR_CHARGE': recharge battery if in solar spot
          - 'IDLE': wait
        Returns: (observation, battery_cost_or_gain, is_done, info)
        """
        if self.is_terminated:
            return self._build_obs(f"Mission already terminated: {self.termination_reason}"), 0.0, True, {"reason": self.termination_reason}

        self.time_step += 1
        delta_battery = 0.0
        action_msg = ""
        success = True

        if action == "MOVE":
            if not target:
                success = False
                action_msg = "Move failed: No target specified."
                delta_battery = -self.cost_idle
            else:
                tx, ty = target
                # Check adjacency
                if abs(tx - self.wall_e_x) + abs(ty - self.wall_e_y) != 1:
                    success = False
                    action_msg = f"Move failed: Target ({tx}, {ty}) is not adjacent."
                    delta_battery = -self.cost_idle
                elif not (0 <= tx < self.width and 0 <= ty < self.height):
                    success = False
                    action_msg = f"Move failed: Boundary collision at ({tx}, {ty})."
                    delta_battery = -self.cost_idle
                elif (tx, ty) in self.obstacles:
                    success = False
                    action_msg = f"Move failed: Blocked by scrap tower at ({tx}, {ty})."
                    delta_battery = -self.cost_idle
                else:
                    self.wall_e_x = tx
                    self.wall_e_y = ty
                    delta_battery = -self.cost_move
                    action_msg = f"Moved to ({tx}, {ty})."

        elif action == "SCAN":
            delta_battery = -self.cost_scan
            # Find any clues within scan radius of 8.5 tiles
            detected = []
            for (cx, cy), clue in self.hidden_clues.items():
                if math.hypot(cx - self.wall_e_x, cy - self.wall_e_y) <= 8.5:
                    detected.append({"id": clue.id, "x": cx, "y": cy, "type": clue.clue_type})
            self._last_scanned_clues = detected
            if detected:
                action_msg = f"Radar sweep detected {len(detected)} clue signature(s) within sensor sweep."
            else:
                action_msg = "Radar sweep complete. No new clues detected nearby."

        elif action == "INVESTIGATE":
            delta_battery = -self.cost_investigate
            current_coord = (self.wall_e_x, self.wall_e_y)
            if current_coord in self.hidden_clues:
                clue = self.hidden_clues[current_coord]
                self.discovered_clues[clue.id] = clue
                action_msg = f"DISCOVERED CLUE [{clue.id}]: {clue.description}"
            else:
                action_msg = "Investigated rubble at current location. Nothing of note found."

        elif action == "SOLAR_CHARGE":
            if (self.wall_e_x, self.wall_e_y) in self.solar_spots:
                gain = min(self.recharge_rate, self.max_battery - self.battery)
                delta_battery = gain
                action_msg = f"Solar panels deployed in sunbeam. Gained +{round(gain, 1)}% battery."
            else:
                delta_battery = -self.cost_idle
                success = False
                action_msg = "Solar charge failed: Not in a sunbeam clearing (shaded by scrap)."

        elif action == "IDLE":
            delta_battery = -self.cost_idle
            action_msg = "Standby mode."
        else:
            delta_battery = -self.cost_idle
            success = False
            action_msg = f"Unknown action: {action}"

        # Apply battery delta
        self.battery = max(0.0, min(self.max_battery, self.battery + delta_battery))

        # Check termination conditions
        is_done = False
        if self.battery <= 0.0:
            is_done = True
            self.is_terminated = True
            self.termination_reason = "BATTERY_DEPLETED: WALL-E ran out of solar energy in the scrap heaps."
        elif self.time_step >= self.max_time:
            is_done = True
            self.is_terminated = True
            self.termination_reason = "TIME_EXCEEDED: Earth dust storm arrived before mission completion."
        elif math.hypot(self.eve_x - self.wall_e_x, self.eve_y - self.wall_e_y) <= 1.0:
            is_done = True
            self.is_terminated = True
            self.termination_reason = "EVE_LOCATED: WALL-E reached EVE's probe position!"

        obs = self._build_obs(action_msg)
        info = {
            "success": success,
            "action_msg": action_msg,
            "delta_battery": delta_battery,
            "reason": self.termination_reason if is_done else ""
        }
        return obs, delta_battery, is_done, info

    def _build_obs(self, action_msg: str) -> Dict[str, Any]:
        dist = math.hypot(self.eve_x - self.wall_e_x, self.eve_y - self.wall_e_y)
        noise = random.gauss(0, self.sensor_noise_sigma) if self.sensor_noise_sigma > 0 else 0.0
        signal_strength = calculate_signal_strength(dist, noise=noise)
        bearing = compute_bearing(self.wall_e_x, self.wall_e_y, self.eve_x, self.eve_y)

        # Check if clue directly at current position
        clue_here = None
        curr = (self.wall_e_x, self.wall_e_y)
        if curr in self.hidden_clues:
            clue_here = self.hidden_clues[curr].to_dict()

        obs_dict = {
            "time_step": self.time_step,
            "position": {"x": self.wall_e_x, "y": self.wall_e_y},
            "battery": round(self.battery, 1),
            "is_solar_spot": (self.wall_e_x, self.wall_e_y) in self.solar_spots,
            "signal": {
                "strength": signal_strength,
                "bearing": bearing,
                "timestamp": self.time_step
            },
            "clue_at_current_location": clue_here,
            "nearby_clue_hint": self._check_adjacent_clue_hint(),
            "immediate_hazards": self._get_adjacent_obstacles(),
            "scanned_clues": list(self._last_scanned_clues),
            "message": action_msg
        }
        self._last_scanned_clues = []
        return obs_dict

    def _check_adjacent_clue_hint(self) -> Optional[str]:
        """Sniffs if a clue is within 2.5 tiles (scent of ozone, thruster heat, etc.)."""
        for (cx, cy), clue in self.hidden_clues.items():
            if math.hypot(cx - self.wall_e_x, cy - self.wall_e_y) <= 2.5:
                if clue.id not in self.discovered_clues:
                    return f"Passive sensor tickle: {clue.clue_type.replace('_', ' ').capitalize()} nearby!"
        return None

    def _get_adjacent_obstacles(self) -> List[Tuple[int, int]]:
        hazards = []
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = self.wall_e_x + dx, self.wall_e_y + dy
            if (nx, ny) in self.obstacles or not (0 <= nx < self.width and 0 <= ny < self.height):
                hazards.append((nx, ny))
        return hazards

    def export_map_state(self) -> Dict[str, Any]:
        """Exports the ground truth environment state for the visualizer."""
        return {
            "width": self.width,
            "height": self.height,
            "obstacles": [{"x": x, "y": y} for (x, y) in self.obstacles],
            "solar_spots": [{"x": x, "y": y} for (x, y) in self.solar_spots],
            "clues": [c.to_dict() for c in self.hidden_clues.values()],
            "eve_target": {"x": self.eve_x, "y": self.eve_y, "status": self.eve_status},
            "start": {"x": self.config.get("agent_start", {}).get("x", 1), "y": self.config.get("agent_start", {}).get("y", 1)}
        }
