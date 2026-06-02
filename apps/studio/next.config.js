/** @type {import('next').NextConfig} */
const nextConfig = {
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
