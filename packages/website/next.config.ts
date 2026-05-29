import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["rules", "core"],
  typedRoutes: true,
};

export default config;
