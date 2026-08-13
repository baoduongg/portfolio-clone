"use client";

import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Village, type SensorBoxes } from "./Village";
import { Player } from "./Player";
import { Duck } from "./Duck";
import { useWoraWorkStore } from "./store";

const HDRI_URL =
  "https://raw.githubusercontent.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/potsdamer_platz_1k.hdr";

export function Scene() {
  const [sensorBoxes, setSensorBoxes] = useState<SensorBoxes>({});
  const [groundMeshes, setGroundMeshes] = useState<THREE.Mesh[]>([]);
  const inside = useWoraWorkStore((s) => s.inside);
  const started = useWoraWorkStore((s) => s.started);
  const zoom = useRef(1);
  const [, forceRender] = useState(0);

  const onWheel = useCallback((e: React.WheelEvent) => {
    zoom.current = Math.min(1.6, Math.max(0.6, zoom.current + e.deltaY * 0.001));
    forceRender((n) => n + 1);
  }, []);

  return (
    // Canvas stays non-interactive until "Let's go" is pressed so a WebGL
    // touch/pointer listener can never eat the tap meant for that button.
    <div className="worawork-canvas" style={{ pointerEvents: started ? "auto" : "none" }} onWheel={onWheel}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 32, position: [0, 23, 22] }} gl={{ powerPreference: "high-performance" }}>
        <Environment files={HDRI_URL} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 4]} intensity={1.2} />
        <Village inside={inside} onSensorsReady={setSensorBoxes} onGroundReady={setGroundMeshes} />
        <Player sensorBoxes={sensorBoxes} groundMeshes={groundMeshes} zoom={zoom.current} />
        {!inside && <Duck />}
      </Canvas>
    </div>
  );
}
