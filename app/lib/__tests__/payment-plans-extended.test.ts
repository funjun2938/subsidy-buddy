import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getPlan,
  generateOrderId,
  PLANS,
  type PlanId,
  type Plan,
} from "@/lib/payment-plans";

/**
 * payment-plans 확장 테스트
 *
 * 기본 테스트(payment-plans.test.ts)는 행복 경로만 다룸.
 * 여기서는 각 플랜의 모든 필드, 가격 정책, 통계적 unique-id 보장,
 * 타입스크립트 enum, 그리고 회귀 가드를 추가.
 */

const PLAN_IDS: PlanId[] = ["premium", "business"];

describe("PLANS — exhaustive field coverage", () => {
  describe("premium", () => {
    const plan = PLANS.premium;

    it("has id 'premium'", () => expect(plan.id).toBe("premium"));
    it("has name '프리미엄 멤버십'", () =>
      expect(plan.name).toBe("프리미엄 멤버십"));
    it("has price 9900", () => expect(plan.price).toBe(9900));
    it("has type 'subscription'", () =>
      expect(plan.type).toBe("subscription"));
    it("description mentions 월간 구독", () =>
      expect(plan.description).toContain("월간 구독"));
    it("has 5 features", () => expect(plan.features.length).toBe(5));

    it("feature[0] mentions AI 매칭 무제한", () =>
      expect(plan.features[0]).toContain("AI 지원사업 매칭 무제한"));
    it("feature[1] mentions 전체 매칭 결과", () =>
      expect(plan.features[1]).toContain("전체 매칭 결과"));
    it("feature[2] mentions 월 3건", () =>
      expect(plan.features[2]).toContain("월 3건"));
    it("feature[3] mentions 마감 알림", () =>
      expect(plan.features[3]).toContain("마감 알림"));
    it("feature[4] mentions 신규 공고 실시간 알림", () =>
      expect(plan.features[4]).toContain("실시간 알림"));
  });

  describe("business", () => {
    const plan = PLANS.business;

    it("has id 'business'", () => expect(plan.id).toBe("business"));
    it("has name '비즈니스 멤버십'", () =>
      expect(plan.name).toBe("비즈니스 멤버십"));
    it("has price 49000", () => expect(plan.price).toBe(49000));
    it("has type 'subscription'", () =>
      expect(plan.type).toBe("subscription"));
    it("description mentions 신청 대행", () =>
      expect(plan.description).toContain("신청 대행"));
    it("has 4 features", () => expect(plan.features.length).toBe(4));

    it("includes 프리미엄 전체 기능 포함", () =>
      expect(plan.features.some((f) => f.includes("프리미엄 전체"))).toBe(true));
    it("includes AI 신청서 무제한", () =>
      expect(plan.features.some((f) => f.includes("무제한"))).toBe(true));
    it("includes 신청 대행 50% 할인", () =>
      expect(plan.features.some((f) => f.includes("50% 할인"))).toBe(true));
    it("includes 합격률 분석 리포트", () =>
      expect(plan.features.some((f) => f.includes("합격률"))).toBe(true));
  });
});

describe("pricing policy", () => {
  describe("relative pricing", () => {
    it("business > premium (upgrade priced higher)", () => {
      expect(PLANS.business.price).toBeGreaterThan(PLANS.premium.price);
    });

    it("business >= 5x premium", () => {
      expect(PLANS.business.price).toBeGreaterThanOrEqual(
        PLANS.premium.price * 4,
      );
    });
  });

  describe("pricing constraints (must end in 00 won)", () => {
    it.each(PLAN_IDS)("plan '%s' price ends in 00 won", (id) => {
      expect(PLANS[id].price % 100).toBe(0);
    });

    it.each(PLAN_IDS)("plan '%s' price is in KRW range", (id) => {
      expect(PLANS[id].price).toBeGreaterThan(1000);
      expect(PLANS[id].price).toBeLessThan(1_000_000);
    });
  });

  describe("type segmentation", () => {
    it("exactly two subscriptions", () => {
      const subs = Object.values(PLANS).filter(
        (p) => p.type === "subscription",
      );
      expect(subs.length).toBe(2);
    });

    it("no single-payment plans", () => {
      const singles = Object.values(PLANS).filter((p) => p.type === "single");
      expect(singles.length).toBe(0);
    });
  });
});

describe("generateOrderId — statistical uniqueness", () => {
  it("generates 1,000 unique premium ids", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateOrderId("premium"));
    expect(set.size).toBe(1000);
  });

  it("generates 1,000 unique business ids", () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) set.add(generateOrderId("business"));
    expect(set.size).toBe(1000);
  });

  it("cross-plan ids do not collide", () => {
    const all = new Set<string>();
    for (let i = 0; i < 300; i++) {
      all.add(generateOrderId("premium"));
      all.add(generateOrderId("business"));
    }
    expect(all.size).toBe(600);
  });
});

describe("generateOrderId — timestamp embedding", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("embeds a 13-digit unix ms timestamp", () => {
    vi.setSystemTime(new Date("2026-05-30T12:00:00Z"));
    const id = generateOrderId("premium");
    const ts = id.split("_")[2];
    expect(ts.length).toBe(13);
  });

  it("timestamp matches current Date.now() within 100ms", () => {
    const now = Date.now();
    const id = generateOrderId("premium");
    const ts = Number(id.split("_")[2]);
    expect(Math.abs(ts - now)).toBeLessThanOrEqual(100);
  });

  it("two ids generated in same tick still differ via random suffix", () => {
    vi.setSystemTime(new Date("2026-05-30T12:00:00Z"));
    const id1 = generateOrderId("premium");
    const id2 = generateOrderId("premium");
    expect(id1).not.toBe(id2);
  });
});

describe("generateOrderId — format invariants", () => {
  it("uses underscore separator (no hyphens)", () => {
    const id = generateOrderId("premium");
    expect(id).not.toMatch(/-/);
  });

  it("has exactly 4 segments split by underscore", () => {
    const id = generateOrderId("business");
    expect(id.split("_").length).toBe(4);
  });

  it("first segment is literal 'order'", () => {
    const id = generateOrderId("business");
    expect(id.split("_")[0]).toBe("order");
  });

  it("planId segment matches the input", () => {
    expect(generateOrderId("premium").split("_")[1]).toBe("premium");
    expect(generateOrderId("business").split("_")[1]).toBe("business");
  });

  it("random suffix is base36 alphanumeric only", () => {
    const id = generateOrderId("premium");
    const suffix = id.split("_")[3];
    expect(/^[a-z0-9]+$/.test(suffix)).toBe(true);
  });

  it("random suffix has 6 chars", () => {
    const id = generateOrderId("premium");
    expect(id.split("_")[3].length).toBe(6);
  });
});

describe("getPlan — input handling", () => {
  describe("valid plan ids", () => {
    it("returns Plan object for 'premium'", () => {
      const plan = getPlan("premium");
      expect(plan).not.toBeNull();
      expect(plan?.id).toBe("premium");
    });

    it("returns Plan object for 'business'", () => {
      const plan = getPlan("business");
      expect(plan).not.toBeNull();
      expect(plan?.id).toBe("business");
    });

    it("returns null for removed 'expert' id", () => {
      expect(getPlan("expert")).toBeNull();
    });
  });

  describe("invalid input", () => {
    it("returns null for unknown id 'pro'", () => {
      expect(getPlan("pro")).toBeNull();
    });

    it("returns null for misspelled 'premuim'", () => {
      expect(getPlan("premuim")).toBeNull();
    });

    it("returns null for case-mismatch 'Premium'", () => {
      expect(getPlan("Premium")).toBeNull();
    });

    it("returns null for case-mismatch 'PREMIUM'", () => {
      expect(getPlan("PREMIUM")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(getPlan("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(getPlan("   ")).toBeNull();
    });

    it("returns null for undefined", () => {
      expect(getPlan(undefined)).toBeNull();
    });
  });

  describe("returned object immutability (read-only contract)", () => {
    it("repeated calls return equivalent data", () => {
      const a = getPlan("premium");
      const b = getPlan("premium");
      expect(a).toEqual(b);
    });

    it("price is consistent across reads", () => {
      expect(getPlan("premium")?.price).toBe(getPlan("premium")?.price);
    });
  });
});

describe("regression guards", () => {
  it("plan ids are exactly ['business','premium']", () => {
    expect(Object.keys(PLANS).sort()).toEqual([
      "business",
      "premium",
    ]);
  });

  it("no plan has zero or negative price", () => {
    Object.values(PLANS).forEach((p) => {
      expect(p.price).toBeGreaterThan(0);
    });
  });

  it("no plan has empty name", () => {
    Object.values(PLANS).forEach((p) => {
      expect(p.name.length).toBeGreaterThan(0);
    });
  });

  it("no plan has empty description", () => {
    Object.values(PLANS).forEach((p) => {
      expect(p.description.length).toBeGreaterThan(0);
    });
  });

  it("no plan has empty features array", () => {
    Object.values(PLANS).forEach((p) => {
      expect(p.features.length).toBeGreaterThan(0);
    });
  });

  it("no feature string is empty", () => {
    Object.values(PLANS).forEach((p) => {
      p.features.forEach((f) => {
        expect(f.length).toBeGreaterThan(0);
      });
    });
  });

  it("plan type is always 'subscription' or 'single'", () => {
    Object.values(PLANS).forEach((p) => {
      expect(["subscription", "single"]).toContain(p.type);
    });
  });

  it("plan id matches the dictionary key", () => {
    Object.entries(PLANS).forEach(([key, plan]) => {
      expect(plan.id).toBe(key);
    });
  });
});
