import "server-only";

import { createHmac } from "node:crypto";
import arcjet, { detectBot, fixedWindow, request as currentRequest, shield } from "@arcjet/next";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import { logger, logMetric } from "@/lib/logger.server";
import { getRequestId } from "@/lib/request-context.server";
import { rateLimitPolicies, type RateLimitAction } from "@/lib/rate-limit-policies";

export const RATE_LIMIT_MESSAGE = "Too many requests. Please wait and try again.";
export const RATE_LIMIT_UNAVAILABLE_MESSAGE = "This action is temporarily unavailable. Please try again shortly.";
export const SECURITY_BLOCK_MESSAGE = "This request was blocked for security reasons.";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; status: 403 | 429 | 503; message: string; retryAfter?: number };

type RateLimitInput = {
  action: RateLimitAction;
  actorUserId?: string | null;
  workspaceId?: string | null;
  request?: Request;
};

function createClient(action: RateLimitAction) {
  const policy = rateLimitPolicies[action];
  return arcjet({
    key: process.env.ARCJET_KEY!,
    characteristics: ["rateLimitKey"],
    rules: [
      shield({ mode: "LIVE" }),
      detectBot({ mode: "LIVE", allow: [] }),
      fixedWindow({ mode: "LIVE", max: policy.max, window: policy.window }),
    ],
  });
}

const clients = new Map<RateLimitAction, ReturnType<typeof createClient>>();

function getClient(action: RateLimitAction) {
  const existing = clients.get(action);
  if (existing) return existing;
  const client = createClient(action);
  clients.set(action, client);
  return client;
}

function hashIdentifier(value: string) {
  const secret = process.env.RATE_LIMIT_KEY_SECRET || process.env.ARCJET_KEY || "lead-flow-development-only";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function getClientIp(request: Request | Awaited<ReturnType<typeof currentRequest>>) {
  if ("ip" in request && typeof request.ip === "string" && request.ip) return request.ip;
  const headers = request.headers instanceof Headers ? request.headers : new Headers();
  if (!(request.headers instanceof Headers)) {
    for (const [name, value] of Object.entries(request.headers ?? {})) {
      if (Array.isArray(value)) headers.set(name, value.join(","));
      else if (value !== undefined) headers.set(name, value);
    }
  }
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("cf-connecting-ip") || headers.get("x-real-ip") || forwarded || "unknown";
}

export function buildRateLimitIdentity(input: Omit<RateLimitInput, "request"> & { ipAddress?: string }) {
  const scope = input.actorUserId
    ? `user:${input.actorUserId}|workspace:${input.workspaceId || "none"}`
    : `anonymous-ip:${input.ipAddress || "unknown"}`;
  return hashIdentifier(`v1|action:${input.action}|${scope}`);
}

function retryAfterSeconds(decision: { reason?: { resetTime?: Date } }) {
  const resetTime = decision.reason?.resetTime;
  if (!(resetTime instanceof Date)) return undefined;
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}

function providerErrored(decision: { isErrored?: () => boolean; conclusion?: string; results?: Array<{ conclusion?: string }> }) {
  return decision.isErrored?.() === true || decision.conclusion === "ERROR" || decision.results?.some((result) => result.conclusion === "ERROR") === true;
}

export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  if (isSafeE2ETestMode()) return { ok: true };

  const policy = rateLimitPolicies[input.action];
  const request = input.request ?? await currentRequest();
  const requestId = await getRequestId();
  const rateLimitKey = buildRateLimitIdentity({
    action: input.action,
    actorUserId: input.actorUserId,
    workspaceId: input.workspaceId,
    ipAddress: input.actorUserId ? undefined : getClientIp(request),
  });

  try {
    const decision = await getClient(input.action).protect(request, { rateLimitKey });
    if (providerErrored(decision)) {
      logger.error("rate_limit_provider_unavailable", "Rate-limit provider could not make a decision.", { requestId, operation: input.action });
      if (policy.failClosed) return { ok: false, status: 503, message: RATE_LIMIT_UNAVAILABLE_MESSAGE, retryAfter: 30 };
      return { ok: true };
    }

    if (decision.isDenied()) {
      const rateLimited = decision.reason.isRateLimit();
      const status = rateLimited ? 429 : 403;
      const retryAfter = rateLimited ? retryAfterSeconds(decision as unknown as { reason?: { resetTime?: Date } }) : undefined;
      logger.warn(rateLimited ? "rate_limit_rejected" : "security_request_rejected", rateLimited ? "Request exceeded an action rate limit." : "Request was rejected by the application protection layer.", {
        requestId,
        operation: input.action,
        statusCode: status,
      });
      if (rateLimited) logMetric("rate_limit.rejected.count", 1, { requestId, operation: input.action });
      return { ok: false, status, message: rateLimited ? RATE_LIMIT_MESSAGE : SECURITY_BLOCK_MESSAGE, retryAfter };
    }
    return { ok: true };
  } catch (error) {
    logger.error("rate_limit_provider_unavailable", "Rate-limit provider call failed.", {
      requestId,
      operation: input.action,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return policy.failClosed
      ? { ok: false, status: 503, message: RATE_LIMIT_UNAVAILABLE_MESSAGE, retryAfter: 30 }
      : { ok: true };
  }
}

export function rateLimitHeaders(result: Exclude<RateLimitResult, { ok: true }>) {
  return result.retryAfter ? { "Retry-After": String(result.retryAfter) } : undefined;
}

/** Compatibility entry point for existing generic task mutations. */
export async function protectLeadMutation() {
  const [{ requireUserId }, { getCurrentWorkspace }] = await Promise.all([
    import("@/lib/auth"),
    import("@/lib/workspaces"),
  ]);
  const [actorUserId, workspace] = await Promise.all([requireUserId(), getCurrentWorkspace()]);
  return enforceRateLimit({ action: "crm:mutation", actorUserId, workspaceId: workspace.id });
}

/** @deprecated New route handlers should call enforceRateLimit with trusted scope. */
export async function protectCsvImport() {
  const [{ requireUserId }, { getCurrentWorkspace }] = await Promise.all([
    import("@/lib/auth"),
    import("@/lib/workspaces"),
  ]);
  const [actorUserId, workspace] = await Promise.all([requireUserId(), getCurrentWorkspace()]);
  return enforceRateLimit({ action: "csv:import", actorUserId, workspaceId: workspace.id });
}
