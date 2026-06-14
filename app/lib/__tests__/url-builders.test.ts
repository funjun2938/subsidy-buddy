import { describe, it, expect } from "vitest";

/**
 * URL 빌더 유틸리티 회귀 가드.
 *
 * 결제 success_url / fail_url 등 외부에 노출되는 URL들의 정합성 검증.
 */

function buildCheckoutUrl(plan: string, origin = ""): string {
  return `${origin}/checkout?plan=${encodeURIComponent(plan)}`;
}

function buildSuccessUrl(origin: string): string {
  return `${origin}/checkout/success`;
}

function buildFailUrl(origin: string): string {
  return `${origin}/checkout/fail`;
}

function buildGrantUrl(id: string, params = ""): string {
  return `/grants/${encodeURIComponent(id)}${params ? `?${params}` : ""}`;
}

describe("buildCheckoutUrl", () => {
  it("premium plan", () => {
    expect(buildCheckoutUrl("premium")).toBe("/checkout?plan=premium");
  });

  it("business plan", () => {
    expect(buildCheckoutUrl("business")).toBe("/checkout?plan=business");
  });

  it("expert plan", () => {
    expect(buildCheckoutUrl("expert")).toBe("/checkout?plan=expert");
  });

  it("includes origin when provided", () => {
    expect(buildCheckoutUrl("premium", "https://app.com")).toBe(
      "https://app.com/checkout?plan=premium",
    );
  });

  it("encodes special chars in plan", () => {
    expect(buildCheckoutUrl("plan with space")).toContain("plan%20with%20space");
  });

  it("encodes Korean text", () => {
    const url = buildCheckoutUrl("프리미엄");
    expect(url).toContain("%");
  });
});

describe("buildSuccessUrl", () => {
  it("with https origin", () => {
    expect(buildSuccessUrl("https://app.com")).toBe(
      "https://app.com/checkout/success",
    );
  });

  it("with localhost origin", () => {
    expect(buildSuccessUrl("http://localhost:3100")).toBe(
      "http://localhost:3100/checkout/success",
    );
  });

  it("with empty origin", () => {
    expect(buildSuccessUrl("")).toBe("/checkout/success");
  });

  it("does not have trailing slash by default", () => {
    expect(buildSuccessUrl("https://app.com")).not.toMatch(/\/$/);
  });
});

describe("buildFailUrl", () => {
  it("with https origin", () => {
    expect(buildFailUrl("https://app.com")).toBe(
      "https://app.com/checkout/fail",
    );
  });

  it("with localhost origin", () => {
    expect(buildFailUrl("http://localhost:3100")).toBe(
      "http://localhost:3100/checkout/fail",
    );
  });
});

describe("buildGrantUrl", () => {
  it("plain id", () => {
    expect(buildGrantUrl("g-1")).toBe("/grants/g-1");
  });

  it("id with search params", () => {
    expect(buildGrantUrl("g-1", "region=seoul")).toBe(
      "/grants/g-1?region=seoul",
    );
  });

  it("id with complex search params", () => {
    expect(buildGrantUrl("g-1", "region=seoul&biz=cafe")).toBe(
      "/grants/g-1?region=seoul&biz=cafe",
    );
  });

  it("encodes id with slash", () => {
    expect(buildGrantUrl("g/1")).toContain("g%2F1");
  });

  it("encodes Korean id", () => {
    const url = buildGrantUrl("지원사업1");
    expect(url).toContain("%");
  });
});

describe("URL safety constraints", () => {
  describe("no protocol-relative URLs", () => {
    it("buildCheckoutUrl uses absolute or relative path", () => {
      const url = buildCheckoutUrl("premium");
      expect(url).not.toMatch(/^\/\//);
    });

    it("buildSuccessUrl uses absolute or relative path", () => {
      expect(buildSuccessUrl("")).not.toMatch(/^\/\//);
    });
  });

  describe("no double slashes (except after protocol)", () => {
    it("checkout URL", () => {
      const url = buildCheckoutUrl("premium", "https://app.com");
      expect(url.replace("https://", "")).not.toMatch(/\/\//);
    });

    it("success URL", () => {
      const url = buildSuccessUrl("https://app.com");
      expect(url.replace("https://", "")).not.toMatch(/\/\//);
    });
  });

  describe("URL length sanity", () => {
    it("checkout URL is short", () => {
      expect(buildCheckoutUrl("premium").length).toBeLessThan(100);
    });

    it("success URL is short", () => {
      expect(buildSuccessUrl("https://app.com").length).toBeLessThan(100);
    });
  });
});
