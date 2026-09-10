import path from "node:path";
import { getAccessApiUrl } from "./lib/access-api-url.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  async rewrites() {
    const apiBase = getAccessApiUrl();

    return [
      {
        source: "/access/:path*",
        destination: `${apiBase}/access/:path*`,
      },
    ];
  },
};

export default nextConfig;
