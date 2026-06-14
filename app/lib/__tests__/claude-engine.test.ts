/**
 * claude.ts 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: Claude AI 엔진 (매칭 + 분석)
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
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
      title: `테스트 지원사업 ${i + 1}`,
    })
  );
}

// ── matchGrants — API key 없을 때 ────────────────────────────────────────────

describe("matchGrants - ANTHROPIC_API_KEY 없을 때", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unmock("@anthropic-ai/sdk");
  });

  it("API key 없어도 모듈 import 오류 없음", async () => {
    await expect(import("../claude")).resolves.toBeDefined();
  });
});

// ── matchGrants — Claude 응답 mocking ────────────────────────────────────────

describe("matchGrants - Claude 응답 mocking", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unmock("@anthropic-ai/sdk");
  });

  it("Claude 정상 응답 시 reason이 AI 생성값으로 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockReasons = [{ id: "G001", reason: "Claude가 생성한 매칭 이유" }];
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockReasons) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const grants = [makeGrant({ id: "G001" })];
    const results = await matchGrants(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].reason).toBe("Claude가 생성한 매칭 이유");
    }
  });

  it("결과에 grant, matchScore, reason, matchReasons 포함", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockReasons = [{ id: "G001", reason: "테스트 이유" }];
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockReasons) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    for (const r of results) {
      expect(r).toHaveProperty("grant");
      expect(r).toHaveProperty("matchScore");
      expect(r).toHaveProperty("reason");
      expect(r).toHaveProperty("matchReasons");
    }
  });

  it("빈 grants 배열이면 빈 배열 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: vi.fn() },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), []);
    expect(results).toEqual([]);
  });

  it("모두 low 점수 grants이면 빈 배열", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: vi.fn() },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const pastDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const lowGrants = Array.from({ length: 3 }, (_, i) =>
      makeGrant({ id: `G${i}`, region: "부산", targetBizTypes: ["건설"], deadline: pastDate })
    );
    const results = await matchGrants(
      makeCondition({ region: "제주", bizType: "IT·소프트웨어" }),
      lowGrants
    );
    expect(results).toHaveLength(0);
  });

  it("JSON 파싱 실패 시 fallback 결과 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "invalid json {{" }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("content type이 text 아니면 fallback", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "tool_use", id: "tool1", name: "test", input: {} }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("Claude throw 시 fallback 결과 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockRejectedValue(new Error("API Error")),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), makeGrants(3));
    expect(Array.isArray(results)).toBe(true);
  });

  it("응답에 없는 grant id는 fallback reason 사용", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    // G002만 응답, G001 누락
    const mockReasons = [{ id: "G002", reason: "G002 이유" }];
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockReasons) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const grants = [
      makeGrant({ id: "G001" }),
      makeGrant({ id: "G002" }),
    ];
    const results = await matchGrants(makeCondition(), grants);
    expect(Array.isArray(results)).toBe(true);
    const g1 = results.find(r => r.grant.id === "G001");
    if (g1) {
      expect(g1.reason).toContain("IT·소프트웨어"); // fallback reason
    }
  });

  it("마크다운 코드블록 감싼 JSON 파싱", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockReasons = [{ id: "G001", reason: "마크다운 응답" }];
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: `\`\`\`json\n${JSON.stringify(mockReasons)}\n\`\`\`` }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0].reason).toBe("마크다운 응답");
    }
  });

  it("summary 없는 condition 처리", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify([{ id: "G001", reason: "테스트" }]) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const condition = makeCondition(); // summary 없음
    const results = await matchGrants(condition, [makeGrant({ id: "G001" })]);
    expect(Array.isArray(results)).toBe(true);
  });

  it("summary 있는 condition 처리", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify([{ id: "G001", reason: "테스트" }]) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const condition = makeCondition({ summary: "AI 기반 보조금 매칭 서비스" });
    await matchGrants(condition, [makeGrant({ id: "G001" })]);
    const promptArg = mockFn.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(promptArg.messages[0].content).toContain("AI 기반 보조금 매칭 서비스");
  });

  it("temperature=0으로 결정적 설정", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "[]" }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { matchGrants } = await import("../claude");
    await matchGrants(makeCondition(), makeGrants(3));
    const callArg = mockFn.mock.calls[0][0] as { temperature: number };
    expect(callArg.temperature).toBe(0);
  });

  it("결과 matchScore는 high/medium/low 중 하나", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify([{ id: "G001", reason: "테스트" }]) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const results = await matchGrants(makeCondition(), [makeGrant({ id: "G001" })]);
    for (const r of results) {
      expect(["high", "medium", "low"]).toContain(r.matchScore);
    }
  });

  it("결과는 점수 내림차순 정렬", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockReasons = [
      { id: "G001", reason: "이유1" },
      { id: "G002", reason: "이유2" },
    ];
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockReasons) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const grants = [
      makeGrant({ id: "G001", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G002", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    const condition = makeCondition({ region: "서울" });
    const results = await matchGrants(condition, grants);
    for (let i = 1; i < results.length; i++) {
      // matchScore 순서: high > medium > low
      const order = ["high", "medium", "low"];
      const prev = order.indexOf(results[i - 1].matchScore);
      const curr = order.indexOf(results[i].matchScore);
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });
});

// ── analyzeGrant — Claude 응답 mocking ──────────────────────────────────────

describe("analyzeGrant - Claude 응답 mocking", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unmock("@anthropic-ai/sdk");
  });

  it("정상 응답 시 GrantAnalysis 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockAnalysis = {
      eligibility: "high",
      reason: "자격 요건 충족",
      strategy: "조기 신청 권장",
      risks: "경쟁률 높음",
    };
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockAnalysis) }],
          }),
        },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(["high", "medium", "low"]).toContain(result.eligibility);
    expect(typeof result.reason).toBe("string");
    expect(typeof result.strategy).toBe("string");
    expect(typeof result.risks).toBe("string");
  });

  it("eligibility가 high인 경우", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify({ eligibility: "high", reason: "충족", strategy: "전략", risks: "위험" }) }],
          }),
        },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("high");
  });

  it("eligibility가 low인 경우", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify({ eligibility: "low", reason: "미충족", strategy: "", risks: "탈락" }) }],
          }),
        },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("low");
  });

  it("content type이 text 아니면 low/실패 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "tool_use", id: "t1", name: "test", input: {} }],
          }),
        },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("low");
    expect(result.reason).toBeTruthy();
  });

  it("JSON 파싱 실패 시 medium + raw text 반환", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const rawText = "자격 요건을 일부 충족하지만 업력이 부족합니다.";
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: rawText }],
          }),
        },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const result = await analyzeGrant(makeGrant(), makeCondition());
    expect(result.eligibility).toBe("medium");
    expect(result.reason).toContain(rawText.slice(0, 50));
  });

  it("summary 있는 condition 프롬프트에 반영", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ eligibility: "medium", reason: "분석", strategy: "전략", risks: "위험" }) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const condition = makeCondition({ summary: "AI 보조금 매칭 스타트업" });
    await analyzeGrant(makeGrant(), condition);
    const callArg = mockFn.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(callArg.messages[0].content).toContain("AI 보조금 매칭 스타트업");
  });

  it("keywords 있는 condition 프롬프트에 반영", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ eligibility: "high", reason: "충족", strategy: "", risks: "" }) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const condition = makeCondition({ keywords: ["AI", "머신러닝", "딥러닝"] });
    await analyzeGrant(makeGrant(), condition);
    const callArg = mockFn.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(callArg.messages[0].content).toContain("AI, 머신러닝, 딥러닝");
  });

  it("grant 정보가 프롬프트에 포함됨", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ eligibility: "medium", reason: "분석", strategy: "", risks: "" }) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const grant = makeGrant({ title: "예비창업패키지 2024", orgName: "창업진흥원" });
    await analyzeGrant(grant, makeCondition());
    const callArg = mockFn.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(callArg.messages[0].content).toContain("예비창업패키지 2024");
    expect(callArg.messages[0].content).toContain("창업진흥원");
  });

  it("temperature=0으로 결정적 설정", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ eligibility: "medium", reason: "분석", strategy: "", risks: "" }) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    await analyzeGrant(makeGrant(), makeCondition());
    const callArg = mockFn.mock.calls[0][0] as { temperature: number };
    expect(callArg.temperature).toBe(0);
  });

  it("keywords 없는 condition은 키워드 라인 없음", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ eligibility: "medium", reason: "분석", strategy: "", risks: "" }) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const condition = makeCondition(); // keywords 없음
    await analyzeGrant(makeGrant(), condition);
    const callArg = mockFn.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(callArg.messages[0].content).not.toContain("핵심 키워드:");
  });

  it("빈 keywords 배열이면 키워드 라인 없음", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockFn = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ eligibility: "medium", reason: "분석", strategy: "", risks: "" }) }],
    });
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: { create: mockFn },
      })),
    }));

    const { analyzeGrant } = await import("../claude");
    const condition = makeCondition({ keywords: [] });
    await analyzeGrant(makeGrant(), condition);
    const callArg = mockFn.mock.calls[0][0] as { messages: Array<{ content: string }> };
    expect(callArg.messages[0].content).not.toContain("핵심 키워드:");
  });
});

// ── 결정론 보장 ─────────────────────────────────────────────────────────────────

describe("claude.ts - 결정론 보장", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.unmock("@anthropic-ai/sdk");
  });

  it("Claude 응답 동일 시 결과 순서 동일", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "fake-claude-key");

    const mockReasons = [
      { id: "G001", reason: "이유1" },
      { id: "G002", reason: "이유2" },
    ];
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn().mockImplementation(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: JSON.stringify(mockReasons) }],
          }),
        },
      })),
    }));

    const { matchGrants } = await import("../claude");
    const grants = makeGrants(2);
    const condition = makeCondition();
    const r1 = await matchGrants(condition, grants);
    const r2 = await matchGrants(condition, grants);
    expect(r1.map(r => r.grant.id)).toEqual(r2.map(r => r.grant.id));
  });
});
