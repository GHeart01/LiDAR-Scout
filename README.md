# LiDAR Scout

A **React + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)**
top-down **sweeping-LiDAR robot simulator**. A robot drives autonomously around
a walled arena, sweeps a 360° LiDAR to measure distances to obstacles, and
navigates using a small finite state machine (FSM). Drag the robot and obstacles
around in real time and watch the distance readings, polar radar, and FSM state
update live.

## Features

- **Top-down 3D scene** rendered with R3F + an orthographic Three.js camera.
- **Sweeping LiDAR** — one ray cast per degree as the beam rotates, building a
  persistent polar distance map. The active beam and every hit point are drawn
  in the scene.
- **Autonomous robot** driven by an FSM: `IDLE → SCAN → DRIVE → AVOID`.
- **Live SVG state diagram** that highlights the current state and labels every
  transition.
- **Polar radar plot** of the current scan, oriented to the robot's heading.
- **Interactive** — drag the robot or any obstacle; add/remove obstacles; tune
  sim speed, drive speed, sweep rate, and the safety distance.
- **HUD** showing state, front clearance, nearest hit, heading, and position.

## Tech stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) (Three.js renderer for React)
- [three](https://threejs.org/)
- [zustand](https://github.com/pmndrs/zustand) for app/UI state

## Getting started

```bash
npm install
npm run dev      # start the Vite dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Architecture

The 3D scene is fully declarative React Three Fiber. A framework-agnostic
`Simulation` holds the robot, LiDAR, and FSM state; R3F components sync their
meshes to it each frame via `useFrame`, and UI panels read mirrored values from
a zustand store.

```
src/
├─ main.jsx                 React entry
├─ App.jsx                  Layout: viewport (Canvas + HUD) + sidebar
├─ store.js                 zustand store: params, obstacles, readouts
├─ styles.css
├─ sim/
│  ├─ Simulation.js         Robot + LiDAR + FSM logic (no React)
│  ├─ instance.js           Shared simulation singleton + raycast target registry
│  ├─ constants.js          Arena size, camera view size
│  └─ fsmConfig.js          State diagram nodes/transitions
└─ components/
   ├─ Scene.jsx             <Canvas>, ortho camera rig, assembles the scene
   ├─ SimulationRunner.jsx  useFrame: steps the sim, mirrors readouts to store
   ├─ Arena.jsx             Floor, grid, walls (LiDAR targets)
   ├─ Obstacles.jsx         Draggable obstacle boxes (LiDAR targets)
   ├─ Robot.jsx             Robot mesh + safety ring; draggable
   ├─ LidarVisuals.jsx      Hit-point cloud + active beam
   ├─ Hud.jsx               Overlay readouts + legend
   ├─ Controls.jsx          Buttons + sliders
   ├─ FSMDiagram.jsx        Live SVG state diagram
   └─ Radar.jsx             2D polar scan plot
```

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
