import { describe, it, expect } from "vitest";
import { getPlan, generateOrderId, PLANS } from "./payment-plans";

describe("getPlan", () => {
  it("returns the premium plan by id", () => {
    const plan = getPlan("premium");
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe("premium");
    expect(plan?.price).toBe(9900);
    expect(plan?.type).toBe("subscription");
  });

  it("returns the business plan by id", () => {
    const plan = getPlan("business");
    expect(plan?.price).toBe(49000);
    expect(plan?.type).toBe("subscription");
  });

  it("returns the expert plan as single-payment", () => {
    const plan = getPlan("expert");
    expect(plan?.price).toBe(50000);
    expect(plan?.type).toBe("single");
  });

  it("returns null for unknown plan id", () => {
    expect(getPlan("foo")).toBeNull();
    expect(getPlan("PREMIUM")).toBeNull(); // case-sensitive
  });

  it("returns null when id is undefined", () => {
    expect(getPlan(undefined)).toBeNull();
  });

  it("returns null when id is empty string", () => {
    expect(getPlan("")).toBeNull();
  });
});

describe("PLANS registry", () => {
  it("contains exactly the 3 known plans", () => {
    expect(Object.keys(PLANS).sort()).toEqual(["business", "expert", "premium"]);
  });

  it("every plan has non-empty features", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.features.length).toBeGreaterThan(0);
      plan.features.forEach((f) => expect(f.length).toBeGreaterThan(0));
    }
  });

  it("every plan has a positive integer price", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.price).toBeGreaterThan(0);
      expect(Number.isInteger(plan.price)).toBe(true);
    }
  });
});

describe("generateOrderId", () => {
  it("starts with order_<planId>_", () => {
    expect(generateOrderId("premium")).toMatch(/^order_premium_/);
    expect(generateOrderId("business")).toMatch(/^order_business_/);
    expect(generateOrderId("expert")).toMatch(/^order_expert_/);
  });

  it("generates a unique id on each call", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(generateOrderId("premium"));
    expect(ids.size).toBe(50);
  });

  it("embeds a numeric timestamp", () => {
    const id = generateOrderId("premium");
    // order_premium_<ts>_<rand>
    const parts = id.split("_");
    expect(parts.length).toBe(4);
    const ts = Number(parts[2]);
    expect(Number.isFinite(ts)).toBe(true);
    expect(ts).toBeGreaterThan(1_700_000_000_000);
  });
});
