/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  // Monorepo: transpile shared TS workspace package + pin tracing root to the
  // repo root (silences the multi-lockfile warning, keeps Vercel correct).
  transpilePackages: ["@reelcoach/core"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Server Actions handle video uploads (up to ~50MB clips). Default is 1MB.
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },

  // Allow loading images from Supabase storage and unsplash placeholders.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
