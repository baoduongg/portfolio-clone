"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { MODEL_VILLAGE } from "./assetPaths";

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
}

export function Village({ inside, onSensorsReady, onGroundReady }: VillageProps) {
  const { scene } = useGLTF(MODEL_VILLAGE);

  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const boxes: SensorBoxes = {};
    const groundMeshes: THREE.Mesh[] = [];
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (HIDDEN_NAME_PATTERN.test(obj.name)) {
        if (obj.name.endsWith("_Sensor") || obj.name.endsWith("_Collision")) {
          obj.updateWorldMatrix(true, false);
          boxes[obj.name] = new THREE.Box3().setFromObject(obj);
        }
        obj.visible = false;
        return;
      }
      if (!GROUND_EXCLUDE.has(obj.name)) groundMeshes.push(obj);
    });
    onSensorsReady(boxes);
    onGroundReady(groundMeshes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloned]);

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
