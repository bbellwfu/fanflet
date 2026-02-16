import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fanflet/ui", "@fanflet/db", "@fanflet/types"],
};

export default nextConfig;
