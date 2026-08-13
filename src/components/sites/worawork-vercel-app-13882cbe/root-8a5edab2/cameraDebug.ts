import * as THREE from "three";

// Mutable so the debug GUI (ui/CameraDebugGui.tsx) can tune these live in
// the browser — drag the sliders until the framing looks right, read the
// numbers off the panel, then hardcode them back here and delete the GUI
// import once you're happy. This file has no other purpose.
export const CAMERA_OFFSET = new THREE.Vector3(0, 58, 48);
export const cameraTuning = {
  // The interior room is smaller/more enclosed than the exterior map, so the
  // same fixed offset that frames the outdoor scene nicely crops furniture
  // and the player against the walls indoors — pull the camera back further
  // there.
  interiorZoomBoost: 0.67,
  // Canvas perspective camera field of view (applied live in Player.tsx).
  fov: 32,
  // Mouse-wheel zoom clamp (Scene.tsx) — how far in/out the player can scroll.
  zoomMin: 0.6,
  zoomMax: 1.6,
  // How close the intro sequence zooms in on "Let's go" before easing back out.
  introCloseZoom: 0.32,
};
