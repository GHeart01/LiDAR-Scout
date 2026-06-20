// Finite state machine for the scout robot.
//
//   IDLE  --start-->  SCAN
//   SCAN  --clear-->  DRIVE
//   SCAN  --blocked-> AVOID
//   DRIVE --obstacle->AVOID
//   DRIVE --rescan--> SCAN
//   AVOID --clear-->  DRIVE
//   DRIVE --stop----> IDLE
//
// The class only holds state + transition metadata (consumed by the diagram).
// Behavior for each state lives in main.js where the robot/lidar are in scope.
export class RobotFSM {
  constructor() {
    this.states = ["IDLE", "SCAN", "DRIVE", "AVOID"];
    this.transitions = [
      { from: "IDLE", to: "SCAN", label: "start" },
      { from: "SCAN", to: "DRIVE", label: "clear" },
      { from: "SCAN", to: "AVOID", label: "blocked" },
      { from: "DRIVE", to: "AVOID", label: "obstacle" },
      { from: "DRIVE", to: "SCAN", label: "rescan" },
      { from: "AVOID", to: "DRIVE", label: "clear" },
      { from: "DRIVE", to: "IDLE", label: "stop" },
    ];
    this.state = "IDLE";
    this.prev = null;
    this.timer = 0; // seconds spent in the current state
    this._listeners = [];
  }

  onChange(cb) {
    this._listeners.push(cb);
  }

  set(state) {
    if (state === this.state) return;
    this.prev = this.state;
    this.state = state;
    this.timer = 0;
    for (const cb of this._listeners) cb(state, this.prev);
  }

  tick(dt) {
    this.timer += dt;
  }
}
