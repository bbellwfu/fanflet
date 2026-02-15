import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fanflet/ui", "@fanflet/db", "@fanflet/types"],
  async rewrites() {
    return [
      {
        source: "/pitch",
        destination: "/pitch/index.html",
      },
    ];
  },
};

export default nextConfig;
