import type { NextConfig } from "next";
import { getStaticSecurityHeaders } from "./lib/security-headers";

const isProduction = process.env.NODE_ENV === "production";
const securityHeaders = getStaticSecurityHeaders(isProduction);

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Arcjet 1.9.1 publishes its Node WASM shims under a directory ending in a
  // dot, which Windows cannot materialize. The package's supported edge-light
  // entry uses the same analyzer without relying on that invalid path.
  turbopack:
    process.platform === "win32"
      ? {
          resolveAlias: {
            "@arcjet/analyze-wasm":
              "./node_modules/@arcjet/analyze-wasm/dist/edge-light.js",
          },
        }
      : undefined,
  async redirects() {
    return [
      {
        source: "/dashboard/accounts",
        destination: "/dashboard/customers/accounts",
        permanent: false,
      },
      {
        source: "/dashboard/accounts/:path*",
        destination: "/dashboard/customers/accounts/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/contacts",
        destination: "/dashboard/customers/contacts",
        permanent: false,
      },
      {
        source: "/dashboard/contacts/:path*",
        destination: "/dashboard/customers/contacts/:path*",
        permanent: false,
      },
      {
        source: "/dashboard/activity",
        destination: "/dashboard/settings/activity",
        permanent: false,
      },
      {
        source: "/dashboard/import/history",
        destination: "/dashboard/settings/imports/history",
        permanent: false,
      },
      {
        source: "/dashboard/import/:id",
        destination: "/dashboard/settings/imports/:id",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
