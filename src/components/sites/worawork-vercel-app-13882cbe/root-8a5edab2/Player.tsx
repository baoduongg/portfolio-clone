"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MODEL_PLAYER } from "./assetPaths";
import type { SensorBoxes } from "./Village";
import { useWoraWorkStore, type SensorName } from "./store";
import { CAMERA_OFFSET, cameraTuning } from "./cameraDebug";

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
const UP = new THREE.Vector3(0, 1, 0);
// Intro sequence after "Let's go": zoom in close, ease back out, then greet.
const INTRO_ZOOM_IN_END = 0.7;
const INTRO_ZOOM_OUT_END = 1.8;
const SPAWN_EXTERIOR = new THREE.Vector3(0, 0, 3);
// Interior room geometry is baked ~200 units above the exterior in the source
// GLB (keeps both rooms in one file without overlapping), so the player must
// jump up there too when entering the house.
const SPAWN_INTERIOR = new THREE.Vector3(0, 200.7, 6);
// The touching check below only tested X/Z, so an exterior sensor and the
// interior sensor baked ~200 units above it (same X/Z footprint, since the
// house interior sits directly above its exterior shell) could both match at
// once, showing interior interact hints while outside. A loose Y bound tells
// them apart without requiring the player's feet to sit exactly inside the
// sensor mesh's (often paper-thin) bounding box.
const SENSOR_Y_TOLERANCE = 5;

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
// A ground-raycast miss covers two very different cases that can't be told
// apart from a single sample: a thin seam/hole in the merged low-poly mesh
// (usually gone again within a substep or two), and genuinely walking off
// the edge of the map into open water/void, which keeps missing for as long
// as the key is held. Coasting through the former is fine (matches the
// original floor on the other side); coasting through the latter is how the
// player used to glide indefinitely across the water. Cap how far a miss
// streak can carry the player before it's treated as a wall — comfortably
// past any real seam we've hit, nowhere near how far an unblocked drift
// over water would otherwise go.
const MAX_MISS_DRIFT = 0.6;

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
  // Smoothed separately from camTargetScratch (which is a per-frame scratch,
  // not persisted) so orientation eases in instead of snapping. Starts at the
  // origin to match R3F's default pre-start camera.lookAt(0,0,0) — otherwise
  // the very first active frame jumps rotation instantly (the reported flash).
  const camLookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const sitTargetScratch = useRef(new THREE.Vector3());
  const nextPosScratch = useRef(new THREE.Vector3());
  const stepVelocityScratch = useRef(new THREE.Vector3());
  // Sitting pins position to the seat's (furniture-height) footprint; standing
  // back up left the player parked on top of that furniture mesh instead of
  // the floor, since the ground raycast just finds "whatever's directly below"
  // — the seat top itself, not the floor beneath it — and stepping off from
  // there could exceed STEP_LIMIT, reading as stuck. Restore exactly where
  // they were standing before they sat down instead of re-deriving a floor spot.
  const preSitPosition = useRef<THREE.Vector3 | null>(null);
  const missDrift = useRef(0);

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
    // Camera is fixed per room (never follows the player — see the useFrame
    // camera block below), so it must be snapped to the new room's anchor
    // here too. Without this it would keep lerping from the old room's
    // anchor toward the new one across the ~200-unit gap between them,
    // sweeping through unmodeled void space for a moment.
    camera.position.copy(spawn).addScaledVector(CAMERA_OFFSET, zoom * (inside ? cameraTuning.interiorZoomBoost : 1));
    camLookTarget.current.copy(spawn).add(UP);
    camera.lookAt(camLookTarget.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inside]);

  useEffect(() => {
    if (!group.current) return;
    if (sittingOn) {
      if (!preSitPosition.current) preSitPosition.current = group.current.position.clone();
    } else if (preSitPosition.current) {
      group.current.position.copy(preSitPosition.current);
      preSitPosition.current = null;
    }
  }, [sittingOn]);

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

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    if (perspectiveCamera.fov !== cameraTuning.fov) {
      perspectiveCamera.fov = cameraTuning.fov;
      perspectiveCamera.updateProjectionMatrix();
    }

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

        // Follow terrain height, but only across small steps in EITHER
        // direction. Anything taller than STEP_LIMIT (furniture, walls, trees
        // — all baked into the same mesh as the floor) blocks horizontal
        // movement instead of being climbed, and the player slides along
        // whichever axis is still clear. Descent is capped too, not just
        // ascent: some low-poly floor merges have a genuinely steep local dip
        // (deeper than STEP_LIMIT) sitting right next to normal shallow
        // steps — letting the player freely descend into one but not climb
        // back out turns it into a one-way trap. Capping both directions
        // just routes around those spots via the alongX/alongZ slide, same
        // as any other obstacle; legitimate gentle slopes/stairs still pass
        // because each substep's height delta is tiny (MAX_SUBSTEP_DIST).
        let groundY = start.y;
        if (groundMeshes.length) {
          const standY = groundHeightAt(groundMeshes, start.x, start.z, start.y);
          if (standY !== null) groundY = standY;

          if (nextPos.x !== start.x || nextPos.z !== start.z) {
            const full = groundHeightAt(groundMeshes, nextPos.x, nextPos.z, groundY);
            if (full === null) {
              // Raycast miss: either a thin seam/hole in the merged low-poly
              // mesh, or genuinely off the edge of the map into open water —
              // the map's WorldMap_Collision/Home_Interior_Collision rect is a
              // coarse XZ clamp, not a per-mesh boundary, so it doesn't stop
              // the player before that edge, and the "Water" mesh's raycastable
              // floor sits far below any shoreline height so it can't be used
              // to detect "at the water's edge" either. Keep the last known
              // height and let a short miss streak coast through (a real seam
              // clears within a substep or two), but once it's carried the
              // player past MAX_MISS_DRIFT, treat it as a wall — otherwise this
              // is exactly how the player used to glide indefinitely across
              // the water once off the edge of the land mesh.
              missDrift.current += stepVelocity.length();
              if (missDrift.current > MAX_MISS_DRIFT) {
                nextPos.x = start.x;
                nextPos.z = start.z;
              }
            } else if (Math.abs(full - groundY) <= STEP_LIMIT && !isUnderwater(nextPos.x, nextPos.z, full)) {
              missDrift.current = 0;
              groundY = full;
            } else {
              missDrift.current = 0;
              const alongX = groundHeightAt(groundMeshes, nextPos.x, start.z, groundY);
              const alongZ = groundHeightAt(groundMeshes, start.x, nextPos.z, groundY);
              if (alongX !== null && Math.abs(alongX - groundY) <= STEP_LIMIT && !isUnderwater(nextPos.x, start.z, alongX)) {
                nextPos.z = start.z;
                groundY = alongX;
              } else if (
                alongZ !== null &&
                Math.abs(alongZ - groundY) <= STEP_LIMIT &&
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
        effectiveZoom = THREE.MathUtils.lerp(1, cameraTuning.introCloseZoom, t / INTRO_ZOOM_IN_END);
      } else if (t < INTRO_ZOOM_OUT_END) {
        effectiveZoom = THREE.MathUtils.lerp(
          cameraTuning.introCloseZoom,
          1,
          (t - INTRO_ZOOM_IN_END) / (INTRO_ZOOM_OUT_END - INTRO_ZOOM_IN_END)
        );
      } else {
        effectiveZoom = 1;
      }
    }

    // Camera is fixed to each room's spawn point, not the live player
    // position — it only ever dollies in/out with zoom, it never pans to
    // follow the character around.
    const camAnchor = inside ? SPAWN_INTERIOR : SPAWN_EXTERIOR;
    const roomZoom = effectiveZoom * (inside ? cameraTuning.interiorZoomBoost : 1);
    const damp = 1 - Math.pow(0.001, delta);
    const desiredCam = camTargetScratch.current.copy(camAnchor).addScaledVector(CAMERA_OFFSET, roomZoom);
    camera.position.lerp(desiredCam, damp);
    camLookTarget.current.copy(camAnchor).add(UP);
    camera.lookAt(camLookTarget.current);

    const pos = group.current.position;
    let touching: SensorName = null;
    for (const name in sensorBoxes) {
      if (name.endsWith("_Collision")) continue;
      const box = sensorBoxes[name];
      if (
        pos.x >= box.min.x &&
        pos.x <= box.max.x &&
        pos.z >= box.min.z &&
        pos.z <= box.max.z &&
        pos.y >= box.min.y - SENSOR_Y_TOLERANCE &&
        pos.y <= box.max.y + SENSOR_Y_TOLERANCE
      ) {
        touching = name;
        break;
      }
    }
    setTouching(touching);
  });

  return <primitive ref={group} object={cloned} scale={1} />;
}

useGLTF.preload(MODEL_PLAYER);
