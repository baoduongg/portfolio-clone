"use client";

import { useEffect, useState } from "react";
import { useWoraWorkStore } from "./store";

// Furniture sensors that just sit the character down in place (no panel).
// Sitting_PC_Sensor also sits, but additionally opens the portfolio panel,
// so it's handled separately below.
const SIT_FURNITURE = new Set([
  "Sitting_Bench_Sensor",
  "Sitting_Bench_Bed_Sensor",
  "Sitting_Chair_L_Sensor",
  "Sitting_Chair_R_Sensor",
  "Sitting_Sofa_Big_Sensor",
  "Sitting_Sofa_Small_Sensor",
  "Sitting_Stool_L_Sensor",
  "Sitting_Stool_R_Sensor",
]);
const PC_SENSOR = "Sitting_PC_Sensor";
const ENTRANCE_SENSOR = "Entrance_Sensor";
const EXIT_SENSOR = "Exit_Sensor";
export const LIGHTING_PREFIX = "Clickable_Lighting_";
const MAILBOX_SENSOR = "Clickable_MailBox_Sensor";

// Single source of truth for "is this sensor actually wired up to a game
// action" — shared with InteractionHints so the floating hint badges never
// point at a decorative sensor (e.g. the fridge/desk notes, Nintendo Switch)
// that E does nothing on.
export function isInteractiveSensor(name: string): boolean {
  return (
    name.startsWith(LIGHTING_PREFIX) ||
    SIT_FURNITURE.has(name) ||
    name === PC_SENSOR ||
    name === MAILBOX_SENSOR ||
    name === ENTRANCE_SENSOR ||
    name === EXIT_SENSOR
  );
}

export function InteractionOverlay() {
  const currentTouchingObject = useWoraWorkStore((s) => s.currentTouchingObject);
  const started = useWoraWorkStore((s) => s.started);
  const portfolioOpen = useWoraWorkStore((s) => s.portfolioOpen);
  const mailboxOpen = useWoraWorkStore((s) => s.mailboxOpen);
  const litSensors = useWoraWorkStore((s) => s.litSensors);
  const sittingOn = useWoraWorkStore((s) => s.sittingOn);
  const setPortfolioOpen = useWoraWorkStore((s) => s.setPortfolioOpen);
  const setPcApp = useWoraWorkStore((s) => s.setPcApp);
  const setMailboxOpen = useWoraWorkStore((s) => s.setMailboxOpen);
  const toggleLight = useWoraWorkStore((s) => s.toggleLight);
  const setSittingOn = useWoraWorkStore((s) => s.setSittingOn);
  const setInside = useWoraWorkStore((s) => s.setInside);

  const isLightSwitch = !!currentTouchingObject?.startsWith(LIGHTING_PREFIX);
  const isSitFurniture = !!currentTouchingObject && SIT_FURNITURE.has(currentTouchingObject);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE" || !currentTouchingObject) return;
      if (currentTouchingObject === PC_SENSOR) {
        setPortfolioOpen(true);
        setPcApp("desktop");
        setSittingOn(PC_SENSOR);
      } else if (currentTouchingObject === MAILBOX_SENSOR) {
        setMailboxOpen(true);
      } else if (currentTouchingObject === ENTRANCE_SENSOR) {
        setInside(true);
      } else if (currentTouchingObject === EXIT_SENSOR) {
        setInside(false);
      } else if (currentTouchingObject.startsWith(LIGHTING_PREFIX)) {
        toggleLight(currentTouchingObject.slice(0, -"_Sensor".length));
      } else if (SIT_FURNITURE.has(currentTouchingObject)) {
        setSittingOn(sittingOn === currentTouchingObject ? null : currentTouchingObject);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTouchingObject, sittingOn, setPortfolioOpen, setPcApp, setMailboxOpen, toggleLight, setSittingOn, setInside]);

  if (!started || portfolioOpen || mailboxOpen) return null;
  if (!currentTouchingObject || !isInteractiveSensor(currentTouchingObject)) return null;

  const base = currentTouchingObject.slice(0, -"_Sensor".length);
  const label = isLightSwitch
    ? litSensors[base]
      ? "Turn off the light"
      : "Turn on the light"
    : currentTouchingObject === PC_SENSOR
      ? "Check the PC"
      : currentTouchingObject === ENTRANCE_SENSOR
        ? "Enter home"
        : currentTouchingObject === EXIT_SENSOR
          ? "Leave home"
          : isSitFurniture
          ? sittingOn === currentTouchingObject
            ? "Stand up"
            : "Sit down"
          : "Open mailbox";

  return (
    <div className="ww-interact-prompt">
      <kbd>{isTouch ? "A" : "E"}</kbd>
      <span>{label}</span>
    </div>
  );
}
