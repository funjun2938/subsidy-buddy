/**
 * check-doc / revise-doc API route 테스트
 * 담당: yungyeonghye-maker
 * 도메인: 문서 체크리스트 / 문서 수정 AI 엔진
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function makeFormRequest(fields: Record<string, string>, file?: File): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  if (file) formData.append("file", file);
  return new NextRequest("http://localhost/api/check-doc", {
    method: "POST",
    body: formData,
  });
}

function makeJsonRequest(body: Record<string, unknown>, url = "http://localhost/api/revise-doc"): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GRANT_CHECKLISTS / getChecklist 테스트 ─────────────────────────────────────

describe("getChecklist - 체크리스트 선택", () => {
  afterEach(() => vi.resetModules());

  it("'예비창업패키지' 포함 제목이면 12개 항목", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("2024 예비창업패키지 모집");
    expect(checklist.items).toHaveLength(12);
  });

  it("'초기창업패키지' 포함 제목이면 14개 항목", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("초기창업패키지 2024");
    expect(checklist.items).toHaveLength(14);
  });

  it("알 수 없는 제목이면 default 9개 항목", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("알 수 없는 지원사업");
    expect(checklist.items).toHaveLength(9);
  });

  it("빈 제목이면 default", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("");
    expect(checklist.name).toBe("정부 지원사업 표준");
  });

  it("예비창업패키지 체크리스트에 service_name 항목 존재", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("예비창업패키지");
    const ids = checklist.items.map(i => i.id);
    expect(ids).toContain("service_name");
  });

  it("예비창업패키지 체크리스트에 funding_plan 항목 존재", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("예비창업패키지");
    const ids = checklist.items.map(i => i.id);
    expect(ids).toContain("funding_plan");
  });

  it("초기창업패키지 체크리스트에 go_to_market 항목 존재", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("초기창업패키지");
    const ids = checklist.items.map(i => i.id);
    expect(ids).toContain("go_to_market");
  });

  it("초기창업패키지 체크리스트에 market_size 항목 존재", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("초기창업패키지");
    const ids = checklist.items.map(i => i.id);
    expect(ids).toContain("market_size");
  });

  it("default 체크리스트에 problem 항목 존재", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("일반 지원사업");
    const ids = checklist.items.map(i => i.id);
    expect(ids).toContain("problem");
  });

  it("각 항목에 id, label, desc 포함", async () => {
    const { getChecklist } = await import("../../app/api/check-doc/route");
    const checklist = getChecklist("예비창업패키지");
    for (const item of checklist.items) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("desc");
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.label.length).toBeGreaterThan(0);
    }
  });

  it("GRANT_CHECKLISTS export 확인", async () => {
    const { GRANT_CHECKLISTS } = await import("../../app/api/check-doc/route");
    expect(GRANT_CHECKLISTS).toHaveProperty("예비창업패키지");
    expect(GRANT_CHECKLISTS).toHaveProperty("초기창업패키지");
    expect(GRANT_CHECKLISTS).toHaveProperty("default");
  });
});

// ── POST /api/check-doc 입력 유효성 검사 ───────────────────────────────────────

describe("POST /api/check-doc - 입력 유효성 검사", () => {
  afterEach(() => vi.resetModules());

  it("file/text 모두 없으면 400", async () => {
    const { POST } = await import("../../app/api/check-doc/route");
    const req = makeFormRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("오류 응답에 error 필드", async () => {
    const { POST } = await import("../../app/api/check-doc/route");
    const req = makeFormRequest({});
    const res = await POST(req);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("text만 있어도 처리 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/check-doc/route");
    const req = makeFormRequest({ text: "사업계획서 내용" });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
    vi.unstubAllEnvs();
  });

  it("grantTitle 없어도 default 체크리스트 사용", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/check-doc/route");
    const req = makeFormRequest({ text: "사업계획서" });
    const res = await POST(req);
    // AI 없으면 500이지만 400은 아님
    expect([200, 500]).toContain(res.status);
    vi.unstubAllEnvs();
  });
});

// ── POST /api/check-doc - AI 엔진 없을 때 ─────────────────────────────────────

describe("POST /api/check-doc - AI 없을 때", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("GEMINI_API_KEY 없으면 500", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/check-doc/route");
    const req = makeFormRequest({ text: "사업계획서" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("placeholder key이면 500", async () => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key_here");
    const { POST } = await import("../../app/api/check-doc/route");
    const req = makeFormRequest({ text: "사업계획서" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── POST /api/check-doc - Gemini mocking ──────────────────────────────────────

describe("POST /api/check-doc - Gemini mocking", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@google/generative-ai");
  });

  const mockCheckResult = {
    checks: {
      service_name: { found: true, excerpt: "AI 매칭 플랫폼" },
      biz_type: { found: true, excerpt: "IT 소프트웨어" },
      problem: { found: true, excerpt: "보조금 정보 부족" },
      solution: { found: false, excerpt: "" },
    },
    extractedBizInfo: "AI 기반 보조금 매칭 스타트업입니다.",
  };

  it("Gemini 정상 응답 시 200 + checklist/checks 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockCheckResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const res = await POST(makeFormRequest({ text: "사업계획서", grantTitle: "예비창업패키지" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("checklist");
    expect(json).toHaveProperty("checks");
  });

  it("응답에 extractedBizInfo 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockCheckResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const res = await POST(makeFormRequest({ text: "사업계획서" }));
    const json = await res.json();
    expect(json).toHaveProperty("extractedBizInfo");
  });

  it("checklist 항목 수가 grantTitle에 맞게 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockCheckResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const res = await POST(makeFormRequest({ text: "사업계획서", grantTitle: "예비창업패키지" }));
    const json = await res.json();
    expect(json.checklist).toHaveLength(12);
  });

  it("JSON 파싱 실패 시 raw 필드 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "invalid json" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const res = await POST(makeFormRequest({ text: "사업계획서" }));
    const json = await res.json();
    expect(json.checks !== undefined || json.raw !== undefined).toBe(true);
  });

  it("마크다운 코드블록 감싸진 JSON도 파싱", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => `\`\`\`json\n${JSON.stringify(mockCheckResult)}\n\`\`\`` },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const res = await POST(makeFormRequest({ text: "사업계획서" }));
    expect(res.status).toBe(200);
  });

  it("이미지 파일이면 Vision으로 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockCheckResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const file = new File(["fake image"], "plan.jpg", { type: "image/jpeg" });
    const req = makeFormRequest({}, file);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("텍스트 파일이면 텍스트로 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockCheckResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const file = new File(["사업계획서 내용"], "plan.txt", { type: "text/plain" });
    const req = makeFormRequest({}, file);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("text + file 함께 분석", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockCheckResult) },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const file = new File(["추가 정보"], "extra.txt", { type: "text/plain" });
    const req = makeFormRequest({ text: "사업계획서 본문" }, file);
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("Gemini throw 시 500 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("Quota")),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/check-doc/route");
    const res = await POST(makeFormRequest({ text: "사업계획서" }));
    expect(res.status).toBe(500);
  });
});

// ── POST /api/revise-doc 입력 유효성 검사 ─────────────────────────────────────

describe("POST /api/revise-doc - 입력 유효성 검사", () => {
  afterEach(() => vi.resetModules());

  it("originalSection 없으면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({ feedback: "더 구체적으로 써줘" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("feedback 없으면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({ originalSection: "[1. 사업 개요]\n내용입니다." });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("둘 다 없으면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("오류 응답에 error 필드", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({ feedback: "수정해줘" });
    const res = await POST(req);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("빈 문자열도 없는 것으로 처리", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({ originalSection: "", feedback: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ── POST /api/revise-doc - AI 없을 때 ─────────────────────────────────────────

describe("POST /api/revise-doc - AI 없을 때", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("GEMINI_API_KEY 없으면 500", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 사업 개요]\n내용입니다.",
      feedback: "더 자세히",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ── POST /api/revise-doc - Gemini mocking ─────────────────────────────────────

describe("POST /api/revise-doc - Gemini mocking", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unmock("@google/generative-ai");
  });

  it("정상 응답 시 200 + revisedSection 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "[1. 사업 개요]\n수정된 내용입니다." },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 사업 개요]\n원본 내용",
      feedback: "더 구체적으로",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("revisedSection");
    expect(typeof json.revisedSection).toBe("string");
    expect(json.revisedSection.length).toBeGreaterThan(0);
  });

  it("revisedSection에 수정된 내용 포함", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "  수정된 섹션 내용  " }, // 앞뒤 공백
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 개요]\n내용",
      feedback: "수정",
    });
    const res = await POST(req);
    const json = await res.json();
    // trim() 처리 확인
    expect(json.revisedSection).toBe("수정된 섹션 내용");
  });

  it("grantTitle/bizInfo 없어도 처리", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "수정된 내용" },
          }),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 개요]\n내용",
      feedback: "더 자세히",
      // grantTitle, bizInfo 없음
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("grantTitle/bizInfo 있으면 프롬프트에 반영", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const mockFn = vi.fn().mockResolvedValue({
      response: { text: () => "수정된 내용" },
    });
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: mockFn,
        }),
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 개요]\n내용",
      feedback: "더 자세히",
      grantTitle: "예비창업패키지",
      bizInfo: "IT 스타트업",
    });
    await POST(req);
    expect(mockFn).toHaveBeenCalledOnce();
    const callArg = mockFn.mock.calls[0][0] as string;
    expect(callArg).toContain("예비창업패키지");
    expect(callArg).toContain("IT 스타트업");
  });

  it("Gemini throw 시 500 + error 메시지", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("Rate limit")),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 개요]\n내용",
      feedback: "수정",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Rate limit");
  });

  it("비 Error 예외도 처리", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue("string error"),
        }),
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 개요]\n내용",
      feedback: "수정",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("알 수 없는 오류");
  });

  it("temperature=0으로 결정적 응답 설정", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key");
    const mockGetModel = vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => "수정된 내용" },
      }),
    });
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: mockGetModel,
      })),
    }));

    const { POST } = await import("../../app/api/revise-doc/route");
    const req = makeJsonRequest({
      originalSection: "[1. 개요]\n내용",
      feedback: "수정",
    });
    await POST(req);
    const callArg = mockGetModel.mock.calls[0][0] as { generationConfig: { temperature: number } };
    expect(callArg.generationConfig.temperature).toBe(0);
  });
});
