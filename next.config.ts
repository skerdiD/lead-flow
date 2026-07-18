import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com${
    isProduction ? "" : " 'unsafe-eval'"
  }`,
  `connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com https://challenges.cloudflare.com${
    isProduction ? "" : " ws: wss:"
  }`,
  "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
