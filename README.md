# 🤖 WALL-E & EVE's Signal: Autonomous Reconnaissance Agent & 3D Simulation

> An autonomous robotics agent inspired by Pixar's **WALL-E**. The agent traverses a procedurally generated post-apocalyptic Earth wasteland, manages solar power constraints, collects iconic relics, and triangulates EVE's probe coordinates using Bayesian spatial belief grids and A* pathfinding. Includes an interactive real-time 3D WebGL visualizer built with Three.js.

[![Python 3.8+](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![Three.js](https://img.shields.io/badge/WebGL-Three.js%20r128-orange.svg)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎬 Mission Lore & Background

Centuries after humanity evacuated aboard the Axiom starliner, Earth remains covered in colossal towers of compressed scrap cubes. Suddenly, WALL-E's radio receiver picks up a faint high-tech subspace handshake: **EVE (Extraterrestrial Vegetation Evaluator) has landed on Earth!**

However, completing the reconnaissance directive presents severe operational challenges:
- **Radio Interference:** The transponder beacon reflects off metallic scrap monoliths, introducing angular noise.
- **Strict Solar Energy Constraints:** Locomotion, active radar sweeping, and laser analysis deplete WALL-E's battery. If his battery hits 0% while stranded in the shade, he shuts down permanently.
- **Physical Relics:** The wasteland contains genuine movie artifacts (the living plant seedling inside the vintage work boot, Hal's Rubik's cube, "Hello Dolly!" audio tapes, lightbulbs, fire extinguishers).
- **Hazardous Dunes & Monoliths:** Towering scrap stacks block direct passage, requiring intelligent dynamic rerouting.

---

## 🎮 3D Game Visualizer Features

Built in native WebGL / Three.js without heavyweight game engines:

- **Procedural 3D WALL-E Entity:**
  - Textured weathering, articulated binocular eyes with emotional curiosity tilts.
  - Functional compactor hatch door that compresses and drops solid metal cubes.
  - Photovoltaic solar array panels that physically deploy open during recharge cycles.
  - Working cutting laser and active conical radar sweep mesh.
- **Faithful Companion Hal:** WALL-E's cockroach friend scuttles alongside his tread track path.
- **Detailed EVE Model:** Sleek porcelain torso, magnetically levitating detached head, expressive cyan crescent LED eyes, plasma blaster arm, and Axiom drop-ship landing plinth with scorch blast rings.
- **Continuous Catmull-Rom Trajectory Spline:** Fluid, uninterrupted motion across waypoints without choppy step-by-step stops.
- **Dynamic Terrain Physics:** Pitch and roll computed from dunes heightmap so treads realistically contour the sand hills.
- **Cinematic Multi-Angle Cameras:**
  - 🎥 **Chase Camera:** Damped 3rd-person follow cam tracking over WALL-E's shoulder.
  - 🔄 **Free Orbit / Inspection Mode:** Unconstrained 3D orbit and zoom.
  - 🗺️ **Top-Down Tactical View:** Orthogonal map view.
- **Interactive Sci-Fi HUD:** Real-time battery indicator, Buy n Large thought-stream terminal, collected clue dossier, dynamic mini-map radar, timeline scrubber (0.5x–4x speed), and an interactive Mission Complete modal.

---

## 🧠 System Architecture & Decision Flow

```
┌─────────────────┐       ┌───────────────────────┐       ┌────────────────────────┐
│  Sense Inputs   │ ───►  │ Bayesian Belief Grid  │ ───►  │  State Machine Planner │
│ (Signal, Clues, │       │  (Update probability  │       │ (Evaluate Battery, A*, │
│    Battery)     │       │     distribution)     │       │    Retreat or Pursue)  │
└─────────────────┘       └───────────────────────┘       └────────────────────────┘
                                                                       │
                                                                       ▼
┌──────────────────────────────────────────────────┐       ┌────────────────────────┐
│               Deliverable Artifacts              │ ◄───  │    Execute Action      │
│ (Action Trace JSON, Markdown Dossier, 3D Replay) │       │ (Move, Scan, Recharge, │
│                                                  │       │       Investigate)     │
└──────────────────────────────────────────────────┘       └────────────────────────┘
```

1. **Sensor Processing:** At each tick, WALL-E reads signal strength, noisy bearing angles, and nearby physical artifacts.
2. **Bayesian Spatial Belief Grid:** Maintains a 2D probability matrix. As sensor hints and artifacts are discovered, probability density converges on the true target coordinates.
3. **Dynamic Battery Budgeting (Retreat Rule):** Before executing an action, WALL-E verifies:
   $$\text{Cost}(\text{target}) + \text{Cost}(\text{nearest sunbeam}) + \text{Safety Margin} \le \text{Current Battery}$$
   If battery is insufficient, he immediately suspends exploration, retreats to the nearest sunbeam clearing, deploys solar panels, and recharges to 85–100%.
4. **Target Acquisition:** Once belief confidence crosses the threshold (>90%), WALL-E transitions to direct pursuit to establish the directive handshake.

---

## 🚀 Step-by-Step Setup & Running Guide

### Prerequisites
- **Python 3.8+** (Uses standard library: `json`, `math`, `http.server`, `urllib`, `argparse`). No third-party pip dependencies required!
- A modern web browser with WebGL support (Chrome, Edge, Firefox, Safari).

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Rudr4nksh/WALL-E.git
cd WALL-E
```

---

### Step 2: Run a Mission Simulation

The simulation executes WALL-E's autonomous agent in the wasteland, logs full action traces, and compiles a comprehensive mission dossier report.

#### Option A: Standard Earth Mission
```bash
python run_mission.py --config configs/earth_standard.json
```

#### Option B: Dust Storm Challenge (High sand drift, scarce solar spots)
```bash
python run_mission.py --config configs/earth_dust_storm.json --trace reports/trace_dust_storm.json --report reports/report_dust_storm.md
```

#### Option C: Procedurally Generate & Solve a Brand New Random Map
```bash
python run_mission.py --random --config configs/random_mission.json
```
*(You can also pass a specific reproducible seed: `--seed 42`)*

Outputs generated:
- `reports/trace_*.json`: Full step-by-step action log, agent thoughts, battery levels, and telemetry.
- `reports/report_*.md`: Formatted reconnaissance dossier with confidence metrics, recovered artifacts, and recommended next directives.

---

### Step 3: Launch the 3D Game Visualizer

#### Method 1: The 1-Click Python Launcher (Recommended)
```bash
python launch_visualizer.py
```
This automatically bundles the latest trace logs, starts a local HTTP server, and launches your default browser at `http://localhost:8000/visualizer/index.html`.

#### Method 2: Direct Browser Launch
If Python is not running, simply double-click or open `visualizer/index.html` in Chrome or Edge. Pre-bundled missions will load instantly!

---

### Step 4: Interacting with the 3D Visualizer

| Control | Action |
| :--- | :--- |
| **Play / Pause** | Toggle simulation playback |
| **Speed Dropdown** | Switch between `0.5x`, `1.0x`, `2.0x`, and `4.0x` simulation rates |
| **Scrubber Slider** | Drag timeline to jump to any frame or tick in the mission |
| **Camera Modes** | Toggle between **🎥 Chase Cam**, **🔄 Free Orbit**, and **🗺️ Top-Down** |
| **🎲 Random Map Button** | Switch instantly to another procedurally generated wasteland mission |
| **Music Button** | Play the authentic *"Put On Your Sunday Clothes"* soundtrack |

---

## 📁 Repository Structure

```
├── configs/
│   ├── earth_standard.json       # Standard wasteland map configuration
│   ├── earth_dust_storm.json     # Low-power dust storm challenge configuration
│   └── random_*.json             # Verified procedurally generated mission configurations
├── simulation/
│   ├── environment.py            # Grid terrain, battery rules, solar clearing physics
│   ├── generator.py              # Procedural map generator with BFS solvability checks
│   └── clues.py                  # Pixar-themed movie relics & signal physics
├── agent/
│   ├── wall_e.py                 # Autonomous agent state machine & battery safety planner
│   ├── belief_map.py             # Probabilistic Bayesian belief grid
│   └── pathfinder.py             # A* navigation avoiding scrap monoliths
├── visualizer/
│   ├── index.html                # 3D Game HUD, telemetry cards, and canvas overlay
│   ├── game3d.js                 # Three.js WebGL game engine & procedural models
│   ├── style.css                 # Sci-Fi Axiom / Buy n Large interface styling
│   ├── missions_data.js          # Bundled mission trace logs for offline replay
│   └── bundle_data.py            # Bundler script packing traces into lightweight JS
├── reports/
│   ├── trace_standard.json       # Complete action & coordinate logs for standard mission
│   ├── report_standard.md        # Mission reconnaissance summary report
│   ├── trace_dust_storm.json     # Dust storm challenge trace telemetry
│   └── report_dust_storm.md      # Dust storm mission report
├── run_mission.py                # Command-line mission runner and evaluator
├── launch_visualizer.py          # 1-click web server & browser launcher
├── .gitignore                    # Python cache & temporary build artifacts
└── README.md                     # Documentation
```

---

## ⚙️ Custom Mission Configuration Specification

Custom wasteland maps can be defined in `configs/*.json`:

```json
{
  "mission_name": "Custom Wasteland Exploration",
  "map": {
    "width": 60,
    "height": 60,
    "obstacles": [{"x": 12, "y": 14}, {"x": 12, "y": 15}],
    "solar_spots": [{"x": 10, "y": 10}, {"x": 25, "y": 28}]
  },
  "agent_start": {"x": 4, "y": 4},
  "eve_target": {"x": 52, "y": 50, "status": "DORMANT_PROBE_WAITING"},
  "resource_budget": {
    "initial_battery": 100.0,
    "max_battery": 100.0,
    "max_time_steps": 250,
    "solar_recharge_rate": 20.0,
    "action_costs": {
      "move": 1.2,
      "scan": 3.0,
      "investigate": 2.5,
      "idle": 0.3
    }
  },
  "clues": [
    {
      "id": "CLUE-BOOT-PLANT",
      "x": 22,
      "y": 24,
      "type": "plant_signature",
      "description": "Living photosynthetic seedling inside vintage leather work boot.",
      "bearing_hint": "SOUTHEAST",
      "estimated_distance": 32.0
    }
  ]
}
```

---

## 📊 Sample Deliverable: Mission Dossier (`reports/report_standard.md`)

```markdown
# MISSION RECONNAISSANCE DOSSIER: DIRECTIVE A-113
- **Status:** TARGET_ACQUIRED (SUCCESS)
- **Total Exploration Ticks:** 96 cycles
- **Target Ground Truth:** (52, 50)
- **Final Inferred Coordinates:** (52, 50) [100% Pinpoint Match]
- **Target Convergence Confidence:** 99.0%
- **Battery Safety Events:** 2 recharge cycles performed in solar clearings (Min battery: 32%)
- **Relics Recovered:**
  1. Plasma scorch mark at (12, 14)
  2. Hello Dolly cassette tape at (19, 18)
  3. Vintage fire extinguisher at (31, 33)
  4. Photosynthetic vegetative seedling in work boot at (46, 44)
  5. Axiom subspace transponder beacon at (51, 49)
```

---

## 🛠️ Performance & Technical Highlights

- **GPU Instanced Rendering:** Scrap towers and girders use `THREE.InstancedMesh` with single-call matrix updates, reducing draw calls by over 75%.
- **Zero Heavyweight Dependencies:** Core agent and simulation run strictly with Python standard library modules.
- **Hardware-Accelerated Shadows:** Utilizes `PCFShadowMap` with bounded shadow camera orthographic bounds to maintain solid 60 FPS across both integrated and discrete GPUs.
- **Lightweight Trace Bundling:** Optimized JSON serialization strips redundant matrices, compressing bundled missions from >100MB to under 2.5MB.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).
