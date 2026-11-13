import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  // lib/publik.ts reads the public publik app token (and the pending marker) from the repo root at run time.
  outputFileTracingIncludes: { "/api/**": ["./publik-app-token.txt", "./publik-pending.txt"] },
};

export default nextConfig;
