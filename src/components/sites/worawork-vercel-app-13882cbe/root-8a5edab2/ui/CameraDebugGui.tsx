"use client";

import { useEffect } from "react";
import GUI from "lil-gui";
import { CAMERA_OFFSET, cameraTuning } from "../cameraDebug";

// Dev-only camera tuning panel (see cameraDebug.ts). Drag the sliders to find
// a good angle/zoom, read the numbers off the panel, then hardcode them into
// cameraDebug.ts and remove this component + its render call.
export function CameraDebugGui() {
  useEffect(() => {
    const gui = new GUI({ title: "Camera debug" });

    const offset = gui.addFolder("Offset (angle)");
    offset.add(CAMERA_OFFSET, "x", -60, 60, 0.5).name("offset X");
    offset.add(CAMERA_OFFSET, "y", 0, 100, 0.5).name("offset Y (height)");
    offset.add(CAMERA_OFFSET, "z", -60, 60, 0.5).name("offset Z (distance)");
    offset.add(cameraTuning, "interiorZoomBoost", 0.3, 3, 0.01).name("interior zoom boost");

    const lens = gui.addFolder("Lens & zoom");
    lens.add(cameraTuning, "fov", 10, 70, 1).name("FOV");
    lens.add(cameraTuning, "zoomMin", 0.2, 2, 0.05).name("scroll zoom min");
    lens.add(cameraTuning, "zoomMax", 0.5, 3, 0.05).name("scroll zoom max");
    lens.add(cameraTuning, "introCloseZoom", 0.1, 1, 0.01).name("intro close zoom");

    gui
      .add(
        {
          log: () =>
            console.log(
              [
                `CAMERA_OFFSET = new THREE.Vector3(${CAMERA_OFFSET.x}, ${CAMERA_OFFSET.y}, ${CAMERA_OFFSET.z});`,
                "cameraTuning = {",
                `  interiorZoomBoost: ${cameraTuning.interiorZoomBoost},`,
                `  fov: ${cameraTuning.fov},`,
                `  zoomMin: ${cameraTuning.zoomMin},`,
                `  zoomMax: ${cameraTuning.zoomMax},`,
                `  introCloseZoom: ${cameraTuning.introCloseZoom},`,
                "};",
              ].join("\n")
            ),
        },
        "log"
      )
      .name("Log values to console");

    return () => gui.destroy();
  }, []);

  return null;
}
