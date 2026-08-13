"use client";

import { ICON_BASE } from "../assetPaths";
import { useWoraWorkStore } from "../store";

export function HUD() {
  const started = useWoraWorkStore((s) => s.started);
  const muted = useWoraWorkStore((s) => s.muted);
  const toggleMuted = useWoraWorkStore((s) => s.toggleMuted);
  const toggleControls = useWoraWorkStore((s) => s.toggleControls);

  if (!started) return null;

  return (
    <>
      <button className="ww-hud-button ww-hud-button--left" onClick={() => toggleControls(true)} aria-label="Help">
        <img src={`${ICON_BASE}/QuestionMark.webp`} alt="" />
      </button>
      <button className="ww-hud-button ww-hud-button--right" onClick={toggleMuted} aria-label="Toggle music">
        <img src={muted ? `${ICON_BASE}/SpeakerOff.webp` : `${ICON_BASE}/SpeakerOn.webp`} alt="" />
      </button>
    </>
  );
}
