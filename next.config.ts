import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  // ponytail: StrictMode double-mounts in dev, which kills the WebGL
  // context on the worawork 3D scene (heavy GLTF/texture upload racing a
  // mount->unmount->remount). Only affects dev; no effect on prod builds.
  reactStrictMode: false,
  allowedDevOrigins:['10.1.14.84']
};

export default nextConfig;
