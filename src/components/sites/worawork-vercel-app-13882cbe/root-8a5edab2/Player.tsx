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

const TRACKED_SENSORS = ["Sitting_PC_Sensor", "Clickable_MailBox_Sensor", "Entrance_Sensor", "Exit_Sensor"] as const;
const GROUND_RAY_ORIGIN_OFFSET = 3; // cast from above the player so walking up a step still finds ground
const GROUND_RAY_MAX_DISTANCE = 6; // ignore hits far below (e.g. water bed) so the player doesn't fall through gaps
const GROUND_RAY_DOWN = new THREE.Vector3(0, -1, 0);
// Furniture/walls/trees share the same merged low-poly mesh as the floor (no
// separate "obstacle" geometry), so tell them apart by height: a real floor
// step (stairs, curb) is a small rise, a couch seat or wall is a big one.
const STEP_LIMIT = 0.35;

interface PlayerProps {
  sensorBoxes: SensorBoxes;
  groundMeshes: THREE.Mesh[];
  zoom: number;
}

export function Player({ sensorBoxes, groundMeshes, zoom }: PlayerProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_PLAYER);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);
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

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const facing = useRef(0);
  const currentAction = useRef<string>("Idle");
  const introElapsed = useRef(0);
  const greetingStarted = useRef(false);
  const inside = useWoraWorkStore((s) => s.inside);
  const started = useWoraWorkStore((s) => s.started);
  const introPlaying = useWoraWorkStore((s) => s.introPlaying);
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
    } else {
      const k = keys.current;
      const running = !!k["ShiftLeft"] || !!k["ShiftRight"];
      let x = 0;
      let z = 0;
      if (k["KeyW"] || k["ArrowUp"]) z -= 1;
      if (k["KeyS"] || k["ArrowDown"]) z += 1;
      if (k["KeyA"] || k["ArrowLeft"]) x -= 1;
      if (k["KeyD"] || k["ArrowRight"]) x += 1;

      const moving = x !== 0 || z !== 0;
      const dir = dirScratch.current.set(x, 0, z);
      if (moving) dir.normalize();
      const speed = running ? RUN_SPEED : WALK_SPEED;
      velocity.current.copy(dir).multiplyScalar(speed * delta);

      const bounds = sensorBoxes[inside ? "Home_Interior_Collision" : "WorldMap_Collision"];
      const start = group.current.position;
      const nextPos = start.clone().add(velocity.current);
      if (bounds) {
        nextPos.x = THREE.MathUtils.clamp(nextPos.x, bounds.min.x + 0.3, bounds.max.x - 0.3);
        nextPos.z = THREE.MathUtils.clamp(nextPos.z, bounds.min.z + 0.3, bounds.max.z - 0.3);
      }

      // Follow terrain height, but only up small steps. Anything taller than
      // STEP_LIMIT (furniture, walls, trees — all baked into the same mesh as
      // the floor) blocks horizontal movement instead of being climbed, and
      // the player slides along whichever axis is still clear.
      let groundY = start.y;
      if (groundMeshes.length) {
        const standY = groundHeightAt(groundMeshes, start.x, start.z, start.y);
        if (standY !== null) groundY = standY;

        if (nextPos.x !== start.x || nextPos.z !== start.z) {
          const full = groundHeightAt(groundMeshes, nextPos.x, nextPos.z, groundY);
          if (full !== null && Math.abs(full - groundY) <= STEP_LIMIT) {
            groundY = full;
          } else {
            const alongX = groundHeightAt(groundMeshes, nextPos.x, start.z, groundY);
            const alongZ = groundHeightAt(groundMeshes, start.x, nextPos.z, groundY);
            if (alongX !== null && Math.abs(alongX - groundY) <= STEP_LIMIT) {
              nextPos.z = start.z;
              groundY = alongX;
            } else if (alongZ !== null && Math.abs(alongZ - groundY) <= STEP_LIMIT) {
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
    for (const name of TRACKED_SENSORS) {
      const box = sensorBoxes[name];
      if (box && pos.x >= box.min.x && pos.x <= box.max.x && pos.z >= box.min.z && pos.z <= box.max.z) {
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
