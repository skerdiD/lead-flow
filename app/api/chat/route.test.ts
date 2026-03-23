import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  arcjetProtectMock,
  convertToModelMessagesMock,
  streamTextMock,
  openaiMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  arcjetProtectMock: vi.fn(),
  convertToModelMessagesMock: vi.fn(),
  streamTextMock: vi.fn(),
  openaiMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@arcjet/next", () => ({
  default: vi.fn(() => ({
    protect: arcjetProtectMock,
  })),
  detectBot: vi.fn(() => ({})),
  sensitiveInfo: vi.fn(() => ({})),
  shield: vi.fn(() => ({})),
  tokenBucket: vi.fn(() => ({})),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: openaiMock,
}));

vi.mock("ai", () => ({
  convertToModelMessages: convertToModelMessagesMock,
  isTextUIPart: (part: { type?: string }) => part?.type === "text",
  streamText: streamTextMock,
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_123" });
    arcjetProtectMock.mockResolvedValue({
      isDenied: () => false,
      reason: {
        isBot: () => false,
        isRateLimit: () => false,
        isSensitiveInfo: () => false,
      },
    });
    convertToModelMessagesMock.mockResolvedValue([
      { role: "user", content: "hello" },
    ]);
    openaiMock.mockReturnValue("mock-model");
    streamTextMock.mockResolvedValue({
      toUIMessageStreamResponse: () =>
        new Response("ok", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }],
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 415 for non-json content type", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello",
    });

    const res = await POST(req);

    expect(res.status).toBe(415);
    await expect(res.text()).resolves.toContain(
      "Content-Type must be application/json",
    );
  });

  it("streams a successful chat response for a valid request", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            parts: [{ type: "text", text: "Give me a short sales tip" }],
          },
        ],
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("ok");
    expect(convertToModelMessagesMock).toHaveBeenCalledTimes(1);
    expect(arcjetProtectMock).toHaveBeenCalledTimes(1);
    expect(streamTextMock).toHaveBeenCalledTimes(1);
  });
});
