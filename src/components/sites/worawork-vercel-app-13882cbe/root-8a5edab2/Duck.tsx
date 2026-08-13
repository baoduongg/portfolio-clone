"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { MODEL_DUCK } from "./assetPaths";

const CENTER = new THREE.Vector3(0, 0, 5.5);
const RADIUS = 1.4;

export function Duck() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_DUCK);
  const cloned = useMemo(() => cloneSkeleton(scene), [scene]);
  const { actions } = useAnimations(animations, group);
  const t = useRef(Math.random() * 100);

  useEffect(() => {
    actions["Duck_Walk"]?.reset().play();
  }, [actions]);

  useFrame((_, delta) => {
    if (!group.current) return;
    t.current += delta * 0.3;
    const pos = new THREE.Vector3(
      CENTER.x + Math.cos(t.current) * RADIUS,
      0,
      CENTER.z + Math.sin(t.current) * RADIUS
    );
    const angle = Math.atan2(
      Math.cos(t.current + 0.1) - Math.cos(t.current),
      Math.sin(t.current + 0.1) - Math.sin(t.current)
    );
    group.current.position.copy(pos);
    group.current.rotation.y = angle;
  });

  return <primitive ref={group} object={cloned} scale={0.6} />;
}

useGLTF.preload(MODEL_DUCK);
