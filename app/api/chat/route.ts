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

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const totalChars = modelMessages.reduce((sum, m) => {
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return sum + content.length;
  }, 0);
  const estimate = Math.ceil(totalChars / 4);

  const lastMessage = (messages.at(-1)?.parts ?? [])
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join(" ");

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
