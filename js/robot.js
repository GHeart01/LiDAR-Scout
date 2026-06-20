import * as THREE from "three";

// A differential-drive style robot rendered top-down.
// Heading is a world angle (radians); the forward vector lives on the XZ plane
// as (cos h, 0, sin h), keeping it consistent with the LiDAR's world angles.
export class Robot {
  constructor(scene) {
    this.position = new THREE.Vector3(0, 0, 0);
    this.heading = 0;
    this.speed = 6; // units / second
    this.turnRate = THREE.MathUtils.degToRad(140); // radians / second

    const group = new THREE.Group();

    // Chassis
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 0.7, 28),
      new THREE.MeshStandardMaterial({ color: 0x2dd4bf, metalness: 0.25, roughness: 0.5 })
    );
    body.position.y = 0.35;
    body.userData.isRobot = true; // used by the drag picker
    group.add(body);

    // Heading indicator (points along local +X)
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.1, 18),
      new THREE.MeshStandardMaterial({ color: 0x06241f })
    );
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(1.05, 0.45, 0);
    group.add(nose);

    // Spinning sensor mast
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x5c4a00 })
    );
    mast.position.y = 0.95;
    group.add(mast);
    this.mast = mast;

    scene.add(group);
    this.group = group;
    this.body = body;

    // Safety ring (radius scaled to the configured safe distance each frame)
    const ringPts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    this.safeRing = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.35 })
    );
    scene.add(this.safeRing);

    this.sync();
  }

  get forward() {
    return new THREE.Vector3(Math.cos(this.heading), 0, Math.sin(this.heading));
  }

  // LiDAR is mounted on the mast, slightly above the floor.
  sensorOrigin() {
    return new THREE.Vector3(this.position.x, 0.5, this.position.z);
  }

  headingDeg() {
    return ((THREE.MathUtils.radToDeg(this.heading) % 360) + 360) % 360;
  }

  setSafeRing(radius) {
    this.safeRing.scale.set(radius, 1, radius);
  }

  sync(dt = 0) {
    this.group.position.copy(this.position);
    this.group.rotation.y = -this.heading;
    this.safeRing.position.set(this.position.x, 0.05, this.position.z);
    if (dt) this.mast.rotation.y += dt * 6; // cosmetic spin
  }
}
