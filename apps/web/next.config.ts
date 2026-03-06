import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : "";

const nextConfig: NextConfig = {
  transpilePackages: ["@fanflet/ui", "@fanflet/db", "@fanflet/types"],
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
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
