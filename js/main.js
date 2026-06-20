import * as THREE from "three";
import { Robot } from "./robot.js";
import { Lidar } from "./lidar.js";
import { RobotFSM } from "./fsm.js";
import { FSMDiagram } from "./diagram.js";
import { Radar } from "./radar.js";

// ----------------------------------------------------------------------------
// Scene & top-down camera
// ----------------------------------------------------------------------------
const ARENA = 22; // half-extent of the walled arena
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1120);

const VIEW = 52; // world units shown vertically
let camera;
function makeCamera() {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  const aspect = w / h;
  camera = new THREE.OrthographicCamera(
    (-VIEW * aspect) / 2,
    (VIEW * aspect) / 2,
    VIEW / 2,
    -VIEW / 2,
    0.1,
    500
  );
  camera.position.set(0, 80, 0);
  camera.up.set(0, 0, -1); // so +X is right, +Z is down on screen
  camera.lookAt(0, 0, 0);
}
makeCamera();

scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x10203a, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(20, 40, 10);
scene.add(dir);

// Floor + grid
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA * 2, ARENA * 2),
  new THREE.MeshStandardMaterial({ color: 0x0e1830, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(ARENA * 2, ARENA, 0x1d2c49, 0x16233d);
grid.position.y = 0.01;
scene.add(grid);

// ----------------------------------------------------------------------------
// Walls, robot, obstacles
// ----------------------------------------------------------------------------
const wallMat = new THREE.MeshStandardMaterial({ color: 0x33456b });
const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });

function makeWall(x, z, w, d) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), wallMat);
  wall.position.set(x, 1.1, z);
  scene.add(wall);
  return wall;
}
const t = 1;
const span = ARENA * 2 + t;
const walls = [
  makeWall(0, -ARENA, span, t),
  makeWall(0, ARENA, span, t),
  makeWall(-ARENA, 0, t, span),
  makeWall(ARENA, 0, t, span),
];

const robot = new Robot(scene);
const lidar = new Lidar(scene);
const fsm = new RobotFSM();
const diagram = new FSMDiagram(document.getElementById("fsm-diagram"), fsm);
const radar = new Radar(document.getElementById("radar"));

const obstacles = [];
let targets = [];
let draggables = [];

function rebuildLists() {
  targets = [...obstacles, ...walls];
  draggables = [...obstacles, robot.body];
}

function addObstacle(x, z, w = 3.2, d = 3.2) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), obstacleMat.clone());
  mesh.position.set(x, 1, z);
  mesh.userData.obstacle = true;
  scene.add(mesh);
  obstacles.push(mesh);
  rebuildLists();
  return mesh;
}

function removeObstacle() {
  const m = obstacles.pop();
  if (m) {
    scene.remove(m);
    m.geometry.dispose();
    rebuildLists();
  }
}

function seedObstacles() {
  while (obstacles.length) removeObstacle();
  addObstacle(-8, -6, 4, 4);
  addObstacle(9, 4, 3, 6);
  addObstacle(2, 12, 6, 3);
  addObstacle(-11, 9, 3, 3);
  addObstacle(7, -10, 4, 3);
}
seedObstacles();
rebuildLists();

// ----------------------------------------------------------------------------
// Simulation parameters & state
// ----------------------------------------------------------------------------
let simSpeed = 1;
let safeDist = 5;
let paused = false;
const RESCAN_INTERVAL = 3.0; // seconds of driving before a fresh scan

// ----------------------------------------------------------------------------
// FSM behavior
// ----------------------------------------------------------------------------
function clampArena() {
  const lim = ARENA - 1.6;
  robot.position.x = THREE.MathUtils.clamp(robot.position.x, -lim, lim);
  robot.position.z = THREE.MathUtils.clamp(robot.position.z, -lim, lim);
}

function moveForward(dt) {
  robot.position.addScaledVector(robot.forward, robot.speed * dt);
}

function turnToward(targetDeg, dt) {
  const target = THREE.MathUtils.degToRad(targetDeg);
  const diff = Math.atan2(
    Math.sin(target - robot.heading),
    Math.cos(target - robot.heading)
  );
  const step = robot.turnRate * dt;
  robot.heading += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
}

function stepFSM(dt) {
  fsm.tick(dt);
  const headingDeg = robot.headingDeg();
  const front = lidar.frontDistance(headingDeg, 22);

  switch (fsm.state) {
    case "IDLE":
      break; // waiting for the operator to start

    case "SCAN":
      // Hold still long enough for the sweep to refresh the front sector.
      if (fsm.timer > 0.9) {
        fsm.set(front > safeDist ? "DRIVE" : "AVOID");
      }
      break;

    case "DRIVE":
      if (front < safeDist) {
        fsm.set("AVOID");
      } else if (fsm.timer > RESCAN_INTERVAL) {
        fsm.set("SCAN");
      } else {
        moveForward(dt);
      }
      break;

    case "AVOID": {
      const best = lidar.bestDirectionDeg(headingDeg);
      turnToward(best, dt);
      if (front > safeDist * 1.15) fsm.set("DRIVE");
      break;
    }
  }
  clampArena();
}

// ----------------------------------------------------------------------------
// HUD
// ----------------------------------------------------------------------------
const hud = {
  state: document.getElementById("hud-state"),
  front: document.getElementById("hud-front"),
  near: document.getElementById("hud-near"),
  head: document.getElementById("hud-head"),
  pos: document.getElementById("hud-pos"),
};

function updateHUD() {
  const front = lidar.frontDistance(robot.headingDeg(), 22);
  hud.state.textContent = fsm.state;
  hud.front.textContent = front >= lidar.maxRange ? "clear" : front.toFixed(2) + " m";
  const near = lidar.nearest();
  hud.near.textContent = near >= lidar.maxRange ? "—" : near.toFixed(2) + " m";
  hud.head.textContent = robot.headingDeg().toFixed(0) + "°";
  hud.pos.textContent = `${robot.position.x.toFixed(1)}, ${robot.position.z.toFixed(1)}`;
}

// ----------------------------------------------------------------------------
// Pointer dragging (robot + obstacles)
// ----------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let dragObj = null;
let dragIsRobot = false;

function setNDC(e) {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function groundPoint() {
  raycaster.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, p);
  return p;
}

canvas.addEventListener("pointerdown", (e) => {
  setNDC(e);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(draggables, false);
  if (hits.length) {
    dragObj = hits[0].object;
    dragIsRobot = !!dragObj.userData.isRobot;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragObj) return;
  setNDC(e);
  const p = groundPoint();
  if (!p) return;
  const lim = ARENA - 1.6;
  const x = THREE.MathUtils.clamp(p.x, -lim, lim);
  const z = THREE.MathUtils.clamp(p.z, -lim, lim);
  if (dragIsRobot) {
    robot.position.set(x, 0, z);
    robot.sync();
  } else {
    dragObj.position.set(x, dragObj.position.y, z);
  }
});

function endDrag() {
  dragObj = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// ----------------------------------------------------------------------------
// UI controls
// ----------------------------------------------------------------------------
const btnRun = document.getElementById("btn-run");
btnRun.addEventListener("click", () => {
  if (fsm.state === "IDLE") {
    fsm.set("SCAN");
    btnRun.textContent = "■ Stop";
    btnRun.classList.remove("primary");
  } else {
    fsm.set("IDLE");
    btnRun.textContent = "▶ Start";
    btnRun.classList.add("primary");
  }
});

document.getElementById("btn-reset").addEventListener("click", () => {
  robot.position.set(0, 0, 0);
  robot.heading = 0;
  robot.sync();
  lidar.reset();
  seedObstacles();
  fsm.set("IDLE");
  diagram.update();
  btnRun.textContent = "▶ Start";
  btnRun.classList.add("primary");
});

document.getElementById("btn-pause").addEventListener("click", (e) => {
  paused = !paused;
  e.target.textContent = paused ? "▶ Resume" : "⏸ Pause";
});

document.getElementById("btn-add").addEventListener("click", () => {
  const x = THREE.MathUtils.randFloatSpread(ARENA * 1.4);
  const z = THREE.MathUtils.randFloatSpread(ARENA * 1.4);
  addObstacle(x, z);
});
document.getElementById("btn-remove").addEventListener("click", removeObstacle);

function bindSlider(id, outId, fmt, apply) {
  const sl = document.getElementById(id);
  const out = document.getElementById(outId);
  const sync = () => {
    out.textContent = fmt(parseFloat(sl.value));
    apply(parseFloat(sl.value));
  };
  sl.addEventListener("input", sync);
  sync();
}
bindSlider("sl-sim", "out-sim", (v) => v.toFixed(1) + "×", (v) => (simSpeed = v));
bindSlider("sl-speed", "out-speed", (v) => v.toString(), (v) => (robot.speed = v));
bindSlider("sl-sweep", "out-sweep", (v) => v + "°/s", (v) => lidar.setSweepSpeedDeg(v));
bindSlider("sl-safe", "out-safe", (v) => v.toFixed(1), (v) => (safeDist = v));

// ----------------------------------------------------------------------------
// Resize
// ----------------------------------------------------------------------------
function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  makeCamera();
}
window.addEventListener("resize", resize);
resize();

// ----------------------------------------------------------------------------
// Main loop
// ----------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  let dt = Math.min(clock.getDelta(), 0.05) * simSpeed;

  if (!paused) {
    lidar.update(dt, robot.sensorOrigin(), targets);
    stepFSM(dt);
    robot.sync(dt);
  }

  robot.setSafeRing(safeDist);
  updateHUD();
  radar.draw(lidar, robot.headingDeg(), safeDist);
  renderer.render(scene, camera);
}
animate();
