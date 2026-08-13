"use client";

import { Suspense } from "react";
import { Scene } from "./Scene";
import { AudioManager } from "./AudioManager";
import { InteractionOverlay } from "./InteractionOverlay";
import { StartOverlay } from "./ui/StartOverlay";
import { WelcomeGreeting } from "./ui/WelcomeGreeting";
import { ControlsModal } from "./ui/ControlsModal";
import { HUD } from "./ui/HUD";
import { PCScreen } from "./ui/PCScreen";
import { ContactPanel } from "./ui/ContactPanel";
import { TouchControls } from "./ui/TouchControls";
import { CameraDebugGui } from "./ui/CameraDebugGui";
import { useWoraWorkStore } from "./store";
import "./worawork.css";

export function WoraWorkApp() {
  const inside = useWoraWorkStore((s) => s.inside);
  return (
    <div className={`ww-root${inside ? " ww-root--inside" : ""}`}>
      <Suspense fallback={<div className="ww-loading">Loading island...</div>}>
        <Scene />
      </Suspense>
      <AudioManager />
      <HUD />
      <InteractionOverlay />
      <StartOverlay />
      <WelcomeGreeting />
      <ControlsModal />
      <PCScreen />
      <ContactPanel />
      <TouchControls />
      {process.env.NODE_ENV !== "production" && <CameraDebugGui />}
    </div>
  );
}
