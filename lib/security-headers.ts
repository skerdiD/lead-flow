export type SecurityHeader = Readonly<{
  key: string;
  value: string;
}>;

type CspEnvironment = "development" | "production" | "test";

export type ContentSecurityPolicyOptions = Readonly<{
  nonce: string;
  environment: CspEnvironment;
  clerkFrontendApiOrigin?: string | null;
}>;

const CLERK_SCRIPT_FALLBACK_SOURCES = [
  "https://challenges.cloudflare.com",
  "https://*.protect.clerk.com",
] as const;

const CLERK_CONNECT_SOURCES = [
  "https://clerk-telemetry.com",
  "https://*.clerk-telemetry.com",
  "https://img.clerk.com",
  "https://*.protect.clerk.com",
] as const;

const CLERK_FRAME_SOURCES = [
  "https://challenges.cloudflare.com",
  "https://*.protect.clerk.com",
] as const;

function uniqueSources(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function directive(name: string, values: Array<string | null | undefined>) {
  return `${name} ${uniqueSources(values).join(" ")}`;
}

/**
 * Extracts Clerk's public Frontend API origin from a publishable key. The key
 * is public configuration, and only the decoded HTTPS origin is emitted.
 */
export function resolveClerkFrontendApiOrigin(
  publishableKey: string | undefined,
) {
  const encoded = publishableKey?.match(/^pk_(?:test|live)_(.+)$/)?.[1];
  if (!encoded) return null;

  try {
    const decoded = atob(encoded).replace(/\$$/, "");
    const url = new URL(
      decoded.startsWith("https://") ? decoded : `https://${decoded}`,
    );
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function generateCspNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function buildContentSecurityPolicy({
  nonce,
  environment,
  clerkFrontendApiOrigin,
}: ContentSecurityPolicyOptions) {
  const isDevelopment = environment === "development";
  const isProduction = environment === "production";
  const clerkOrigin = clerkFrontendApiOrigin ?? null;

  return [
    directive("default-src", ["'self'"]),
    directive("base-uri", ["'self'"]),
    directive("object-src", ["'none'"]),
    directive("frame-ancestors", ["'none'"]),
    directive("form-action", ["'self'"]),
    directive("script-src", [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      clerkOrigin,
      ...CLERK_SCRIPT_FALLBACK_SOURCES,
    ]),
    directive("script-src-attr", ["'none'"]),
    // Clerk's prebuilt components and React style props currently require
    // inline styles. Scripts remain nonce-protected.
    directive("style-src", ["'self'", "'unsafe-inline'"]),
    directive("img-src", ["'self'", "data:", "blob:", "https://img.clerk.com"]),
    directive("font-src", ["'self'"]),
    directive("connect-src", [
      "'self'",
      clerkOrigin,
      ...CLERK_CONNECT_SOURCES,
      ...(isDevelopment ? ["ws:", "wss:"] : []),
    ]),
    directive("frame-src", ["'self'", ...CLERK_FRAME_SOURCES]),
    directive("worker-src", ["'self'", "blob:"]),
    directive("manifest-src", ["'self'"]),
    directive("media-src", ["'self'"]),
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function getStaticSecurityHeaders(isProduction: boolean): SecurityHeader[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: [
        "accelerometer=()",
        "autoplay=()",
        "browsing-topics=()",
        "camera=()",
        "display-capture=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
      ].join(", "),
    },
    // OAuth/account popups retain their opener while unrelated top-level
    // documents still receive opener isolation.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    ...(isProduction
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ]
      : []),
  ];
}
