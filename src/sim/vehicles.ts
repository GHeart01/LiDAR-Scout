// Vehicle types and their kinematic characteristics. Exploration/planning is
// vehicle-agnostic; the type only changes the model and how it moves/turns.
export type VehicleType = "rover" | "drone" | "car" | "humanoid";

export interface VehicleSpec {
  label: string;
  turnRate: number; // degrees / second
  speedScale: number; // multiplier on the configured drive speed
}

export const VEHICLES: Record<VehicleType, VehicleSpec> = {
  rover: { label: "Rover", turnRate: 150, speedScale: 1 },
  drone: { label: "Drone", turnRate: 240, speedScale: 1.4 },
  car: { label: "Car", turnRate: 85, speedScale: 1.2 },
  humanoid: { label: "Humanoid", turnRate: 170, speedScale: 0.7 },
};

export const VEHICLE_TYPES = ["rover", "drone", "car", "humanoid"] as const;
