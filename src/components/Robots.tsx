import { useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA, DEG } from "../sim/constants";
import { world } from "../sim/instance";
import { useStore } from "../store";
import VehicleModel from "./Vehicles";

const GROUND = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const HIT = new THREE.Vector3();
const FADE = 1.6;
const WEDGE = 70;
const MAX_PATH = 600;

function clamp(v: number): number {
  const lim = ARENA - 1.6;
  return THREE.MathUtils.clamp(v, -lim, lim);
}

function circleGeometry(radius: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// Fading hit cloud + phosphor sweep + active beam for one robot.
function RobotLidar({ index }: { index: number }) {
  const color = useMemo(() => new THREE.Color(world.robots[index]?.color ?? "#2dd4bf"), [index]);

  const points = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(360 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(360 * 3), 3));
    const m = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false, vertexColors: true, toneMapped: false });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    return p;
  }, []);

  const wedge = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(WEDGE * 3 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(WEDGE * 3 * 4), 4));
    const m = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    return mesh;
  }, []);

  const beam = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, toneMapped: false }));
    l.frustumCulled = false;
    return l;
  }, [color]);

  useFrame(() => {
    const r = world.robots[index];
    if (!r) return;
    const now = world.time;
    const ox = r.position.x;
    const oz = r.position.z;

    const pp = points.geometry.attributes.position.array as Float32Array;
    const pc = points.geometry.attributes.color.array as Float32Array;
    let n = 0;
    for (let d = 0; d < 360; d++) {
      if (!r.valid[d]) continue;
      const f = Math.max(0, 1 - (now - r.hitTime[d]) / FADE);
      const b = 0.35 + 1.4 * f;
      pp[n * 3] = r.hitX[d];
      pp[n * 3 + 1] = 0.25;
      pp[n * 3 + 2] = r.hitZ[d];
      pc[n * 3] = 0.99 * b;
      pc[n * 3 + 1] = 0.82 * b;
      pc[n * 3 + 2] = 0.15 * b;
      n++;
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.geometry.attributes.color.needsUpdate = true;
    points.geometry.setDrawRange(0, n);

    const wp = wedge.geometry.attributes.position.array as Float32Array;
    const wc = wedge.geometry.attributes.color.array as Float32Array;
    const cur = r.angleDeg;
    let vp = 0;
    let vc = 0;
    const push = (x: number, z: number, alpha: number) => {
      wp[vp++] = x; wp[vp++] = 0.2; wp[vp++] = z;
      wc[vc++] = color.r * 1.4; wc[vc++] = color.g * 1.4; wc[vc++] = color.b * 1.4; wc[vc++] = alpha;
    };
    for (let i = 0; i < WEDGE; i++) {
      const d0 = (((cur - i) % 360) + 360) % 360;
      const d1 = (((cur - i - 1) % 360) + 360) % 360;
      const a0 = d0 * DEG;
      const a1 = d1 * DEG;
      const r0 = r.valid[d0] ? r.distances[d0] : r.maxRange;
      const r1 = r.valid[d1] ? r.distances[d1] : r.maxRange;
      const al0 = 0.4 * (1 - i / WEDGE);
      const al1 = 0.4 * (1 - (i + 1) / WEDGE);
      push(ox, oz, (al0 + al1) * 0.5);
      push(ox + Math.cos(a0) * r0, oz + Math.sin(a0) * r0, al0);
      push(ox + Math.cos(a1) * r1, oz + Math.sin(a1) * r1, al1);
    }
    wedge.geometry.attributes.position.needsUpdate = true;
    wedge.geometry.attributes.color.needsUpdate = true;
    wedge.geometry.setDrawRange(0, WEDGE * 3);

    const a = cur * DEG;
    const dist = r.valid[cur] ? r.distances[cur] : r.maxRange;
    const bp = beam.geometry.attributes.position.array as Float32Array;
    bp[0] = ox; bp[1] = 0.26; bp[2] = oz;
    bp[3] = ox + Math.cos(a) * dist; bp[4] = 0.26; bp[5] = oz + Math.sin(a) * dist;
    beam.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <primitive object={wedge} />
      <primitive object={points} />
      <primitive object={beam} />
    </>
  );
}

// Planned A* path for one robot, drawn through cell centres.
function PathLine({ index }: { index: number }) {
  const color = useMemo(() => new THREE.Color(world.robots[index]?.color ?? "#2dd4bf"), [index]);
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PATH * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false }));
    l.frustumCulled = false;
    return l;
  }, [color]);

  useFrame(() => {
    const r = world.robots[index];
    const arr = line.geometry.attributes.position.array as Float32Array;
    if (!r || !r.path) {
      line.geometry.setDrawRange(0, 0);
      return;
    }
    const count = Math.min(r.path.length, MAX_PATH);
    for (let i = 0; i < count; i++) {
      const c = world.grid.cellCenter(r.path[i].cx, r.path[i].cz);
      arr[i * 3] = c.x;
      arr[i * 3 + 1] = 0.15;
      arr[i * 3 + 2] = c.z;
    }
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.setDrawRange(0, count);
  });

  return <primitive object={line} />;
}

function RobotView({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.LineLoop>(null);
  const dragging = useRef(false);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | undefined;
  const selected = useStore((s) => s.selectedRobot === index);
  const vehicle = useStore((s) => s.vehicle);
  const setSelectedRobot = useStore((s) => s.setSelectedRobot);

  const robot = world.robots[index];
  const ringGeom = useMemo(() => circleGeometry(1.7), []);
  const color = robot?.color ?? "#2dd4bf";

  useFrame(() => {
    const r = world.robots[index];
    if (!r || !group.current) return;
    group.current.position.set(r.position.x, 0, r.position.z);
    group.current.rotation.y = -r.heading;
    if (ring.current) ring.current.position.set(r.position.x, 0.06, r.position.z);
  });

  if (!robot) return null;

  const grab = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setSelectedRobot(index);
    dragging.current = true;
    if (controls) controls.enabled = false;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const release = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = false;
    if (controls) controls.enabled = true;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    const r = world.robots[index];
    if (!r) return;
    e.ray.intersectPlane(GROUND, HIT);
    r.position.x = clamp(HIT.x);
    r.position.z = clamp(HIT.z);
  };

  return (
    <>
      <group ref={group} onPointerDown={grab} onPointerUp={release} onPointerMove={move}>
        <VehicleModel type={vehicle} index={index} color={color} selected={selected} />
      </group>

      {selected && (
        <lineLoop ref={ring} geometry={ringGeom}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
        </lineLoop>
      )}

      <PathLine index={index} />
      <RobotLidar index={index} />
    </>
  );
}

export default function Robots() {
  const robotCount = useStore((s) => s.robotCount);
  return (
    <group>
      {Array.from({ length: robotCount }, (_, i) => (
        <RobotView key={i} index={i} />
      ))}
    </group>
  );
}
