"use client";

import { useWoraWorkStore } from "../store";
import { Modal } from "./Modal";
import { PCDesktop } from "./PCDesktop";
import { PortfolioApp, portfolioUrlLabel } from "./PortfolioApp";
import { FlappyGame } from "./FlappyGame";

const PC_SENSOR = "Sitting_PC_Sensor";

export function PCScreen() {
  const portfolioOpen = useWoraWorkStore((s) => s.portfolioOpen);
  const pcApp = useWoraWorkStore((s) => s.pcApp);
  const setPcApp = useWoraWorkStore((s) => s.setPcApp);
  const currentPage = useWoraWorkStore((s) => s.currentPage);
  const sittingOn = useWoraWorkStore((s) => s.sittingOn);
  const setPortfolioOpen = useWoraWorkStore((s) => s.setPortfolioOpen);
  const setSittingOn = useWoraWorkStore((s) => s.setSittingOn);

  const close = () => {
    setPortfolioOpen(false);
    if (sittingOn === PC_SENSOR) setSittingOn(null);
  };

  const urlLabel =
    pcApp === "desktop" ? "worawork.dev" : pcApp === "flappy" ? "worawork.dev/flappy" : portfolioUrlLabel(currentPage);

  return (
    <Modal open={portfolioOpen} onClose={close} className="ww-portfolio-window">
      <div className="ww-pc-screen">
        <div className="ww-pc-browserbar">
          <button className="ww-pc-dot ww-pc-dot-red" onClick={close} aria-label="Close" />
          <span className="ww-pc-dot ww-pc-dot-yellow" />
          <span className="ww-pc-dot ww-pc-dot-green" />
          {pcApp !== "desktop" && (
            <button className="ww-pc-back" onClick={() => setPcApp("desktop")} aria-label="Back to desktop">
              ←
            </button>
          )}
          <div className="ww-pc-url-bar">
            <svg className="ww-pc-lock" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span>{urlLabel}</span>
          </div>
        </div>
        {pcApp === "desktop" && <PCDesktop />}
        {pcApp === "portfolio" && <PortfolioApp />}
        {pcApp === "flappy" && <FlappyGame />}
      </div>
    </Modal>
  );
}
