import { create } from "zustand";

let nextId = 1;

function seedObstacles() {
  const defs = [
    { x: -8, z: -6, w: 4, d: 4 },
    { x: 9, z: 4, w: 3, d: 6 },
    { x: 2, z: 12, w: 6, d: 3 },
    { x: -11, z: 9, w: 3, d: 3 },
    { x: 7, z: -10, w: 4, d: 3 },
  ];
  return defs.map((o) => ({ id: nextId++, ...o }));
}

export const useStore = create((set) => ({
  // Operating mode
  running: false,
  paused: false,

  // Camera view: 'iso' (tilted 3D) or 'top' (top-down)
  view: "iso",

  // Discovered-map (mini-SLAM) overlay
  showMap: true,

  // Tunable parameters
  simSpeed: 1,
  driveSpeed: 6,
  sweepRate: 300,
  safeDist: 5,

  // Live readouts (mirrored from the simulation, throttled)
  fsmState: "IDLE",
  readout: { front: 0, nearest: 0, heading: 0, x: 0, z: 0 },

  // Obstacles (also rendered as meshes and used as LiDAR targets)
  obstacles: seedObstacles(),

  setParam: (key, value) => set({ [key]: value }),
  setView: (view) => set({ view }),
  setShowMap: (showMap) => set({ showMap }),
  setPaused: (paused) => set({ paused }),
  setRunning: (running) => set({ running }),
  setFsmState: (fsmState) => set({ fsmState }),
  setReadout: (readout) => set({ readout }),

  addObstacle: (o) =>
    set((s) => ({ obstacles: [...s.obstacles, { id: nextId++, w: 3.2, d: 3.2, ...o }] })),
  removeObstacle: () => set((s) => ({ obstacles: s.obstacles.slice(0, -1) })),
  setObstaclePos: (id, x, z) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) => (o.id === id ? { ...o, x, z } : o)),
    })),
  resetObstacles: () => set({ obstacles: seedObstacles() }),
}));
