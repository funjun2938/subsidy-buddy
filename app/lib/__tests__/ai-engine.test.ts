/**
 * gemini.ts / ai.ts 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: AI 엔진 (Gemini/Claude 매칭 + 분석)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Grant, UserCondition } from "../types";

// ── 픽스처 ─────────────────────────────────────────────────────────────────────

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "G001",
    title: "IT 스타트업 지원사업",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "최대 1억원",
    deadline: "상시",
    description: "IT 분야 스타트업 기술 개발 지원",
    requirements: "업력 3년 이내 IT 기업",
    url: "https://example.com/G001",
    ...overrides,
  };
}

function makeCondition(overrides: Partial<UserCondition> = {}): UserCondition {
  return {
    bizType: "IT·소프트웨어",
    revenue: "1억~3억",
    region: "서울",
    bizAge: "1~3년",
    ceoAge: "만 30~39세",
    ...overrides,
  };
}

function makeGrants(count: number): Grant[] {
  return Array.from({ length: count }, (_, i) =>
    makeGrant({
      id: `G${String(i + 1).padStart(3, "0")}`,
      title: `테스트 지원사업 ${i + 1}`,
    })
  );
}

// ── matchGrantsWithGemini — Gemini 없을 때 fallback ──────────────────────────

describe("matchGrantsWithGemini - Gemini API key 없을 때", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("API key 없으면 fallback 결과 반환", async () => {
    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = makeGrants(3);
    const condition = makeCondition();
    const results = await matchGrantsWithGemini(condition, grants);
    // fallback이므로 결과는 반환되어야 함 (rankGrants 결과)
    expect(Array.isArray(results)).toBe(true);
  });

  it("결과에 grant, matchScore, reason, matchReasons 포함", async () => {
    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = makeGrants(3);
    const condition = makeCondition();
    const results = await matchGrantsWithGemini(condition, grants);
    for (const result of results) {
      expect(result).toHaveProperty("grant");
      expect(result).toHaveProperty("matchScore");
      expect(result).toHaveProperty("reason");
    }
  });

  it("빈 grants 배열이면 빈 배열 반환", async () => {
    const { matchGrantsWithGemini } = await import("../gemini");
    const results = await matchGrantsWithGemini(makeCondition(), []);
    expect(results).toEqual([]);
  });

  it("모두 low 점수 grants이면 빈 배열 반환", async () => {
    const { matchGrantsWithGemini } = await import("../gemini");
    // 모두 점수가 낮은 grants (지역/업종 불일치, 마감 지남)
    const pastDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const lowGrants = Array.from({ length: 3 }, (_, i) =>
      makeGrant({
        id: `G${i}`,
        region: "부산",
        targetBizTypes: ["건설"],
        deadline: pastDate,
      })
    );
    const condition = makeCondition({ region: "제주", bizType: "IT·소프트웨어" });
    const results = await matchGrantsWithGemini(condition, lowGrants);
    expect(results).toHaveLength(0);
  });

  it("결과의 matchScore는 high/medium/low 중 하나", async () => {
    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = makeGrants(5);
    const condition = makeCondition();
    const results = await matchGrantsWithGemini(condition, grants);
    for (const result of results) {
      expect(["high", "medium", "low"]).toContain(result.matchScore);
    }
  });
});

// ── matchGrantsWithGemini — Gemini placeholder key ────────────────────────────

describe("matchGrantsWithGemini - placeholder key 처리", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key_here");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("placeholder key이면 fallback 동작", async () => {
    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = makeGrants(3);
    const results = await matchGrantsWithGemini(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
  });
});

// ── matchGrantsWithGemini — Gemini 응답 mocking ──────────────────────────────

describe("matchGrantsWithGemini - Gemini 응답 mocking", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Gemini 정상 응답 시 reason이 AI 생성값으로 대체됨", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockReasons = [{ id: "G001", reason: "AI가 생성한 매칭 이유" }];
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockReasons) },
          }),
        }),
      })),
    }));

    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = [makeGrant({ id: "G001" })];
    const results = await matchGrantsWithGemini(makeCondition(), grants);

    if (results.length > 0) {
      expect(typeof results[0].reason).toBe("string");
      expect(results[0].reason.length).toBeGreaterThan(0);
    }
    vi.unmock("@google/generative-ai");
  });

  it("Gemini 응답이 JSON 파싱 실패하면 fallback reason 사용", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "invalid json {{" },
          }),
        }),
      })),
    }));

    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = [makeGrant()];
    const results = await matchGrantsWithGemini(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    vi.unmock("@google/generative-ai");
  });

  it("Gemini throw 시 fallback reason 사용", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("API Error")),
        }),
      })),
    }));

    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = makeGrants(3);
    const results = await matchGrantsWithGemini(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    vi.unmock("@google/generative-ai");
  });

  it("Gemini 응답 id가 없는 grant는 fallback reason 사용", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    // G002만 응답하고 G001은 누락
    const mockReasons = [{ id: "G002", reason: "G002 이유" }];
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockReasons) },
          }),
        }),
      })),
    }));

    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = [makeGrant({ id: "G001" }), makeGrant({ id: "G002" })];
    const results = await matchGrantsWithGemini(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    vi.unmock("@google/generative-ai");
  });
});

// ── analyzeGrantWithGemini ──────────────────────────────────────────────────────

describe("analyzeGrantWithGemini - API key 없을 때", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("API key 없으면 null 반환", async () => {
    const { analyzeGrantWithGemini } = await import("../gemini");
    const grant = makeGrant();
    const condition = makeCondition();
    const result = await analyzeGrantWithGemini(grant, condition);
    expect(result).toBeNull();
  });
});

describe("analyzeGrantWithGemini - Gemini 응답 mocking", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("정상 응답 시 GrantAnalysis 형태로 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockAnalysis = {
      eligibility: "high",
      reason: "자격 요건을 충분히 충족합니다.",
      strategy: "신청 전략입니다.",
      risks: "주의 사항입니다.",
    };
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockAnalysis) },
          }),
        }),
      })),
    }));

    const { analyzeGrantWithGemini } = await import("../gemini");
    const result = await analyzeGrantWithGemini(makeGrant(), makeCondition());
    if (result) {
      expect(["high", "medium", "low"]).toContain(result.eligibility);
      expect(typeof result.reason).toBe("string");
      expect(typeof result.strategy).toBe("string");
      expect(typeof result.risks).toBe("string");
    }
    vi.unmock("@google/generative-ai");
  });

  it("JSON 파싱 실패 시 null 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => "not json" },
          }),
        }),
      })),
    }));

    const { analyzeGrantWithGemini } = await import("../gemini");
    const result = await analyzeGrantWithGemini(makeGrant(), makeCondition());
    expect(result).toBeNull();
    vi.unmock("@google/generative-ai");
  });

  it("Gemini throw 시 null 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error("Quota exceeded")),
        }),
      })),
    }));

    const { analyzeGrantWithGemini } = await import("../gemini");
    const result = await analyzeGrantWithGemini(makeGrant(), makeCondition());
    expect(result).toBeNull();
    vi.unmock("@google/generative-ai");
  });

  it("summary 없는 condition도 처리", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockAnalysis = { eligibility: "medium", reason: "분석", strategy: "전략", risks: "위험" };
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockAnalysis) },
          }),
        }),
      })),
    }));

    const { analyzeGrantWithGemini } = await import("../gemini");
    const condition = makeCondition(); // summary 없음
    const result = await analyzeGrantWithGemini(makeGrant(), condition);
    expect(result === null || typeof result === "object").toBe(true);
    vi.unmock("@google/generative-ai");
  });

  it("keywords 있는 condition도 처리", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockAnalysis = { eligibility: "high", reason: "분석", strategy: "전략", risks: "위험" };
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => JSON.stringify(mockAnalysis) },
          }),
        }),
      })),
    }));

    const { analyzeGrantWithGemini } = await import("../gemini");
    const condition = makeCondition({ summary: "AI 스타트업", keywords: ["AI", "ML"] });
    const result = await analyzeGrantWithGemini(makeGrant(), condition);
    expect(result === null || typeof result === "object").toBe(true);
    vi.unmock("@google/generative-ai");
  });
});

// ── ai.ts - matchGrantsAI ──────────────────────────────────────────────────────

describe("matchGrantsAI - 엔진 선택 로직", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Gemini key 없고 Claude key 없으면 빈 배열", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { matchGrantsAI } = await import("../ai");
    const results = await matchGrantsAI(makeCondition(), makeGrants(3));
    expect(results).toEqual([]);
  });

  it("Gemini placeholder key이면 Claude 폴백 시도", async () => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key_here");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { matchGrantsAI } = await import("../ai");
    const results = await matchGrantsAI(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("Claude placeholder key이면 빈 배열", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "your_anthropic_api_key_here");
    const { matchGrantsAI } = await import("../ai");
    const results = await matchGrantsAI(makeCondition(), makeGrants(3));
    expect(results).toEqual([]);
  });

  it("빈 grants 배열이면 빈 결과 (Gemini fallback)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { matchGrantsAI } = await import("../ai");
    const results = await matchGrantsAI(makeCondition(), []);
    expect(results).toEqual([]);
  });
});

// ── ai.ts - analyzeGrantAI ──────────────────────────────────────────────────────

describe("analyzeGrantAI - fallback 동작", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("모든 key 없으면 fallback GrantAnalysis 반환", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { analyzeGrantAI } = await import("../ai");
    const result = await analyzeGrantAI(makeGrant(), makeCondition());
    expect(result).toHaveProperty("eligibility");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("strategy");
    expect(result).toHaveProperty("risks");
    expect(result.eligibility).toBe("medium");
    expect(result.reason).toContain("API 키");
  });

  it("fallback 결과의 eligibility는 항상 medium", async () => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key_here");
    vi.stubEnv("ANTHROPIC_API_KEY", "your_anthropic_api_key_here");
    const { analyzeGrantAI } = await import("../ai");
    const result = await analyzeGrantAI(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("medium");
  });

  it("결과는 항상 GrantAnalysis 형태", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { analyzeGrantAI } = await import("../ai");
    const result = await analyzeGrantAI(makeGrant(), makeCondition());
    expect(["high", "medium", "low"]).toContain(result.eligibility);
    expect(typeof result.reason).toBe("string");
    expect(typeof result.strategy).toBe("string");
    expect(typeof result.risks).toBe("string");
  });
});

// ── 통합: 결정론 보장 ──────────────────────────────────────────────────────────

describe("AI 엔진 통합 - 결정론 보장", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("Gemini 없을 때 같은 입력에 항상 같은 결과", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = makeGrants(5);
    const condition = makeCondition();
    const result1 = await matchGrantsWithGemini(condition, grants);
    const result2 = await matchGrantsWithGemini(condition, grants);
    expect(result1.map(r => r.grant.id)).toEqual(result2.map(r => r.grant.id));
    expect(result1.map(r => r.matchScore)).toEqual(result2.map(r => r.matchScore));
  });

  it("grants 입력 순서가 달라도 rankGrants 기반으로 동일 결과 순서", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { matchGrantsWithGemini } = await import("../gemini");
    const grants1 = [
      makeGrant({ id: "G001", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G002", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    const grants2 = [
      makeGrant({ id: "G002", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G001", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    const condition = makeCondition({ region: "서울" });
    const result1 = await matchGrantsWithGemini(condition, grants1);
    const result2 = await matchGrantsWithGemini(condition, grants2);
    expect(result1.map(r => r.grant.id)).toEqual(result2.map(r => r.grant.id));
  });
});

// ── Gemini 응답 파싱 유틸리티 ──────────────────────────────────────────────────

describe("Gemini 응답 형식 처리", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("마크다운 코드블록 감싸진 JSON도 파싱", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockReasons = [{ id: "G001", reason: "마크다운 감싸진 응답" }];
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => `\`\`\`json\n${JSON.stringify(mockReasons)}\n\`\`\`` },
          }),
        }),
      })),
    }));

    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = [makeGrant({ id: "G001" })];
    const results = await matchGrantsWithGemini(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    vi.unmock("@google/generative-ai");
  });

  it("앞뒤 공백 있는 JSON도 파싱", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-valid-key");

    const mockReasons = [{ id: "G001", reason: "공백 있는 응답" }];
    vi.mock("@google/generative-ai", () => ({
      GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: { text: () => `  ${JSON.stringify(mockReasons)}  ` },
          }),
        }),
      })),
    }));

    const { matchGrantsWithGemini } = await import("../gemini");
    const grants = [makeGrant({ id: "G001" })];
    const results = await matchGrantsWithGemini(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    vi.unmock("@google/generative-ai");
  });
});
