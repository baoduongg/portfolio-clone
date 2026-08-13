"use client";

import { useWoraWorkStore } from "../store";
import { Modal } from "./Modal";

export function ControlsModal() {
  const showControls = useWoraWorkStore((s) => s.showControls);
  const toggleControls = useWoraWorkStore((s) => s.toggleControls);

  return (
    <Modal open={showControls} onClose={() => toggleControls(false)} className="ww-modal">
      <button className="ww-modal-close" onClick={() => toggleControls(false)} aria-label="Close">
        ×
      </button>
      <h2>Controls</h2>
        <div className="ww-controls-grid">
          <div className="ww-controls-group">
            <span className="ww-controls-label">Move</span>
            <div className="ww-key-cluster">
              <kbd className="ww-key">W</kbd>
              <div className="ww-key-row">
                <kbd className="ww-key">A</kbd>
                <kbd className="ww-key">S</kbd>
                <kbd className="ww-key">D</kbd>
              </div>
            </div>
          </div>
          <div className="ww-controls-group">
            <span className="ww-controls-label">Run (Hold)</span>
            <kbd className="ww-key ww-key-wide">Shift</kbd>
          </div>
          <div className="ww-controls-group">
            <span className="ww-controls-label">Interact</span>
            <div className="ww-key-row">
              <span className="ww-mouse-icon" aria-hidden />
              <kbd className="ww-key">E</kbd>
            </div>
          </div>
          <div className="ww-controls-group">
            <span className="ww-controls-label">Zoom</span>
            <span className="ww-scroll-icon" aria-hidden />
          </div>
      </div>
    </Modal>
  );
}
