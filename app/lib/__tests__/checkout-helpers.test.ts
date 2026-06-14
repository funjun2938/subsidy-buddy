import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateOrderId, getPlan, PLANS } from "@/lib/payment-plans";

/**
 * 결제 헬퍼 함수 통합 시나리오 테스트
 *
 * 결제 흐름 전체에서 호출되는 핵심 함수들의 조합 테스트.
 * 실제 사용자 시나리오를 코드로 재현.
 */

describe("scenario: user picks premium plan", () => {
  it("getPlan('premium') returns the premium plan object", () => {
    const plan = getPlan("premium");
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe("premium");
  });

  it("plan price is 9900 KRW", () => {
    const plan = getPlan("premium")!;
    expect(plan.price).toBe(9900);
  });

  it("plan is subscription type", () => {
    const plan = getPlan("premium")!;
    expect(plan.type).toBe("subscription");
  });

  it("generates a unique orderId for this plan", () => {
    const plan = getPlan("premium")!;
    const id = generateOrderId(plan.id);
    expect(id).toMatch(/^order_premium_/);
  });

  it("orderId can be sent to toss API as-is", () => {
    const id = generateOrderId("premium");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(20);
  });
});

describe("scenario: user picks business plan", () => {
  it("getPlan('business') returns the business plan object", () => {
    const plan = getPlan("business");
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe("business");
  });

  it("plan price is 49000 KRW", () => {
    const plan = getPlan("business")!;
    expect(plan.price).toBe(49000);
  });

  it("orderId generated for business plan", () => {
    const id = generateOrderId("business");
    expect(id).toMatch(/^order_business_/);
  });
});

describe("scenario: user picks expert (one-time)", () => {
  it("getPlan('expert') returns the expert plan object", () => {
    const plan = getPlan("expert");
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe("expert");
  });

  it("plan price is 50000 KRW (착수금)", () => {
    const plan = getPlan("expert")!;
    expect(plan.price).toBe(50000);
  });

  it("plan is single-payment type (not subscription)", () => {
    const plan = getPlan("expert")!;
    expect(plan.type).toBe("single");
  });
});

describe("scenario: user manipulates URL with invalid plan", () => {
  const invalid = [
    "PREMIUM",
    "Premium",
    "premium ",
    " premium",
    "premium\n",
    "pro",
    "basic",
    "enterprise",
    "free",
    "0",
    "null",
    "undefined",
    "true",
    "{}",
    "[]",
    "<script>",
    "../../../etc/passwd",
    "javascript:void(0)",
  ];

  it.each(invalid)("rejects plan id '%s'", (id) => {
    expect(getPlan(id)).toBeNull();
  });
});

describe("scenario: 100 concurrent orderId generations", () => {
  it("no two are equal across 100 generations", () => {
    const ids = new Array(100).fill(0).map(() => generateOrderId("premium"));
    expect(new Set(ids).size).toBe(100);
  });

  it("all have correct format", () => {
    const ids = new Array(100).fill(0).map(() => generateOrderId("premium"));
    ids.forEach((id) => {
      expect(id).toMatch(/^order_premium_\d{13}_[a-z0-9]{6}$/);
    });
  });

  it("all timestamps are very close (within 2s)", () => {
    const start = Date.now();
    const ids = new Array(100).fill(0).map(() => generateOrderId("premium"));
    const end = Date.now();
    const timestamps = ids.map((id) => Number(id.split("_")[2]));
    timestamps.forEach((ts) => {
      expect(ts).toBeGreaterThanOrEqual(start);
      expect(ts).toBeLessThanOrEqual(end + 100);
    });
  });
});

describe("scenario: pricing display format", () => {
  it("9900 displays as '9,900' with comma separator", () => {
    const plan = PLANS.premium;
    expect(plan.price.toLocaleString()).toBe("9,900");
  });

  it("49000 displays as '49,000'", () => {
    const plan = PLANS.business;
    expect(plan.price.toLocaleString()).toBe("49,000");
  });

  it("50000 displays as '50,000'", () => {
    const plan = PLANS.expert;
    expect(plan.price.toLocaleString()).toBe("50,000");
  });
});

describe("scenario: SDK setAmount payload assembly", () => {
  it("premium → { currency: 'KRW', value: 9900 }", () => {
    const plan = PLANS.premium;
    const payload = { currency: "KRW", value: plan.price };
    expect(payload).toEqual({ currency: "KRW", value: 9900 });
  });

  it("business → { currency: 'KRW', value: 49000 }", () => {
    const plan = PLANS.business;
    const payload = { currency: "KRW", value: plan.price };
    expect(payload).toEqual({ currency: "KRW", value: 49000 });
  });

  it("expert → { currency: 'KRW', value: 50000 }", () => {
    const plan = PLANS.expert;
    const payload = { currency: "KRW", value: plan.price };
    expect(payload).toEqual({ currency: "KRW", value: 50000 });
  });
});

describe("scenario: confirm API request payload", () => {
  it("premium confirm payload", () => {
    const orderId = generateOrderId("premium");
    const plan = PLANS.premium;
    const payload = {
      paymentKey: "pk_test_demo",
      orderId,
      amount: plan.price,
    };
    expect(payload.amount).toBe(9900);
    expect(payload.orderId).toMatch(/^order_premium_/);
    expect(payload.paymentKey.length).toBeGreaterThan(5);
  });

  it("business confirm payload", () => {
    const orderId = generateOrderId("business");
    const plan = PLANS.business;
    const payload = {
      paymentKey: "pk_test_demo",
      orderId,
      amount: plan.price,
    };
    expect(payload.amount).toBe(49000);
    expect(payload.orderId).toMatch(/^order_business_/);
  });

  it("expert confirm payload", () => {
    const orderId = generateOrderId("expert");
    const plan = PLANS.expert;
    const payload = {
      paymentKey: "pk_test_demo",
      orderId,
      amount: plan.price,
    };
    expect(payload.amount).toBe(50000);
    expect(payload.orderId).toMatch(/^order_expert_/);
  });
});
