import arcjet, {
  detectBot,
  fixedWindow,
  request,
  shield,
} from "@arcjet/next";
import { isSafeE2ETestMode } from "@/lib/e2e-test-mode";

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
    return {
      ok: false as const,
      message: getDeniedMessage(decision),
      status: decision.reason.isRateLimit() ? 429 : 403,
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
