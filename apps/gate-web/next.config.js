import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/access/:path*",
        destination: "http://127.0.0.1:4000/access/:path*",
      },
    ];
  },
};

export default nextConfig;
