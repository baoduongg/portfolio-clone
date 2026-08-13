"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MODEL_PLAYER } from "./assetPaths";
import type { SensorBoxes } from "./Village";
import { useWoraWorkStore, type SensorName } from "./store";

const WALK_SPEED = 2.6;
const RUN_SPEED = 5.2;
const AUTO_RUN_DELAY = 1; // seconds of continuous movement before auto-switching to Run

// Fixed facing per seat, in screen clock-face terms (camera never rotates):
// 12 o'clock = away from camera (-Z), 3 = screen-right (+X), 6 = toward
// camera (+Z), 9 = screen-left (-X). Matches the atan2(dirX, dirZ) convention
// `facing`/rotation.y already use for movement.
const SIT_ROTATION: Record<string, number> = {
  Sitting_Sofa_Big_Sensor: 0, // 6 o'clock
  Sitting_Sofa_Small_Sensor: Math.PI / 2, // 3 o'clock
};
const CAMERA_OFFSET = new THREE.Vector3(0, 23, 19);
const UP = new THREE.Vector3(0, 1, 0);
// Intro sequence after "Let's go": zoom in close, ease back out, then greet.
const INTRO_ZOOM_IN_END = 0.7;
const INTRO_ZOOM_OUT_END = 1.8;
const INTRO_CLOSE_ZOOM = 0.32;
const SPAWN_EXTERIOR = new THREE.Vector3(0, 0, 3);
// Interior room geometry is baked ~200 units above the exterior in the source
// GLB (keeps both rooms in one file without overlapping), so the player must
// jump up there too when entering the house.
const SPAWN_INTERIOR = new THREE.Vector3(0, 200.7, 6);

const GROUND_RAY_ORIGIN_OFFSET = 3; // cast from above the player so walking up a step still finds ground
const GROUND_RAY_MAX_DISTANCE = 6; // ignore hits far below (e.g. water bed) so the player doesn't fall through gaps
const GROUND_RAY_DOWN = new THREE.Vector3(0, -1, 0);
// Furniture/walls/trees share the same merged low-poly mesh as the floor (no
// separate "obstacle" geometry), so tell them apart by height: a real floor
// step (stairs, curb) is a small rise, a couch seat or wall is a big one.
// ponytail: 0.45 clears the ~0.4-unit sunken tatami nook (climbing down is
// unlimited, only climbing up is capped) — raise further only if another
// legit floor rise turns out taller than this.
const STEP_LIMIT = 0.45;
// The ground/step raycast only samples each frame's move at its endpoint, so
// a big per-frame displacement (Run, or a lag-spike delta) can jump clean
// over a valid step-up spot and land on obstacle-height geometry, reading as
// a full block near collision edges. Subdividing into chunks no bigger than
// a Walk frame's stride keeps the sampling just as fine at any speed.
const MAX_SUBSTEP_DIST = WALK_SPEED / 60;

interface PlayerProps {
  sensorBoxes: SensorBoxes;
  groundMeshes: THREE.Mesh[];
  waterMesh: THREE.Mesh | null;
  zoom: number;
}

export function Player({ sensorBoxes, groundMeshes, waterMesh, zoom }: PlayerProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_PLAYER);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);
  const waterMeshArr = useMemo(() => (waterMesh ? [waterMesh] : []), [waterMesh]);
  const { actions, mixer } = useAnimations(animations, group);
  const { camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  // Reused every frame instead of allocated, to avoid per-frame GC churn.
  const rayOrigin = useRef(new THREE.Vector3());
  const dirScratch = useRef(new THREE.Vector3());
  const camTargetScratch = useRef(new THREE.Vector3());
  const lookAtScratch = useRef(new THREE.Vector3());
  // Smoothed separately from camTargetScratch (which is a per-frame scratch,
  // not persisted) so orientation eases in instead of snapping. Starts at the
  // origin to match R3F's default pre-start camera.lookAt(0,0,0) — otherwise
  // the very first active frame jumps rotation instantly (the reported flash).
  const camLookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const sitTargetScratch = useRef(new THREE.Vector3());
  const nextPosScratch = useRef(new THREE.Vector3());
  const stepVelocityScratch = useRef(new THREE.Vector3());

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const facing = useRef(0);
  const moveElapsed = useRef(0);
  const currentAction = useRef<string>("Idle");
  const introElapsed = useRef(0);
  const greetingStarted = useRef(false);
  const inside = useWoraWorkStore((s) => s.inside);
  const started = useWoraWorkStore((s) => s.started);
  const introPlaying = useWoraWorkStore((s) => s.introPlaying);
  const sittingOn = useWoraWorkStore((s) => s.sittingOn);
  const endIntro = useWoraWorkStore((s) => s.endIntro);
  const setShowGreetingText = useWoraWorkStore((s) => s.setShowGreetingText);
  const setTouching = useWoraWorkStore((s) => s.setTouching);
  const setInside = useWoraWorkStore((s) => s.setInside);

  useEffect(() => {
    const down = (e: KeyboardEvent) => (keys.current[e.code] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!group.current) return;
    const spawn = inside ? SPAWN_INTERIOR : SPAWN_EXTERIOR;
    group.current.position.copy(spawn);
  }, [inside]);

  useEffect(() => {
    actions["Idle"]?.reset().fadeIn(0.2).play();
    currentAction.current = "Idle";
  }, [actions]);

  const playAction = (name: string) => {
    if (currentAction.current === name) return;
    const next = actions[name];
    const prev = actions[currentAction.current];
    if (!next) return;
    next.reset().fadeIn(0.2).play();
    prev?.fadeOut(0.2);
    currentAction.current = name;
  };

  useEffect(() => {
    if (!introPlaying) return;
    introElapsed.current = 0;
    greetingStarted.current = false;
  }, [introPlaying]);

  useEffect(() => {
    if (!mixer) return;
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== actions["Greeting"]) return;
      playAction("Idle");
      endIntro();
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions, endIntro]);

  const groundHeightAt = (meshes: THREE.Mesh[], x: number, z: number, fromY: number): number | null => {
    if (meshes.length === 0) return null;
    rayOrigin.current.set(x, fromY + GROUND_RAY_ORIGIN_OFFSET, z);
    raycaster.set(rayOrigin.current, GROUND_RAY_DOWN);
    raycaster.far = GROUND_RAY_ORIGIN_OFFSET + GROUND_RAY_MAX_DISTANCE;
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.point.y : null;
  };

  // The river's water surface is a decorative overlay, not part of the
  // walkable terrain mesh — the terrain underneath slopes gently into the
  // riverbed with no height cliff, so the STEP_LIMIT check alone happily
  // lets the player (Run especially) stroll down into the water. Block any
  // landing spot whose terrain height is at or below the water surface
  // there; a bridge deck sits above the water so this doesn't block bridges.
  const isUnderwater = (x: number, z: number, terrainY: number): boolean => {
    const waterY = groundHeightAt(waterMeshArr, x, z, terrainY);
    return waterY !== null && waterY >= terrainY;
  };

  useFrame((_, delta) => {
    if (!group.current || !started) return;

    if (introPlaying) {
      introElapsed.current += delta;
      // Zoom-in/zoom-out finished — greet once, then hand control back.
      if (!greetingStarted.current && introElapsed.current >= INTRO_ZOOM_OUT_END) {
        greetingStarted.current = true;
        if (actions["Greeting"]) {
          const greet = actions["Greeting"];
          greet.reset();
          greet.setLoop(THREE.LoopOnce, 1);
          greet.clampWhenFinished = true;
          greet.fadeIn(0.2).play();
          actions[currentAction.current]?.fadeOut(0.2);
          currentAction.current = "Greeting";
          setShowGreetingText(true);
        } else {
          endIntro();
        }
      }
    } else if (sittingOn) {
      // Pin to the seat sensor's footprint and let the ground raycast pick up
      // the seat height (furniture is merged into the same walkable mesh as
      // the floor), instead of modeling a real seat anchor/offset per prop.
      const box = sensorBoxes[sittingOn];
      if (box) {
        const center = box.getCenter(sitTargetScratch.current);
        const groundY = groundMeshes.length
          ? (groundHeightAt(groundMeshes, center.x, center.z, group.current.position.y) ?? group.current.position.y)
          : group.current.position.y;
        group.current.position.set(center.x, groundY, center.z);
      }
      const seatRotation = SIT_ROTATION[sittingOn];
      if (seatRotation !== undefined) {
        facing.current = seatRotation;
        group.current.rotation.y = seatRotation;
      }
      playAction("Sit");
    } else {
      const k = keys.current;
      let x = 0;
      let z = 0;
      if (k["KeyW"] || k["ArrowUp"]) z -= 1;
      if (k["KeyS"] || k["ArrowDown"]) z += 1;
      if (k["KeyA"] || k["ArrowLeft"]) x -= 1;
      if (k["KeyD"] || k["ArrowRight"]) x += 1;

      const moving = x !== 0 || z !== 0;
      moveElapsed.current = moving ? moveElapsed.current + delta : 0;
      const running = !!k["ShiftLeft"] || !!k["ShiftRight"] || moveElapsed.current > AUTO_RUN_DELAY;
      const dir = dirScratch.current.set(x, 0, z);
      if (moving) dir.normalize();
      const speed = running ? RUN_SPEED : WALK_SPEED;
      velocity.current.copy(dir).multiplyScalar(speed * delta);

      const bounds = sensorBoxes[inside ? "Home_Interior_Collision" : "WorldMap_Collision"];
      const planarDist = Math.hypot(velocity.current.x, velocity.current.z);
      const substeps = Math.max(1, Math.ceil(planarDist / MAX_SUBSTEP_DIST));
      const stepVelocity = stepVelocityScratch.current.copy(velocity.current).divideScalar(substeps);

      for (let i = 0; i < substeps; i++) {
        const start = group.current.position;
        const nextPos = nextPosScratch.current.copy(start).add(stepVelocity);
        if (bounds) {
          nextPos.x = THREE.MathUtils.clamp(nextPos.x, bounds.min.x + 0.3, bounds.max.x - 0.3);
          nextPos.z = THREE.MathUtils.clamp(nextPos.z, bounds.min.z + 0.3, bounds.max.z - 0.3);
        }

        // Follow terrain height, but only up small steps. Anything taller than
        // STEP_LIMIT (furniture, walls, trees — all baked into the same mesh as
        // the floor) blocks horizontal movement instead of being climbed, and
        // the player slides along whichever axis is still clear. Stepping DOWN
        // is never height-limited (gravity would just pull you down in a real
        // physics sim) — only climbing up is, otherwise legitimate floor dips
        // (e.g. a sunken tatami nook ~0.4 units below the main floor) become
        // impassable walls, as happened blocking the house's Exit_Sensor.
        let groundY = start.y;
        if (groundMeshes.length) {
          const standY = groundHeightAt(groundMeshes, start.x, start.z, start.y);
          if (standY !== null) groundY = standY;

          if (nextPos.x !== start.x || nextPos.z !== start.z) {
            const full = groundHeightAt(groundMeshes, nextPos.x, nextPos.z, groundY);
            if (full !== null && full - groundY <= STEP_LIMIT && !isUnderwater(nextPos.x, nextPos.z, full)) {
              groundY = full;
            } else {
              const alongX = groundHeightAt(groundMeshes, nextPos.x, start.z, groundY);
              const alongZ = groundHeightAt(groundMeshes, start.x, nextPos.z, groundY);
              if (alongX !== null && alongX - groundY <= STEP_LIMIT && !isUnderwater(nextPos.x, start.z, alongX)) {
                nextPos.z = start.z;
                groundY = alongX;
              } else if (
                alongZ !== null &&
                alongZ - groundY <= STEP_LIMIT &&
                !isUnderwater(start.x, nextPos.z, alongZ)
              ) {
                nextPos.x = start.x;
                groundY = alongZ;
              } else {
                nextPos.x = start.x;
                nextPos.z = start.z;
              }
            }
          }
        }
        nextPos.y = groundY;
        group.current.position.copy(nextPos);
      }

      if (moving) {
        const targetFacing = Math.atan2(dir.x, dir.z);
        facing.current = THREE.MathUtils.damp(facing.current, targetFacing, 10, delta);
        group.current.rotation.y = facing.current;
        playAction(running ? "Run" : "Walk");
      } else {
        playAction("Idle");
      }
    }

    let effectiveZoom = zoom;
    if (introPlaying) {
      const t = introElapsed.current;
      if (t < INTRO_ZOOM_IN_END) {
        effectiveZoom = THREE.MathUtils.lerp(1, INTRO_CLOSE_ZOOM, t / INTRO_ZOOM_IN_END);
      } else if (t < INTRO_ZOOM_OUT_END) {
        effectiveZoom = THREE.MathUtils.lerp(
          INTRO_CLOSE_ZOOM,
          1,
          (t - INTRO_ZOOM_IN_END) / (INTRO_ZOOM_OUT_END - INTRO_ZOOM_IN_END)
        );
      } else {
        effectiveZoom = 1;
      }
    }

    const damp = 1 - Math.pow(0.001, delta);
    const desiredCam = camTargetScratch.current
      .copy(group.current.position)
      .addScaledVector(CAMERA_OFFSET, effectiveZoom);
    camera.position.lerp(desiredCam, damp);
    const desiredLook = lookAtScratch.current.copy(group.current.position).add(UP);
    camLookTarget.current.lerp(desiredLook, damp);
    camera.lookAt(camLookTarget.current);

    const pos = group.current.position;
    let touching: SensorName = null;
    for (const name in sensorBoxes) {
      if (name.endsWith("_Collision")) continue;
      const box = sensorBoxes[name];
      if (pos.x >= box.min.x && pos.x <= box.max.x && pos.z >= box.min.z && pos.z <= box.max.z) {
        touching = name;
        break;
      }
    }
    setTouching(touching);
    if (touching === "Entrance_Sensor" && !inside) setInside(true);
    if (touching === "Exit_Sensor" && inside) setInside(false);
  });

  return <primitive ref={group} object={cloned} scale={1} />;
}

useGLTF.preload(MODEL_PLAYER);
