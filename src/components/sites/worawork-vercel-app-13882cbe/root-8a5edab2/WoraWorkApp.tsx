"use client";

import { Suspense } from "react";
import { Scene } from "./Scene";
import { AudioManager } from "./AudioManager";
import { InteractionOverlay } from "./InteractionOverlay";
import { StartOverlay } from "./ui/StartOverlay";
import { WelcomeGreeting } from "./ui/WelcomeGreeting";
import { ControlsModal } from "./ui/ControlsModal";
import { HUD } from "./ui/HUD";
import { PortfolioPanel } from "./ui/PortfolioPanel";
import { ContactPanel } from "./ui/ContactPanel";
import { TouchControls } from "./ui/TouchControls";
import "./worawork.css";

export function WoraWorkApp() {
  return (
    <div className="ww-root">
      <Suspense fallback={<div className="ww-loading">Loading island...</div>}>
        <Scene />
      </Suspense>
      <AudioManager />
      <HUD />
      <InteractionOverlay />
      <StartOverlay />
      <WelcomeGreeting />
      <ControlsModal />
      <PortfolioPanel />
      <ContactPanel />
      <TouchControls />
    </div>
  );
}
