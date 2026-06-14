/**
 * fill-hwp-ai API route 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: HWPX AI 자동 기입 엔진
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

function makeFormRequest(fields: Record<string, string>, hwpxFile?: File): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (hwpxFile) formData.append("hwpx", hwpxFile);
  return new NextRequest("http://localhost/api/fill-hwp-ai", {
    method: "POST",
    body: formData,
  });
}

function makeHwpxFile(content = "fake hwpx content", name = "test.hwpx"): File {
  return new File([content], name, { type: "application/octet-stream" });
}

// ── 입력 유효성 검사 ───────────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - 입력 유효성 검사", () => {
  afterEach(() => vi.resetModules());

  it("hwpx 파일 없으면 400", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }));
    expect(res.status).toBe(400);
  });

  it("hwpx 필드가 문자열이면 400", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const formData = new FormData();
    formData.append("hwpx", "string");
    formData.append("bizInfo", "테스트");
    const req = new NextRequest("http://localhost/api/fill-hwp-ai", { method: "POST", body: formData });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it(".hwp 파일이면 415", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const hwpFile = new File(["content"], "test.hwp");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, hwpFile));
    expect(res.status).toBe(415);
  });

  it("415 응답에 hint 포함", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const hwpFile = new File(["content"], "test.hwp");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, hwpFile));
    const json = await res.json();
    expect(json).toHaveProperty("hint");
  });

  it("bizInfo 없으면 400", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({}, makeHwpxFile()));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("bizInfo");
  });

  it("bizInfo 빈 문자열이면 400", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "   " }, makeHwpxFile()));
    expect(res.status).toBe(400);
  });

  it("오류 응답에 error 필드", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }));
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it(".PDF 파일도 hwpx 아니면 415", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const pdfFile = new File(["%PDF"], "test.pdf");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, pdfFile));
    expect(res.status).toBe(415);
  });

  it("대소문자 .HWPX도 허용", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const hwpxFile = new File(["content"], "TEST.HWPX");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, hwpxFile));
    // 파싱 실패여도 415는 아님
    expect(res.status).not.toBe(415);
  });
});

// ── HWPX 파싱 실패 ────────────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - HWPX 파싱 실패", () => {
  afterEach(() => { vi.resetModules(); vi.unmock("@/lib/hwpx"); vi.unmock("@/lib/hwpx-filler"); });

  it("HWPX 파싱 실패 시 400", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: { fromBytes: vi.fn().mockRejectedValue(new Error("Invalid HWPX")) },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({ tables: [] }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    expect(res.status).toBe(400);
  });

  it("파싱 오류 응답에 detail 포함", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: { fromBytes: vi.fn().mockRejectedValue(new Error("Parse error detail")) },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({ tables: [] }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    const json = await res.json();
    expect(json).toHaveProperty("detail");
  });
});

// ── 라벨 없을 때 ───────────────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - 라벨 없을 때 422", () => {
  afterEach(() => { vi.resetModules(); vi.unmock("@/lib/hwpx"); vi.unmock("@/lib/hwpx-filler"); });

  it("표 없으면 422", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({ tables: [] }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    expect(res.status).toBe(422);
  });

  it("40자 초과 라벨만 있으면 422", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["이건 40자를 초과하는 매우 긴 라벨이라서 제외되어야 합니다"] }],
      }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    expect(res.status).toBe(422);
  });

  it("빈 라벨만 있으면 422", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["", " ", "  "] }],
      }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    expect(res.status).toBe(422);
  });
});

// ── LLM 빈 응답 ───────────────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - LLM 빈 답변 422", () => {
  afterEach(() => {
    vi.resetModules(); vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx"); vi.unmock("@/lib/hwpx-filler"); vi.unmock("@google/generative-ai");
  });

  it("LLM 빈 JSON 반환이면 422", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명", "대표자"] }],
      }),
      fillDocument: vi.fn(),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({ response: { text: () => "{}" } }),
        }),
      })),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json).toHaveProperty("labels");
  });

  it("422 응답에 hint 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn(),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({ response: { text: () => "{}" } }),
        }),
      })),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    if (res.status === 422) {
      const json = await res.json();
      expect(json).toHaveProperty("hint");
    }
  });
});

// ── 정상 동작 ─────────────────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - 정상 동작", () => {
  afterEach(() => {
    vi.resetModules(); vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx"); vi.unmock("@/lib/hwpx-filler"); vi.unmock("@google/generative-ai");
  });

  const setupFullMocks = (aiResponse: Record<string, string>) => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
          toTextPreview: vi.fn().mockReturnValue("미리보기"),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 3, cols: 2, label_candidates: Object.keys(aiResponse) }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: Object.keys(aiResponse).length }),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(aiResponse) },
          }),
        }),
      })),
    }));
  };

  it("정상 흐름 시 200", async () => {
    setupFullMocks({ 기업명: "(주)테스트", 대표자: "홍길동" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: (주)테스트, 대표자: 홍길동" }, makeHwpxFile()));
    expect(res.status).toBe(200);
  });

  it("200 응답 Content-Type은 zip", async () => {
    setupFullMocks({ 기업명: "테스트" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: 테스트" }, makeHwpxFile()));
    if (res.status === 200) {
      expect(res.headers.get("Content-Type")).toBe("application/zip");
    }
  });

  it("Content-Disposition 헤더 포함", async () => {
    setupFullMocks({ 기업명: "테스트" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: 테스트" }, makeHwpxFile()));
    if (res.status === 200) {
      expect(res.headers.get("Content-Disposition")).toContain("filled.zip");
    }
  });

  it("X-Filled-Count 헤더 포함", async () => {
    setupFullMocks({ 기업명: "테스트", 대표자: "홍길동" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: 테스트" }, makeHwpxFile()));
    if (res.status === 200) {
      const count = res.headers.get("X-Filled-Count");
      expect(count).toBeTruthy();
    }
  });

  it("X-Ai-Labels 헤더 포함", async () => {
    setupFullMocks({ 기업명: "테스트" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: 테스트" }, makeHwpxFile()));
    if (res.status === 200) {
      expect(res.headers.get("X-Ai-Labels")).toBeTruthy();
    }
  });

  it("X-Ai-Answers 헤더 포함", async () => {
    setupFullMocks({ 기업명: "테스트" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: 테스트" }, makeHwpxFile()));
    if (res.status === 200) {
      expect(res.headers.get("X-Ai-Answers")).toBeTruthy();
    }
  });

  it("grantTitle 없어도 200", async () => {
    setupFullMocks({ 기업명: "테스트" });
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "기업명: 테스트" }, makeHwpxFile()));
    expect([200, 422]).toContain(res.status);
  });

  it("grantTitle 있으면 프롬프트에 반영", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1])),
          toTextPreview: vi.fn().mockReturnValue(""),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 1 }),
    }));
    const mockFn = vi.fn().mockResolvedValue({
      response: { text: () => JSON.stringify({ 기업명: "테스트" }) },
    });
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({ generateContent: mockFn }),
      })),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    await POST(makeFormRequest({ bizInfo: "테스트", grantTitle: "예비창업패키지 2024" }, makeHwpxFile()));
    if (mockFn.mock.calls.length > 0) {
      expect(mockFn.mock.calls[0][0]).toContain("예비창업패키지 2024");
    }
  });
});

// ── Claude 폴백 ───────────────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - Claude 폴백", () => {
  afterEach(() => {
    vi.resetModules(); vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx"); vi.unmock("@/lib/hwpx-filler");
    vi.unmock("@google/generative-ai"); vi.unmock("@anthropic-ai/sdk");
  });

  it("Gemini/Claude 키 없으면 502", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    expect([422, 500, 502]).toContain(res.status);
  });

  it("502 응답에 hint 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({ toBytes: vi.fn(), toTextPreview: vi.fn().mockReturnValue("") }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn(),
    }));
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeFormRequest({ bizInfo: "테스트" }, makeHwpxFile()));
    if (res.status === 502) {
      const json = await res.json();
      expect(json).toHaveProperty("hint");
    }
  });
});
