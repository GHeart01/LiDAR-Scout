import * as THREE from "three";
import { World } from "./world";

// Single shared world for the app.
export const world = new World();

// Registry helpers for meshes the LiDAR raycasts against (walls + obstacles).
export function addTarget(obj: THREE.Object3D | null | undefined): void {
  if (obj && !world.targets.includes(obj)) world.targets.push(obj);
}

export function removeTarget(obj: THREE.Object3D | null | undefined): void {
  if (!obj) return;
  const i = world.targets.indexOf(obj);
  if (i >= 0) world.targets.splice(i, 1);
}
