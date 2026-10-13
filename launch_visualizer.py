"""
launch_visualizer.py - 1-Click Launcher for WALL-E 3D Game Visualizer.
Starts a local web server and opens your browser directly into the 3D wasteland.
"""

import os
import sys
import webbrowser
import http.server
import socketserver

def find_open_port(start_port=8000):
    import socket
    for port in range(start_port, start_port + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    return start_port

def main():
    # Make sure trace data is bundled
    if os.path.exists("visualizer/bundle_data.py"):
        try:
            import visualizer.bundle_data as bundler
            bundler.bundle()
        except Exception as e:
            print(f"[!] Warning bundling data: {e}")

    port = find_open_port(8000)
    url = f"http://localhost:{port}/visualizer/index.html"
    print(f"\n=======================================================")
    print(f"[*] WALL-E 3D GAME VISUALIZER LAUNCHER")
    print(f"=======================================================")
    print(f"[+] Opening 3D Game in your browser: {url}")
    print(f"[+] Press Ctrl+C in this terminal when finished to exit.")
    print(f"=======================================================\n")

    # Open web browser
    webbrowser.open(url)

    # Start local HTTP server
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[+] 3D Visualizer server stopped.")

if __name__ == "__main__":
    main()
