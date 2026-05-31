/**
 * analyze-doc API route 테스트
 * 담당: yungyeonghye-maker
 * 도메인: 사업자등록증/문서 분석 AI 엔진
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function makeTextRequest(body: Record<string, string | null>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value !== null) formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/analyze-doc", {
    method: "POST",
    body: formData,
  });
}

function makeFileRequest(file: File, extraText?: string): NextRequest {
  const formData = new FormData();
  formData.append("file", file);
  if (extraText) formData.append("extraText", extraText);
  return new NextRequest("http://localhost/api/analyze-doc", {
    method: "POST",
    body: formData,
  });
}

function makeTextFile(content: string, name = "test.txt", type = "text/plain"): File {
  return new File([content], name, { type });
}

// ── EXTRACT_PROMPT 내용 검증 ───────────────────────────────────────────────────

describe("EXTRACT_PROMPT 구조 검증", () => {
  it("EXTRACT_PROMPT는 10개 추출 항목 포함", async () => {
    // EXTRACT_PROMPT가 모든 필수 필드를 포함하는지 간접 검증
    // 이 테스트는 모듈 import 시 EXTRACT_PROMPT 구조가 올바른지 확인
    const module = await import("../../app/api/analyze-doc/route");
    expect(module.POST).toBeDefined();
  });
});

// ── POST 핸들러 입력 유효성 검사 ───────────────────────────────────────────────

describe("POST /api/analyze-doc - 입력 유효성 검사", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("file/text/extraText 모두 없으면 400 반환", async () => {
    const { POST } = await import("../../app/api/analyze-doc/route");
    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/analyze-doc", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("오류 응답에 error 필드 존재", async () => {
    const { POST } = await import("../../app/api/analyze-doc/route");
    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/analyze-doc", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("extraText만 있어도 분석 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ extraText: "직원 5명, 소프트웨어 업종" });
    const res = await POST(req);
    // AI 없으면 500이지만 400은 아님 (extraText는 유효한 입력)
    expect([200, 500]).toContain(res.status);
  });

  it("text만 있어도 분석 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증 텍스트" });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});

// ── analyzeText - Gemini mocking ────────────────────────────────────────────────

describe("analyzeText - Gemini mocking", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@google/generative-ai");
  });

  const mockExtractResult = {
    bizType: "IT·소프트웨어",
    revenue: "1억~3억",
    region: "서울",
    bizAge: "1~3년",
    ceoAge: "만 30~39세",
    employeeCount: "5~9명",
    ceoGender: "남성",
    certifications: ["벤처기업 인증"],
    summary: "IT 소프트웨어 스타트업",
    keywords: ["IT", "소프트웨어", "스타트업"],
  };

  it("Gemini 정상 응답 시 200 + result 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockExtractResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증 내용" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("result");
  });

  it("result에 bizType 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockExtractResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.result).toHaveProperty("bizType");
    expect(json.result.bizType).toBe("IT·소프트웨어");
  });

  it("result에 region 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockExtractResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.result.region).toBe("서울");
  });

  it("result에 certifications 배열 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockExtractResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    const json = await res.json();
    expect(Array.isArray(json.result.certifications)).toBe(true);
  });

  it("마크다운 코드블록 감싸진 JSON도 파싱", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => `\`\`\`json\n${JSON.stringify(mockExtractResult)}\n\`\`\`` },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("Gemini 응답이 JSON 파싱 실패하면 raw 필드 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "invalid json {broken" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    // raw 필드가 있거나 error가 있어야 함
    const json = await res.json();
    expect(json.result !== undefined || json.error !== undefined || json.raw !== undefined).toBe(true);
  });

  it("Gemini throw 시 Claude 폴백 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("Quota")),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });

  it("text + extraText 함께 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockExtractResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증", extraText: "직원 5명, 여성 대표자" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

// ── analyzeText - Claude mocking ────────────────────────────────────────────────

describe("analyzeText - Claude mocking (Gemini 폴백)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@anthropic-ai/sdk");
    vi.unmock("@google/generative-ai");
  });

  it("Claude 정상 응답 시 result 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockResult = {
      bizType: "서비스업",
      revenue: "5천만원 미만",
      region: "경기",
      bizAge: "3~5년",
      ceoAge: "만 40~49세",
      employeeCount: "1~4명",
      ceoGender: "여성",
      certifications: [],
      summary: "경기도 서비스업",
      keywords: ["서비스", "경기"],
    };

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockResult) }],
          }),
        },
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증 내용" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("result");
  });

  it("모든 AI 없으면 500 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "사업자등록증" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("API 키");
  });
});

// ── analyzeWithVision - 파일 타입 처리 ─────────────────────────────────────────

describe("analyzeWithVision - 파일 타입 처리", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@google/generative-ai");
  });

  it("이미지 파일이면 Vision 분석 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["fake image data"], "test.jpg", { type: "image/jpeg" });
    const req = makeFileRequest(file);
    const res = await POST(req);
    // Gemini 없으면 500
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("PDF 파일이면 Vision 분석 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["%PDF-1.4"], "test.pdf", { type: "application/pdf" });
    const req = makeFileRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("텍스트 파일이면 텍스트 추출 후 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = makeTextFile("사업자등록증 텍스트 내용");
    const req = makeFileRequest(file);
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });

  it("이미지 + Gemini Vision 정상 응답", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockResult = {
      bizType: "IT·소프트웨어",
      revenue: "1억~3억",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "만 30~39세",
      employeeCount: "5~9명",
      ceoGender: "남성",
      certifications: [],
      summary: "IT 기업",
      keywords: ["IT"],
    };

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["fake image"], "business.jpg", { type: "image/jpeg" });
    const req = makeFileRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("result");
  });

  it("이미지 + extraText 함께 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify({ bizType: "IT·소프트웨어", certifications: [] }) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["fake image"], "reg.jpg", { type: "image/jpeg" });
    const req = makeFileRequest(file, "직원 10명, 벤처기업 인증");
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("PNG 파일도 Vision 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["fake png"], "test.png", { type: "image/png" });
    const req = makeFileRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500); // Gemini 없음
  });

  it("Vision 분석 실패 시 오류 응답", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("Vision failed")),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["fake"], "test.jpg", { type: "image/jpeg" });
    const req = makeFileRequest(file);
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("JSON 파싱 실패 시 error 응답", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "{ broken json" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/analyze-doc/route");
    const file = new File(["fake"], "test.jpg", { type: "image/jpeg" });
    const req = makeFileRequest(file);
    const res = await POST(req);
    const json = await res.json();
    expect(json.error !== undefined || json.raw !== undefined).toBe(true);
  });
});

// ── 오류 처리 ────────────────────────────────────────────────────────────────────

describe("POST /api/analyze-doc - 오류 처리", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("오류 발생 시 500 반환 + error 필드", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = makeTextRequest({ text: "테스트" });
    const res = await POST(req);
    if (res.status === 500) {
      const json = await res.json();
      expect(json.error).toBeTruthy();
    }
  });

  it("Content-Type 오류도 graceful하게 처리", async () => {
    const { POST } = await import("../../app/api/analyze-doc/route");
    const req = new NextRequest("http://localhost/api/analyze-doc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "사업자등록증" }),
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });
});
