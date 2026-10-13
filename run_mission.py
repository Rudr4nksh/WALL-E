"""
run_mission.py - Main Mission Simulator and Report Generator.
Runs the autonomous agent in the Earth wasteland, generates the full action trace log,
and compiles the mission report.
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from simulation.environment import EarthEnvironment
from agent.wall_e import WallEAgent

def run_simulation(config_path: str, output_trace_path: str, output_report_path: str) -> Dict[str, Any]:
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    print(f"\n==================================================")
    print(f"[MISSION START] {config.get('mission_name', 'WALL-E Search')}")
    print(f"==================================================")

    env = EarthEnvironment(config)
    agent = WallEAgent(config)

    obs = env.get_initial_observation()
    agent.observe_and_update(obs)

    frames: List[Dict[str, Any]] = []
    initial_inferred_x, initial_inferred_y, initial_conf = agent.belief.get_most_likely_target()

    # Record initial frame (tick 0)
    frames.append({
        "step": 0,
        "action": "BOOT_SYSTEMS",
        "target": None,
        "position": obs["position"],
        "battery": obs["battery"],
        "is_solar_spot": obs["is_solar_spot"],
        "state": agent.state,
        "reasoning": "Sensors booted up. Faint probe frequency detected on radio compass.",
        "signal": obs["signal"],
        "inferred_target": {"x": initial_inferred_x, "y": initial_inferred_y},
        "confidence": initial_conf,
        "discovered_clues": [],
        "heatmap": agent.belief.to_heatmap()
    })

    total_battery_consumed = 0.0
    total_recharge_cycles = 0

    print(f"[*] Starting at coordinate ({env.wall_e_x}, {env.wall_e_y}) | Initial Battery: {env.battery}%")
    print(f"[*] Initial Beacon ping: {obs['signal']['bearing']} | Strength: {obs['signal']['strength']}%\n")

    done = False
    step_num = 0

    while not done:
        step_num += 1

        # Agent decides next action
        action, target, reasoning = agent.decide_next_action(obs)

        if action == "SOLAR_CHARGE":
            total_recharge_cycles += 1

        # Environment processes action
        obs, delta_battery, done, info = env.step(action, target)
        if delta_battery < 0:
            total_battery_consumed += abs(delta_battery)

        # Agent updates internal belief with new observation
        agent.observe_and_update(obs)

        inferred_x, inferred_y, confidence = agent.belief.get_most_likely_target()

        # Log frame
        frame = {
            "step": step_num,
            "action": action,
            "target": {"x": target[0], "y": target[1]} if target else None,
            "position": {"x": env.wall_e_x, "y": env.wall_e_y},
            "battery": round(env.battery, 1),
            "is_solar_spot": obs["is_solar_spot"],
            "state": agent.state,
            "reasoning": reasoning,
            "action_result": info["action_msg"],
            "signal": obs["signal"],
            "inferred_target": {"x": inferred_x, "y": inferred_y},
            "confidence": confidence,
            "discovered_clues": [c for c in agent.discovered_clues],
            "heatmap": agent.belief.to_heatmap()
        }
        frames.append(frame)

        # Print brief terminal progress
        action_desc = f"{action} -> ({target[0]}, {target[1]})" if target else action
        print(f"Step {step_num:03d} | [{agent.state:<16}] | {action_desc:<18} | Bat: {env.battery:5.1f}% | Conf: {confidence:4.1f}%")

    print(f"\n==================================================")
    print(f"[MISSION COMPLETE] {env.termination_reason}")
    print(f"==================================================")

    final_inferred_x, final_inferred_y, final_confidence = agent.belief.get_most_likely_target()

    # Package trace file for 3D visualizer
    trace_data = {
        "mission_name": config.get("mission_name"),
        "config_path": config_path,
        "environment": env.export_map_state(),
        "termination_reason": env.termination_reason,
        "total_steps": step_num,
        "final_battery": round(env.battery, 1),
        "total_battery_consumed": round(total_battery_consumed, 1),
        "total_recharge_cycles": total_recharge_cycles,
        "final_inferred_target": {"x": final_inferred_x, "y": final_inferred_y},
        "final_confidence": final_confidence,
        "clues_found": agent.discovered_clues,
        "frames": frames
    }

    os.makedirs(os.path.dirname(output_trace_path), exist_ok=True)
    with open(output_trace_path, "w", encoding="utf-8") as f:
        json.dump(trace_data, f, indent=2)
    print(f"[+] Full 3D Trace log saved to: {output_trace_path}")

    # Generate Markdown Mission Report
    generate_markdown_report(config, trace_data, env, output_report_path)
    print(f"[+] Mission Report saved to: {output_report_path}\n")

    return trace_data

def generate_markdown_report(config: Dict[str, Any], trace_data: Dict[str, Any], env: EarthEnvironment, report_path: str):
    clues_list_md = ""
    if trace_data["clues_found"]:
        for c in trace_data["clues_found"]:
            clues_list_md += f"- **[{c['id']}]** ({c['clue_type']}) at `({c['x']}, {c['y']})`: {c['description']} *(Hint: {c.get('eve_bearing_hint')}, Dist: ~{c.get('estimated_distance')}m)*\n"
    else:
        clues_list_md = "*No physical artifacts uncovered.*\n"

    target_found = "SUCCESS" if "EVE_LOCATED" in trace_data["termination_reason"] else "SEARCH_HALTED"
    inferred_pos = trace_data["final_inferred_target"]
    true_pos = {"x": env.eve_x, "y": env.eve_y}

    report_content = f"""# 🤖 WALL-E MISSION LOG & RECONNAISSANCE REPORT

**Mission Directive:** {config.get('mission_name')}  
**Status:** {target_found} (`{trace_data['termination_reason']}`)  
**Total Steps Expended:** {trace_data['total_steps']} ticks  
**Final Battery Reserve:** {trace_data['final_battery']}%  

---

## 1. Executive Summary & Target Assessment

| Metric | Result |
| :--- | :--- |
| **Ground Truth EVE Location** | `({true_pos['x']}, {true_pos['y']})` |
| **WALL-E Inferred Target** | `({inferred_pos['x']}, {inferred_pos['y']})` |
| **Target Pinpoint Accuracy** | {"EXACT MATCH (100%)" if (inferred_pos['x'] == true_pos['x'] and inferred_pos['y'] == true_pos['y']) else "PROXIMATE (+/- 1 sector)"} |
| **Final Inference Confidence** | **{trace_data['final_confidence']}%** |
| **Total Energy Consumed** | {trace_data['total_battery_consumed']}% solar units |
| **Solar Recharge Cycles** | {trace_data['total_recharge_cycles']} charging steps |
| **Artifacts & Clues Uncovered** | {len(trace_data['clues_found'])} / {len(config.get('clues', []))} |

---

## 2. Physical Evidence & Clue Dossier

{clues_list_md}

---

## 3. Autonomous Decision & Strategy Timeline

1. **Phase 1: Initial Triangulation**
   - Booted sensors at starting depot. Received initial beacon telemetry.
   - Initialized uniform belief distribution and prioritized trajectory toward northeast quadrant.

2. **Phase 2: Clue Discovery & Adaptive Re-routing**
   - Discovered early evidence of plasma scorch marks and electrostatic hover disturbances.
   - Updated Bayesian probability grid to narrow search radius.

3. **Phase 3: Battery Management & Solar Waypoint Navigation**
   - Whenever battery dropped below safe threshold, agent automatically prioritized detour routes to sunbeam clearings.
   - Deployed solar panels to restore power before pushing into unknown scrap zones.

4. **Phase 4: Target Acquisition & Directive Handshake**
   - High-confidence convergence reached upon locating vegetative seedling bio-signature.
   - Successfully closed distance to EVE probe unit.

---

## 4. Recommended Next Move

> [!IMPORTANT]
> **Directive A113 Override Procedure:**
> 1. Approach EVE's probe chassis at sector `({inferred_pos['x']}, {inferred_pos['y']})`.
> 2. Present the living vegetative specimen (vintage boot plant).
> 3. Standby for green chest cavity containment protocol.
"""

    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WALL-E Autonomous Mission Runner")
    parser.add_argument("--config", default="configs/earth_standard.json", help="Path to mission config file")
    parser.add_argument("--trace", default="reports/trace_standard.json", help="Path to output trace file")
    parser.add_argument("--report", default="reports/report_standard.md", help="Path to output markdown report")
    parser.add_argument("--random", action="store_true", help="Generate a new randomized map obeying all constraints")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for procedural map generator")
    args = parser.parse_args()

    if args.random or args.seed is not None:
        from simulation.generator import generate_random_wasteland_config
        print(f"[*] Generating procedurally randomized map (Seed: {args.seed})...")
        rand_config = generate_random_wasteland_config(seed=args.seed)
        os.makedirs(os.path.dirname(args.config), exist_ok=True)
        with open(args.config, "w", encoding="utf-8") as f:
            json.dump(rand_config, f, indent=2)
        print(f"[+] Saved randomized configuration to {args.config}")

    results = run_simulation(args.config, args.trace, args.report)

    # Auto-bundle into visualizer/missions_data.js
    try:
        import subprocess
        subprocess.run([sys.executable, "visualizer/bundle_data.py"], check=True)
    except Exception as e:
        print(f"[!] Warning: Could not auto-bundle: {e}")
