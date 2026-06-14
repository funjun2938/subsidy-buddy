import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { POST } from "./route";

// We don't actually call Gemini in unit tests; absence of GEMINI_API_KEY
// triggers the fallback branch deterministically.

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/grant-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/grant-summary", () => {
  it("returns 400 when grantTitle is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 on malformed JSON body", async () => {
    const bad = new Request("http://localhost/api/grant-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(bad);
    expect(res.status).toBe(400);
  });

  it("falls back gracefully when no API key", async () => {
    const res = await POST(
      makeReq({ grantTitle: "소상공인 디지털 역량 강화 패키지" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.source).toBe("fallback");
    expect(typeof json.summary).toBe("string");
    expect(json.summary.length).toBeGreaterThan(0);
  });

  it("caches result keyed by grantId across calls", async () => {
    const id = `test-${Date.now()}`;
    const first = await POST(makeReq({ grantId: id, grantTitle: "테스트 사업" }));
    const firstJson = await first.json();
    expect(firstJson.cached).toBe(false);

    const second = await POST(makeReq({ grantId: id, grantTitle: "테스트 사업" }));
    const secondJson = await second.json();
    expect(secondJson.cached).toBe(true);
    expect(secondJson.summary).toBe(firstJson.summary);
    expect(secondJson.ttlSeconds).toBeGreaterThan(0);
  });

  it("includes grantDescription up to 800 chars without crashing", async () => {
    const longDesc = "ㄱ".repeat(5000);
    const res = await POST(
      makeReq({
        grantTitle: "테스트",
        grantDescription: longDesc,
      }),
    );
    expect(res.status).toBe(200);
  });
});
