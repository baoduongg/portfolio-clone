"use client";

import { useEffect, useRef } from "react";
import { SOUND_BG_MUSIC, SOUND_DAY_AMBIENT } from "./assetPaths";
import { useWoraWorkStore } from "./store";

export function AudioManager() {
  const started = useWoraWorkStore((s) => s.started);
  const muted = useWoraWorkStore((s) => s.muted);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    musicRef.current = new Audio(SOUND_BG_MUSIC);
    musicRef.current.loop = true;
    musicRef.current.volume = 0.25;
    ambientRef.current = new Audio(SOUND_DAY_AMBIENT);
    ambientRef.current.loop = true;
    ambientRef.current.volume = 0.35;
    return () => {
      musicRef.current?.pause();
      ambientRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    if (muted) {
      musicRef.current?.pause();
      ambientRef.current?.pause();
    } else {
      musicRef.current?.play().catch(() => {});
      ambientRef.current?.play().catch(() => {});
    }
  }, [started, muted]);

  return null;
}
