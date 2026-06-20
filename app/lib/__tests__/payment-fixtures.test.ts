import { describe, it, expect } from "vitest";
import { PLANS, type PlanId } from "@/lib/payment-plans";

/**
 * 결제 도메인용 픽스처와 도메인 어서션 묶음.
 *
 * 실제 결제 흐름에 사용되는 데이터의 invariants를 강하게 잠그는 목적.
 * "오타 하나로 가격이 뒤집힌다", "feature 누락이 PR에 들어간다" 같은
 * 사고를 막기 위해 의도적으로 verbose하게 짠다.
 */

const ALL_PLAN_IDS: PlanId[] = ["premium", "business"];

const PRICE_TABLE: Record<PlanId, number> = {
  premium: 9900,
  business: 49000,
};

const NAME_TABLE: Record<PlanId, string> = {
  premium: "프리미엄 멤버십",
  business: "비즈니스 멤버십",
};

const TYPE_TABLE: Record<PlanId, "subscription" | "single"> = {
  premium: "subscription",
  business: "subscription",
};

const FEATURE_COUNT_TABLE: Record<PlanId, number> = {
  premium: 5,
  business: 4,
};

describe("PLANS fixture invariants", () => {
  describe("price table is the source of truth", () => {
    it.each(ALL_PLAN_IDS)("plan '%s' price matches table", (id) => {
      expect(PLANS[id].price).toBe(PRICE_TABLE[id]);
    });
  });

  describe("name table is the source of truth", () => {
    it.each(ALL_PLAN_IDS)("plan '%s' name matches table", (id) => {
      expect(PLANS[id].name).toBe(NAME_TABLE[id]);
    });
  });

  describe("type table is the source of truth", () => {
    it.each(ALL_PLAN_IDS)("plan '%s' type matches table", (id) => {
      expect(PLANS[id].type).toBe(TYPE_TABLE[id]);
    });
  });

  describe("feature count table is the source of truth", () => {
    it.each(ALL_PLAN_IDS)("plan '%s' feature count matches table", (id) => {
      expect(PLANS[id].features.length).toBe(FEATURE_COUNT_TABLE[id]);
    });
  });
});

describe("pricing domain rules", () => {
  describe("subscription pricing", () => {
    it("premium is the cheapest subscription", () => {
      const subs = ALL_PLAN_IDS.filter((id) => TYPE_TABLE[id] === "subscription");
      const cheapest = subs.reduce((min, id) =>
        PLANS[id].price < PLANS[min].price ? id : min,
      );
      expect(cheapest).toBe("premium");
    });

    it("business is the priciest subscription", () => {
      const subs = ALL_PLAN_IDS.filter((id) => TYPE_TABLE[id] === "subscription");
      const priciest = subs.reduce((max, id) =>
        PLANS[id].price > PLANS[max].price ? id : max,
      );
      expect(priciest).toBe("business");
    });

    it("there are exactly 2 subscription plans", () => {
      const subs = ALL_PLAN_IDS.filter((id) => TYPE_TABLE[id] === "subscription");
      expect(subs.length).toBe(2);
    });

    it("subscription plans differ in price (no clones)", () => {
      const subs = ALL_PLAN_IDS.filter((id) => TYPE_TABLE[id] === "subscription");
      const prices = subs.map((id) => PLANS[id].price);
      expect(new Set(prices).size).toBe(prices.length);
    });
  });

  describe("single-payment pricing", () => {
    it("there are no single-payment plans", () => {
      const singles = ALL_PLAN_IDS.filter((id) => TYPE_TABLE[id] === "single");
      expect(singles.length).toBe(0);
    });
  });

  describe("KRW pricing constraints", () => {
    it.each(ALL_PLAN_IDS)(
      "plan '%s' price is a whole number of won",
      (id) => {
        expect(Number.isInteger(PLANS[id].price)).toBe(true);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' price is >= 1000 (price floor)",
      (id) => {
        expect(PLANS[id].price).toBeGreaterThanOrEqual(1000);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' price is <= 100,000 (price ceiling)",
      (id) => {
        expect(PLANS[id].price).toBeLessThanOrEqual(100_000);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' price ends in 00 won (round number)",
      (id) => {
        expect(PLANS[id].price % 100).toBe(0);
      },
    );
  });

  describe("naming conventions", () => {
    it.each(ALL_PLAN_IDS)(
      "plan '%s' name is Korean (contains hangul)",
      (id) => {
        expect(/[가-힣]/.test(PLANS[id].name)).toBe(true);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' name is non-trivially long",
      (id) => {
        expect(PLANS[id].name.length).toBeGreaterThanOrEqual(4);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' name has no trailing whitespace",
      (id) => {
        expect(PLANS[id].name).toBe(PLANS[id].name.trim());
      },
    );

    it("subscription plans share the '멤버십' suffix", () => {
      const subs = ALL_PLAN_IDS.filter((id) => TYPE_TABLE[id] === "subscription");
      subs.forEach((id) => {
        expect(PLANS[id].name).toContain("멤버십");
      });
    });
  });

  describe("description sanity", () => {
    it.each(ALL_PLAN_IDS)(
      "plan '%s' has non-empty description",
      (id) => {
        expect(PLANS[id].description.length).toBeGreaterThan(0);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' description is <= 80 chars",
      (id) => {
        expect(PLANS[id].description.length).toBeLessThanOrEqual(80);
      },
    );
  });

  describe("feature sanity", () => {
    it.each(ALL_PLAN_IDS)(
      "plan '%s' features array exists",
      (id) => {
        expect(Array.isArray(PLANS[id].features)).toBe(true);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' has at least 4 features",
      (id) => {
        expect(PLANS[id].features.length).toBeGreaterThanOrEqual(4);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' has at most 8 features (UI capacity)",
      (id) => {
        expect(PLANS[id].features.length).toBeLessThanOrEqual(8);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' has no empty feature strings",
      (id) => {
        PLANS[id].features.forEach((f) => {
          expect(f.trim().length).toBeGreaterThan(0);
        });
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' has no duplicate features",
      (id) => {
        const features = PLANS[id].features;
        const unique = new Set(features);
        expect(unique.size).toBe(features.length);
      },
    );

    it.each(ALL_PLAN_IDS)(
      "plan '%s' features are all <= 50 chars (one-line)",
      (id) => {
        PLANS[id].features.forEach((f) => {
          expect(f.length).toBeLessThanOrEqual(50);
        });
      },
    );
  });

  describe("id integrity", () => {
    it.each(ALL_PLAN_IDS)(
      "plan '%s' has matching id field",
      (id) => {
        expect(PLANS[id].id).toBe(id);
      },
    );

    it("dictionary keys equal id values", () => {
      Object.entries(PLANS).forEach(([k, v]) => {
        expect(k).toBe(v.id);
      });
    });

    it("there are no extra plan ids", () => {
      expect(Object.keys(PLANS).sort()).toEqual([...ALL_PLAN_IDS].sort());
    });
  });

  describe("upgrade path semantics", () => {
    it("business is at least 4x premium price (visible upgrade gap)", () => {
      expect(PLANS.business.price).toBeGreaterThanOrEqual(
        PLANS.premium.price * 4,
      );
    });

    it("business is at most 10x premium (no overshoot)", () => {
      expect(PLANS.business.price).toBeLessThanOrEqual(PLANS.premium.price * 10);
    });
  });

  describe("known feature strings (regression locks)", () => {
    it("premium includes literal 'AI 지원사업 매칭 무제한'", () => {
      expect(PLANS.premium.features).toContain("AI 지원사업 매칭 무제한");
    });

    it("premium includes literal '전체 매칭 결과 보기'", () => {
      expect(PLANS.premium.features).toContain("전체 매칭 결과 보기");
    });

    it("premium includes literal 'AI 신청서 생성 월 3건'", () => {
      expect(PLANS.premium.features).toContain("AI 신청서 생성 월 3건");
    });

    it("premium includes literal '마감 알림 (D-7, D-3, D-1)'", () => {
      expect(PLANS.premium.features).toContain("마감 알림 (D-7, D-3, D-1)");
    });

    it("premium includes literal '신규 공고 실시간 알림'", () => {
      expect(PLANS.premium.features).toContain("신규 공고 실시간 알림");
    });

    it("business includes literal '프리미엄 전체 기능 포함'", () => {
      expect(PLANS.business.features).toContain("프리미엄 전체 기능 포함");
    });

    it("business includes literal 'AI 신청서 생성 무제한'", () => {
      expect(PLANS.business.features).toContain("AI 신청서 생성 무제한");
    });

    it("business includes literal '신청 대행 수수료 50% 할인'", () => {
      expect(PLANS.business.features).toContain("신청 대행 수수료 50% 할인");
    });

    it("business includes literal '합격률 분석 리포트'", () => {
      expect(PLANS.business.features).toContain("합격률 분석 리포트");
    });
  });
});
