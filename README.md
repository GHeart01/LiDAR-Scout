# LiDAR Scout

A browser-based, top-down **sweeping-LiDAR robot simulator** built with
[Three.js](https://threejs.org/). A robot drives autonomously around a walled
arena, sweeps a 360° LiDAR to measure distances to obstacles, and navigates
using a small finite state machine (FSM). You can drag the robot and obstacles
around in real time and watch the distance readings and FSM state update live.

## Features

- **Top-down 3D scene** rendered with an orthographic Three.js camera.
- **Sweeping LiDAR** — one ray cast per degree as the beam rotates, building a
  persistent polar distance map. The active beam and every hit point are drawn
  in the scene.
- **Autonomous robot** driven by an FSM: `IDLE → SCAN → DRIVE → AVOID`.
- **Live state diagram** — an SVG render of the FSM that highlights the current
  state and labels every transition.
- **Polar radar plot** of the current scan, oriented to the robot's heading.
- **Interactive** — drag the robot or any obstacle with the mouse; add/remove
  obstacles; tune sim speed, drive speed, sweep rate, and the safety distance.
- **HUD** showing state, front clearance, nearest hit, heading, and position.

## Running it

The app uses ES modules and an import map, so it must be served over HTTP
(opening `index.html` directly via `file://` will be blocked by the browser).

From the project root:

```bash
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

Three.js itself is loaded from a CDN (`unpkg`), so an internet connection is
required on first load.

## How it works

| File             | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `index.html`     | Layout: viewport, HUD, control panel, FSM diagram, radar canvas.      |
| `js/main.js`     | Scene/camera setup, arena, dragging, UI wiring, the FSM behavior, and the render loop. |
| `js/robot.js`    | Robot mesh, heading/forward kinematics, safety ring.                  |
| `js/lidar.js`    | Sweeping raycast, polar distance map, point cloud, sector queries.    |
| `js/fsm.js`      | State + transition definitions (data only).                           |
| `js/diagram.js`  | SVG state-diagram renderer with active-state highlighting.            |
| `js/radar.js`    | 2D polar plot of the live scan.                                       |

### FSM logic

- **IDLE** — stationary; waiting for *Start*.
- **SCAN** — holds position briefly so the LiDAR can refresh the forward sector,
  then branches to `DRIVE` (path clear) or `AVOID` (blocked).
- **DRIVE** — moves forward; re-scans periodically; switches to `AVOID` when the
  front clearance drops below the safety distance.
- **AVOID** — rotates in place toward the most open direction (max LiDAR
  clearance) until the front is clear, then resumes driving.

## Controls

- **Start / Stop** — engage or disengage autonomy.
- **Reset** — recenter the robot and regenerate obstacles.
- **Pause** — freeze the simulation.
- **＋ / － Obstacle** — add a random obstacle or remove the last one.
- **Sliders** — sim speed, drive speed, LiDAR sweep rate, safety distance.
- **Drag** — click and drag the robot or any obstacle to reposition it.
