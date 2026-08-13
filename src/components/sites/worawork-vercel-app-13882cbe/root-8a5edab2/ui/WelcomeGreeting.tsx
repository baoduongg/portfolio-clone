"use client";

import { useWoraWorkStore } from "../store";
import { dialogueLines } from "../data/content";

export function WelcomeGreeting() {
  const show = useWoraWorkStore((s) => s.showGreetingText);

  return (
    <div className={`ww-greeting-bubble${show ? " ww-greeting-bubble--visible" : ""}`}>
      {dialogueLines.greeting.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
