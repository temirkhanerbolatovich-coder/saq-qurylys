import type { NextConfig } from "next";
import path from "node:path";

const frontendRoot = path.resolve(__dirname);
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingRoot: frontendRoot,
  turbopack: { root: frontendRoot },
};
export default nextConfig;
