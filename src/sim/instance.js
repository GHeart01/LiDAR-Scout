import { Simulation } from "./Simulation.js";

// Single shared simulation for the app (one canvas / one robot).
export const simulation = new Simulation();

// Registry of THREE.Mesh objects the LiDAR raycasts against (walls + obstacles).
export const targets = [];

export function addTarget(obj) {
  if (obj && !targets.includes(obj)) targets.push(obj);
}

export function removeTarget(obj) {
  const i = targets.indexOf(obj);
  if (i >= 0) targets.splice(i, 1);
}
