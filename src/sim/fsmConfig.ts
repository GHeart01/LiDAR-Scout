import type { FsmState } from "./robot";

export const STATES: FsmState[] = ["IDLE", "PLAN", "NAV", "AVOID", "DONE"];

export const NODE_POS: Record<FsmState, { x: number; y: number }> = {
  IDLE: { x: 52, y: 105 },
  PLAN: { x: 150, y: 48 },
  NAV: { x: 292, y: 60 },
  AVOID: { x: 300, y: 150 },
  DONE: { x: 150, y: 162 },
};

export interface Transition {
  from: FsmState;
  to: FsmState;
  label: string;
}

export const TRANSITIONS: Transition[] = [
  { from: "IDLE", to: "PLAN", label: "start" },
  { from: "PLAN", to: "NAV", label: "path" },
  { from: "PLAN", to: "DONE", label: "explored" },
  { from: "NAV", to: "AVOID", label: "blocked" },
  { from: "NAV", to: "PLAN", label: "replan" },
  { from: "AVOID", to: "PLAN", label: "clear" },
];
