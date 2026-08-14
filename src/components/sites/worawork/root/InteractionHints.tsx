"use client";

import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { SensorBoxes } from "./Village";
import { useWoraWorkStore } from "./store";
import { isInteractiveSensor, LIGHTING_PREFIX } from "./InteractionOverlay";

// Interior geometry is baked ~200 units above the exterior in the same GLB
// (see Player.tsx SPAWN_INTERIOR) — this tells a sensor's room apart from its
// Y alone, same trick Player.tsx uses for SENSOR_Y_TOLERANCE disambiguation.
const INTERIOR_Y_THRESHOLD = 100;

interface InteractionHintsProps {
  sensorBoxes: SensorBoxes;
  inside: boolean;
}

const center = new THREE.Vector3();

// Floating "!" badges over the wired-up sensors worth calling out — furniture,
// mailbox, PC, doors. Skips the ~15 Clickable_Lighting_* lamps: they're real
// interactions too, but badging every lamp in a room buried the few hints
// that actually matter under visual noise. Also skips whichever sensor the
// player is already standing on — that one gets the full outline + "Press E"
// prompt instead (InteractionOverlay.tsx), which would double up with a badge.
export function InteractionHints({ sensorBoxes, inside }: InteractionHintsProps) {
  const currentTouchingObject = useWoraWorkStore((s) => s.currentTouchingObject);
  const started = useWoraWorkStore((s) => s.started);
  const portfolioOpen = useWoraWorkStore((s) => s.portfolioOpen);
  const mailboxOpen = useWoraWorkStore((s) => s.mailboxOpen);

  if (!started || portfolioOpen || mailboxOpen) return null;

  return (
    <>
      {Object.entries(sensorBoxes).map(([name, box]) => {
        if (!isInteractiveSensor(name) || name.startsWith(LIGHTING_PREFIX) || name === currentTouchingObject) return null;
        box.getCenter(center);
        if (center.y > INTERIOR_Y_THRESHOLD !== inside) return null;
        return (
          <Html key={name} position={[center.x, box.max.y + 0.35, center.z]} center>
            <div className="ww-hint-badge" aria-hidden="true">
              !
            </div>
          </Html>
        );
      })}
    </>
  );
}
