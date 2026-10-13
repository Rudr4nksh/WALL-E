# 🤖 WALL-E and EVE's Signal: Autonomous Reconnaissance Agent & 3D Game

> An autonomous agent inspired by Pixar's **WALL-E** that navigates a desolated Earth wasteland, manages solar power, uncovers physical clues, and pinpoints EVE's probe location. Features a full **3D Game-style WebGL visualizer** so you can watch WALL-E explore in real time!

---

## 🎬 Story & Mission Overview

Earth is desolate, covered with towers of compressed scrap cubes. Suddenly, WALL-E's radio receiver picks up a faint high-tech handshake: **EVE (Extraterrestrial Vegetation Evaluator) has arrived!**

However:
- The signal is faint and bounces off scrap towers.
- WALL-E operates on **solar power**; driving and scanning drain his battery. If his battery hits 0% in the shade, he shuts down permanently.
- The map contains **Scrap Towers** (impassable obstacles), **Sunbeam Clearings** (where WALL-E can extend solar panels to recharge), and **Clues** (plasma scorch marks, electrostatic hover tracks, and the iconic living seedling inside a vintage leather boot!).

WALL-E's mission: autonomously explore, maintain battery safety, follow evidence, triangulate EVE's location, and deliver a mission reconnaissance report.

---

## 🎮 3D Game Visualizer

The project includes a 3D game visualization built in **Three.js / WebGL**:
- **Procedural 3D WALL-E Model:** Weathered yellow chassis, tank treads, articulated binocular eyes that look around, and **solar panels that physically fold open** when charging under sunbeams!
- **Laser Scanner:** Translucent green laser cone sweeps the ground during active radar scans.
- **3D Wasteland World:** Towering scrap cubes, shimmering golden sunbeam light shafts, and floating EVE probe with glowing cyan holographic rings.
- **Dynamic Tread Tracks:** WALL-E leaves real-time tread marks on the ground as he moves.
- **3 Camera Modes:**
  - 🎥 **3rd-Person Chase Cam:** Trails behind WALL-E's shoulder like a 3D video game.
  - 🔄 **Free Orbit / Drone Cam:** Rotate, zoom in/out, and pan freely anywhere in 3D space.
  - 🗺️ **Tactical Top-Down Cam:** Bird's-eye view for strategic overwatch.
- **Live HUD:** Battery meter, WALL-E Thought Stream (explaining his reasoning at every step), discovered clues dossier, and timeline scrubber with speed controls (0.5x, 1x, 2x, 4x).

---

## 🧠 How the Autonomous Agent Works (In Plain English)

You don't need any Machine Learning or math background to understand how WALL-E thinks:

```
[Observe Senses] ──► [Update Mental Map] ──► [Battery Safety Check] ──► [Act & Move]
```

1. **Sense:** At every tick, WALL-E reads signal strength (louder = closer), directional bearing (e.g. Northeast), and nearby physical clues.
2. **Mental Scratchpad (Belief Grid):** WALL-E maintains a 2D probability grid. When a clue or signal says "EVE is roughly 12 meters Northeast", WALL-E updates his map to circle that area and cross out unlikely zones.
3. **Solar Energy Awareness:** Before making any move, WALL-E calculates:
   $$\text{Battery needed to reach target} + \text{Battery needed to retreat to nearest sunbeam} < \text{Current Battery}$$
   If his battery drops close to the safety reserve (<35%), WALL-E automatically suspends exploration, retreats to the nearest sunbeam clearing, opens his solar panels, and charges back up to 85–100%!
4. **Target Acquisition:** Once evidence narrows down EVE's position with high confidence, WALL-E switches to direct pursuit.

---

## 🚀 Quick Start & Run Instructions

### 1. Run a Mission Simulation (Generates traces & markdown report)

Standard Earth Mission:
```bash
python run_mission.py --config configs/earth_standard.json
```

Heavy Dust Storm Challenge (Low power, high sand drift):
```bash
python run_mission.py --config configs/earth_dust_storm.json --trace reports/trace_dust_storm.json --report reports/report_dust_storm.md
```

### 2. Launch the 3D Game Visualizer

Run the 1-click launcher:
```bash
python launch_visualizer.py
```
This automatically starts a local server and opens the 3D game in your default browser at `http://localhost:8000/visualizer/index.html`!

*(Alternative: You can also directly double-click `visualizer/index.html` to open it in Chrome, Edge, or Firefox without running any server!)*

---

## 📁 Repository Structure

```
├── configs/
│   ├── earth_standard.json       # Standard wasteland mission config
│   └── earth_dust_storm.json     # Heavy dust storm challenge config
├── simulation/
│   ├── environment.py            # Grid terrain, battery drainage, solar spots, clues
│   └── clues.py                  # Pixar-themed clue definitions & signal physics
├── agent/
│   ├── wall_e.py                 # Autonomous agent state machine & battery planner
│   ├── belief_map.py             # Probabilistic belief grid (detective scratchpad)
│   └── pathfinder.py             # A* navigation avoiding scrap towers
├── visualizer/
│   ├── index.html                # 3D Game HUD and WebGL canvas
│   ├── game3d.js                 # Three.js 3D game engine, procedural models & cameras
│   ├── style.css                 # Sci-fi Axiom / Buy n Large interface styling
│   ├── missions_data.js          # Bundled trace log data for offline browser play
│   └── bundle_data.py            # Helper script to export JSON traces to JS
├── reports/
│   ├── trace_standard.json       # Complete tick-by-tick action & position logs
│   ├── report_standard.md        # Mission reconnaissance report
│   ├── trace_dust_storm.json     # Dust storm challenge trace logs
│   └── report_dust_storm.md      # Dust storm challenge report
├── run_mission.py                # Main mission simulation runner
├── launch_visualizer.py          # 1-click 3D browser visualizer launcher
└── README.md                     # Documentation
```

---

## ⚙️ Mission Configuration Format (`configs/*.json`)

Mission configurations allow you to design custom wasteland scenarios:

```json
{
  "mission_name": "Earth Mission Name",
  "map": {
    "width": 20,
    "height": 20,
    "obstacles": [{"x": 2, "y": 3}, {"x": 5, "y": 7}],
    "solar_spots": [{"x": 4, "y": 4}, {"x": 9, "y": 10}]
  },
  "agent_start": {"x": 1, "y": 1},
  "eve_target": {"x": 17, "y": 18, "status": "DORMANT_PROBE_WAITING"},
  "resource_budget": {
    "initial_battery": 100.0,
    "max_battery": 100.0,
    "max_time_steps": 120,
    "solar_recharge_rate": 18.0,
    "action_costs": {
      "move": 2.0,
      "scan": 4.5,
      "investigate": 3.0,
      "idle": 0.5
    }
  },
  "clues": [
    {
      "id": "CLUE-01-SCORCH",
      "x": 4,
      "y": 5,
      "type": "scorch_mark",
      "description": "High-temperature plasma burn on crushed metal cube.",
      "bearing_hint": "NORTHEAST",
      "estimated_distance": 18.0
    }
  ]
}
```

---

## 📊 Sample Output Deliverable: Mission Report

A sample from `reports/report_standard.md`:
* **Directive Status:** `EVE_LOCATED (SUCCESS)`
* **Steps Expended:** 96 ticks
* **Final Inferred Target:** `(17, 18)` (Exact 100% pinpoint match)
* **Final Confidence:** `99.0%`
* **Solar Recharges:** 2 full recharge cycles in sunbeam clearings
* **Clues Recovered:**
  - Plasma thruster scorch mark at `(4, 5)`
  - Electrostatic hover residue at `(9, 9)`
  - Direct probe handshake ping at `(14, 13)`
  - Photosynthetic seedling inside vintage boot at `(16, 17)`
