// FSM presentation data for the state diagram.
export const STATES = ["IDLE", "SCAN", "DRIVE", "AVOID"];

export const NODE_POS = {
  IDLE: { x: 56, y: 105 },
  SCAN: { x: 180, y: 46 },
  DRIVE: { x: 304, y: 105 },
  AVOID: { x: 180, y: 164 },
};

export const TRANSITIONS = [
  { from: "IDLE", to: "SCAN", label: "start" },
  { from: "SCAN", to: "DRIVE", label: "clear" },
  { from: "SCAN", to: "AVOID", label: "blocked" },
  { from: "DRIVE", to: "AVOID", label: "obstacle" },
  { from: "DRIVE", to: "SCAN", label: "rescan" },
  { from: "AVOID", to: "DRIVE", label: "clear" },
  { from: "DRIVE", to: "IDLE", label: "stop" },
];
