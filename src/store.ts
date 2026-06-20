import { create } from "zustand";
import type { FsmState } from "./sim/robot";
import type { RendererMode, Backend } from "./renderer";
import { SCENARIOS, type ObstacleDef, type ScenarioName } from "./scenarios";
import type { VehicleType } from "./sim/vehicles";

let nextId = 1;

const RMODE_KEY = "lidar-renderer-mode";
function initialRendererMode(): RendererMode {
  try {
    const v = localStorage.getItem(RMODE_KEY);
    if (v === "auto" || v === "webgpu" || v === "webgl") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

export interface Obstacle extends ObstacleDef {
  id: number;
}

function obstaclesFrom(scenario: ScenarioName): Obstacle[] {
  return SCENARIOS[scenario].map((o) => ({ id: nextId++, ...o }));
}

export interface Readout {
  state: FsmState;
  front: number;
  nearest: number;
  heading: number;
  x: number;
  z: number;
}

export type NumericParam =
  | "simSpeed"
  | "driveSpeed"
  | "sweepRate"
  | "safeDist"
  | "sensorRange"
  | "fovDeg"
  | "beams"
  | "noiseStd"
  | "dropout";

const HISTORY = 120;

interface StoreState {
  running: boolean;
  paused: boolean;
  view: "iso" | "top";
  showMap: boolean;

  // tunables
  simSpeed: number;
  driveSpeed: number;
  sweepRate: number;
  safeDist: number;
  sensorRange: number;
  fovDeg: number;
  beams: number;
  noiseStd: number;
  dropout: number;

  robotCount: number;
  selectedRobot: number;
  vehicle: VehicleType;
  scenario: ScenarioName;
  obstacles: Obstacle[];

  // live readouts (per robot)
  readouts: Readout[];
  coverage: number;
  fps: number;
  coverageHistory: number[];
  frontHistories: number[][];

  // renderer
  rendererMode: RendererMode;
  webgpuAvailable: boolean | null;
  activeBackend: Backend;

  setParam: (key: NumericParam, value: number) => void;
  setView: (view: "iso" | "top") => void;
  setShowMap: (showMap: boolean) => void;
  setPaused: (paused: boolean) => void;
  setRunning: (running: boolean) => void;
  setSelectedRobot: (i: number) => void;
  setRobotCount: (n: number) => void;
  setVehicle: (v: VehicleType) => void;
  setScenario: (s: ScenarioName) => void;
  addObstacle: (o: ObstacleDef) => void;
  removeObstacle: () => void;
  setObstaclePos: (id: number, x: number, z: number) => void;
  loadScenario: (s: ScenarioName) => void;
  setReadouts: (r: Readout[]) => void;
  setStats: (coverage: number, fps: number) => void;
  pushTelemetry: (coveragePct: number, fronts: number[]) => void;
  resetTelemetry: () => void;
  setRendererMode: (m: RendererMode) => void;
  setWebgpuAvailable: (b: boolean) => void;
  setActiveBackend: (b: Backend) => void;
}

export const useStore = create<StoreState>((set) => ({
  running: false,
  paused: false,
  view: "iso",
  showMap: true,

  simSpeed: 1,
  driveSpeed: 6,
  sweepRate: 300,
  safeDist: 4,
  sensorRange: 30,
  fovDeg: 360,
  beams: 360,
  noiseStd: 0.05,
  dropout: 0.02,

  robotCount: 2,
  selectedRobot: 0,
  vehicle: "rover",
  scenario: "Scatter",
  obstacles: obstaclesFrom("Scatter"),

  readouts: [],
  coverage: 0,
  fps: 0,
  coverageHistory: [],
  frontHistories: [],

  rendererMode: initialRendererMode(),
  webgpuAvailable: null,
  activeBackend: "webgl",

  setParam: (key, value) => set({ [key]: value } as Partial<StoreState>),
  setView: (view) => set({ view }),
  setShowMap: (showMap) => set({ showMap }),
  setPaused: (paused) => set({ paused }),
  setRunning: (running) => set({ running }),
  setSelectedRobot: (selectedRobot) => set({ selectedRobot }),
  setRobotCount: (robotCount) => set({ robotCount }),
  setVehicle: (vehicle) => set({ vehicle }),
  setScenario: (scenario) => set({ scenario }),

  addObstacle: (o) => set((s) => ({ obstacles: [...s.obstacles, { id: nextId++, ...o }] })),
  removeObstacle: () => set((s) => ({ obstacles: s.obstacles.slice(0, -1) })),
  setObstaclePos: (id, x, z) =>
    set((s) => ({ obstacles: s.obstacles.map((o) => (o.id === id ? { ...o, x, z } : o)) })),
  loadScenario: (scenario) => set({ scenario, obstacles: obstaclesFrom(scenario) }),

  setReadouts: (readouts) => set({ readouts }),
  setStats: (coverage, fps) => set({ coverage, fps }),
  pushTelemetry: (coveragePct, fronts) =>
    set((s) => ({
      coverageHistory: [...s.coverageHistory.slice(-(HISTORY - 1)), coveragePct],
      frontHistories: fronts.map((f, i) => [...(s.frontHistories[i] ?? []).slice(-(HISTORY - 1)), f]),
    })),
  resetTelemetry: () => set({ coverageHistory: [], frontHistories: [] }),

  setRendererMode: (rendererMode) => {
    try {
      localStorage.setItem(RMODE_KEY, rendererMode);
    } catch {
      /* ignore */
    }
    set({ rendererMode });
  },
  setWebgpuAvailable: (webgpuAvailable) => set({ webgpuAvailable }),
  setActiveBackend: (activeBackend) => set({ activeBackend }),
}));
