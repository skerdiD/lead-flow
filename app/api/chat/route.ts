import { openai } from "@ai-sdk/openai";
import arcjet, {
  detectBot,
  sensitiveInfo,
  shield,
  tokenBucket,
} from "@arcjet/next";
import { auth } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";
import { convertToModelMessages, isTextUIPart, streamText } from "ai";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_SINGLE_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 30_000;

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"],
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({
      mode: "LIVE",
      allow: [],
    }),
    tokenBucket({
      mode: "LIVE",
      refillRate: 2_000,
      interval: "1h",
      capacity: 5_000,
    }),
    sensitiveInfo({
      mode: "LIVE",
      deny: ["CREDIT_CARD_NUMBER", "EMAIL"],
    }),
  ],
});

function getTextByteSize(input: string) {
  return new TextEncoder().encode(input).length;
}

function badRequest(message: string, status = 400) {
  return new Response(message, { status });
}

function extractLastMessageText(message: UIMessage | undefined) {
  if (!message) {
    return "";
  }

  const textFromParts = (message.parts ?? [])
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(" ");

  if (textFromParts.length > 0) {
    return textFromParts;
  }

  return JSON.stringify(message).slice(0, MAX_SINGLE_MESSAGE_CHARS);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return badRequest("Content-Type must be application/json", 415);
  }

  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return badRequest("Request body is too large", 413);
  }

  const rawBody = await req.text();
  if (!rawBody) {
    return badRequest("Request body is required");
  }

  if (getTextByteSize(rawBody) > MAX_BODY_BYTES) {
    return badRequest("Request body is too large", 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as { messages?: unknown }).messages)
  ) {
    return badRequest("Body must include a messages array");
  }

  const messages = (payload as { messages: unknown[] }).messages;
  if (messages.length === 0) {
    return badRequest("At least one message is required");
  }

  if (messages.length > MAX_MESSAGES) {
    return badRequest("Too many messages in a single request", 413);
  }

  const typedMessages = messages as UIMessage[];
  for (const message of typedMessages) {
    const normalizedMessage = extractLastMessageText(message);
    if (normalizedMessage.length > MAX_SINGLE_MESSAGE_CHARS) {
      return badRequest("A message is too large", 413);
    }
  }

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(typedMessages);
  } catch {
    return badRequest("Messages format is invalid");
  }

  const totalChars = modelMessages.reduce((sum, m) => {
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return sum + content.length;
  }, 0);

  if (totalChars > MAX_TOTAL_CHARS) {
    return badRequest("Conversation payload is too large", 413);
  }

  const estimate = Math.max(1, Math.ceil(totalChars / 4));
  const lastMessage = extractLastMessageText(typedMessages.at(-1));

  const decision = await aj.protect(req, {
    userId,
    requested: estimate,
    sensitiveInfoValue: lastMessage,
  });

  if (decision.isDenied()) {
    if (decision.reason.isBot()) {
      return new Response("Automated clients are not permitted", {
        status: 403,
      });
    }

    if (decision.reason.isRateLimit()) {
      return new Response("AI usage limit exceeded", { status: 429 });
    }

    if (decision.reason.isSensitiveInfo()) {
      return new Response("Sensitive information detected", { status: 400 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  const result = await streamText({
    model: openai("gpt-4o"),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
