# LiDAR Scout

[![CI](https://github.com/GHeart01/LiDAR-Scout/actions/workflows/ci.yml/badge.svg)](https://github.com/GHeart01/LiDAR-Scout/actions/workflows/ci.yml)

![preview](image.png "Preview Image")

A **multi-robot LiDAR pursuit simulator** built with **React Three Fiber +
TypeScript**. Four Pac-Man-coloured robots sweep a noisy 360° LiDAR, build a
shared occupancy map, and **chase a roaming yellow "prey" light** using **A\*
path planning** — all rendered in a cinematic 3D scene with per-robot telemetry
and finite-state-machine views.

## Features

- **Autonomous pursuit** — four ghost-coloured robots (**Red, Pink, Cyan,
  Orange**) chase a glowing yellow light that wanders the arena, dodges
  obstacles, and flees its pursuers. Each colour targets differently
  (Pac-Man-style): **Red is the smartest**, predicting the prey's path and
  re-planning fastest; Pink ambushes ahead; Cyan chases directly; Orange
  scatters when close. They never stop — catching the prey just respawns it.
- **A\* path planning** with obstacle inflation (robot-radius clearance) so
  robots route around walls/objects instead of clipping them.
- **Multiple robots (1–4)** sharing one occupancy grid (collaborative mapping)
  with simple inter-robot collision avoidance.
- **Selectable vehicles** — Rover, Drone (hovering quad-rotor), Car (rolling
  wheels), and Humanoid (walking) — each with its own model, animation, and
  kinematics (turn rate / speed).
- **Realistic LiDAR sensor model** — configurable range, field of view, angular
  resolution (beam count), Gaussian range noise, and dropout.
- **Occupancy-grid SLAM-lite** — ray-traced free/occupied cells build a
  persistent glowing map with a fog-of-war veil over unexplored floor.
- **Live telemetry** — map-coverage and front-clearance sparklines, plus an FPS
  / coverage HUD.
- **Scenario presets** — Scatter / Maze / Warehouse / Room layouts.
- **Per-robot panels** — a live FSM diagram (`IDLE → CHASE → AVOID`), LiDAR scan
  radar, and front-clearance telemetry for **every** robot.
- **Cinematic rendering** — bloom + vignette, reflective floor, contact shadows,
  atmospheric fog; tilted 3D (orbit/zoom) or top-down camera.
- **Interactive** — click to select a robot, drag robots/obstacles, switch
  scenarios, tune every sensor and motion parameter live.
- **TypeScript throughout**, **unit-tested** core algorithms, and **CI**.

## Tech stack

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [drei](https://github.com/pmndrs/drei) + [postprocessing](https://github.com/pmndrs/react-postprocessing)
- [three](https://threejs.org/), [zustand](https://github.com/pmndrs/zustand)
- [Vitest](https://vitest.dev/) for unit tests, GitHub Actions for CI

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173

npm run typecheck  # tsc --noEmit
npm test           # vitest (algorithmic core)
npm run build      # typecheck + production build
```

## Architecture

A framework-agnostic TypeScript simulation core drives everything; React Three
Fiber components read it each frame, and DOM panels read mirrored state from a
zustand store.

```
src/
├─ sim/                       Pure TypeScript simulation core (no React)
│  ├─ world.ts                World: N robots, shared grid, raycast targets
│  ├─ robot.ts                Per-robot pose, LiDAR buffers, FSM behaviour
│  ├─ grid.ts                 Occupancy grid: ray tracing, frontiers, coverage
│  ├─ planner.ts              A* path planning (octile heuristic, 8-connected)
│  ├─ explorer.ts             Frontier selection (multi-robot claim-aware)
│  ├─ sensor.ts               Sensor model: noise, dropout, FOV
│  ├─ rng.ts                  Deterministic PRNG (reproducible sims/tests)
│  ├─ *.test.ts               Vitest unit tests (grid / planner / explorer / sensor)
│  └─ instance.ts             Shared world singleton + target registry
├─ components/                React Three Fiber + DOM UI
│  ├─ Scene.tsx               Canvas, camera rig, post-processing
│  ├─ Robots.tsx              Robot meshes, per-robot LiDAR, planned-path lines
│  ├─ DiscoveredMap.tsx       Shared occupancy cloud + fog-of-war
│  ├─ Arena / Obstacles       Reflective floor, walls, draggable boxes
│  ├─ SimulationRunner.tsx    useFrame: steps the world, mirrors telemetry
│  ├─ Telemetry / Hud / Radar / FSMDiagram / Controls / ViewToggle
│  └─ RendererBoundary.tsx    WebGPU→WebGL fallback boundary
├─ store.ts                   zustand: params, obstacles, telemetry, readouts
├─ scenarios.ts               Obstacle presets
└─ renderer.ts                Renderer backend detection (see below)
```

### How the chase works

1. **SCAN (always on):** each robot's sweeping LiDAR ray-traces the shared grid,
   marking cells free along each beam and occupied at hits (with sensor noise).
2. **CHASE:** the robot computes a goal from the prey (its colour's targeting
   rule), runs **A\*** (with robot-radius obstacle inflation) toward it, and
   follows the path — re-planning continuously as the prey moves.
3. **AVOID:** if something enters its safety radius it rotates toward the most
   open bearing, then resumes the chase.
4. The robots never finish; catching the prey simply respawns it elsewhere.

## Renderer (WebGPU / WebGL)

The scene runs on the **classic WebGL renderer**, required by the bloom,
reflective floor, and contact-shadow effects. WebGPU is scaffolded (capability
detection + a graceful WebGL fallback boundary) but gated behind `WEBGPU_ENABLED`
in `src/renderer.ts`, because three.js ships two mutually exclusive builds
(`three` with `WebGLRenderer` vs `three/webgpu` with `WebGPURenderer`). Enabling
WebGPU means porting the effects to three's TSL/node pipeline first.

## Controls

- **Explore / Stop** — start or stop autonomy. **Reset** — clear the map and
  re-place robots. **Pause** — freeze the sim.
- **Scenario** — Scatter / Maze / Warehouse / Room. **Vehicle** — Rover / Drone
  / Car / Humanoid. **Robots** — 1–4.
- **Discovered map** — toggle the occupancy overlay.
- **Sliders** — sim/drive speed, safety distance, and the full sensor model
  (range, sweep rate, resolution, FOV, noise, dropout).
- **Click** a robot to select it (drives the HUD, radar, and FSM diagram);
  **drag** robots or obstacles; **drag empty space** to orbit, **scroll** to zoom.
