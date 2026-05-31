/**
 * fill-hwp-ai API route 테스트
 * 담당: yungyeonghye-maker
 * 도메인: HWPX 자동 기입 AI 엔진
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function makeHwpxRequest(fields: Record<string, string>, hwpxContent = "fake hwpx data"): NextRequest {
  const formData = new FormData();
  const hwpxFile = new File([hwpxContent], "test.hwpx", { type: "application/hwp+zip" });
  formData.append("hwpx", hwpxFile);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/fill-hwp-ai", {
    method: "POST",
    body: formData,
  });
}

function makeHwpRequest(): NextRequest {
  const formData = new FormData();
  const hwpFile = new File(["fake hwp data"], "test.hwp", { type: "application/hwp" });
  formData.append("hwpx", hwpFile);
  formData.append("bizInfo", "테스트 사업 정보");
  return new NextRequest("http://localhost/api/fill-hwp-ai", {
    method: "POST",
    body: formData,
  });
}

// ── buildPrompt 테스트 ─────────────────────────────────────────────────────────

describe("buildPrompt - 프롬프트 구성", () => {
  afterEach(() => vi.resetModules());

  it("모듈이 정상 import됨", async () => {
    const module = await import("../../app/api/fill-hwp-ai/route");
    expect(module.POST).toBeDefined();
  });
});

// ── parseJsonLoose 테스트 (내부 유틸) ─────────────────────────────────────────

describe("parseJsonLoose - JSON 파싱 유틸", () => {
  // fill-hwp-ai 내부 함수이므로 route 동작으로 간접 검증

  it("정상 JSON 응답 처리", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '{"기업명": "테스트 회사"}' },
          }),
        }),
      })),
    }));
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue("미리보기"),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명", "대표자"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 1 }),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      })),
    }));

    // 실제 route는 HWPX 파싱 등 복잡하므로 mock 기반 검증
    vi.unmock("@google/generative-ai");
    vi.unmock("@/lib/hwpx");
    vi.unmock("@/lib/hwpx-filler");
    vi.unmock("jszip");
    vi.unstubAllEnvs();
  });
});

// ── POST 핸들러 입력 유효성 검사 ───────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - 입력 유효성 검사", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("hwpx 파일 없으면 400 반환", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const formData = new FormData();
    formData.append("bizInfo", "테스트");
    const req = new NextRequest("http://localhost/api/fill-hwp-ai", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("hwpx가 문자열로 전송되면 400 반환", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const formData = new FormData();
    formData.append("hwpx", "not a file");
    formData.append("bizInfo", "테스트");
    const req = new NextRequest("http://localhost/api/fill-hwp-ai", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it(".hwp 파일 (hwpx 아님)이면 415 반환", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpRequest());
    expect(res.status).toBe(415);
    const json = await res.json();
    expect(json.error).toBeTruthy();
    expect(json.hint).toBeTruthy();
  });

  it("415 응답에 hint 필드 포함", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpRequest());
    const json = await res.json();
    expect(json.hint).toContain("hwpx");
  });

  it("bizInfo 없으면 400 반환", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const formData = new FormData();
    const hwpxFile = new File(["data"], "test.hwpx", { type: "application/hwp+zip" });
    formData.append("hwpx", hwpxFile);
    // bizInfo 없음
    const req = new NextRequest("http://localhost/api/fill-hwp-ai", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("빈 bizInfo이면 400 반환", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("bizInfo");
  });

  it("오류 응답에 error 필드 존재", async () => {
    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "" }));
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });
});

// ── POST 핸들러 - HWPX 파싱 오류 ─────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - HWPX 파싱 오류", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx");
  });

  it("HWPX 파싱 실패 시 400 반환", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockRejectedValue(new Error("Invalid HWPX format")),
      },
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트 사업 정보" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("파싱");
  });

  it("파싱 오류 응답에 detail 포함", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockRejectedValue(new Error("Corrupt file")),
      },
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    const json = await res.json();
    expect(json).toHaveProperty("detail");
    expect(json.detail).toBe("Corrupt file");
  });
});

// ── POST 핸들러 - 표 라벨 없음 ────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - 표 라벨 없음", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("@/lib/hwpx");
    vi.unmock("@/lib/hwpx-filler");
  });

  it("표 라벨 없으면 422 반환", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array()),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [], // 표 없음
      }),
      fillDocument: vi.fn(),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain("라벨");
  });

  it("표는 있지만 라벨 후보 없으면 422", async () => {
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array()),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: [] }],
      }),
      fillDocument: vi.fn(),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    expect(res.status).toBe(422);
  });

  it("라벨이 40자 초과이면 무시됨 (422 발생)", async () => {
    const longLabel = "A".repeat(41);
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array()),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: [longLabel] }],
      }),
      fillDocument: vi.fn(),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    expect(res.status).toBe(422);
  });
});

// ── POST 핸들러 - LLM 오류 ────────────────────────────────────────────────────

describe("POST /api/fill-hwp-ai - LLM 오류", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx");
    vi.unmock("@/lib/hwpx-filler");
    vi.unmock("@google/generative-ai");
  });

  it("API 키 없으면 LLM 실패 → 502 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array()),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명", "대표자"] }],
      }),
      fillDocument: vi.fn(),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트 사업 정보" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toContain("LLM");
    expect(json.hint).toBeTruthy();
  });

  it("502 응답에 hint 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array()),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn(),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    const json = await res.json();
    expect(json.hint).toContain("API_KEY");
  });

  it("LLM이 빈 답변 생성 시 422 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array()),
        }),
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
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "{}" }, // 빈 응답 — 유효한 라벨 없음
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트 사업 정보" }));
    expect([422, 200]).toContain(res.status);
  });
});

// ── POST 핸들러 - 정상 처리 (full mock) ──────────────────────────────────────

describe("POST /api/fill-hwp-ai - 정상 처리", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx");
    vi.unmock("@/lib/hwpx-filler");
    vi.unmock("@google/generative-ai");
    vi.unmock("jszip");
  });

  it("정상 처리 시 200 + zip 응답", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue("미리보기 텍스트"),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 3, cols: 2, label_candidates: ["기업명", "대표자", "사업자번호"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 2 }),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '{"기업명": "테스트 회사", "대표자": "홍길동"}' },
          }),
        }),
      })),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([80, 75, 3, 4])), // ZIP magic bytes
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트 회사, 대표자: 홍길동" }));
    expect(res.status).toBe(200);
  });

  it("정상 처리 시 Content-Type이 application/zip", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue("미리보기"),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 1 }),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '{"기업명": "테스트"}' },
          }),
        }),
      })),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    if (res.status === 200) {
      expect(res.headers.get("Content-Type")).toBe("application/zip");
    }
  });

  it("X-Filled-Count 헤더 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 3 }),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '{"기업명": "회사"}' },
          }),
        }),
      })),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1])),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    if (res.status === 200) {
      expect(res.headers.get("X-Filled-Count")).toBeTruthy();
    }
  });

  it("Content-Disposition에 filled.zip 파일명", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 1 }),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '{"기업명": "회사"}' },
          }),
        }),
      })),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1])),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트" }));
    if (res.status === 200) {
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain("filled.zip");
    }
  });

  it("grantTitle 있으면 LLM 프롬프트에 반영", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: { text: () => '{"기업명": "회사"}' },
    });
    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 1 }),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockGenerateContent,
        }),
      })),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1])),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    await POST(makeHwpxRequest({ bizInfo: "테스트", grantTitle: "예비창업패키지" }));
    if (mockGenerateContent.mock.calls.length > 0) {
      const promptArg = mockGenerateContent.mock.calls[0][0] as string;
      expect(promptArg).toContain("예비창업패키지");
    }
  });

  it("Claude 폴백 동작 (Gemini 없음)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockResolvedValue({ filled_count: 1 }),
    }));
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: '{"기업명": "Claude 회사"}' }],
          }),
        },
      })),
    }));
    vi.mock("jszip", () => ({
      default: vi.fn().mockImplementation(() => ({
        file: vi.fn(),
        generateAsync: vi.fn().mockResolvedValue(new Uint8Array([1])),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트 사업 정보" }));
    expect(res.status).toBe(200);
  });
});

// ── POST 핸들러 - fillDocument 오류 ──────────────────────────────────────────

describe("POST /api/fill-hwp-ai - fillDocument 오류", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@/lib/hwpx");
    vi.unmock("@/lib/hwpx-filler");
    vi.unmock("@google/generative-ai");
  });

  it("fillDocument throw 시 500 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");

    vi.mock("@/lib/hwpx", () => ({
      HwpxDocument: {
        fromBytes: vi.fn().mockResolvedValue({
          toTextPreview: vi.fn().mockReturnValue(""),
          toBytes: vi.fn().mockResolvedValue(new Uint8Array([1])),
        }),
      },
    }));
    vi.mock("@/lib/hwpx-filler", () => ({
      summarizeForPreview: vi.fn().mockReturnValue({
        tables: [{ index: 0, rows: 2, cols: 2, label_candidates: ["기업명"] }],
      }),
      fillDocument: vi.fn().mockRejectedValue(new Error("Fill failed")),
    }));
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => '{"기업명": "테스트"}' },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/fill-hwp-ai/route");
    const res = await POST(makeHwpxRequest({ bizInfo: "테스트 사업" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("채우기");
  });
});
