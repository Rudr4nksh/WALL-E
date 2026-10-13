"""
bundle_data.py - Packs mission trace logs into visualizer/missions_data.js.
Ensures the 3D game visualizer runs smoothly even when opened directly as a file:// URL in browsers.
"""

import os
import json

def clean_trace(trace):
    """Strip bulky 2D heatmap matrix to reduce file size from 116MB to <2MB without affecting visualizer."""
    if not trace or "frames" not in trace:
        return trace
    cleaned = dict(trace)
    cleaned_frames = []
    for f in trace["frames"]:
        f_copy = {k: v for k, v in f.items() if k != "heatmap"}
        cleaned_frames.append(f_copy)
    cleaned["frames"] = cleaned_frames
    return cleaned

def bundle():
    data = {}
    
    if os.path.exists("reports/trace_standard.json"):
        with open("reports/trace_standard.json", "r", encoding="utf-8") as f:
            data["standard"] = clean_trace(json.load(f))

    if os.path.exists("reports/trace_dust_storm.json"):
        with open("reports/trace_dust_storm.json", "r", encoding="utf-8") as f:
            data["dust_storm"] = clean_trace(json.load(f))

    import glob
    for trace_file in glob.glob("reports/trace_random_*.json"):
        key = os.path.basename(trace_file).replace("trace_", "").replace(".json", "")
        with open(trace_file, "r", encoding="utf-8") as f:
            data[key] = clean_trace(json.load(f))

    out_file = "visualizer/missions_data.js"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(f"window.BUNDLED_MISSIONS = {json.dumps(data, separators=(',', ':'))};\n")
    print(f"[+] Successfully bundled mission traces into {out_file} (keys: {list(data.keys())})")

if __name__ == "__main__":
    bundle()
