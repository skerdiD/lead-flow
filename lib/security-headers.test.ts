import { describe, expect, it, vi } from "vitest";
import {
  buildContentSecurityPolicy,
  generateCspNonce,
  getStaticSecurityHeaders,
  resolveClerkFrontendApiOrigin,
} from "@/lib/security-headers";

function directive(csp: string, name: string) {
  return csp
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name} `));
}

describe("HTTP security header policy", () => {
  it("builds a nonce-based production CSP without wildcard or unsafe script execution", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "production-nonce",
      environment: "production",
      clerkFrontendApiOrigin: "https://lead-flow.clerk.accounts.dev",
    });
    const scripts = directive(csp, "script-src");

    expect(scripts).toContain("'nonce-production-nonce'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).toContain("https://lead-flow.clerk.accounts.dev");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(scripts).not.toMatch(/(?:^|\s)\*(?:\s|$)/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(directive(csp, "img-src")).not.toMatch(/(?:^|\s)https:(?:\s|$)/);
  });

  it("adds only development tooling exceptions outside production", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "development-nonce",
      environment: "development",
      clerkFrontendApiOrigin: "https://lead-flow.clerk.accounts.dev",
    });

    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(directive(csp, "connect-src")).toContain("ws:");
    expect(directive(csp, "connect-src")).toContain("wss:");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("enables HSTS only for production and uses CSP rather than X-Frame-Options", () => {
    const production = getStaticSecurityHeaders(true);
    const development = getStaticSecurityHeaders(false);

    expect(production).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
    expect(development.some((header) => header.key === "Strict-Transport-Security")).toBe(false);
    expect(production.some((header) => header.key === "X-Frame-Options")).toBe(false);
    expect(production).toContainEqual({
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    });
    expect(production).toContainEqual({
      key: "Cross-Origin-Resource-Policy",
      value: "same-origin",
    });
  });

  it("derives only the exact HTTPS Clerk Frontend API origin from a publishable key", () => {
    const encoded = btoa("lead-flow.clerk.accounts.dev$");
    expect(resolveClerkFrontendApiOrigin(`pk_test_${encoded}`)).toBe(
      "https://lead-flow.clerk.accounts.dev",
    );
    expect(resolveClerkFrontendApiOrigin("pk_test_not-base64")).toBeNull();
    expect(resolveClerkFrontendApiOrigin(undefined)).toBeNull();
  });

  it("generates a fresh unpredictable nonce", () => {
    vi.spyOn(globalThis.crypto, "getRandomValues");
    const first = generateCspNonce();
    const second = generateCspNonce();

    expect(first).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(second).not.toBe(first);
    expect(globalThis.crypto.getRandomValues).toHaveBeenCalledTimes(2);
  });
});
