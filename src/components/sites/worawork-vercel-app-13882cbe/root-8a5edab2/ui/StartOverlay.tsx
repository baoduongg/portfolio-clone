"use client";

import { useWoraWorkStore } from "../store";

export function StartOverlay() {
  const started = useWoraWorkStore((s) => s.started);
  const start = useWoraWorkStore((s) => s.start);

  if (started) return null;

  return (
    <div className="ww-start-overlay">
      <button className="ww-start-button" onClick={() => start()}>
        Let&apos;s go
      </button>
    </div>
  );
}
