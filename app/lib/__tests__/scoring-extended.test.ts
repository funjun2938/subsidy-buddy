/**
 * revise-doc API route 종합 테스트 (독립 파일)
 * + scoring 엣지케이스 확장
 * 담당: yungyeonghye-maker
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { ruleScore, scoreToGrade, rankGrants } from "../scoring";
import type { Grant, UserCondition } from "../types";

function makeJsonRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/revise-doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "G001", title: "테스트", orgName: "기관", category: "창업",
    region: "전국", targetBizTypes: ["IT·소프트웨어"], amount: "1억",
    deadline: "상시", description: "IT 지원", requirements: "요건",
    url: "https://example.com", ...overrides,
  };
}

function makeCondition(overrides: Partial<UserCondition> = {}): UserCondition {
  return {
    bizType: "IT·소프트웨어", revenue: "1억~3억", region: "서울",
    bizAge: "1~3년", ceoAge: "만 30~39세", ...overrides,
  };
}

// ── revise-doc 입력 유효성 ─────────────────────────────────────────────────────

describe("POST /api/revise-doc - 입력 유효성", () => {
  afterEach(() => vi.resetModules());

  it("originalSection 없으면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({ feedback: "더 구체적으로" }));
    expect(res.status).toBe(400);
  });

  it("feedback 없으면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({ originalSection: "[1. 개요]\n내용" }));
    expect(res.status).toBe(400);
  });

  it("둘 다 없으면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("빈 문자열이면 400", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({ originalSection: "", feedback: "" }));
    expect(res.status).toBe(400);
  });

  it("400 응답에 error 필드", async () => {
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({ feedback: "수정" }));
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });
});

// ── revise-doc AI 없을 때 ─────────────────────────────────────────────────────

describe("POST /api/revise-doc - AI 없을 때", () => {
  afterEach(() => { vi.resetModules(); vi.unstubAllEnvs(); });

  it("GEMINI_API_KEY 없으면 500", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({ originalSection: "[1. 개요]\n내용", feedback: "더 자세히" }));
    expect(res.status).toBe(500);
  });

  it("placeholder key이면 500", async () => {
    vi.stubEnv("GEMINI_API_KEY", "your_gemini_api_key_here");
    const { POST } = await import("../../app/api/revise-doc/route");
    const res = await POST(makeJsonRequest({ originalSection: "[1. 개요]\n내용", feedback: "수정" }));
    expect([500]).toContain(res.status);
  });
});



// ── scoring 확장 엣지케이스 ────────────────────────────────────────────────────

describe("scoring - 확장 엣지케이스 및 경계값", () => {
  describe("지역 점수 누적 검증", () => {
    it("서울 일치 > 전국 > 불일치 순서 보장", () => {
      const g전국 = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
      const g서울 = makeGrant({ region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
      const g부산 = makeGrant({ region: "부산", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
      const condition = makeCondition({ region: "서울" });
      expect(ruleScore(g서울, condition)).toBeGreaterThan(ruleScore(g전국, condition));
      expect(ruleScore(g전국, condition)).toBeGreaterThan(ruleScore(g부산, condition));
    });
  });

  describe("업종 점수 누적 검증", () => {
    it("정확 일치 > 인접 > 기타 > 불일치", () => {
      // 음식점·외식 업종으로 테스트 (IT와 인접 아님)
      const c = makeCondition({ bizType: "음식점·외식", region: "전국", bizAge: "1~3년" });
      const g정확 = makeGrant({ region: "전국", targetBizTypes: ["음식점·외식"], deadline: "상시" });
      const g인접 = makeGrant({ region: "전국", targetBizTypes: ["소매·유통"], deadline: "상시" }); // 소매·유통↔음식점 인접
      const g기타 = makeGrant({ region: "전국", targetBizTypes: ["기타"], deadline: "상시" });
      const g불일치 = makeGrant({ region: "전국", targetBizTypes: ["건설"], deadline: "상시" });
      expect(ruleScore(g정확, c)).toBeGreaterThan(ruleScore(g인접, c));
      expect(ruleScore(g인접, c)).toBeGreaterThan(ruleScore(g기타, c));
      expect(ruleScore(g기타, c)).toBeGreaterThan(ruleScore(g불일치, c));
    });

    it("광범위(5개 업종)는 정확 일치보다 낮음", () => {
      // bizType이 목록에 없는 경우의 광범위 매칭
      const c = makeCondition({ bizType: "음식점·외식", region: "전국", bizAge: "1~3년" });
      const g정확 = makeGrant({ region: "전국", targetBizTypes: ["음식점·외식"], deadline: "상시" });
      const g광범위 = makeGrant({ region: "전국", targetBizTypes: ["건설", "제조", "농림수산", "환경·에너지", "교육"], deadline: "상시" });
      // g광범위: 음식점·외식 없음, 5개 → +8 (광범위)
      // g정확: 정확 일치 → +20
      expect(ruleScore(g정확, c)).toBeGreaterThan(ruleScore(g광범위, c));
    });
  });

  describe("업력 경계값", () => {
    it("bizAge=1~3년(2), maxBizAge=2이면 2>2 false → +10", () => {
      const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시", maxBizAge: 2 });
      const c = makeCondition({ bizAge: "1~3년" }); // 2 > 2 false
      expect(ruleScore(grant, c)).toBe(47);
    });

    it("bizAge=1~3년(2), maxBizAge=1이면 2>1 → -15", () => {
      const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시", maxBizAge: 1 });
      const c = makeCondition({ bizAge: "1~3년" });
      expect(ruleScore(grant, c)).toBe(22);
    });

    it("bizAge=1년미만(0.5), minBizAge=1이면 0.5<1 → -10", () => {
      const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시", minBizAge: 1 });
      const c = makeCondition({ bizAge: "1년 미만" });
      expect(ruleScore(grant, c)).toBe(27);
    });
  });

  describe("마감일 경계값", () => {
    it("정확히 31일 후이면 +5 (30일 초과)", () => {
      const d = new Date(Date.now() + 31 * 86400000).toISOString().split("T")[0];
      const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: d });
      const c = makeCondition();
      expect(ruleScore(grant, c)).toBe(47); // 12+20+10+5
    });

    it("정확히 1일 후이면 +10 (마감 임박)", () => {
      const d = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: d });
      const c = makeCondition();
      expect(ruleScore(grant, c)).toBe(52); // 12+20+10+10
    });
  });

  describe("rankGrants 다양한 시나리오", () => {
    it("단일 high 항목이면 결과 1개", () => {
      const grants = [
        makeGrant({ id: "G001", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
        makeGrant({ id: "G002", region: "부산", targetBizTypes: ["건설"], deadline: new Date(Date.now() - 86400000).toISOString().split("T")[0] }),
      ];
      const c = makeCondition({ region: "제주" });
      const result = rankGrants(grants, c);
      // G001: 12+20+10+5=47(high), G002: -10-15+10-30=-45(low)
      expect(result.length).toBe(1);
      expect(result[0].grant.id).toBe("G001");
    });

    it("topN=1이면 최고 점수 1개만", () => {
      const grants = Array.from({ length: 10 }, (_, i) =>
        makeGrant({ id: `G${i}`, region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" })
      );
      const result = rankGrants(grants, makeCondition(), 1);
      expect(result.length).toBe(1);
    });

    it("동점 시 id 사전순 정렬", () => {
      const grants = ["Gc", "Ga", "Gb"].map(id =>
        makeGrant({ id, region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" })
      );
      const result = rankGrants(grants, makeCondition());
      expect(result.map(r => r.grant.id)).toEqual(["Ga", "Gb", "Gc"]);
    });

    it("결과 순서가 결정적임 (5회 반복)", () => {
      const grants = Array.from({ length: 5 }, (_, i) =>
        makeGrant({ id: `G00${i}`, region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" })
      );
      const c = makeCondition();
      const orders = Array.from({ length: 5 }, () => rankGrants(grants, c).map(r => r.grant.id));
      expect(new Set(orders.map(o => o.join(","))).size).toBe(1);
    });
  });

  describe("scoreToGrade 완전 커버리지", () => {
    const cases: [number, "high" | "medium" | "low"][] = [
      [100, "high"], [55, "high"], [40, "high"],
      [39, "medium"], [30, "medium"], [20, "medium"],
      [19, "low"], [10, "low"], [0, "low"], [-1, "low"], [-100, "low"],
    ];
    for (const [score, expected] of cases) {
      it(`${score}점 → ${expected}`, () => {
        expect(scoreToGrade(score)).toBe(expected);
      });
    }
  });
});
