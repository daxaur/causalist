import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/app", permanent: false },
      { source: "/library", destination: "/app?tab=library", permanent: false },
      { source: "/reference", destination: "/app?tab=reference", permanent: false },
      { source: "/settings", destination: "/app/settings", permanent: false },
      {
        source: "/reference/:slug",
        destination: "/app/reference/:slug",
        permanent: false,
      },
      {
        source: "/preview/:slug",
        destination: "/app/preview/:slug",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
