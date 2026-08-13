"use client";

import { useEffect } from "react";
import { useWoraWorkStore } from "./store";

const INTERACTABLE = new Set(["Sitting_PC_Sensor", "Clickable_MailBox_Sensor"]);

export function InteractionOverlay() {
  const currentTouchingObject = useWoraWorkStore((s) => s.currentTouchingObject);
  const started = useWoraWorkStore((s) => s.started);
  const portfolioOpen = useWoraWorkStore((s) => s.portfolioOpen);
  const mailboxOpen = useWoraWorkStore((s) => s.mailboxOpen);
  const setPortfolioOpen = useWoraWorkStore((s) => s.setPortfolioOpen);
  const setMailboxOpen = useWoraWorkStore((s) => s.setMailboxOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyE") return;
      if (currentTouchingObject === "Sitting_PC_Sensor") setPortfolioOpen(true);
      if (currentTouchingObject === "Clickable_MailBox_Sensor") setMailboxOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTouchingObject, setPortfolioOpen, setMailboxOpen]);

  if (!started || portfolioOpen || mailboxOpen) return null;
  if (!currentTouchingObject || !INTERACTABLE.has(currentTouchingObject)) return null;

  const label = currentTouchingObject === "Sitting_PC_Sensor" ? "Check the PC" : "Open mailbox";

  return (
    <div className="ww-interact-prompt">
      <kbd>E</kbd>
      <span>{label}</span>
    </div>
  );
}
