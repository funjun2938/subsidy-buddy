import { describe, it, expect } from "vitest";
import { getMatchReasons } from "../lib/match-reasons";
import type { Grant, UserCondition } from "../lib/types";

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "g1",
    title: "스타트업 지원",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: "상시",
    description: "IT 소프트웨어 스타트업 대상 지원",
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

describe("getMatchReasons", () => {
  it("includes '전국 지원' for nationwide grants", () => {
    const reasons = getMatchReasons(makeGrant({ region: "전국" }), makeCondition());
    expect(reasons).toContain("전국 지원");
  });

  it("includes '지역 일치' when regions match", () => {
    const reasons = getMatchReasons(makeGrant({ region: "서울" }), makeCondition({ region: "서울" }));
    expect(reasons).toContain("지역 일치");
  });

  it("does not include '지역 일치' when regions differ", () => {
    const reasons = getMatchReasons(makeGrant({ region: "부산" }), makeCondition({ region: "서울" }));
    expect(reasons).not.toContain("지역 일치");
  });

  it("includes '업종 일치' when bizType matches", () => {
    const reasons = getMatchReasons(
      makeGrant({ targetBizTypes: ["IT·소프트웨어"] }),
      makeCondition({ bizType: "IT·소프트웨어" })
    );
    expect(reasons).toContain("업종 일치");
  });

  it("includes '업력 조건 충족' when no age restriction", () => {
    const reasons = getMatchReasons(makeGrant({}), makeCondition({ bizAge: "1~3년" }));
    expect(reasons).toContain("업력 조건 충족");
  });

  it("does not include '업력 조건 충족' when bizAge exceeds maxBizAge", () => {
    const reasons = getMatchReasons(
      makeGrant({ maxBizAge: 1 }),
      makeCondition({ bizAge: "7년 이상" })
    );
    expect(reasons).not.toContain("업력 조건 충족");
  });

  it("returns empty array for completely mismatched grant", () => {
    const reasons = getMatchReasons(
      makeGrant({ region: "부산", targetBizTypes: ["농림수산"], maxBizAge: 1 }),
      makeCondition({ region: "서울", bizType: "IT·소프트웨어", bizAge: "7년 이상" })
    );
    // No 전국, no region match, no bizType match, bizAge over limit
    expect(reasons).not.toContain("전국 지원");
    expect(reasons).not.toContain("지역 일치");
    expect(reasons).not.toContain("업종 일치");
    expect(reasons).not.toContain("업력 조건 충족");
  });

  it("includes '사업 내용 관련' when keywords overlap with grant text", () => {
    const reasons = getMatchReasons(
      makeGrant({ description: "소프트웨어 개발 스타트업 지원" }),
      makeCondition({ summary: "소프트웨어 개발", keywords: ["소프트웨어", "스타트업"] })
    );
    expect(reasons).toContain("사업 내용 관련");
  });
});
