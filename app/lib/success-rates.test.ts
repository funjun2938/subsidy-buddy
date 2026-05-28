import { describe, it, expect } from "vitest";
import { getSuccessRate } from "./success-rates";
import { Grant } from "./types";

function makeGrant(overrides: Partial<Grant>): Grant {
  return {
    id: "g1",
    title: "",
    orgName: "",
    category: "",
    region: "전국",
    targetBizTypes: [],
    amount: "",
    deadline: "상시",
    description: "",
    requirements: "",
    url: "",
    ...overrides,
  };
}

describe("getSuccessRate", () => {
  it("returns 예비창업패키지 stats when title matches", () => {
    const grant = makeGrant({ title: "예비창업패키지 2026" });
    const result = getSuccessRate(grant);
    expect(result.category).toBe("예비창업패키지");
    expect(result.avgAcceptRate).toBe(20);
  });

  it("matches by category field", () => {
    const grant = makeGrant({ category: "소상공인 지원" });
    const result = getSuccessRate(grant);
    expect(result.category).toBe("소상공인 지원");
  });

  it("matches R&D synonyms (TIPS, 기술개발)", () => {
    const tips = getSuccessRate(makeGrant({ title: "TIPS 프로그램" }));
    const dev = getSuccessRate(makeGrant({ description: "기술개발 사업" }));
    expect(tips.category).toBe("R&D/기술개발");
    expect(dev.category).toBe("R&D/기술개발");
  });

  it("falls back to default when no keywords match", () => {
    const grant = makeGrant({ title: "무관한 사업" });
    const result = getSuccessRate(grant);
    expect(result).toBeDefined();
    expect(result.avgAcceptRate).toBeGreaterThan(0);
  });

  it("returns non-empty tips for matched categories", () => {
    const grant = makeGrant({ title: "수출 바우처" });
    const result = getSuccessRate(grant);
    expect(result.tips.length).toBeGreaterThan(0);
  });
});
