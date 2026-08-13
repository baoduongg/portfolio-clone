"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MODEL_VILLAGE } from "./assetPaths";
import { useWoraWorkStore } from "./store";

const HIDDEN_NAME_PATTERN = /Sensor|Outline|TurnOn|Collision|MaterialHolder/;
const INTERIOR_ONLY = new Set(["Home_Interior_lp1", "Home_Interior_lp2"]);
const EXTERIOR_ONLY = new Set([
  "Home_lp",
  "Land_lp",
  "Land_lp_NoLight",
  "Trees_lp",
  "Mountains_lp",
  "Water",
  "WaterFoam",
  "Ball",
  "Clock_MinuteHand",
  "Clock_SecondHand",
  "Clock_Center",
  "Sword",
]);
// Meshes that should never register as walkable ground for the player's
// step-raycast: tree canopy floats above the actual floor, mountains are
// unreachable backdrop, water/decor sit lower than the playable surface.
const GROUND_EXCLUDE = new Set([
  "Trees_lp",
  "Mountains_lp",
  "Water",
  "WaterFoam",
  "Ball",
  "Clock_MinuteHand",
  "Clock_SecondHand",
  "Clock_Center",
  "Sword",
]);

export interface SensorBoxes {
  [name: string]: THREE.Box3;
}

interface VillageProps {
  inside: boolean;
  onSensorsReady: (boxes: SensorBoxes) => void;
  onGroundReady: (meshes: THREE.Mesh[]) => void;
  onWaterReady: (mesh: THREE.Mesh | null) => void;
}

export function Village({ inside, onSensorsReady, onGroundReady, onWaterReady }: VillageProps) {
  const { scene } = useGLTF(MODEL_VILLAGE);

  const cloned = useMemo(() => scene.clone(true), [scene]);
  // Keyed by sensor base name (e.g. "Clickable_Lighting_LandR"), populated
  // once from the same traversal that hides these meshes below.
  const outlineMeshes = useRef<Record<string, THREE.Object3D>>({});
  const turnOnMeshes = useRef<Record<string, THREE.Object3D>>({});
  const activeOutline = useRef<string | null>(null);

  const currentTouchingObject = useWoraWorkStore((s) => s.currentTouchingObject);
  const litSensors = useWoraWorkStore((s) => s.litSensors);

  useEffect(() => {
    const boxes: SensorBoxes = {};
    const groundMeshes: THREE.Mesh[] = [];
    let waterMesh: THREE.Mesh | null = null;
    outlineMeshes.current = {};
    turnOnMeshes.current = {};
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name === "Water") waterMesh = obj;
      if (HIDDEN_NAME_PATTERN.test(obj.name)) {
        if (obj.name.endsWith("_Sensor") || obj.name.endsWith("_Collision")) {
          obj.updateWorldMatrix(true, false);
          boxes[obj.name] = new THREE.Box3().setFromObject(obj);
        } else if (obj.name.endsWith("_Outline")) {
          outlineMeshes.current[obj.name.slice(0, -"_Outline".length)] = obj;
        } else if (obj.name.endsWith("_TurnOn")) {
          turnOnMeshes.current[obj.name.slice(0, -"_TurnOn".length)] = obj;
        }
        obj.visible = false;
        return;
      }
      if (!GROUND_EXCLUDE.has(obj.name)) groundMeshes.push(obj);
    });
    onSensorsReady(boxes);
    onGroundReady(groundMeshes);
    onWaterReady(waterMesh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloned]);

  // Hover highlight: show the touched sensor's Outline mesh, hide the last one.
  useEffect(() => {
    const prev = activeOutline.current;
    if (prev && outlineMeshes.current[prev]) outlineMeshes.current[prev].visible = false;
    const base = currentTouchingObject?.endsWith("_Sensor")
      ? currentTouchingObject.slice(0, -"_Sensor".length)
      : null;
    if (base && outlineMeshes.current[base]) outlineMeshes.current[base].visible = true;
    activeOutline.current = base;
  }, [currentTouchingObject]);

  // Lit state persists independent of touching (e.g. a toggled lamp stays on).
  useEffect(() => {
    for (const [base, mesh] of Object.entries(turnOnMeshes.current)) {
      mesh.visible = !!litSensors[base];
    }
  }, [litSensors]);

  useEffect(() => {
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (INTERIOR_ONLY.has(obj.name)) obj.visible = inside;
      if (EXTERIOR_ONLY.has(obj.name)) obj.visible = !inside;
    });
  }, [cloned, inside]);

  return <primitive object={cloned} />;
}

useGLTF.preload(MODEL_VILLAGE);
