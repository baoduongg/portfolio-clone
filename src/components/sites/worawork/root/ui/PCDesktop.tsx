"use client";

import { Globe, Gamepad2 } from "lucide-react";
import { useWoraWorkStore } from "../store";

export function PCDesktop() {
  const setPcApp = useWoraWorkStore((s) => s.setPcApp);

  return (
    <div className="ww-pc-desktop">
      <button className="ww-pc-desktop-icon" onClick={() => setPcApp("portfolio")}>
        <span className="ww-pc-desktop-icon-badge ww-pc-desktop-icon-badge--portfolio">
          <Globe size={26} />
        </span>
        <span>Portfolio</span>
      </button>
      <button className="ww-pc-desktop-icon" onClick={() => setPcApp("flappy")}>
        <span className="ww-pc-desktop-icon-badge ww-pc-desktop-icon-badge--flappy">
          <Gamepad2 size={26} />
        </span>
        <span>Mini Game</span>
      </button>
    </div>
  );
}
