/**
 * claude.ts 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: Claude AI 엔진 (매칭 / 분석)
 *
 * Note: claude.ts는 모듈 레벨에서 Anthropic 인스턴스를 생성하므로
 * vi.mock을 최상위에서 호이스팅하여 처리
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Grant, UserCondition } from "../types";

// ── Mock 호이스팅 (모듈 레벨 인스턴스 생성 대응) ─────────────────────────────
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

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
    url: "https://example.com",
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
      title: `지원사업 ${i + 1}`,
      region: "전국",
      targetBizTypes: ["IT·소프트웨어"],
      deadline: "상시",
    })
  );
}

// ── matchGrants - 정상 응답 ────────────────────────────────────────────────────

describe("matchGrants - 정상 응답", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-anthropic-key");
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Claude 정상 응답 시 MatchResult 배열 반환", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify([{ id: "G001", reason: "IT 분야 매칭" }]) }],
    });
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    expect(Array.isArray(results)).toBe(true);
  });

  it("결과에 grant/matchScore/reason/matchReasons 포함", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify([{ id: "G001", reason: "업종 일치" }]) }],
    });
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty("grant");
      expect(results[0]).toHaveProperty("matchScore");
      expect(results[0]).toHaveProperty("reason");
      expect(results[0]).toHaveProperty("matchReasons");
    }
  });

  it("matchScore는 high/medium/low 중 하나", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    const results = await matchGrants(makeCondition(), makeGrants(3));
    for (const r of results) {
      expect(["high", "medium", "low"]).toContain(r.matchScore);
    }
  });

  it("Claude 응답 reason이 결과에 반영됨", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify([{ id: "G001", reason: "Claude가 생성한 특별한 이유" }]) }],
    });
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    if (results.length > 0) {
      expect(results[0].reason).toBe("Claude가 생성한 특별한 이유");
    }
  });

  it("Claude 응답에 없는 grant는 fallback reason 사용", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify([{ id: "G002", reason: "G002 이유" }]) }],
    });
    const results = await matchGrants(makeCondition(), [
      makeGrant({ id: "G001" }),
      makeGrant({ id: "G002" }),
    ]);
    const g001 = results.find(r => r.grant.id === "G001");
    if (g001) {
      expect(typeof g001.reason).toBe("string");
      expect(g001.reason.length).toBeGreaterThan(0);
    }
  });

  it("마크다운 코드블록 감싸진 JSON도 파싱", async () => {
    const { matchGrants } = await import("../claude");
    const reasons = [{ id: "G001", reason: "마크다운 감싸진 응답" }];
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: `\`\`\`json\n${JSON.stringify(reasons)}\n\`\`\`` }],
    });
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    expect(Array.isArray(results)).toBe(true);
  });

  it("앞뒤 공백 있는 JSON도 파싱", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: `  []  ` }],
    });
    const results = await matchGrants(makeCondition(), makeGrants(1));
    expect(Array.isArray(results)).toBe(true);
  });

  it("temperature=0으로 호출 (결정적 응답)", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    await matchGrants(makeCondition(), makeGrants(2));
    if (mockCreate.mock.calls.length > 0) {
      const call = mockCreate.mock.calls[0][0] as { temperature: number };
      expect(call.temperature).toBe(0);
    }
  });

  it("claude-sonnet 모델 사용", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    await matchGrants(makeCondition(), makeGrants(2));
    if (mockCreate.mock.calls.length > 0) {
      const call = mockCreate.mock.calls[0][0] as { model: string };
      expect(call.model).toContain("claude");
    }
  });

  it("summary 있을 때 프롬프트에 포함", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    const condition = makeCondition({ summary: "AI 기반 독특한 스타트업 서비스" });
    await matchGrants(condition, makeGrants(2));
    if (mockCreate.mock.calls.length > 0) {
      const call = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
      expect(call.messages[0].content).toContain("AI 기반 독특한 스타트업 서비스");
    }
  });

  it("summary 없을 때 프롬프트에 사업 내용 섹션 없음", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    await matchGrants(makeCondition(), makeGrants(2));
    if (mockCreate.mock.calls.length > 0) {
      const call = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
      expect(call.messages[0].content).not.toContain("사업 내용:");
    }
  });
});

// ── matchGrants - fallback 동작 ────────────────────────────────────────────────

describe("matchGrants - fallback 동작", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-anthropic-key");
    mockCreate.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("Claude throw 시 fallback 결과 반환", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockRejectedValue(new Error("API Error"));
    const results = await matchGrants(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("JSON 파싱 실패 시 fallback 반환", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "invalid json {broken" }],
    });
    const results = await matchGrants(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("content.type이 text가 아닌 경우 fallback", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "tool1", name: "search", input: {} }],
    });
    const results = await matchGrants(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("빈 grants 배열이면 빈 배열 반환 (API 미호출)", async () => {
    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), []);
    expect(results).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("모두 low 점수 grants이면 빈 배열 반환 (API 미호출)", async () => {
    const { matchGrants } = await import("../claude");
    const pastDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const lowGrants = Array.from({ length: 3 }, (_, i) =>
      makeGrant({ id: `G${i}`, region: "부산", targetBizTypes: ["건설"], deadline: pastDate })
    );
    const condition = makeCondition({ region: "제주", bizType: "IT·소프트웨어" });
    const results = await matchGrants(condition, lowGrants);
    expect(results).toHaveLength(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("fallback 결과도 matchScore 포함", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockRejectedValue(new Error("Timeout"));
    const results = await matchGrants(makeCondition(), makeGrants(3));
    for (const r of results) {
      expect(["high", "medium", "low"]).toContain(r.matchScore);
    }
  });

  it("fallback 결과도 reason 포함", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockRejectedValue(new Error("Timeout"));
    const results = await matchGrants(makeCondition(), makeGrants(3));
    for (const r of results) {
      expect(typeof r.reason).toBe("string");
      expect(r.reason.length).toBeGreaterThan(0);
    }
  });
});

// ── matchGrants - 결정론 보장 ──────────────────────────────────────────────────

describe("matchGrants - 결정론 보장", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-anthropic-key");
    mockCreate.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rankGrants 기반 순서는 동일 입력에서 항상 동일", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    const grants = makeGrants(2);
    const condition = makeCondition();
    const r1 = await matchGrants(condition, grants);
    const r2 = await matchGrants(condition, grants);
    expect(r1.map(r => r.grant.id)).toEqual(r2.map(r => r.grant.id));
  });

  it("grants 입력 순서가 달라도 출력 순서 동일", async () => {
    const { matchGrants } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    const g1 = makeGrant({ id: "G001", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const g2 = makeGrant({ id: "G002", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const condition = makeCondition({ region: "서울" });
    const r1 = await matchGrants(condition, [g1, g2]);
    const r2 = await matchGrants(condition, [g2, g1]);
    expect(r1.map(r => r.grant.id)).toEqual(r2.map(r => r.grant.id));
  });
});

// ── analyzeGrant - 정상 응답 ───────────────────────────────────────────────────

describe("analyzeGrant - 정상 응답", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-anthropic-key");
    mockCreate.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  const mockAnalysis = {
    eligibility: "high",
    reason: "자격 요건을 충분히 충족합니다.",
    strategy: "신청 전략입니다.",
    risks: "주의 사항입니다.",
  };

  it("정상 응답 시 GrantAnalysis 반환", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(["high", "medium", "low"]).toContain(result.eligibility);
    expect(typeof result.reason).toBe("string");
  });

  it("eligibility가 high면 high 반환", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ ...mockAnalysis, eligibility: "high" }) }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("high");
  });

  it("eligibility가 low면 low 반환", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ ...mockAnalysis, eligibility: "low" }) }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("low");
  });

  it("JSON 파싱 실패 시 medium + raw text reason 반환", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "분석 결과: 자격 요건을 충족합니다." }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("medium");
    expect(result.reason).toContain("분석 결과");
  });

  it("content.type이 text가 아닌 경우 low + 실패 메시지 반환", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t1", name: "search", input: {} }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("low");
    expect(result.reason).toBe("분석에 실패했습니다.");
  });

  it("reason이 300자 초과 시 300자로 truncate", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "A".repeat(500) }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.reason.length).toBeLessThanOrEqual(300);
  });

  it("summary + keywords 있을 때 프롬프트에 포함", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
    });
    const condition = makeCondition({ summary: "AI 기반 서비스", keywords: ["AI", "보조금"] });
    await analyzeGrant(makeGrant(), condition);
    const call = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
    const prompt = call.messages[0].content;
    expect(prompt).toContain("AI 기반 서비스");
    expect(prompt).toContain("AI, 보조금");
  });

  it("grant 정보가 프롬프트에 포함됨", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
    });
    const grant = makeGrant({ title: "특별 IT 지원사업", orgName: "서울시" });
    await analyzeGrant(grant, makeCondition());
    const call = mockCreate.mock.calls[0][0] as { messages: { content: string }[] };
    const prompt = call.messages[0].content;
    expect(prompt).toContain("특별 IT 지원사업");
    expect(prompt).toContain("서울시");
  });

  it("temperature=0으로 호출", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
    });
    await analyzeGrant(makeGrant(), makeCondition());
    const call = mockCreate.mock.calls[0][0] as { temperature: number };
    expect(call.temperature).toBe(0);
  });

  it("strategy 필드 포함", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result).toHaveProperty("strategy");
    expect(typeof result.strategy).toBe("string");
  });

  it("risks 필드 포함", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
    });
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result).toHaveProperty("risks");
    expect(typeof result.risks).toBe("string");
  });
});

// ── analyzeGrant - API throw 처리 ─────────────────────────────────────────────

describe("analyzeGrant - 오류 처리", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-anthropic-key");
    mockCreate.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("Claude throw 시 오류 전파 (try-catch 없음)", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockRejectedValue(new Error("Rate limit exceeded"));
    await expect(analyzeGrant(makeGrant(), makeCondition())).rejects.toThrow("Rate limit exceeded");
  });

  it("네트워크 오류도 전파", async () => {
    const { analyzeGrant } = await import("../claude");
    mockCreate.mockRejectedValue(new Error("Network timeout"));
    await expect(analyzeGrant(makeGrant(), makeCondition())).rejects.toThrow();
  });
});
