import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@arcjet/next", () => ({
  default: vi.fn(() => ({ protect: vi.fn() })),
  detectBot: vi.fn(() => ({})),
  sensitiveInfo: vi.fn(() => ({})),
  shield: vi.fn(() => ({})),
  tokenBucket: vi.fn(() => ({})),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(),
}));

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(),
  isTextUIPart: vi.fn(),
  streamText: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { POST } from "@/app/api/chat/route";

const authMock = vi.mocked(auth);

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user_123" } as never);
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValue({ userId: null } as never);

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }),
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
    await expect(res.text()).resolves.toContain("Content-Type must be application/json");
  });
});
