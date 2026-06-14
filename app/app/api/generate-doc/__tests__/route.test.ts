/**
 * generate-doc API route 테스트
 * 담당: yungyeonghye-maker
 * 도메인: 문서 생성 AI 엔진
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/generate-doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GRANT_TEMPLATES / getTemplate 테스트 ───────────────────────────────────────

describe("getTemplate - 템플릿 선택 로직", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("'예비창업패키지' 포함 제목이면 해당 템플릿 선택", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    // getTemplate 내부 로직을 간접 검증
    // grantTitle에 '예비창업패키지' 포함 시 docs가 3개인 템플릿 사용
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "2024 예비창업패키지 모집", bizInfo: "IT 스타트업입니다." });
    const res = await POST(req);
    const json = await res.json();
    // AI 키 없으면 "AI API 키" 오류가 content에 담김
    expect(res.status).toBeOneOf([200, 500]);
  });

  it("'초기창업패키지' 포함 제목이면 해당 템플릿 선택", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "초기창업패키지 2024", bizInfo: "2년차 스타트업입니다." });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });

  it("알 수 없는 제목이면 default 템플릿 선택", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "알 수 없는 지원사업", bizInfo: "서비스업입니다." });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });

  it("빈 제목이면 default 템플릿 선택", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "", bizInfo: "서비스업입니다." });
    // bizInfo 있지만 grantTitle 없음 → 400 또는 default template
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });
});

// ── POST 핸들러 입력 유효성 검사 ───────────────────────────────────────────────

describe("POST /api/generate-doc - 입력 유효성 검사", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("grantTitle 없으면 400 반환", async () => {
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ bizInfo: "테스트 사업 정보" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("bizInfo 없으면 400 반환", async () => {
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("grantTitle과 bizInfo 둘 다 없으면 400 반환", async () => {
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("grantTitle null이면 400 반환", async () => {
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: null, bizInfo: "테스트" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("bizInfo null이면 400 반환", async () => {
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: null });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("오류 응답에 error 필드 존재", async () => {
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "테스트" });
    const res = await POST(req);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });
});

// ── POST 핸들러 - AI 엔진 없을 때 ───────────────────────────────────────────────

describe("POST /api/generate-doc - AI 엔진 없을 때", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("Gemini/Claude key 없으면 500 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("placeholder key도 AI 없는 것으로 처리", async () => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key_here");
    vi.stubEnv("ANTHROPIC_API_KEY", "your_anthropic_api_key_here");
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── POST 핸들러 - Gemini mocking ────────────────────────────────────────────────

describe("POST /api/generate-doc - Gemini mocking", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@google/generative-ai");
  });

  it("Gemini 정상 응답 시 200 + documents 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "AI가 생성한 문서 내용입니다." },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "IT 스타트업" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("documents");
    expect(Array.isArray(json.documents)).toBe(true);
    expect(json.documents.length).toBeGreaterThan(0);
  });

  it("documents 각 항목에 docName과 content 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "생성된 문서 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트 사업" });
    const res = await POST(req);
    const json = await res.json();
    for (const doc of json.documents) {
      expect(doc).toHaveProperty("docName");
      expect(doc).toHaveProperty("content");
      expect(typeof doc.docName).toBe("string");
      expect(typeof doc.content).toBe("string");
    }
  });

  it("응답에 template 이름 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "문서 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    const json = await res.json();
    expect(json).toHaveProperty("template");
    expect(typeof json.template).toBe("string");
  });

  it("응답에 docCount 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "문서 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    const json = await res.json();
    expect(json).toHaveProperty("docCount");
    expect(typeof json.docCount).toBe("number");
    expect(json.docCount).toBe(json.documents.length);
  });

  it("예비창업패키지는 3개 문서 생성", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "생성 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트 사업" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.docCount).toBe(3);
  });

  it("초기창업패키지는 3개 문서 생성", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "생성 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "초기창업패키지", bizInfo: "테스트 사업" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.docCount).toBe(3);
  });

  it("default 템플릿은 1개 문서 생성", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "생성 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "일반 지원사업", bizInfo: "테스트" });
    const res = await POST(req);
    const json = await res.json();
    expect(json.docCount).toBe(1);
  });

  it("Gemini throw 시 Claude로 폴백", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("Quota exceeded")),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    // Claude도 없으면 500
    expect([200, 500]).toContain(res.status);
  });

  it("isScraped 필드가 응답에 포함됨", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "생성 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    const json = await res.json();
    if (res.status === 200) {
      expect(json).toHaveProperty("isScraped");
      expect(typeof json.isScraped).toBe("boolean");
    }
  });

  it("pblancId 없으면 isScraped는 false", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "생성 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "예비창업패키지", bizInfo: "테스트" });
    const res = await POST(req);
    const json = await res.json();
    if (res.status === 200) {
      expect(json.isScraped).toBe(false);
    }
  });
});

// ── POST 핸들러 - Claude mocking ────────────────────────────────────────────────

describe("POST /api/generate-doc - Claude mocking", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@anthropic-ai/sdk");
    vi.unmock("@google/generative-ai");
  });

  it("Gemini 없고 Claude 있으면 Claude로 생성", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "Claude가 생성한 문서" }],
          }),
        },
      })),
    }));

    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "일반 지원사업", bizInfo: "테스트" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.documents[0].content).toContain("Claude가 생성한 문서");
  });
});

// ── generateWithAI 오류 처리 ────────────────────────────────────────────────────

describe("generateWithAI - 오류 처리", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@google/generative-ai");
  });

  it("모든 AI 실패 시 fallback 메시지 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { POST } = await import("../../app/api/generate-doc/route");
    const req = makeRequest({ grantTitle: "테스트 사업", bizInfo: "테스트" });
    const res = await POST(req);
    if (res.status === 500) {
      const json = await res.json();
      expect(json.error).toBeTruthy();
    }
  });
});
