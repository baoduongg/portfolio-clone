"use client";

import { useEffect, useRef, useState } from "react";
import { useWoraWorkStore } from "../store";

const DEADZONE = 0.25;
const MAX_RADIUS = 40;
const DIR_KEYS = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" } as const;
type Dir = keyof typeof DIR_KEYS;

function fireKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

// Reuses the existing window keydown/keyup pipeline that Player.tsx and
// InteractionOverlay.tsx already listen to, instead of building a parallel
// analog input path — the joystick just fires synthetic WASD/Shift/E events.
export function TouchControls() {
  const started = useWoraWorkStore((s) => s.started);
  const [isTouch, setIsTouch] = useState(false);
  const activeDirs = useRef<Set<Dir>>(new Set());
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const setDir = (dir: Dir, active: boolean) => {
    const has = activeDirs.current.has(dir);
    if (active && !has) {
      activeDirs.current.add(dir);
      fireKey("keydown", DIR_KEYS[dir]);
    } else if (!active && has) {
      activeDirs.current.delete(dir);
      fireKey("keyup", DIR_KEYS[dir]);
    }
  };

  const clearDirs = () => {
    for (const dir of [...activeDirs.current]) setDir(dir, false);
  };

  useEffect(() => () => clearDirs(), []);

  const updateStick = (clientX: number, clientY: number) => {
    const origin = originRef.current;
    const knob = knobRef.current;
    if (!origin || !knob) return;
    let dx = clientX - origin.x;
    let dy = clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;
    setDir("left", nx < -DEADZONE);
    setDir("right", nx > DEADZONE);
    setDir("up", ny < -DEADZONE);
    setDir("down", ny > DEADZONE);
  };

  const onStickDown = (e: React.PointerEvent) => {
    const base = stickRef.current;
    if (!base) return;
    base.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    const rect = base.getBoundingClientRect();
    originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateStick(e.clientX, e.clientY);
  };

  const onStickMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    updateStick(e.clientX, e.clientY);
  };

  const onStickUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    originRef.current = null;
    clearDirs();
    knobRef.current?.style.setProperty("transform", "translate(0px, 0px)");
  };

  if (!isTouch || !started) return null;

  return (
    <div className="ww-touch-controls">
      <div
        ref={stickRef}
        className="ww-joystick-base"
        onPointerDown={onStickDown}
        onPointerMove={onStickMove}
        onPointerUp={onStickUp}
        onPointerCancel={onStickUp}
      >
        <div ref={knobRef} className="ww-joystick-knob" />
      </div>
      <div className="ww-action-buttons">
        <button
          className="ww-action-button ww-action-button--b"
          onPointerDown={() => fireKey("keydown", "ShiftLeft")}
          onPointerUp={() => fireKey("keyup", "ShiftLeft")}
          onPointerLeave={() => fireKey("keyup", "ShiftLeft")}
          onPointerCancel={() => fireKey("keyup", "ShiftLeft")}
        >
          B
        </button>
        <button
          className="ww-action-button ww-action-button--a"
          onPointerDown={() => fireKey("keydown", "KeyE")}
          onPointerUp={() => fireKey("keyup", "KeyE")}
          onPointerLeave={() => fireKey("keyup", "KeyE")}
          onPointerCancel={() => fireKey("keyup", "KeyE")}
        >
          A
        </button>
      </div>
    </div>
  );
}
