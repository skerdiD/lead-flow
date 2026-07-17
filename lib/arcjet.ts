import arcjet, {
  detectBot,
  fixedWindow,
  request,
  shield,
} from "@arcjet/next";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";
import { getRequestId } from "@/lib/request-context.server";
import { logger, logMetric } from "@/lib/logger.server";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE",
      allow: [],
    }),
    fixedWindow({
      mode: "LIVE",
      window: "1m",
      max: 20,
    }),
  ],
});

type ArcjetDecision = Awaited<ReturnType<typeof aj.protect>>;

function getDeniedMessage(decision: ArcjetDecision) {
  if (decision.reason.isRateLimit()) {
    return "Too many requests. Please wait a moment and try again.";
  }

  if (decision.reason.isBot()) {
    return "Automated traffic is not allowed for this action.";
  }

  return "This request was blocked for security reasons.";
}

async function protectRequest() {
  if (isSafeE2ETestMode()) {
    return {
      ok: true as const,
    };
  }

  const req = await request();
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    const requestId = await getRequestId();
    const status = decision.reason.isRateLimit() ? 429 : 403;
    logger.warn("security_request_rejected", "Request was rejected by the application protection layer.", {
      requestId,
      route: req.url ? new URL(req.url).pathname : undefined,
      statusCode: status,
      rejection: decision.reason.isRateLimit() ? "rate_limit" : decision.reason.isBot() ? "bot" : "shield",
    });
    if (status === 429) logMetric("rate_limit.rejected.count", 1, { requestId });
    return {
      ok: false as const,
      message: getDeniedMessage(decision),
      status,
    };
  }

  return {
    ok: true as const,
  };
}

export async function protectLeadMutation() {
  return protectRequest();
}

export async function protectLeadExport() {
  return protectRequest();
}

export async function protectCsvImport() {
  return protectRequest();
}

export async function protectDemoLogin() {
  return protectRequest();
}
