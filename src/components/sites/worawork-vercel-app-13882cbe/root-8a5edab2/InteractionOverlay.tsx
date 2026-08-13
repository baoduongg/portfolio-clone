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
const LIGHTING_PREFIX = "Clickable_Lighting_";

export function InteractionOverlay() {
  const currentTouchingObject = useWoraWorkStore((s) => s.currentTouchingObject);
  const started = useWoraWorkStore((s) => s.started);
  const portfolioOpen = useWoraWorkStore((s) => s.portfolioOpen);
  const mailboxOpen = useWoraWorkStore((s) => s.mailboxOpen);
  const litSensors = useWoraWorkStore((s) => s.litSensors);
  const sittingOn = useWoraWorkStore((s) => s.sittingOn);
  const setPortfolioOpen = useWoraWorkStore((s) => s.setPortfolioOpen);
  const setMailboxOpen = useWoraWorkStore((s) => s.setMailboxOpen);
  const toggleLight = useWoraWorkStore((s) => s.toggleLight);
  const setSittingOn = useWoraWorkStore((s) => s.setSittingOn);

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
        setSittingOn(PC_SENSOR);
      } else if (currentTouchingObject === "Clickable_MailBox_Sensor") {
        setMailboxOpen(true);
      } else if (currentTouchingObject.startsWith(LIGHTING_PREFIX)) {
        toggleLight(currentTouchingObject.slice(0, -"_Sensor".length));
      } else if (SIT_FURNITURE.has(currentTouchingObject)) {
        setSittingOn(sittingOn === currentTouchingObject ? null : currentTouchingObject);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTouchingObject, sittingOn, setPortfolioOpen, setMailboxOpen, toggleLight, setSittingOn]);

  if (!started || portfolioOpen || mailboxOpen) return null;
  if (!currentTouchingObject) return null;
  if (!isLightSwitch && !isSitFurniture && currentTouchingObject !== PC_SENSOR && currentTouchingObject !== "Clickable_MailBox_Sensor")
    return null;

  const base = currentTouchingObject.slice(0, -"_Sensor".length);
  const label = isLightSwitch
    ? litSensors[base]
      ? "Turn off the light"
      : "Turn on the light"
    : currentTouchingObject === PC_SENSOR
      ? "Check the PC"
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
