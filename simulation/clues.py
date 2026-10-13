"""
clues.py - Movie-themed clues and signal physics for WALL-E's search for EVE.
All clues are grounded in Pixar lore:
- Thruster scorch marks on scrap metal
- Hover turbulence / ion trail
- Direct beacon handshake ping
- Plant bio-organic reading (the iconic boot plant!)
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import math

@dataclass
class Clue:
    id: str
    x: int
    y: int
    clue_type: str  # 'scorch_mark', 'ion_trail', 'beacon_ping', 'plant_signature'
    description: str
    eve_bearing_hint: Optional[str]  # e.g. "NORTHEAST", "EAST", etc.
    estimated_distance: Optional[float]
    confidence_boost: float  # How much this increases agent's confidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "clue_type": self.clue_type,
            "description": self.description,
            "eve_bearing_hint": self.eve_bearing_hint,
            "estimated_distance": self.estimated_distance,
            "confidence_boost": self.confidence_boost,
        }

def compute_bearing(from_x: int, from_y: int, to_x: int, to_y: int) -> str:
    """Computes cardinal/intercardinal direction from one coordinate to another."""
    dx = to_x - from_x
    dy = to_y - from_y
    if dx == 0 and dy == 0:
        return "HERE"
    angle = math.degrees(math.atan2(dy, dx))  # -180 to 180 (0 is East, 90 is South if Y down, or North if Y up)
    # Let's treat standard grid: +x is East, +y is North
    if -22.5 <= angle < 22.5:
        return "EAST"
    elif 22.5 <= angle < 67.5:
        return "NORTHEAST"
    elif 67.5 <= angle < 112.5:
        return "NORTH"
    elif 112.5 <= angle < 157.5:
        return "NORTHWEST"
    elif angle >= 157.5 or angle < -157.5:
        return "WEST"
    elif -157.5 <= angle < -112.5:
        return "SOUTHWEST"
    elif -112.5 <= angle < -67.5:
        return "SOUTH"
    else:
        return "SOUTHEAST"

def calculate_signal_strength(dist: float, max_dist: float = 40.0, noise: float = 0.0) -> float:
    """
    Inverse square law signal propagation with optional atmospheric noise.
    Returns normalized strength between 0.0 and 100.0.
    """
    if dist <= 0.5:
        base = 100.0
    else:
        # Smooth falloff
        base = max(5.0, 100.0 / (1.0 + (dist / 6.0) ** 1.8))
    noisy = base + noise
    return max(0.0, min(100.0, round(noisy, 1)))
