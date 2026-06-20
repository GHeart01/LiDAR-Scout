import type { FsmState } from "./robot";

export const STATES: FsmState[] = ["IDLE", "CHASE", "AVOID"];

export const NODE_POS: Record<FsmState, { x: number; y: number }> = {
  IDLE: { x: 64, y: 105 },
  CHASE: { x: 200, y: 60 },
  AVOID: { x: 200, y: 150 },
};

export interface Transition {
  from: FsmState;
  to: FsmState;
  label: string;
}

export const TRANSITIONS: Transition[] = [
  { from: "IDLE", to: "CHASE", label: "start" },
  { from: "CHASE", to: "AVOID", label: "blocked" },
  { from: "AVOID", to: "CHASE", label: "clear" },
];
