import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateOrderId, type PlanId } from "@/lib/payment-plans";

/**
 * orderId 포맷 회귀 가드
 *
 * 토스 결제 API와 자체 DB에서 orderId의 형식을 가정한 로직이 있을 수 있으므로
 * 변경 시 영향 범위가 큼. 포맷 변경을 막는 잠금 테스트.
 */

const ALL_PLANS: PlanId[] = ["premium", "business", "expert"];

describe("orderId — basic format", () => {
  it.each(ALL_PLANS)("'%s' format: order_<plan>_<ts>_<rand>", (plan) => {
    const id = generateOrderId(plan);
    expect(id).toMatch(/^order_(premium|business|expert)_\d{13}_[a-z0-9]{6}$/);
  });

  it.each(ALL_PLANS)("'%s' starts with 'order_'", (plan) => {
    expect(generateOrderId(plan).startsWith("order_")).toBe(true);
  });

  it.each(ALL_PLANS)("'%s' second segment is plan id", (plan) => {
    const id = generateOrderId(plan);
    expect(id.split("_")[1]).toBe(plan);
  });

  it.each(ALL_PLANS)(
    "'%s' third segment is 13-digit timestamp",
    (plan) => {
      const id = generateOrderId(plan);
      expect(id.split("_")[2].length).toBe(13);
    },
  );

  it.each(ALL_PLANS)(
    "'%s' fourth segment is 6-char base36 random",
    (plan) => {
      const id = generateOrderId(plan);
      expect(id.split("_")[3]).toMatch(/^[a-z0-9]{6}$/);
    },
  );
});

describe("orderId — total length constraints", () => {
  it.each(ALL_PLANS)(
    "'%s' total length <= 50 (toss API limit)",
    (plan) => {
      expect(generateOrderId(plan).length).toBeLessThanOrEqual(50);
    },
  );

  it.each(ALL_PLANS)("'%s' total length >= 25", (plan) => {
    expect(generateOrderId(plan).length).toBeGreaterThanOrEqual(25);
  });
});

describe("orderId — character set (URL-safe)", () => {
  it.each(ALL_PLANS)(
    "'%s' contains only alphanumeric + underscore",
    (plan) => {
      expect(/^[a-zA-Z0-9_]+$/.test(generateOrderId(plan))).toBe(true);
    },
  );

  it.each(ALL_PLANS)("'%s' has no spaces", (plan) => {
    expect(generateOrderId(plan)).not.toMatch(/\s/);
  });

  it.each(ALL_PLANS)("'%s' has no hyphens", (plan) => {
    expect(generateOrderId(plan)).not.toMatch(/-/);
  });

  it.each(ALL_PLANS)("'%s' has no slash", (plan) => {
    expect(generateOrderId(plan)).not.toMatch(/\//);
  });

  it.each(ALL_PLANS)("'%s' is URL-safe (no encoding needed)", (plan) => {
    const id = generateOrderId(plan);
    expect(encodeURIComponent(id)).toBe(id);
  });
});

describe("orderId — timestamp segment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("at 2025-01-01: timestamp = 1735689600000", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const id = generateOrderId("premium");
    const ts = Number(id.split("_")[2]);
    expect(ts).toBe(1735689600000);
  });

  it("at 2026-01-01: timestamp = 1767225600000", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const id = generateOrderId("premium");
    const ts = Number(id.split("_")[2]);
    expect(ts).toBe(1767225600000);
  });

  it("at 2030-01-01: timestamp = 1893456000000", () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const id = generateOrderId("premium");
    const ts = Number(id.split("_")[2]);
    expect(ts).toBe(1893456000000);
  });

  it("timestamps are monotonically increasing", async () => {
    const start = generateOrderId("premium");
    vi.setSystemTime(new Date(Date.now() + 1000));
    const later = generateOrderId("premium");
    const startTs = Number(start.split("_")[2]);
    const laterTs = Number(later.split("_")[2]);
    expect(laterTs).toBeGreaterThanOrEqual(startTs);
  });
});

describe("orderId — random segment", () => {
  it("random segments differ across calls (same plan, same tick)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const id1 = generateOrderId("premium");
    const id2 = generateOrderId("premium");
    const rand1 = id1.split("_")[3];
    const rand2 = id2.split("_")[3];
    expect(rand1).not.toBe(rand2);
    vi.useRealTimers();
  });

  it("random segments are lowercase alphanumeric", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateOrderId("premium");
      const rand = id.split("_")[3];
      expect(/^[a-z0-9]{6}$/.test(rand)).toBe(true);
    }
  });

  it("random segments do not contain uppercase", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateOrderId("premium");
      const rand = id.split("_")[3];
      expect(/[A-Z]/.test(rand)).toBe(false);
    }
  });

  it("random segment entropy: 1000 generations have >95% unique randoms", () => {
    const randoms = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      randoms.add(generateOrderId("premium").split("_")[3]);
    }
    expect(randoms.size).toBeGreaterThan(950);
  });
});

describe("orderId — round-trip parsing", () => {
  it("can extract plan id back", () => {
    const id = generateOrderId("premium");
    const planId = id.split("_")[1];
    expect(planId).toBe("premium");
  });

  it("can extract timestamp back", () => {
    const id = generateOrderId("business");
    const ts = Number(id.split("_")[2]);
    expect(ts).toBeGreaterThan(1_700_000_000_000);
    expect(ts).toBeLessThan(2_000_000_000_000);
  });

  it("can reconstruct full id from parts", () => {
    const id = generateOrderId("expert");
    const parts = id.split("_");
    expect(parts.join("_")).toBe(id);
  });
});

describe("orderId — toss API compatibility", () => {
  it("matches toss orderId regex (6+ chars)", () => {
    const id = generateOrderId("premium");
    // Toss spec: 6-64 chars, alphanumeric + _ - = . @
    expect(id.length).toBeGreaterThanOrEqual(6);
    expect(id.length).toBeLessThanOrEqual(64);
  });

  it("uses only toss-allowed chars (alphanumeric + _)", () => {
    const id = generateOrderId("premium");
    expect(/^[A-Za-z0-9_]+$/.test(id)).toBe(true);
  });
});
