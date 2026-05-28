import { describe, it, expect } from "vitest";
import { ruleScore, scoreToGrade, rankGrants } from "../lib/scoring";
import type { Grant, UserCondition } from "../lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "g1",
    title: "테스트 지원사업",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: "상시",
    description: "IT 스타트업 지원",
    requirements: "업력 3년 이내",
    url: "https://example.com",
    ...overrides,
  };
}

function makeCondition(overrides: Partial<UserCondition> = {}): UserCondition {
  return {
    bizType: "IT·소프트웨어",
    revenue: "1억 미만",
    region: "서울",
    bizAge: "1~3년",
    ceoAge: "30대",
    ...overrides,
  };
}

// ── ruleScore ─────────────────────────────────────────────────────────────────

describe("ruleScore", () => {
  it("nationwide grant scores higher than region-mismatched", () => {
    const condition = makeCondition({ region: "서울" });
    const nationwide = makeGrant({ region: "전국" });
    const busan = makeGrant({ region: "부산" });
    expect(ruleScore(nationwide, condition)).toBeGreaterThan(ruleScore(busan, condition));
  });

  it("exact region match scores highest", () => {
    const condition = makeCondition({ region: "서울" });
    const exact = makeGrant({ region: "서울" });
    const nationwide = makeGrant({ region: "전국" });
    expect(ruleScore(exact, condition)).toBeGreaterThan(ruleScore(nationwide, condition));
  });

  it("exact bizType match scores higher than adjacent", () => {
    const condition = makeCondition({ bizType: "IT·소프트웨어" });
    const exactMatch = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    const adjacent = makeGrant({ targetBizTypes: ["게임"] }); // adjacent to IT
    expect(ruleScore(exactMatch, condition)).toBeGreaterThan(ruleScore(adjacent, condition));
  });

  it("unrelated bizType scores lower than adjacent", () => {
    const condition = makeCondition({ bizType: "IT·소프트웨어" });
    const adjacent = makeGrant({ targetBizTypes: ["게임"] });
    const unrelated = makeGrant({ targetBizTypes: ["농림수산"] });
    expect(ruleScore(adjacent, condition)).toBeGreaterThan(ruleScore(unrelated, condition));
  });

  it("expired grant gets heavy penalty", () => {
    const condition = makeCondition();
    const active = makeGrant({ deadline: "상시" });
    const expired = makeGrant({ deadline: "2020-01-01" }); // well past
    expect(ruleScore(active, condition)).toBeGreaterThan(ruleScore(expired, condition));
  });

  it("bizAge exceeding maxBizAge gets penalty", () => {
    const condition = makeCondition({ bizAge: "7년 이상" });
    const young = makeGrant({ maxBizAge: 3 });  // user is too old
    const open = makeGrant({});                  // no restriction
    expect(ruleScore(open, condition)).toBeGreaterThan(ruleScore(young, condition));
  });

  it("is deterministic — same inputs always produce same score", () => {
    const condition = makeCondition();
    const grant = makeGrant();
    const score1 = ruleScore(grant, condition);
    const score2 = ruleScore(grant, condition);
    const score3 = ruleScore(grant, condition);
    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
  });
});

// ── scoreToGrade ──────────────────────────────────────────────────────────────

describe("scoreToGrade", () => {
  it("returns high for score >= 40", () => {
    expect(scoreToGrade(40)).toBe("high");
    expect(scoreToGrade(55)).toBe("high");
  });

  it("returns medium for 20 <= score < 40", () => {
    expect(scoreToGrade(20)).toBe("medium");
    expect(scoreToGrade(39)).toBe("medium");
  });

  it("returns low for score < 20", () => {
    expect(scoreToGrade(19)).toBe("low");
    expect(scoreToGrade(0)).toBe("low");
    expect(scoreToGrade(-10)).toBe("low");
  });
});

// ── rankGrants ────────────────────────────────────────────────────────────────

describe("rankGrants", () => {
  it("returns empty array when no grants qualify", () => {
    const condition = makeCondition({ bizType: "IT·소프트웨어", region: "서울" });
    const grants = [
      makeGrant({ id: "g1", targetBizTypes: ["농림수산"], region: "부산", deadline: "2020-01-01" }),
    ];
    expect(rankGrants(grants, condition)).toHaveLength(0);
  });

  it("filters out low-grade grants", () => {
    const condition = makeCondition();
    const highGrant = makeGrant({ id: "high", targetBizTypes: ["IT·소프트웨어"], region: "전국" });
    const lowGrant = makeGrant({ id: "low", targetBizTypes: ["농림수산"], region: "부산", deadline: "2020-01-01" });
    const results = rankGrants([highGrant, lowGrant], condition);
    expect(results.some(r => r.grant.id === "low")).toBe(false);
    expect(results.some(r => r.grant.id === "high")).toBe(true);
  });

  it("sorts by score descending", () => {
    const condition = makeCondition({ region: "서울" });
    const g1 = makeGrant({ id: "g1", region: "서울", targetBizTypes: ["IT·소프트웨어"] }); // exact region = +15
    const g2 = makeGrant({ id: "g2", region: "전국", targetBizTypes: ["IT·소프트웨어"] }); // nationwide = +12
    const results = rankGrants([g2, g1], condition);
    expect(results[0].grant.id).toBe("g1");
  });

  it("breaks ties by grant.id alphabetically", () => {
    const condition = makeCondition();
    const gA = makeGrant({ id: "aaa", region: "전국", targetBizTypes: ["IT·소프트웨어"] });
    const gB = makeGrant({ id: "bbb", region: "전국", targetBizTypes: ["IT·소프트웨어"] });
    const results = rankGrants([gB, gA], condition);
    expect(results[0].grant.id).toBe("aaa");
  });

  it("is deterministic — shuffled input produces same ordered output", () => {
    const condition = makeCondition({ region: "서울" });
    const grants = [
      makeGrant({ id: "c", region: "전국", targetBizTypes: ["IT·소프트웨어"] }),
      makeGrant({ id: "a", region: "서울", targetBizTypes: ["IT·소프트웨어"] }),
      makeGrant({ id: "b", region: "전국", targetBizTypes: ["IT·소프트웨어"] }),
    ];

    const run1 = rankGrants(grants, condition).map(r => r.grant.id);
    const shuffled = [...grants].reverse();
    const run2 = rankGrants(shuffled, condition).map(r => r.grant.id);

    expect(run1).toEqual(run2);
  });

  it("respects topN limit", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 20 }, (_, i) =>
      makeGrant({ id: `g${i}`, targetBizTypes: ["IT·소프트웨어"], region: "전국" })
    );
    expect(rankGrants(grants, condition, 5)).toHaveLength(5);
  });
});
