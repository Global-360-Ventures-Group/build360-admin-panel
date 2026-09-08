import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Brand, category and product images live in the API's R2 bucket and are
      // served publicly from here. next/image refuses unlisted hosts, so
      // logos would render as broken without this entry.
      {
        protocol: "https",
        hostname: "storage.build360bd.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
